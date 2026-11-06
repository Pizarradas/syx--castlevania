/* Generado por herramientas/plantillas_globales.py desde plantillas/orquestador.js. No lo edites a mano.
   Expone Plantillas.iniciarMovimiento. Las bibliotecas se le pasan por parámetro. */
(function () {
  "use strict";

  // Una entrada de scroll y movimiento para los cinco perfiles: ninguno, gsap, gsap-smoother, lenis, gsap+lenis.
  // Sin import: las bibliotecas llegan por parámetro, así sirve con empaquetador, <script> y módulos nativos.
  // Los órdenes de este archivo están demostrados en 03-ciclo/orq-ciclo.md y orq-navegacion.md.

  const PERFILES = {
    ninguno: [],
    gsap: ["gsap"],
    "gsap-smoother": ["gsap", "ScrollTrigger", "ScrollSmoother"],
    lenis: ["Lenis"],
    "gsap+lenis": ["gsap", "ScrollTrigger", "Lenis"],
  };

  // Id de cada comprobación en datos/reglas.json
  const REGLAS = { reloj: "O01", dosInstancias: "O02", otroSuavizado: "O03", normalizar: "O07", snap: "O11" };

  // Una ejecución por raíz: dos sobre la misma competirían por el scroll
  const activos = new Map();

  function elementoDe(valor, nombre) {
    if (valor === undefined || valor === null || valor === window) return null;
    const el = typeof valor === "string" ? document.querySelector(valor) : valor;
    if (!(el instanceof Element)) throw new TypeError(`iniciarMovimiento: ${nombre} no encontrado`);
    return el;
  }

  // Devuelve cómo dejar una propiedad de estilo como estaba
  function recordarEstilo(el, propiedad) {
    const previo = el.style.getPropertyValue(propiedad);
    const prioridad = el.style.getPropertyPriority(propiedad);
    return () => {
      if (previo) el.style.setProperty(propiedad, previo, prioridad);
      else el.style.removeProperty(propiedad);
    };
  }

  // Al quitar la última clase o propiedad, el atributo queda vacío: esto lo retira si no estaba
  function recordarAtributos(nodos) {
    const sin = nodos.flatMap((el) => ["style", "class"].filter((a) => !el.hasAttribute(a)).map((a) => [el, a]));
    return () => sin.forEach(([el, a]) => { if (!el.getAttribute(a)) el.removeAttribute(a); });
  }

  const TECLAS_SCROLL = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

  /**
   * Inicia el movimiento de una página o de un contenedor con una sola API para todos los perfiles.
   * Llámala en cliente, con el DOM presente. Cambiar de perfil solo exige cambiar `perfil`.
   *
   * @param {object} config
   * @param {"ninguno"|"gsap"|"gsap-smoother"|"lenis"|"gsap+lenis"} config.perfil
   * @param {Element|string|Window} [config.raiz] Ventana por defecto. Con `gsap-smoother` es el `wrapper`
   *   de ScrollSmoother, que no admite contenedor: el scroll sigue siendo el de la ventana.
   * @param {Element|string} [config.content] Contenido. Por defecto, el primer hijo de `raiz`.
   * @param {object} [config.opciones]
   * @param {object} [config.opciones.lenis] Opciones de Lenis. `anchors` es `true` si no se indica. `autoRaf` lo decide
   *   el perfil: en `gsap+lenis` se ignora, y en `lenis` solo vale `false`, para un motor propio que llame a `lenis.raf(t)`.
   * @param {object} [config.opciones.smoother] Opciones de ScrollSmoother.
   * @param {boolean} [config.opciones.reducido] Fija la decisión. Sin él manda `prefers-reduced-motion`.
   * @param {(aviso: {regla: string, mensaje: string}) => void} [config.opciones.alAvisar] Por defecto, console.warn.
   * @param {object} [config.gsap] @param {object} [config.ScrollTrigger] @param {object} [config.ScrollToPlugin]
   * @param {object} [config.ScrollSmoother] @param {Function} [config.Lenis]
   * @returns {object} `{ perfil, lenis, smoother, ctx, raiz, reducido, añadir, actualizar, navegar, bloquear,
   *   desbloquear, irA, posicion, fijarReducido, salir }`
   */
  function iniciarMovimiento(config = {}) {
    const { perfil, opciones = {}, gsap, ScrollTrigger, ScrollToPlugin, ScrollSmoother, Lenis } = config;
    const necesarias = PERFILES[perfil];
    if (!necesarias) throw new TypeError(`iniciarMovimiento: perfil desconocido "${perfil}". Usa: ${Object.keys(PERFILES).join(", ")}`);
    const faltan = necesarias.filter((nombre) => !config[nombre]);
    if (faltan.length) throw new TypeError(`iniciarMovimiento: el perfil ${perfil} necesita ${faltan.join(", ")}`);

    const usaGsap = perfil.startsWith("gsap");
    const usaLenis = perfil === "lenis" || perfil === "gsap+lenis";
    const usaSmoother = perfil === "gsap-smoother";
    const ST = usaGsap ? ScrollTrigger : null;
    const G = usaGsap ? gsap : null;
    if (G) G.registerPlugin(...[ST, ScrollToPlugin, usaSmoother && ScrollSmoother].filter(Boolean));

    const html = document.documentElement;
    const raiz = elementoDe(config.raiz, "raiz");
    const enContenedor = !!raiz && !usaSmoother;
    const contenido = elementoDe(config.content, "content") ?? (raiz ? raiz.firstElementChild : null);
    const desplazable = enContenedor ? raiz : html; // el elemento cuyo scrollTop cambia
    const objetivoScroll = enContenedor ? raiz : window; // a quién se le pide scrollTo

    const vistos = new Set();
    function avisar(regla, mensaje) {
      if (vistos.has(regla + mensaje)) return;
      vistos.add(regla + mensaje);
      if (opciones.alAvisar) opciones.alAvisar({ regla, mensaje });
      else console.warn(`[movimiento ${regla}] ${mensaje}`);
    }

    function smootherAjeno() {
      const Clase = ScrollSmoother ?? gsap?.core?.globals?.().ScrollSmoother ?? window.ScrollSmoother;
      const activo = Clase?.get?.();
      return activo && activo !== smoother ? activo : null;
    }

    function revisar() {
      if (smootherAjeno()) {
        const texto = usaSmoother ? "ya hay otro ScrollSmoother" : `hay un ScrollSmoother activo con el perfil ${perfil}`;
        avisar(REGLAS.otroSuavizado, `${texto}: quedan dos suavizados. Retira uno.`);
      }
      if (!usaLenis && html.classList.contains("lenis")) {
        avisar(REGLAS.otroSuavizado, `hay un Lenis activo en la ventana con el perfil ${perfil}. Retíralo o cambia de perfil.`);
      }
      if (perfil === "gsap+lenis" && lenis?.options.autoRaf) {
        avisar(REGLAS.reloj, "Lenis tiene autoRaf y además avanza con gsap.ticker: dos relojes. Quita autoRaf.");
      }
      if (lenis && ST?.normalizeScroll()) {
        avisar(REGLAS.normalizar, "ScrollTrigger.normalizeScroll está activo con Lenis. Quítalo.");
      }
      if (lenis && getComputedStyle(desplazable).scrollSnapType.includes("mandatory")) {
        avisar(REGLAS.snap, "scroll-snap-type: mandatory en la raíz de Lenis: se pierde la animación. Usa lenis/snap.");
      }
    }

    // Dos ejecuciones sobre la misma raíz: gana la última, y se avisa
    const claveRaiz = desplazable;
    const anterior = activos.get(claveRaiz);
    if (anterior) {
      avisar(REGLAS.dosInstancias, `ya había un movimiento en esta raíz (perfil ${anterior.perfil}): se retira.`);
      anterior.salir();
    }
    if (usaLenis && desplazable.classList.contains("lenis")) {
      avisar(REGLAS.dosInstancias, "ya hay una instancia de Lenis en esta raíz, creada fuera de iniciarMovimiento: compiten por el scroll.");
    }

    // Estado
    let lenis = null;
    let smoother = null;
    let reloj = null;
    let cerrado = false;
    let bloqueos = 0;
    let soltarBloqueo = null;
    let turno = 0;
    let manual = typeof opciones.reducido === "boolean" ? opciones.reducido : null;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducido = manual ?? consulta.matches;
    const entradas = new Set();
    const pendientes = new Set();
    const viaje = { y: 0 }; // lo que anima irA con ScrollSmoother
    let enfocando = false;
    const restaurar = [recordarAtributos([html, document.body, ...(raiz ? [raiz] : []), ...(contenido ? [contenido] : [])])];
    let historialTomado = false;
    let antesDeSmoother = "";

    // Sin GSAP, ctx ofrece lo mismo que un gsap.context: add() y revert()
    function contextoLigero() {
      let limpiezas = [];
      return {
        add(fn) { const r = fn(); if (typeof r === "function") limpiezas.push(r); return r; },
        revert() { const l = limpiezas; limpiezas = []; l.reverse().forEach((f) => f()); },
      };
    }
    const ctx = G ? G.context(() => {}) : contextoLigero();

    // --- Una sola decisión de movimiento reducido ------------------------------------------------

    const valorLenis = opciones.lenis ?? {};
    function ajustarLenis() {
      lenis.options.smoothWheel = reducido ? false : valorLenis.smoothWheel ?? true;
      lenis.options.syncTouch = reducido ? false : valorLenis.syncTouch ?? false;
    }

    function crearLenis() {
      const { autoRaf, anchors = true, ...resto } = valorLenis; // anchors: dueño de las anclas en orq-propiedad
      if (perfil === "gsap+lenis" && autoRaf) {
        avisar(REGLAS.reloj, "opciones.lenis.autoRaf se ignora: en gsap+lenis el reloj es gsap.ticker.");
      }
      const lugar = enContenedor ? { wrapper: raiz, content: contenido ?? raiz } : contenido ? { content: contenido } : {};
      lenis = new Lenis({ ...resto, ...lugar, anchors, autoRaf: perfil === "lenis" && autoRaf !== false });
      // Lenis lee su preferencia aquí en cada scrollTo: así obedece a esta decisión y no a otra
      Object.defineProperty(lenis, "prefersReducedMotion", { get: () => reducido, configurable: true });
      ajustarLenis();
      if (perfil === "gsap+lenis") {
        const tick = (t) => lenis.raf(t * 1000); // el ticker da segundos, raf espera milisegundos
        const quitar = lenis.on("scroll", ST.update);
        // También en los refresh que ScrollTrigger hace por su cuenta, como al redimensionar
        const medirLenis = () => {
          lenis.resize();
          const y = lenis.scroll; // resize() acaba de igualarlo a la posición real
          if (lenis.isScrolling === "smooth" || !y) return;
          // refresh escribe 0 y la posición: el evento scroll llega después y deja isScrolling en "native"
          // sin retorno. Un salto de ida y vuelta hace que Lenis ignore ese evento y vuelva al reposo
          const salto = { immediate: true, force: true };
          lenis.scrollTo(y - 1, salto);
          lenis.scrollTo(y, salto);
        };
        ST.addEventListener("refresh", medirLenis);
        G.ticker.add(tick);
        reloj = () => { G.ticker.remove(tick); quitar(); ST.removeEventListener("refresh", medirLenis); };
      }
    }

    function crearSmoother() {
      const propias = opciones.smoother ?? {};
      const lugar = { ...(raiz ? { wrapper: raiz } : {}), ...(contenido ? { content: contenido } : {}) };
      smoother = ScrollSmoother.create({
        ...propias,
        ...lugar,
        ...(reducido ? { smooth: 0, effects: false, speed: 1 } : {}),
        // En focusin recoloca aunque se pida preventScroll: enfocar no debe saltar
        onFocusIn: (s, e) => (enfocando ? false : propias.onFocusIn?.(s, e)),
      });
    }

    function aplicarReducido() {
      const nuevo = manual ?? consulta.matches;
      if (nuevo === reducido || cerrado) return;
      reducido = nuevo;
      marcar();
      // Retirar un pin quita su espaciador y el navegador recoloca la página: la posición se guarda antes
      const y = smoother ? window.scrollY : posicion();
      entradas.forEach(retirarEntrada);
      if (lenis) { cortar(); ajustarLenis(); }
      if (smoother) {
        // smooth(0) no devuelve el wrapper a su sitio: hay que recrearlo
        smoother.kill();
        crearSmoother();
        window.scrollTo({ top: y, behavior: "instant" });
      }
      entradas.forEach(ejecutarEntrada);
      medir();
      colocar(y);
    }

    function marcar() {
      if (reducido) html.setAttribute("data-movimiento", "reducido");
      else html.removeAttribute("data-movimiento");
    }

    // --- Posición ----------------------------------------------------------------------------------

    function posicion() {
      if (lenis) return lenis.scroll;
      if (smoother) return smoother.scrollTop();
      return desplazable.scrollTop;
    }

    function maximo() {
      if (enContenedor) return raiz.scrollHeight - raiz.clientHeight;
      return html.scrollHeight - html.clientHeight;
    }

    // Número de scroll de un destino. Es el mismo en todos los perfiles: scroll-margin y scroll-padding incluidos
    function aNumero(destino, desplazamiento = 0) {
      if (typeof destino === "number") return Math.min(Math.max(destino + desplazamiento, 0), maximo());
      const el = typeof destino === "string" ? (raiz ?? document).querySelector(destino) ?? document.querySelector(destino) : destino;
      if (!(el instanceof Element)) return null;
      const margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const relleno = parseFloat(getComputedStyle(desplazable).scrollPaddingTop) || 0;
      let y;
      if (smoother) y = smoother.offset(el, "top top");
      else {
        const borde = enContenedor ? raiz.getBoundingClientRect().top + raiz.clientTop : 0;
        y = el.getBoundingClientRect().top - borde + desplazable.scrollTop;
      }
      return Math.min(Math.max(y - margen - relleno + desplazamiento, 0), maximo());
    }

    // Detiene lo que esté moviendo el scroll sin mover la página
    function cortar() {
      if (lenis) {
        if (lenis.isScrolling !== "smooth") return;
        const y = lenis.scroll;
        lenis.scrollTo(y > 0 ? y - 1 : 1, { immediate: true, force: true });
      } else if (smoother) {
        G.killTweensOf(viaje);
        saltarSmoother(smoother.scrollTop());
      } else {
        if (G) G.killTweensOf(objetivoScroll);
        objetivoScroll.scrollTo({ top: desplazable.scrollTop, behavior: "instant" });
      }
    }

    // Salto sin animación: corta, mide y coloca. En Lenis, el primer scrollTo debe diferir de targetScroll
    function colocar(destino) {
      const salto = { immediate: true, force: true };
      if (lenis) {
        lenis.scrollTo(lenis.targetScroll ? 0 : 1, salto);
        lenis.resize();
        const y = aNumero(destino);
        if (y !== null) lenis.scrollTo(y, salto);
      } else {
        cortar();
        const y = aNumero(destino);
        if (y === null) return;
        if (smoother) saltarSmoother(y);
        else objetivoScroll.scrollTo({ top: y, behavior: "instant" });
      }
    }

    // En pausa, scrollTop no pinta: hay que reanudar para colocar el contenido
    function saltarSmoother(y) {
      const enPausa = smoother.paused();
      if (enPausa) smoother.paused(false);
      smoother.scrollTo(y, false);
      if (enPausa) smoother.paused(true);
    }

    // ScrollTrigger primero: refresh puede cambiar el alto de los pines, y resize debe ver ese alto
    function medir() {
      if (ST) {
        ST.clearScrollMemory();
        ST.refresh();
      }
      if (lenis) lenis.resize();
    }

    // --- API ---------------------------------------------------------------------------------------

    function entorno(sub) {
      return { perfil, reducido, lenis, smoother, raiz: enContenedor ? raiz : window, ctx: sub };
    }

    function ejecutarEntrada(e) {
      if (G) {
        e.sub = G.context((self) => { e.limpieza = e.fn(entorno(self)); }, e.ambito);
      } else {
        e.sub = contextoLigero();
        e.limpieza = e.fn(entorno(e.sub));
      }
      revisar();
    }

    function retirarEntrada(e) {
      const limpieza = e.limpieza;
      e.limpieza = null;
      if (typeof limpieza === "function") limpieza();
      if (e.sub) e.sub.revert();
      e.sub = null;
    }

    /**
     * Registra animaciones o efectos. `fn` recibe `{ perfil, reducido, lenis, smoother, raiz, ctx }` y puede
     * devolver su limpieza. Se revierte y se vuelve a ejecutar si cambia el movimiento reducido.
     * `navegar` con `cambiar` la retira, salvo con `{ persistente: true }`.
     * @returns {() => void} Retira solo esta entrada.
     */
    function añadir(fn, { persistente = false, ambito } = {}) {
      if (cerrado) return () => {};
      const e = { fn, persistente, ambito, sub: null, limpieza: null };
      entradas.add(e);
      ejecutarEntrada(e);
      return () => {
        if (!entradas.delete(e)) return;
        retirarEntrada(e);
      };
    }

    /** Vuelve a medir tras cambiar el contenido, en el orden correcto para el perfil. */
    function actualizar() {
      if (cerrado) return;
      if (ST) ST.refresh();
      if (lenis) lenis.resize();
      revisar();
    }

    /**
     * Coloca el scroll al cambiar de vista sin recargar.
     * Sin `cambiar`, la vista nueva ya está en el DOM: corta, mide y coloca de forma síncrona.
     * Con `cambiar` y `montar` hace el ciclo completo: corta, retira las entradas no persistentes,
     * sustituye, coloca arriba, monta, mide y coloca en el destino. Pueden ser asíncronas.
     * @param {number|string|Element} [destino=0]
     * @param {{ cambiar?: () => any, montar?: () => any }} [fases]
     * @returns {Promise<boolean>} `false` si otra navegación la dejó atrás.
     */
    function navegar(destino = 0, { cambiar, montar } = {}) {
      if (cerrado) return Promise.resolve(false);
      const yo = ++turno;
      if (!enContenedor && !historialTomado) {
        const previa = history.scrollRestoration;
        // ScrollTrigger devuelve en cada refresh el valor que leyó al registrarse: hay que reescribirlo después
        const sostener = () => { history.scrollRestoration = "manual"; };
        sostener();
        ST?.addEventListener("refresh", sostener);
        historialTomado = true;
        restaurar.push(() => {
          ST?.removeEventListener("refresh", sostener);
          history.scrollRestoration = previa;
        });
      }
      const paso = (fase, luego) => {
        const r = fase ? fase() : undefined;
        return r && typeof r.then === "function" ? r.then(() => (yo === turno && !cerrado ? luego() : false)) : luego();
      };
      cortar();
      if (cambiar) entradas.forEach((e) => { if (!e.persistente) { entradas.delete(e); retirarEntrada(e); } });
      return Promise.resolve(paso(cambiar, () => {
        if (cambiar || montar) colocar(0); // antes de crear disparadores: con el scroll viejo se activarían
        return paso(montar, () => {
          medir();
          colocar(destino);
          revisar();
          return true;
        });
      }));
    }

    function bloquear() {
      if (cerrado || ++bloqueos > 1) return;
      cortar();
      if (smoother) {
        smoother.paused(true);
        soltarBloqueo = () => smoother.paused(false);
        return;
      }
      const estilos = [];
      const fijar = (el) => {
        estilos.push(recordarEstilo(el, "overflow"));
        el.style.overflow = "hidden"; // en línea: gana a overflow: clip de lenis.css, que llevaría scrollTop a 0
      };
      if (innerWidth > html.clientWidth) { // barra clásica: que quitarla no ensanche el contenido
        estilos.push(recordarEstilo(html, "scrollbar-gutter"));
        html.style.scrollbarGutter = "stable";
      }
      fijar(html);
      if (enContenedor) fijar(raiz);
      if (lenis) {
        lenis.stop();
        if (lenis.options.autoToggle) desplazable.style.overflow = "hidden"; // stop() acaba de escribir clip
      }
      soltarBloqueo = () => {
        if (lenis) {
          lenis.start();
          if (lenis.options.autoToggle) desplazable.style.removeProperty("overflow");
        }
        estilos.reverse().forEach((f) => f());
      };
    }

    function desbloquear() {
      if (bloqueos === 0 || --bloqueos > 0) return;
      soltarBloqueo?.();
      soltarBloqueo = null;
    }

    /**
     * Lleva el scroll a un destino con la herramienta del perfil.
     * @param {number|string|Element} destino
     * @param {object} [o]
     * @param {boolean} [o.inmediato] Salta sin animar. Con movimiento reducido siempre salta.
     * @param {number} [o.duracion] Segundos. Con perfil sin Lenis ni plugin, la duración la pone el navegador.
     * @param {number} [o.desplazamiento] Píxeles sumados al destino, en todos los perfiles.
     * @param {boolean} [o.forzar] Actúa aunque el scroll esté bloqueado.
     * @param {() => void} [o.alTerminar] No se llama si el usuario interrumpe la animación.
     * @returns {boolean} `false` si no se movió: destino inexistente, o bloqueado sin `forzar`.
     */
    function irA(destino, o = {}) {
      if (cerrado || (bloqueos && !o.forzar)) return false;
      const y = aNumero(destino, o.desplazamiento);
      if (y === null) return false;
      const saltar = o.inmediato || reducido;
      const alTerminar = o.alTerminar;
      if (lenis) {
        if (y > lenis.limit) lenis.resize(); // limit puede llevar 250 ms de retraso
        lenis.scrollTo(y, { immediate: saltar, force: o.forzar, duration: o.duracion, onComplete: alTerminar && (() => alTerminar()) });
        return true;
      }
      if (smoother) {
        if (saltar) { G.killTweensOf(viaje); saltarSmoother(y); alTerminar?.(); return true; }
        // Anima la ventana, no smoother.scrollTop: ese tween deja desincronizada la rueda siguiente (O33).
        // La rueda, el toque o una tecla de scroll lo interrumpen, como autoKill de ScrollToPlugin
        const quitar = () => {
          pendientes.delete(quitar);
          window.removeEventListener("wheel", ceder);
          window.removeEventListener("touchstart", ceder);
          window.removeEventListener("keydown", cederTecla);
        };
        const ceder = () => { quitar(); tween.kill(); };
        const cederTecla = (e) => {
          if (TECLAS_SCROLL.has(e.key) && !e.target.closest?.("input, textarea, select, [contenteditable]")) ceder();
        };
        G.killTweensOf(viaje);
        viaje.y = window.scrollY;
        const tween = G.to(viaje, {
          y, duration: o.duracion ?? 1, ease: "power2.inOut",
          onUpdate: () => { window.scrollTo({ top: viaje.y, behavior: "instant" }); ST.update(); },
          onComplete: () => { quitar(); alTerminar?.(); },
          onInterrupt: quitar,
        });
        window.addEventListener("wheel", ceder, { passive: true });
        window.addEventListener("touchstart", ceder, { passive: true });
        window.addEventListener("keydown", cederTecla);
        pendientes.add(quitar);
        return true;
      }
      if (saltar) {
        if (G) G.killTweensOf(objetivoScroll);
        objetivoScroll.scrollTo({ top: y, behavior: "instant" });
        alTerminar?.();
        return true;
      }
      if (G && ScrollToPlugin) {
        G.to(objetivoScroll, { scrollTo: { y, autoKill: true }, duration: o.duracion ?? 1, ease: "power2.inOut", overwrite: "auto", onComplete: alTerminar });
        return true;
      }
      if (alTerminar) {
        if (Math.abs(desplazable.scrollTop - y) < 1) alTerminar();
        else esperarFin(alTerminar);
      }
      objetivoScroll.scrollTo({ top: y, behavior: "smooth" });
      return true;
    }

    // scrollend, con un límite para navegadores que no lo emiten
    function esperarFin(fn) {
      const fin = () => {
        clearTimeout(limite);
        objetivoScroll.removeEventListener("scrollend", fin);
        pendientes.delete(quitar);
        fn();
      };
      const quitar = () => { clearTimeout(limite); objetivoScroll.removeEventListener("scrollend", fin); };
      const limite = setTimeout(fin, 3000);
      objetivoScroll.addEventListener("scrollend", fin);
      pendientes.add(quitar);
    }

    // Un ancla nativa con ScrollSmoother desplaza el wrapper y deja la página rota, y con ScrollToPlugin el dueño es irA
    function alPulsarAncla(e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = e.target.closest?.("a[href]");
      if (!enlace || enlace.hasAttribute("download") || (enlace.target && enlace.target !== "_self")) return;
      const url = new URL(enlace.getAttribute("href"), document.baseURI);
      if (!url.hash || url.href.split("#")[0] !== location.href.split("#")[0]) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el || (enContenedor && !raiz.contains(el))) return;
      e.preventDefault();
      history.pushState(history.state, "", url.hash);
      enfocar(el);
      irA(el);
    }

    // Lo que el navegador hace en un ancla: el siguiente Tab sigue desde el destino, no desde el enlace
    function enfocar(el) {
      enfocando = true;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) { enfocando = false; return; }
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      enfocando = false;
      const quitar = () => {
        pendientes.delete(quitar);
        el.removeEventListener("blur", quitar);
        el.removeAttribute("tabindex");
      };
      el.addEventListener("blur", quitar);
      pendientes.add(quitar);
    }

    function fijarReducido(valor) {
      manual = typeof valor === "boolean" ? valor : null;
      aplicarReducido();
    }

    /** Revierte y destruye en orden. Tras llamarla no queda nada, y se puede volver a iniciar. */
    function salir() {
      if (cerrado) return;
      consulta.removeEventListener?.("change", aplicarReducido);
      while (bloqueos) desbloquear();
      cortar();
      turno++;
      cerrado = true;
      pendientes.forEach((f) => f());
      pendientes.clear();
      entradas.forEach(retirarEntrada); // primero lo que el código añadió: necesita el scroll vivo para revertir pines
      entradas.clear();
      ctx.revert();
      reloj?.();
      if (smoother) {
        const nodo = smoother.content();
        const previo = antesDeSmoother;
        smoother.kill();
        // ScrollSmoother deja un requestAnimationFrame que escribe overflow en content tras cada refresh
        requestAnimationFrame(() => { if (!ScrollSmoother.get()) { nodo.style.overflow = previo; if (!nodo.getAttribute("style")) nodo.removeAttribute("style"); } });
      }
      if (lenis) {
        const nodo = lenis.rootElement;
        lenis.destroy();
        nodo.removeEventListener("transitionend", lenis.onTransitionEnd); // destroy() no lo retira en 1.3.27
      }
      restaurar.splice(0).reverse().forEach((f) => f());
      html.removeAttribute("data-movimiento");
      activos.delete(claveRaiz);
      lenis = null;
      smoother = null;
    }

    // --- Entrada ----------------------------------------------------------------------------------

    marcar();
    if (ST) {
      const previo = ST.defaults({}).scroller;
      const tenia = "scroller" in ST.defaults({});
      if (enContenedor) ST.defaults({ scroller: raiz });
      if (enContenedor || usaSmoother) {
        restaurar.push(() => {
          if (tenia) ST.defaults({ scroller: previo });
          else delete ST.defaults({}).scroller;
        });
      }
    }
    if (usaSmoother) {
      antesDeSmoother = contenido ? contenido.style.overflow : "";
      // ScrollSmoother deja scroll-behavior en línea sobre html y body, y kill() no lo quita
      restaurar.push(recordarEstilo(html, "scroll-behavior"), recordarEstilo(document.body, "scroll-behavior"));
      crearSmoother();
    }
    if (usaLenis) crearLenis();
    if (usaSmoother || (perfil === "gsap" && ScrollToPlugin)) {
      document.addEventListener("click", alPulsarAncla);
      restaurar.push(() => document.removeEventListener("click", alPulsarAncla));
    }
    consulta.addEventListener?.("change", aplicarReducido);

    const api = {
      perfil,
      get lenis() { return lenis; },
      get smoother() { return smoother; },
      ctx,
      raiz: enContenedor ? raiz : window,
      get reducido() { return reducido; },
      añadir,
      actualizar,
      navegar,
      bloquear,
      desbloquear,
      irA,
      posicion,
      fijarReducido,
      salir,
    };
    activos.set(claveRaiz, api);
    revisar();
    return api;
  }

  (window.Plantillas = window.Plantillas || {}).iniciarMovimiento = iniciarMovimiento;
})();
