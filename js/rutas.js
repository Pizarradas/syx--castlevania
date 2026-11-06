// Rutas narrativas: objetos que recorren un camino según avanza el scroll, cada uno contando algo.
//  · Prólogo: la sangre que gotea del castillo baja por detrás del texto; la gota va delante.
//  · Torre del reloj: Simon trepa de plataforma en plataforma; los engranajes cercanos le pasan por delante.
//  · Final: el murciélago de Drácula huye del derrumbe y se pierde en la luna, que cae con el amanecer.
// Reloj único (gsap.ticker) y scrub: true sobre Lenis (cmb-scrub). Todo entra por mov.añadir.

const SIMON = `<svg viewBox="0 0 40 64" aria-hidden="true" focusable="false"><path class="belmont-simon__cape" d="M20 10c-7 2-11 10-12 22l-5 24 11-8 6 12 6-12 11 8-5-24C31 20 27 12 20 10z"/><circle class="belmont-simon__head" cx="20" cy="8" r="5.5"/><path class="belmont-simon__body" d="M15 18h10l2 20h-4l-1 18h-4l-1-18h-4z"/><path class="belmont-simon__whip" d="M26 22q10 2 12 12t-6 18"/></svg>`;

const MURCIELAGO = `<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false">
  <g class="belmont-bat__wing belmont-bat__wing--l"><path d="M58 24C50 14 38 8 22 10 14 11 6 16 0 24c6-2 11-1 14 3 3-4 9-5 13-2 2-4 8-5 12-2 3-3 8-3 11 0 3-2 6-2 8 1z"/><path class="belmont-bat__bone" d="M56 24 30 12M44 24 14 16M40 26 4 22"/></g>
  <g class="belmont-bat__wing belmont-bat__wing--r"><path d="M62 24c8-10 20-16 36-14 8 1 16 6 22 14-6-2-11-1-14 3-3-4-9-5-13-2-2-4-8-5-12-2-3-3-8-3-11 0-3-2-6-2-8 1z"/><path class="belmont-bat__bone" d="M64 24 90 12M76 24 106 16M80 26 116 22"/></g>
  <path class="belmont-bat__body" d="M60 16c-3 0-5 2-5 5l-1-6-2 7c0 8 3 16 8 20 5-4 8-12 8-20l-2-7-1 6c0-3-2-5-5-5z"/>
  <circle class="belmont-bat__eye" cx="57.5" cy="22" r="1.1"/><circle class="belmont-bat__eye" cx="62.5" cy="22" r="1.1"/>
</svg>`;

// posición de un elemento dentro de un antepasado, sin transformaciones (medidas de maqueta)
const enAncestro = (el, anc) => {
  let x = 0, y = 0, e = el;
  while (e && e !== anc) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
  return { x, y };
};

export function rutas({ gsap, ScrollTrigger, mov, pistas }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── 1 · Prólogo: reguero de sangre ───────────────────────── */
  const camino = $("[data-blood-path]"), gota = $("[data-blood-drop]"), lienzo = $("[data-blood-route]"), prologo = $(".belmont-prologue");
  // baja desde la sangre del hero serpenteando por el margen de la carta y acaba en su lacre
  const lacre = $("[data-letter-seal]"), carta = $("[data-letter]");
  let largo = 1;
  const trazarSangre = () => {
    const W = prologo.offsetWidth, H = prologo.offsetHeight;
    lienzo.setAttribute("viewBox", `0 0 ${W} ${H}`); lienzo.setAttribute("width", W); lienzo.setAttribute("height", H);
    const c = enAncestro(carta, prologo), s = enAncestro(lacre, prologo);
    const fin = [s.x + lacre.offsetWidth / 2, s.y + lacre.offsetHeight / 2];
    const borde = Math.min(W - 24, c.x + carta.offsetWidth + Math.max(24, (W - c.x - carta.offsetWidth) * 0.45));
    const P = [[0.83 * W, 0], [0.78 * W, c.y * 0.6], [borde, c.y + carta.offsetHeight * 0.25], [borde - 30, c.y + carta.offsetHeight * 0.6], [fin[0] + 60, fin[1] - 70], fin];
    let d = `M ${P[0][0]} ${P[0][1]}`;
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; const my = (y0 + y1) / 2; d += ` C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`; }
    camino.setAttribute("d", d);
    largo = camino.getTotalLength();
    camino.style.strokeDasharray = largo;
  };
  mov.añadir(({ reducido }) => {
    trazarSangre();
    ScrollTrigger.addEventListener("refreshInit", trazarSangre);
    if (reducido) { camino.style.strokeDashoffset = 0; gsap.set(gota, { autoAlpha: 0 }); return () => ScrollTrigger.removeEventListener("refreshInit", trazarSangre); }
    const estado = { p: 0 };
    const pintar = () => {
      const l = estado.p * largo, pt = camino.getPointAtLength(l), pt2 = camino.getPointAtLength(Math.min(largo, l + 2));
      camino.style.strokeDashoffset = largo - l;
      gsap.set(gota, { x: pt.x, y: pt.y, rotation: (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI - 90, scale: 0.7 + estado.p * 0.6, autoAlpha: estado.p > 0.96 ? 0 : 1 }); // al llegar se hace lacre
    };
    // el recorrido manda: gsap anima el avance y la gota se coloca sobre el punto exacto del reguero
    const tw = gsap.to(estado, { p: 1, ease: "none", onUpdate: pintar, scrollTrigger: { trigger: carta, start: "top 85%", end: "bottom 72%", scrub: true } }); // la gota llega cuando cae el lacre
    pintar();
    return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); ScrollTrigger.removeEventListener("refreshInit", trazarSangre); };
  });

  /* ── 3 · La torre: Simon trepa ─────────────────────────────── */
  const pinReloj = $("[data-clock-pin]"), trepador = $("[data-climber]");
  trepador.insertAdjacentHTML("afterbegin", SIMON);
  const figuraTrepa = $("[data-icon3d]", trepador);
  const cerca = $('[data-depth="near"]', pinReloj);
  if (cerca) pinReloj.insertBefore(cerca, $(".belmont-clock__copy", pinReloj)); // los engranajes cercanos le pasan por delante
  mov.añadir(({ reducido }) => {
    const plataformas = $$("[data-steps] span", pinReloj), copia = $(".belmont-clock__card", pinReloj), prueba = document.querySelector('[data-trial="reloj"]');
    let lado = 1;
    const st = { kill() {} };
    const vis = ScrollTrigger.create({ trigger: "[data-clock]", start: "top bottom", end: "bottom top" }); // la sección (con su espacio de pin), no el elemento fijado
    const pintar = () => {
      if (!vis.isActive && !reducido) return;
      // la torre baja a su alrededor: Simon se queda a media altura y salta a la plataforma que llega
      const base = pinReloj.getBoundingClientRect(), Y0 = base.top + base.height * 0.56;
      // solo pisa las plataformas que quedan a la vista: las que pasan por debajo del texto o del panel de la prueba no cuentan
      const texto = copia && copia.getBoundingClientRect(), panel = prueba && prueba.getBoundingClientRect();
      let limite = texto && texto.width && texto.left > base.left + base.width * 0.4 ? texto.left - 70 : 0;
      if (limite && panel && panel.width && panel.top < innerHeight && panel.bottom > 0) limite = Math.min(limite, panel.left - 70);
      const todas = plataformas.map((e) => e.getBoundingClientRect()).filter((q) => q.width > 0);
      let r = todas.filter((q) => !limite || q.left + q.width / 2 < limite);
      if (r.length < 2) r = todas; // si el texto o el panel tapan casi todo, mejor pisar una plataforma tapada que desaparecer
      r.sort((m, n) => n.top - m.top);
      let a = r.find((q) => q.top >= Y0), bq = null;
      for (const q of r) if (q.top < Y0 && (!bq || q.top > bq.top)) bq = q;
      if (a) for (const q of r) if (q.top >= Y0 && q.top < a.top) a = q;
      if (!a && !bq) { gsap.set(trepador, { autoAlpha: 0 }); return; }
      // al pie de la torre (o en lo alto) no hay salto: espera de pie en la plataforma que tiene
      if (!a || !bq) { const q = a || bq; gsap.set(trepador, { autoAlpha: 1, xPercent: -50, yPercent: -100, x: q.left + q.width / 2 - base.left, y: q.top - base.top, rotation: 0 }); return; }
      const u = gsap.utils.clamp(0, 1, (a.top - Y0) / Math.max(1, a.top - bq.top) * 3 - 1); // salta en el tercio central del recorrido: el resto del tiempo está de pie sobre la plataforma
      const ax = a.left + a.width / 2 - base.left, ay = a.top - base.top, bx = bq.left + bq.width / 2 - base.left, by = bq.top - base.top;
      const t = gsap.parseEase("power2.inOut")(u), salto = reducido ? 0 : Math.sin(Math.PI * u) * 70;
      lado = bx >= ax ? 1 : -1;
      if (figuraTrepa) figuraTrepa.dataset.facing = lado;
      gsap.set(trepador, { autoAlpha: 1, xPercent: -50, yPercent: -100, x: ax + (bx - ax) * t, y: ay + (by - ay) * t - salto, scaleX: lado, rotation: 0 });
      if (figuraTrepa) figuraTrepa.dataset.pose = u > 0.02 && u < 0.98 ? "salta" : "";
    };
    if (reducido) { pintar(); return () => { st.kill(); vis.kill(); }; }
    gsap.ticker.add(pintar);
    return () => { gsap.ticker.remove(pintar); st.kill(); vis.kill(); };
  });

  /* ── 4 · Final: sin murciélago: el final es el amanecer, limpio ── */
  const bat = $("[data-final-bat]"); if (bat) bat.remove();
}
