// El bosque en 3D: montañas en tres cordilleras low poly, árboles muertos retorcidos a tres
// profundidades, la luna entre nubes de tormenta, el río que la refleja, la lluvia en diagonal y
// los rayos (con su luz sobre todo el paisaje y el trueno que llega después).
// La cámara se desliza de lado con la pista del bosque: el parallax sale de la perspectiva.
// Las tarjetas y las pruebas siguen siendo HTML, por delante del lienzo.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ruido de valor con semilla (para montañas, árboles y nubes)
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const ruido = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * ruido(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };

export function crearBosque({ pin, reducido = false, progreso }) {
  const canvas = document.createElement("canvas");
  canvas.className = "belmont-forest__3d";
  canvas.setAttribute("aria-hidden", "true");
  pin.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(1.25, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const escena = new THREE.Scene();
  const NIEBLA = new THREE.Color(0x1a1226);
  escena.fog = new THREE.FogExp2(NIEBLA, 0.0016);
  const camara = new THREE.PerspectiveCamera(42, 1, 1, 4000);
  const RECORRIDO = 900; // lo que avanza la cámara de principio a fin de la pista
  const U = { tiempo: { value: 0 }, rayo: { value: 0 } };

  // ── el cielo: degradado violeta, nubes de tormenta que corren y se iluminan con el rayo ──
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform float tiempo, rayo; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.02; a*=.5; } return s; }
      void main(){
        float y = vP.y;
        vec3 abajo = vec3(.11,.07,.16), arriba = vec3(.02,.015,.04);
        vec3 col = mix(abajo, arriba, smoothstep(-.05,.6,y));
        vec2 q = vec2(atan(vP.x, -vP.z)*2.2 + tiempo*.012, y*5.);
        float nube = fbm(q*1.6 + vec2(fbm(q*2.+tiempo*.02), 0.));
        float masa = smoothstep(.42,.82,nube) * smoothstep(-.05,.18,y);
        vec3 nubeCol = mix(vec3(.05,.04,.07), vec3(.2,.17,.28), smoothstep(.5,.9,nube));
        col = mix(col, nubeCol, masa*.9);
        col += vec3(.55,.55,.75) * rayo * (0.25 + masa*1.2);
        gl_FragColor = vec4(col,1.);
      }`,
  }));
  escena.add(cielo);

  // ── la luna: disco con cráteres y un halo; las nubes le pasan por delante ──
  const texLuna = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d");
    const g = x.createRadialGradient(220, 200, 40, 256, 256, 256); g.addColorStop(0, "#f4f1ea"); g.addColorStop(0.75, "#cfcad8"); g.addColorStop(1, "#8f8aa0");
    x.fillStyle = g; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
    for (let i = 0; i < 70; i++) { const r = 4 + Math.random() * 34, px = 256 + (Math.random() - 0.5) * 380, py = 256 + (Math.random() - 0.5) * 380; if (Math.hypot(px - 256, py - 256) + r > 245) continue; x.fillStyle = `rgba(80,74,100,${0.08 + Math.random() * 0.18})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const luna = new THREE.Mesh(new THREE.CircleGeometry(130, 64), new THREE.MeshBasicMaterial({ map: texLuna, fog: false, transparent: true }));
  luna.position.set(520, 330, -1900); escena.add(luna);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, "rgba(220,215,255,0.5)"); g.addColorStop(1, "rgba(220,215,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.set(900, 900, 1); halo.position.copy(luna.position).add(new THREE.Vector3(0, 0, 1)); escena.add(halo);
  // nubes por delante de la luna: planos con ruido que se desplazan
  const nubes = [];
  [[-1700, 0.85, 1.6], [-1400, 0.6, 1.1]].forEach(([z, a, esc]) => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); const img = x.createImageData(512, 128);
    for (let j = 0; j < 128; j++) for (let i = 0; i < 512; i++) { const nn = fbm(i / 45 + z, j / 20, 4), b = Math.max(0, (nn - 0.48) * 3.2) * Math.sin((j / 128) * Math.PI); const k = (j * 512 + i) * 4; img.data[k] = 46; img.data[k + 1] = 38; img.data[k + 2] = 62; img.data[k + 3] = Math.min(255, b * 255 * a); }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4200 * esc, 520 * esc), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    m.position.set(400, 330, z + 20); escena.add(m); nubes.push({ m, t, v: 0.004 / esc });
  });

  // ── las montañas: tres cordilleras de malla low poly con aristas, más oscuras cuanto más cerca ──
  const cordillera = (z, alto, ancho, semilla, color) => {
    const geo = new THREE.PlaneGeometry(ancho, 260, 120, 12); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), zz = p.getZ(i), fondo = (zz + 130) / 260; // 0 delante, 1 detrás
      const cresta = Math.pow(1 - Math.abs(fbm(x / 420 + semilla, semilla, 4) * 2 - 1), 1.6); // crestas afiladas
      p.setY(i, (cresta * alto * (0.35 + 0.65 * (1 - fondo)) + fbm(x / 90, zz / 60 + semilla, 3) * alto * 0.15) * Math.sin(Math.min(1, (1 - fondo) * 1.4) * Math.PI * 0.5) - 6);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    m.position.set(RECORRIDO / 2, 0, z); escena.add(m); return m;
  };
  cordillera(-1300, 420, 5200, 3.1, 0x2a2140);
  cordillera(-850, 300, 4200, 7.7, 0x1c1628);
  cordillera(-480, 170, 3600, 1.3, 0x120e19);
  // el suelo y el río
  const suelo = new THREE.PlaneGeometry(3600, 700, 140, 20); suelo.rotateX(-Math.PI / 2);
  { const p = suelo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const rio = Math.abs(z - 40) < 26 ? -3 : 0; p.setY(i, fbm(x / 70, z / 70, 3) * 14 - 4 + rio + (z < -150 ? (-150 - z) * 0.08 : 0)); } suelo.computeVertexNormals(); }
  const sueloM = new THREE.Mesh(suelo, new THREE.MeshStandardMaterial({ color: 0x0b0810, roughness: 1, flatShading: true }));
  sueloM.position.set(RECORRIDO / 2, 0, -120); escena.add(sueloM);
  const rio = new THREE.Mesh(new THREE.PlaneGeometry(3600, 46, 1, 1), new THREE.ShaderMaterial({
    transparent: true, fog: true, uniforms: { ...U, ...THREE.UniformsLib.fog, lunaX: { value: 0 } },
    vertexShader: `varying vec2 vU; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vU = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float tiempo, rayo, lunaX; varying vec2 vU; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        float ondas = sin(vW.x*.35 + tiempo*2.) * sin(vW.z*1.3 - tiempo*1.4) * .5 + .5;
        float reflejo = exp(-pow((vW.x - lunaX)/38., 2.)) * (.35 + .65*step(.72, h(floor(vec2(vW.x*.6, vW.z*2.+tiempo*3.)))));
        vec3 col = vec3(.035,.03,.06) + vec3(.7,.68,.85) * reflejo * .55 + vec3(.06,.05,.09)*ondas + vec3(.4,.4,.55)*rayo*.4;
        gl_FragColor = vec4(col, .92);
        #include <fog_fragment>
      }`,
  }));
  rio.rotation.x = -Math.PI / 2; rio.position.set(RECORRIDO / 2, -2.6, -80); escena.add(rio);

  // ── árboles muertos: troncos que se retuercen y ramas que se parten en dos, hasta las ramitas ──
  const rama = (lista, a, dir, largo, radio, nivel, rnd) => {
    const pts = [a.clone()]; let p = a.clone(), d = dir.clone();
    for (let k = 0; k < 4; k++) { d.add(new THREE.Vector3((rnd() - 0.5) * 0.45, (rnd() - 0.3) * 0.25, (rnd() - 0.5) * 0.45)).normalize(); p = p.clone().addScaledVector(d, largo / 4); pts.push(p); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 1, 6, false);
    const pos = g.attributes.position, c = new THREE.Vector3(), curva = new THREE.CatmullRomCurve3(pts);
    for (let i = 0; i < pos.count; i++) { const t = Math.floor(i / 7) / 6, ctr = curva.getPoint(t); c.fromBufferAttribute(pos, i).sub(ctr).multiplyScalar(radio * (1 - t * 0.75)).add(ctr); pos.setXYZ(i, c.x, c.y, c.z); }
    lista.push(g);
    if (nivel <= 0 || radio < 0.18) return;
    const hijos = nivel > 2 ? 2 : 2 + (rnd() < 0.4 ? 1 : 0);
    for (let h = 0; h < hijos; h++) {
      const t = 0.55 + rnd() * 0.4, base = curva.getPoint(t);
      const nd = d.clone().add(new THREE.Vector3((rnd() - 0.5) * 1.6, rnd() * 0.5 - 0.05, (rnd() - 0.5) * 1.2)).normalize();
      rama(lista, base, nd, largo * (0.55 + rnd() * 0.2), radio * 0.55, nivel - 1, rnd);
    }
  };
  const variantes = [0, 1, 2, 3, 4].map((s) => {
    let semilla = 9 + s * 17; const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const lista = [];
    rama(lista, new THREE.Vector3(0, -4, 0), new THREE.Vector3((rnd() - 0.5) * 0.3, 1, 0), 52 + rnd() * 30, 3.2 + rnd(), 4, rnd);
    // raíces que asoman
    for (let k = 0; k < 3; k++) rama(lista, new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(k * 2.1), -0.35, Math.sin(k * 2.1)), 12, 1.4, 0, rnd);
    return mergeGeometries(lista.map((g) => g.toNonIndexed()));
  });
  const corteza = new THREE.MeshStandardMaterial({ color: 0x120d12, roughness: 0.95, flatShading: true });
  const arboles = [];
  const plantar = (n, z0, z1, esc0, esc1, semilla) => {
    let s = semilla; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    variantes.forEach((geo, vi) => {
      const im = new THREE.InstancedMesh(geo, corteza, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const x = -380 + rnd() * (RECORRIDO + 760), z = z0 + rnd() * (z1 - z0), k = esc0 + rnd() * (esc1 - esc0);
        e.set((rnd() - 0.5) * 0.12, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.18); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(x, fbm(x / 70, z / 70, 3) * 14 - 6, z), q, new THREE.Vector3(k, k * (0.9 + rnd() * 0.4), k)); im.setMatrixAt(i, m4);
      }
      escena.add(im); arboles.push(im);
    });
  };
  plantar(10, -380, -220, 1.1, 1.8, 11);  // al fondo, contra las montañas
  plantar(9, -210, -60, 0.9, 1.4, 23);    // en la orilla de allá
  plantar(4, 20, 120, 1.0, 1.5, 37);      // cerca, más grandes y oscuros

  // ── ojos rojos entre los árboles: parpadean de vez en cuando ──
  const ojos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false }), 24);
  const ojosInfo = []; { let s = 77; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 12; i++) { const x = -200 + rnd() * (RECORRIDO + 400), z = -60 - rnd() * 240, y = 6 + rnd() * 14; ojosInfo.push({ x, y, z, f: rnd() * 10, ritmo: 3 + rnd() * 5 }); } }
  escena.add(ojos);

  // ── la lluvia: segmentos que caen en diagonal alrededor de la cámara ──
  const N = 1800, gotas = new Float32Array(N * 2 * 3), semillas = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 900, y = Math.random() * 500, z = -Math.random() * 600 + 120, f = Math.random(); for (let k = 0; k < 2; k++) { gotas.set([x, y, z], (i * 2 + k) * 3); semillas[i * 2 + k] = f + k * 10; } }
  const geoLluvia = new THREE.BufferGeometry(); geoLluvia.setAttribute("position", new THREE.BufferAttribute(gotas, 3)); geoLluvia.setAttribute("semilla", new THREE.BufferAttribute(semillas, 1));
  const lluvia = new THREE.LineSegments(geoLluvia, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { ...U, camX: { value: 0 } },
    vertexShader: `uniform float tiempo, camX; attribute float semilla; varying float vA;
      void main(){ float cola = step(5., semilla); float f = fract(semilla);
        vec3 p = position; float caida = mod(p.y - tiempo*(420. + f*160.), 500.) - 60.;
        p.y = caida + cola*16.; p.x = mod(p.x - camX + 450. - caida*.32, 900.) - 450. + camX + cola*5.; // las dos puntas de la gota se envuelven juntas
        vA = .18 + f*.3; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`,
    fragmentShader: "uniform float rayo; varying float vA; void main(){ gl_FragColor = vec4(vec3(.7,.72,.9), vA*(1.+rayo*2.)); }",
  }));
  escena.add(lluvia);

  // ── luces: la luna (fría, a contraluz), el cielo y el rayo ──
  const hemi = new THREE.HemisphereLight(0x3a3058, 0x050307, 0.9); escena.add(hemi);
  const lunaLuz = new THREE.DirectionalLight(0xb8b0ff, 1.6); lunaLuz.position.set(400, 300, -900); escena.add(lunaLuz, lunaLuz.target);
  const rayoLuz = new THREE.DirectionalLight(0xdfe4ff, 0); rayoLuz.position.set(0, 600, 200); escena.add(rayoLuz, rayoLuz.target);
  // el rayo visible: una línea quebrada que baja del cielo, con ramales
  const bolt = new THREE.Group(); escena.add(bolt);
  const matRayo = new THREE.MeshBasicMaterial({ color: 0xeef0ff, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const nuevoRayo = (x) => {
    bolt.clear();
    const crear = (a, dir, n, grosor) => {
      const pts = [a.clone()]; let p = a.clone();
      for (let k = 0; k < n; k++) { p = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 70, -dir * (30 + Math.random() * 40), (Math.random() - 0.5) * 20)); pts.push(p); if (k > 2 && Math.random() < 0.18 && grosor > 1.2) crear(p, dir * 0.8, 3 + Math.floor(Math.random() * 3), grosor * 0.5); }
      bolt.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), n * 3, grosor, 4, false), matRayo));
    };
    crear(new THREE.Vector3(x, 620, -1500), 1, 14, 3);
  };

  // trueno: ruido marrón filtrado, unos segundos después del rayo (si hay sonido)
  let audio = null;
  const trueno = (lejos) => {
    if (!sonido.activo) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const dur = 3.5, buf = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate), d = buf.getChannelData(0);
      let ult = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; }
      const src = audio.createBufferSource(); src.buffer = buf;
      const lp = audio.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380 - lejos * 200;
      const g = audio.createGain(), t0 = audio.currentTime;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.55 * (1 - lejos * 0.5), t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.6); g.gain.linearRampToValueAtTime(0.4, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(lp).connect(g).connect(audio.destination); src.start();
    } catch (e) { /* sin audio, sin trueno */ }
  };
  const sonido = { activo: false };

  // un rayo: dos o tres destellos encadenados (≤ 3 por segundo, WCAG 2.3.1) y el trueno después
  let proximo = 3, destello = 0, enVista = false;
  const tormenta = (t) => {
    if (reducido) return;
    if (t > proximo && enVista) {
      proximo = t + 5 + Math.random() * 6;
      const x = camara.position.x + (Math.random() - 0.3) * 900, lejos = Math.random();
      nuevoRayo(x);
      const tl = gsap.timeline();
      tl.to(U.rayo, { value: 1, duration: 0.05, ease: "none" })
        .to(U.rayo, { value: 0.15, duration: 0.12 })
        .to(U.rayo, { value: 0.8, duration: 0.04, ease: "none" }, 0.36)
        .to(U.rayo, { value: 0, duration: 0.9, ease: "power2.out" });
      tl.fromTo(matRayo, { opacity: 1 }, { opacity: 0, duration: 0.35 }, 0).to(matRayo, { opacity: 0.7, duration: 0.03 }, 0.36).to(matRayo, { opacity: 0, duration: 0.3 });
      gsap.delayedCall(0.8 + lejos * 2.2, () => { trueno(lejos); temblor(1 - lejos); });
    }
    rayoLuz.intensity = U.rayo.value * 6; hemi.intensity = 0.9 + U.rayo.value * 2.2;
    luna.material.opacity = 1 - U.rayo.value * 0.3;
  };
  // el trueno sacude un poco la escena (2 px, sin marear)
  const temblor = (k) => { if (!reducido && enVista) gsap.fromTo(canvas, { x: 0, y: 0 }, { keyframes: [{ x: 2 * k, y: -1 * k }, { x: -2 * k, y: 1 * k }, { x: 1 * k, y: 0 }, { x: 0, y: 0 }], duration: 0.5, ease: "none" }); };

  let W = 0, H = 0;
  const medir = () => {
    const w = pin.clientWidth, h = pin.clientHeight; if (!w || (w === W && h === H)) return;
    W = w; H = h; renderer.setSize(w, h, false); camara.aspect = w / h;
    camara.fov = w / h < 0.8 ? 58 : 42; // en vertical, más campo: si no, el bosque se queda en tres troncos
    camara.updateProjectionMatrix();
  };
  const v = new THREE.Vector3();
  const pintar = (t = 0, visible = true) => {
    enVista = visible; medir(); if (!W) return;
    const p = progreso();
    camara.position.set(p * RECORRIDO, 34 + Math.sin(t * 0.3) * 0.8, 240);
    camara.lookAt(p * RECORRIDO + 40, 70, -600);
    U.tiempo.value = reducido ? 0 : t;
    nubes.forEach(({ t: tx, v: vv }) => { tx.offset.x = reducido ? 0 : t * vv; });
    lluvia.material.uniforms.camX.value = camara.position.x;
    // el reflejo de la luna en el río sigue la línea cámara-luna
    rio.material.uniforms.lunaX.value = camara.position.x + (luna.position.x - camara.position.x) * ((240 + 80) / (240 + 1900));
    // ojos: dos puntos que se cierran y se abren
    const m4 = new THREE.Matrix4();
    ojosInfo.forEach((o, i) => {
      const abierto = reducido ? 1 : (Math.sin(t / o.ritmo * 6.28 + o.f) > -0.92 ? 1 : 0.05) * (Math.sin(t * 0.13 + o.f) > -0.3 ? 1 : 0);
      [-1.6, 1.6].forEach((dx, k) => { m4.compose(v.set(o.x + dx, o.y, o.z), new THREE.Quaternion(), new THREE.Vector3(1, abierto * 0.6 + 0.001, 1)); ojos.setMatrixAt(i * 2 + k, m4); });
    });
    ojos.instanceMatrix.needsUpdate = true;
    tormenta(t);
    renderer.render(escena, camara);
  };
  const salir = () => { escena.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); renderer.dispose(); canvas.remove(); audio && audio.close(); };
  if (reducido) pintar(0);
  return { pintar, salir, sonido };
}
