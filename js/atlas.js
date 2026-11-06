// Las once fases como pantalla de mapa: Transilvania dibujada a tinta (la misma mano que el
// cuaderno del cazador), un camino de la verja al trono y el cazador que lo recorre.
// La sección se fija y el scroll mueve a la vez al cazador por el camino y la cámara, que se acerca
// a él y al final se aleja para enseñar el viaje entero. Al llegar a cada fase se enciende su hito y
// el cartucho de abajo cuenta qué hay en ella. Con movimiento reducido: el mapa entero y la lista.
import { lapiz, elipse } from "./bocetos.js";

const VB = { w: 1600, h: 1000 };
// hitos de las fases en unidades del mapa: fuera del castillo abajo a la izquierda, dentro arriba a la derecha
const HITOS = [
  [150, 845], [330, 735], [520, 860], [705, 690], [905, 772], [1045, 635], [1215, 700], [1345, 575], [1160, 470], [1335, 330], [1470, 175],
];
const NOMBRES = "123456789AB";

function dibujar(nombres) {
  const L = lapiz(101), { trazo, linea, rayado, r, out } = L;
  const T = (x, y, txt, cls = "belmont-atlas__label", anchor = "middle") => out.push(`<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${txt}</text>`);
  // marco doble y rótulo
  [[24, 24, 1576, 976], [36, 36, 1564, 964]].forEach(([a, b, c, d], i) => trazo([[a, b], [c, b], [c, d], [a, d], [a, b]], { pasadas: 1, clase: i ? "belmont-plate__s--guia" : "" }));
  T(800, 92, "TRANSILVANIA · ANNO MDCXCI", "belmont-atlas__titlemap");
  // rosa de los vientos
  const R = [140, 150];
  [0, 1, 2, 3].forEach((k) => { const a = (k * Math.PI) / 2 - Math.PI / 2, b = a + Math.PI / 4; trazo([[R[0] + Math.cos(b) * 14, R[1] + Math.sin(b) * 14], [R[0] + Math.cos(a) * 62, R[1] + Math.sin(a) * 62], [R[0] + Math.cos(b - Math.PI / 2) * 14, R[1] + Math.sin(b - Math.PI / 2) * 14]], { pasadas: 1 }); });
  trazo(elipse(R[0], R[1], 40, 40, 20), { pasadas: 1, clase: "belmont-plate__s--guia" });
  T(R[0], R[1] - 72, "N", "belmont-atlas__label belmont-atlas__label--n");
  // montañas del fondo, sombreadas a la izquierda de cada cumbre
  for (let i = 0; i < 9; i++) {
    const x = 230 + i * 90 + r() * 30, y = 330 + r() * 60, h = 90 + r() * 80, w = 70 + r() * 40;
    trazo([[x - w, y + 40], [x - w * 0.4, y - h * 0.5], [x, y - h], [x + w * 0.5, y - h * 0.4], [x + w, y + 40]], { pulso: 1.4 });
    rayado([[x, y - h + 6], [x - w * 0.4, y - h * 0.5], [x - w + 8, y + 36], [x - 6, y + 36]], { paso: 9, largo: 10 });
  }
  // la luna
  const luna = elipse(640, 170, 44, 44, 20);
  trazo(luna, { pasadas: 1 }); rayado(elipse(652, 176, 30, 34, 14), { paso: 5, largo: 7 });
  // el río, de las montañas a las cuevas y fuera del mapa
  const rio = [[430, 400], [470, 560], [455, 680], [515, 800], [560, 900], [600, 975]];
  trazo(rio, { pulso: 1.2 }); trazo(rio.map(([x, y]) => [x + 22, y + 4]), { pasadas: 1, pulso: 1.2 });
  for (let k = 1; k < rio.length; k++) { const [x, y] = rio[k]; trazo([[x - 4, y - 24], [x + 4, y - 28], [x + 12, y - 24]], { pasadas: 1 }); }
  // 1 · las puertas: arco con barrotes y un cementerio
  const [gx, gy] = HITOS[0];
  trazo([[gx - 34, gy + 40], [gx - 34, gy - 8], [gx - 18, gy - 34], [gx, gy - 40], [gx + 18, gy - 34], [gx + 34, gy - 8], [gx + 34, gy + 40]]);
  [-22, -11, 0, 11, 22].forEach((d) => linea([gx + d, gy - 28 + Math.abs(d) * 0.4], [gx + d, gy + 40], { pasadas: 1 }));
  [[70, 900], [95, 935], [215, 915], [250, 880], [190, 950]].forEach(([x, y]) => { linea([x, y - 22], [x, y + 8], { pasadas: 1 }); linea([x - 9, y - 12], [x + 9, y - 12], { pasadas: 1 }); });
  // 2 · el bosque
  for (let i = 0; i < 12; i++) {
    const x = 250 + (i % 6) * 34 + r() * 14, y = 660 + Math.floor(i / 6) * 60 + r() * 18, h = 40 + r() * 20;
    trazo([[x - 13, y + h * 0.6], [x, y - h * 0.4], [x + 13, y + h * 0.6], [x - 13, y + h * 0.6]], { pasadas: 1 });
    linea([x, y + h * 0.6], [x, y + h * 0.8], { pasadas: 1 });
    rayado([[x, y - h * 0.3], [x + 11, y + h * 0.55], [x + 1, y + h * 0.55]], { paso: 4, largo: 5 });
  }
  // 3 · las aguas subterráneas: boca de la cueva con estalactitas
  const [cx, cy] = HITOS[2];
  trazo([[cx - 60, cy + 42], [cx - 52, cy - 10], [cx - 20, cy - 40], [cx + 20, cy - 42], [cx + 54, cy - 12], [cx + 62, cy + 42]], { pulso: 1.3 });
  [-36, -18, 0, 18, 36].forEach((d, i) => trazo([[cx + d - 5, cy - 30 + Math.abs(d) * 0.5], [cx + d, cy - 10 + (i % 2) * 8 + Math.abs(d) * 0.5], [cx + d + 5, cy - 30 + Math.abs(d) * 0.5]], { pasadas: 1 }));
  rayado([[cx - 48, cy - 6], [cx - 20, cy - 34], [cx + 20, cy - 36], [cx + 48, cy - 8], [cx + 50, cy + 40], [cx - 50, cy + 40]], { paso: 6, largo: 8 });
  // 4 · la mansión de los trucos
  const [mx, my] = HITOS[3];
  trazo([[mx - 46, my + 44], [mx - 46, my - 6], [mx, my - 50], [mx + 46, my - 6], [mx + 46, my + 44], [mx - 46, my + 44]]);
  linea([mx - 52, my - 2], [mx + 52, my - 2], { pasadas: 1 });
  [[-26, 10], [10, 10], [-26, 28], [10, 28]].forEach(([dx, dy]) => trazo([[mx + dx, my + dy], [mx + dx + 14, my + dy], [mx + dx + 14, my + dy + 10], [mx + dx, my + dy + 10], [mx + dx, my + dy]], { pasadas: 1 }));
  trazo(elipse(mx, my - 22, 9, 9, 10), { pasadas: 1, clase: "belmont-plate__s--sangre" }); // la rueda que gira
  // el castillo: muralla almenada con su puerta (fase 5) y las torres
  const muro = [[860, 800], [860, 735], [1560, 735]];
  trazo([[860, 820], ...muro.slice(0, 2), [1560, 735], [1560, 820]], { pulso: 1.1 });
  for (let x = 870; x < 1550; x += 26) trazo([[x, 735], [x, 721], [x + 13, 721], [x + 13, 735]], { pasadas: 1, pulso: 0.5 });
  rayado([[862, 740], [1558, 740], [1558, 818], [862, 818]], { paso: 12, largo: 9 });
  const [px, py] = HITOS[4];
  trazo([[px - 22, py + 46], [px - 22, py + 2], [px, py - 18], [px + 22, py + 2], [px + 22, py + 46]], { clase: "belmont-plate__s--sangre" });
  // 6 · el gran salón, con su lámpara de araña
  const [sx, sy] = HITOS[5];
  trazo([[sx - 70, sy + 80], [sx - 70, sy - 10], [sx, sy - 56], [sx + 70, sy - 10], [sx + 70, sy + 80]]);
  linea([sx, sy - 40], [sx, sy - 14], { pasadas: 1 }); trazo([[sx - 22, sy - 12], [sx, sy - 2], [sx + 22, sy - 12]], { pasadas: 1, clase: "belmont-plate__s--sangre" });
  // 7 · el almacén
  const [ax, ay] = HITOS[6];
  trazo([[ax - 52, ay + 34], [ax - 52, ay - 30], [ax + 52, ay - 30], [ax + 52, ay + 34]]);
  [-30, -10, 10, 30].forEach((d) => linea([ax + d, ay - 22], [ax + d, ay + 30], { pasadas: 1 }));
  // 8 · los pasadizos: un ataúd en las catacumbas
  const [fx, fy] = HITOS[7];
  trazo([[fx - 9, fy - 46], [fx + 9, fy - 46], [fx + 16, fy - 30], [fx + 8, fy + 2], [fx - 8, fy + 2], [fx - 16, fy - 30], [fx - 9, fy - 46]]);
  linea([fx, fy - 38], [fx, fy - 14], { pasadas: 1 }); linea([fx - 7, fy - 30], [fx + 7, fy - 30], { pasadas: 1 });
  // 9 · el tesoro
  const [tx, ty] = HITOS[8];
  [[-18, 8], [0, 0], [18, 8], [-9, -10], [9, -10], [0, -20]].forEach(([dx, dy]) => trazo(elipse(tx + dx, ty + dy - 26, 10, 4, 10), { pasadas: 1 }));
  // torres del interior
  const torre = (x, base, alto, ancho, aguja) => {
    trazo([[x - ancho, base], [x - ancho, base - alto], [x + ancho, base - alto], [x + ancho, base]], { pulso: 1.1 });
    trazo([[x - ancho - 6, base - alto], [x, base - alto - aguja], [x + ancho + 6, base - alto]]);
    rayado([[x + 2, base - alto + 4], [x + ancho - 2, base - alto + 4], [x + ancho - 2, base - 4], [x + 2, base - 4]], { paso: 6, largo: 8, ang: 1.2 });
  };
  torre(1090, 720, 160, 24, 70); torre(1440, 720, 220, 28, 80);
  // A · la torre del reloj
  const [kx, ky] = HITOS[9];
  torre(kx, 720, 720 - ky + 40, 30, 60);
  trazo(elipse(kx, ky - 64, 18, 18, 16), { pasadas: 1 }); linea([kx, ky - 64], [kx, ky - 78], { pasadas: 1, clase: "belmont-plate__s--sangre" }); linea([kx, ky - 64], [kx + 10, ky - 60], { pasadas: 1 });
  // B · la torre de Drácula, con su murciélago
  const [dx, dy] = HITOS[10];
  torre(dx, 330, 330 - dy + 30, 34, 110);
  trazo([[dx - 40, dy - 160], [dx - 22, dy - 172], [dx - 12, dy - 162], [dx, dy - 168], [dx + 12, dy - 162], [dx + 22, dy - 172], [dx + 40, dy - 160]], { pasadas: 1, clase: "belmont-plate__s--sangre" });
  // nombres junto a cada hito, como en los mapas viejos
  HITOS.forEach(([x, y], i) => T(x + (i % 2 ? 52 : -52), y + 78, nombres[i], "belmont-atlas__label", i % 2 ? "start" : "end"));
  // el camino: fantasma punteado y el trazo de sangre que avanza
  const camino = `M${HITOS.map(([x, y]) => `${x} ${y}`).join(" L")}`;
  out.push(`<path class="belmont-atlas__ghost" data-atlas-ghost d="${camino}"/>`, `<path class="belmont-atlas__route" data-atlas-route d="${camino}"/>`);
  HITOS.forEach(([x, y], i) => out.push(`<g class="belmont-atlas__node" data-atlas-node transform="translate(${x} ${y})"><circle r="17"/><text y="7">${NOMBRES[i]}</text></g>`));
  return out.join("");
}

export function atlas({ gsap, ScrollTrigger, mov, hud }) {
  const raiz = document.querySelector("[data-atlas]");
  if (!raiz) return;
  const pinEl = document.querySelector("[data-stages-pin]");
  const mapa = raiz.querySelector("[data-atlas-map]"), svg = raiz.querySelector("[data-atlas-svg]"), marcador = raiz.querySelector("[data-atlas-marker]");
  const cartas = [...raiz.querySelectorAll("[data-atlas-card]")];
  const figura = marcador.querySelector("[data-icon3d]");
  // silueta de reserva si no hay 3D
  marcador.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 40 64" aria-hidden="true" focusable="false"><path class="belmont-simon__cape" d="M20 10c-7 2-11 10-12 22l-5 24 11-8 6 12 6-12 11 8-5-24C31 20 27 12 20 10z"/><circle class="belmont-simon__head" cx="20" cy="8" r="5.5"/><path class="belmont-simon__body" d="M15 18h10l2 20h-4l-1 18h-4l-1-18h-4z"/></svg>`);
  svg.innerHTML = dibujar(cartas.map((c) => c.querySelector(".belmont-atlas__title").textContent));
  // el camino suavizado (pasa por los hitos) y la longitud a la que queda cada uno
  const ruta = svg.querySelector("[data-atlas-route]"), fantasma = svg.querySelector("[data-atlas-ghost]");
  const nodos = [...svg.querySelectorAll("[data-atlas-node]")];
  const P = HITOS.map(([x, y]) => [x, y]);
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], mxx = (x0 + x1) / 2, ondula = (i % 2 ? 1 : -1) * 60;
    d += ` Q${mxx + ondula * 0.3} ${(y0 + y1) / 2 + ondula} ${x1} ${y1}`;
  }
  [ruta, fantasma].forEach((p) => p.setAttribute("d", d));
  const total = ruta.getTotalLength();
  // dónde cae cada hito en el camino: una sola pasada gruesa por el trazado (getPointAtLength es caro) y un afinado local
  const muestras = []; for (let l = 0; l <= total; l += 16) { const p = ruta.getPointAtLength(l); muestras.push([l, p.x, p.y]); }
  const enHito = HITOS.map(([x, y]) => {
    let mejor = 0, dist = Infinity;
    for (const [l, px, py] of muestras) { const q = Math.hypot(px - x, py - y); if (q < dist) { dist = q; mejor = l; } }
    const c = mejor; for (let l = Math.max(0, c - 16); l <= Math.min(total, c + 16); l += 2) { const p = ruta.getPointAtLength(l); const q = Math.hypot(p.x - x, p.y - y); if (q < dist) { dist = q; mejor = l; } }
    return mejor;
  });
  ruta.style.strokeDasharray = total;
  let actual = -1;
  const fase = (i) => {
    if (i === actual) return;
    actual = i;
    cartas.forEach((c, k) => c.classList.toggle("is-on", k === i));
    nodos.forEach((n, k) => n.classList.toggle("is-lit", k <= i));
    if (i >= 0) hud.etapa(NOMBRES[i]);
  };

  mov.añadir(({ reducido }) => {
    if (reducido) { raiz.classList.add("is-static"); ruta.style.strokeDashoffset = 0; nodos.forEach((n) => n.classList.add("is-lit")); return; }
    raiz.classList.remove("is-static");
    const trazos = [...svg.querySelectorAll(".belmont-plate__s, .belmont-plate__h")];
    gsap.set(trazos, { strokeDasharray: 1, strokeDashoffset: 1 });
    // la mano dibuja el mapa mientras llegas a él
    const dibujo = gsap.to(trazos, { strokeDashoffset: 0, ease: "none", duration: 0.1, stagger: { amount: 0.9 }, scrollTrigger: { trigger: pinEl, start: "top 95%", end: "top 15%", scrub: true } });
    // cámara: geometría del mapa en píxeles (el mapa cubre la vista manteniendo su proporción)
    const vista = () => ({ w: raiz.clientWidth, h: raiz.clientHeight });
    const escalaBase = () => { const v = vista(); return Math.max(v.w / VB.w, v.h / VB.h); };
    const estado = { p: 0 };
    const ZOOM = 2.1;
    const pintar = () => {
      const v = vista(), k = escalaBase(), p = estado.p;
      // entra de lejos, se acerca al cazador, lo sigue y al final se aleja para ver el viaje
      const acerca = gsap.utils.clamp(0, 1, p / 0.07) * (1 - gsap.utils.clamp(0, 1, (p - 0.9) / 0.1));
      const S = 1 + (ZOOM - 1) * gsap.parseEase("power2.inOut")(acerca);
      const l = gsap.utils.clamp(0, 1, (p - 0.04) / 0.86) * total;
      const pt = ruta.getPointAtLength(l), sig = ruta.getPointAtLength(Math.min(total, l + 6));
      ruta.style.strokeDashoffset = total - l;
      const mxp = pt.x * k, myp = pt.y * k, W = VB.w * k * S, H = VB.h * k * S;
      // el cazador queda a la derecha del centro para dejar sitio al cartucho
      const cxv = v.w * (v.w > 900 ? 0.6 : 0.5), cyv = v.h * (v.w > 900 ? 0.5 : 0.62);
      const tx = gsap.utils.clamp(v.w - W, 0, cxv - mxp * S), ty = gsap.utils.clamp(v.h - H, 0, cyv - myp * S);
      gsap.set(mapa, { x: tx, y: ty, scale: S * k, transformOrigin: "0 0" });
      gsap.set(marcador, { x: tx + mxp * S, y: ty + myp * S });
      if (figura && Math.abs(sig.x - pt.x) > 0.5) figura.dataset.facing = sig.x >= pt.x ? "1" : "-1";
      // ritmo del paso: cuánto camino recorre por segundo, para que las piernas lo acompañen
      const ahora = performance.now();
      if (figura && pintar.l0 !== undefined) { const dts = Math.max(0.016, (ahora - pintar.t0) / 1000); figura.__anda = { v: Math.min(2, Math.abs(l - pintar.l0) / dts / 260), t: ahora }; }
      pintar.l0 = l; pintar.t0 = ahora;
      let i = -1; enHito.forEach((h, k2) => { if (l >= h - 2) i = k2; });
      fase(Math.max(0, i));
    };
    const viaje = gsap.to(estado, {
      p: 1, ease: "none", onUpdate: pintar,
      scrollTrigger: { trigger: pinEl, start: "top top", end: () => "+=" + innerHeight * 5.5, pin: true, scrub: true, invalidateOnRefresh: true, onRefresh: pintar },
    });
    gsap.set(marcador, { xPercent: -50, yPercent: -96 });
    pintar();
    const paso = gsap.to(marcador.children, { y: -5, duration: 0.24, yoyo: true, repeat: -1, ease: "sine.inOut" }); // camina
    return () => { [dibujo, viaje, paso].forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); }); gsap.set([mapa, marcador], { clearProps: "transform" }); };
  });
}
