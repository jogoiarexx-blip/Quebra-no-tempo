#!/usr/bin/env python3
"""
QUEBRA NO TEMPO — pipeline de correção dos modelos GLB.

Uso:  python3 tools/build_models.py <principal.glb> <vixen.glb> <pasta_saida>

Correções aplicadas (ver docs/RELATORIO_MODELOS.md):
  principal -> gael.glb
    * remove trilhas de translação/escala dos ossos (exceto Hips): as translações
      animadas das pernas divergiam 7–9 cm do bind e entortavam a pelve
    * adiciona clipes que faltavam: Idle, Aim, Fall, Crouch
    * retextura para o visual de Gael do GDD §2.2 (cabelo escuro, jaqueta cinza,
      luva vermelha, sem símbolo de radiação)
    * texturas 2048 PNG -> 1024 WebP
  vixen -> sol.glb
    * corrige a orientação errada dos ossos de braço/ombro/mão/quadril nas 5 animações
      (erro constante por osso, calibrado contra o modelo principal)
    * fecha o loop de Not_Your_Mom, recentra as danças, remove translações/escala
    * adiciona Idle; texturas 1024 WebP
"""
import sys, json, struct, io, math
import numpy as np
from PIL import Image, ImageFilter

CT = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(p):
    b = open(p, 'rb').read()
    clen = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + clen])
    off = 20 + clen
    blen = struct.unpack('<I', b[off:off + 4])[0]
    return j, b[off + 8:off + 8 + blen]


def acc(j, bin_, i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    n = NC[a['type']]
    dt = np.dtype(CT[a['componentType']])
    st = bv.get('byteStride') or dt.itemsize * n
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(bin_, dtype=np.uint8, count=st * (a['count'] - 1) + dt.itemsize * n, offset=o)
    out = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], dt.itemsize * n), strides=(st, 1))
    return np.ascontiguousarray(out).view(dt).reshape(a['count'], n)


# ---------- math ----------
def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def matq(R):
    t = np.trace(R)
    if t > 0:
        s = math.sqrt(t + 1) * 2
        q = [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, s / 4]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = math.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        q = [s / 4, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s, (R[2, 1] - R[1, 2]) / s]
    elif R[1, 1] > R[2, 2]:
        s = math.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        q = [(R[0, 1] + R[1, 0]) / s, s / 4, (R[1, 2] + R[2, 1]) / s, (R[0, 2] - R[2, 0]) / s]
    else:
        s = math.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        q = [(R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, s / 4, (R[1, 0] - R[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def ortho(R):
    U, _, Vt = np.linalg.svd(R)
    R = U @ Vt
    if np.linalg.det(R) < 0:
        U[:, -1] *= -1
        R = U @ Vt
    return R


def Rx(d):
    a = math.radians(d); c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def Ry(d):
    a = math.radians(d); c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def Rz(d):
    a = math.radians(d); c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def ang(R):
    return math.degrees(math.acos(max(-1, min(1, (np.trace(R) - 1) / 2))))


# ---------- rig ----------
class Rig:
    def __init__(s, path):
        s.j, s.bin = load(path)
        s.N = s.j['nodes']
        sk = s.j['skins'][0]
        s.joints = sk['joints']
        s.par = {c: i for i, n in enumerate(s.N) for c in n.get('children', [])}
        ibm = acc(s.j, s.bin, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1).astype(float)
        s.IB = {jn: ibm[k] for k, jn in enumerate(s.joints)}
        s.BW = {jn: np.linalg.inv(m) for jn, m in s.IB.items()}          # bind world
        s.BWR = {jn: ortho(m[:3, :3]) for jn, m in s.BW.items()}          # bind world rotation
        s.short = {i: s.N[i]['name'].replace('mixamorig:', '') for i in range(len(s.N))}
        s.name = {v: k for k, v in s.short.items()}
        s.bindT = {}
        for jn in s.joints:
            L = np.linalg.inv(s.BW[s.par[jn]]) @ s.BW[jn] if s.par.get(jn) in s.BW else s.BW[jn]
            s.bindT[jn] = L[:3, 3].copy()
        # ordem topológica
        s.order = []
        def visit(i):
            if i in s.IB: s.order.append(i)
            for c in s.N[i].get('children', []): visit(c)
        visit(s.j['scenes'][0]['nodes'][0])
        s.anims = {a['name']: a for a in s.j.get('animations', [])}

    def channels(s, an):
        a = s.anims[an]; ch = {}; t = None
        for c in a['channels']:
            sm = a['samplers'][c['sampler']]
            ch[(c['target']['node'], c['target']['path'])] = acc(s.j, s.bin, sm['output']).astype(float)
            if t is None: t = acc(s.j, s.bin, sm['input'])[:, 0].astype(float)
        return t, ch

    def clip_deltas(s, an):
        """Por quadro: delta mundial D_b = R_world_anim * R_bind^-1 por osso + posição do Hips."""
        t, ch = s.channels(an)
        frames = []
        hips = s.name['Hips']
        for f in range(len(t)):
            W = {}
            for i in s.order:
                n = s.N[i]
                r = ch.get((i, 'rotation'))
                R = qmat(r[f] if r is not None else n.get('rotation', [0, 0, 0, 1]))
                W[i] = W[s.par[i]] @ R if s.par.get(i) in W else R
            frames.append({i: W[i] @ s.BWR[i].T for i in s.order})
        hp = ch.get((hips, 'translation'))
        return t, frames, (hp.copy() if hp is not None else np.tile(s.bindT[hips], (len(t), 1)))

    def locals_from_deltas(s, D):
        """D: dict osso -> delta mundial. Retorna quaternions locais."""
        W = {i: ortho(D[i] @ s.BWR[i]) for i in s.order}
        out = {}
        for i in s.order:
            p = s.par.get(i)
            out[i] = matq(W[p].T @ W[i] if p in W else W[i])
        return out

    def pose(s, spec):
        """spec: nome curto -> rotação local-delta (em eixos do mundo, herdada do pai)."""
        D = {}
        for i in s.order:
            p = s.par.get(i)
            base = D[p] if p in D else np.eye(3)
            D[i] = base @ spec.get(s.short[i], np.eye(3))
        return D


def fix_quat_continuity(q):
    q = q.copy()
    for k in range(1, len(q)):
        if np.dot(q[k], q[k - 1]) < 0: q[k] = -q[k]
    return q


# ---------- poses extras (deltas a partir da T-pose; modelo olha para +Z) ----------
def idle_pose(phase, fem=False):
    b = math.sin(phase * 2 * math.pi)
    b2 = math.sin(phase * 2 * math.pi + 1.1)
    arm = 74 if not fem else 78
    return {
        'Hips': Ry(4 if fem else 0) @ Rz(2.5 * (1 if fem else 0)),
        'Spine': Rx(1.0 + 0.6 * b),
        'Spine2': Rx(1.5 + 1.2 * b),
        'Head': Rx(-2.0 - 1.0 * b),
        'LeftArm': Rz(-arm + 1.2 * b2) @ Rx(4), 'RightArm': Rz(arm - 1.2 * b2) @ Rx(4),
        'LeftForeArm': Ry(-14) @ Rx(0), 'RightForeArm': Ry(14),
        'LeftUpLeg': Rz(-4), 'RightUpLeg': Rz(4),
        'LeftFoot': Rz(4), 'RightFoot': Rz(-4),
    }


def aim_pose():
    return {
        'Spine2': Ry(-12),
        'RightShoulder': Ry(8),
        'RightArm': Rz(8) @ Ry(84),
        'RightForeArm': Ry(5),
        'RightHand': Ry(0),
        'LeftShoulder': Ry(-12),
        'LeftArm': Rz(-30) @ Ry(-38),
        'LeftForeArm': Ry(-50),
        'Head': Ry(10),
    }


def fall_pose():
    return {
        'Spine': Rx(8), 'Spine2': Rx(6),
        'LeftArm': Rz(-32) @ Ry(-18), 'RightArm': Rz(32) @ Ry(18),
        'LeftForeArm': Ry(-30), 'RightForeArm': Ry(30),
        'LeftUpLeg': Rx(-38), 'LeftLeg': Rx(58),
        'RightUpLeg': Rx(-8), 'RightLeg': Rx(34),
        'LeftFoot': Rx(18), 'RightFoot': Rx(22),
    }


def crouch_pose():
    return {
        'Spine': Rx(28), 'Spine1': Rx(18), 'Spine2': Rx(16), 'Head': Rx(14),
        'LeftArm': Rz(-62) @ Ry(-40), 'RightArm': Rz(62) @ Ry(40),
        'LeftForeArm': Ry(-100), 'RightForeArm': Ry(100),
        'LeftUpLeg': Rx(-112), 'LeftLeg': Rx(128),
        'RightUpLeg': Rx(-112), 'RightLeg': Rx(128),
    }


# ---------- texturas ----------
def raster_maps(j, bin_, size):
    """Mapas em espaço UV: posição bind (x,y,z) e junta dominante por pixel."""
    pr = j['meshes'][0]['primitives'][0]
    P = acc(j, bin_, pr['attributes']['POSITION']).astype(np.float32)
    UV = acc(j, bin_, pr['attributes']['TEXCOORD_0']).astype(np.float32)
    J = acc(j, bin_, pr['attributes']['JOINTS_0']); Wt = acc(j, bin_, pr['attributes']['WEIGHTS_0'])
    dom = J[np.arange(len(J)), Wt.argmax(1)]
    idx = acc(j, bin_, pr['indices'])[:, 0].reshape(-1, 3)
    pos = np.full((size, size, 3), np.nan, np.float32)
    bone = np.full((size, size), -1, np.int32)
    uv = UV * size
    for tri in idx:
        a, b, c = uv[tri]
        x0 = max(int(math.floor(min(a[0], b[0], c[0]))) - 1, 0); x1 = min(int(math.ceil(max(a[0], b[0], c[0]))) + 1, size - 1)
        y0 = max(int(math.floor(min(a[1], b[1], c[1]))) - 1, 0); y1 = min(int(math.ceil(max(a[1], b[1], c[1]))) + 1, size - 1)
        if x1 < x0 or y1 < y0: continue
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-9: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
        w1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
        w2 = 1 - w0 - w1
        e = -0.15  # margem para cobrir o padding das ilhas
        m = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not m.any(): continue
        pp = w0[..., None] * P[tri[0]] + w1[..., None] * P[tri[1]] + w2[..., None] * P[tri[2]]
        sub = pos[y0:y1 + 1, x0:x1 + 1]; sb = bone[y0:y1 + 1, x0:x1 + 1]
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        write = m & (np.isnan(sub[..., 0]) | inside)
        sub[write] = pp[write]; sb[write] = dom[tri[0]]
    return pos, bone


def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6; h[gm] = (b - r)[gm] / d[gm] + 2; h[bm] = (r - g)[bm] / d[bm] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def dilate(mask, n):
    im = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))
    return np.asarray(im) > 127


def retexture_gael(rig, base):
    size = base.size[0]
    img = np.asarray(base.convert('RGB')).astype(np.float32) / 255
    pos, bone = raster_maps(rig.j, rig.bin, size)
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    valid = ~np.isnan(x)
    h, s, v = rgb2hsv(img)
    lum = img @ np.array([0.299, 0.587, 0.114], np.float32)
    jname = [rig.short[n] for n in rig.joints]
    def bones(pred):
        ids = [k for k, n in enumerate(jname) if pred(n)]
        return np.isin(bone, ids)
    report = {}

    # 1) símbolo amarelo de radiação (costas e fivela) -> removido
    yellow = valid & (h > 29) & (h < 62) & (s > 0.6) & (v > 0.55)
    back = yellow & (z < 0) & (y > 1.05) & (y < 1.5)
    buckle_zone = valid & (z > 0.05) & (np.abs(x) < 0.075) & (y > 0.955) & (y < 1.095)
    cy = float(np.nanmean(np.where(buckle_zone & yellow, y, np.nan))) if (buckle_zone & yellow).any() else 1.03
    cx = float(np.nanmean(np.where(buckle_zone & yellow, x, np.nan))) if (buckle_zone & yellow).any() else 0.0
    r = np.hypot(x - cx, y - cy)
    buckle = valid & (z > 0.05) & (r < 0.047) & (dilate(buckle_zone & yellow, 6))
    backm = dilate(back, 4) & valid
    # preenchimento das costas com o couro vizinho (convolução normalizada)
    keep = valid & ~backm & ~yellow
    src = Image.fromarray((np.where(keep[..., None], img, 0) * 255).astype(np.uint8))
    wgt = Image.fromarray((keep * 255).astype(np.uint8))
    fill = np.zeros_like(img); done = np.zeros(img.shape[:2], bool)
    for rad in (12, 40, 120):          # multi-escala: perto usa detalhe, longe usa cor média
        blur = np.asarray(src.filter(ImageFilter.GaussianBlur(rad))).astype(np.float32) / 255
        wb = np.asarray(wgt.filter(ImageFilter.GaussianBlur(rad))).astype(np.float32) / 255
        ok = (wb > 0.2) & ~done
        fill[ok] = (blur / np.maximum(wb[..., None], 1e-3))[ok]; done |= ok
    med = np.median(img[dilate(backm, 14) & keep], axis=0)
    fill[~done] = med
    rng = np.random.default_rng(7)
    noise = (rng.random(img.shape[:2]).astype(np.float32) - 0.5) * 0.035
    img[backm] = np.clip(fill[backm] + noise[backm][:, None], 0, 1)
    report['simbolo_costas_px'] = int(backm.sum())
    # fivela: disco de aço com mostrador de relógio cortado por fenda (símbolo do jogo)
    steel = np.stack([0.55 + 0 * r, 0.58 + 0 * r, 0.63 + 0 * r], -1).astype(np.float32)
    shade = np.clip(1.0 - (r / 0.047) * 0.35 + (y - cy) * 3.0, 0.6, 1.2)[..., None]
    bk = steel * shade
    ring = (r > 0.030) & (r < 0.036)
    tick = (r > 0.020) & (r < 0.029) & ((np.abs(x - cx) < 0.0035) | (np.abs(y - cy) < 0.0035))
    slash = (np.abs((x - cx) * 0.83 + (y - cy) * 0.55) < 0.0045) & (r < 0.044)
    bk = np.where((ring | tick)[..., None], bk * 0.35, bk)
    bk = np.where(slash[..., None], np.array([0.85, 0.2, 0.16], np.float32), bk)
    img[buckle] = np.clip(bk[buckle], 0, 1)
    report['fivela_px'] = int(buckle.sum())

    h, s, v = rgb2hsv(img)
    lum = img @ np.array([0.299, 0.587, 0.114], np.float32)
    # 2) cabelo/sobrancelha loiros -> castanho-escuro
    head = bones(lambda n: n in ('Head', 'HeadTop_End', 'headfront', 'Neck'))
    hair = valid & head & (y > 1.555) & (h > 27) & (h < 60) & (s > 0.2) & (v > 0.35)
    hair = hair & ~((z > 0.02) & (y < 1.60) & (h < 31))          # preserva a pele do rosto
    hl = lum[..., None] * np.array([0.33, 0.25, 0.20], np.float32) + np.array([0.015, 0.01, 0.008], np.float32)
    img[hair] = np.clip(hl[hair], 0, 1)
    report['cabelo_px'] = int(hair.sum())

    # 3) colete marrom -> jaqueta cinza de oficina
    torso = bones(lambda n: n.startswith('Spine') or n == 'Hips' or 'Shoulder' in n or n in ('LeftArm', 'RightArm'))
    vest = valid & torso & (y > 0.96) & (y < 1.52) & (h > 8) & (h < 36) & (s > 0.28) & (v < 0.66) & ~buckle
    g = (lum * 1.22 + 0.03)[..., None] * np.array([0.93, 0.98, 1.06], np.float32)
    img[vest] = np.clip(g[vest], 0, 1)
    report['jaqueta_px'] = int(vest.sum())

    # 4) luva esquerda -> vermelha
    lhand = bones(lambda n: n.startswith('LeftHand'))
    glove = valid & lhand & (v < 0.45) & (s < 0.6)
    red = np.stack([np.clip(lum * 2.6 + 0.18, 0, 0.85), lum * 0.42 + 0.02, lum * 0.38 + 0.02], -1)
    img[glove] = red[glove]
    report['luva_px'] = int(glove.sum())
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)), report


# ---------- escrita do GLB ----------
class Writer:
    def __init__(s, rig):
        s.rig = rig; s.j = json.loads(json.dumps(rig.j)); s.chunks = []; s.views = []; s.accs = []

    def view(s, data, target=None):
        off = sum(len(c) for c in s.chunks)
        pad = (-len(data)) % 4
        s.chunks.append(data + b'\0' * pad)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target: v['target'] = target
        s.views.append(v)
        return len(s.views) - 1

    def accessor(s, arr, typ, comp=5126, minmax=False, target=None):
        arr = np.ascontiguousarray(arr)
        a = {'bufferView': s.view(arr.tobytes(), target), 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
        if minmax:
            a['min'] = [float(v) for v in np.atleast_1d(arr.min(0))]; a['max'] = [float(v) for v in np.atleast_1d(arr.max(0))]
        s.accs.append(a)
        return len(s.accs) - 1

    def copy_accessor(s, i, target=None):
        r = s.rig; a = dict(r.j['accessors'][i])
        data = acc(r.j, r.bin, i)
        a.pop('byteOffset', None)
        a['bufferView'] = s.view(np.ascontiguousarray(data).tobytes(), target)
        s.accs.append(a)
        return len(s.accs) - 1

    def build(s, clips, images, out):
        r = s.rig; j = s.j
        pr = j['meshes'][0]['primitives'][0]
        pr['attributes'] = {k: s.copy_accessor(v, 34962) for k, v in r.j['meshes'][0]['primitives'][0]['attributes'].items()}
        pr['indices'] = s.copy_accessor(r.j['meshes'][0]['primitives'][0]['indices'], 34963)
        j['skins'][0]['inverseBindMatrices'] = s.copy_accessor(r.j['skins'][0]['inverseBindMatrices'])
        anims = []
        hips = r.name['Hips']
        for name, (t, quats, hp) in clips.items():
            tin = s.accessor(np.asarray(t, np.float32).reshape(-1, 1), 'SCALAR', minmax=True)
            samplers = []; channels = []
            for node, q in quats.items():
                q = fix_quat_continuity(np.asarray(q, float)).astype(np.float32)
                samplers.append({'input': tin, 'output': s.accessor(q, 'VEC4'), 'interpolation': 'LINEAR'})
                channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': 'rotation'}})
            samplers.append({'input': tin, 'output': s.accessor(np.asarray(hp, np.float32), 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': hips, 'path': 'translation'}})
            anims.append({'name': name, 'samplers': samplers, 'channels': channels})
        j['animations'] = anims
        j['images'] = []
        for nm, im, q in images:
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
            j['images'].append({'name': nm, 'mimeType': 'image/webp', 'bufferView': s.view(buf.getvalue())})
        j['textures'] = [{'sampler': 0, 'extensions': {'EXT_texture_webp': {'source': k}}} for k in range(len(images))]
        j['extensionsUsed'] = ['EXT_texture_webp']; j['extensionsRequired'] = ['EXT_texture_webp']
        j['accessors'] = s.accs; j['bufferViews'] = s.views
        binb = b''.join(s.chunks)
        j['buffers'] = [{'byteLength': len(binb)}]
        j['asset']['generator'] = 'QUEBRA NO TEMPO build_models.py (a partir de Blender glTF I/O)'
        js = json.dumps(j, separators=(',', ':')).encode()
        js += b' ' * ((-len(js)) % 4)
        total = 12 + 8 + len(js) + 8 + len(binb)
        with open(out, 'wb') as f:
            f.write(struct.pack('<4sII', b'glTF', 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(binb), 0x004E4942)); f.write(binb)
        return total


def static_clip(rig, spec_fn, dur, n, fem=False):
    t = np.linspace(0, dur, n)
    quats = {i: [] for i in rig.order}
    for k in range(n):
        spec = spec_fn(k / (n - 1)) if dur > 0.2 else spec_fn()
        loc = rig.locals_from_deltas(rig.pose(spec))
        for i in rig.order: quats[i].append(loc[i])
    hips = rig.name['Hips']
    hp = np.tile(rig.BW[hips][:3, 3], (n, 1))
    return t, {i: np.array(q) for i, q in quats.items()}, hp


def images_of(rig):
    out = []
    for im in rig.j['images']:
        bv = rig.j['bufferViews'][im['bufferView']]; o = bv.get('byteOffset', 0)
        out.append(Image.open(io.BytesIO(rig.bin[o:o + bv['byteLength']])).convert('RGB'))
    return out


def main():
    src_p, src_v, outdir = sys.argv[1:4]
    report = {}
    G = Rig(src_p); V = Rig(src_v)

    # ===== GAEL =====
    clips = {}
    for an in ['Walking', 'Running']:
        t, frames, hp = G.clip_deltas(an)
        quats = {i: np.array([G.locals_from_deltas(D)[i] for D in frames]) for i in G.order}
        clips[an] = (t, quats, hp)
    clips['Idle'] = static_clip(G, idle_pose, 2.4, 25)
    clips['Aim'] = static_clip(G, aim_pose, 0.1, 2)
    clips['Fall'] = static_clip(G, fall_pose, 0.1, 2)
    clips['Crouch'] = static_clip(G, crouch_pose, 0.1, 2)
    imgs = images_of(G)
    base, rep = retexture_gael(G, imgs[1])
    report['gael_retextura'] = rep
    base.resize((1024, 1024), Image.LANCZOS).save(outdir + '/_gael_base_preview.png')
    images = [('normal', imgs[0].resize((1024, 1024), Image.LANCZOS), 90),
              ('base', base.resize((1024, 1024), Image.LANCZOS), 88),
              ('orm', imgs[2].resize((1024, 1024), Image.LANCZOS), 82)]
    w = Writer(G)
    report['gael_bytes'] = w.build(clips, images, outdir + '/gael.glb')

    # ===== SOL (vixen) =====
    # calibração: erro constante por osso C = D_ref^T · D_vixen nos clipes compartilhados
    Cs = {}
    for an in ['Walking', 'Running']:
        _, fg, _ = G.clip_deltas(an); _, fv, _ = V.clip_deltas(an)
        for a, b in zip(fg, fv):
            for i in V.order:
                nm = V.short[i]
                if nm in G.name: Cs.setdefault(nm, []).append(a[G.name[nm]].T @ b[i])
    FIX = ['Hips', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']
    C = {}
    report['sol_calibracao'] = {}
    for nm in FIX:
        m = ortho(sum(Cs[nm])); C[nm] = m
        dev = max(ang(m.T @ x) for x in Cs[nm])
        report['sol_calibracao'][nm] = {'erro_graus': round(ang(m), 1), 'desvio_max_graus': round(dev, 1)}
    clips = {}
    hips = V.name['Hips']
    for an in ['Walking', 'Running', 'All_Night_Dance', 'Not_Your_Mom', 'Superlove_Pop_Dance']:
        t, frames, hp = V.clip_deltas(an)
        fixed = []
        for D in frames:
            D2 = dict(D)
            for nm in FIX: D2[V.name[nm]] = D[V.name[nm]] @ C[nm].T
            fixed.append(V.locals_from_deltas(D2))
        quats = {i: fix_quat_continuity(np.array([f[i] for f in fixed])) for i in V.order}
        if 'Dance' in an or an == 'Not_Your_Mom':
            hp[:, 0] -= hp[:, 0].mean(); hp[:, 2] -= hp[:, 2].mean()   # recentra no palco
        # fecha o loop quando o último quadro não coincide com o primeiro
        seam = max(min(np.linalg.norm(q[0] - q[-1]), np.linalg.norm(q[0] + q[-1])) for q in quats.values())
        if seam > 0.03 or np.linalg.norm(hp[0] - hp[-1]) > 0.01:
            nb = min(18, len(t) // 4)
            for k in range(nb):
                wgt = (k + 1) / nb; f = len(t) - nb + k
                for i in quats:
                    q0 = quats[i][0] if np.dot(quats[i][0], quats[i][f]) >= 0 else -quats[i][0]
                    q = (1 - wgt) * quats[i][f] + wgt * q0
                    quats[i][f] = q / np.linalg.norm(q)
                hp[f] = (1 - wgt) * hp[f] + wgt * hp[0]
            report.setdefault('sol_loops_fechados', []).append({'clip': an, 'descontinuidade': round(float(seam), 3)})
        clips[an] = (t, quats, hp)
    clips['Idle'] = static_clip(V, lambda p: idle_pose(p, True), 3.0, 31)
    imgs = images_of(V)
    images = [('normal', imgs[0].resize((1024, 1024), Image.LANCZOS), 90),
              ('base', imgs[1].resize((1024, 1024), Image.LANCZOS), 88),
              ('orm', imgs[2].resize((1024, 1024), Image.LANCZOS), 82)]
    w = Writer(V)
    report['sol_bytes'] = w.build(clips, images, outdir + '/sol.glb')
    json.dump(report, open(outdir + '/_model_report.json', 'w'), indent=1)
    print(json.dumps(report, indent=1))




# ---------- máscaras de figurino da dançarina (reuso com roupas diferentes) ----------
def make_sol_masks(rig, base, size=1024):
    """Regiões: R = tecido (sutiã/tanga), G = couro (tiras, coleira, punhos, ligas, sapatos), B = cabelo, A = meia arrastão."""
    img = np.asarray(base.convert('RGB').resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
    pos, bone = raster_maps(rig.j, rig.bin, size)
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    valid = ~np.isnan(x)
    h, s, v = rgb2hsv(img)
    lum = img @ np.array([0.299, 0.587, 0.114], np.float32)
    jname = [rig.short[n] for n in rig.joints]
    def bones(pred): return np.isin(bone, [k for k, n in enumerate(jname) if pred(n)])
    head = bones(lambda n: n in ('Head', 'HeadTop_End', 'headfront'))
    neck = bones(lambda n: n == 'Neck')
    legs = bones(lambda n: 'Leg' in n)
    feet = bones(lambda n: 'Foot' in n or 'Toe' in n)
    dark = valid & (v < 0.24)
    fabric = valid & ((h < 12) | (h > 345)) & (s > 0.6) & (v > 0.08) & ~head
    hair = dark & (head | (neck & ((z < -0.03) | (y > 1.5))) | (~legs & ~feet & (z < -0.105) & (y > 1.1) & (np.abs(x) < 0.2)))
    hair |= valid & head & (v < 0.3) & (y > 1.6)
    hair &= ~((z > 0.055) & (y < 1.645) & (np.abs(x) < 0.075))        # preserva olhos, cílios e sobrancelhas
    leather = dark & ~hair & ~fabric
    lb = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
    stock = valid & legs & (y > 0.2) & (y < 0.93) & (lum < lb * 0.9) & ~leather & ~fabric
    m = np.zeros((size, size, 4), np.uint8)
    for k, a in enumerate((fabric, leather, hair, stock)):
        soft = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        m[..., k] = np.asarray(soft)
    # PNG opaco 2:1 (canvas pré-multiplica alfa e destruiria os canais): esquerda RGB = tecido/couro/cabelo, direita R = meia
    wide = np.zeros((size, size * 2, 3), np.uint8); wide[:, :size] = m[..., :3]; wide[:, size:, 0] = m[..., 3]
    return Image.fromarray(wide, 'RGB'), {n: int(a.sum()) for n, a in zip(('tecido', 'couro', 'cabelo', 'meia'), (fabric, leather, hair, stock))}


def make_gael_masks(rig, base, size=1024):
    """Regiões do protagonista (calculadas na textura ORIGINAL, mesmas UVs do gael.glb):
    esquerda R = jaqueta/colete, G = calça, B = cabelo; direita R = botas, G = luvas."""
    img = np.asarray(base.convert('RGB').resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
    pos, bone = raster_maps(rig.j, rig.bin, size)
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    valid = ~np.isnan(x)
    h, s, v = rgb2hsv(img)
    jname = [rig.short[n] for n in rig.joints]
    def bones(pred): return np.isin(bone, [k for k, n in enumerate(jname) if pred(n)])
    head = bones(lambda n: n in ('Head', 'HeadTop_End', 'headfront', 'Neck'))
    torso = bones(lambda n: n.startswith('Spine') or n == 'Hips' or 'Shoulder' in n or n in ('LeftArm', 'RightArm'))
    legs = bones(lambda n: 'UpLeg' in n or n.endswith('Leg'))
    feet = bones(lambda n: 'Foot' in n or 'Toe' in n)
    hands = bones(lambda n: 'Hand' in n)
    skin = (h > 10) & (h < 32) & (s > 0.25) & (s < 0.62) & (v > 0.55)
    hair = valid & head & (y > 1.555) & (h > 27) & (h < 60) & (s > 0.2) & (v > 0.35) & ~((z > 0.02) & (y < 1.60) & (h < 31))
    vest = valid & torso & (y > 0.96) & (y < 1.52) & (h > 8) & (h < 36) & (s > 0.28) & (v < 0.66)
    pants = valid & (legs | bones(lambda n: n == 'Hips')) & (y > 0.3) & (y < 1.02) & ~skin & ~vest
    boots = valid & (feet | (legs & (y <= 0.33))) & ~skin
    gloves = valid & hands & (v < 0.45) & ~skin
    wide = np.zeros((size, size * 2, 3), np.uint8)
    for k, a in enumerate((vest, pants, hair, boots, gloves)):
        ch = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
        if k < 3: wide[:, :size, k] = ch
        else: wide[:, size:, k - 3] = ch
    return Image.fromarray(wide, 'RGB'), {n: int(a.sum()) for n, a in zip(('jaqueta', 'calca', 'cabelo', 'botas', 'luvas'), (vest, pants, hair, boots, gloves))}


if __name__ == '__main__':
    if not (len(sys.argv) > 4 and sys.argv[4] == 'masks'):
        main()
    V = Rig(sys.argv[2])
    mask, rep = make_sol_masks(V, images_of(V)[1])
    mask.save(sys.argv[3] + '/sol_masks.png', optimize=True)
    print('máscaras', rep)
    Gr = Rig(sys.argv[1])
    gm, grep_ = make_gael_masks(Gr, images_of(Gr)[1])
    gm.save(sys.argv[3] + '/gael_masks.png', optimize=True)
    print('máscaras gael', grep_)
