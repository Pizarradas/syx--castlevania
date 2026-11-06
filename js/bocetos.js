// Cuaderno del cazador: láminas a tinta y sanguina, al modo de los cuadernos de Leonardo, que se van
// trazando cuando su sección entra y se borran cuando sale. Cada lámina cuenta algo de la sección en
// la que vive (el enemigo de la prueba, una pista del muro…) y lleva una nota en escritura especular,
// que se escribe de derecha a izquierda, y su traducción legible al pie. Todo es decorado
// (aria-hidden, sin eventos de puntero) y queda en los márgenes, por detrás del texto: no tapa la
// lectura ni las pruebas. Scrub sobre Lenis (scrub: true) y todo entra por mov.añadir.

// los calcos de los maniquís pesan (148 KB): se piden aparte, sin retener el arranque de la página ni su pantalla de inicio
let REF = null;
export const referencias = import("./bocetos-ref.js").then((m) => { REF = m.REF; });

// aleatorio con semilla: las láminas salen iguales en cada visita (el pulso de la mano, no el azar)
const semilla = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// curva suave que pasa por los puntos (Catmull-Rom → Bézier)
export const curva = (P) => {
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};
export const elipse = (cx, cy, rx, ry, n = 14, a0 = -Math.PI / 2) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const espejo = (P, W) => P.map(([x, y]) => [W - x, y]);
const dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

export function lapiz(n) {
  const r = semilla(n);
  const out = [];
  // un trazo de la mano: dos pasadas que no coinciden del todo, la segunda más leve
  const trazo = (P, { pasadas = 2, pulso = 0.9, clase = "" } = {}) => {
    for (let k = 0; k < pasadas; k++) {
      const Q = P.map(([x, y], i) => [x + (r() - 0.5) * pulso * (k + 0.6), y + (r() - 0.5) * pulso * (k + 0.6) + (i ? 0 : 0)]);
      out.push(`<path class="belmont-plate__s${k ? " belmont-plate__s--2" : ""}${clase ? " " + clase : ""}" pathLength="1" d="${curva(Q)}"/>`);
    }
  };
  const linea = (a, b, o) => trazo([a, [(a[0] + b[0]) / 2 + (r() - 0.5) * 1.5, (a[1] + b[1]) / 2 + (r() - 0.5) * 1.5], b], o);
  // sombreado de zurdo: trazos cortos en diagonal (\) dentro de un polígono
  const rayado = (poli, { paso = 5, largo = 7, ang = 0.75 } = {}) => {
    const xs = poli.map((p) => p[0]), ys = poli.map((p) => p[1]);
    const dx = Math.cos(ang) * largo / 2, dy = Math.sin(ang) * largo / 2;
    for (let y = Math.min(...ys); y < Math.max(...ys); y += paso) for (let x = Math.min(...xs); x < Math.max(...xs); x += paso) {
      const cx = x + (r() - 0.5) * paso * 0.8, cy = y + (r() - 0.5) * paso * 0.8;
      if (dentro(poli, cx, cy) && dentro(poli, cx - dx, cy - dy) && dentro(poli, cx + dx, cy + dy))
        out.push(`<path class="belmont-plate__h" pathLength="1" d="M${(cx - dx).toFixed(1)} ${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}"/>`);
    }
  };
  // grabado de grimorio: tramas que siguen la luz. «campo» da la sombra (0 luz … 1 negro) en cada punto;
  // cada capa es una familia de líneas en un ángulo que solo se traza donde la sombra pasa su umbral,
  // así la primera capa modela, la segunda cruza en lo hondo y la tercera ennegrece las cavidades.
  const sombra = (poli, campo, { paso = 3, capas = [[-0.75, 0.18], [0.8, 0.5], [0.05, 0.76]], curva = 0, muestra = 1.4 } = {}) => {
    const xs = poli.map((p) => p[0]), ys = poli.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    capas.forEach(([ang, umbral], capa) => {
      const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
      let lote = [];
      const soltar = () => { if (lote.length) out.push(`<path class="belmont-plate__h${capa ? " belmont-plate__h--" + (capa + 1) : ""}" pathLength="1" d="${lote.join("")}"/>`); lote = []; };
      for (let o = -R; o <= R; o += paso * (capa ? 1.15 : 1)) {
        const oj = o + (r() - 0.5) * paso * 0.35;
        let run = [];
        const cerrar = () => { if (run.length > 2) lote.push("M" + run.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L")); run = []; if (lote.length >= 9) soltar(); };
        for (let t = -R; t <= R; t += muestra) {
          const u = t / R, b = curva * (1 - u * u) * R * 0.25;
          const x = cx + n[0] * (oj + b) + d[0] * t, y = cy + n[1] * (oj + b) + d[1] * t;
          if (dentro(poli, x, y) && campo(x, y) > umbral + (r() - 0.5) * 0.06) run.push([x, y]); else cerrar();
        }
        cerrar();
      }
      soltar();
    });
  };
  // tapa: el papel tapa lo que queda detrás (líneas ocultas), así las piezas se superponen sin transparentarse
  const tapa = (P) => out.push(`<path class="belmont-plate__tapa" d="${curva(P)}Z"/>`);
  // tinta: hondos que se llenan de negro (órbitas, fauces) o de sangre
  const tinta = (P, clase = "") => out.push(`<path class="belmont-plate__f${clase ? " " + clase : ""}" d="${curva(P)}Z"/>`);
  const texto = (x, y, t, { ang = 0, clase = "" } = {}) => out.push(`<text class="belmont-plate__t${clase ? " " + clase : ""}" x="${x}" y="${y}" transform="rotate(${ang} ${x} ${y})">${t}</text>`);
  // inscripción en círculo, como los sellos de los grimorios
  const sello = (cx, cy, rr, t) => {
    const id = "belmont-sello-" + n + "-" + Math.round(rr);
    out.push(`<path id="${id}" fill="none" d="M${cx - rr} ${cy}a${rr} ${rr} 0 1 1 ${rr * 2} 0a${rr} ${rr} 0 1 1 ${-rr * 2} 0"/><text class="belmont-plate__t belmont-plate__t--sello"><textPath href="#${id}">${t}</textPath></text>`);
  };
  // calco: los contornos y la trama sacados del maniquí de referencia (tools-ref), pasados por la mano
  const calco = (ref, { peso = (id) => true } = {}) => {
    ref.tramas.forEach(([capa, d]) => out.push(`<path class="belmont-plate__h${capa ? " belmont-plate__h--" + (capa + 1) : ""}" pathLength="1" d="${d}"/>`));
    ref.partes.forEach(({ id, p }) => trazo([...p, p[0]], { pasadas: 1, pulso: 0.5, clase: peso(id) ? "" : "belmont-plate__s--guia" }));   // lo que tapa a qué, con línea fina
    // la silueta: no una línea gorda sino varias finas que buscan la forma, como en los estudios de Leonardo
    (ref.silueta || []).forEach((p) => { trazo([...p, p[0]], { pasadas: 2, pulso: 0.55 }); trazo([...p, p[0]], { pasadas: 1, pulso: 1.4, clase: "belmont-plate__s--2" }); });
  };
  // pelo a mechones a lo largo del borde de arriba de una pieza: puntas hacia fuera del centro
  const mechones = (P, { cada = 3, largo = 5, arriba = 0.5 } = {}) => {
    const cx = P.reduce((a, q) => a + q[0], 0) / P.length, cy = P.reduce((a, q) => a + q[1], 0) / P.length;
    const ys = P.map((q) => q[1]), corte = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * arriba;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 0; t < l; t += cada) {
        const x = a[0] + (b[0] - a[0]) * t / l, y = a[1] + (b[1] - a[1]) * t / l;
        if (y > corte) continue;
        const nx = x - cx, ny = y - cy, nl = Math.hypot(nx, ny) || 1, k = largo * (0.6 + r() * 0.8);
        trazo([[x - (b[0] - a[0]) / l * 1.2, y - (b[1] - a[1]) / l * 1.2], [x + nx / nl * k * 0.6 + (b[0] - a[0]) / l * 1.5, y + ny / nl * k * 0.6], [x + nx / nl * k + (b[0] - a[0]) / l * 3, y + ny / nl * k]], { pasadas: 1, pulso: 0.3 });
      }
    }
  };
  return { trazo, linea, rayado, sombra, tapa, tinta, calco, mechones, texto, sello, r, out, svg: (vb) => `<svg viewBox="${vb}" focusable="false" aria-hidden="true">${out.join("")}</svg>` };
}
// campos de luz (0 negro … 1 luz plena): esfera iluminada desde arriba a la izquierda, más manchas que oscurecen (f < 0) o aclaran
export const luzEsfera = (cx, cy, R, L = [-0.38, -0.42, 0.82]) => (x, y) => {
  const u = (x - cx) / R, v = (y - cy) / R, q = u * u + v * v;
  if (q >= 1) return 0;
  const z = Math.sqrt(1 - q), k = Math.hypot(...L), l = (u * L[0] + v * L[1] + z * L[2]) / k;
  return Math.max(0, Math.min(1, l * 1.1)); // tinta clara sobre papel negro: la trama dibuja la LUZ y la sombra queda en negro
};
export const conManchas = (base, manchas) => (x, y) => {
  let s = base(x, y);
  for (const [mx, my, mr, f] of manchas) s += f * Math.exp(-((x - mx) ** 2 + (y - my) ** 2) / (mr * mr));
  return Math.max(0, Math.min(1, s));
};
// volumen de una pieza: una esfera a su medida, con la luz entrando por arriba a la izquierda
export const luzParte = (P, k = 1) => {
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const f = luzEsfera(Math.min(...xs) + w * 0.4, Math.min(...ys) + h * 0.38, Math.max(w, h) * 0.62);
  return (x, y) => f(x, y) * k;
};
const simetrico = (P, eje) => [...P, ...P.slice(0, -1).reverse().map(([x, y]) => [2 * eje - x, y])];

/* ── Lámina I · el murciélago (enemigo de la prueba del látigo): estudio del ala, hueso a hueso,
   con la membrana desgarrada y las fauces abiertas ── */
function murcielago() {
  const L = lapiz(7), R = REF.murcielago, A = R.anclas;
  L.calco(R, { peso: (id) => id !== 1 });
  // venas de la membrana desde la muñeca y las articulaciones
  [A.munecaI, A.munecaD].forEach(([x, y], k) => [[-0.9, 0.35], [-0.6, 0.75], [-0.25, 0.95]].forEach(([dx, dy]) => { const s = k ? -1 : 1; L.trazo([[x, y], [x + s * dx * 18 + 2, y + dy * 16], [x + s * dx * 30, y + dy * 30]], { pasadas: 1, clase: "belmont-plate__s--guia" }); }));
  [A.munecaI, A.munecaD].forEach(([x, y]) => L.trazo(elipse(x, y, 2, 2, 8), { pasadas: 1 }));
  [A.munecaI, A.munecaD].forEach(([x, y], k) => { const s = k ? 1 : -1; L.trazo([[x, y], [x + s * 2, y - 4], [x + s * 4.5, y - 5]], { clase: "belmont-plate__s--peso" }); }); // garra del pulgar
  const [rx, ry] = A.roto, roto = [[rx - 5, ry - 2], [rx - 1, ry - 5], [rx + 2, ry - 1], [rx + 6, ry - 3], [rx + 4, ry + 4], [rx - 2, ry + 5], [rx - 4, ry + 2]];
  L.tinta(roto); L.trazo([...roto, roto[0]], { pasadas: 1 }); // el desgarro
  // la cara: fauces abiertas con colmillos y dos brasas
  const [bx, by] = A.boca;
  L.tinta([[bx - 3.5, by - 1], [bx, by - 1.8], [bx + 3.5, by - 1], [bx + 2.2, by + 3], [bx - 2.2, by + 3]]);
  L.trazo([[bx - 2.4, by - 1.2], [bx - 1.8, by + 2.6]], { pasadas: 1, clase: "belmont-plate__s--peso" }); L.trazo([[bx + 2.4, by - 1.2], [bx + 1.8, by + 2.6]], { pasadas: 1, clase: "belmont-plate__s--peso" });
  [A.ojoI, A.ojoD].forEach(([x, y]) => L.tinta(elipse(x, y, 1.4, 1.1, 6), "belmont-plate__f--sangre"));
  [A.pieI, A.pieD].forEach(([x, y], k) => { const s = k ? 1 : -1; L.trazo([[x, y], [x + s * 2, y + 4], [x + s * 4, y + 5]], { pasadas: 1 }); L.trazo([[x + s * 2, y + 4], [x + s * 1.5, y + 6.5]], { pasadas: 1 }); });
  // regla de la envergadura y el círculo de la proporción
  const yR = R.suelo + 12, [cx, cy] = A.cuerpo;
  L.linea([14, yR], [226, yR], { pasadas: 1 });
  [14, 67, 120, 173, 226].forEach((x) => L.linea([x, yR - 4], [x, yR + 4], { pasadas: 1 }));
  L.texto(120, yR + 12, "VESPERTILIO · ALA · EXPLICATA", { clase: "belmont-plate__t--centro" });
  L.trazo(elipse(cx, cy, 108, 108, 28), { pasadas: 1, clase: "belmont-plate__s--guia" });
  return L.svg(`0 ${R.vb[1] - 6} 240 ${yR + 18 - R.vb[1] + 6}`);
}

/* ── Lámina II · la araña de la cripta (cuelga sobre el mapa de las fases) ── */
function arana() {
  const L = lapiz(11);
  L.linea([80, 0], [80, 128], { pasadas: 1, pulso: 0.6 });                       // el hilo, medido
  for (let y = 12; y < 124; y += 16) L.linea([90, y], [96, y], { pasadas: 1 });
  L.linea([93, 12], [93, 124], { pasadas: 1, clase: "belmont-plate__s--guia" });
  L.trazo(elipse(80, 141, 9, 10, 12));                                             // cefalotórax
  const abd = elipse(80, 170, 15, 20, 16);
  L.trazo(abd);                                                                    // abdomen
  L.rayado(abd.filter((p) => p[0] >= 76), { paso: 3.5, largo: 5 });
  L.trazo([[74, 165], [86, 165], [80, 172], [86, 179], [74, 179], [80, 172], [74, 165]], { pasadas: 1, clase: "belmont-plate__s--sangre" }); // reloj de arena
  for (let k = 0; k < 4; k++) [-1, 1].forEach((s) => {                            // ocho patas, tres tramos con sus nudos
    const a = [80 + s * 7, 134 + k * 5], b = [80 + s * (26 + k * 2), 116 + k * 11], c = [80 + s * (40 + k * 3), 124 + k * 17], d = [80 + s * (44 + k * 2 - (k > 1 ? 6 : 0)), 142 + k * 24];
    L.trazo([a, b]); L.trazo([b, c]); L.trazo([c, d], { pulso: 1.2 });
    [b, c].forEach(([x, y]) => L.trazo(elipse(x, y, 1.6, 1.6, 6), { pasadas: 1 }));
  });
  L.linea([86, 136], [118, 206], { pasadas: 1, clase: "belmont-plate__s--guia" }); // a la lupa
  L.trazo(elipse(132, 222, 24, 24, 20), { pasadas: 1 });                          // detalle: quelíceros y colmillos
  L.trazo([[122, 210], [118, 222], [124, 236]]); L.trazo([[142, 210], [146, 222], [140, 236]]);
  L.trazo([[124, 236], [127, 241], [129, 238]], { clase: "belmont-plate__s--sangre" }); L.trazo([[140, 236], [137, 241], [135, 238]], { clase: "belmont-plate__s--sangre" });
  L.rayado(elipse(132, 220, 9, 12, 10), { paso: 3, largo: 4 });
  return L.svg("0 0 170 250");
}

/* ── Lámina III · la telaraña del muro hueco (pista del secreto: donde hay telaraña, nadie ha pasado) ──
   Va sobre la esquina del muro, como una telaraña de verdad; al romperlo se va con él. */
function muro() {
  const L = lapiz(23);
  const rad = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI / 2, l = 150 + L.r() * 20; return [Math.cos(a) * l, Math.sin(a) * l, a]; });
  rad.forEach(([x, y]) => L.trazo([[0, 0], [x * 0.5, y * 0.5], [x, y]], { pasadas: 1, pulso: 0.7 }));
  for (let k = 1; k <= 7; k++) {                                                   // la espiral, hilo a hilo, con su peso
    const rr = k * 19;
    const P = rad.flatMap(([, , a], i) => { const p = [Math.cos(a) * rr, Math.sin(a) * rr]; if (!i) return [p]; const am = a - Math.PI / 32; return [[Math.cos(am) * (rr - 5), Math.sin(am) * (rr - 5)], p]; });
    L.trazo(P, { pasadas: 1, pulso: 0.6 });
  }
  L.trazo([[44, 40], [47, 46], [44, 50], [41, 46], [44, 40]], { pasadas: 1, clase: "belmont-plate__s--sangre" }); // la tejedora, quieta
  return L.svg("-4 -4 180 180");
}

/* ── Lámina IV · el órgano de la capilla (la música) ── */
function organo() {
  const L = lapiz(31);
  const tubos = [64, 92, 120, 148, 120, 92, 64];
  tubos.forEach((h, i) => {
    const x = 18 + i * 26, top = 206 - h;
    L.linea([x, top], [x, 206]); L.linea([x + 16, top], [x + 16, 206]);
    L.trazo(elipse(x + 8, top, 8, 2.6, 10), { pasadas: 1 });
    L.trazo([[x + 3, 186], [x + 8, 176], [x + 13, 186]]);                          // la boca
    L.rayado([[x + 9, top + 4], [x + 16, top + 4], [x + 16, 204], [x + 9, 204]], { paso: 4, largo: 6, ang: 1.25 });
  });
  L.linea([8, 206], [200, 206], { pasadas: 1 });
  const c = [83, 92];                                                              // telaraña entre dos tubos
  [[70, 60], [72, 118], [96, 66], [96, 124], [70, 92], [96, 92]].forEach((p) => L.linea(c, p, { pasadas: 1 }));
  [6, 12, 18].forEach((rr) => L.trazo(elipse(c[0], c[1], rr * 0.75, rr, 12), { pasadas: 1, pulso: 0.5 }));
  L.trazo(elipse(83, 100, 2.5, 3.5, 8), { pasadas: 1, clase: "belmont-plate__s--sangre" });
  return L.svg("0 40 208 172");
}

/* ── Lámina V · la calavera (al final del cuaderno), de frente, como en los grimorios:
   órbitas hondas que se llenan de tinta, la nariz como un corazón vuelto, la mandíbula
   descolgada y los colmillos algo más largos de lo que deberían. ── */
function calavera() {
  const L = lapiz(43), X = 120;
  const mitad = [[120, 22], [99, 25], [80, 34], [65, 51], [56, 76], [55, 104], [60, 126], [57, 139], [61, 153], [71, 162], [77, 176], [84, 190], [102, 194], [120, 195]];
  const craneo = simetrico(mitad, X);
  const domo = luzEsfera(106, 96, 84), cara = luzEsfera(112, 168, 64);
  const luz = conManchas((x, y) => Math.max(domo(x, y), cara(x, y) * 0.9), [[64, 136, 13, -0.6], [176, 136, 13, -0.8], [88, 172, 11, -0.5], [152, 172, 11, -0.6], [97, 116, 22, -0.35], [143, 116, 22, -0.45], [120, 150, 12, -0.4]]);
  L.sombra(craneo, luz, { paso: 2.3, curva: 0.6 });
  L.trazo(craneo, { pulso: 1, clase: "belmont-plate__s--peso" });
  // la mandíbula, algo abierta: se ve el hueco entre los dientes
  const mand = [[66, 166], [67, 188], [74, 208], [90, 224], [108, 231], [120, 233], [132, 231], [150, 224], [166, 208], [173, 188], [174, 166]];
  L.sombra([...mand, [160, 200], [120, 210], [80, 200]], conManchas(luzEsfera(110, 196, 62), [[162, 214, 16, -0.5], [120, 214, 10, -0.3]]), { paso: 2.6, curva: -0.4 });
  L.trazo(mand, { pulso: 1, clase: "belmont-plate__s--peso" });
  L.trazo([[80, 200], [100, 208], [120, 210], [140, 208], [160, 200]], { pasadas: 1 });
  // órbitas: un rodete de hueso y, dentro, negro
  const orb = (s) => { const P = [[80, 109], [86, 99], [99, 96], [111, 102], [114, 117], [108, 132], [94, 137], [81, 129]].map(([x, y]) => [s < 0 ? 2 * X - x : x, y]); return [...P, P[0]]; };
  [1, -1].forEach((s) => {
    const P = orb(s);
    L.tinta(P); L.trazo(P, { clase: "belmont-plate__s--peso" });
    const ceja = [[74, 101], [86, 91], [102, 89], [116, 96]].map(([x, y]) => [s < 0 ? 2 * X - x : x, y]);
    L.trazo(ceja, { pulso: 0.8 });
    L.sombra(ceja.concat([[s < 0 ? 2 * X - 112 : 112, 98], [s < 0 ? 2 * X - 80 : 80, 104]]), () => (s > 0 ? 0.9 : 0.55), { paso: 1.6, capas: [[-0.25, 0.1], [0.9, 0.6]] }); // la ceja de hueso recoge la luz
    // pómulo
    L.trazo([[83, 136], [70, 147], [72, 158], [90, 158]].map(([x, y]) => [s < 0 ? 2 * X - x : x, y]), { pasadas: 1 });
  });
  // un brillo en el fondo de una órbita: algo mira desde dentro
  L.tinta(elipse(97, 120, 2.2, 2.6, 8), "belmont-plate__f--sangre");
  L.trazo([[90, 136], [89.5, 146], [90.5, 156], [89.8, 163]], { pasadas: 1, pulso: 0.2, clase: "belmont-plate__s--sangre" }); // una lágrima de sangre
  L.tinta(elipse(89.8, 165, 1.6, 2.2, 8), "belmont-plate__f--sangre");
  // nariz: corazón invertido
  const nariz = [[120, 134], [113, 141], [110, 154], [113, 163], [120, 160], [127, 163], [130, 154], [127, 141], [120, 134]];
  L.tinta(nariz); L.trazo(nariz, { clase: "belmont-plate__s--peso" });
  L.trazo([[120, 140], [120, 158]], { pasadas: 1 });
  // dientes: dos hileras apretadas, cada pieza con su raíz; los caninos, largos y afilados
  const fila = (yEnc, yFilo, dir) => {
    const xs = Array.from({ length: 11 }, (_, i) => 90 + i * 6 + (i % 3 ? 0 : 0.6));
    L.trazo(xs.map((x) => [x, yEnc + Math.abs(x - 120) * 0.06 * dir]), { pasadas: 1, pulso: 0.3 });          // encía
    L.trazo(xs.map((x, i) => [x, yFilo - Math.abs(x - 120) * 0.08 * dir + (i % 2 ? 0.6 : -0.6) * dir]), { pasadas: 1, pulso: 0.3 }); // filo
    xs.slice(0, -1).forEach((x, i) => {
      const can = i === 1 || i === 8, xm = x + 3;
      L.trazo([[x, yEnc + Math.abs(x - 120) * 0.06 * dir], [x + 0.4, yFilo - Math.abs(x - 120) * 0.08 * dir]], { pasadas: 1, pulso: 0.2 });
      if (can) L.trazo([[x + 0.6, yFilo], [xm, yFilo + dir * 7], [x + 5.4, yFilo]], { pasadas: 1, clase: "belmont-plate__s--peso" });
      if (xm < 112) L.sombra([[x + 0.8, yEnc + 1 * dir], [x + 3.4, yEnc + 1 * dir], [x + 3.4, yFilo - 1 * dir], [x + 0.8, yFilo - 1 * dir]], () => 0.9, { paso: 1.1, capas: [[1.5, 0.1]] });
    });
  };
  L.tinta([[86, 197], [120, 201], [154, 197], [154, 204], [120, 207], [86, 204]]); // la boca, negra
  fila(185, 198, 1); fila(214, 204, -1);
  // grietas y la sutura coronal en zigzag
  L.trazo([[142, 28], [138, 40], [146, 50], [140, 62], [148, 74], [144, 82]], { pasadas: 1, pulso: 0.3, clase: "belmont-plate__s--peso" });
  L.trazo([[146, 50], [156, 56], [160, 66]], { pasadas: 1, pulso: 0.3 });
  L.trazo(Array.from({ length: 17 }, (_, i) => [72 + i * 6, 52 - Math.sin((i / 16) * Math.PI) * 18 + (i % 2 ? 2.5 : -2.5)]), { pasadas: 1, pulso: 0.3 });
  // el sello del grimorio alrededor, con su lema
  L.trazo(elipse(120, 128, 112, 112, 40), { pasadas: 1, clase: "belmont-plate__s--guia" });
  L.trazo(elipse(120, 128, 100, 100, 40), { pasadas: 1, clase: "belmont-plate__s--guia" });
  L.sello(120, 128, 104, "QVOD · TV · ES · EGO · FVI · ✠ · QVOD · EGO · SVM · TV · ERIS · ✠ · MEMENTO · MORI · ✠");
  [0, 72, 144, 216, 288].forEach((g) => { const a = (g - 90) * Math.PI / 180; L.trazo(elipse(120 + Math.cos(a) * 112, 128 + Math.sin(a) * 112, 3, 3, 8), { pasadas: 1, clase: "belmont-plate__s--sangre" }); });
  return L.svg("4 12 232 234");
}

const LAMINAS = [
  { sel: ".belmont-whip", sitio: "izq-arriba", n: "I", dibujo: murcielago, nota: "apunta adonde vuela, no adonde está", pie: "Del vuelo del murciélago" },
  { sel: ".belmont-stages__head", sitio: "der", n: "II", dibujo: arana, nota: "baja cuando nadie mira", pie: "De la araña que cuelga en la cripta" },
  { sel: ".belmont-secret", en: ".belmont-secret__wallbox", sitio: "esquina", n: "III", dibujo: muro, nota: "donde hay telaraña, nadie ha pasado", pie: "Del muro hueco: golpéalo" },
  { sel: ".belmont-music", sitio: "der-arriba", n: "IV", dibujo: organo, nota: "suena desde abajo, como la tierra", pie: "Del órgano de la capilla" },
  { sel: ".belmont-sheet", sitio: "der-arriba", n: "V", dibujo: calavera, nota: "a esto llega todo cazador", pie: "De la calavera, que mira desde el fondo" },
];

export function bocetos({ gsap, mov }) {
  const laminas = [];
  LAMINAS.forEach((l) => {
    const sec = document.querySelector(l.sel);
    if (!sec) return;
    sec.classList.add("belmont-layered");
    const fig = document.createElement("figure");
    fig.className = `belmont-plate belmont-plate--${l.sitio}`;
    fig.setAttribute("aria-hidden", "true");
    fig.innerHTML = `${l.dibujo()}<span class="belmont-plate__note">${l.nota}</span><figcaption class="belmont-plate__cap"><span>Lám. ${l.n}</span> ${l.pie} — «${l.nota}»</figcaption>`;
    (l.en ? sec.querySelector(l.en) : sec).append(fig);
    laminas.push({ fig, sec });
  });

  mov.añadir(({ reducido }) => {
    if (reducido) { laminas.forEach(({ fig }) => fig.classList.add("is-drawn")); return; }
    const tls = laminas.map(({ fig }) => {
      const trazos = [...fig.querySelectorAll(".belmont-plate__s, .belmont-plate__h")];
      const nota = fig.querySelector(".belmont-plate__note"), pie = fig.querySelector(".belmont-plate__cap");
      const tintas = [...fig.querySelectorAll(".belmont-plate__f, .belmont-plate__t")];
      gsap.set(trazos, { strokeDasharray: 1, strokeDashoffset: 1 });
      if (tintas.length) gsap.set(tintas, { autoAlpha: 0 });
      gsap.set(nota, { clipPath: "inset(0% 100% 0% 0%)" }); // está volteada: su borde izquierdo es el derecho a la vista
      gsap.set(pie, { autoAlpha: 0 });
      // la mano entra con la sección, la lámina se queda mientras se lee y se borra al salir
      return gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 92%", end: "bottom 8%", scrub: true } })
        .to(trazos, { strokeDashoffset: 0, duration: 0.1, ease: "none", stagger: { amount: 0.3 } }, 0)
        .add(tintas.length ? gsap.to(tintas, { autoAlpha: 1, duration: 0.08, stagger: 0.01 }) : () => {}, 0.24) // la tinta se posa cuando ya está el dibujo
        .to(nota, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.12, ease: "none" }, 0.3)
        .to(pie, { autoAlpha: 1, duration: 0.06 }, 0.38)
        .to(trazos, { strokeDashoffset: -1, duration: 0.08, ease: "none", stagger: { amount: 0.22, from: "end" } }, 0.68)
        .to([nota, pie, ...tintas], { autoAlpha: 0, duration: 0.1 }, 0.72);
    });
    return () => tls.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  });
}

/* ── Enemigos del campo de pruebas del arsenal, con la misma mano de grimorio.
   Se dibujan encima de un maniquí low poly esculpido (tools-ref/modelos.html): de él salen las
   proporciones, qué tapa a qué y la luz; los ojos, las fauces, las garras y el pelo van a mano. ── */
const vb = (R) => R.vb.join(" ");
function lobo() {
  const L = lapiz(67), R = REF.lobo, A = R.anclas;
  L.calco(R);
  // crin y pelo del lomo, del cuello y del cráneo
  R.partes.filter((q) => q.id === 4 || q.id === 5).forEach((q) => L.mechones(q.p, { cada: 2.6, largo: 5, arriba: 0.42 }));
  R.partes.filter((q) => q.id === 6).forEach((q) => L.mechones(q.p, { cada: 3, largo: 3.2, arriba: 0.3 }));
  // costillas bajo la piel
  [0, 1, 2, 3].forEach((k) => { const [x, y] = A.costillas; L.trazo([[x - 9, y - 8 + k * 6], [x, y - 11 + k * 6.5], [x + 10, y - 7 + k * 6]], { pasadas: 1, clase: "belmont-plate__s--guia" }); });
  // fauces: el hueco entre las dos quijadas en negro, colmillos arriba y abajo
  const [bx, by] = A.boca, [tx, ty] = A.trufa;
  const fila = (t) => [bx + (tx - bx) * t, by + (ty - by) * t];
  L.tinta([fila(-0.15).map((v, i) => v + (i ? 0.5 : 0)), fila(0.4).map((v, i) => v - (i ? 1.6 : 0)), fila(0.85).map((v, i) => v + (i ? 1.2 : 0)), fila(0.5).map((v, i) => v + (i ? 5 : 0)), fila(0.05).map((v, i) => v + (i ? 4.2 : 0))]);
  [0.0, 0.18, 0.36, 0.56, 0.74].forEach((t, i) => { const [x, y] = fila(t); L.trazo([[x - 0.8, y - 1.4], [x + 0.1, y + 3.4 + (i === 1 ? 1.6 : 0)], [x + 0.8, y - 1.4]], { pasadas: 1, pulso: 0.15 }); });
  [0.1, 0.3, 0.5].forEach((t, i) => { const [x, y] = fila(t); L.trazo([[x - 0.7, y + 4.6], [x + 0.1, y + 1.0 - (i === 0 ? 1.2 : 0)], [x + 0.7, y + 4.6]], { pasadas: 1, pulso: 0.15 }); });
  // el hocico arrugado, gruñendo, y el ceño sobre el ojo que brilla
  [0, 1, 2].forEach((k) => { const [x, y] = fila(0.35 + k * 0.18); L.trazo([[x, y - 5 - k * 0.6], [x + 2, y - 7], [x + 4, y - 5.4 - k * 0.3]], { pasadas: 1 }); });
  const [ox, oy] = A.ojo;
  L.trazo([[ox - 5, oy - 1.5], [ox, oy - 3.8], [ox + 5, oy - 2.4]], { pasadas: 1, clase: "belmont-plate__s--peso" });
  L.tinta([[ox - 2.6, oy], [ox, oy - 1.3], [ox + 2.6, oy - 0.3], [ox, oy + 1.1]], "belmont-plate__f--sangre");
  L.tinta(elipse(tx + 0.5, ty, 1.9, 1.5, 6)); // la trufa
  // garras largas y curvas, y las de los pies
  const [gx, gy] = A.garra;
  [[-1.5, 0], [0, 1], [1.8, 1.6]].forEach(([dx, dy]) => L.trazo([[gx + dx, gy + dy], [gx + dx - 4, gy + dy + 4], [gx + dx - 5.5, gy + dy + 9]], { clase: "belmont-plate__s--peso" }));
  [A.pie1, A.pie2].forEach(([x, y]) => [0, 2.4].forEach((d) => L.trazo([[x + d, y - 1.5], [x + d - 3.5, y + 0.6], [x + d - 5, y + 2]], { pasadas: 1 })));
  L.texto(R.vb[0] + R.vb[2] / 2, R.suelo + 10, "LVPVS · HOMINARIVS", { clase: "belmont-plate__t--centro" });
  return L.svg(vb(R));
}
function vampiro() {
  const L = lapiz(61), R = REF.vampiro, A = R.anclas;
  // dentro de la capa, nada: el cuerpo es un hueco de tinta
  R.partes.filter((q) => q.id === 2).forEach((q) => L.tinta(q.p));
  L.calco({ ...R, partes: R.partes.filter((q) => q.id !== 2) });
  // la cara: cuencas hundidas con una brasa, cejas juntas, nariz ganchuda, colmillos
  [[A.ojoI, -1], [A.ojoD, 1]].forEach(([[x, y], k]) => {
    L.tinta([[x - 3.2, y], [x - k * 0.8, y - 1.9], [x + 3.2, y], [x + k * 0.8, y + 2]]);
    L.tinta(elipse(x, y + 0.1, 1.1, 0.9, 6), "belmont-plate__f--sangre");
    L.trazo([[x - k * 3, y - 3], [x + k * 0.5, y - 2.4], [x + k * 2.4, y - 1.2]].map(([a, b]) => [a, b]), { pasadas: 1, clase: "belmont-plate__s--peso" });
  });
  const [bx, by] = A.boca, mx = (A.ojoI[0] + A.ojoD[0]) / 2;
  L.trazo([[mx, A.ojoI[1] + 1.5], [mx - 0.6, by - 3], [mx - 1.8, by - 1.6], [mx, by - 1.2]], { pasadas: 1 });
  L.tinta([[bx - 3, by], [bx, by - 0.4], [bx + 3, by], [bx + 1.8, by + 1.5], [bx - 1.8, by + 1.5]]);
  L.trazo([[bx - 1.6, by], [bx - 1.3, by + 3.8]], { clase: "belmont-plate__s--peso" }); L.trazo([[bx + 1.6, by], [bx + 1.3, by + 3.8]], { clase: "belmont-plate__s--peso" });
  // uñas largas en las manos que cierran la capa
  [[A.manoI, 1], [A.manoD, -1]].forEach(([[x, y], k]) => { for (let i = 0; i < 4; i++) L.trazo([[x - k * 3.6, y + 3 + i * 1.8], [x - k * 5.4, y + 5.6 + i * 1.8], [x - k * 5, y + 7.4 + i * 1.6]], { pasadas: 1, pulso: 0.15 }); });
  L.texto(R.vb[0] + R.vb[2] / 2, R.suelo + 10, "VAMPYRVS", { clase: "belmont-plate__t--centro" });
  return L.svg(vb(R));
}
export const ENEMIGOS = { vampiro, lobo, murcielago };
export const LAMINAS_PRUEBA = { calavera, murcielago, vampiro, lobo }; // vista previa de las láminas (herramientas)
