// El halo de ventanas y luna se hace con sprites aditivos y no con posproceso: el EffectComposer
// devolvió un búfer vacío en Chrome headless (SwiftShader) y así la escena no depende de render targets flotantes.
// Escena three.js del castillo (modelo: models/castillo.glb, modelado en Blender 5.2 con bpy).
// No tiene bucle propio: el reloj es gsap.ticker (perfil gsap+lenis, cmb-reloj) y quien la usa
// llama a dibujar(t) una vez por tick (fra-canvas-webgl: un render por tick).
// Salir libera geometrías, materiales, texturas, render targets y el contexto (int-canvas-webgl).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"; // los GLB van comprimidos con EXT_meshopt_compression

export async function crearEscena({ canvas, colores, url, datos, reducido }) {
  const c = (hex) => new THREE.Color(hex);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0; // más oscuro: la luna recorta, el resto se hunde en la niebla
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const escena = new THREE.Scene();
  const niebla = c(colores.deep);
  escena.background = niebla.clone();
  escena.fog = new THREE.FogExp2(niebla.clone(), 0.021);
  escena.background = niebla.clone();

  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const mira = new THREE.Vector3(0, 4.2, 0);
  const mira0 = new THREE.Vector3(-4.5, 5.2, 0), mira1 = new THREE.Vector3(0, 4.6, 0); // al inicio el castillo queda a la derecha del título

  // Luz: luna fría, cielo violeta, contraluz carmesí y el relámpago
  const hemi = new THREE.HemisphereLight(c(colores.violet), c(colores.deep), 0.28);
  const luna = new THREE.DirectionalLight(c(colores.moon), 4.4);   // contraluz: perfila las agujas
  luna.position.set(16, 20, -30);
  luna.castShadow = true;
  luna.shadow.mapSize.set(2048, 2048);
  luna.shadow.bias = -0.0006;
  luna.shadow.normalBias = 0.03;
  Object.assign(luna.shadow.camera, { left: -16, right: 16, top: 18, bottom: -10, near: 1, far: 90 });
  const relleno = new THREE.DirectionalLight(c(colores.violet), 0.35);
  relleno.position.set(-10, 6, 20);
  escena.add(relleno);
  const sangre = new THREE.PointLight(c(colores.blood), 40, 40, 1.6);
  sangre.position.set(0, 2, -8);
  // Luz infernal: un resplandor de sangre que sube desde el pie del acantilado y tiembla como una hoguera
  const infierno = new THREE.PointLight(c(colores.blood), 70, 34, 1.4);
  infierno.position.set(-2, -5, 9);
  escena.add(infierno);
  const rayo = new THREE.DirectionalLight(c(colores.moon), 0);
  rayo.position.set(10, 30, 10);
  escena.add(hemi, luna, sangre, rayo);

  // Luna: disco con halo aditivo
  const discoLuna = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 64),
    new THREE.MeshBasicMaterial({ color: c(colores.moon).multiplyScalar(0.85), fog: false, map: (() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 30;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(120,120,135,0.35)"); gr.addColorStop(1, "rgba(120,120,135,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })() }),
  );
  discoLuna.position.set(22, 20, -80);
  discoLuna.scale.setScalar(0.75);
  escena.add(discoLuna);

  // Cielo: esfera con degradado (abajo sangre apagada, arriba noche violeta)
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(160, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uArriba: { value: c(colores.deep) }, uHorizonte: { value: c(colores.violet).multiplyScalar(0.55) }, uAbajo: { value: c(colores.blood).multiplyScalar(0.25) }, uFinal: { value: 0 }, uDia: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uArriba; uniform vec3 uHorizonte; uniform vec3 uAbajo; uniform float uFinal; uniform float uDia; varying vec3 vP;
        void main(){ float h = vP.y; vec3 col = mix(uHorizonte, uArriba, smoothstep(0.0, 0.55, h)); col = mix(col, uAbajo, smoothstep(0.08, -0.2, h));
        col = mix(col, uAbajo*3.0, uFinal*smoothstep(0.5, -0.1, h));
        // el día: azul arriba, oro en el horizonte, donde sale el sol (a la izquierda)
        vec3 dia = mix(vec3(1.0,0.84,0.70), vec3(0.30,0.60,0.95), smoothstep(-0.05, 0.32, h)); // primavera: azul limpio y un horizonte de melocotón
        dia += vec3(1.0,0.82,0.5) * pow(max(0.0, dot(normalize(vP), normalize(vec3(-0.7,0.18,-0.7)))), 18.0) * 0.8;
        col = mix(col, dia, uDia); gl_FragColor = vec4(col, 1.0); }`,
    }),
  );
  escena.add(cielo);
  // el estallido: un resplandor de oro que nace dentro del castillo, y el sol que sale después
  const estallido = new THREE.PointLight(0xffd08a, 0, 60, 1.2); estallido.position.set(0, 4, 0); escena.add(estallido);
  const sol = new THREE.DirectionalLight(0xffd9a8, 0); sol.position.set(-30, 12, -30); escena.add(sol);

  const halo = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const g = cv.getContext("2d"); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const brillo = (color, escala, opacidad = 1) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: opacidad }));
    sp.scale.setScalar(escala); return sp;
  };
  const haloLuna = brillo(c(colores.moon), 30, 0.35);
  haloLuna.material.fog = false;
  haloLuna.position.copy(discoLuna.position).add(new THREE.Vector3(0, 0, 1));
  escena.add(haloLuna);
  const halos = [];
  const fogonazo = brillo(new THREE.Color(0xffe2a8), 1, 0); fogonazo.material.fog = false; fogonazo.position.set(0, 5, 1); escena.add(fogonazo);
  const discoSol = brillo(new THREE.Color(0xfff0c8), 40, 0); discoSol.material.fog = false; discoSol.position.set(-70, -10, -90); escena.add(discoSol);

  // Modelo
  // datos: ArrayBuffer ya en memoria (la página publicada no puede hacer fetch de un data:, lo bloquea su CSP)
  const gltf = datos ? await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(datos, "") : await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const castillo = gltf.scene;
  escena.add(castillo);
  // Piedra procedural: ruido fbm triplanar y, en «piedra», hiladas de sillares con juntas.
  // No pesa nada en el GLB: todo se calcula en el shader a partir de la posición en el mundo.
  const PIEDRA = { piedra: 1, tejado: 2, roca: 3, madera: 4, hueco: 0 };
  const uRayo = { value: 0 }; // compartido por todos los materiales de piedra
  const procedural = (m) => {
    const tipo = PIEDRA[m.name]; if (!tipo || m.userData.procedural) return;
    m.userData.procedural = true;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTipo = { value: tipo };
      sh.uniforms.uBorde = { value: c(colores.moon).multiplyScalar(0.55) };
      sh.uniforms.uBrasa = { value: c(colores.blood).multiplyScalar(0.5) };
      sh.uniforms.uRayo = uRayo;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNor;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNor = normalize(mat3(modelMatrix) * objectNormal);");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vWPos; varying vec3 vWNor; uniform float uTipo; uniform vec3 uBorde; uniform vec3 uBrasa; uniform float uRayo;
          float gAlt; float gHumedo;
          vec3 relieve(vec3 p, vec3 n, float h, float k){ vec3 sx = dFdx(p), sy = dFdy(p); vec3 r1 = cross(sy, n), r2 = cross(n, sx);
            float det = dot(sx, r1); vec2 dh = vec2(dFdx(h), dFdy(h)) * k; vec3 g = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * n - g); }
          float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
          float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*n3(p); p*=2.03; a*=0.5; } return v; }`)
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", `vec4 diffuseColor = vec4( diffuse, opacity );
          float ruido = fbm(vWPos*3.1);
          float grano = n3(vWPos*38.0);
          float tono = mix(0.55, 1.35, ruido) * mix(0.9, 1.08, grano);
          gAlt = ruido * 0.6; // relieve de baja frecuencia: sin grano que parpadee a distancia
          if (uTipo < 1.5) { // sillares: hiladas de 0,24 y piezas de 0,5 con juntas
            vec3 an = abs(vWNor);
            float u = an.x > an.z ? vWPos.z : vWPos.x;
            float fila = floor(vWPos.y / 0.24);
            float jy = abs(fract(vWPos.y / 0.24) - 0.5);
            float jx = abs(fract(u / 0.5 + mod(fila, 2.0) * 0.5) - 0.5);
            float junta = (an.y > 0.8) ? 1.0 : smoothstep(0.43, 0.47, max(jy, jx * 0.98));
            gAlt -= junta * 0.5;
            tono *= mix(1.0, 0.35, junta) * mix(0.82, 1.12, h3(vec3(floor(u/0.5 + mod(fila,2.0)*0.5), fila, 1.0)));
          } else if (uTipo < 2.5) { // tejas
            float t = abs(fract(vWPos.y / 0.16) - 0.5);
            tono *= mix(1.1, 0.55, smoothstep(0.38, 0.5, t));
          } else if (uTipo < 3.5) { // roca: vetas y musgo oscuro en lo plano
            tono *= mix(0.7, 1.4, fbm(vWPos*0.9 + vec3(0.0, vWPos.y*0.6, 0.0)));
          }
          // regueros: la lluvia oscurece y abrillanta franjas verticales
          gHumedo = smoothstep(0.55, 0.85, n3(vec3(vWPos.x * 5.0, vWPos.y * 0.35, vWPos.z * 5.0))) * step(abs(vWNor.y), 0.7);
          tono *= mix(1.0, 0.55, gHumedo);
          diffuseColor.rgb *= tono;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          normal = relieve(-vViewPosition, normal, gAlt, (uTipo < 1.5 ? 0.3 : 0.35) * smoothstep(45.0, 14.0, length(vViewPosition)));`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float fres = pow(1.0 - clamp(dot(nonPerturbedNormal, normalize(vViewPosition)), 0.0, 1.0), 3.5); // con la normal sin relieve: perfila la silueta, no las juntas
          totalEmissiveRadiance += uBorde * fres * (0.35 + uRayo * 2.5);          // la luna perfila las aristas
          totalEmissiveRadiance += uBrasa * smoothstep(1.5, -4.0, vWPos.y) * 0.5;  // brasa desde el abismo`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= mix(0.75, 1.1, fbm(vWPos*5.0)) * mix(1.0, 0.35, gHumedo);");
    };
    m.needsUpdate = true;
  };
  const piezas = [];
  const centro = new THREE.Vector3(0, 3, 0);
  castillo.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    procedural(o.material);
    if (["piedra", "roca", "tejado"].includes(o.material.name) && !o.material.userData.aclarado) {
      o.material.color.multiplyScalar(2.2); o.material.userData.aclarado = true; // material compartido: una vez
    }
    if (o.material.name === "ventana") { o.material = o.material.clone(); o.material.emissive = c(colores.wax); } // una por ventana: cada una tiembla y se apaga por su cuenta
    if (o.material.name === "vitral") o.material.emissive = c(colores.blood);
    if (o.name === "acantilado" || o.name.startsWith("lapida") || o.name.startsWith("arbol")) return;
    // estalla desde dentro: todo sale despedido hacia fuera y hacia arriba desde el corazón del castillo
    const dir = o.position.clone().sub(centro);
    dir.y = Math.abs(dir.y) * 0.4 + 0.5 + Math.random() * 0.6;
    dir.normalize();
    piezas.push({
      o,
      p0: o.position.clone(),
      r0: o.rotation.clone(),
      dir,
      fuerza: 9 + Math.random() * 14,
      giro: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
      retardo: Math.random() * 0.45 + (o.position.y / 14) * 0.25,
    });
  });
  castillo.updateMatrixWorld(true);
  // la cima del acantilado: donde queda el cazador cuando el castillo ya no está
  const plataforma = new THREE.Vector3(0, 0, 2); let acantilado = null;
  castillo.traverse((o) => { if (o.isMesh && o.name === "acantilado") { const b = new THREE.Box3().setFromObject(o); plataforma.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); acantilado = { m: o.material, c0: o.material.color.clone() }; } }); // el centro exacto de la cima
  castillo.traverse((o) => {
    if (!o.isMesh || !["ventana", "vitral"].includes(o.material.name)) return;
    const sp = brillo(o.material.name === "vitral" ? c(colores.blood) : c(colores.wax), o.material.name === "vitral" ? 3.2 : 1.6, 0.8);
    o.getWorldPosition(sp.position); escena.add(sp); halos.push({ sp, o, base: sp.material.opacity, f: Math.random() * 6.28 });
  });
  const ventanas = [];
  castillo.traverse((o) => o.isMesh && o.material.name === "ventana" && ventanas.push({ o, m: o.material, f: Math.random() * 40, ojos: null }));
  // En algunas ventanas, cuando la vela se apaga, se encienden dos ojos rojos
  ventanas.filter((_, i) => i % 3 === 1).slice(0, 5).forEach((v) => {
    const p = v.o.getWorldPosition(new THREE.Vector3());
    v.ojos = [-1, 1].map((k) => { const sp = brillo(c(colores.blood), 0.32, 0); sp.position.copy(p).add(new THREE.Vector3(k * 0.09, 0.04, 0.12)); escena.add(sp); return sp; });
  });

  // Estrellas: puntos que titilan en el shader
  const N_EST = 1600;
  const estGeo = new THREE.BufferGeometry();
  const ep = new Float32Array(N_EST * 3), es = new Float32Array(N_EST);
  for (let i = 0; i < N_EST; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.85 + 0.12);
    ep.set([Math.sin(ph) * Math.cos(th) * 150, Math.cos(ph) * 150, Math.sin(ph) * Math.sin(th) * 150], i * 3); es[i] = Math.random();
  }
  estGeo.setAttribute("position", new THREE.BufferAttribute(ep, 3)); estGeo.setAttribute("aSemilla", new THREE.BufferAttribute(es, 1));
  const estMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uColor: { value: c(colores.moon) }, uVis: { value: 1 } },
    vertexShader: `attribute float aSemilla; uniform float uT; varying float vA; void main(){ vA = 0.35 + 0.65*abs(sin(uT*(0.6+aSemilla*2.0) + aSemilla*40.0)); gl_PointSize = 1.0 + aSemilla*2.2; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uVis; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(uColor, smoothstep(0.5,0.0,d)*vA*uVis); }`,
  });
  escena.add(new THREE.Points(estGeo, estMat));

  // Textura de nube (canvas) para nubes y niebla baja
  const texNube = (() => {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
    const g = cv.getContext("2d");
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 18 + Math.random() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
    return new THREE.CanvasTexture(cv);
  })();
  const nubes = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: texNube, color: c(colores.violet).multiplyScalar(0.7).lerp(c(colores.moon), 0.12), transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
    const s = 26 + Math.random() * 30; m.scale.set(s, s, 1);
    m.position.set(-80 + i * 12 + Math.random() * 8, (i > 8 ? 6 : 14) + Math.random() * 16, -60 - Math.random() * 25);
    m.userData.v = 0.4 + Math.random() * 0.6;
    escena.add(m); return m;
  });

  // Niebla baja: sprites grandes y tenues que rodean el acantilado
  const nieblaBaja = Array.from({ length: 16 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNube, color: c(colores.violet).lerp(c(colores.moon), 0.15), transparent: true, opacity: 0.32, depthWrite: false }));
    const a = (i / 16) * Math.PI * 2, r = 9 + Math.random() * 6;
    sp.position.set(Math.cos(a) * r, -3.5 + Math.random() * 2.5, Math.sin(a) * r * 0.8 + 2);
    sp.scale.set(18, 7, 1); sp.userData = { a, r, v: 0.03 + Math.random() * 0.04 };
    escena.add(sp); return sp;
  });

  // Ascuas del derrumbe
  const N_ASC = 600;
  const ascGeo = new THREE.BufferGeometry();
  const ap = new Float32Array(N_ASC * 3), as = new Float32Array(N_ASC);
  for (let i = 0; i < N_ASC; i++) { ap.set([(Math.random() - 0.5) * 14, Math.random() * 14, (Math.random() - 0.5) * 8], i * 3); as[i] = Math.random(); }
  ascGeo.setAttribute("position", new THREE.BufferAttribute(ap, 3)); ascGeo.setAttribute("aSemilla", new THREE.BufferAttribute(as, 1));
  const ascMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uF: { value: 0 }, uColor: { value: c(colores.wax) }, uSangre: { value: c(colores.blood) } },
    vertexShader: `attribute float aSemilla; uniform float uT; uniform float uF; varying float vA; varying float vS;
      void main(){ vec3 p = position; p.y = mod(p.y + uT*(0.8+aSemilla*1.6), 16.0) - 2.0; p.x += sin(uT*1.5 + aSemilla*30.0)*0.6;
      vA = uF * (1.0 - p.y/14.0); vS = aSemilla; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = (2.0 + aSemilla*4.0) * (30.0 / -mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uSangre; varying float vA; varying float vS; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(mix(uColor,uSangre,vS), smoothstep(0.5,0.0,d)*vA); }`,
  });
  const ascuas = new THREE.Points(ascGeo, ascMat); ascuas.visible = false;
  escena.add(ascuas);

  // Rayo: una línea quebrada que se regenera en cada destello
  const rayoGeo = new THREE.BufferGeometry();
  rayoGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
  const rayoLinea = new THREE.Line(rayoGeo, new THREE.LineBasicMaterial({ color: c(colores.moon), transparent: true, opacity: 0, fog: false }));
  escena.add(rayoLinea);
  let rayoAnterior = 0;
  const nuevoRayo = () => {
    const a = rayoGeo.attributes.position; let x = (Math.random() - 0.5) * 50, y = 40, z = -45;
    for (let i = 0; i < 40; i++) { a.setXYZ(i, x, y, z); y -= 1.1; x += (Math.random() - 0.5) * 3.2; }
    a.needsUpdate = true;
  };

  // Haces de luz de luna entre la niebla
  const haces = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6 + i * 3, 60), new THREE.MeshBasicMaterial({ map: (() => {
      const cv = document.createElement("canvas"); cv.width = 4; cv.height = 128; const g = cv.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0.0)"); gr.addColorStop(0.3, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(cv); })(), color: c(colores.moon), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(10 - i * 6, 14, -14 - i * 5); m.rotation.z = 0.42 + i * 0.05;
    escena.add(m); return m;
  });

  // Lluvia: segmentos que caen en el shader (sin tocar buffers por fotograma)
  const N_LLUVIA = reducido ? 0 : 2200;
  const lluviaGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N_LLUVIA * 6);
  for (let i = 0; i < N_LLUVIA; i++) {
    const x = (Math.random() - 0.5) * 70, y = Math.random() * 40, z = (Math.random() - 0.5) * 50 + 4;
    pos.set([x, y, z, x + 0.12, y + 0.9, z], i * 6);
  }
  lluviaGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lluviaMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uColor: { value: c(colores.moon) }, uVis: { value: 1 } },
    vertexShader: `uniform float uT; void main(){ vec3 p = position; p.y = mod(p.y - uT*26.0, 40.0) - 6.0; p.x -= p.y*0.08; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uVis; void main(){ gl_FragColor = vec4(uColor, 0.22*uVis); }`,
  });
  const lluvia = new THREE.LineSegments(lluviaGeo, lluviaMat);
  escena.add(lluvia);

  // Murciélagos: una malla instanciada; las alas baten escalando en Y
  const alaGeo = new THREE.BufferGeometry();
  alaGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    0, 0, 0, -1, 0.35, 0, -0.55, -0.1, 0,  -1, 0.35, 0, -1.35, -0.05, 0, -0.55, -0.1, 0,
    0, 0, 0, 1, 0.35, 0, 0.55, -0.1, 0,   1, 0.35, 0, 1.35, -0.05, 0, 0.55, -0.1, 0,
    -0.18, 0.05, 0, 0.18, 0.05, 0, 0, -0.35, 0,
  ]), 3));
  const N_MURC = reducido ? 0 : 36;
  const murcielagos = new THREE.InstancedMesh(alaGeo, new THREE.MeshBasicMaterial({ color: c(colores.deep), side: THREE.DoubleSide }), N_MURC);
  const datosMurc = Array.from({ length: N_MURC }, () => ({
    r: 5 + Math.random() * 9, h: 6 + Math.random() * 9, v: (0.25 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
    a: Math.random() * Math.PI * 2, f: Math.random() * 6.28, s: 0.25 + Math.random() * 0.35,
  }));
  escena.add(murcielagos);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();

  // Bruma: tres planos con textura de manchas generada en canvas
  const tex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const g = cv.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256, y = 90 + Math.random() * 80, r = 30 + Math.random() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; return t;
  })();
  const brumas = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 22), new THREE.MeshBasicMaterial({ map: tex, color: c(colores.violet), transparent: true, opacity: 0.35 - i * 0.08, depthWrite: false }));
    m.position.set(0, -1 + i * 1.6, 9 - i * 9);
    escena.add(m);
    return m;
  });

  // Estado que escriben los ScrollTriggers
  const estado = { hero: 0, final: 0, raton: new THREE.Vector2(), rayo: 0, dia: 0 };
  // de un punto del mundo a píxeles del lienzo (para colocar al cazador HTML sobre la plataforma)
  const vp = new THREE.Vector3();
  const proyectar = (v) => { vp.copy(v).project(camara); return [(vp.x + 1) / 2 * canvas.clientWidth, (1 - vp.y) / 2 * canvas.clientHeight]; };
  const cam0 = new THREE.Vector3(4, 2.5, 40), cam1 = new THREE.Vector3(-4, 8.5, 19);
  const camF = new THREE.Vector3(6, 5, 30);
  const colAmanecer = c(colores.blood).multiplyScalar(0.35);
  const colDia = new THREE.Color(0xa9cdee), colCieloDia = new THREE.Color(0xb8daf6), colSueloDia = new THREE.Color(0x6f8a52), colNubeDia = new THREE.Color(0xffffff), colMusgo = new THREE.Color(0x7d9a62);
  const colHemiNoche = hemi.color.clone(), colSueloNoche = hemi.groundColor.clone();

  function redimensionar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = w < h ? 46 : 32; // vertical: abre el plano para que quepa la torre
    camara.updateProjectionMatrix();
  }

  // Calidad adaptativa: si 30 fotogramas seguidos van por encima de 40 ms, baja la resolución
  let ultimo = 0, lentos = 0, calidad = 2;
  function vigilar(t) {
    const dt = t - ultimo; ultimo = t;
    if (dt > 0.04 && dt < 1) lentos++; else lentos = Math.max(0, lentos - 1);
    if (lentos > 30 && calidad > 0) {
      calidad--; lentos = 0;
      renderer.setPixelRatio(calidad === 1 ? 1 : 0.6);
      redimensionar();
    }
  }

  function dibujar(t) {
    vigilar(t);
    const p = estado.hero, f = estado.final;
    // Cámara: dolly hacia el castillo en el hero; en el final se aleja y sube
    if (f > 0) camara.position.lerpVectors(cam1, camF, Math.min(1, f * 1.4));
    else camara.position.lerpVectors(cam0, cam1, p);
    camara.position.x += estado.raton.x * 0.8;
    camara.position.y += estado.raton.y * 0.4;
    mira.lerpVectors(mira0, mira1, f > 0 ? 1 : Math.min(1, p * 1.3));
    camara.lookAt(mira);

    // El final: el castillo tiembla y se enciende por dentro (0–0,25), estalla (0,25) y sus piezas
    // salen despedidas, caen y se desvanecen; después se hace de día (0,35–0,85)
    const E0 = 0.25, D = THREE.MathUtils.smoothstep(f, 0.35, 0.85), carga = THREE.MathUtils.clamp(f / E0, 0, 1);
    estado.dia = D;
    piezas.forEach((k, i) => {
      const u = THREE.MathUtils.clamp((f - E0 - k.retardo * 0.06) / 0.55, 0, 1); // estalla deprisa: en un instante ya no queda castillo en pie
      if (u <= 0) {
        const tiembla = f > 0 ? carga * carga * 0.06 : 0;
        k.o.position.set(k.p0.x + Math.sin(t * 53 + i) * tiembla, k.p0.y + Math.sin(t * 61 + i * 1.7) * tiembla, k.p0.z);
        k.o.rotation.copy(k.r0); k.o.scale.setScalar(1); k.o.visible = true; return;
      }
      const sale = 1 - Math.exp(-7 * u); // salida violenta que se frena en el aire
      k.o.position.set(k.p0.x + k.dir.x * k.fuerza * sale, k.p0.y + k.dir.y * k.fuerza * sale - 34 * u * u, k.p0.z + k.dir.z * k.fuerza * sale);
      k.o.rotation.set(k.r0.x + k.giro.x * u * 1.6, k.r0.y + k.giro.y * u * 1.6, k.r0.z + k.giro.z * u * 1.6);
      const s = 1 - THREE.MathUtils.smoothstep(u, 0.45, 0.95); // caen y se desvanecen
      k.o.scale.setScalar(Math.max(0.001, s)); k.o.visible = s > 0.002;
    });
    const flash = f > E0 ? Math.exp(-(f - E0) * 28) : 0;
    estallido.intensity = carga * carga * 40 * (f < E0 + 0.12 ? 1 : 0) + flash * 600;
    fogonazo.material.opacity = flash; fogonazo.scale.setScalar(4 + (f > E0 ? (f - E0) * 260 : carga * 3));
    sol.intensity = D * 3.4; discoSol.material.opacity = D * 0.9; discoSol.position.y = -12 + D * 30;
    luna.intensity = 4.4 * (1 - D * 0.85);
    renderer.toneMappingExposure = 1 + D * 0.55;
    // Amanecer de sangre en el final
    escena.fog.color.copy(niebla).lerp(colAmanecer, Math.min(1, f * 2.5)).lerp(colDia, D);
    escena.fog.density = 0.021 * (1 - D * 0.8); // de día la bruma se levanta
    cielo.material.uniforms.uFinal.value = Math.min(1, f * 2.5) * (1 - D);
    cielo.material.uniforms.uDia.value = D;
    lluviaMat.uniforms.uVis.value = 1 - THREE.MathUtils.smoothstep(f, 0.3, 0.6); // escampa
    hemi.color.copy(colHemiNoche).lerp(colCieloDia, D); hemi.groundColor.copy(colSueloNoche).lerp(colSueloDia, D);
    nubes.forEach((m) => { m.material.color.copy(m.userData.c0 || (m.userData.c0 = m.material.color.clone())).lerp(colNubeDia, D); m.material.opacity = 0.32 + D * 0.6; const sinBruma = D > 0.05; if (m.material.fog === sinBruma) { m.material.fog = !sinBruma; m.material.needsUpdate = true; } }); // de día, nubes blancas y nítidas que pasan
    if (acantilado) acantilado.m.color.copy(acantilado.c0).lerp(colMusgo, D * 0.7); // la roca reverdece
    escena.background.copy(escena.fog.color);
    discoLuna.position.y = 26 - f * 30;
    for (const v of ventanas) {
      const apagon = Math.sin(t * 0.31 + v.f * 5.3) > 0.9 ? 0.04 : 1; // de vez en cuando una vela se apaga
      v.m.emissiveIntensity = (3.2 + Math.sin(t * 9 + v.f) * 0.6 + Math.sin(t * 23 + v.f * 3) * 0.3) * apagon * (1 - f);
      v.brillo = apagon;
      if (v.ojos) { const parpadeo = Math.sin(t * 2.1 + v.f) > -0.92 ? 1 : 0; v.ojos.forEach((sp) => (sp.material.opacity = (1 - apagon) * parpadeo * (1 - f) * 0.95)); }
    }
    infierno.intensity = (55 + Math.sin(t * 3.1) * 10 + Math.sin(t * 7.7) * 6) * (1 + Math.min(1, f * 4) * 1.5) * (1 - D);
    uRayo.value = estado.rayo;

    lluviaMat.uniforms.uT.value = t;
    estMat.uniforms.uT.value = t; estMat.uniforms.uVis.value = (1 - f * 0.8) * (1 - D);
    nubes.forEach((m) => { m.position.x += m.userData.v * (0.02 + estado.dia * 0.08); if (m.position.x > 80) m.position.x = -80; m.lookAt(camara.position); });
    nieblaBaja.forEach((sp) => { const u = sp.userData; u.a += u.v * 0.01; sp.position.x = Math.cos(u.a) * u.r; sp.position.z = Math.sin(u.a) * u.r * 0.8 + 2; sp.material.opacity = 0.2 * (1 - f * 0.6) * (1 - estado.dia * 0.7); sp.material.color.copy(sp.userData.c0 || (sp.userData.c0 = sp.material.color.clone())).lerp(colNubeDia, estado.dia); });
    ascuas.visible = f > 0.02; ascMat.uniforms.uT.value = t; ascMat.uniforms.uF.value = Math.min(1, f * 2.2);
    haces.forEach((m, i) => (m.material.opacity = (0.05 + Math.sin(t * 0.4 + i) * 0.015) * (1 - f)));
    if (estado.rayo > 0.6 && rayoAnterior <= 0.6) nuevoRayo();
    rayoAnterior = estado.rayo;
    rayoLinea.material.opacity = estado.rayo;
    for (let i = 0; i < N_MURC; i++) {
      const b = datosMurc[i];
      const a = b.a + t * b.v;
      v3.set(Math.cos(a) * b.r, b.h + Math.sin(t * 1.3 + b.f) * 0.8, Math.sin(a) * b.r * 0.7);
      e.set(0, -a + (b.v > 0 ? Math.PI : 0), 0); q.setFromEuler(e);
      v3.multiplyScalar(1 + D * 4); // con el día, los murciélagos huyen lejos
      sc.set(b.s, b.s * (0.3 + Math.abs(Math.sin(t * 12 + b.f))), b.s).multiplyScalar(1 - D * 0.9);
      m4.compose(v3, q, sc); murcielagos.setMatrixAt(i, m4);
    }
    if (N_MURC) murcielagos.instanceMatrix.needsUpdate = true;
    brumas.forEach((m, i) => { m.material.map.offset.x = t * (0.004 + i * 0.003); const u = m.userData; if (!u.c0) { u.c0 = m.material.color.clone(); u.o0 = m.material.opacity; } m.material.color.copy(u.c0).lerp(colNubeDia, estado.dia); m.material.opacity = u.o0 * (1 - estado.dia * 0.75); }); // la bruma violeta se aclara y se disipa con la primavera

    rayo.intensity = estado.rayo * 9;
    hemi.intensity = 0.55 + estado.rayo * 1.5 + D * 1.6;
    for (const h of halos) {
      h.o.getWorldPosition(h.sp.position);
      const v = h.v ?? (h.v = ventanas.find((w) => w.o === h.o) || null);
      h.sp.material.opacity = h.base * (1 - Math.min(1, f * 4)) * (0.85 + 0.15 * Math.sin(t * 7 + h.f)) * (v ? v.brillo ?? 1 : 1);
    }
    haloLuna.position.y = discoLuna.position.y;
    discoLuna.material.transparent = true; discoLuna.material.opacity = 1 - D * 0.85; haloLuna.material.opacity = 0.35 * (1 - D);
    renderer.render(escena, camara);
  }

  function salir() {
    escena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { m.map && m.map.dispose(); m.dispose(); });
    });
    tex.dispose(); halo.dispose(); texNube.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  redimensionar();
  return { estado, dibujar, redimensionar, salir, proyectar, plataforma };
}
