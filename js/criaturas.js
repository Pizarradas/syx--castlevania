// Criaturas de la noche: niebla de primer plano y ojos que te miran desde la oscuridad
// (las arañas y telarañas son ahora láminas del cuaderno del cazador: js/bocetos.js). Todo es decorado (aria-hidden, sin eventos de puntero) y
// entra por mov.añadir, así se revierte con el resto del movimiento. El reloj es gsap.ticker y la
// velocidad la da el ScrollTrigger del HUD (que lee Lenis): no hay bucles propios.

export function criaturas({ gsap, mov }) {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
  const azar = gsap.utils.random;

  const prologo = document.querySelector(".belmont-prologue");
  const niebla = document.createElement("span");
  niebla.className = "belmont-fogfront"; niebla.setAttribute("aria-hidden", "true");
  if (prologo) prologo.append(niebla);
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const deriva = gsap.fromTo(niebla, { xPercent: -35 }, { xPercent: 25, ease: "none", scrollTrigger: { trigger: prologo, start: "top bottom", end: "bottom top", scrub: true } });
    return () => [deriva].forEach((w) => { w.scrollTrigger && w.scrollTrigger.kill(); w.kill(); });
  });

  /* ── Ojos en la oscuridad: parpadean al azar y las pupilas siguen al puntero ── */
  const nidos = [
    { sel: ".belmont-forest__layer--mid", n: 12, zona: [4, 96, 58, 86] }, // dentro de un plano: se mueven con su parallax
  ];
  const ojos = [];
  nidos.forEach(({ sel, n, zona }) => {
    const nido = document.querySelector(sel);
    if (!nido) return;
    for (let i = 0; i < n; i++) {
      const o = document.createElement("span");
      o.className = "belmont-eyes";
      o.setAttribute("aria-hidden", "true");
      o.style.left = azar(zona[0], zona[1]) + "%"; o.style.top = azar(zona[2], zona[3]) + "%";
      o.style.setProperty("--belmont-eyes-s", String(azar(0.6, 1.4)));
      o.innerHTML = '<span class="belmont-eyes__eye"><span></span></span><span class="belmont-eyes__eye"><span></span></span>';
      const antes = nido.querySelector(".belmont-forest__track, [data-track], .belmont-finale__copy");
      antes ? nido.insertBefore(o, antes) : nido.append(o); // detrás del texto, delante del fondo
      ojos.push(o);
    }
  });
  mov.añadir(({ reducido }) => {
    if (reducido) return;
    const citas = ojos.map((o) => {
      let c;
      const parpadeo = () => {
        gsap.timeline()
          .to(o, { opacity: azar(0.55, 1), duration: 0.6 })
          .to(o.children, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: Math.random() < 0.3 ? 3 : 1, ease: "power1.inOut" }, "+=" + azar(0.4, 2))
          .to(o, { opacity: Math.random() < 0.4 ? 0 : 0.7, duration: 0.8 }, "+=" + azar(0.6, 2.5));
        c = gsap.delayedCall(azar(2.5, 6), parpadeo);
      };
      c = gsap.delayedCall(azar(0, 3), parpadeo);
      return () => c.kill();
    });
    const pupilas = ojos.flatMap((o) => $$(".belmont-eyes__eye > span", o));
    const mirar = (e) => pupilas.forEach((p) => {
      const r = p.parentElement.getBoundingClientRect();
      const a = Math.atan2(e.clientY - r.top, e.clientX - r.left);
      gsap.to(p, { x: Math.cos(a) * r.width * 0.22, y: Math.sin(a) * r.height * 0.22, duration: 0.4, overwrite: "auto" });
    });
    if (fino.matches) window.addEventListener("pointermove", mirar);
    return () => { citas.forEach((q) => q()); window.removeEventListener("pointermove", mirar); };
  });
}
