// Super Castlevania IV · proyecto «belmont» sobre SYX
// Perfil de movimiento: gsap+lenis (declarado en movimiento.perfil).
// Dueños (orq-propiedad): reloj = gsap.ticker → lenis.raf · posición y anclas = Lenis ·
// medición = ScrollTrigger.refresh() · velocidad = self.getVelocity() · reducido = mov.reducido ·
// limpieza = mov.salir(). Todo el movimiento entra por mov.añadir, así se revierte junto.
import { resolveColor } from "./syx-colors.js";
import { criaturas } from "./criaturas.js";
import { rutas } from "./rutas.js";
import { bocetos, ENEMIGOS, referencias } from "./bocetos.js";
import { atlas } from "./atlas.js";

const { gsap, ScrollTrigger, SplitText, MotionPathPlugin, Lenis, Plantillas } = window;
gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);

// Al recargar se empieza por la portada (PUSH START), no a media página con la intro encima
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (!location.hash) window.scrollTo(0, 0);

const mov = Plantillas.iniciarMovimiento({
  perfil: "gsap+lenis",
  gsap,
  ScrollTrigger,
  Lenis,
  opciones: { lenis: { lerp: 0.085, wheelMultiplier: 0.9 } },
});
document.documentElement.classList.toggle("is-reduced", mov.reducido);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n, l) => String(Math.max(0, Math.round(n))).padStart(l, "0");

/* ── Colores del canvas: se piden a SYX, nunca en hex a mano ── */
function paleta() {
  const c = (t) => resolveColor(`--${t}`, { format: "hex" });
  return {
    ink: c("belmont-ink"),
    moon: c("belmont-moon"),
    blood: c("belmont-blood"),
    wax: c("belmont-wax"),
    deep: c("belmont-bg-deep"),
    violet: c("belmont-violet"),
  };
}

/* ── 1 · Intro PUSH START ─────────────────────────────────── */
function intro(alEntrar) {
  const capa = $("[data-intro]");
  if (mov.reducido) { alEntrar(); return; }
  capa.hidden = false;
  mov.bloquear();
  let hecho = false;
  const entrar = () => {
    if (hecho) return;
    hecho = true;
    quitar();
    const tl = gsap.timeline({
      onComplete: () => { capa.hidden = true; },
    });
    tl.to("[data-start]", { scale: 1.4, opacity: 0, duration: 0.25, ease: "power2.in" })
      .to("[data-curtain]", { scaleX: 1, duration: 0.45, ease: "power3.inOut" }, "<0.05")
      .add(() => {
        capa.style.background = "transparent";
        $$(".belmont-intro > p, .belmont-intro > button").forEach((e) => (e.style.visibility = "hidden"));
        mov.desbloquear();
        alEntrar();
      })
      .to("[data-curtain]", { scaleX: 0, duration: 0.8, ease: "power3.inOut", transformOrigin: (i) => (i ? "right" : "left") }, "+=0.05");
  };
  const tecla = (e) => { if (!["Tab", "Shift"].includes(e.key)) entrar(); };
  const quitar = () => {
    window.removeEventListener("wheel", entrar);
    window.removeEventListener("touchstart", entrar);
    window.removeEventListener("keydown", tecla);
  };
  $("[data-start]").addEventListener("click", entrar);
  window.addEventListener("wheel", entrar, { passive: true });
  window.addEventListener("touchstart", entrar, { passive: true });
  window.addEventListener("keydown", tecla);
  $("[data-start]").focus({ preventScroll: true });
}

/* ── Separador de sangre: la sangre del castillo gotea sobre el prólogo ──
   Banda con borde ondulado y goterones que se alargan, sueltan una gota y se recogen. Un filtro
   «goo» funde tallos, cabezas y gotas como un líquido espeso; un filo claro le da volumen. */
function sangre() {
  const svg = $("[data-drip]");
  if (!svg) return;
  const goo = $("[data-goo]", svg), brillo = $("[data-shine]", svg), NS = "http://www.w3.org/2000/svg";
  const el = (t, a, padre) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); padre.append(e); return e; };
  const R = gsap.utils.random;
  mov.añadir(({ reducido }) => {
    const w = Math.max(320, svg.clientWidth), h = Math.max(60, svg.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    goo.replaceChildren(); brillo.replaceChildren();
    const base = h * 0.2;
    let d = `M0 -2H${w}V${base}`;
    for (let x = w; x > 0; x -= 70) d += ` Q${x - 35} ${base + R(-3, 9)} ${Math.max(0, x - 70)} ${base}`;
    el("path", { d: d + "Z" }, goo);
    el("path", { d: `M0 ${base * 0.45}H${w}` }, brillo);
    const n = Math.max(6, Math.round(w / 95));
    const gotas = Array.from({ length: n }, (_, i) => {
      const x = ((i + 0.5) * w) / n + R(-28, 28), r = R(5, 12), l0 = R(h * 0.05, h * 0.16), l1 = R(h * 0.3, h * 0.8);
      const tallo = el("rect", { x: x - r * 0.62, y: base - 6, width: r * 1.24, height: l0 + 6, rx: r * 0.62 }, goo);
      const cabeza = el("circle", { cx: x, cy: base + l0, r }, goo);
      const gota = el("circle", { cx: x, cy: base + l0, r: r * 0.75, opacity: 0 }, goo);
      const luz = el("circle", { cx: x - r * 0.35, cy: base + l0 - r * 0.3, r: r * 0.22 }, brillo);
      return { x, r, l0, l1, tallo, cabeza, gota, luz };
    });
    if (reducido) { gotas.forEach((g) => { g.tallo.setAttribute("height", g.l1 * 0.6 + 6); g.cabeza.setAttribute("cy", base + g.l1 * 0.6); g.luz.setAttribute("cy", base + g.l1 * 0.6 - g.r * 0.3); }); return; }
    const tls = gotas.map((g) => {
      const e = { l: g.l0 };
      const pinta = () => { g.tallo.setAttribute("height", Math.max(0, e.l + 6)); g.cabeza.setAttribute("cy", base + e.l); g.luz.setAttribute("cy", base + e.l - g.r * 0.3); };
      // se alarga despacio, la gota se suelta y cae con gravedad, y el goterón se recoge con un rebote
      return gsap.timeline({ repeat: -1, delay: R(0, 4), repeatDelay: R(0.5, 3.5), paused: true })
        .to(e, { l: g.l1, duration: R(2.4, 5), ease: "sine.in", onUpdate: pinta })
        .set(g.gota, { attr: { cy: () => base + g.l1 }, opacity: 1 })
        .to(g.gota, { attr: { cy: h * 1.6 }, duration: 0.7, ease: "power2.in" })
        .to(g.gota, { opacity: 0, duration: 0.15 }, "-=0.15")
        .to(e, { l: g.l0, duration: 0.9, ease: "elastic.out(1, 0.45)", onUpdate: pinta }, "<-0.55");
    });
    // solo gotea mientras se ve (el borde vive dentro del hero fijado: un observador es más fiable que un disparador)
    const io = new IntersectionObserver(([e]) => tls.forEach((t) => (e.isIntersecting ? t.play() : t.pause())));
    io.observe(svg);
    return () => { io.disconnect(); tls.forEach((t) => t.kill()); };
  });
}

/* ── 2 · Cielo: estrellas, lluvia, murciélagos y relámpagos ── */
function cielo() {
  const canvas = $("[data-sky]");
  const ctx = canvas.getContext("2d");
  let col = paleta();
  let w = 0, h = 0, dpr = 1;
  const estrellas = [], gotas = [], murcielagos = [];
  let rayo = null;

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    estrellas.length = 0; gotas.length = 0;
    const n = Math.round((w * h) / 5200);
    for (let i = 0; i < n; i++) estrellas.push({ x: Math.random() * w, y: Math.random() * h * 0.7, r: Math.random() * 1.3 + 0.2, f: Math.random() * 6.28 });
    for (let i = 0; i < Math.round(w / 9); i++) gotas.push({ x: Math.random() * w, y: Math.random() * h, l: 8 + Math.random() * 16, v: 9 + Math.random() * 8 });
  }
  function bandada() {
    murcielagos.length = 0;
    const n = w < 600 ? 7 : 14;
    for (let i = 0; i < n; i++) murcielagos.push({ x: -Math.random() * w * 0.8, y: h * (0.12 + Math.random() * 0.4), s: 7 + Math.random() * 12, v: 1.2 + Math.random() * 1.8, f: Math.random() * 6.28, a: Math.random() * 6.28 });
  }
  function murcielago(b, t) {
    const flap = Math.sin(t * 14 + b.f);
    const { x, s } = b; const y = b.y + Math.sin(t * 2 + b.a) * s * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const k of [-1, 1]) {
      ctx.lineTo(x + k * s * 0.35, y - s * 0.55 * flap);
      ctx.lineTo(x + k * s, y - s * 0.25 * flap - s * 0.1);
      ctx.lineTo(x + k * s * 0.7, y + s * 0.12);
      ctx.lineTo(x + k * s * 0.4, y + s * 0.02);
      ctx.lineTo(x + k * s * 0.15, y + s * 0.22);
      ctx.lineTo(x, y);
    }
    ctx.fill();
  }
  function trazarRayo() {
    const x0 = w * (0.15 + Math.random() * 0.7); const pts = [[x0, 0]];
    let x = x0, y = 0;
    while (y < h * 0.65) { y += 14 + Math.random() * 26; x += (Math.random() - 0.5) * 46; pts.push([x, y]); }
    rayo = { pts, vida: 1 };
  }
  let t0 = 0;
  function dibujar(time, quieto) {
    const t = time;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.ink;
    for (const e of estrellas) {
      ctx.globalAlpha = quieto ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + e.f));
      ctx.fillRect(e.x, e.y, e.r, e.r);
    }
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = col.moon;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const g of gotas) {
      if (!quieto) { g.y += g.v; g.x -= g.v * 0.25; if (g.y > h) { g.y = -g.l; g.x = Math.random() * w * 1.2; } }
      ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.l * 0.25, g.y + g.l);
    }
    ctx.stroke();
    if (rayo) {
      ctx.globalAlpha = rayo.vida;
      ctx.strokeStyle = col.ink; ctx.lineWidth = 2;
      ctx.shadowColor = col.moon; ctx.shadowBlur = 18;
      ctx.beginPath(); rayo.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.shadowBlur = 0;
      rayo.vida -= 0.06; if (rayo.vida <= 0) rayo = null;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.deep;
    for (const b of murcielagos) {
      if (!quieto) { b.x += b.v; if (b.x > w + 40) { b.x = -40 - Math.random() * w * 0.5; b.y = h * (0.12 + Math.random() * 0.4); } }
      murcielago(b, t);
    }
  }
  medir(); bandada();

  mov.añadir(({ reducido }) => {
    if (reducido) { dibujar(0, true); return; }
    let activo = true;
    const paso = (time) => { if (activo) dibujar(time, false); };
    gsap.ticker.add(paso); // mismo reloj que Lenis (cmb-reloj)
    const st = ScrollTrigger.create({ trigger: "[data-hero]", start: "top bottom", end: "bottom top", onToggle: (s) => (activo = s.isActive) });
    relampago.dibujar2d = trazarRayo;
    const alCambiar = () => { medir(); bandada(); };
    window.addEventListener("resize", alCambiar);
    return () => { gsap.ticker.remove(paso); st.kill(); window.removeEventListener("resize", alCambiar); };
  });
}

/* ── 2b · Escena three.js (castillo de Blender) ───────────── */
let escena = null;
// las escenas 3D pesadas se construyen cuando su sección se acerca (a vista y media), no al cargar:
// así la página arranca sin bloqueos y cada GPU solo carga lo que de verdad va a verse
const cuandoCerca = (trigger, fn) => {
  let hecho = false;
  const st = ScrollTrigger.create({ trigger, start: "top bottom+=150%", end: "bottom top-=150%", onToggle: (s) => { if (s.isActive && !hecho) { hecho = true; st.kill(); fn(); } } });
};
// ¿Hay WebGL 2? Se mira una vez y se suelta el contexto de prueba: cada contexto vivo cuenta para el tope del navegador
let hayWebgl = null;
const webgl = () => {
  if (hayWebgl !== null) return hayWebgl;
  try { const gl = document.createElement("canvas").getContext("webgl2"); hayWebgl = !!gl; gl && gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { hayWebgl = false; }
  return hayWebgl;
};
// el castillo se descarga lo primero, antes que three.js termine de llegar: es lo que se ve al entrar
const glbCastillo = webgl() ? fetch("models/castillo.glb").then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null) : Promise.resolve(null);

async function tres() {
  if (!webgl()) return;
  try {
    const { crearEscena } = await import("./escena.js");
    escena = await crearEscena({ canvas: $("[data-gl]"), colores: paleta(), datos: await glbCastillo, url: "models/castillo.glb", reducido: mov.reducido }); // si la descarga falló, el cargador lo intenta por url
  } catch (err) {
    console.warn("belmont: sin escena 3D, se queda el castillo SVG", err);
    document.documentElement.dataset.error3d = String(err && err.message || err);
    escena = null;
    return;
  }
  document.documentElement.classList.add("is-3d");
  const alCambiar = () => { escena.redimensionar(); escena.dibujar(gsap.ticker.time); };
  window.addEventListener("resize", alCambiar);
  window.addEventListener("pagehide", () => escena && escena.salir(), { once: true });

}

// Se crea después de todos los pines: así sus posiciones ya cuentan el espacio que añaden (orden de creación).
function escena3d() {
  if (!escena) return;
  const lienzo = $("[data-gl]");
  mov.añadir(({ reducido }) => {
    const hero = $("[data-hero]"), fin = $("[data-finale]");
    let visible = null;
    // visibilidad por fotograma: hero o final dentro de la ventana (más fiable que zonas creadas antes de medir)
    const enPantalla = () => hero.getBoundingClientRect().bottom > 0 || fin.getBoundingClientRect().top < innerHeight;
    const ver = () => { const v = enPantalla(); if (v !== visible) { visible = v; gsap.set(lienzo, { autoAlpha: v ? 1 : 0 }); } return v; };
    if (reducido) {
      const quieto = () => ver() && escena.dibujar(0);
      quieto();
      const st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: quieto });
      return () => st.kill();
    }
    const paso = (t) => { if (ver()) escena.dibujar(t); };
    gsap.ticker.add(paso); // reloj único: gsap.ticker (cmb-reloj)
    let quitarRaton = () => {};
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const rx = gsap.quickTo(escena.estado.raton, "x", { duration: 1.2, ease: "power3" });
      const ry = gsap.quickTo(escena.estado.raton, "y", { duration: 1.2, ease: "power3" });
      const mover = (e) => { rx((e.clientX / innerWidth - 0.5) * 2); ry(-(e.clientY / innerHeight - 0.5) * 2); };
      window.addEventListener("pointermove", mover);
      quitarRaton = () => window.removeEventListener("pointermove", mover);
    }
    return () => { gsap.ticker.remove(paso); quitarRaton(); };
  });
}

/* ── 2b' · Iconos 3D (armas y carne), un lienzo para todos ── */
let iconos = null;
async function iconos3d() {
  if (!webgl()) return;
  try {
    const { crearIconos } = await import("./iconos.js");
    iconos = await crearIconos({ canvas: $("[data-icons]"), url: "models/iconos.glb", cazador: { url: "models/cazador.glb" }, colores: paleta(), reducido: mov.reducido });
  } catch (err) { console.warn("belmont: iconos 3D no disponibles", err); document.documentElement.dataset.errorIconos = String(err && err.message || err); return; }
  document.documentElement.classList.add("is-icons3d");
  mov.añadir(() => {
    const paso = (t) => { iconos.estado.empuje = Math.min(1, Math.abs(hud.velocidad()) / 3000); iconos.dibujar(t); };
    gsap.ticker.add(paso);
    return () => gsap.ticker.remove(paso);
  }, { persistente: true });
  window.addEventListener("pagehide", () => iconos && iconos.salir(), { once: true });
}

/* ── 2c · Relámpagos: ≤ 2 destellos por segundo (WCAG 2.3.1; motion/blender §4) ── */
const relampago = { dibujar2d: null };
function relampagos() {
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    let activo = true;
    const st = ScrollTrigger.create({ trigger: "[data-hero]", start: "top bottom", end: "bottom top", onToggle: (s) => (activo = s.isActive) });
    let cita;
    const destello = () => {
      if (activo) {
        relampago.dibujar2d && relampago.dibujar2d();
        const r = escena ? escena.estado : { rayo: 0 };
        gsap.timeline()
          .to("[data-flash]", { opacity: 0.35, duration: 0.06, ease: "none" }, 0)
          .to(r, { rayo: 1, duration: 0.06, ease: "none" }, 0)
          .to("[data-flash]", { opacity: 0, duration: 0.7, ease: "power2.out" }, 0.06)
          .to(r, { rayo: 0, duration: 0.7, ease: "power2.out" }, 0.06)
          .to(r, { rayo: 0.5, duration: 0.05, ease: "none" }, 0.55)
          .to(r, { rayo: 0, duration: 0.5, ease: "power2.out" }, 0.6);
      }
      cita = gsap.delayedCall(gsap.utils.random(5, 10), destello);
    };
    cita = gsap.delayedCall(2.4, destello);
    return () => { st.kill(); cita && cita.kill(); };
  });
}

/* ── 2d · Linterna que sigue al puntero ───────────────────── */
function linterna() {
  mov.añadir(({ reducido }) => {
    if (reducido || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = $("[data-lantern]");
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
    const mover = (e) => { x(e.clientX); y(e.clientY); gsap.to(el, { opacity: 1, duration: 0.4, overwrite: "auto" }); };
    window.addEventListener("pointermove", mover);
    return () => window.removeEventListener("pointermove", mover);
  });
}

/* ── 3 · Hero: entrada y parallax ─────────────────────────── */
function heroEntrada() {
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const split = SplitText.create("[data-title-main]", { type: "words,chars", wordsClass: "belmont-word", charsClass: "belmont-char" });
    const tl = gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: () => split.revert() }); // la palabra vuelve a ser una sola: el degradado ya no se trocea
    tl.from("[data-numeral]", { opacity: 0, scale: 1.25, xPercent: 12, duration: 1.8, ease: "power2.out" }, 0)
      .from(".belmont-hero__over", { opacity: 0, y: 12, duration: 0.6 }, 0.1)
      .from("[data-title-super]", { opacity: 0, letterSpacing: "1em", duration: 1.1 }, 0.15)
      .from(split.chars, { yPercent: 120, rotateX: -80, opacity: 0, transformOrigin: "50% 100%", duration: 1, stagger: 0.055 }, 0.25)
      .from(".belmont-hero__tag, .belmont-hero__cue", { opacity: 0, y: 24, duration: 0.9, stagger: 0.12 }, 0.9);
    return () => split.revert();
  });
}

function heroScroll() {
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const tres = !!escena;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-hero]", start: "top top", end: tres ? "+=140%" : "bottom top", scrub: true, pin: tres,
        onUpdate: (s) => escena && (escena.estado.hero = s.progress),
      },
    });
    if (tres) {
      tl.to("[data-numeral]", { xPercent: 30, opacity: 0, ease: "none" }, 0)
        .to("[data-hero-copy]", { yPercent: -18, opacity: 0, ease: "power1.in", duration: 0.5 }, 0.35)
        .fromTo("[data-drip]", { scaleY: 0.15 }, { scaleY: 1, ease: "power2.in", duration: 1 }, 0);
    } else {
      tl.to("[data-moon]", { yPercent: 55, scale: 1.25, ease: "none" }, 0)
        .to("[data-layer='far']", { yPercent: 26, ease: "none" }, 0)
        .to("[data-layer='mid']", { yPercent: 14, ease: "none" }, 0)
        .to("[data-layer='near']", { yPercent: 4, ease: "none" }, 0)
        .to("[data-numeral]", { xPercent: 22, opacity: 0.2, ease: "none" }, 0)
        .to("[data-hero-copy]", { yPercent: -30, opacity: 0, ease: "none" }, 0)
        .fromTo("[data-drip]", { scaleY: 0.15 }, { scaleY: 1, ease: "none" }, 0);
    }
  });
}

/* Una escena 3D solo trabaja mientras su sección está a la vista: el ScrollTrigger engancha y desengancha
   su pintado del reloj único (gsap.ticker), en lugar de comprobar en cada fotograma si toca pintar */
function aLaVista(conf, pintar) {
  let dentro = false;
  const f = (t) => pintar(t);
  const poner = (si) => {
    if (si === dentro) return;
    dentro = si;
    if (si) { pintar(gsap.ticker.time); if (!mov.reducido) gsap.ticker.add(f); } // con movimiento reducido, un fotograma fijo al entrar
    else gsap.ticker.remove(f);
  };
  const st = ScrollTrigger.create({ ...conf, onToggle: (s) => poner(s.isActive) });
  poner(st.isActive);
  return () => { poner(false); st.kill(); };
}
/* ── 4 · Prólogo: la carta se escribe mientras bajas ────────
   Cada renglón se descubre bajo la pluma (máscara que avanza con el scroll), la pluma sigue la punta
   de la escritura y, al firmar, cae el lacre. Con movimiento reducido la carta está escrita. */
function prologo() {
  const carta = $("[data-letter]");
  if (!carta) return;
  const pluma = $("[data-letter-quill]", carta), lacre = $("[data-letter-seal]", carta);
  // la pluma en 3D (con su sombra sobre el papel); sin WebGL queda la de SVG
  let p3d = null;
  if (webgl()) cuandoCerca(carta, () => import("./pluma3d.js").then(({ crearPluma }) => {
    p3d = crearPluma({ carta, reducido: mov.reducido });
    carta.classList.add("is-pluma3d");
    aLaVista({ trigger: carta, start: "top bottom", end: "bottom top" }, (t) => p3d.E.visible && p3d.pintar(t));
    window.addEventListener("pagehide", () => p3d && p3d.salir(), { once: true });
  }).catch((err) => console.warn("belmont: pluma 3D no disponible", err)));
  mov.añadir(({ reducido }) => {
    if (reducido) { carta.classList.add("is-written"); return; }
    // ancho real de la tinta de cada renglón (el div de línea ocupa toda la columna)
    // y dónde empieza (la fecha y la firma van alineadas a la derecha)
    const tinta = (linea) => { const r = document.createRange(); r.selectNodeContents(linea); const t = r.getBoundingClientRect(), l = linea.getBoundingClientRect(); return { x0: t.left - l.left, w: t.width }; };
    // la punta de la pluma, en px de la carta: x a lo largo del renglón, y en la línea base;
    // «alzado» la separa del papel (saltos de renglón y de párrafo)
    const P = { x: 0, y: 0, alzado: 0, visible: false };
    const poner = () => {
      if (p3d) { Object.assign(p3d.E, P); p3d.pintar(gsap.ticker.time); gsap.set(pluma, { autoAlpha: 0 }); }
      else gsap.set(pluma, { autoAlpha: P.visible ? 1 : 0, x: P.x, y: P.y - P.alzado, rotation: 10 + P.alzado * 0.3 });
    };
    const base = (linea) => { const c = carta.getBoundingClientRect(), l = linea.getBoundingClientRect(); return { x: l.left - c.left, y: l.top - c.top + l.height * 0.78 }; };
    let tl;
    const escribir = (lineas) => {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
      gsap.set(pluma, { autoAlpha: 0, xPercent: -8, yPercent: -96, rotation: 10, transformOrigin: "8% 96%" }); // la punta de la pluma es su esquina de abajo
      gsap.set(lacre, { autoAlpha: 0, scale: 2.2, rotation: -24 });
      P.visible = false; poner();
      tl = gsap.timeline({ scrollTrigger: { trigger: carta, start: "top 62%", end: "bottom 72%", scrub: true } });
      tl.add(() => { P.visible = tl.progress() > 0 && tl.progress() < 0.995; poner(); }, 0.001);
      let antes = null;
      lineas.forEach((linea, i) => {
        const { x0, w } = tinta(linea), estado = { x: x0 - 24 };
        linea.style.setProperty("--belmont-pen", estado.x + "px");
        // el salto desde el final del renglón anterior: la mano se levanta, vuelve en arco y baja
        if (antes) {
          const de = antes, otroParrafo = linea.closest("p") !== antes.p, s = { u: 0 };
          tl.to(s, {
            u: 1, duration: otroParrafo ? 0.32 : 0.14, ease: "power2.inOut",
            onUpdate: () => {
              const b = base(linea), k = s.u, alto = otroParrafo ? 34 : 16;
              P.x = de.x + (b.x + x0 - de.x) * k; P.y = de.y + (b.y - de.y) * k;
              P.alzado = Math.sin(Math.PI * k) * alto + (otroParrafo ? Math.sin(Math.PI * k * 2) * 6 : 0); // en el párrafo, un respiro: sube más y titubea
              P.visible = true; poner();
            },
          });
        }
        tl.to(estado, {
          x: x0 + w + 24, duration: Math.max(0.2, w / 600), ease: "none",
          onUpdate: () => {
            linea.style.setProperty("--belmont-pen", estado.x + "px");
            const b = base(linea), x = Math.min(x0 + w, Math.max(x0, estado.x));
            // la mano escribe: bucles de las letras (sube y baja un poco) y se despega entre palabras
            P.x = b.x + x; P.y = b.y - Math.abs(Math.sin(x * 0.42)) * 2.6;
            P.alzado = Math.max(0, Math.sin(x * 0.055) - 0.86) * 22;
            P.visible = true; poner();
          },
        });
        const b = base(linea); antes = { x: b.x + x0 + w, y: b.y, p: linea.closest("p") };
      });
      tl.to(P, { alzado: 60, duration: 0.3, onUpdate: poner })
        .add(() => { P.visible = tl.progress() < 0.99; poner(); })
        .to(lacre, { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.5, ease: "back.out(2.4)" }, "<");
    };
    // autoSplit: vuelve a partir los renglones cuando cargan las fuentes o cambia el ancho
    const split = SplitText.create($$("[data-letter-line]", carta), { type: "lines", linesClass: "belmont-letter__line", autoSplit: true, onSplit: (self) => escribir(self.lines) });
    return () => { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); split.revert(); };
  });
}

/* ── 5 · El látigo: rosa polar ─────────────────────────────── */
function latigo() {
  mov.añadir(({ reducido }) => {
    const rayos = $$("[data-ray]");
    if (reducido) return;
    rayos.forEach((r) => { const l = r.getTotalLength(); gsap.set(r, { strokeDasharray: l, strokeDashoffset: l }); });
    const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-rose]", start: "top 80%", end: "bottom 45%", scrub: true } });
    tl.to(rayos, { strokeDashoffset: 0, ease: "power1.inOut", stagger: 0.12 }, 0)
      .fromTo("[data-rose-core]", { rotate: -180, scale: 0.4, transformOrigin: "50% 50%" }, { rotate: 0, scale: 1, ease: "back.out(2)" }, 0)
      .from(".belmont-rose__label", { opacity: 0, stagger: 0.1 }, 0.2);
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 88%",
      onEnter: (els) => gsap.from(els, { opacity: 0, x: 40, duration: 0.7, ease: "power3.out", stagger: 0.12, overwrite: true }),
      once: true,
    });
  });
}

/* ── 6 · Once fases: el mapa de niveles (js/atlas.js) ───── */
function fases() { atlas({ gsap, ScrollTrigger, mov, hud }); }

/* ── 7 · Modo 7 ───────────────────────────────────────────── */
/* La sala de la fase 4, como la hacía la Super Nintendo: una sola capa de fondo (BG1) con la
   habitación entera dibujada en tiles, que el Modo 7 gira y escala alrededor del anillo del que
   cuelga Simon. Se pinta a baja resolución y sin suavizado: cada píxel de la textura cae en un píxel
   de pantalla «gordo», con los dientes de sierra que delataban el giro en la consola. */
const sala7 = { base: 0, escala: 1, giro: 0, juego: 0 };
function texturaSala() {
  const T = 512, C = T / 2, tex = document.createElement("canvas");
  tex.width = tex.height = T;
  const g = tex.getContext("2d");
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
  // ladrillo base (BG): hileras de 16 × 8 con junta oscura, en tres tonos de piedra morada
  const tonos = ["#2a2136", "#30263d", "#372b44", "#2d2339"];
  for (let y = 0; y < T; y += 8) for (let x = -(y / 8 % 2) * 8; x < T; x += 16) {
    const k = ((x * 7 + y * 13) >> 3) & 3;
    px(x, y, 16, 8, "#0e0a14"); px(x + 1, y + 1, 15, 7, tonos[k]); px(x + 1, y + 1, 15, 1, "#43354f"); px(x + 1, y + 7, 15, 1, "#1a1322");
    if (((x * 31 + y * 17) & 63) === 5) px(x + 4, y + 3, 3, 2, "#1a1322"); // desconchones
  }
  // la cámara: muro de sillares claros en un cuadrado, con el interior en penumbra
  const L = 196, W = 22;
  g.fillStyle = "rgba(6, 3, 10, 0.42)"; g.fillRect(C - L, C - L, L * 2, L * 2);
  for (let lado = 0; lado < 4; lado++) {
    g.save(); g.translate(C, C); g.rotate((lado * Math.PI) / 2);
    for (let x = -L - W; x < L + W; x += 22) for (let f = 0; f < 2; f++) {
      const y = -L - W + f * 11, o = f ? 11 : 0;
      px(x + o, y, 22, 11, "#14101b"); px(x + o + 1, y + 1, 21, 10, ((x + f * 3) & 4) ? "#5a4a66" : "#4f415b");
      px(x + o + 1, y + 1, 21, 2, "#76647f"); px(x + o + 1, y + 9, 21, 2, "#2c2236");
    }
    // ventana gótica con el cielo rojo de la noche, partiendo el muro
    const vw = 26, vh = 46;
    for (let yy = 0; yy < vh; yy++) {
      const r = yy < vw / 2 ? Math.sqrt(Math.max(0, (vw / 2) ** 2 - (vw / 2 - yy) ** 2)) : vw / 2;
      const col = yy < 10 ? "#c0283a" : yy < 26 ? "#9a1730" : "#6a0d22";
      px(-r - 3, -L - W - 30 + yy, r * 2 + 6, 1, "#1b1424"); px(-r, -L - W - 30 + yy, r * 2, 1, col);
    }
    px(-1, -L - W - 26, 2, 42, "#1b1424"); px(-13, -L - W - 6, 26, 2, "#1b1424");
    // púas de hierro hacia dentro, a todo lo largo (salvo bajo la ventana)
    for (let x = -L + 4; x < L - 8; x += 12) {
      if (Math.abs(x + 4) < 20) continue;
      for (let k = 0; k < 10; k++) { const w = Math.max(1, 8 - k * 0.8); px(x + 4 - w / 2, -L + k, w, 1, k < 2 ? "#3c3f4c" : k % 3 ? "#a7adbd" : "#d6dae6"); }
      px(x + 4, -L + 9, 1, 2, "#eef1f8");
    }
    // antorcha en el rincón, con su llama
    const tx = L - 30, ty = -L + 26;
    px(tx - 2, ty, 4, 12, "#2a1a10"); px(tx - 5, ty - 2, 10, 3, "#4a3220");
    [["#ffe08a", 2, 4], ["#ffb347", 4, 7], ["#e2581e", 6, 10], ["#8a1a12", 4, 12]].reverse().forEach(([c, w, h]) => px(tx - w / 2, ty - 2 - h, w, h, c));
    // cadena del rincón hacia el centro
    for (let k = 0; k < 9; k++) { const u = 30 + k * 13; px(-u * 0.7 - 2, -u * 0.7 - 3, 5, 6, k % 2 ? "#3b3442" : "#57505f"); px(-u * 0.7 - 1, -u * 0.7 - 2, 3, 4, "#14101b"); }
    g.restore();
  }
  // la placa del techo donde se clava el anillo del látigo
  for (let r = 16; r > 0; r--) { g.fillStyle = r > 13 ? "#14101b" : r > 11 ? "#5a5062" : "#2e2836"; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.fill(); }
  [[0, -10], [10, 0], [0, 10], [-10, 0]].forEach(([x, y]) => px(C + x - 1, C + y - 1, 3, 3, "#8e8496"));
  return tex;
}
function modo7() {
  const pantalla = $("[data-m7-room]"), anillo = $(".belmont-mode7__ring"), cuelga = $("[data-m7-hang]");
  if (!pantalla) return;
  const ctx = pantalla.getContext("2d");
  let tex = null, ladrillo = null;
  const pintar = () => {
    const PX = innerWidth < 700 ? 2 : 3; // tamaño del píxel de la «consola»
    const w = Math.max(1, Math.round(pantalla.clientWidth / PX)), h = Math.max(1, Math.round(pantalla.clientHeight / PX));
    if (pantalla.width !== w || pantalla.height !== h) { pantalla.width = w; pantalla.height = h; }
    if (!tex) { tex = texturaSala(); const tt = document.createElement("canvas"); tt.width = 32; tt.height = 16; tt.getContext("2d").drawImage(tex, 0, 0, 32, 16, 0, 0, 32, 16); ladrillo = ctx.createPattern(tt, "repeat"); }
    // el pivote es el anillo (o donde estará cuando aparezca)
    const rp = pantalla.getBoundingClientRect(), ra = anillo.getBoundingClientRect(), rc = cuelga.getBoundingClientRect();
    const cx = ((ra.width ? ra.left + ra.width / 2 : rc.left) - rp.left) / PX, cy = ((ra.height ? ra.top + ra.height / 2 : rc.top) - rp.top) / PX;
    const recto = Math.round(sala7.base / 360) * 360; // en la prueba la sala arranca derecha
    const ang = (sala7.base + (recto - sala7.base) * sala7.juego + sala7.giro) * Math.PI / 180;
    const k = sala7.escala * (h / 330); // a escala 1 el muro de la cámara queda a ~0,6 pantallas del anillo: se ve la sala entera girar
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#07050a"; ctx.fillRect(0, 0, w, h);
    ctx.setTransform(Math.cos(ang) * k, Math.sin(ang) * k, -Math.sin(ang) * k, Math.cos(ang) * k, cx, cy);
    ctx.fillStyle = ladrillo; ctx.fillRect(-1600, -1600, 3200, 3200);
    ctx.drawImage(tex, -256, -256);
  };
  sala7.pintar = pintar;
  mov.añadir(({ reducido }) => {
    const rot = $("[data-rot]"), esc = $("[data-scale]"), lin = $("[data-line]");
    let visible = false;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-mode7-pin]", start: "top top", end: "+=220%", pin: true, scrub: true, invalidateOnRefresh: true,
        onToggle: (s) => { visible = s.isActive; if (visible) pintar(); },
        onUpdate: (s) => {
          const p = s.progress;
          if (!reducido) { sala7.base = p * 540; sala7.escala = 1 + Math.sin(p * Math.PI) * 0.45; }
          rot.textContent = pad(((sala7.base % 360) + 360) % 360, 3);
          esc.textContent = sala7.escala.toFixed(2);
          lin.textContent = pad(p * 224, 3); // 224 líneas visibles en NTSC
        },
      },
    });
    tl.from(".belmont-mode7__card", { y: 24, opacity: 0, duration: 0.12, ease: "power2.out" }, 0.02); // la tarjeta, quieta: gira la sala, no lo que se lee
    pintar();
    if (reducido) return () => {};
    const paso = () => { if (visible) pintar(); };
    gsap.ticker.add(paso);
    window.addEventListener("resize", pintar);
    return () => { gsap.ticker.remove(paso); window.removeEventListener("resize", pintar); };
  });
}

/* ── 8 · Arsenal: equipa al cazador arrastrando cada arma; al equiparla se ve su efecto
   en el campo de pruebas y se explica cómo funciona por dentro ── */
const ARMAS = {
  daga: { nombre: "Daga", formula: "x = x₀ + v·t", texto: "Movimiento rectilíneo: cada fotograma suma la misma velocidad horizontal y la altura no cambia. Por eso es rápida y predecible: acierta a lo que tienes delante, a la altura de la mano, y a nada más." },
  hacha: { nombre: "Hacha", formula: "y = y₀ − v·t + ½·g·t²", texto: "Tiro parabólico: sale con velocidad hacia arriba y la gravedad se la va restando fotograma a fotograma, hasta que cae. Alcanza lo que vuela o acecha en lo alto, y pasa por encima de lo que está a ras de suelo cerca." },
  agua: { nombre: "Agua bendita", formula: "golpe → zona de fuego", texto: "Un arco corto hasta el suelo. Al romperse, el proyectil desaparece y deja en su lugar una zona de llamas que dura unos instantes: el daño no está en el frasco sino en el fuego, y quema a todo lo que lo pisa." },
  cruz: { nombre: "Cruz", formula: "v = v₀ − a·t", texto: "Bumerán: sale hacia delante y una aceleración en contra la va frenando hasta que cambia de sentido y vuelve a la mano. Golpea dos veces, a la ida y a la vuelta, y atraviesa a los enemigos." },
  reloj: { nombre: "Cronómetro", formula: "update(enemigos) → pausa", texto: "No es un proyectil: mientras dura, el juego deja de actualizar a casi todos los enemigos fotograma a fotograma, pero Simon sigue moviéndose. Es el arma más cara: gasta más corazones que las demás." },
};
function arsenal() {
  const rack = $("[data-arsenal-rack]"), campo = $("[data-range]"), diana = $(".belmont-arsenal__drop", campo) /* ojo: las velas también llevan data-drop */, heroe = $("[data-arsenal-hero]");
  if (!rack || !campo) return;
  const fx = $("[data-fx]", campo), trazas = $("[data-traces]", campo), log = $("[data-arsenal-log]");
  // enemigos a tinta, con la mano del cuaderno: el hombre lobo cerca, el vampiro al fondo, el murciélago en lo alto
  const foes = {};
  $$("[data-foe]", campo).forEach((f) => { f.innerHTML = ENEMIGOS[f.dataset.foe](); foes[f.dataset.foe] = f; });
  const lobo = foes.lobo, vampiro = foes.vampiro, murcielago = foes.murcielago;
  const botones = $$("[data-weapon]", rack);
  const p = prueba("arsenal", {
    activar: { trigger: ".belmont-arsenal__body", start: "top 30%" }, enLinea: true, aviso: ["ARRASTRA LAS ARMAS AL CAZADOR", "ARRASTRA LAS ARMAS AL CAZADOR"],
    alinear: () => $(".belmont-hud").offsetHeight + 12,
    foco: "[data-weapon]",
    accion: () => { const b = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-weapon]"); if (b) equipar(b); },
  });
  $("[data-trial-act]", p.caja).addEventListener("click", () => { const b = botones.find((x) => !x.classList.contains("is-equipped")); if (b) equipar(b); });
  // los enemigos se dibujan al llegar y viven: el lobo respira agazapado, el vampiro se mece, el murciélago revolotea
  let vida = [];
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const trazos = $$(".belmont-plate__s, .belmont-plate__h", campo), tintas = $$(".belmont-plate__f, .belmont-plate__t", campo);
    gsap.set(trazos, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(tintas, { autoAlpha: 0 });
    const dibujo = gsap.timeline({ paused: true })
      .to(trazos, { strokeDashoffset: 0, duration: 0.6, ease: "none", stagger: { amount: 1.6 } }, 0)
      .to(tintas, { autoAlpha: 1, duration: 0.4, stagger: 0.03 }, 1.2); // los ojos y las fauces se llenan al final
    const st = ScrollTrigger.create({ trigger: campo, start: "top 85%", once: true, onEnter: () => dibujo.play() });
    vida = [
      gsap.to(lobo, { scaleY: 0.96, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }),
      gsap.to(vampiro, { rotation: 2, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }),
      gsap.to(murcielago, { y: 12, x: -16, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }),
    ];
    return () => { st.kill(); dibujo.kill(); vida.forEach((t) => t.kill()); };
  });
  const centro = (el, c, fy = 0.45) => { const r = el.getBoundingClientRect(); return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height * fy }; };
  const medir = () => {
    const c = campo.getBoundingClientRect(), h = heroe.getBoundingClientRect();
    trazas.setAttribute("viewBox", `0 0 ${c.width} ${c.height}`);
    return { W: c.width, H: c.height, mano: { x: h.right - c.left, y: h.top - c.top + h.height * 0.45 }, suelo: h.bottom - c.top,
      lobo: centro(lobo, c), vamp: centro(vampiro, c, 0.4), mur: centro(murcielago, c, 0.5) };
  };
  const golpe = (el) => gsap.timeline().fromTo(el, { filter: "brightness(2.4) sepia(1) saturate(4) hue-rotate(-30deg)" }, { filter: "none", duration: 0.5, clearProps: "filter" }).fromTo(el, { x: 0 }, { x: 8, duration: 0.06, yoyo: true, repeat: 3 }, 0);
  const pieza = (svg, cls) => { const s = document.createElement("span"); s.className = "belmont-arsenal__shot " + cls; s.innerHTML = svg; fx.append(s); gsap.set(s, { xPercent: -50, yPercent: -50 }); return s; };
  const ICONO = (k) => $(`[data-weapon="${k}"] .belmont-weapon__icon svg`, rack).outerHTML;
  // la traza: cada lanzamiento deja su trayectoria dibujada a tinta, con su fórmula al lado
  const NS = "http://www.w3.org/2000/svg";
  const trazar = (puntos, formula) => {
    if (puntos.length < 2) return;
    [...trazas.children].forEach((e) => e.classList.add("is-old"));
    const d = "M" + puntos.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" L");
    const path = document.createElementNS(NS, "path"); path.setAttribute("d", d); trazas.append(path);
    let alto = puntos.reduce((a, q) => (q.y < a.y ? q : a), puntos[0]);
    if (puntos[0].y - alto.y < 8) alto = puntos[Math.floor(puntos.length * 0.5)]; // tiro recto: el rótulo, a media trayectoria y no sobre la cabeza
    const txt = document.createElementNS(NS, "text"); const anchoT = trazas.getBoundingClientRect().width || 600; txt.setAttribute("x", gsap.utils.clamp(70, anchoT - 70, alto.x)); txt.setAttribute("y", Math.max(14, alto.y - 10)); txt.textContent = formula; trazas.append(txt);
    const l = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: `${l} ${l}`, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 0.6, ease: "none", onComplete: () => path.style.strokeDasharray = "3 6" });
  };
  const seguir = (s, pts) => () => pts.push({ x: gsap.getProperty(s, "x"), y: gsap.getProperty(s, "y") });
  const efectos = {
    daga(g, pts) {
      const s = pieza(ICONO("daga"), "is-daga");
      return gsap.timeline({ onComplete: () => s.remove() })
        .fromTo(s, { x: g.mano.x, y: g.mano.y, rotation: 90 }, { x: g.lobo.x, duration: 0.45, ease: "none", onUpdate: seguir(s, pts) })
        .add(() => golpe(lobo)).to(s, { opacity: 0, duration: 0.15 });
    },
    hacha(g, pts) {
      const s = pieza(ICONO("hacha"), "is-hacha"), e = { t: 0 };
      // y(t) = y0 − vy·t + ½·g·t²: con la gravedad fijada, vy sale de pasar por el murciélago en t = T
      const T = 0.9, x0 = g.mano.x, y0 = g.mano.y, x1 = g.mur.x, y1 = g.mur.y;
      const vx = (x1 - x0) / T, gr = (2.2 * g.H) / (T * T), vy = (y0 - y1 + 0.5 * gr * T * T) / T;
      return gsap.timeline({ onComplete: () => s.remove() })
        .to(e, { t: T * 1.25, duration: 1.25, ease: "none", onUpdate: () => { gsap.set(s, { x: x0 + vx * e.t, y: y0 - vy * e.t + 0.5 * gr * e.t * e.t, rotation: e.t * 900 }); pts.push({ x: x0 + vx * e.t, y: y0 - vy * e.t + 0.5 * gr * e.t * e.t }); } })
        .add(() => golpe(murcielago), T)
        .to(s, { opacity: 0, duration: 0.2 }, ">-0.2");
    },
    agua(g, pts) {
      const s = pieza(ICONO("agua"), "is-agua"), e = { t: 0 }, xImp = g.vamp.x - 30;
      const llamas = Array.from({ length: 5 }, (_, i) => { const f = document.createElement("span"); f.className = "belmont-arsenal__flame"; fx.append(f); gsap.set(f, { x: xImp + (i - 2) * 16, y: g.suelo, xPercent: -50, yPercent: -100, scaleY: 0 }); return f; });
      return gsap.timeline({ onComplete: () => { s.remove(); llamas.forEach((f) => f.remove()); } })
        .to(e, { t: 1, duration: 0.7, ease: "none", onUpdate: () => { const x = g.mano.x + (xImp - g.mano.x) * e.t, y = g.mano.y - Math.sin(e.t * Math.PI) * g.H * 0.25 + (g.suelo - g.mano.y) * e.t * e.t; gsap.set(s, { x, y, rotation: e.t * 300 }); pts.push({ x, y }); } })
        .set(s, { opacity: 0 })
        .to(llamas, { scaleY: 1, duration: 0.2, stagger: 0.05, ease: "back.out(3)" })
        .to(llamas, { scaleY: 0.6, duration: 0.12, yoyo: true, repeat: 7, stagger: 0.04, ease: "sine.inOut" })
        .add(() => golpe(vampiro), "<0.2")
        .to(llamas, { scaleY: 0, opacity: 0, duration: 0.3 });
    },
    cruz(g, pts) {
      const s = pieza(ICONO("cruz"), "is-cruz"), e = { t: 0 }, alcance = g.vamp.x + 40 - g.mano.x;
      // x(t) = x0 + v0·t − ½·a·t²: vuelve a la mano en t = 2·v0/a
      const T = 1.8, v0 = (4 * alcance) / T, a = (2 * v0) / T; // llega al alcance en T/2 y vuelve
      const toques = new Set();
      return gsap.timeline({ onComplete: () => s.remove() })
        .to(e, { t: T, duration: T, ease: "none", onUpdate: () => {
          const x = g.mano.x + v0 * e.t - 0.5 * a * e.t * e.t;
          gsap.set(s, { x, y: g.mano.y, rotation: e.t * 1080 }); pts.push({ x, y: g.mano.y });
          const ida = e.t < T / 2;
          [["lobo", g.lobo.x, lobo], ["vamp", g.vamp.x, vampiro]].forEach(([k, fxp, el]) => { const clave = k + (ida ? "i" : "v"); if (!toques.has(clave) && (ida ? x >= fxp : x <= fxp)) { toques.add(clave); golpe(el); } });
        } })
        .to(s, { scale: 0.4, opacity: 0, duration: 0.15 });
    },
    reloj(g) {
      const s = pieza(ICONO("reloj"), "is-reloj");
      gsap.set(s, { x: g.mano.x - 10, y: g.mano.y - 60 });
      return gsap.timeline({ onStart: () => { vida.forEach((t) => t.pause()); campo.classList.add("is-frozen"); }, onComplete: () => { vida.forEach((t) => t.resume()); campo.classList.remove("is-frozen"); s.remove(); } })
        .fromTo(s, { scale: 0, rotation: -30 }, { scale: 1.4, rotation: 0, duration: 0.35, ease: "back.out(2)" })
        .to(s, { rotation: 12, duration: 0.25, yoyo: true, repeat: 7, ease: "steps(1)" })
        .to(s, { scale: 0, opacity: 0, duration: 0.25 });
    },
  };
  // la ficha de cada arma se añade al equiparla: arriba la última, las anteriores quedan debajo
  const ficha = (k) => {
    const a = ARMAS[k], li = document.createElement("li");
    li.className = "belmont-arsenal__entry is-new";
    li.innerHTML = `<span class="belmont-arsenal__entryicon">${ICONO(k)}</span><div><p class="belmont-arsenal__infohead"><span>${a.nombre}</span> <span class="belmont-arsenal__formula">${a.formula}</span></p><p class="belmont-arsenal__infotext">${a.texto}</p></div>`;
    const intro = $(".belmont-arsenal__intro", log); if (intro) intro.remove();
    $$(".belmont-arsenal__entry", log).forEach((e) => e.classList.remove("is-new"));
    log.prepend(li);
    if (!mov.reducido) gsap.from(li, { height: 0, opacity: 0, y: -12, duration: 0.5, ease: "power2.out", clearProps: "height" });
  };
  let enCurso = null;
  // como al recoger un arma en el juego: sale del arsenal y vuela en arco hasta el marco de arma secundaria del HUD
  const marcoSub = $("[data-hud-sub]");
  const alHud = (b, k) => {
    const svg = $(".belmont-weapon__icon svg", b);
    if (!marcoSub || !svg) return;
    const poner = () => { marcoSub.innerHTML = svg.outerHTML; marcoSub.dataset.arma = k; };
    if (mov.reducido) { poner(); return; }
    const de = $(".belmont-weapon__icon", b).getBoundingClientRect(), a = marcoSub.getBoundingClientRect();
    const vuela = document.createElement("span");
    vuela.className = "belmont-hud__vuela"; vuela.setAttribute("aria-hidden", "true"); vuela.innerHTML = svg.outerHTML;
    document.body.append(vuela);
    const lado = Math.min(de.width, de.height) * 0.55, fin = a.height * 0.8;
    const x0 = de.left + de.width / 2, y0 = de.top + de.height / 2, x1 = a.left + a.width / 2, y1 = a.top + a.height / 2;
    gsap.set(vuela, { width: lado, height: lado, xPercent: -50, yPercent: -50, x: x0, y: y0 });
    gsap.timeline({ delay: k === "reloj" ? 0.3 : 0.8, onComplete: () => vuela.remove() })
      .to(vuela, { scale: 1.35, duration: 0.18, ease: "power2.out" })                                           // se suelta del arsenal
      .to(vuela, { motionPath: { path: [{ x: x0, y: y0 }, { x: (x0 + x1) / 2, y: Math.min(y0, y1) - innerHeight * 0.18 }, { x: x1, y: y1 }], curviness: 1.25 },
        scale: fin / lado, rotation: 360, duration: 0.85, ease: "power2.in" })                                  // arco y giro, acelerando hacia el HUD
      .add(() => { poner(); gsap.fromTo(marcoSub, { scale: 1.5, boxShadow: "0 0 18px var(--belmont-wax)" }, { scale: 1, boxShadow: "0 0 0px transparent", duration: 0.45, ease: "back.out(3)" }); });
  };
  const equipar = (b) => {
    if (p.hecha && b.classList.contains("is-equipped")) return;
    const k = b.dataset.weapon;
    campo.dataset.arma = k;
    if (!mov.reducido) {
      if (enCurso) enCurso.progress(1);
      // el cazador lanza (o celebra con el cronómetro, que no se arroja)
      // y, al ver el efecto, lo celebra: brazos arriba (dos veces con la última arma, la prueba entera)
      const ultima = !b.classList.contains("is-equipped") && botones.filter((x) => x.classList.contains("is-equipped")).length === botones.length - 1;
      const fiesta = ultima ? [{ nombre: "Cheer", velocidad: 1.1 }, { nombre: "Cheer", velocidad: 1.2 }] : [{ nombre: "Cheer", velocidad: 1.15 }];
      const slot = $("[data-icon3d]", heroe);
      // para celebrar se vuelve hacia quien mira y luego retoma su guardia hacia los enemigos
      if (slot) { gsap.delayedCall(k === "reloj" ? 0 : 0.7, () => (slot.dataset.facing = "0")); gsap.delayedCall(ultima ? 3.6 : 2.4, () => (slot.dataset.facing = "1")); }
      if (slot) slot.__accion = k === "reloj" ? { nombre: "Cheer", t: performance.now(), velocidad: 1.2, luego: fiesta.slice(1) } : { nombre: "Throw", t: performance.now(), velocidad: 1.4, luego: fiesta };
      const pts = [];
      enCurso = efectos[k](medir(), pts);
      if (k !== "reloj") enCurso.eventCallback("onComplete", ((fin) => () => { fin && fin(); trazar(pts, ARMAS[k].formula); })(enCurso.eventCallback("onComplete")));
    }
    if (!b.classList.contains("is-equipped")) {
      b.classList.add("is-equipped"); ficha(k); hud.puntos(200); p.sumar();
      alHud(b, k);
      if (!mov.reducido) { // la enhorabuena, encima del cazador, cuando ya ha lanzado
        const viva = document.createElement("span");
        viva.className = "belmont-arsenal__viva"; viva.setAttribute("aria-hidden", "true");
        viva.textContent = botones.every((x) => x.classList.contains("is-equipped")) ? "¡ARSENAL COMPLETO!" : "¡" + ARMAS[k].nombre.toUpperCase() + "!";
        diana.append(viva);
        gsap.timeline({ delay: k === "reloj" ? 0.2 : 0.75, onComplete: () => viva.remove() })
          .fromTo(viva, { autoAlpha: 0, xPercent: -50, y: 10, scale: 0.6 }, { autoAlpha: 1, xPercent: -50, y: -6, scale: 1, duration: 0.35, ease: "back.out(3)" })
          .to(viva, { autoAlpha: 0, y: -28, duration: 0.5, ease: "power1.in" }, "+=0.9");
      }
    }
  };
  // arrastrar y soltar con puntero (ratón y táctil); Intro o Espacio equipan sin arrastrar
  botones.forEach((b) => {
    b.addEventListener("click", (e) => { if (b.dataset.arrastrada) { delete b.dataset.arrastrada; return; } if (e.detail === 0) equipar(b); }); // teclado (el puntero lo resuelve al soltar)
    b.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = b.getBoundingClientRect(), fantasma = document.createElement("span");
      fantasma.className = "belmont-arsenal__ghost"; fantasma.innerHTML = $(".belmont-weapon__icon svg", b).outerHTML;
      document.body.append(fantasma);
      const sx = e.clientX, sy = e.clientY;
      gsap.set(fantasma, { x: e.clientX, y: e.clientY, xPercent: -50, yPercent: -50 });
      let movido = false;
      const mover = (ev) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) movido = true;
        gsap.set(fantasma, { x: ev.clientX, y: ev.clientY });
        const d = diana.getBoundingClientRect();
        diana.classList.toggle("is-over", ev.clientX > d.left - 30 && ev.clientX < d.right + 30 && ev.clientY > d.top - 30 && ev.clientY < d.bottom + 30);
      };
      const soltar = (ev) => {
        window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); window.removeEventListener("pointercancel", soltar);
        const dentro = diana.classList.contains("is-over");
        diana.classList.remove("is-over"); campo.classList.remove("is-dragging");
        b.dataset.arrastrada = "1";
        if (dentro) { gsap.to(fantasma, { scale: 0, duration: 0.2, onComplete: () => fantasma.remove() }); equipar(b); }
        else if (!movido) { fantasma.remove(); equipar(b); }
        else gsap.to(fantasma, { x: r.left + r.width / 2, y: r.top + r.height / 2, opacity: 0, duration: 0.35, ease: "power2.in", onComplete: () => fantasma.remove() });
        void ev;
      };
      campo.classList.add("is-dragging");
      window.addEventListener("pointermove", mover); window.addEventListener("pointerup", soltar); window.addEventListener("pointercancel", soltar);
    });
  });
  window.__arsenal = { equipar, botones }; // pruebas automáticas
}

/* ── Látigo apuntable: 8 direcciones, clic o Intro para azotar ── */
function latigoJugable() {
  let golpe = null;
  const rosa = $("[data-rose]"), aim = $("[data-whip-aim]"), lash = $("[data-whip-lash]");
  const rayos = $$("[data-ray]"), dirTxt = $("[data-whip-dir]"), golpes = $("[data-whip-hits]"), golpesTxt = $("[data-whip-hits-label]");
  const NOMBRES = ["E", "SE", "S", "SO", "O", "NO", "N", "NE"]; // índice = ángulo/45 desde el este, en sentido horario
  let idx = 0, hits = 0;
  const apuntar = (i, inmediato) => {
    idx = (i + 8) % 8;
    dirTxt.textContent = NOMBRES[idx]; rosa.dataset.aim = idx;
    gsap.to(aim, { rotation: idx * 45, svgOrigin: "0 0", duration: inmediato || mov.reducido ? 0 : 0.18, ease: "power3.out", overwrite: true });
  };
  const azotar = () => {
    golpe && golpe(idx);
    hits++; golpes.textContent = hits; if (golpesTxt) golpesTxt.textContent = hits === 1 ? "GOLPE" : "GOLPES"; hud.puntos(100);
    const rayo = rayos[(idx + 2) % 8]; // los rayos empiezan en el norte
    if (mov.reducido) return;
    cuerda.restallar(() => { rayo.classList.add("is-hit"); gsap.delayedCall(0.6, () => rayo.classList.remove("is-hit")); });
  };
  /* El cuero como una cuerda de verlet (puntos con inercia unidos por tramos de longitud fija), en el
     marco del brazo que apunta: x hacia fuera. La mano tira atrás, la onda avanza tramo a tramo y la
     punta, que es lo más ligero, se acelera hasta restallar; luego rebota, se riza y vuelve al reposo. */
  const cuerda = (() => {
    const N = 22, REPOSO = lash.getAttribute("d"), punta = $("[data-whip-tip]");
    const bez = (t) => { const u = 1 - t; return [u * u * u * 12 + 3 * u * u * t * 34 + 3 * u * t * t * 58 + t * t * t * 92, 3 * u * u * t * -10 + 3 * u * t * t * 8]; };
    const base = Array.from({ length: N }, (_, i) => bez(i / (N - 1)));
    const largo = base.slice(1).map((q, i) => Math.hypot(q[0] - base[i][0], q[1] - base[i][1]) * 1.06); // un poco más largo que la curva: al tensarse, se estira más allá del reposo
    const P = base.map((q) => [q[0], q[1]]), Q = base.map((q) => [q[0], q[1]]);
    const NS = "http://www.w3.org/2000/svg";
    const chas = document.createElementNS(NS, "g"); chas.setAttribute("class", "belmont-rose__crack");
    chas.innerHTML = '<circle r="10"/>' + Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + 0.3; return `<line x1="${Math.cos(a) * 5}" y1="${Math.sin(a) * 5}" x2="${Math.cos(a) * 13}" y2="${Math.sin(a) * 13}"/>`; }).join("");
    aim.append(chas); gsap.set(chas, { autoAlpha: 0 });
    let t = -1, crac = false, alCrac = null;
    const L = largo.reduce((m, l) => m + l, 0) / 1.06 * 1.08; // tenso, el cuero llega algo más lejos que en reposo
    const ease = (n, x) => gsap.parseEase(n)(gsap.utils.clamp(0, 1, x));
    // la forma que persigue el cuero: un bucle que rueda desde la mano hasta la punta (así restalla un látigo de verdad)
    const doblado = (f, fr, x0, R) => {
      if (f <= fr) return [x0 + f * L, 0];
      const sArc = (f - fr) * L, xf = x0 + fr * L;
      if (sArc < Math.PI * R) { const th = sArc / R; return [xf + R * Math.sin(th), -(R - R * Math.cos(th))]; }
      return [xf - (sArc - Math.PI * R), -2 * R];
    };
    const objetivo = (i, t) => {
      const f = i / (N - 1), r = base[i];
      if (t < 0.09) { const w = ease("sine.inOut", t / 0.09), q = doblado(f, 0.35, 6, 10); return [r[0] + (q[0] - r[0]) * w, r[1] + (q[1] - r[1]) * w]; }   // carga: el cuero se recoge detrás
      if (t < 0.19) { const fr = 0.35 + 0.65 * ease("power2.in", (t - 0.09) / 0.1); return doblado(f, fr, 6 + 10 * ease("power3.out", (t - 0.09) / 0.06), 12 * (1 - fr) + 2); } // el bucle corre y se acelera
      if (t < 0.23) return [16 + f * L, 0];                                                                                                      // tenso: el restallido
      if (t < 0.36) { const w = ease("power2.out", (t - 0.23) / 0.13); return [16 - 4 * w + f * L * (1 - 0.22 * w), 11 * w * Math.sin(f * Math.PI * 2.2) * f]; } // rebote: la punta vuelve rizada
      const w = ease("power2.inOut", (t - 0.36) / 0.4), q = [12 + f * L * 0.78, 11 * Math.sin(f * Math.PI * 2.2) * f];
      return [q[0] + (r[0] - q[0]) * w, q[1] + (r[1] - q[1]) * w];                                                                              // y se asienta en su curva
    };
    const paso = (dt) => {
      t += dt;
      for (let i = 1; i < N; i++) {
        const f = i / (N - 1), p = P[i], q = Q[i], o = objetivo(i, t);
        const k = 5200 * (1 - 0.55 * f);                       // la punta, más ligera, va con retraso y se pasa de largo
        const roce = 0.955 + 0.035 * f;
        const vx = (p[0] - q[0]) * roce, vy = (p[1] - q[1]) * roce;
        q[0] = p[0]; q[1] = p[1];
        p[0] += vx + (o[0] - p[0]) * k * dt * dt; p[1] += vy + (o[1] - p[1]) * k * dt * dt;
      }
      const o0 = objetivo(0, t); P[0][0] = Q[0][0] = o0[0]; P[0][1] = Q[0][1] = o0[1];
      for (let it = 0; it < 8; it++) for (let i = 0; i < N - 1; i++) { // tramos que no se estiran (sí pueden combarse)
        const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, lim = (L / (N - 1)) * 1.02;
        if (d <= lim) continue;
        const e = (d - lim) / d;
        if (i === 0) { b[0] -= dx * e; b[1] -= dy * e; } else { a[0] += dx * e * 0.5; a[1] += dy * e * 0.5; b[0] -= dx * e * 0.5; b[1] -= dy * e * 0.5; }
      }
      if (!crac && t >= 0.195) { crac = true; const [x, y] = P[N - 1];
        gsap.fromTo(chas, { x, y, autoAlpha: 1, scale: 0.3, svgOrigin: "0 0" }, { scale: 1.7, autoAlpha: 0, duration: 0.34, ease: "power2.out" });
        alCrac && alCrac(); }
    };
    const pintar = () => {
      let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
      for (let i = 1; i < N - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; d += ` Q${P[i][0].toFixed(1)},${P[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`; }
      d += ` L${P[N - 1][0].toFixed(1)},${P[N - 1][1].toFixed(1)}`;
      lash.setAttribute("d", d); punta.setAttribute("cx", P[N - 1][0].toFixed(1)); punta.setAttribute("cy", P[N - 1][1].toFixed(1));
    };
    const tic = (_, ms) => {
      const dt = Math.min(0.05, ms / 1000), n = Math.ceil(dt / (1 / 480));
      for (let k = 0; k < n; k++) paso(dt / n);
      pintar();
      if (t > 0.85) { gsap.ticker.remove(tic); t = -1; lash.setAttribute("d", REPOSO); punta.setAttribute("cx", 92); punta.setAttribute("cy", 0); }
    };
    return {
      restallar(fn) {
        alCrac = fn; crac = false;
        if (t < 0) { base.forEach((q, i) => { P[i][0] = Q[i][0] = q[0]; P[i][1] = Q[i][1] = q[1]; }); gsap.ticker.add(tic); }
        t = 0; // un latigazo encima de otro: arranca de donde esté el cuero
        gsap.fromTo(punta, { attr: { r: 3 } }, { attr: { r: 6 }, duration: 0.12, yoyo: true, repeat: 1, delay: 0.14 });
      },
    };
  })();
  const apuntarA = (e) => {
    const r = rosa.getBoundingClientRect();
    const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    apuntar(Math.round(ang / (Math.PI / 4)), true);
  };
  rosa.addEventListener("pointerdown", apuntarA); // en táctil no hay puntero que se mueva antes del toque
  rosa.addEventListener("pointermove", (e) => {
    const r = rosa.getBoundingClientRect();
    const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    const i = Math.round(ang / (Math.PI / 4));
    if (((i + 8) % 8) !== idx) apuntar(i);
  });
  rosa.addEventListener("click", azotar);
  // flechas como una cruceta: cada flecha apunta a su lado y dos a la vez dan la diagonal (↑+→ = NE)
  const pulsadas = new Set();
  const VEC = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const cruceta = (e) => {
    if (!VEC[e.key]) return false;
    pulsadas.add(e.key);
    let x = 0, y = 0; pulsadas.forEach((k) => { x += VEC[k][0]; y += VEC[k][1]; });
    if (x || y) apuntar(Math.round(Math.atan2(y, x) / (Math.PI / 4)));
    return true;
  };
  window.addEventListener("keyup", (e) => pulsadas.delete(e.key));
  window.addEventListener("blur", () => pulsadas.clear());
  rosa.addEventListener("keydown", (e) => {
    if (cruceta(e)) e.preventDefault();
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); azotar(); }
  });
  apuntar(0, true);
  golpe = pruebaLatigo(azotar, cruceta);
}

/* ── Candelabro (fase 6): balanceo por scroll, capas de profundidad y velas que sueltan objetos ── */
const partida = { llave: false };
function candelabro() {
  pruebaCandelabro();
  const lampara = $("[data-chandelier]"), caidas = $("[data-drops]"), pin = $("[data-chandelier-pin]");
  const cuenta = $("[data-candles-count]"), aviso = $("[data-candles-msg]");
  let rotas = 0;
  const GLIFO = { "corazón": "♥", "corazón grande": "❤", "daga": "†", "llave": "⚿" };
  const VALOR = { "corazón": 1, "corazón grande": 5, "daga": 0, "llave": 0 };
  // como en el juego, las velas se rompen a latigazos: el cazador azota desde su repisa y el látigo
  // se estira hasta la vela (que sigue moviéndose con la lámpara); al chasquear, la vela se rompe
  const simonEl = $("[data-simon]");
  let latigo = null;
  const latigazo = (vela, alGolpe) => {
    const slot = simonEl && $("[data-icon3d]", simonEl);
    if (mov.reducido || !simonEl) { alGolpe(); return; }
    if (!latigo) {
      latigo = document.createElementNS("http://www.w3.org/2000/svg", "svg"); latigo.setAttribute("class", "belmont-whipfx"); latigo.setAttribute("aria-hidden", "true");
      latigo.innerHTML = '<path class="belmont-whipfx__cuero" pathLength="1"/><circle class="belmont-whipfx__chasquido" r="14"/>';
      document.body.append(latigo);
    }
    const cuero = latigo.querySelector("path"), chas = latigo.querySelector("circle");
    const mano = () => { const r = simonEl.getBoundingClientRect(); const izq = vela.getBoundingClientRect().left < r.left; return [r.left + r.width * (izq ? 0.3 : 0.7), r.top + r.height * 0.42, izq]; };
    const punta = () => { const r = vela.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.7]; };
    const [, , izq] = mano();
    if (slot) { slot.dataset.facing = izq ? "-1" : "1"; slot.__accion = { nombre: "1H_Melee_Attack_Chop", t: performance.now(), velocidad: 1.7 }; }
    const s = { k: 0 };
    const dibujar = () => {
      const [mx, my] = mano(), [px, py] = punta(), k = s.k;
      const ex = mx + (px - mx) * k, ey = my + (py - my) * k;
      // el cuero se comba al salir y se tensa al llegar
      const cx = (mx + ex) / 2, cy = (my + ey) / 2 - (1 - k) * 60 + Math.abs(ex - mx) * 0.08 * (1 - k);
      cuero.setAttribute("d", `M${mx.toFixed(1)} ${my.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
      chas.setAttribute("cx", ex.toFixed(1)); chas.setAttribute("cy", ey.toFixed(1));
    };
    gsap.timeline({ onComplete: () => gsap.set(latigo, { autoAlpha: 0 }) })
      .set(latigo, { autoAlpha: 1 }).set(chas, { autoAlpha: 0, scale: 0.3, transformOrigin: "50% 50%" })
      .to(s, { k: 1, duration: 0.2, ease: "power3.in", onUpdate: dibujar }, 0.12)
      .add(() => { alGolpe(); hud.puntos(0); }, 0.32)
      .to(chas, { autoAlpha: 1, scale: 1.6, duration: 0.08, ease: "power2.out" }, 0.32)
      .to(chas, { autoAlpha: 0, scale: 2.4, duration: 0.25 }, 0.4)
      .to(s, { k: 0, duration: 0.24, ease: "power2.inOut", onUpdate: dibujar }, 0.52); // un instante tenso y vuelve a la mano
  };
  $$("[data-candle]").forEach((vela) => vela.addEventListener("click", () => {
    if (vela.classList.contains("is-broken") || vela.dataset.azotada) return;
    vela.dataset.azotada = "1";
    latigazo(vela, () => romper(vela));
  }));
  function romper(vela) {
    vela.classList.add("is-broken"); vela.disabled = true;
    rotas++; cuenta.textContent = rotas;
    const tipo = vela.dataset.drop;
    if (tipo === "llave") { partida.llave = true; aviso.textContent = "· ¡Una llave! Guárdala para el muro secreto."; }
    else if (rotas === 5 && !partida.llave) aviso.textContent = "";
    hud.corazones(VALOR[tipo]); hud.puntos(200);
    const c = caidas.getBoundingClientRect(), v = vela.getBoundingClientRect();
    const d = document.createElement("span");
    d.className = "belmont-drop"; d.textContent = GLIFO[tipo];
    d.style.left = v.left - c.left + "px"; d.style.top = v.top - c.top + "px";
    caidas.append(d);
    if (mov.reducido) { gsap.delayedCall(1.2, () => d.remove()); return; }
    gsap.timeline({ onComplete: () => d.remove() })
      .fromTo(vela, { scale: 1.8 }, { scale: 1, duration: 0.4, ease: "power2.out" }, 0)
      .to(d, { y: c.height * 0.86 - (v.top - c.top), rotation: gsap.utils.random(-60, 60), duration: 1.1, ease: "bounce.out" }, 0)
      .to(d, { scale: 1.6, opacity: 0, duration: 0.4, ease: "power2.in" }, "+=0.5");
  }

  // lámpara 3D de hierro forjado (si no hay WebGL queda la de SVG)
  let l3d = null;
  if (webgl()) cuandoCerca(pin, () => import("./candelabro3d.js").then(({ crearCandelabro }) => {
    l3d = crearCandelabro({ contenedor: lampara, velas: $$("[data-candle]"), reducido: mov.reducido });
    lampara.classList.add("is-3d");
    l3d.pintar(0);
    window.addEventListener("pagehide", () => l3d && l3d.salir(), { once: true });
  }).catch((err) => console.warn("belmont: candelabro 3D no disponible", err)));

  // el salón en 3D (muro, ventanales con la tormenta, columnas, cortinas): la cámara avanza con el pin
  let salon = null, progresoSalon = 0;
  if (webgl()) cuandoCerca(pin, () => import("./salon3d.js").then(({ crearSalon }) => {
    salon = crearSalon({ pin, reducido: mov.reducido, progreso: () => progresoSalon });
    pin.classList.add("is-3d");
    aLaVista({ trigger: "[data-chandelier-sec]", start: "top bottom", end: "bottom top" }, (t) => salon.pintar(t, true));
    window.addEventListener("pagehide", () => salon && salon.salir(), { once: true });
  }).catch((err) => console.warn("belmont: salón 3D no disponible", err)));

  mov.añadir(({ reducido }) => {
    if (reducido) return;
    let anguloScroll = 0, visible = false;
    const capas = $$("[data-depth-layer]", pin);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin, start: "top top", end: "+=220%", pin: true, scrub: true,
        onToggle: (s) => (visible = s.isActive),
        onUpdate: (s) => {
          const p = s.progress;
          progresoSalon = p;
          anguloScroll = Math.sin(p * Math.PI * 5) * 24 * (0.35 + 0.65 * Math.sin(p * Math.PI));
        },
      },
    });
    capas.forEach((capa) => {
      const k = Number(capa.dataset.depthLayer);
      tl.fromTo(capa, { yPercent: 6 * k, scale: 1 + k * 0.04 }, { yPercent: -10 * k, scale: 1 + k * 0.1, ease: "none" }, 0);
    });
    tl.fromTo(".belmont-chandelier-sec__card", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15 }, 0.05);
    const girar = gsap.quickSetter(lampara, "rotation", "deg");
    // polvo en suspensión dentro de los haces (canvas 2D, mismo reloj)
    const lienzo = $("[data-dust]", pin), ctx2 = lienzo.getContext("2d"), col = paleta();
    const motas = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, v: Math.random() * 0.02 + 0.005, f: Math.random() * 6.28 }));
    const medir = () => { lienzo.width = lienzo.clientWidth; lienzo.height = lienzo.clientHeight; };
    medir(); window.addEventListener("resize", medir);
    const paso = (t) => {
      if (!visible) return;
      // el estado del juego vive en «columpio» (aquí «lampara» es el elemento): antes se mezclaban y la aguja no se movía
      const juego = columpio.juego;
      columpio.angulo = anguloScroll * (juego ? 0.25 : 1) + Math.sin(t * (juego ? 1.8 : 1.7)) * (juego ? 20 + columpio.amp : 3);
      girar(columpio.angulo);
      if (l3d) l3d.pintar(t);
      const w = lienzo.width, h = lienzo.height;
      ctx2.clearRect(0, 0, w, h); ctx2.fillStyle = col.wax;
      for (const m of motas) {
        m.y -= m.v * 0.016; if (m.y < 0) m.y = 1;
        ctx2.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t + m.f));
        ctx2.beginPath(); ctx2.arc((m.x + Math.sin(t * 0.3 + m.f) * 0.01) * w, m.y * h, m.r, 0, 6.283); ctx2.fill();
      }
    };
    gsap.ticker.add(paso);
    return () => { gsap.ticker.remove(paso); window.removeEventListener("resize", medir); };
  });
}

/* ── Bosque (fase 2): tramo lateral con cinco planos de parallax ── */
let bosqueTL = null; // las pruebas del bosque se activan sobre esta pista (containerAnimation)
function bosque() {
  mov.añadir(({ reducido }) => {
    const pin = $("[data-forest-pin]"), track = $(".belmont-forest__track", pin);
    const capas = $$("[data-forest-layer]", pin).filter((c) => c !== track);
    // luciérnagas repartidas a lo largo del bosque
    const enjambre = $("[data-flies]", pin);
    if (!enjambre.children.length) for (let i = 0; i < 60; i++) {
      const f = document.createElement("span"); f.className = "belmont-fly";
      f.style.left = Math.random() * 100 + "%"; f.style.top = 35 + Math.random() * 55 + "%";
      enjambre.append(f);
    }
    if (reducido) return;
    const vuelos = $$(".belmont-fly", enjambre).map((f) => gsap.to(f, {
      x: () => gsap.utils.random(-60, 60), y: () => gsap.utils.random(-40, 40), opacity: () => gsap.utils.random(0.1, 1),
      duration: () => gsap.utils.random(1.5, 3.5), ease: "sine.inOut", repeat: -1, repeatRefresh: true, yoyo: true, paused: true,
    }));
    const distancia = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const anchos = () => capas.forEach((c) => (c.style.width = document.documentElement.clientWidth + distancia() * Number(c.dataset.forestLayer) + 200 + "px"));
    anchos();
    const tl = gsap.timeline({
      scrollTrigger: { trigger: pin, start: "top top", end: () => "+=" + distancia() * 1.2, pin: true, scrub: true, invalidateOnRefresh: true, onRefreshInit: anchos },
    });
    tl.to(track, { x: () => -distancia(), ease: "none" }, 0);
    capas.forEach((c) => tl.to(c, { x: () => -distancia() * Number(c.dataset.forestLayer), ease: "none" }, 0));
    bosqueTL = tl;
    // al soltar la rueda cerca de una tarjeta, la pista se asienta con ella centrada (lenis/snap es el dueño del ajuste, cmb-snap).
    // Posiciones calculadas desde el ScrollTrigger de la pista, nunca midiendo el elemento fijado (O19), y recalculadas en cada refresh
    let snap = null, quitarPuntos = [];
    if (globalThis.Snap && mov.lenis) {
      snap = new globalThis.Snap(mov.lenis, { type: "proximity", distanceThreshold: "28%", debounce: 240, duration: 0.8, easing: (x) => 1 - Math.pow(1 - x, 3) });
      const puntos = () => {
        quitarPuntos.forEach((q) => q()); quitarPuntos = [];
        const st = tl.scrollTrigger, vw = document.documentElement.clientWidth, d = distancia(), tr = track.getBoundingClientRect();
        if (!st) return;
        $$("[data-forest-game]", track).forEach((c) => {
          const r = c.getBoundingClientRect(), centro = r.left - tr.left + r.width / 2; // en coordenadas de la pista: no depende de cuánto se haya desplazado
          quitarPuntos.push(snap.add(Math.round(st.start + gsap.utils.clamp(0, d, centro - vw / 2) * 1.2)));
        });
      };
      ScrollTrigger.addEventListener("refresh", puntos);
      puntos();
      snap.__puntos = puntos;
    }
    // el bosque en 3D, con su tormenta (la cámara sigue el avance de la pista)
    if (webgl() && !pin.__bosque3d) {
      pin.__bosque3d = true;
      cuandoCerca(pin, () => import("./bosque3d.js").then(({ crearBosque }) => {
        const b3 = crearBosque({ pin, reducido, progreso: () => (bosqueTL ? bosqueTL.progress() : 0) });
        pin.classList.add("is-3d");
        aLaVista({ trigger: pin, start: "top bottom", end: () => "+=" + (innerHeight + distancia() * 1.2 + innerHeight) }, (t) => b3.pintar(t, true));
        // el trueno suena solo si se pide: un botón discreto en la esquina del bosque
        const boton = document.createElement("button");
        boton.type = "button"; boton.className = "belmont-forest__sound"; boton.setAttribute("aria-pressed", "false");
        boton.textContent = "Truenos: no";
        boton.addEventListener("click", () => { b3.sonido.activo = !b3.sonido.activo; boton.setAttribute("aria-pressed", String(b3.sonido.activo)); boton.textContent = "Truenos: " + (b3.sonido.activo ? "sí" : "no"); });
        pin.append(boton);
        window.addEventListener("pagehide", () => b3.salir(), { once: true });
      }).catch((err) => console.warn("belmont: bosque 3D no disponible", err)));
    }
    const st = ScrollTrigger.create({ trigger: pin, start: "top bottom", end: () => "+=" + (innerHeight + distancia() * 1.2 + innerHeight), onToggle: (s) => vuelos.forEach((b) => (s.isActive ? b.play() : b.pause())) });
    return () => { st.kill(); vuelos.forEach((b) => b.kill()); bosqueTL = null; if (snap) { ScrollTrigger.removeEventListener("refresh", snap.__puntos); snap.destroy(); } };
  });
}

/* ── Torre del reloj (fase A): el scroll hacia abajo sube la torre ── */
function reloj() {
  const pasos = $$("[data-steps] span");
  // la torre en 3D: lee cada pieza de la escena HTML (que sigue animando el scroll y el juego) y la pinta con volumen
  const pinTorre = $("[data-clock-pin]");
  let torre = null;
  if (webgl() && pinTorre) cuandoCerca(pinTorre, () => import("./torre3d.js").then(({ crearTorre }) => {
    torre = crearTorre({ pin: pinTorre, reducido: mov.reducido });
    pinTorre.classList.add("is-3d");
    aLaVista({ trigger: "[data-clock]", start: "top bottom", end: "bottom top" }, (t) => torre.pintar(t));
    window.addEventListener("pagehide", () => torre && torre.salir(), { once: true });
  }).catch((err) => console.warn("belmont: torre 3D no disponible", err)));
  // por la columna central: Simon trepa por delante de la esfera, entre las dos tarjetas
  pasos.forEach((p, i) => { p.style.left = (i % 2 ? 52 : 30) + ((i * 37) % 10) + "%"; p.style.top = 100 - i * 18 + "%"; });
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const alt = $("[data-alt]"), pendulo = $("[data-pendulum]");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-clock-pin]", start: "top top", end: "+=260%", pin: true, scrub: true,
        onUpdate: (s) => {
          alt.textContent = pad(s.progress * 120, 3);
          gsap.set(pendulo, { rotation: Math.sin(s.progress * Math.PI * 9) * 20 });
        },
      },
    });
    const velocidad = { far: 0.5, mid: 1, near: 1.6 };
    $$("[data-depth]", $("[data-clock-pin]")).forEach((capa) => {
      const v = velocidad[capa.dataset.depth];
      tl.fromTo(capa, { yPercent: -25 * v }, { yPercent: 25 * v, ease: "none" }, 0);
      $$("[data-gear]", capa).forEach((g) => tl.to(g, { rotation: Number(g.dataset.dir) * 720 * v * (24 / Number(g.dataset.teeth)), ease: "none" }, 0));
    });
    tl.fromTo("[data-steps]", { yPercent: -120 }, { yPercent: 160, ease: "none" }, 0)
      .to("[data-hand-m]", { rotation: 360 * 4, ease: "none" }, 0)
      .to("[data-hand-h]", { rotation: 120, ease: "none" }, 0)
      .fromTo("[data-clock-face]", { scale: 0.85 }, { scale: 1.15, ease: "none" }, 0)
      .from(".belmont-clock__card", { y: -60, opacity: 0, duration: 0.12 }, 0.03);
  });
}

/* ── Muro secreto: tres latigazos, premio y sala (bloqueo: lenis.stop vía mov.bloquear) ── */
function muro() {
  const muroEl = $("[data-wall]"), msg = $("[data-wall-msg]"), premio = $("[data-prize]"), dialogo = $("[data-secret]");
  let golpes = 0;
  const ladrillos = $$(".belmont-wall__brick", muroEl);
  muroEl.addEventListener("click", () => {
    if (golpes >= 3) return;
    golpes++; hud.puntos(150);
    if (!mov.reducido) gsap.fromTo(muroEl, { x: -8 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" });
    if (golpes === 1) { muroEl.classList.add("is-cracked"); msg.textContent = "Algo suena hueco…"; }
    if (golpes === 2) {
      msg.textContent = "Una más.";
      const algunos = ladrillos.filter((_, i) => i % 5 === 2);
      mov.reducido ? algunos.forEach((b) => (b.style.visibility = "hidden")) : gsap.to(algunos, { y: 220, rotation: () => gsap.utils.random(-90, 90), opacity: 0, duration: 0.8, ease: "power2.in", stagger: 0.03 });
    }
    if (golpes === 3) {
      msg.textContent = "¡Carne en la pared! Vida recuperada.";
      hud.vida();
      const fin = () => { muroEl.style.visibility = "hidden"; muroEl.parentElement.classList.add("is-broken"); /* la telaraña se va con el muro */ premio.hidden = false; $("[data-open-secret]").focus(); };
      if (mov.reducido) { fin(); return; }
      gsap.timeline({ onComplete: fin })
        .to(ladrillos, { y: () => gsap.utils.random(150, 420), x: () => gsap.utils.random(-120, 120), rotation: () => gsap.utils.random(-180, 180), opacity: 0, duration: 0.9, ease: "power2.in", stagger: { amount: 0.4, from: "center" } });
      gsap.from(premio, { scale: 0.3, opacity: 0, duration: 0.7, ease: "back.out(2)", delay: 0.8 });
    }
  });
  $("[data-open-secret]").addEventListener("click", () => {
    $("[data-secret-key]").hidden = !partida.llave;
    dialogo.showModal();
  });
  dialogo.addEventListener("toggle", (e) => {
    if (e.oldState === e.newState) return; // close() y showModal() seguidos funden dos eventos en uno
    e.newState === "open" ? mov.bloquear() : mov.desbloquear();
  });
}

/* ── Código de Konami: modo sangre ────────────────────────── */
function konami() {
  const codigo = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  window.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === codigo[pos] ? pos + 1 : k === codigo[0] ? 1 : 0;
    if (pos < codigo.length) return;
    pos = 0;
    const on = document.documentElement.classList.toggle("is-blood");
    hud.corazones(on ? 99 : 0, true);
    hud.aviso(on ? "MODO SANGRE · 99 ♥" : "MODO SANGRE DESACTIVADO");
  });
}

/* ── 9 · Ecualizador por velocidad + contadores ───────────── */
function musica() {
  mov.añadir(({ reducido }) => {
    const barras = $$("[data-eq] .belmont-eq__bar");
    if (reducido) { gsap.set(barras, { scaleY: (i) => 0.3 + ((i * 37) % 60) / 100 }); return; }
    const setters = barras.map((b) => gsap.quickTo(b, "scaleY", { duration: 0.25, ease: "power2.out" }));
    let visible = false;
    const st = ScrollTrigger.create({ trigger: "[data-eq]", start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });
    const paso = (t) => {
      if (!visible) return;
      const v = Math.min(1, Math.abs(hud.velocidad()) / 2600);
      setters.forEach((set, i) => set(0.06 + v * (0.35 + 0.65 * Math.abs(Math.sin(t * (3 + i * 0.7) + i)))));
    };
    gsap.ticker.add(paso);
    $$("[data-count]").forEach((el) => {
      const fin = Number(el.dataset.count);
      const n = { v: fin > 1000 ? 1900 : 0 };
      gsap.to(n, {
        v: fin, duration: 1.6, ease: "power2.out",
        onUpdate: () => (el.textContent = Math.round(n.v)), // el valor final ya está en el DOM (a11y de atom-stat)
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });
    return () => { gsap.ticker.remove(paso); st.kill(); };
  });
}

/* ── 10 · Final: el castillo se derrumba ──────────────────── */
function final() {
  const torre = $("[data-tower]");
  const cols = 9, filas = 22;
  torre.style.setProperty("--belmont-bricks", cols);
  const frag = document.createDocumentFragment();
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      const b = document.createElement("span");
      b.className = "belmont-finale__brick";
      if (f === 0 && c % 2 === 1) b.classList.add("is-gap");
      if (f > 3 && f < 18 && (c === 2 || c === 6) && f % 4 === 1) b.classList.add("is-lit");
      frag.append(b);
    }
  }
  torre.append(frag);
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const ladrillos = $$(".belmont-finale__brick", torre);
    const split = SplitText.create("[data-end]", { type: "chars", charsClass: "belmont-char" });
    const tl = gsap.timeline({ scrollTrigger: {
      trigger: "[data-finale-pin]", start: "top top", end: "+=160%", pin: true, scrub: true,
      onUpdate: (s) => escena && (escena.estado.final = s.progress),
    } });
    // el cazador ya está dentro: no se ve mientras el castillo está en pie (lo tapa), y aparece en el
    // centro de la plataforma en el instante del estallido, con el puño en alto, mientras se hace de día
    const cazador = $("[data-finale-hunter]"), slotCaz = cazador && $("[data-icon3d]", cazador), gloria = cazador && $(".belmont-finale__gloria", cazador);
    // fuera del pin: dentro, al soltarse el pin (que se queda con un transform) su position: fixed dejaría de ser la ventana
    if (cazador && cazador.parentElement !== document.body) document.body.append(cazador);
    let antes = 0, pinVisible = false;
    const stF = ScrollTrigger.create({ trigger: "[data-finale]", start: "top bottom", end: "bottom top", onToggle: (s) => (pinVisible = s.isActive) });
    const secFin = $("[data-finale]");
    const colocar = () => {
      if (!cazador || !escena || !escena.proyectar) return;
      const f = escena.estado.final;
      if (secFin) secFin.classList.toggle("is-dia", (escena.estado.dia || 0) > 0.4); // de día el texto pasa a tinta oscura
      // solo mientras el final ocupa la pantalla: al bajar al pie de página la cima se va y él con ella
      const [x, y] = escena.proyectar(escena.plataforma);
      // la cima es del lienzo fijo; el pie de página sube por encima: si ya le tapa los pies, se oculta con ella
      const pie = document.querySelector(".belmont-footer"), tapado = pie && pie.getBoundingClientRect().top < y;
      if (!pinVisible || f < 0.29 || tapado) { cazador.style.visibility = "hidden"; antes = f; return; }
      gsap.set(cazador, { x, y, xPercent: -50, yPercent: -100 });
      cazador.style.visibility = "visible";
      slotCaz.dataset.pose = "";
      if (antes < 0.29 && f >= 0.29) { // el estallido: el triunfo
        slotCaz.__accion = { nombre: "Cheer", t: performance.now(), velocidad: 1, luego: [{ nombre: "Cheer", velocidad: 1.1 }] };
        gsap.fromTo(gloria, { autoAlpha: 1, scale: 0.4 }, { autoAlpha: 0, scale: 3.2, duration: 1.1, ease: "power2.out" });
      }
      antes = f;
    };
    gsap.ticker.add(colocar);
    tl.to(torre, { x: "+=6", duration: 0.04, repeat: 5, yoyo: true, ease: "none" }, 0)
      .to(ladrillos, {
        y: () => window.innerHeight * gsap.utils.random(0.7, 1.4),
        x: () => gsap.utils.random(-260, 260),
        rotation: () => gsap.utils.random(-160, 160),
        opacity: 0, ease: "power2.in", duration: 0.5,
        stagger: { amount: 0.45, from: "random" },
      }, 0.15)
      .from(split.chars, { opacity: 0, yPercent: -140, rotate: () => gsap.utils.random(-40, 40), stagger: 0.04, duration: 0.25, ease: "bounce.out" }, 0.55)
      .from(".belmont-finale__line, .belmont-finale__actions", { opacity: 0, y: 30, duration: 0.2, stagger: 0.05 }, 0.8);
    return () => { split.revert(); gsap.ticker.remove(colocar); stF.kill(); };
  });
}



/* ── Ejes X, Y, Z: las tarjetas se inclinan hacia el puntero, los titulares caen en X
      y en el Modo 7 la sala entera da la vuelta en Z ── */
// La inclinación va en las propiedades CSS `rotate` y `translate`, no en `transform`: así se
// suma a lo que ya anima GSAP en esas mismas tarjetas (pistas laterales, entradas) sin pisarlo.
function ejes() {
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    // las tarjetas de información no se inclinan ni giran: se leen quietas (la profundidad la ponen las escenas)
    // titulares: suben un poco y aparecen (fuera de los pines: dentro de una escena fijada desaparecían al volver)
    $$(".belmont-h2").filter((h) => !h.closest("[data-chandelier-pin], [data-clock-pin], [data-mode7-pin], [data-forest-pin], [data-arsenal-pin], [data-finale-pin]")).forEach((h) => {
      gsap.fromTo(h, { y: 20, opacity: 0 }, {
        y: 0, opacity: 1, ease: "power2.out",
        scrollTrigger: { trigger: h, start: "top 95%", end: "top 62%", scrub: true },
      });
    });
  });
}

/* ── Pruebas: cada mecánica se juega; al superarla se abre la explicación siguiente ── */
// Lo sellado queda inert (no se enfoca ni se pulsa) y borroso; «Saltar prueba» lo abre siempre (accesibilidad).
const TACTIL = window.matchMedia("(pointer: coarse)").matches; // en táctil no se habla de teclas
function prueba(id, { alAbrir, activar, vigilar, reubicar, enPin = false, accion, teclas, foco, enLinea = false, alinear = null, aviso = null } = {}) {
  const caja = $(`[data-trial="${id}"]`);
  const total = Number(caja.dataset.trialTotal);
  const sellos = $$(`[data-sealed="${id}"]`);
  const meter = $("[data-trial-meter]", caja), estadoEl = $("[data-trial-state]", caja);
  sellos.forEach((s) => (s.inert = true));
  let n = 0, hecha = false;
  const pintar = () => {
    estadoEl.textContent = `${n}/${total}`;
    gsap.to(meter, { scaleX: n / total, duration: mov.reducido ? 0 : 0.35, ease: "power2.out", overwrite: true });
  };
  // Modo prueba: al llegar, el scroll se detiene y el panel queda fijo abajo (Espacio juega, Esc salta)
  let jugando = false, avisado = 0, hueco = null;
  const insistir = () => { const t = performance.now(); if (t - avisado > 2500) { avisado = t; hud.aviso(TACTIL ? "PRUEBA EN CURSO · O «SALTAR PRUEBA»" : "PRUEBA EN CURSO · ESC PARA SALTAR"); } };
  let gracia = 0; // tras ganar, el Espacio que aún se pulsa para jugar no debe lanzar la página hacia abajo
  const tecla = (e) => {
    if (!jugando) { if (performance.now() < gracia && (e.key === " " || e.key === "Enter")) e.preventDefault(); return; }
    if (e.key === "Escape") { e.preventDefault(); saltar(); return; }
    if (e.defaultPrevented) return; // ya lo atendió el propio juego (la rosa con foco)
    if (teclas && teclas(e)) { e.preventDefault(); return; }
    if (e.key === " " || e.key === "Enter") {
      if (e.target instanceof Element && e.target.closest("[data-trial-act], [data-trial-skip], a")) return; // el botón enfocado ya hace su clic
      if (accion) { e.preventDefault(); accion(); return; }
    }
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"].includes(e.key)) { e.preventDefault(); insistir(); }
  };
  const empezar = (st) => {
    if (hecha || jugando) return;
    // solo si la prueba está de verdad en pantalla: al recargar a media página, las de más arriba no se activan
    if (st) {
      const zona = st.trigger.getBoundingClientRect();
      if (zona.bottom < innerHeight * 0.2 || zona.top > innerHeight * 0.8 || Math.abs(st.getVelocity()) > 6000) return;
    } else if (Math.abs(hud.velocidad()) > 6000) return;
    jugando = true;
    mov.bloquear();
    // fuera de un pin, la inercia puede pasarse de largo: se coloca la zona de juego justo bajo el HUD
    if (st && alinear !== null && window.__belmont && window.__belmont.lenis) {
      const destino = scrollY + st.trigger.getBoundingClientRect().top - alinear();
      if (Math.abs(destino - scrollY) > 2) mov.irA(destino, { forzar: true, duracion: 0.35 }); // un encuadre corto de cámara, no un tirón (con el scroll ya bloqueado: forzar)
    }
    ScrollTrigger.update(); // bloquear corta la inercia de Lenis en el acto: la escena queda donde se activó
    if (!st && reubicar) { reubicar(); ScrollTrigger.update(); } // la pista lateral se pudo pasar un fotograma: se centra la tarjeta
    // el panel va al body mientras dura: dentro de una tarjeta con transform, position: fixed no se fija a la ventana
    if (enLinea) caja.classList.add("is-inline"); // su sitio ya está a la vista: no tapar lo que explica
    else {
      // su sitio en la tarjeta se queda ocupado (la tarjeta no da un salto) y dice adónde ha ido el panel
      hueco = document.createElement("div");
      hueco.className = "belmont-trial-hueco"; hueco.setAttribute("aria-hidden", "true");
      hueco.style.blockSize = caja.offsetHeight + "px";
      hueco.textContent = TACTIL ? "Prueba en curso · el panel está abajo" : "Prueba en curso · el panel está abajo a la derecha";
      caja.replaceWith(hueco); document.body.append(caja);
    }
    caja.classList.add("is-playing");
    document.documentElement.classList.add("is-trial");
    window.addEventListener("wheel", insistir, { passive: true });
    window.addEventListener("touchmove", insistir, { passive: true });
    const act = (foco && $(foco)) || $("[data-trial-act]", caja) || $("[data-trial-skip]", caja);
    act.focus({ preventScroll: true });
    hud.aviso("¡PRUEBA! · " + ((aviso && aviso[TACTIL ? 1 : 0]) || (TACTIL ? "TOCA EL BOTÓN PARA JUGAR" : "ESPACIO PARA JUGAR · ESC PARA SALTAR")));
  };
  const terminar = () => {
    if (!jugando) return;
    jugando = false;
    caja.classList.remove("is-playing");
    if (hueco) { hueco.replaceWith(caja); hueco = null; }
    document.documentElement.classList.remove("is-trial");
    window.removeEventListener("wheel", insistir);
    window.removeEventListener("touchmove", insistir);
    mov.desbloquear();
  };
  window.addEventListener("keydown", tecla);
  // vigilar: para escenas donde un disparador de scroll no sirve (la pista lateral del bosque), se mira cada fotograma
  if (vigilar) mov.añadir(() => {
    const f = () => { if (!hecha && !jugando && vigilar()) empezar(null); };
    gsap.ticker.add(f);
    return () => gsap.ticker.remove(f);
  });
  if (activar) mov.añadir(() => {
    const conf = typeof activar === "function" ? activar() : activar;
    if (!conf) return;
    const st = ScrollTrigger.create({ ...conf, onEnter: (self) => empezar(self) });
    return () => st.kill();
  });
  const abrir = (saltada) => {
    if (hecha) return;
    hecha = true;
    const estabaJugando = jugando;
    terminar();
    gracia = performance.now() + 1500;
    caja.classList.add("is-done");
    estadoEl.textContent = saltada ? "Prueba saltada · explicación abierta" : "¡Prueba superada! Explicación abierta";
    if (!saltada) { hud.puntos(1000); hud.aviso("PRUEBA SUPERADA · +1000"); }
    sellos.forEach((s) => { s.inert = false; s.classList.add("is-open"); });
    if (!mov.reducido) gsap.fromTo(sellos, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "power3.inOut", stagger: 0.15, clearProps: "clipPath" });
    alAbrir && alAbrir();
    const destino = sellos[0];
    destino.tabIndex = -1;
    destino.focus({ preventScroll: true }); // el foco pasa a lo que se acaba de abrir
    const r = destino.getBoundingClientRect();
    // fuera de un pin, el scroll trae la explicación; dentro de uno ya está en pantalla y se sigue bajando a mano
    if (!estabaJugando || !enPin) { if (r.top < 0 || r.bottom > innerHeight) gsap.delayedCall(0.6, () => mov.irA(destino, { desplazamiento: -innerHeight * 0.25, duracion: 1.4 })); }
    else hud.aviso("SIGUE BAJANDO");
  };
  const saltar = () => { n = total; pintar(); abrir(true); };
  $("[data-trial-skip]", caja).addEventListener("click", saltar);
  pintar();
  return {
    caja,
    get hecha() { return hecha; },
    sumar() { if (hecha) return; n = Math.min(total, n + 1); pintar(); if (n >= total) gsap.delayedCall(0.5, () => abrir(false)); },
    reiniciar() { if (hecha) return; n = 0; pintar(); },
    decir(texto) { if (!hecha) estadoEl.textContent = `${n}/${total} · ${texto}`; },
    // medidor de precisión: valor en −1…1 (0 = centro de la franja)
    aguja(v) { const a = $("[data-trial-needle]", caja); if (a) a.style.insetInlineStart = (50 + gsap.utils.clamp(-1, 1, v) * 50).toFixed(2) + "%"; caja.classList.toggle("is-hot", Math.abs(v) < 0.29); },
  };
}

const MURCIELAGO = '<svg viewBox="0 0 40 20" aria-hidden="true"><path d="M20 7c-2-3-5-4-8-2-3-3-8-3-12 1 4 0 6 2 7 5 2-2 5-2 7 0 1-2 3-3 6-3s5 1 6 3c2-2 5-2 7 0 1-3 3-5 7-5-4-4-9-4-12-1-3-2-6-1-8 2z"/><circle cx="18" cy="8" r="0.9" class="belmont-target__eye"/><circle cx="22" cy="8" r="0.9" class="belmont-target__eye"/></svg>';

/* Prueba 1 · el látigo: un murciélago aparece en una de las ocho direcciones; apunta y azota */
function pruebaLatigo(azotar, apuntar) { // apuntar: la cruceta (recibe el evento de teclado)
  const p = prueba("latigo", {
    activar: { trigger: "[data-rose]", start: "center 52%" },
    foco: "[data-rose]", aviso: ["FLECHAS APUNTAN · ESPACIO AZOTA", "TOCA CADA MURCIÉLAGO"], // la rosa enfocada ya apunta con flechas y azota con Intro o Espacio
    accion: () => azotar(),
    teclas: (e) => { if (e.target instanceof Element && e.target.closest("[data-rose]")) return false; return apuntar(e); }, // la cruceta, también sin foco en la rosa
    // superada: la rosa deja de pedir nada y la explicación se presenta como lo que es, lo aprendido
    alAbrir: () => { document.querySelector("[data-rose]").classList.add("is-mastered"); const l = document.getElementById("rose-dir"); if (l) l.textContent = "LÁTIGO DOMINADO · SIGUE BAJANDO"; },
  });
  const caja = $("[data-whip-targets]"), rosa = $("[data-rose]");
  let diana = null, cita = null, enVista = false;
  const soltar = () => {
    cita && cita.kill(); cita = null;
    if (!diana) return;
    const d = diana; diana = null;
    d.el.classList.add("is-gone");
    if (mov.reducido) { d.el.remove(); return; }
    gsap.to(d.el, { x: () => gsap.utils.random(-120, 120), y: -160, scale: 0.4, opacity: 0, duration: 0.6, ease: "power2.in", onComplete: () => d.el.remove() });
  };
  const nueva = () => {
    if (p.hecha || !enVista || diana) return;
    const actual = Number(rosa.dataset.aim || 0);
    let dir; do { dir = Math.floor(Math.random() * 8); } while (dir === actual);
    const a = (dir * Math.PI) / 4, el = document.createElement("span");
    el.className = "belmont-target"; el.innerHTML = MURCIELAGO;
    el.style.left = 50 + Math.cos(a) * 34 + "%"; el.style.top = 50 + Math.sin(a) * 34 + "%";
    caja.append(el);
    el.dataset.dir = dir; diana = { el, dir };
    if (!mov.reducido) {
      gsap.from(el, { scale: 0, rotation: gsap.utils.random(-40, 40), duration: 0.35, ease: "back.out(2.5)" });
      gsap.to(el, { y: "-=6", duration: 0.12, yoyo: true, repeat: -1, ease: "sine.inOut" }); // aleteo
    }
    cita = gsap.delayedCall(mov.reducido ? 9 : 6, // tiempo de sobra: el reto es apuntar, no los reflejos
      () => { p.decir("¡se escapó!"); soltar(); gsap.delayedCall(0.5, nueva); });
  };
  ScrollTrigger.create({ trigger: rosa, start: "top 75%", end: "bottom 15%", onToggle: (s) => { enVista = s.isActive; enVista ? gsap.delayedCall(0.4, nueva) : soltar(); } });
  // lo llama el látigo al azotar
  return (dir) => {
    if (!diana || p.hecha) return;
    if (diana.dir !== dir) { p.decir("fallo: se escapó, apunta hacia él"); soltar(); gsap.delayedCall(0.7, nueva); return; } // azotar a ciegas no vale
    const d = diana; diana = null; cita && cita.kill();
    d.el.classList.add("is-hit"); hud.puntos(300); p.sumar();
    gsap.killTweensOf(d.el);
    if (mov.reducido) d.el.remove();
    else gsap.timeline({ onComplete: () => d.el.remove() }).to(d.el, { scale: 1.8, rotation: 180, duration: 0.18, ease: "power2.out" }).to(d.el, { scale: 0, opacity: 0, duration: 0.25 });
    gsap.delayedCall(0.7, nueva);
  };
}

/* Prueba 2 · el candelabro: salta cuando pase por el centro; tres saltos abren las velas */
const columpio = { amp: 3, angulo: 0, juego: false };
const VENTANA = 10; // grados a cada lado del centro que cuentan como salto bueno
function pruebaCandelabro() {
  const velas = $$("[data-candle]");
  velas.forEach((v) => (v.disabled = true));
  const p = prueba("candelabro", {
    alAbrir: () => { columpio.juego = false; velas.forEach((v) => (v.disabled = false)); },
    activar: { trigger: "[data-chandelier-sec]", start: () => "top+=" + Math.round(innerHeight * 0.5) + " top" }, enPin: true,
    accion: () => boton.click(),
  });
  columpio.juego = true;
  window.__lamp = columpio; // pruebas automáticas
  const simon = $("[data-simon]"), boton = $("[data-trial-act]", p.caja), lamparaEl = $("[data-chandelier]");
  let ocupado = false;
  mov.añadir(() => {
    const paso = () => { if (!p.hecha) p.aguja(columpio.angulo / VENTANA * 0.29); };
    gsap.ticker.add(paso);
    return () => gsap.ticker.remove(paso);
  });
  boton.addEventListener("click", () => {
    if (ocupado || p.hecha) return;
    const acierto = Math.abs(columpio.angulo) < VENTANA;
    const s = simon.getBoundingClientRect(), l = lamparaEl.getBoundingClientRect();
    const dx = l.left + l.width * 0.5 - (s.left + s.width * 0.5), dy = l.top + l.height * 0.42 - (s.top + s.height * 0.5);
    if (mov.reducido) {
      if (acierto) { hud.puntos(250); p.sumar(); } else { p.decir("¡al vacío! espera a que pase por el centro"); hud.aviso("¡AL VACÍO!"); }
      return;
    }
    ocupado = true;
    const vuelta = () => gsap.fromTo(simon, { x: 0, y: -40, opacity: 0, rotation: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", onComplete: () => (ocupado = false) });
    const tl = gsap.timeline();
    tl.to(simon, { scaleY: 0.8, duration: 0.12, ease: "power2.in", transformOrigin: "50% 100%" })
      .to(simon, { scaleY: 1, x: dx, duration: 0.6, ease: "none" })
      .to(simon, { y: dy - 90, duration: 0.3, ease: "power2.out" }, "<")
      .to(simon, { y: dy, duration: 0.3, ease: "power2.in" }, ">");
    if (acierto) {
      tl.add(() => { hud.puntos(250); p.sumar(); columpio.amp += 4; gsap.fromTo(lamparaEl, { y: 0 }, { y: 14, duration: 0.12, yoyo: true, repeat: 1 }); })
        .to(simon, { opacity: 0, duration: 0.35, delay: 0.35 })
        .add(vuelta);
    } else {
      tl.add(() => { p.decir("¡al vacío! espera a que pase por el centro"); hud.aviso("¡AL VACÍO!"); })
        .to(simon, { y: innerHeight, rotation: 220, duration: 0.8, ease: "power2.in" })
        .add(vuelta);
    }
  });
}

/* Pruebas del bosque: cada tarjeta es la mecánica que cuenta. Se activan cuando la tarjeta llega al
   centro de la pista lateral; el cazador 3D juega dentro de la tarjeta (anda, salta, cae). */
/* El cazador del bosque es uno: al superar (o saltar) una prueba, salta de su tarjeta a la siguiente
   mientras la pista avanza, en un arco largo por encima del bosque; en la última, sale por la derecha. */
const BOSQUE = [];
let volador = null, volando = false; // mientras salta entre tarjetas no puede haber otro cazador a la vista
function polvo(pin, x, y, fuerte) { // nubecilla de tierra al despegar o al caer
  const el = document.createElement("span"); el.className = "belmont-forest__polvo"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = "<i></i><i></i><i></i><i></i>"; pin.append(el);
  gsap.set(el, { x, y, xPercent: -50, yPercent: -50 });
  const bolas = el.children;
  gsap.timeline({ onComplete: () => el.remove() })
    .fromTo(bolas, { x: 0, y: 0, scale: 0.3, autoAlpha: 0.75 }, { x: (k) => [-1, -0.45, 0.45, 1][k] * (fuerte ? 46 : 30), y: (k) => -(k % 2 ? 10 : 4), scale: (k) => (fuerte ? 1.5 : 1.1) - (k % 2) * 0.3, autoAlpha: 0, duration: 0.6, ease: "power2.out" });
}
function saltarASiguiente(carta) {
  const i = BOSQUE.findIndex((b) => b.carta === carta);
  if (i < 0) return;
  const de = BOSQUE[i], a = BOSQUE[i + 1] || null, pin = $("[data-forest-pin]");
  if (!volador || !pin || mov.reducido) { de.heroe.style.visibility = "hidden"; if (a) a.heroe.style.visibility = ""; return; }
  const fig = $("[data-icon3d]", volador), slotDe = $("[data-icon3d]", de.heroe);
  if (slotDe) slotDe.__accion = { nombre: "Cheer", t: performance.now(), velocidad: 1.3 }; // primero, la celebración en su tarjeta
  const pies = (el) => { const r = el.getBoundingClientRect(), b = pin.getBoundingClientRect(); return [r.left + r.width / 2 - b.left, r.bottom - b.top]; };
  const destino = () => { if (a) return pies(a.heroe); const [ox, oy] = pies(de.heroe); return [ox + pin.clientWidth * 0.7, oy + 40]; }; // el último salta fuera del bosque
  volando = true;
  if (a) a.heroe.style.visibility = "hidden";
  // fases, en segundos desde la victoria: celebra · se agacha · vuela (parábola: avance constante y gravedad constante) · cae y se recompone
  const AGACHA = 1.55, DESPEGA = 1.85, VUELO = 1.15, t0 = performance.now();
  let despegue = null, H = 0, fase = "celebra";
  const tic = () => {
    const t = (performance.now() - t0) / 1000;
    if (fase === "celebra" && t >= 0.9) { fase = "espera"; de.heroe.style.visibility = "hidden"; volador.style.visibility = "visible"; fig.dataset.facing = "1"; fig.dataset.pose = ""; }
    if (fase === "espera") {
      const [x, y] = pies(de.heroe); gsap.set(volador, { x, y }); // va encima de su tarjeta, que la pista ya arrastra
      if (t >= AGACHA) { fase = "agacha"; fig.__accion = { nombre: "Jump_Start", t: performance.now(), velocidad: 1.25 }; }
      return;
    }
    if (fase === "agacha") {
      const [x, y] = pies(de.heroe); gsap.set(volador, { x, y });
      if (t >= DESPEGA) {
        fase = "vuela"; despegue = [x, y]; fig.dataset.pose = "salta"; polvo(pin, x, y, false);
        const [tx, ty] = destino();
        H = gsap.utils.clamp(90, pin.clientHeight * 0.36, Math.hypot(tx - x, ty - y) * 0.42); // más lejos, más alto: como un salto de verdad
      }
      return;
    }
    if (fase === "vuela") {
      const u = Math.min(1, (t - DESPEGA) / VUELO), [tx, ty] = destino(), [ox, oy] = pies(de.heroe); // origen y destino viajan con la pista: la parábola se traza sobre ella, no sobre la pantalla
      const x = ox + (tx - ox) * u;                       // avance horizontal constante
      const y = oy + (ty - oy) * u - 4 * H * u * (1 - u); // parábola: sube frenando y cae acelerando
      gsap.set(volador, { x, y });
      if (u >= 1) {
        if (!a) { gsap.ticker.remove(tic); volador.style.visibility = "hidden"; delete fig.dataset.pose; volando = false; return; }
        fase = "cae"; fig.dataset.pose = ""; polvo(pin, tx, ty, true); // pisa: el Jump_Land sale solo al tocar suelo
      }
      return;
    }
    if (fase === "cae") {
      const [x, y] = pies(a.heroe); gsap.set(volador, { x, y });
      if (t >= DESPEGA + VUELO + 0.55) { gsap.ticker.remove(tic); volador.style.visibility = "hidden"; delete fig.dataset.pose; volando = false; a.heroe.style.visibility = ""; }
    }
  };
  gsap.ticker.add(tic);
}
function juegoBosque(id, montar) {
  if (!volador) { volador = $("[data-forest-volador]"); if (volador) gsap.set(volador, { xPercent: -50, yPercent: -100 }); } // en el HTML: el lienzo 3D reparte sus huecos al arrancar
  const carta = $(`[data-forest-game="${id}"]`);
  if (!carta) return;
  const caja = $("[data-game]", carta), heroe = $("[data-hero]", carta), figura = $("[data-icon3d]", heroe);
  const p = prueba(id, {
    // cuando la tarjeta llega al centro de la pista (y la pista está fijada en pantalla)
    vigilar: () => { if (!bosqueTL) return false; const r = carta.getBoundingClientRect(), c = r.left + r.width / 2; return c < innerWidth * 0.56 && c > innerWidth * 0.4 && r.top > -r.height * 0.2 && r.bottom < innerHeight * 1.2 && Math.abs($("[data-forest-pin]").getBoundingClientRect().top) < 4; },
    // la pista avanza 1 px por cada 1,2 px de scroll (fin = distancia × 1,2): se corrige lo que falte para centrarla
    reubicar: () => { const r = carta.getBoundingClientRect(), d = r.left + r.width / 2 - innerWidth / 2; if (Math.abs(d) > 4) mov.irA(scrollY + d * 1.2, { forzar: true, duracion: 0.35 }); }, // la pista se desliza hasta centrarla
    enPin: true, enLinea: true, accion: () => boton.click(), // el panel se queda en su tarjeta: no se confunde con el de las otras
    // superada (o saltada): la pista avanza sola hasta la tarjeta siguiente, despacio, para que se vea el parallax
    alAbrir: () => { saltarASiguiente(carta); gsap.delayedCall(1.3, () => {
      const lenis = window.__belmont && window.__belmont.lenis;
      if (!lenis || !bosqueTL) return;
      const sig = carta.nextElementSibling && carta.nextElementSibling.matches("[data-forest-game]") ? carta.nextElementSibling : null;
      let destino;
      if (sig) { const r = sig.getBoundingClientRect(); destino = scrollY + (r.left + r.width / 2 - innerWidth / 2) * 1.2; hud.aviso("SIGUIENTE PRUEBA →"); }
      else { const st = bosqueTL.scrollTrigger; destino = st ? st.end + innerHeight * 0.1 : scrollY + innerHeight; hud.aviso("SALES DEL BOSQUE"); }
      lenis.scrollTo(destino, { duration: mov.reducido ? 0 : 2.6, easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) });
    }); },
  });
  // un solo cazador para todo el bosque: solo se ve en la prueba que le toca
  BOSQUE.push({ carta, heroe, p });
  if (BOSQUE.length > 1 && !BOSQUE[BOSQUE.length - 2].p.hecha) heroe.style.visibility = "hidden";
  const boton = $("[data-trial-act]", p.caja);
  const juego = montar({ p, caja, heroe, mirar: (d) => figura && (figura.dataset.facing = d > 0 ? "1" : "-1"), W: () => caja.clientWidth, H: () => caja.clientHeight });
  gsap.set(heroe, { xPercent: -50, yPercent: -100 });
  (window.__bosque ||= {})[id] = juego; // pruebas automáticas
  boton.addEventListener("click", () => { if (!p.hecha) juego.pulsar(); });
  mov.añadir(({ reducido }) => {
    juego.reducido = reducido;
    let t0 = 0;
    const paso = (t) => {
      const dt = Math.min(0.05, t0 ? t - t0 : 0.016); t0 = t;
      if (!volando && p.caja.classList.contains("is-playing") && heroe.style.visibility === "hidden") heroe.style.visibility = ""; // llegó sin saltar (recarga a media pista)
      if (caja.getBoundingClientRect().right > 0 && caja.getBoundingClientRect().left < innerWidth) juego.paso(t, dt);
    };
    gsap.ticker.add(paso);
    return () => gsap.ticker.remove(paso);
  });
}

function pruebasBosque() {
  const salto = (el, x, y, alto, dur, onComplete) => gsap.to(el, { x, duration: dur, ease: "none", onComplete }) && gsap.to(el, { keyframes: [{ y: Math.min(gsap.getProperty(el, "y"), y) - alto, duration: dur * 0.45, ease: "power2.out" }, { y, duration: dur * 0.55, ease: "power2.in" }] });
  const chapuzon = (el, onComplete) => gsap.to(el, { y: "+=70", opacity: 0, duration: 0.5, ease: "power2.in", onComplete: () => { gsap.set(el, { opacity: 1 }); onComplete(); } });

  /* 2-1 · Plataformas que se hunden: salta cuando el siguiente tronco asoma; el que pisas se hunde */
  juegoBosque("rio", ({ p, caja, heroe, mirar, W, H }) => {
    const tablas = $$("[data-plank]", caja);
    const X = [0.08, 0.27, 0.45, 0.63, 0.81, 0.94];          // orilla, cuatro troncos, otra orilla
    const fase = tablas.map((_, i) => i * 1.9 + 0.6);
    const G = { pos: 0, pisado: 0, ocupado: false, h: tablas.map(() => 0), reducido: false };
    const suelo = () => H() * 0.62;
    const colocar = () => gsap.set(heroe, { x: X[G.pos] * W(), y: suelo() + (G.pos > 0 && G.pos < 5 ? G.pisado * 14 : 0) });
    const volver = (texto) => { p.decir(texto); hud.aviso("¡AL AGUA!"); p.reiniciar(); G.pos = 0; G.pisado = 0; colocar(); G.ocupado = false; };
    mirar(1); colocar();
    return Object.assign(G, {
      paso(t, dt) {
        tablas.forEach((tb, i) => {
          const pisa = G.pos === i + 1;
          G.h[i] = pisa ? 1 - G.pisado : Math.sin(t * 2.2 + fase[i]);
          gsap.set(tb, { y: (1 - Math.max(-0.2, G.h[i])) * 16, opacity: 0.35 + 0.65 * Math.max(0, Math.min(1, G.h[i] + 0.5)) });
          tb.classList.toggle("is-up", G.h[i] > 0.25);
        });
        if (G.pos > 0 && G.pos < 5 && !G.ocupado) {
          G.pisado += dt / 3.2;                                 // tres segundos y pico encima y te hundes
          gsap.set(heroe, { y: suelo() + G.pisado * 14 });
          if (G.pisado >= 1) { G.ocupado = true; chapuzon(heroe, () => volver("te hundiste: no te quedes quieto")); }
        }
        const sig = G.pos < 4 ? G.h[G.pos] : 1;
        if (!p.hecha) p.aguja(((1 - sig) * 0.29) / 0.75);
      },
      pulsar() {
        if (G.ocupado || G.pos >= 5) return;
        if (G.reducido) { p.sumar(); return; }
        const destino = G.pos + 1, asoma = destino === 5 || G.h[destino - 1] > 0.25;
        G.ocupado = true;
        salto(heroe, X[destino] * W(), suelo(), 30, 0.42, () => {
          if (!asoma) { chapuzon(heroe, () => volver("ese tronco estaba bajo el agua: espera a que asome")); return; }
          G.pos = destino; G.pisado = 0; G.ocupado = false;
          hud.puntos(100); p.sumar();
          if (destino === 4) { G.ocupado = true; gsap.delayedCall(0.3, () => salto(heroe, X[5] * W(), suelo(), 26, 0.4, () => (G.pos = 5))); }
        });
      },
    });
  });

  /* 2-2 · Troncos colgantes: salta al tronco cuando llega a tu orilla; te lleva a la otra */
  juegoBosque("troncos", ({ p, caja, heroe, mirar, W, H }) => {
    const pend = $("[data-pendulum-log]", caja);
    const A = 38, TOL = 12;
    const G = { lado: -1, monta: false, ocupado: false, ang: 0, vel: 2.3, t: 0, reducido: false };
    const orilla = (lado) => ({ x: (lado < 0 ? 0.12 : 0.88) * W(), y: H() * 0.72 });
    const punta = () => { const r = pend.offsetHeight, a = (G.ang * Math.PI) / 180, cx = W() / 2; return { x: cx - Math.sin(a) * r, y: H() * 0.04 + Math.cos(a) * r }; };
    const cerca = () => (G.lado < 0 ? A : -A);                // ángulo con el tronco en tu orilla (rotar en positivo lo lleva a la izquierda)
    const colocar = () => { const o = orilla(G.lado); gsap.set(heroe, o); };
    mirar(1); colocar();
    return Object.assign(G, {
      paso(t, dt) {
        G.t += dt * G.vel;
        G.ang = A * Math.sin(G.t);
        gsap.set(pend, { rotation: G.ang });
        if (G.monta) {
          gsap.set(heroe, punta());
          // al llegar al otro extremo, baja a la otra orilla
          if (Math.abs(G.ang + cerca()) < 4) {
            G.monta = false; G.ocupado = true; G.lado = -G.lado;
            const o = orilla(G.lado);
            salto(heroe, o.x, o.y, 20, 0.35, () => { G.ocupado = false; G.vel += 0.3; hud.puntos(150); p.sumar(); mirar(-G.lado); });
          }
        }
        if (!p.hecha && !G.monta) p.aguja(((G.ang - cerca()) / TOL) * 0.29 * (G.lado < 0 ? 1 : -1));
      },
      pulsar() {
        if (G.ocupado || G.monta) return;
        if (G.reducido) { p.sumar(); return; }
        const ok = Math.abs(G.ang - cerca()) < TOL;
        G.ocupado = true;
        const destino = punta();
        salto(heroe, destino.x, destino.y, 24, 0.28, () => {
          if (ok) { G.monta = true; G.ocupado = false; return; }
          p.decir("¡al barranco! salta cuando el tronco llegue a tu orilla"); hud.aviso("¡AL VACÍO!");
          gsap.to(heroe, { y: H() * 1.6, rotation: 160, duration: 0.6, ease: "power2.in", onComplete: () => { gsap.set(heroe, { rotation: 0 }); colocar(); G.ocupado = false; } });
        });
      },
    });
  });

  /* 2-3 · La primera anilla: engancha bajo la anilla y suelta arriba, hacia delante */
  juegoBosque("anilla", ({ p, caja, heroe, mirar, W, H }) => {
    const anilla = $("[data-hook]", caja), latigazo = $("[data-lash] line", caja);
    const AMP = 52, TOL = 11;
    const G = { modo: "corre", x: 0.08, dir: 1, ang: 0, t: 0, ocupado: false, reducido: false };
    const ancla = () => ({ x: W() * 0.5, y: H() * 0.14 });
    const suelo = () => H() * 0.72;
    const radio = () => H() * 0.5;
    const linea = (a, b) => { latigazo.setAttribute("x1", (a.x / W()) * 100); latigazo.setAttribute("y1", (a.y / H()) * 100); latigazo.setAttribute("x2", (b.x / W()) * 100); latigazo.setAttribute("y2", (b.y / H()) * 100); };
    const ocultar = () => { latigazo.setAttribute("x2", latigazo.getAttribute("x1")); latigazo.setAttribute("y2", latigazo.getAttribute("y1")); caja.classList.remove("is-lashed"); };
    const enRango = () => G.x > 0.23;
    return Object.assign(G, {
      paso(t, dt) {
        const a = ancla();
        gsap.set(anilla, { x: a.x, y: a.y });
        if (G.modo === "corre" && !G.ocupado) {
          G.x += G.dir * dt * 0.13;
          if (G.x > 0.33) { G.x = 0.33; G.dir = -1; } else if (G.x < 0.06) { G.x = 0.06; G.dir = 1; }
          mirar(G.dir);
          gsap.set(heroe, { x: G.x * W(), y: suelo(), rotation: 0 });
          caja.classList.toggle("is-reach", enRango());
          if (!p.hecha) p.aguja(((G.x - 0.28) / 0.05) * 0.29);
        } else if (G.modo === "cuelga") {
          G.t += dt * 2.1;
          G.ang = AMP * Math.sin(G.t - Math.PI / 2 + 0.6);        // empieza atrás y gana impulso
          const r = radio(), rad = (G.ang * Math.PI) / 180;
          const pos = { x: a.x + Math.sin(rad) * r, y: a.y + Math.cos(rad) * r + heroe.offsetHeight * 0.6 };
          gsap.set(heroe, { x: pos.x, y: pos.y, rotation: -G.ang * 0.5 });
          linea(a, { x: pos.x, y: pos.y - heroe.offsetHeight * 0.75 });
          if (!p.hecha) p.aguja(((G.ang - AMP) / TOL) * 0.29);
        }
      },
      pulsar() {
        if (G.ocupado) return;
        if (G.reducido) { p.sumar(); return; }
        if (G.modo === "corre") {
          if (!enRango()) { p.decir("fuera de alcance: espera a que llegue al borde (la anilla brilla)"); return; }
          G.modo = "cuelga"; G.t = 0; caja.classList.add("is-lashed"); caja.classList.remove("is-reach");
          hud.puntos(100); p.sumar(); return;
        }
        // suelta: si está arriba y hacia delante, vuela a la otra orilla
        const ok = Math.abs(G.ang - AMP) < TOL;
        G.modo = "vuela"; G.ocupado = true; ocultar();
        if (ok) { salto(heroe, W() * 0.86, suelo(), 40, 0.55, () => { gsap.set(heroe, { rotation: 0 }); G.ocupado = false; hud.puntos(200); p.sumar(); }); return; }
        p.decir("soltaste a destiempo: suelta en lo alto, hacia delante"); hud.aviso("¡AL VACÍO!");
        gsap.to(heroe, { y: H() * 1.6, rotation: 180, duration: 0.7, ease: "power2.in", onComplete: () => { p.reiniciar(); G.modo = "corre"; G.x = 0.08; G.dir = 1; gsap.set(heroe, { rotation: 0 }); G.ocupado = false; } });
      },
    });
  });
}

/* Prueba del Modo 7: cuelgas del látigo y la sala se voltea; contrarréstala para mantenerla derecha */
function pruebaModo7() {
  const pin = $("[data-mode7-pin]"), escenario = $("[data-m7-stage]"), cuelga = $("[data-m7-hang]");
  const aguja = $("[data-m7-needle]"), relleno = $("[data-m7-hold]");
  if (!pin || !escenario) return;
  const NIVEL = 12, TIEMPO = 1.5;
  const G = { giro: 0, deriva: 0, objetivo: 30, cambio: 0, izq: false, der: false, nivelada: 0, balanceo: 0, aciertos: 0 };
  let activa = false;
  const p = prueba("modo7", {
    activar: { trigger: "[data-mode7]", start: () => "top+=" + Math.round(innerHeight * 0.6) + " top" }, enPin: true,
    foco: "[data-m7-izq]", aviso: ["← → PARA NIVELAR LA SALA", "MANTÉN ⟲ ⟳ PARA NIVELAR"],
    teclas: (e) => {
      if (e.key === "ArrowLeft") { G.izq = true; return true; }
      if (e.key === "ArrowRight") { G.der = true; return true; }
      return false;
    },
    alAbrir: () => {
      activa = false;
      gsap.to(G, { giro: 0, duration: 0.8, ease: "power2.out", onUpdate: () => (sala7.giro = G.giro) });
      // como en el juego: al nivelar la sala, suelta el látigo y cae a salvo sobre una cornisa, lejos de los pinchos
      const heroe = $("[data-m7-hero]", cuelga), sl = heroe && $("[data-icon3d]", heroe), cornisa = $("[data-m7-cornisa]", cuelga), soga = $(".belmont-mode7__rope", cuelga);
      pin.classList.add("is-salvo");
      const tl = gsap.timeline({ delay: 0.5 });
      tl.to(cuelga, { rotation: 0, duration: 0.5, ease: "power2.out" })
        .fromTo(cornisa, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: "back.out(1.6)" }, "<")
        .add(() => { if (sl) sl.dataset.pose = "salta"; })
        .to(soga, { scaleY: 0, transformOrigin: "50% 0", duration: 0.35, ease: "power2.in" })
        .to(heroe, { y: () => (cornisa ? cornisa.offsetTop - (heroe.offsetTop + heroe.offsetHeight) : 0), duration: 0.45, ease: "power2.in" }, "<")
        .add(() => {
          if (sl) { sl.dataset.pose = ""; sl.__accion = { nombre: "Cheer", t: performance.now(), velocidad: 1, luego: [{ nombre: "Cheer", velocidad: 1.1 }] }; }
          hud.aviso("¡A SALVO!");
        })
        .to(heroe, { scaleY: 0.92, transformOrigin: "50% 100%", duration: 0.08, yoyo: true, repeat: 1 })
        .add(() => gsap.to(sala7, { juego: 0, duration: 1.6, ease: "power2.inOut" }), "+=0.6");
    },
  });
  window.__m7 = G; // pruebas automáticas
  window.addEventListener("keyup", (e) => { if (e.key === "ArrowLeft") G.izq = false; if (e.key === "ArrowRight") G.der = false; });
  // botones que se mantienen pulsados (ratón y táctil)
  [["[data-m7-izq]", "izq"], ["[data-m7-der]", "der"]].forEach(([sel, k]) => {
    const b = $(sel, p.caja);
    const on = (e) => { e.preventDefault(); G[k] = true; }, off = () => (G[k] = false);
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
    b.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); G[k] = true; } });
    b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") G[k] = false; });
  });
  mov.añadir(({ reducido }) => {
    let t0 = 0;
    const paso = (t) => {
      const dt = Math.min(0.05, t0 ? t - t0 : 0.016); t0 = t;
      const jugando = p.caja.classList.contains("is-playing");
      if (jugando && !activa) { activa = true; pin.classList.remove("is-salvo"); gsap.set([$("[data-m7-hero]", cuelga), $(".belmont-mode7__rope", cuelga)], { clearProps: "transform" }); gsap.set($("[data-m7-cornisa]", cuelga), { autoAlpha: 0 }); pin.classList.add("is-hanging"); gsap.to(sala7, { juego: 1, duration: 0.6, ease: "power2.out" }); G.giro = 0; G.nivelada = 0; const sl = $("[data-icon3d]", cuelga); if (sl) sl.dataset.pose = "cuelga"; }
      if (!activa || p.hecha) return;
      if (reducido) { if (G.izq || G.der) { G.izq = G.der = false; p.sumar(); } return; }
      // la sala cambia de empuje cada poco: hacia un lado, luego al otro, cada vez con más fuerza
      G.cambio -= dt;
      if (G.cambio <= 0) { G.cambio = gsap.utils.random(1.2, 2.4); G.objetivo = gsap.utils.random(22, 30 + G.aciertos * 7) * (Math.random() < 0.5 ? -1 : 1); }
      G.deriva += (G.objetivo - G.deriva) * Math.min(1, dt * 1.5);
      const mano = (G.der ? 1 : 0) - (G.izq ? 1 : 0);
      G.giro += (G.deriva + mano * 62) * dt;
      G.giro = gsap.utils.clamp(-90, 90, G.giro);
      sala7.giro = G.giro; if (reducido && sala7.pintar) sala7.pintar();
      // el cazador se balancea con la inercia del volteo
      G.balanceo += (-G.giro * 0.35 - G.balanceo) * Math.min(1, dt * 2.2);
      gsap.set(cuelga, { rotation: G.balanceo + Math.sin(t * 1.6) * 3, transformOrigin: "50% 0" });
      p.aguja((G.giro / NIVEL) * 0.29);
      // el nivel de la escena: la aguja se vuelca con la sala y el círculo se llena mientras está derecha
      gsap.set(aguja, { rotation: gsap.utils.clamp(-90, 90, G.giro), svgOrigin: "0 0" });
      relleno.style.strokeDashoffset = String(1 - Math.min(1, G.nivelada / TIEMPO));
      if (Math.abs(G.giro) < NIVEL) {
        G.nivelada += dt;
        if (G.nivelada >= TIEMPO) { G.nivelada = 0; G.aciertos++; hud.puntos(200); p.sumar(); }
      } else if (Math.abs(G.giro) > 75) {
        G.nivelada = 0; G.aciertos = 0; G.giro *= 0.3; p.reiniciar(); p.decir("¡vuelco! la sala se dio la vuelta: contrarresta antes");
        hud.aviso("¡VUELCO!");
      } else G.nivelada = Math.max(0, G.nivelada - dt * 0.5);
    };
    gsap.ticker.add(paso);
    return () => gsap.ticker.remove(paso);
  });
}

/* Prueba 3 · la torre del reloj: detén la aguja dorada en las XII */
function pruebaReloj() {
  const TOL = 16;
  const p = prueba("reloj", { activar: { trigger: "[data-clock]", start: () => "top+=" + Math.round(innerHeight * 0.5) + " top" }, enPin: true, accion: () => boton.click() });
  const aguja = $("[data-hand-game]"), boton = $("[data-trial-act]", p.caja), sec = $("[data-clock]"), cara = $("[data-clock-face]");
  const VEL = [90, 120, 150]; // grados por segundo en cada intento (ventana de 0,36 s → 0,21 s)
  let ang = 200, nivel = 0, pausa = 0, visible = false, ultimo = 0, enfriando = false;
  const dif = () => ((ang % 360) + 540) % 360 - 180; // −180…180, 0 = las XII
  window.__reloj = dif; // pruebas automáticas
  mov.añadir(() => {
    const st = ScrollTrigger.create({ trigger: "[data-clock]", start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });
    const paso = (t) => {
      const dt = Math.min(0.05, ultimo ? t - ultimo : 0); ultimo = t;
      if (!visible) return;
      if (p.hecha) { ang += (-dif()) * Math.min(1, dt * 4); }
      else if (pausa > 0) pausa -= dt;
      else ang += VEL[nivel] * dt * (mov.reducido ? 0.4 : 1);
      gsap.set(aguja, { rotation: ang });
      if (!p.hecha) { p.aguja(dif() / TOL * 0.29); cara.classList.toggle("is-hot", Math.abs(dif()) < TOL); }
      cara.classList.toggle("is-playing", !p.hecha);
    };
    gsap.ticker.add(paso);
    return () => { gsap.ticker.remove(paso); st.kill(); };
  });
  boton.addEventListener("click", () => {
    if (p.hecha || pausa > 0 || enfriando) return;
    if (Math.abs(dif()) < TOL) {
      hud.puntos(250); p.sumar(); pausa = 0.9; nivel = Math.min(VEL.length - 1, nivel + 1);
      hud.aviso("TIEMPO DETENIDO");
      sec.classList.add("is-frozen"); gsap.delayedCall(0.5, () => sec.classList.remove("is-frozen"));
    } else {
      p.decir(dif() > 0 ? "te pasaste · espera" : "aún no · espera");
      enfriando = true; boton.disabled = true; gsap.delayedCall(0.8, () => { enfriando = false; boton.disabled = false; }); // pulsar sin parar no sirve
      if (!mov.reducido) gsap.fromTo(cara, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)", clearProps: "x" });
    }
  });
}

/* ── HUD: progreso, velocidad, fase, corazones y aviso ───── */
const hud = (() => {
  const score = $("[data-score]"), etapa = $("[data-stage]"), corazonesEl = $("[data-hearts]"), tiempo = $("[data-time]");
  const player = $("[data-player]"), enemy = $("[data-enemy]"), toast = $("[data-toast]");
  let st = null, extraPuntos = 0, extraCorazones = 0, fijo = null, vidaPlena = false, p = 0;
  const pintar = () => {
    score.textContent = pad(Math.min(999999, p * 899990 + extraPuntos), 6);
    corazonesEl.textContent = pad(fijo ?? Math.min(99, 5 + p * 60 + extraCorazones), 2);
    tiempo.textContent = pad(500 - p * 500, 4);
    player.style.setProperty("--belmont-p", (vidaPlena ? 1 : 1 - p * 0.35).toFixed(3));
    enemy.style.setProperty("--belmont-p", (1 - p).toFixed(3));
  };
  mov.añadir(() => {
    st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => { p = s.progress; pintar(); } });
    $$("[data-stage-id]").forEach((sec) => {
      if (sec.hasAttribute("data-stages")) return;
      ScrollTrigger.create({ trigger: sec, start: "top center", end: "bottom center", onToggle: (s) => s.isActive && (etapa.textContent = sec.dataset.stageId) });
    });
    return () => { st && st.kill(); st = null; };
  }, { persistente: true });
  return {
    velocidad: () => (st ? st.getVelocity() : 0),
    etapa: (v) => (etapa.textContent = v.length === 1 ? "0" + v : v),
    puntos: (n) => { extraPuntos += n; pintar(); },
    corazones: (n, fijar) => { if (fijar) fijo = n || null; else extraCorazones += n; pintar(); },
    vida: () => { vidaPlena = true; pintar(); },
    aviso: (texto) => {
      toast.textContent = texto;
      if (mov.reducido) { gsap.set(toast, { opacity: 1, yPercent: 0 }); gsap.delayedCall(2.5, () => gsap.set(toast, { opacity: 0 })); return; }
      gsap.timeline().to(toast, { opacity: 1, y: 0, yPercent: 0, xPercent: -50, duration: 0.4, ease: "back.out(2)" }).to(toast, { opacity: 0, yPercent: -40, duration: 0.3 }, "+=2"); // sale apagándose, sin subir sobre las barras del HUD
    },
  };
})();

/* ── Arranque ─────────────────────────────────────────────── */
// La página arranca con las fuentes y el castillo (lo primero que se ve). El cazador 3D y los iconos se piden a la vez,
// pero solo se les espera hasta 2,5 s más: con buena conexión llegan juntos, como siempre; con una lenta, la página
// no se queda parada y se enganchan solos al llegar (mientras, se ven sus siluetas SVG)
const castillo = tres(), figuras = glbCastillo.then(() => iconos3d()); // el cazador empieza a bajar cuando el castillo ya ha bajado
const listo = Promise.all([document.fonts.ready, referencias, castillo.then(() => Promise.race([figuras, new Promise((r) => setTimeout(r, 2500))]))]);
intro(() => listo.then(heroEntrada));
listo.then(() => {
  relampagos();
  linterna();
  heroScroll();
  sangre();
  prologo();
  latigo();
  latigoJugable();
  fases();
  candelabro();
  bosque();
  modo7();
  arsenal();
  reloj();
  pruebaReloj();
  pruebasBosque();
  pruebaModo7();
  muro();
  konami();
  musica();
  final();
  ejes();
  criaturas({ gsap, mov });
  bocetos({ gsap, mov }); // tras los pines: sus posiciones ya cuentan
  rutas({ gsap, ScrollTrigger, mov });
  escena3d();
  if (!escena) cielo(); // 2D de reserva, creado tras los pines
  mov.actualizar();
  window.__belmont = mov;
});
