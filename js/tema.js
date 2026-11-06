// «La noche de 1691»: tema principal original de la página (no reproduce ninguna melodía de Konami).
// Re menor, 132 pulsos por minuto, 16 compases de 4/4 que se repiten en bucle: una estrofa (A) y una
// segunda parte más alta y dramática (B). Escrito como datos MIDI: cada nota es [paso, duración, nota, velocidad],
// con el paso en semicorcheas (16 por compás) y la nota en número MIDI (60 = do central).
// Lo toca js/sonido.js con instrumentos sintetizados y lo exporta a .mid tools-build/midi.mjs.

const COMPAS = 16;

// acordes, uno por compás: raíz MIDI (octava 2) y tipo
const ACORDES = [
  [38, "m"], [46, "M"], [36, "M"], [45, "M"], [38, "m"], [43, "m"], [45, "M"], [45, "7"],   // A: Rem Sib Do La Rem Solm La La7
  [46, "M"], [41, "M"], [43, "m"], [38, "m"], [46, "M"], [36, "M"], [45, "M"], [45, "M"],   // B: Sib Fa Solm Rem Sib Do La La
];
const TERCERA = { m: 3, M: 4, 7: 4 };

// melodía del órgano: [nota, semicorcheas] seguidas, compás a compás (0 = silencio)
const MELODIA = [
  [[69, 4], [74, 4], [77, 6], [76, 2]],
  [[74, 4], [72, 2], [70, 2], [77, 8]],
  [[76, 4], [79, 4], [72, 4], [76, 2], [79, 2]],
  [[81, 8], [79, 2], [77, 2], [76, 2], [73, 2]],
  [[74, 4], [77, 2], [81, 2], [81, 4], [79, 2], [77, 2]],
  [[79, 6], [77, 2], [74, 4], [70, 4]],
  [[73, 4], [76, 4], [81, 4], [79, 2], [76, 2]],
  [[77, 4], [76, 4], [74, 4], [73, 4]],
  [[77, 2], [82, 6], [81, 4], [77, 4]],
  [[81, 4], [84, 4], [81, 2], [77, 2], [72, 4]],
  [[86, 6], [84, 2], [82, 4], [79, 4]],
  [[81, 8], [77, 4], [74, 4]],
  [[82, 4], [81, 2], [79, 2], [77, 4], [74, 4]],
  [[76, 4], [79, 4], [84, 6], [82, 2]],
  [[81, 6], [79, 2], [77, 4], [76, 4]],
  [[73, 4], [76, 4], [69, 8]],
];

function pista(nombre, instrumento, programa, canal, notas) { return { nombre, instrumento, programa, canal, notas }; }

function componer() {
  const organo = [], clave = [], bajo = [], cuerdas = [], campana = [], bateria = [];
  ACORDES.forEach(([raiz, tipo], c) => {
    const p0 = c * COMPAS, t = TERCERA[tipo], B = c >= 8;
    // órgano: la melodía
    let p = p0;
    for (const [nota, d] of MELODIA[c]) { if (nota) organo.push([p, d, nota, B ? 104 : 96]); p += d; }
    // clave: arpegio en semicorcheas sobre el acorde (raíz, quinta, octava, quinta, décima…), dos octavas arriba
    const r = raiz + 24, arp = [0, 7, 12, 7, 12 + t, 7, 12, 7];
    for (let i = 0; i < 16; i++) clave.push([p0 + i, 1, r + arp[i % 8] + (tipo === "7" && i % 8 === 6 ? -2 : 0), i % 4 === 0 ? 84 : 62]);
    // bajo: corcheas que bombean entre la raíz y su octava; en B, la última corchea sube a la quinta
    for (let i = 0; i < 8; i++) bajo.push([p0 + i * 2, 2, raiz + (i % 2 ? 12 : 0) + (B && i === 7 ? 7 : 0), i % 2 ? 80 : 100]);
    // cuerdas: el acorde entero, todo el compás, por debajo de todo
    for (const iv of [12, 12 + t, 19]) cuerdas.push([p0, 16, raiz + iv, 46]);
    // campanas: solo en B, una al empezar cada compás par, en lo alto
    if (B && c % 2 === 0) campana.push([p0, 8, raiz + 48, 70]);
    // batería (canal 10 en General MIDI): bombo, caja y charles; en B, charles en semicorcheas y un bombo más
    for (const k of [0, 8, ...(B ? [10, 14] : [])]) bateria.push([p0 + k, 1, 36, 110]);
    for (const k of [4, 12]) bateria.push([p0 + k, 1, 38, 96]);
    for (let i = 0; i < 16; i += B ? 1 : 2) bateria.push([p0 + i, 1, 42, i % 4 === 2 ? 70 : 44]);
    if (c === 7 || c === 15) for (const k of [12, 13, 14, 15]) bateria.push([p0 + k, 1, 38, 70 + (k - 12) * 10]); // redoble al cerrar cada parte
  });
  return [
    pista("Órgano", "organo", 19, 0, organo),       // General MIDI 20: órgano de iglesia
    pista("Clave", "clave", 6, 1, clave),           // 7: clavecín
    pista("Bajo", "bajo", 38, 2, bajo),             // 39: bajo sintetizado
    pista("Cuerdas", "cuerdas", 48, 3, cuerdas),    // 49: conjunto de cuerdas
    pista("Campanas", "campana", 14, 4, campana),   // 15: campanas tubulares
    pista("Batería", "bateria", 0, 9, bateria),     // canal 10: percusión
  ];
}

export const TEMA = { titulo: "La noche de 1691", bpm: 132, pasosPorPulso: 4, pasos: ACORDES.length * COMPAS, pistas: componer() };
