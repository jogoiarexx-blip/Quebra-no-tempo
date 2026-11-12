#!/usr/bin/env python3
"""Optimize uploaded cast assets. Usage:
python3 tools/optimize_cast.py <Jill.glb> <reptilian.glb> <scratch-dir>
Requires Blender, numpy and Pillow. Source uploads are not modified.
"""
import sys,json,io,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from build_models import Rig,Writer,acc,ortho,fix_quat_continuity

ROOT=Path(__file__).resolve().parent.parent

def images(r):
 result=[]
 for tex in r.j['textures']:
  im=r.j['images'][tex.get('source',tex.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))]
  bv=r.j['bufferViews'][im['bufferView']];off=bv.get('byteOffset',0)
  result.append(Image.open(io.BytesIO(r.bin[off:off+bv['byteLength']])).convert('RGB'))
 return result

def retarget(source,target,clip):
 t,frames,hp=source.clip_deltas(clip);out=[]
 for frame in frames:
  d={}
  for i in target.order:
   nm=target.short[i];si=source.name.get(nm)
   d[i]=frame[si] if si in frame else d.get(target.par.get(i),np.eye(3))
  out.append(target.locals_from_deltas(d))
 quats={i:fix_quat_continuity(np.array([f[i] for f in out])) for i in target.order}
 # The controller owns root travel. Preserve only source vertical bob.
 pos=np.tile(target.bindT[target.name['Hips']],(len(t),1))
 pos[:,1]+=hp[:,1]-source.bindT[source.name['Hips']][1]
 return t,quats,pos

def optimize(src,geometry,out):
 source=Rig(str(src));target=Rig(str(geometry));ref=Rig(str(ROOT/'models/gael.glb'))
 clips={c:retarget(ref,target,c) for c in ['Idle','Walking','Running','Aim','Fall','Crouch']}
 # Keep Jill's four additional source actions as optional clips. They are not
 # used for bar idle or evacuation; locomotion uses the game's corrected rig.
 for c in source.anims:
  if c not in clips:clips[c]=retarget(source,target,c)
 ims=images(target);normal_idx=target.j['materials'][0]['normalTexture']['index']
 base_idx=target.j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
 opts=[]
 for i,im in enumerate(ims):
  size=1024 if i in [normal_idx,base_idx] else 512
  opts.append((['normal','base','orm'][i],im.resize((size,size),Image.Resampling.LANCZOS),90 if i==normal_idx else 88 if i==base_idx else 82))
 out.parent.mkdir(parents=True,exist_ok=True);size=Writer(target).build(clips,opts,str(out))
 def tris(r):return sum(r.j['accessors'][p['indices']]['count']//3 for m in r.j['meshes'] for p in m['primitives'])
 return {'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'source_bytes':src.stat().st_size,'optimized_bytes':size,'source_triangles':tris(source),'optimized_triangles':tris(target),'bones':len(target.joints),'clips':list(clips),'textures':[list(im.size) for _,im,_ in opts]}

if __name__=='__main__':
 jill,rept,work=map(Path,sys.argv[1:4]);work.mkdir(parents=True,exist_ok=True)
 dec=work/'reptilian-decimated.glb'
 script=work/'decimate.py'
 script.write_text('''import bpy,sys
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
for a in [o for o in bpy.context.scene.objects if o.type=='ARMATURE']:
 a.animation_data_clear();a.data.pose_position='REST'
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 tris=sum(len(p.vertices)-2 for p in o.data.polygons)
 if tris<=20000:continue
 bpy.context.view_layer.objects.active=o
 d=o.modifiers.new('WebLOD','DECIMATE');d.ratio=20000/tris;d.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=d.name)
bpy.ops.export_scene.gltf(filepath=args[1],export_format='GLB',export_animations=False,export_skins=True,export_yup=True)
''')
 subprocess.run(['blender','--background','--factory-startup','--python',str(script),'--',str(rept.resolve()),str(dec.resolve())],check=True)
 report={'jill':optimize(jill,jill,ROOT/'models/jill.glb'),'reptilian':optimize(rept,dec,ROOT/'models/enemies/reptiliano.glb')}
 (ROOT/'docs/CAST_OPTIMIZATION_v0_6_0.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
