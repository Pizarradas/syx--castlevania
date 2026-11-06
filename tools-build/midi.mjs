// Exporta js/tema.js a un MIDI estándar (formato 1), el mismo que toca la página: audio/la-noche-de-1691.mid
// Uso: node tools-build/midi.mjs   (sin dependencias)
import { writeFileSync, mkdirSync } from "node:fs";
import { TEMA } from "../js/tema.js";

const PPQ = 96, TICKS_PASO = PPQ / TEMA.pasosPorPulso;
const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
const texto = (s) => [...Buffer.from(s, "latin1")]; // los reproductores MIDI leen los textos en latin-1
const meta = (tipo, datos) => [0xff, tipo, ...vlq(datos.length), ...datos];
const pista = (eventos) => { // eventos: [tick, bytes[]] → bloque MTrk
  eventos.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const out = []; let antes = 0;
  for (const [t, bytes] of eventos) { out.push(...vlq(t - antes), ...bytes); antes = t; }
  out.push(0, ...meta(0x2f, []));
  return [...texto("MTrk"), (out.length >>> 24) & 255, (out.length >>> 16) & 255, (out.length >>> 8) & 255, out.length & 255, ...out];
};
const usPorNegra = Math.round(60e6 / TEMA.bpm);
const tempo = pista([
  [0, meta(0x03, texto(TEMA.titulo)), 0],
  [0, meta(0x51, [(usPorNegra >> 16) & 255, (usPorNegra >> 8) & 255, usPorNegra & 255]), 0],
  [0, meta(0x58, [4, 2, 24, 8]), 0], // 4/4
  [0, meta(0x59, [0xff, 1]), 0],     // re menor (un bemol, modo menor)
  [0, meta(0x01, texto("Tema original de la página «Super Castlevania IV · La noche de 1691». No es música del juego.")), 0],
]);
const pistas = TEMA.pistas.map((p) => {
  const ev = [[0, meta(0x03, texto(p.nombre)), 0]];
  if (p.canal !== 9) ev.push([0, [0xc0 | p.canal, p.programa], 0]);
  for (const [s, d, n, v] of p.notas) {
    ev.push([s * TICKS_PASO, [0x90 | p.canal, n, v], 1]);
    ev.push([(s + d) * TICKS_PASO - 1, [0x80 | p.canal, n, 0], 0]); // el apagado va un tick antes: dos notas iguales seguidas no se pisan
  }
  return pista(ev);
});
const cabecera = [...texto("MThd"), 0, 0, 0, 6, 0, 1, 0, pistas.length + 1, (PPQ >> 8) & 255, PPQ & 255];
mkdirSync(new URL("../audio/", import.meta.url), { recursive: true });
const destino = new URL("../audio/la-noche-de-1691.mid", import.meta.url);
writeFileSync(destino, Buffer.from([...cabecera, ...tempo, ...pistas.flat()]));
console.log("MIDI:", destino.pathname, `${TEMA.pistas.length} pistas, ${TEMA.pistas.reduce((n, p) => n + p.notas.length, 0)} notas`);
