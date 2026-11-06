// El gran salón del candelabro, en 3D: el muro de sillares con cuatro ventanales góticos (tracería
// de piedra y vidrio emplomado), la tormenta al otro lado (nubes, lluvia y rayos que entran por los
// cristales y dibujan sus haces en el polvo), columnas de haces, el suelo y dos cortinas de
// terciopelo. La cámara avanza con el scroll: es el mismo zoom de antes, ahora con perspectiva.
import * as THREE from "three";

export function crearSalon({ pin, reducido = false, progreso }) {
  const canvas = document.createElement("canvas");
  canvas.className = "belmont-chandelier-sec__3d";
  canvas.setAttribute("aria-hidden", "true");
  pin.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(1.25, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  const escena = new THREE.Scene();
  escena.fog = new THREE.FogExp2(0x0a0610, 0.0008);
  const camara = new THREE.PerspectiveCamera(45, 1, 1, 5000);
  const U = { tiempo: { value: 0 }, rayo: { value: 0 } };
  const ZM = -520; // el muro del fondo

  // ── fuera: el cielo de tormenta (nubes que corren e iluminan los rayos) ──
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(4200, 2200), new THREE.ShaderMaterial({
    fog: false, uniforms: U,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `uniform float tiempo, rayo; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec2 q = vU*vec2(7.,3.5) + vec2(tiempo*.03, 0.);
        float nube = fbm(q + fbm(q*1.7 - tiempo*.02));
        vec3 col = mix(vec3(.04,.03,.08), vec3(.2,.16,.3), smoothstep(.35,.85,nube));
        col += vec3(.75,.75,.95) * rayo * (.35 + smoothstep(.4,.9,nube)*1.3);
        // la luna, velada, arriba a la derecha
        float d = length((vU - vec2(.68,.72))*vec2(2.,1.));
        col += vec3(.6,.58,.75) * smoothstep(.06,.0,d) * (1.-smoothstep(.45,.8,nube)*.8) + vec3(.12,.1,.2)*smoothstep(.3,.0,d);
        gl_FragColor = vec4(col,1.);
      }`,
  }));
  cielo.position.set(0, 300, ZM - 900); escena.add(cielo);
  // la lluvia, del otro lado del cristal
  const NL = 1400, pl = new Float32Array(NL * 6), sl = new Float32Array(NL * 2);
  for (let i = 0; i < NL; i++) { const x = (Math.random() - 0.5) * 1800, y = Math.random() * 1200, z = ZM - 60 - Math.random() * 500, f = Math.random(); pl.set([x, y, z, x, y, z], i * 6); sl[i * 2] = f; sl[i * 2 + 1] = f + 10; }
  const gl = new THREE.BufferGeometry(); gl.setAttribute("position", new THREE.BufferAttribute(pl, 3)); gl.setAttribute("semilla", new THREE.BufferAttribute(sl, 1));
  const lluvia = new THREE.LineSegments(gl, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, uniforms: U,
    vertexShader: `uniform float tiempo; attribute float semilla; varying float vA;
      void main(){ float cola = step(5., semilla), f = fract(semilla); vec3 p = position;
        float y = mod(p.y - tiempo*(600. + f*300.), 1200.) - 300.; p.y = y + cola*30.; p.x += -y*.25 + cola*7.5;
        vA = .15 + f*.25; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`,
    fragmentShader: "uniform float rayo; varying float vA; void main(){ gl_FragColor = vec4(.72,.74,.95, vA*(1.+rayo*2.5)); }",
  }));
  escena.add(lluvia);
  // un rayo que cae a lo lejos, visible por los ventanales
  const bolt = new THREE.Group(); escena.add(bolt);
  const matRayo = new THREE.MeshBasicMaterial({ color: 0xf0f2ff, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const nuevoRayo = () => {
    bolt.children.forEach((m) => m.geometry.dispose()); bolt.clear();
    const crear = (a, n, g) => {
      const pts = [a.clone()]; let p = a.clone();
      for (let k = 0; k < n; k++) { p = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, -(50 + Math.random() * 60), 0)); pts.push(p); if (k > 2 && g > 2 && Math.random() < 0.2) crear(p, 3 + Math.floor(Math.random() * 3), g * 0.5); }
      bolt.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), n * 3, g, 4, false), matRayo));
    };
    crear(new THREE.Vector3((Math.random() - 0.5) * 1400, 1300, ZM - 800), 18, 5);
  };

  // ── el muro de sillares, con los cuatro ventanales recortados (arco apuntado) ──
  const ANCHO = 2400, ALTO = 1500, VENT = [-570, -190, 190, 570], VA = 190, VH = 620, VY = 260;
  const ojiva = (cx, path) => { // arco apuntado de dos centros, muestreado
    const w = VA / 2, r = VA * 0.9, yb = VY + VH - 120, a1 = Math.acos((w - r) / r), c1 = cx - w + r, c2 = cx + w - r;
    path.moveTo(cx - w, VY); path.lineTo(cx - w, yb);
    for (let k = 1; k <= 12; k++) { const a = Math.PI + (a1 - Math.PI) * k / 12; path.lineTo(c1 + r * Math.cos(a), yb + r * Math.sin(a)); }
    for (let k = 1; k <= 12; k++) { const a = (Math.PI - a1) + (0 - (Math.PI - a1)) * k / 12; path.lineTo(c2 + r * Math.cos(a), yb + r * Math.sin(a)); }
    path.lineTo(cx + w, VY); path.closePath();
  };
  const muroS = new THREE.Shape(); muroS.moveTo(-ANCHO / 2, -100); muroS.lineTo(ANCHO / 2, -100); muroS.lineTo(ANCHO / 2, ALTO); muroS.lineTo(-ANCHO / 2, ALTO); muroS.closePath();
  VENT.forEach((cx) => { const h = new THREE.Path(); ojiva(cx, h); muroS.holes.push(h); });
  const texMuro = (() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; const x = c.getContext("2d");
    x.fillStyle = "#1c1620"; x.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 48) for (let i = -(y / 48 % 2) * 60; i < 1024; i += 120) {
      const t = 26 + Math.random() * 14; x.fillStyle = `rgb(${t + 6},${t},${t + 10})`; x.fillRect(i + 2, y + 2, 116, 44);
      x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(i + 2, y + 38, 116, 8); x.fillStyle = "rgba(255,240,220,0.04)"; x.fillRect(i + 2, y + 2, 116, 4);
    }
    for (let k = 0; k < 2500; k++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; x.fillRect(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 6, 2 + Math.random() * 6); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const piedra = new THREE.MeshStandardMaterial({ map: texMuro, roughness: 0.95, metalness: 0 });
  const geoMuro = new THREE.ExtrudeGeometry(muroS, { depth: 60, bevelEnabled: false, curveSegments: 18 });
  { const uv = geoMuro.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 600, uv.getY(i) / 600); }
  const muro = new THREE.Mesh(geoMuro, piedra); muro.position.z = ZM - 30; escena.add(muro);
  // tracería y vidrio emplomado: parteluz, travesaños, un óculo arriba y el cristal tintado
  const tracerias = new THREE.MeshStandardMaterial({ color: 0x2a222c, roughness: 0.9 });
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x5a2a4a, transparent: true, opacity: 0.32, roughness: 0.2, metalness: 0.1, emissive: 0x1a0612, depthWrite: false });
  VENT.forEach((cx) => {
    const s = new THREE.Shape(); ojiva(cx, s);
    const cristal = new THREE.Mesh(new THREE.ShapeGeometry(s, 18), vidrio); cristal.position.z = ZM + 18; escena.add(cristal);
    const barra = (x, y, w, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 22), tracerias); m.position.set(x, y, ZM + 22); escena.add(m); return m; };
    barra(cx, VY + (VH - 60) / 2, 10, VH - 60);                           // parteluz
    for (let k = 1; k < 5; k++) barra(cx, VY + k * 110, VA, 6);          // travesaños de plomo
    const oculo = new THREE.Mesh(new THREE.TorusGeometry(34, 5, 8, 32), tracerias); oculo.position.set(cx, VY + VH - 70, ZM + 22); escena.add(oculo);
    [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2 + Math.PI / 4; barra(cx + Math.cos(a) * 17, VY + VH - 70 + Math.sin(a) * 17, 4, 34).rotation.z = a; }); // los radios del óculo
  });
  // haces de luz que entran por los ventanales (se encienden con el rayo y con la luna)
  const haces = [];
  const matHaz = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { ...U, base: { value: 0.05 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform float rayo, base; varying vec2 vU; void main(){ float a = (1.-vU.y) * smoothstep(0.,.2,vU.x) * smoothstep(1.,.8,vU.x); gl_FragColor = vec4(vec3(.7,.68,.95), a*(base + rayo*.35)); }",
  });
  VENT.forEach((cx) => {
    const g = new THREE.PlaneGeometry(VA * 1.1, 1400, 1, 1); g.translate(0, -700, 0);
    const m = new THREE.Mesh(g, matHaz); m.position.set(cx, VY + VH - 40, ZM + 30); m.rotation.x = -1.1; m.rotation.z = 0.25; escena.add(m); haces.push(m);
  });
  // ── las columnas: fustes de haces con capitel y basa; dos planos de profundidad ──
  const columna = (x, z, r, alto) => {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, alto, 12), piedra); f.position.set(Math.cos(a) * r * 0.45, alto / 2, Math.sin(a) * r * 0.45); g.add(f); }
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, alto, 12), piedra); nucleo.position.y = alto / 2; g.add(nucleo);
    const basa = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.2, r * 1.35, 50, 8), piedra); basa.position.y = 25; g.add(basa);
    const capitel = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 0.95, 60, 8), piedra); capitel.position.y = alto - 30; g.add(capitel);
    g.position.set(x, -100, z); escena.add(g); return g;
  };
  [-760, -380, 0, 380, 760].forEach((x) => columna(x, ZM + 70, 40, 1500));
  [-520, 520].forEach((x) => columna(x, -150, 70, 1700));
  // el suelo de losas, un poco brillante
  const texSuelo = (() => { const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const t = (i + j) % 2 ? 22 : 14; x.fillStyle = `rgb(${t + 4},${t},${t + 8})`; x.fillRect(i * 64, j * 64, 63, 63); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1600), new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 0.35, metalness: 0.2 }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.set(0, -100, ZM + 700); escena.add(suelo);
  // ── las cortinas: terciopelo rojo con pliegues que se mecen ──
  const cortinas = [];
  [-1, 1].forEach((s) => {
    const g = new THREE.PlaneGeometry(420, 1700, 48, 1);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5a0a16, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, emissive: 0x12020a }));
    m.position.set(s * 640, 600, 60); escena.add(m);
    cortinas.push({ m, base: g.attributes.position.array.slice(), s });
  });
  const ondear = (t) => cortinas.forEach(({ m, base, s }) => {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; p.setZ(i, Math.sin(x * 0.075 + s) * 22 + Math.sin(x * 0.021 + t * 0.6 + s) * 8 * (1 - (y + 850) / 1700) * (reducido ? 0 : 1)); }
    p.needsUpdate = true; m.geometry.computeVertexNormals();
  });
  ondear(0);

  // ── luces: la vela del candelabro (cálida, arriba), la luna fría por los ventanales y el rayo ──
  escena.add(new THREE.HemisphereLight(0x3a3058, 0x0a0608, 1.1));
  const vela = new THREE.PointLight(0xff9a50, 4.5, 0, 0); vela.position.set(0, 820, 0); escena.add(vela);
  const ventana = new THREE.DirectionalLight(0x8a80d0, 0.8); ventana.position.set(100, 600, ZM - 400); ventana.target.position.set(0, 0, 200); escena.add(ventana, ventana.target);
  const rayoLuz = new THREE.DirectionalLight(0xe6e8ff, 0); rayoLuz.position.set(-200, 900, ZM - 600); rayoLuz.target.position.set(0, 0, 200); escena.add(rayoLuz, rayoLuz.target);

  let proximo = 2.5, enVista = false;
  const tormenta = (t) => {
    if (reducido) return;
    if (t > proximo && enVista) {
      proximo = t + 4 + Math.random() * 6;
      nuevoRayo();
      gsap.timeline()
        .to(U.rayo, { value: 1, duration: 0.05, ease: "none" }).to(U.rayo, { value: 0.12, duration: 0.14 })
        .to(U.rayo, { value: 0.75, duration: 0.04, ease: "none" }, 0.38).to(U.rayo, { value: 0, duration: 0.9, ease: "power2.out" });
      gsap.timeline().fromTo(matRayo, { opacity: 1 }, { opacity: 0, duration: 0.35 }).to(matRayo, { opacity: 0.7, duration: 0.03 }, 0.38).to(matRayo, { opacity: 0, duration: 0.3 });
    }
    rayoLuz.intensity = U.rayo.value * 5;
    vidrio.emissiveIntensity = 1 + U.rayo.value * 6;
  };

  let W = 0, H = 0;
  const medir = () => { const w = pin.clientWidth, h = pin.clientHeight; if (!w || (w === W && h === H)) return; W = w; H = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.fov = w / h < 0.8 ? 62 : 45; camara.updateProjectionMatrix(); };
  const pintar = (t = 0, visible = true) => {
    enVista = visible; medir(); if (!W) return;
    const p = progreso();
    // el zoom: la cámara entra en el salón y levanta un poco la vista hacia el candelabro
    camara.position.set(Math.sin(p * Math.PI) * 30, 420 + p * 40, 760 - p * 330);
    camara.lookAt(0, 470 + p * 60, ZM);
    U.tiempo.value = reducido ? 0 : t;
    vela.intensity = 4.5 + (reducido ? 0 : Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.15);
    if (!reducido) ondear(t);
    tormenta(t);
    renderer.render(escena, camara);
  };
  const salir = () => { escena.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); renderer.dispose(); canvas.remove(); };
  if (reducido) pintar(0);
  return { pintar, salir };
}
