// Iconos 3D (models/iconos.glb, modelados en Blender 5.2 con bpy): un solo lienzo WebGL fijo dibuja
// cada objeto en el hueco de su tarjeta con scissor, en vez de un contexto por tarjeta (el navegador
// limita los contextos vivos). Sin bucle propio: lo llama gsap.ticker, como la escena del castillo.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"; // los GLB van comprimidos con EXT_meshopt_compression
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { clone as clonarConEsqueleto } from "three/addons/utils/SkeletonUtils.js";

export async function crearIconos({ canvas, url, datos, cazador, colores, reducido }) {
  const c = (hex) => new THREE.Color(hex);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Entorno de estudio para que el oro y el acero reflejen algo (PMREM de RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // datos: ArrayBuffer ya en memoria (la página publicada no puede hacer fetch de un data:, lo bloquea su CSP)
  const cargar = (d, u) => (d ? new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(d, "") : new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(u));
  const [gltf, figura] = await Promise.all([cargar(datos, url), cazador ? cargar(cazador.datos, cazador.url).catch(() => null) : null]);
  // el cazador (KayKit Adventurers, CC0, retocado en Blender) llega con su esqueleto y sus animaciones
  const buscar = (n) => gltf.scene.getObjectByName(n) || (figura && (figura.scene.getObjectByName(n) || (n === "icono_cazador" ? figura.scene : null)));
  const clips = figura ? figura.animations : [];
  if (figura) figura.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material.side = THREE.DoubleSide; // el abrigo y la capucha son láminas: se ven por dentro
    if (o.material.name === "c_ojo") o.material.emissiveIntensity = 4;
  });
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === "i_vidrio") { m.transparent = true; m.opacity = 0.32; m.depthWrite = false; m.roughness = 0.05; }
    if (m.name === "i_oro") { m.color = c(colores.wax); m.metalness = 1; m.roughness = 0.3; }
    if (m.name === "i_agua") { m.color = c(colores.moon).multiplyScalar(0.35); m.emissive = c(colores.moon).multiplyScalar(0.22); m.emissiveIntensity = 1; m.roughness = 0.15; }
    if (m.name === "i_gema") { m.emissive = c(colores.blood); m.emissiveIntensity = 1.6; }
  });

  // El cazador lleva un esqueleto de empties (rig_* en Blender): cadera, piernas, torso, hombros,
  // cabeza y cola de la bufanda. Aquí se anima a mano, sumando giros a la pose de reposo.
  const montarRig = (pieza) => {
    const n = (k) => pieza.getObjectByName(k);
    const r = {};
    for (const k of ["cadera", "torso", "cabeza", "pierna_i", "pierna_d", "hombro_i", "hombro_d", "bufanda"]) {
      const o = n("rig_" + k);
      if (o) r[k] = { o, q: o.quaternion.clone(), p: o.position.clone() };
    }
    r.ojos = ["ojo_i", "ojo_d"].map(n).filter(Boolean).map((o) => ({ o, s: o.scale.clone() }));
    r.alto = new THREE.Box3().setFromObject(pieza).getSize(new THREE.Vector3()).y;
    return Object.keys(r).length > 3 ? r : null;
  };
  const eu = new THREE.Euler(), qq = new THREE.Quaternion();
  const girar = (h, x, y = 0, z = 0) => { if (!h) return; h.o.quaternion.copy(h.q).multiply(qq.setFromEuler(eu.set(x, y, z))); };
  const puntero = { x: -1e4, y: -1e4 };
  window.addEventListener("pointermove", (e) => { puntero.x = e.clientX; puntero.y = e.clientY; }, { passive: true });
  // personalidad: anda, salta, respira, mira al puntero, parpadea y de vez en cuando se toca el ala del sombrero
  const animarCazador = (v, r, t, dt) => {
    const R = v.rig, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // movimiento propio: el del hueco respecto a su contenedor (el scroll de la página no cuenta)
    const ref = v.hueco.parentElement && v.hueco.parentElement.parentElement;
    const rr = ref ? ref.getBoundingClientRect() : { left: 0, top: 0 };
    const px = cx - rr.left, py = cy - rr.top;
    if (v.prev && dt > 0) {
      const cuerpo = Math.max(30, r.height);
      const vx = (px - v.prev.x) / dt / cuerpo, vy = (py - v.prev.y) / dt / cuerpo;
      v.mx += (Math.min(3, Math.abs(vx)) - v.mx) * Math.min(1, dt * 6);
      v.my += (THREE.MathUtils.clamp(vy, -4, 4) - v.my) * Math.min(1, dt * 8);
    }
    v.prev = { x: px, y: py };
    // quien mueve al cazador puede decir a qué ritmo anda (en el mapa la cámara lo sigue y en pantalla apenas se mueve)
    const dicho = v.hueco.__anda && performance.now() - v.hueco.__anda.t < 150 ? v.hueco.__anda.v : null;
    if (dicho !== null) v.mx += (dicho - v.mx) * Math.min(1, dt * 6);
    const anda = Math.min(1, v.mx * 1.4), aire = dicho !== null ? 0 : Math.min(1, Math.abs(v.my) * 0.6);
    v.fase += dt * (4 + anda * 7);
    const s = Math.sin(v.fase), c2 = Math.cos(v.fase * 2);
    // reposo: respira y carga el peso de una pierna a otra
    const resp = Math.sin(t * 1.7 + v.f) * (1 - anda);
    const vaiven = Math.sin(t * 0.45 + v.f) * (1 - anda);
    // gesto: cada pocos segundos, quieto, se lleva la mano al ala del sombrero y saluda con la cabeza
    v.gesto -= dt;
    if (v.gesto < -2.4) v.gesto = 5 + Math.random() * 6;
    const g = v.gesto < 0 && anda < 0.2 ? Math.sin(Math.min(1, -v.gesto / 2.4) * Math.PI) : 0;
    // mirada: hacia el puntero si está cerca, si no echa un vistazo a los lados
    const dx = puntero.x - cx, dy = puntero.y - cy, cerca = Math.hypot(dx, dy) < 520;
    const mira = cerca ? THREE.MathUtils.clamp(dx / 420, -0.7, 0.7) * -Number(v.hueco.dataset.facing || 1) : Math.sin(t * 0.37 + v.f) * 0.35 * (1 - anda);
    v.mira += (mira - v.mira) * Math.min(1, dt * 5);
    const alza = cerca ? THREE.MathUtils.clamp(dy / 600, -0.35, 0.35) : 0;
    if (R.cadera) {
      R.cadera.o.position.copy(R.cadera.p);
      R.cadera.o.position.y += Math.abs(c2) * 0.035 * anda - aire * 0.02; // rebote del paso
      girar(R.cadera, 0, 0, vaiven * 0.06 + s * 0.05 * anda);
    }
    girar(R.torso, 0.18 * anda + resp * 0.025 - aire * 0.12 + g * 0.08, s * -0.12 * anda, vaiven * -0.05);
    girar(R.cabeza, alza + g * 0.35 - 0.08 * anda + resp * 0.02, v.mira, 0);
    // piernas: zancada al andar, encogidas en el aire
    girar(R.pierna_i, s * 0.6 * anda - aire * 0.7, 0, 0);
    girar(R.pierna_d, -s * 0.6 * anda - aire * 0.35, 0, 0);
    // brazos: braceo; el izquierdo sube al sombrero en el gesto; en el aire los dos se abren
    girar(R.hombro_i, -s * 0.5 * anda - g * 2.5 - aire * 0.8, 0, -g * 0.3 - aire * 0.4);
    girar(R.hombro_d, s * 0.45 * anda - aire * 0.6 + Math.sin(t * 3 + v.f) * 0.04, 0, aire * 0.4);
    // la bufanda ondea: más cuanto más rápido va, hacia arriba si cae
    girar(R.bufanda, Math.sin(t * 3.1 + v.f) * 0.12 + Math.sin(v.fase * 2) * 0.08 * anda + anda * 0.22 + v.my * 0.15, Math.sin(t * 2.3) * 0.15, Math.sin(t * 1.9 + 1) * 0.1);
    // parpadeo
    v.parpado -= dt;
    if (v.parpado < 0) v.parpado = 2.5 + Math.random() * 3.5;
    const cierra = v.parpado < 0.12 ? 0.12 : 1;
    R.ojos.forEach((e) => e.o.scale.set(e.s.x, e.s.y, e.s.z * cierra));
  };

  // Estados del cazador: reposo, anda, corre, en el aire, colgado; y gestos de una vez (lanzar, azotar,
  // celebrar, recibir) que pide la página con hueco.__accion = { nombre, t }
  const montarAnim = (pieza) => {
    const mixer = new THREE.AnimationMixer(pieza), acc = {};
    for (const cl of clips) acc[cl.name] = mixer.clipAction(cl);
    const UNA = ["Throw", "1H_Melee_Attack_Chop", "Cheer", "Hit_A", "Death_A", "Jump_Land", "Jump_Start"];
    UNA.forEach((n) => { if (acc[n]) { acc[n].setLoop(THREE.LoopOnce, 1); acc[n].clampWhenFinished = true; } });
    const a = { mixer, acc, actual: null, gesto: null, ultimaAccion: 0, enAire: false };
    a.poner = (n, fundido = 0.2) => {
      const x = acc[n]; if (!x || a.actual === x) return;
      x.reset().fadeIn(fundido).play();
      if (a.actual) a.actual.fadeOut(fundido);
      a.actual = x;
    };
    // los gestos pueden encadenarse (lanzar y, después, celebrar): la cola los va sacando al acabar cada uno
    a.cola = [];
    mixer.addEventListener("finished", (e) => {
      if (e.action !== a.gesto) return;
      const sig = a.cola.shift();
      if (sig && acc[sig.nombre]) {
        const x = acc[sig.nombre];
        if (x !== a.actual && a.actual) a.actual.fadeOut(0.15); // el mismo gesto dos veces: se repite, no se apaga a sí mismo (dejaba la pose de reposo en cruz)
        x.reset().setEffectiveTimeScale(sig.velocidad || 1).setEffectiveWeight(1).fadeIn(0.15).play(); a.actual = x; a.gesto = x;
      } else {
        // fin del gesto: vuelve al reposo fundiendo, sin pasar por la pose en cruz
        const fin = a.actual; a.gesto = null; a.actual = null;
        a.poner("Idle", 0.25); if (fin && fin !== a.actual) fin.fadeOut(0.25);
      }
    });
    a.poner("Idle", 0);
    return a;
  };
  const animarEstados = (v, r, t, dt) => {
    const A = v.anim, h = v.hueco;
    const ref = h.parentElement && h.parentElement.parentElement;
    const rr = ref ? ref.getBoundingClientRect() : { left: 0, top: 0 };
    const px = r.left + r.width / 2 - rr.left, py = r.top + r.height / 2 - rr.top;
    if (v.prev && dt > 0) {
      const cuerpo = Math.max(30, r.height);
      const vx = (px - v.prev.x) / dt / cuerpo, vy = (py - v.prev.y) / dt / cuerpo;
      v.mx += (Math.min(3, Math.abs(vx)) - v.mx) * Math.min(1, dt * 6);
      v.my += (THREE.MathUtils.clamp(vy, -4, 4) - v.my) * Math.min(1, dt * 8);
    }
    v.prev = { x: px, y: py };
    const dicho = h.__anda && performance.now() - h.__anda.t < 150 ? h.__anda.v : null;
    if (dicho !== null) v.mx += (dicho - v.mx) * Math.min(1, dt * 6);
    const pedida = h.__accion;
    if (pedida && pedida.t > A.ultimaAccion && A.acc[pedida.nombre]) {
      A.ultimaAccion = pedida.t;
      const x = A.acc[pedida.nombre];
      if (A.actual) A.actual.fadeOut(0.12);
      x.reset().setEffectiveTimeScale(pedida.velocidad || 1).fadeIn(0.12).play();
      A.actual = x; A.gesto = x;
      A.cola = (pedida.luego || []).map((g) => (typeof g === "string" ? { nombre: g } : g));
    }
    if (!A.gesto) {
      const pose = h.dataset.pose; // la ruta puede decir explícitamente si va por el aire ("salta") o pisa suelo ("")
      const aire = pose === "salta" || (pose === undefined && dicho === null && Math.abs(v.my) > 0.9);
      if (h.dataset.pose === "cuelga") A.poner("Jump_Idle");
      else if (aire) { A.poner("Jump_Idle", 0.12); A.enAire = true; }
      else if (A.enAire) { A.enAire = false; const x = A.acc.Jump_Land; if (x) { if (A.actual) A.actual.fadeOut(0.1); x.reset().fadeIn(0.1).play(); A.actual = x; A.gesto = x; } }
      else if (v.mx > 0.9) { A.poner("Running_A"); A.actual.setEffectiveTimeScale(Math.min(1.6, 0.7 + v.mx * 0.4)); }
      else if (v.mx > 0.15) { A.poner("Walking_A"); A.actual.setEffectiveTimeScale(Math.min(1.6, 0.6 + v.mx)); }
      else A.poner("Idle", 0.3);
    }
    A.mixer.update(dt);
  };

  const vistas = [];
  for (const hueco of document.querySelectorAll("[data-icon3d]")) {
    const fuente = buscar("icono_" + hueco.dataset.icon3d);
    const esFigura = hueco.dataset.icon3dModo === "figura"; // personaje: no gira solo, mira hacia donde va
    if (!fuente) continue;
    const escena = new THREE.Scene();
    escena.environment = entorno;
    escena.environmentIntensity = 0.35; // el estudio solo da brillo al metal; la luz de verdad es la vela
    const animado = esFigura && clips.length > 0;
    const pieza = animado ? clonarConEsqueleto(fuente) : fuente.clone(true);
    pieza.position.set(0, 0, 0);
    // centrar y escalar para que quepa en el hueco
    const caja = new THREE.Box3().setFromObject(pieza, true), centro = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
    const pivote = new THREE.Group();
    pieza.position.sub(centro);
    pivote.add(pieza);
    pivote.scale.setScalar(esFigura ? 2.45 / tam.y : 2.1 / Math.max(tam.x, tam.y, tam.z));
    if (animado) {
      // los pies, justo en el borde inferior de la caja del personaje (el hueco sobresale un 4 % por debajo):
      // así pisa las plataformas en vez de flotar sobre ellas
      const alto = 2 * 5.2 * Math.tan(THREE.MathUtils.degToRad(15)); // lo que ve la cámara en vertical
      pieza.position.y += -alto / 2 / pivote.scale.y + tam.y / 2 + (alto * 0.034) / pivote.scale.y;
    }
    escena.add(pivote);
    // Luz de vela desde abajo (tiembla), contraluz de luna fría y un rebote de sangre: nada de luz plana
    const vela = new THREE.PointLight(c(colores.wax), 14, 9, 1.6); vela.position.set(-0.9, -1.4, 2.2);
    const luna = new THREE.DirectionalLight(c(colores.moon), 3.2); luna.position.set(2.5, 3, -3.5);
    const sangre = new THREE.DirectionalLight(c(colores.blood), 1.6); sangre.position.set(3, -2, 1);
    escena.add(vela, luna, sangre, new THREE.AmbientLight(c(colores.violet), 0.12));
    if (esFigura) escena.add(new THREE.HemisphereLight(c(colores.moon), c(colores.violet), 1.6)); // la textura del cazador es de color plano: necesita relleno
    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camara.position.set(0, 0, 5.2);
    const v = {
      hueco, escena, pivote, camara, vela, f: Math.random() * 30, rig: esFigura && !animado ? montarRig(pieza) : null,
      anim: animado ? montarAnim(pieza) : null,
      mx: 0, my: 0, prev: null, fase: 0, mira: 0, gesto: 3 + Math.random() * 4, parpado: 1 + Math.random() * 3,
      rot: { x: esFigura ? 0.08 : 0.25, y: esFigura ? 0.8 : Math.random() * 6.28 }, vel: { x: 0, y: reducido || esFigura ? 0 : 0.6 }, arrastre: null, encima: false, escala: 1, esFigura,
    };
    // girar arrastrando, con inercia al soltar (salvo los fijos: en el armero el arrastre es para equipar)
    if (!("icon3dFijo" in hueco.dataset)) {
    hueco.addEventListener("pointerdown", (e) => { v.arrastre = { x: e.clientX, y: e.clientY, t: performance.now() }; hueco.setPointerCapture(e.pointerId); });
    hueco.addEventListener("pointermove", (e) => {
      if (!v.arrastre) return;
      const now = performance.now(), dt = Math.max(16, now - v.arrastre.t) / 1000;
      const dx = e.clientX - v.arrastre.x, dy = e.clientY - v.arrastre.y;
      v.rot.y += dx * 0.012; v.rot.x = THREE.MathUtils.clamp(v.rot.x + dy * 0.012, -1.3, 1.3);
      v.vel.y = (dx * 0.012) / dt; v.vel.x = (dy * 0.012) / dt;
      v.arrastre = { x: e.clientX, y: e.clientY, t: now };
    });
    const soltar = () => (v.arrastre = null);
    hueco.addEventListener("pointerup", soltar);
    hueco.addEventListener("pointercancel", soltar);
    hueco.addEventListener("pointerenter", () => (v.encima = true));
    hueco.addEventListener("pointerleave", () => (v.encima = false));
    // teclado: flechas giran 45°
    hueco.addEventListener("keydown", (e) => {
      const paso = { ArrowLeft: [0, -0.785], ArrowRight: [0, 0.785], ArrowUp: [-0.4, 0], ArrowDown: [0.4, 0] }[e.key];
      if (!paso) return;
      e.preventDefault(); v.rot.x = THREE.MathUtils.clamp(v.rot.x + paso[0], -1.3, 1.3); v.rot.y += paso[1];
    });
    }
    vistas.push(v);
  }

  let w = 0, h = 0, ultimo = 0;
  const estado = { empuje: 0 }; // velocidad de scroll normalizada: un empujón de giro al desplazarse
  function dibujar(t) {
    const dt = Math.min(0.05, ultimo ? t - ultimo : 0.016); ultimo = t;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw !== w || ch !== h) { w = cw; h = ch; renderer.setSize(w, h, false); }
    renderer.setScissor(0, 0, w, h); renderer.clear();
    for (const v of vistas) {
      const r = v.hueco.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h || r.right < 0 || r.left > w || r.width < 2) continue;
      // el lienzo es fijo y cubre la pantalla: hay que respetar lo que el HTML oculta o recorta
      if (v.hueco.checkVisibility && !v.hueco.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      if (v.recorte === undefined) { // el primer antepasado que recorta (overflow: clip/hidden), p. ej. la escena fijada
        v.recorte = null;
        for (let e = v.hueco.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e); if (/(clip|hidden)/.test(o.overflowX + o.overflowY)) { v.recorte = e; break; } }
      }
      let cx0 = r.left, cy0 = r.top, cx1 = r.right, cy1 = r.bottom;
      if (v.recorte) { const c = v.recorte.getBoundingClientRect(); cx0 = Math.max(cx0, c.left); cy0 = Math.max(cy0, c.top); cx1 = Math.min(cx1, c.right); cy1 = Math.min(cy1, c.bottom); }
      if (cx1 - cx0 < 1 || cy1 - cy0 < 1) continue;
      if (v.esFigura) {
        // de tres cuartos hacia donde avanza (data-facing: 1 derecha, −1 izquierda), con un vaivén al respirar
        const objetivo = Number(v.hueco.dataset.facing || 1) * 0.85;
        v.rot.y += (objetivo - v.rot.y) * Math.min(1, dt * 6);
        v.pivote.rotation.set(0.08, v.rot.y, 0);
        v.pivote.position.y = 0;
        if (v.rig && !reducido) animarCazador(v, r, t, dt);
        if (v.anim) { if (reducido) v.anim.mixer.update(0); else animarEstados(v, r, t, dt); }
      } else if (!v.arrastre && !reducido) {
        // inercia que decae hacia el giro de reposo, más el empujón del scroll
        v.vel.y += ((0.6 + estado.empuje * 3) - v.vel.y) * Math.min(1, dt * 1.8);
        v.vel.x += (0 - v.vel.x) * Math.min(1, dt * 3);
        v.rot.y += v.vel.y * dt; v.rot.x = THREE.MathUtils.clamp(v.rot.x + v.vel.x * dt, -1.3, 1.3);
        v.rot.x += (0.25 - v.rot.x) * Math.min(1, dt * 0.8);
      }
      v.escala += ((v.encima ? 1.12 : 1) - v.escala) * Math.min(1, dt * 8);
      // la llama: dos senos y un tirón aleatorio; al pasar el puntero la vela se aviva
      v.vela.intensity = (v.encima ? 22 : 13) * (0.82 + Math.sin(t * 11 + v.f) * 0.08 + Math.sin(t * 27 + v.f * 2) * 0.05 + (Math.random() < 0.03 ? -0.25 : 0));
      if (!v.esFigura) {
        v.pivote.rotation.set(v.rot.x, v.rot.y, 0);
        v.pivote.position.y = reducido ? 0 : Math.sin(t * 1.6 + v.rot.y * 0.1) * 0.06;
      }
      v.camara.aspect = r.width / r.height; v.camara.zoom = v.escala; v.camara.updateProjectionMatrix();
      const x = r.left, y = h - r.bottom;
      renderer.setViewport(x, y, r.width, r.height);
      renderer.setScissor(cx0, h - cy1, cx1 - cx0, cy1 - cy0);
      renderer.render(v.escena, v.camara);
    }
  }
  function salir() {
    [gltf, figura].forEach((g) => g && g.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }));
    entorno.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
  }
  return { dibujar, salir, estado, vistas };
}
