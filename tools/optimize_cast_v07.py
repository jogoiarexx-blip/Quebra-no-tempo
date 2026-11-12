#!/usr/bin/env python3
"""Build the v0.7 cast LODs without modifying uploads.

Usage: python3 tools/optimize_cast_v07.py <porco-policial.glb> <boate.glb> <scratch>
Requires Blender, numpy and Pillow. Geometry is decimated in the bind pose; all
bones, UVs and source PBR maps are retained. Canonical animation uses the same
world-delta retargeter as v0.6, with mesh-based foot clearance in locomotion.
"""
import hashlib
import io
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from build_models import Rig, Writer, acc, qmat
from optimize_cast import retarget

ROOT = Path(__file__).resolve().parent.parent
CANONICAL = ('Idle', 'Walking', 'Running', 'Aim', 'Fall', 'Crouch')
FLOOR_CLIPS = ('Idle', 'Walking', 'Running', 'Aim')
BLENDER_GEOMETRY = '''import bpy,sys,json
from mathutils import Matrix
src,dst,budget,scale=sys.argv[sys.argv.index('--')+1:]
budget=int(budget);scale=float(scale)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Inputs are already in metres and have identity object transforms. Assert the
# assumption before editing data, so normalization never silently double-scales.
for o in bpy.context.scene.objects:
 if any(abs(o.matrix_local[i][j]-(1 if i==j else 0))>1e-4 for i in range(4) for j in range(4)):
  raise ValueError('Unexpected object transform: '+o.name)
for a in [o for o in bpy.context.scene.objects if o.type=='ARMATURE']:
 a.animation_data_clear();a.data.pose_position='REST'
# Uniform factor is measured in source glTF Y-up coordinates, not Blender local axes.
# Blender is Z-up. Scaling both mesh and rest skeleton keeps skin bind exact.
for o in bpy.context.scene.objects:
 if o.type in ('MESH','ARMATURE'):o.data.transform(Matrix.Scale(scale,4))
 o.location*=scale
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
for o in meshes:
 bpy.context.view_layer.objects.active=o
 d=o.modifiers.new('WebLOD_v07','DECIMATE')
 d.ratio=min(1,budget/triangles);d.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=d.name)
 # Collapse interpolates skin weights. Normalize the surviving four influences
 # at export (glTF exporter truncates as needed); keep every armature bone.
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_animations=False,
 export_skins=True,export_yup=True,export_def_bones=False,export_all_influences=False,
 export_morph=False,export_tangents=False)
'''


def triangles(rig):
    return sum(rig.j['accessors'][p['indices']]['count'] // 3
               for mesh in rig.j['meshes'] for p in mesh['primitives'])


def source_images(rig):
    images = []
    mat = rig.j['materials'][0]
    normal = mat['normalTexture']['index']
    base = mat['pbrMetallicRoughness']['baseColorTexture']['index']
    for k, tex in enumerate(rig.j['textures']):
        image_index = tex.get('source', tex.get('extensions', {}).get('EXT_texture_webp', {}).get('source'))
        image = rig.j['images'][image_index]
        view = rig.j['bufferViews'][image['bufferView']]
        offset = view.get('byteOffset', 0)
        im = Image.open(io.BytesIO(rig.bin[offset:offset + view['byteLength']])).convert('RGB')
        size = 1024 if k in (normal, base) else 512
        im = im.resize((size, size), Image.Resampling.LANCZOS)
        if k == normal:
            # Unit normals survive downsampling better than averaging encoded RGB.
            v = np.asarray(im).astype(float) / 127.5 - 1
            v /= np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-8)
            im = Image.fromarray(np.clip((v + 1) * 127.5, 0, 255).astype('uint8'))
        name = 'normal' if k == normal else 'base' if k == base else 'orm'
        images.append((name, im, 90 if k == normal else 88 if k == base else 82))
    return images


def skin_matrices(rig, quats, hips, frame):
    world = {}
    root = rig.name['Hips']
    for node in rig.order:
        local = np.eye(4)
        local[:3, :3] = qmat(quats[node][frame])
        # The Blender exporter emits tiny float epsilon scales. Preserve them.
        local[:3, :3] *= np.asarray(rig.N[node].get('scale', [1, 1, 1]))
        local[:3, 3] = hips[frame] if node == root else rig.N[node].get('translation', [0, 0, 0])
        parent = rig.par.get(node)
        world[node] = world[parent] @ local if parent in world else local
    return np.array([world[node] @ rig.IB[node] for node in rig.joints])


def grounded_clip(rig, clip):
    """Retain horizontal in-place root and lift the actual boot/toe surface.

    Frame vertices are skinned by the same matrices used at runtime. Grounding
    uses all four influences and foot/ankle geometry, not bone pivots (which sit
    above the sole). A 6mm margin covers linear quaternion interpolation between
    source samples. Both feet remain free to lift naturally during each stride.
    """
    t, quats, hips = clip
    # Add quarter-frame keys before sole calibration so interpolation between
    # sparse source keys cannot push the boot through the floor.
    dense = np.unique(np.concatenate([np.linspace(t[i], t[i+1], 5) for i in range(len(t)-1)]))
    dense_quats = {}
    for node, values in quats.items():
        q = np.column_stack([np.interp(dense, t, values[:, k]) for k in range(4)])
        q /= np.maximum(np.linalg.norm(q, axis=1, keepdims=True), 1e-9)
        dense_quats[node] = q
    hips = np.column_stack([np.interp(dense, t, hips[:, k]) for k in range(3)])
    t, quats = dense, dense_quats
    pr = rig.j['meshes'][0]['primitives'][0]
    attrs = pr['attributes']
    p = acc(rig.j, rig.bin, attrs['POSITION']).astype(float)
    joints = acc(rig.j, rig.bin, attrs['JOINTS_0']).astype(int)
    weights = acc(rig.j, rig.bin, attrs['WEIGHTS_0']).astype(float)
    foot_joints = [k for k, n in enumerate(rig.joints)
                   if 'Foot' in rig.short[n] or 'Toe' in rig.short[n]]
    mask = (np.where(np.isin(joints, foot_joints), weights, 0).sum(1) > .15) & (p[:, 1] < .3)
    if mask.sum() < 20:
        raise ValueError('Insufficient foot vertices for floor calibration')
    p = np.c_[p[mask], np.ones(mask.sum())]
    joints, weights = joints[mask], weights[mask]
    corrections = []
    for f in range(len(t)):
        matrices = skin_matrices(rig, quats, hips, f)
        transformed = np.einsum('nkij,nj->nki', matrices[joints], p)
        deformed = (transformed * weights[..., None]).sum(1)
        shift = .006 - deformed[:, 1].min()
        hips[f, 1] += shift
        corrections.append(float(shift))
    return (t, quats, hips), {'foot_vertices': int(mask.sum()),
                            'min_root_adjustment_m': min(corrections),
                            'max_root_adjustment_m': max(corrections),
                            'sole_clearance_m': .006}


def build_one(src, out, budget, work):
    original_hash = hashlib.sha256(src.read_bytes()).hexdigest()
    original = Rig(str(src))
    decimated = work / (out.stem + '-geometry.glb')
    script = work / 'decimate-v07.py'
    script.write_text(BLENDER_GEOMETRY)
    subprocess.run(['blender', '--background', '--factory-startup', '--python', str(script),
                    '--', str(src.resolve()), str(decimated.resolve()), str(budget), str(1.7 / float(np.ptp(acc(original.j, original.bin, original.j['meshes'][0]['primitives'][0]['attributes']['POSITION'])[:, 1])))], check=True)
    target = Rig(str(decimated))
    reference = Rig(str(ROOT / 'models/gael.glb'))
    if len(target.joints) != len(original.joints):
        raise ValueError('LOD export removed armature bones')
    clips, floor = {}, {}
    for name in CANONICAL:
        clip = retarget(reference, target, name)
        if name in FLOOR_CLIPS:
            clip, floor[name] = grounded_clip(target, clip)
        clips[name] = clip
    images = source_images(target)
    out.parent.mkdir(parents=True, exist_ok=True)
    size = Writer(target).build(clips, images, str(out))
    if hashlib.sha256(src.read_bytes()).hexdigest() != original_hash:
        raise ValueError('Source upload changed')
    pos = acc(target.j, target.bin, target.j['meshes'][0]['primitives'][0]['attributes']['POSITION'])
    extra = [target.short[n] for n in target.order if target.short[n] not in reference.name]
    return {'source_file': src.name, 'source_sha256': original_hash,
            'source_bytes': src.stat().st_size, 'optimized_bytes': size,
            'source_triangles': triangles(original), 'optimized_triangles': triangles(target),
            'source_bones': len(original.joints), 'bones': len(target.joints),
            'bind_height_m': float(np.ptp(pos[:, 1])), 'clips': list(clips),
            'reference': 'models/gael.glb',
            'textures': [{'name': name, 'size': list(im.size), 'webp_quality': quality}
                         for name, im, quality in images],
            'unmapped_target_bones': extra,
            'unmapped_bone_policy': 'Preserve parent world delta and target bind offset; no bone is removed.',
            'missing_required_bones': [name for name in ('Hips','Head','LeftFoot','RightFoot','LeftToeBase','RightToeBase')
                                       if name not in target.name],
            'floor_calibration': floor,
            'notes': ['Entire mesh is decimated; no body or clothing components are removed.',
                      'UV coordinates, base color, normal and metallic/roughness texture roles are preserved.',
                      'Horizontal root travel belongs to the runtime controller.',
                      'NPC bind height normalized from 1.87m; pig already 1.70m.',
                      'Generic accessory bones inherit their parent motion. Canonical source has detailed fingers absent in some target rigs.']}


def main():
    pig, npc, work = map(Path, sys.argv[1:4])
    work.mkdir(parents=True, exist_ok=True)
    report = {
        'porco_policial': build_one(pig, ROOT / 'models/enemies/porco-policial.glb', 20000, work),
        'boate': build_one(npc, ROOT / 'models/boate.glb', 14000, work),
    }
    (ROOT / 'docs/CAST_OPTIMIZATION_v0_7_0.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
