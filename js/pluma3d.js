// La pluma de la carta, en 3D: una pluma negra de cuervo con su cálamo y un plumín de hierro
// manchado de tinta. Se apoya sobre el papel con su inclinación de escribir y proyecta una sombra
// de verdad sobre la carta (luz de vela arriba a la izquierda): al levantarla para saltar de
// renglón, la sombra se separa de la punta y se difumina.
// El lienzo cubre la carta con margen, y la cámara mira el papel desde arriba en píxeles de la carta.
import * as THREE from "three";

export function crearPluma({ carta, reducido = false }) {
  const MARGEN = { izq: 80, der: 380, arr: 360, aba: 120 };
  const canvas = document.createElement("canvas");
  canvas.className = "belmont-letter__3d";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;left:${-MARGEN.izq}px;top:${-MARGEN.arr}px;pointer-events:none;z-index:2`;
  carta.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);

  // ── la textura de la barba: barbillas en diagonal, borde claro y unas cuantas roturas ──
  const textura = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 1024; const x = c.getContext("2d");
    x.clearRect(0, 0, 256, 1024);
    // u (0 raquis → 1 borde) en horizontal; v (0 base → 1 punta) en vertical
    for (let y = 0; y < 1024; y += 2) {
      const v = y / 1024;
      let ancho = 256;
      // roturas: tramos donde la barba se abre
      if ((v > 0.36 && v < 0.38) || (v > 0.61 && v < 0.625) || (v > 0.8 && v < 0.808)) ancho = 140 + Math.random() * 40;
      const g = x.createLinearGradient(0, 0, ancho, 0);
      const plumon = v < 0.14; // la base, plumón suelto y claro
      g.addColorStop(0, plumon ? "rgba(70,62,72,0.95)" : "rgba(14,12,18,1)");
      g.addColorStop(0.7, plumon ? "rgba(90,82,94,0.6)" : "rgba(28,24,36,1)");
      g.addColorStop(1, plumon ? "rgba(120,110,120,0)" : "rgba(70,62,88,0.9)");
      x.fillStyle = g;
      x.save(); x.translate(0, 1024 - y); x.transform(1, -0.35, 0, 1, 0, 0); x.fillRect(0, 0, ancho - (plumon ? Math.random() * 90 : Math.random() * 10), 2); x.restore();
    }
    // brillo azulado de cuervo y las barbillas marcadas
    x.globalCompositeOperation = "source-atop";
    for (let y = 0; y < 1024; y += 7) { x.strokeStyle = `rgba(110,120,170,${0.12 + Math.random() * 0.1})`; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 1024 - y); x.lineTo(256, 1024 - y - 90); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const matBarba = new THREE.MeshStandardMaterial({ map: textura, alphaTest: 0.35, transparent: false, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.15 });
  const depthBarba = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: textura, alphaTest: 0.35 });
  const matCalamo = new THREE.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.92 });
  const matRaquis = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.5 });
  const matPlumin = new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 0.9, roughness: 0.3 });
  const matTinta = new THREE.MeshStandardMaterial({ color: 0x220608, metalness: 0.2, roughness: 0.15 });

  // ── la pluma, a lo largo de +Y desde la punta (0) hasta el final (L) ──
  const L = 300, pluma = new THREE.Group();
  const curva = (t) => new THREE.Vector3(Math.sin(t * Math.PI * 0.6) * 0.06 * L * t, t * L, 0); // el raquis se curva un poco
  const tubo = (t0, t1, r0, r1, mat) => {
    const pts = []; for (let i = 0; i <= 16; i++) pts.push(curva(t0 + (t1 - t0) * i / 16));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 1, 8, false);
    // estrechar el tubo hacia el final
    const p = g.attributes.position, n = pts.length; const c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const seg = Math.floor(i / 9) / 24, ctr = curva(t0 + (t1 - t0) * seg), r = r0 + (r1 - r0) * seg;
      c.fromBufferAttribute(p, i).sub(ctr).multiplyScalar(r).add(ctr); p.setXYZ(i, c.x, c.y, c.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
  };
  pluma.add(tubo(0.075, 0.3, 4.2, 3.6, matCalamo));
  pluma.add(tubo(0.3, 0.995, 3.2, 0.8, matRaquis));
  // plumín de hierro: un cono partido, con la punta mojada en tinta
  const plumin = new THREE.Mesh(new THREE.ConeGeometry(4.6, 0.09 * L, 12, 1, true), matPlumin); plumin.rotation.x = Math.PI; plumin.position.y = 0.045 * L; plumin.castShadow = true; pluma.add(plumin);
  const gota = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), matTinta); gota.scale.set(1, 1.6, 1); gota.position.y = 2.2; pluma.add(gota);
  // la barba: una cinta a cada lado del raquis, asimétrica (borde de ataque estrecho), con un poco de comba
  const barba = (lado) => {
    const NU = 6, NV = 48, pos = [], uv = [], idx = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, t = 0.3 + v * 0.695;
      const ancho = (lado > 0 ? 34 : 17) * Math.pow(Math.sin(Math.min(1, v * 1.15) * Math.PI * 0.92), 0.7) * (1 - v * 0.15);
      const c = curva(t);
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        pos.push(c.x + lado * ancho * u, c.y - ancho * u * 0.35, -u * u * 6 + (lado > 0 ? 0 : 1));
        uv.push(u, v);
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, matBarba); m.castShadow = true; m.customDepthMaterial = depthBarba; return m;
  };
  pluma.add(barba(1), barba(-1));

  // la jerarquía: punta → giro sobre el papel (acimut) → inclinación (elevación) → giro del eje (roll)
  const punta = new THREE.Group(), acimut = new THREE.Group(), elev = new THREE.Group();
  escena.add(punta); punta.add(acimut); acimut.add(elev); elev.add(pluma);

  // el papel recibe la sombra (solo la sombra: el papel de verdad es el HTML de debajo)
  const papel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x2a1a0c, opacity: 0.38 }));
  papel.receiveShadow = true; escena.add(papel);
  const vela = new THREE.DirectionalLight(0xffe2b8, 2.4);
  vela.castShadow = true; vela.shadow.mapSize.set(1024, 1024); vela.shadow.radius = 5; vela.shadow.bias = -0.0008;
  escena.add(vela, vela.target);
  escena.add(new THREE.HemisphereLight(0xfff0d8, 0x40301e, 1.1));

  let W = 0, H = 0;
  const medir = () => {
    const w = carta.offsetWidth + MARGEN.izq + MARGEN.der, h = carta.offsetHeight + MARGEN.arr + MARGEN.aba;
    if (w === W && h === H) return;
    W = w; H = h; canvas.style.width = w + "px"; canvas.style.height = h + "px"; renderer.setSize(w, h, false);
    camara.left = 0; camara.right = w; camara.top = 0; camara.bottom = -h; camara.updateProjectionMatrix();
    papel.scale.set(w, h, 1); papel.position.set(w / 2, -h / 2, 0);
    // la luz de la vela: arriba a la izquierda y algo baja, para que la sombra se alargue hacia abajo a la derecha
    vela.position.set(w * 0.5 - 380, -h * 0.5 + 300, 1100); vela.target.position.set(w / 2, -h / 2, 0);
    const s = vela.shadow.camera; s.left = -w * 0.7; s.right = w * 0.7; s.top = h * 0.7; s.bottom = -h * 0.7; s.near = 10; s.far = 3000; s.updateProjectionMatrix();
  };
  // estado de la pluma: punta en px de la carta (x, y), alzado en px, y un vaivén de la mano
  const E = { x: 0, y: 0, alzado: 0, visible: false };
  const pintar = (t = 0) => {
    medir();
    canvas.style.visibility = E.visible ? "visible" : "hidden";
    if (!E.visible) return;
    punta.position.set(E.x + MARGEN.izq, -(E.y + MARGEN.arr), 0.5 + E.alzado);
    const mano = reducido ? 0 : Math.sin(t * 7.3) * 0.02 + Math.sin(E.x * 0.21) * 0.035;
    acimut.rotation.z = -0.62 + mano;                 // la pluma apunta arriba a la derecha, hacia el hombro
    elev.rotation.x = 0.52 + E.alzado * 0.006;        // tendida sobre el papel (hacia la cámara, +z); al alzarla se endereza un poco
    pluma.rotation.y = 0.35 + mano * 2;               // la barba de canto, girada hacia la luz
    renderer.render(escena, camara);
  };
  const salir = () => { escena.traverse((o) => o.geometry && o.geometry.dispose()); [matBarba, depthBarba, matCalamo, matRaquis, matPlumin, matTinta].forEach((m) => m.dispose()); textura.dispose(); renderer.dispose(); canvas.remove(); };
  return { E, pintar, salir };
}
