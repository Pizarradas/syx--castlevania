// Candelabro 3D: corona de hierro forjado, cadenas, brazos en voluta y velas de cera que gotean.
// Todo procedural (sin modelos): la lámpara gira despacio sobre su eje y las velas clicables
// (botones HTML) se recolocan cada fotograma sobre la mecha proyectada, así el juego sigue siendo accesible.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function crearCandelabro({ contenedor, velas, reducido = false }) {
  const canvas = document.createElement("canvas");
  canvas.className = "belmont-chandelier__3d";
  canvas.setAttribute("aria-hidden", "true");
  contenedor.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  escena.environmentIntensity = 0.18; // apenas un brillo en las aristas: el hierro viejo no reluce

  const camara = new THREE.PerspectiveCamera(37, 400 / 520, 0.1, 60);
  camara.position.set(0, -1.6, 10.2); // un poco desde abajo: la lámpara pesa sobre quien la mira
  camara.lookAt(0, 0.25, 0);

  // ── materiales ──
  const hierro = new THREE.MeshStandardMaterial({ color: 0x1f1a17, metalness: 0.82, roughness: 0.58 });
  const oxido = new THREE.MeshStandardMaterial({ color: 0x3a2418, metalness: 0.55, roughness: 0.78 });
  const cera = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.42, metalness: 0, emissive: 0x3a1c06, emissiveIntensity: 0.35 });
  const ceraVieja = new THREE.MeshStandardMaterial({ color: 0xcdbb98, roughness: 0.5 });
  const gema = new THREE.MeshStandardMaterial({ color: 0x8a0f1c, emissive: 0x6a0610, emissiveIntensity: 1.4, roughness: 0.18, metalness: 0.1 });

  const lampara = new THREE.Group();
  escena.add(lampara);
  const tubo = (pts, r, mat = hierro, seg = 64) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), mat);

  // ── corona: dos aros, barrotes retorcidos y púas hacia arriba ──
  const R = 1.72;
  const aro1 = new THREE.Mesh(new THREE.TorusGeometry(R, 0.065, 10, 96), hierro); aro1.rotation.x = Math.PI / 2; lampara.add(aro1);
  const aro2 = new THREE.Mesh(new THREE.TorusGeometry(R * 1.04, 0.045, 8, 96), oxido); aro2.rotation.x = Math.PI / 2; aro2.position.y = -0.34; lampara.add(aro2);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8, w = a + Math.sin(u * Math.PI) * 0.05; pts.push(new THREE.Vector3(Math.cos(w) * R * (1 + 0.04 * u), -0.34 * u, Math.sin(w) * R * (1 + 0.04 * u))); }
    lampara.add(tubo(pts, 0.018, hierro, 12));
    if (i % 2 === 0) { // púa: dientes de la corona
      const pua = new THREE.Mesh(new THREE.ConeGeometry(0.05, i % 4 === 0 ? 0.42 : 0.26, 6), hierro);
      pua.position.set(Math.cos(a) * R, i % 4 === 0 ? 0.24 : 0.16, Math.sin(a) * R); lampara.add(pua);
    }
    if (i % 3 === 0) { // ganchos colgantes bajo el aro de óxido
      const g = tubo([0, 0.3, 0.55, 0.7].map((u, k) => new THREE.Vector3(Math.cos(a) * R * 1.04, -0.34 - u * 0.5, Math.sin(a) * R * 1.04 + (k === 3 ? 0.06 : 0))), 0.012, oxido, 10);
      lampara.add(g);
    }
  }

  // ── eje central: balaustre torneado que acaba en una púa ──
  const perfil = [[0, 0.95], [0.07, 0.95], [0.09, 0.7], [0.16, 0.55], [0.09, 0.4], [0.1, 0.1], [0.26, -0.05], [0.3, -0.25], [0.2, -0.42], [0.1, -0.5], [0.13, -0.75], [0.24, -0.95], [0.16, -1.15], [0.07, -1.25], [0.05, -1.5], [0.02, -2.15], [0, -2.25]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  lampara.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 24), hierro));
  const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), gema); ojo.position.set(0, -0.25, 0.25); lampara.add(ojo); // el rubí de sangre
  // radios de la corona al eje
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    lampara.add(tubo([new THREE.Vector3(Math.cos(a) * 0.1, 0.6, Math.sin(a) * 0.1), new THREE.Vector3(Math.cos(a) * R * 0.5, 0.35, Math.sin(a) * R * 0.5), new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)], 0.03));
  }

  // ── cadenas: tres ramales a un gancho y un tramo que sube al techo ──
  const eslabon = new THREE.TorusGeometry(0.052, 0.015, 6, 14);
  const cadena = (a, b, n) => {
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, e = new THREE.Mesh(eslabon, k % 3 === 2 ? oxido : hierro);
      e.position.lerpVectors(a, b, u);
      e.lookAt(b); e.rotateY(Math.PI / 2); if (k % 2) e.rotateX(Math.PI / 2);
      e.scale.set(1, 1.5, 1); lampara.add(e);
    }
  };
  const gancho = new THREE.Vector3(0, 3.1, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; cadena(new THREE.Vector3(Math.cos(a) * R, 0.05, Math.sin(a) * R), gancho, 32); }
  const anilla = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 20), hierro); anilla.position.copy(gancho); lampara.add(anilla);
  cadena(gancho, new THREE.Vector3(0, 9, 0), 48);

  // ── brazos en voluta con platillo, pincho y vela ──
  const N = 8, puntas = [], llamas = [], piezasVela = [];
  const FRENTE = new Set([0, 1, 2, 6, 7]); // las del semicírculo delantero son los botones; 3, 4 y 5 quedan detrás
  const alturas = [0.62, 0.48, 0.7, 0.55, 0.66, 0.5, 0.58, 0.44];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 2; // la vela 0 queda en el frente
    const c = Math.cos(a), s = Math.sin(a), Rv = 2.05;
    const at = (r, y) => new THREE.Vector3(c * r, y, s * r);
    // brazo: sale del eje, baja, se curva hacia fuera y remata en una espiral bajo el platillo
    const pts = [at(0.12, -0.55), at(0.6, -0.95), at(1.3, -0.92), at(1.85, -0.62), at(Rv, -0.42)];
    lampara.add(tubo(pts, 0.04));
    const esp = []; for (let k = 0; k <= 20; k++) { const u = k / 20, rr = 0.2 * (1 - u * 0.8), w = u * Math.PI * 2.2; esp.push(at(1.3 + Math.cos(w) * rr * 0.9, -0.92 - 0.2 + Math.sin(w) * rr)); }
    lampara.add(tubo(esp, 0.022, hierro, 40));
    const plato = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0.0], [0.28, 0.06], [0.3, 0.1], [0.26, 0.08], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 18), oxido);
    plato.position.copy(at(Rv, -0.42)); lampara.add(plato);
    const h = alturas[i];
    const vela = new THREE.Group(); vela.position.copy(at(Rv, -0.36));
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, h, 16), FRENTE.has(i) ? cera : ceraVieja); cuerpo.position.y = h / 2; vela.add(cuerpo);
    // cráter derretido arriba y chorretones por el costado
    const borde = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 6, 16), cera); borde.rotation.x = Math.PI / 2; borde.position.y = h; vela.add(borde);
    for (let k = 0; k < 4; k++) {
      const w = k * 1.7 + i, largo = 0.12 + ((i * 7 + k * 3) % 5) * 0.06;
      const gota = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, largo, 4, 8), cera);
      gota.position.set(Math.cos(w) * 0.105, h - largo / 2 - 0.02, Math.sin(w) * 0.105); vela.add(gota);
    }
    const charco = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cera); charco.scale.y = 0.25; vela.add(charco);
    const mecha = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4), new THREE.MeshBasicMaterial({ color: 0x120c08 })); mecha.position.y = h + 0.04; vela.add(mecha);
    lampara.add(vela);
    const punta = new THREE.Object3D(); punta.position.set(0, h + 0.07, 0); vela.add(punta);
    puntas.push(punta); piezasVela.push({ cuerpo, borde, mecha, h });
    // luz cálida de cada vela (las de atrás alumbran el hierro desde dentro)
    const luz = new THREE.PointLight(0xff9a4a, 2.2, 4.5, 1.6); luz.position.set(0, h + 0.25, 0); vela.add(luz);
    llamas.push({ luz, fase: i * 1.37, viva: true });
    // las traseras tienen su propia llama dibujada en 3D (no son clicables)
    if (!FRENTE.has(i)) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
      fl.scale.set(1, 2.2, 1); fl.position.y = h + 0.16; vela.add(fl); llamas[i].malla = fl;
    }
  }
  // botones: las cinco velas delanteras en el orden de izquierda a derecha (la 2 a la izquierda, la 0 al frente, la 6 a la derecha)
  const orden = [2, 1, 0, 7, 6];
  // la luna por detrás, fría, para recortar el hierro contra la vidriera
  const luna = new THREE.DirectionalLight(0x8a78c8, 1.1); luna.position.set(-3, 4, -6); escena.add(luna);
  escena.add(new THREE.HemisphereLight(0x3a3050, 0x120806, 0.5));

  const v = new THREE.Vector3();
  let ancho = 0, alto = 0;
  const medir = () => {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h || (w === ancho && h === alto)) return;
    ancho = w; alto = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
  };

  const pintar = (t = 0) => {
    medir();
    lampara.rotation.y = reducido ? 0.15 : 0.15 + Math.sin(t * 0.22) * 0.32; // gira despacio sobre su eje, sin perder el frente
    lampara.rotation.x = reducido ? 0 : Math.sin(t * 0.9) * 0.025;
    orden.forEach((i, k) => {
      const boton = velas[k]; if (!boton) return;
      const rota = boton.classList.contains("is-broken");
      if (rota && llamas[i].viva) { // vela rota: queda el cabo apagado
        llamas[i].viva = false; llamas[i].luz.intensity = 0;
        const p = piezasVela[i]; p.cuerpo.scale.y = 0.25; p.cuerpo.position.y = p.h * 0.125; p.borde.visible = p.mecha.visible = false;
      }
      puntas[i].getWorldPosition(v); v.project(camara);
      boton.style.setProperty("--belmont-x", ((v.x + 1) / 2 * 100).toFixed(2) + "%");
      boton.style.setProperty("--belmont-y", ((1 - v.y) / 2 * 100 + 1.2).toFixed(2) + "%");
    });
    for (const l of llamas) {
      if (!l.viva) continue;
      const f = reducido ? 1 : 0.8 + 0.2 * Math.sin(t * 11 + l.fase) * Math.sin(t * 7.3 + l.fase * 2);
      l.luz.intensity = 2.2 * f;
      if (l.malla) l.malla.scale.set(1, 2.2 * f, 1);
    }
    renderer.render(escena, camara);
  };

  const salir = () => {
    escena.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    [hierro, oxido, cera, ceraVieja, gema].forEach((m) => m.dispose());
    entorno.dispose(); pmrem.dispose(); renderer.dispose(); canvas.remove();
  };
  return { pintar, salir };
}
