// Compresión de los GLB sin tocar posiciones ni transformaciones de nodo (el código anima escala y posición de cada pieza)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [,, src, dst, ...quitarAnim] = process.argv;
const doc = await io.read(src);
for (const a of doc.getRoot().listAnimations()) if (quitarAnim.includes(a.getName())) a.dispose();
// pistas que no hacen nada: constantes e iguales a la pose de reposo en TODOS los clips (sin ellas, el hueso se queda en esa misma pose)
{
  const reposo = (n, p) => p === 'translation' ? n.getTranslation() : p === 'rotation' ? n.getRotation() : n.getScale();
  const anims = doc.getRoot().listAnimations(), grupos = new Map();
  for (const a of anims) for (const c of a.listChannels()) { const k = c.getTargetNode().getName() + '|' + c.getTargetPath(); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); }
  let n = 0;
  for (const [k, cs] of grupos) {
    if (cs.length !== anims.length) continue;
    const path = k.split('|')[1], r = reposo(cs[0].getTargetNode(), path), w = r.length;
    const quieta = cs.every((c) => { const o = c.getSampler().getOutput().getArray();
      for (let i = 0; i < o.length; i += w) { const sg = path === 'rotation' && o[i + 3] * r[3] < 0 ? -1 : 1; for (let j = 0; j < w; j++) if (Math.abs(o[i + j] * sg - r[j]) > 1e-4) return false; } return true; });
    if (quieta) { cs.forEach((c) => { c.getSampler().dispose(); c.dispose(); }); n += cs.length; }
  }
  if (n) console.error('pistas quietas retiradas:', n);
}
await doc.transform(
  dedup(), resample({ tolerance: 1e-5 }), dedup(), prune(),
  quantize({ pattern: /^(NORMAL|TEXCOORD_\d|JOINTS_\d|WEIGHTS_\d)$/, quantizeNormal: 10, quantizeTexcoord: 14, quantizeWeight: 10 }), // POSITION sin cuantizar: no cambia ningún nodo
  reorder({ encoder: MeshoptEncoder }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(dst, doc);
