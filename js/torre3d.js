// Torre del reloj en 3D: engranajes de hierro y latón con sus dientes, la esfera con números romanos,
// las agujas, el péndulo y las vigas por las que trepa el cazador. No sustituye a la escena HTML:
// la lee. Cada fotograma copia la posición, el tamaño y el giro de cada pieza del DOM (que siguen
// animando GSAP y el juego) y la coloca en un espacio en píxeles, con una cámara en perspectiva
// calibrada para que el plano z = 0 coincida exactamente con la página. Lo que va más atrás se
// recoloca para seguir en su sitio en pantalla, pero recibe otra luz y la niebla del fondo.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function crearTorre({ pin, reducido = false }) {
  const canvas = document.createElement("canvas");
  canvas.className = "belmont-clock__3d";
  canvas.setAttribute("aria-hidden", "true");
  pin.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno; escena.environmentIntensity = 0.22;
  escena.fog = new THREE.Fog(0x07050b, 1500, 3400);
  const FOV = 32, camara = new THREE.PerspectiveCamera(FOV, 1, 10, 6000);

  // ── materiales: hierro ennegrecido, latón viejo, madera podrida, esfera de bronce oscuro ──
  const hierro = new THREE.MeshStandardMaterial({ color: 0x2a2421, metalness: 0.85, roughness: 0.55 });
  const laton = new THREE.MeshStandardMaterial({ color: 0x7a5a2c, metalness: 0.9, roughness: 0.42 });
  const oxido = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, metalness: 0.5, roughness: 0.8 });
  const madera = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, metalness: 0, roughness: 0.92 });
  const oro = new THREE.MeshStandardMaterial({ color: 0xd7b06a, metalness: 1, roughness: 0.25, emissive: 0x3a2408, emissiveIntensity: 0.6 });
  const sangre = new THREE.MeshStandardMaterial({ color: 0x8a1222, metalness: 0.4, roughness: 0.35, emissive: 0x2a0408 });

  // ── engranaje unitario (radio exterior 1) con dientes trapezoidales, llanta, radios y cubo ──
  const engranajes = new Map();
  const geoEngranaje = (dientes, radios) => {
    const k = dientes + "-" + radios;
    if (engranajes.has(k)) return engranajes.get(k);
    const s = new THREE.Shape(), R = 1, r = 0.84, paso = (Math.PI * 2) / dientes;
    for (let i = 0; i < dientes; i++) {
      const a = i * paso;
      const pts = [[r, a], [R, a + paso * 0.18], [R, a + paso * 0.42], [r, a + paso * 0.6], [r, a + paso]];
      pts.forEach(([rr, aa], j) => { const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr; if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y); });
    }
    // huecos entre los radios
    for (let i = 0; i < radios; i++) {
      const a0 = (i / radios) * Math.PI * 2 + 0.16, a1 = ((i + 1) / radios) * Math.PI * 2 - 0.16, h = new THREE.Path();
      h.absarc(0, 0, 0.7, a0, a1, false); h.absarc(0, 0, 0.26, a1 - 0.08, a0 + 0.08, true); h.closePath();
      s.holes.push(h);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -0.06);
    engranajes.set(k, geo);
    return geo;
  };
  const cubo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 20); cubo.rotateX(Math.PI / 2);
  const remache = new THREE.SphereGeometry(0.05, 8, 6);

  // ── las piezas del DOM que se leen ──
  const capaZ = { far: -1100, mid: -480 };
  const piezas = [];
  pin.querySelectorAll('[data-depth="far"] [data-gear], [data-depth="mid"] [data-gear]').forEach((el, i) => {
    const capa = el.closest("[data-depth]").dataset.depth, dientes = Math.max(8, Number(el.dataset.teeth) || 12);
    const g = new THREE.Group();
    const rueda = new THREE.Mesh(geoEngranaje(dientes, i % 3 === 0 ? 4 : 6), i % 2 ? laton : hierro); g.add(rueda);
    const c = new THREE.Mesh(cubo, oxido); g.add(c);
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(remache, oxido); const a = (k / 6) * Math.PI * 2; m.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.09); g.add(m); }
    escena.add(g);
    piezas.push({ el, g, z: capaZ[capa] - (i % 3) * 60, tipo: "rueda" });
  });

  // la esfera: bisel de hierro, dial de bronce con números romanos y un anillo de remaches
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d");
    const gr = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    gr.addColorStop(0, "#15141a"); gr.addColorStop(0.65, "#0d0c10"); gr.addColorStop(1, "#050407");
    x.fillStyle = gr; x.fillRect(0, 0, 1024, 1024);
    // mugre y grietas
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "120,90,50"},${Math.random() * 0.08})`; x.beginPath(); x.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 14, 0, 7); x.fill(); }
    x.strokeStyle = "rgba(0,0,0,0.55)"; x.lineWidth = 2.2;
    [[[300, 160], [340, 260], [320, 330], [380, 420]], [[700, 780], [660, 700], [690, 640]]].forEach((P) => { x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); });
    x.strokeStyle = "#a88446"; x.lineWidth = 6; x.beginPath(); x.arc(512, 512, 470, 0, 7); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(512, 512, 340, 0, 7); x.stroke();
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; const r0 = i % 5 ? 452 : 430; x.lineWidth = i % 5 ? 3 : 7; x.beginPath(); x.moveTo(512 + Math.cos(a) * r0, 512 + Math.sin(a) * r0); x.lineTo(512 + Math.cos(a) * 470, 512 + Math.sin(a) * 470); x.stroke(); }
    const N = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    x.fillStyle = "#b08f55"; x.textAlign = "center"; x.textBaseline = "middle";
    N.forEach((t, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.save(); x.translate(512 + Math.cos(a) * 385, 512 + Math.sin(a) * 385); x.rotate(a + Math.PI / 2);
      x.font = `600 ${i === 0 ? 92 : 74}px "Belmont Cinzel", "Cinzel", Georgia, serif`; x.fillText(t, 0, 0); x.restore();
    });
    // el lema alrededor del centro y una calavera grabada
    x.font = '500 34px "Belmont Cinzel", "Cinzel", Georgia, serif'; x.fillStyle = "rgba(168,132,70,0.75)";
    const lema = "· TEMPVS · FVGIT · MORS · VENIT ·"; [...lema].forEach((ch, i) => { const a = (i / lema.length) * Math.PI * 2 - Math.PI / 2; x.save(); x.translate(512 + Math.cos(a) * 300, 512 + Math.sin(a) * 300); x.rotate(a + Math.PI / 2); x.fillText(ch, 0, 0); x.restore(); });
    x.strokeStyle = "rgba(168,132,70,0.55)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 478, 84, Math.PI * 0.82, Math.PI * 2.18); x.quadraticCurveTo(586, 548, 560, 566); x.lineTo(556, 606); x.lineTo(468, 606); x.lineTo(464, 566); x.quadraticCurveTo(438, 548, 434, 530); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(470, 590); x.lineTo(554, 590); x.stroke();
    x.fillStyle = "rgba(0,0,0,0.85)"; [[478, 480], [546, 480]].forEach(([a, b]) => { x.beginPath(); x.ellipse(a, b, 22, 26, 0, 0, 7); x.fill(); });
    x.beginPath(); x.moveTo(512, 520); x.lineTo(500, 548); x.lineTo(524, 548); x.closePath(); x.fill();
    for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(474 + i * 13, 582); x.lineTo(474 + i * 13, 604); x.stroke(); }
    // vidrio roto encima: grietas que salen de un golpe
    x.strokeStyle = "rgba(190,200,230,0.22)"; x.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) { let px = 690, py = 300, a = i * 0.7 + 0.3; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { a += (Math.random() - 0.5) * 0.7; px += Math.cos(a) * 40; py += Math.sin(a) * 40; x.lineTo(px, py); } x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const reloj = new THREE.Group(); escena.add(reloj);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.62 }));
  reloj.add(dial);
  const bisel = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.06, 14, 128), hierro); reloj.add(bisel);
  const bisel2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.035, 10, 128), laton); bisel2.position.z = -0.02; reloj.add(bisel2);
  for (let k = 0; k < 24; k++) { const m = new THREE.Mesh(remache, oxido); const a = (k / 24) * Math.PI * 2; m.position.set(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0.03); m.scale.setScalar(0.7); reloj.add(m); }
  // púas de la corona del reloj, hacia fuera
  for (let k = 0; k < 12; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 6), hierro); const a = (k / 12) * Math.PI * 2; p.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0); p.rotation.z = a - Math.PI / 2; reloj.add(p); }
  // la XII, que se enciende cuando la aguja del juego la cruza
  const brillo = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  brillo.position.set(0, 0.75, 0.02); reloj.add(brillo);
  // agujas: forma recortada y extruida, con pivote en el centro
  const aguja = (largo, ancho, punta, mat) => {
    const s = new THREE.Shape();
    s.moveTo(-ancho, -0.12); s.lineTo(-ancho * 0.6, largo * 0.62); s.lineTo(-ancho * 2.2, largo * 0.7); s.lineTo(0, largo * punta);
    s.lineTo(ancho * 2.2, largo * 0.7); s.lineTo(ancho * 0.6, largo * 0.62); s.lineTo(ancho, -0.12); s.lineTo(0, -0.2); s.closePath();
    const h = new THREE.Path(); h.absarc(0, largo * 0.68, ancho * 1.1, 0, Math.PI * 2, false); s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 });
    const m = new THREE.Mesh(geo, mat); return m;
  };
  const agH = aguja(0.5, 0.035, 1, hierro), agM = aguja(0.78, 0.024, 1, sangre), agJ = aguja(0.88, 0.02, 1, oro);
  agH.position.z = 0.04; agM.position.z = 0.07; agJ.position.z = 0.1;
  reloj.add(agH, agM, agJ);
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 16), laton); eje.rotation.x = Math.PI / 2; eje.position.z = 0.1; reloj.add(eje);
  // el péndulo: vara de hierro y un disco de latón con su calavera
  const pendulo = new THREE.Group(); escena.add(pendulo);
  const vara = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hierro); pendulo.add(vara);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 40), laton); disco.rotation.x = Math.PI / 2; pendulo.add(disco);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 10, 40), oxido); pendulo.add(aro);
  // las vigas: madera vieja con dos escuadras de hierro y sus clavos
  const vigas = [];
  pin.querySelectorAll("[data-steps] span").forEach((el) => {
    const g = new THREE.Group();
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), madera); g.add(tabla);
    const banda = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hierro); g.add(banda);
    const esc = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), hierro); g.add(m); return m; });
    escena.add(g);
    vigas.push({ el, g, tabla, banda, esc });
  });

  // cadenas que cuelgan del campanario, al fondo
  const eslabon = new THREE.TorusGeometry(1, 0.28, 6, 12), cadenas = [];
  [[0.14, -700], [0.86, -820], [0.33, -1300]].forEach(([fx, z], j) => {
    const c = new THREE.Group();
    for (let k = 0; k < 40; k++) { const e = new THREE.Mesh(eslabon, k % 4 ? hierro : oxido); e.position.y = -k * 2.6; e.scale.set(1, 1.6, 1); e.rotation.y = k % 2 ? Math.PI / 2 : 0; c.add(e); }
    escena.add(c); cadenas.push({ c, fx, z, f: j * 1.7 });
  });
  // ── luz: el resplandor de la esfera, la luna por detrás y una lámpara de aceite que oscila ──
  escena.add(new THREE.HemisphereLight(0x5a4a7a, 0x120a06, 0.55));
  const luna = new THREE.DirectionalLight(0x9a8ad8, 2.2); luna.position.set(-0.6, 0.8, 0.4); escena.add(luna);
  const calido = new THREE.PointLight(0xffa860, 3.2, 0, 0); escena.add(calido);
  const lampara = new THREE.PointLight(0xff8a3a, 2.2, 0, 0); escena.add(lampara);

  const cara = pin.querySelector("[data-clock-face]"), hH = pin.querySelector("[data-hand-h]"), hM = pin.querySelector("[data-hand-m]"), hJ = pin.querySelector("[data-hand-game]");
  const elPend = pin.querySelector("[data-pendulum]"), bob = elPend && elPend.querySelector("span");
  let W = 0, H = 0, D = 1;
  const medir = () => {
    const r = pin.getBoundingClientRect();
    if (!r.width || (r.width === W && r.height === H)) return;
    W = r.width; H = r.height; renderer.setSize(W, H, false);
    D = H / 2 / Math.tan((FOV / 2) * Math.PI / 180);
    camara.aspect = W / H; camara.position.set(0, 0, D); camara.near = 10; camara.far = D + 3000; camara.updateProjectionMatrix();
  };
  // de un punto de la página (px) al plano de profundidad z, manteniéndolo en su sitio en pantalla
  const aMundo = (px, py, z, v) => { const k = (D - z) / D; return v.set((px - W / 2) * k, -(py - H / 2) * k, z); };
  const rot = (el) => (el ? -(Number(gsap.getProperty(el, "rotation")) || 0) * Math.PI / 180 : 0);
  const gsap = window.gsap;
  const v = new THREE.Vector3();

  const pintar = (t = 0) => {
    medir(); if (!W) return;
    const base = pin.getBoundingClientRect();
    for (const p of piezas) {
      const r = p.el.getBoundingClientRect(), s = p.el.offsetWidth / 2;
      aMundo(r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top, p.z, v);
      p.g.position.copy(v); p.g.scale.setScalar(s * (D - p.z) / D);
      p.g.rotation.z = rot(p.el);
    }
    if (cara) {
      const r = cara.getBoundingClientRect(), s = r.width / 2;
      aMundo(r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top, -40, v);
      reloj.position.copy(v); reloj.scale.setScalar(s * (D + 40) / D);
      agH.rotation.z = rot(hH); agM.rotation.z = rot(hM); agJ.rotation.z = rot(hJ);
      const caliente = cara.classList.contains("is-hot"), jugando = cara.classList.contains("is-playing");
      agH.visible = agM.visible = !jugando; // en la prueba solo cuenta la aguja dorada
      brillo.material.opacity += ((caliente ? 0.9 : 0) - brillo.material.opacity) * 0.25;
      agJ.material.emissiveIntensity = caliente ? 2.2 : 0.6;
      calido.position.set(v.x, v.y, v.z + s * 1.6); calido.intensity = 2.6 + (caliente ? 2 : 0) + Math.sin(t * 2.3) * 0.3;
    }
    if (elPend && bob) {
      // el pivote del péndulo es su borde superior; su giro lo lleva GSAP
      let x = elPend.offsetLeft, y = elPend.offsetTop; for (let e = elPend.offsetParent; e && e !== pin; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      const largo = elPend.offsetHeight, ancho = Math.max(4, elPend.offsetWidth * 1.6), rb = bob.offsetWidth / 2 * 1.25;
      aMundo(x + elPend.offsetWidth / 2, y, -60, v);
      pendulo.position.copy(v); pendulo.rotation.z = rot(elPend);
      const k = (D + 60) / D;
      vara.scale.set(ancho * k, largo * k, ancho * k); vara.position.set(0, -largo * k / 2, 0);
      disco.scale.set(rb * k, rb * k, rb * k); disco.position.set(0, -largo * k, 0);
      aro.scale.set(rb * k, rb * k, rb * k); aro.position.set(0, -largo * k, 0.02 * rb);
    }
    for (const b of vigas) {
      const r = b.el.getBoundingClientRect(); if (!r.width) { b.g.visible = false; continue; }
      b.g.visible = true;
      const w = r.width, h = Math.max(8, r.height) * 1.4, prof = 46;
      aMundo(r.left + w / 2 - base.left, r.top + h / 2 - base.top, -prof / 2, v); // la cara de arriba coincide con la plataforma de la página
      b.g.position.copy(v);
      b.tabla.scale.set(w, h, prof);
      b.banda.scale.set(w * 1.02, h * 0.18, prof * 1.04); b.banda.position.set(0, -h * 0.1, 0);
      b.esc.forEach((m, i) => { m.scale.set(6, h * 2.4, 6); m.position.set((i ? 1 : -1) * w * 0.38, -h * 1.4, prof / 2 - 4); });
    }
    cadenas.forEach(({ c, fx, z, f }) => { aMundo(W * fx, -20, z, v); c.position.copy(v); const k = H / 60 * (D - z) / D * 0.18; c.scale.setScalar(k); c.rotation.z = Math.sin(t * 0.6 + f) * 0.03; });
    lampara.position.set(Math.sin(t * 0.7) * W * 0.3, H * 0.35, 260);
    lampara.intensity = 1.8 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;
    renderer.render(escena, camara);
  };
  const salir = () => {
    escena.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    [hierro, laton, oxido, madera, oro, sangre, dial.material].forEach((m) => m.dispose()); tex.dispose();
    entorno.dispose(); pmrem.dispose(); renderer.dispose(); canvas.remove();
  };
  if (reducido) pintar(0);
  return { pintar, salir };
}
