// Sonido de la página: el tema principal (js/tema.js, datos MIDI) tocado con instrumentos sintetizados
// a la manera de un chip de 16 bits, y los efectos, también escritos como notas.
// Se carga solo si se activa el sonido. El AudioContext se crea dentro de un gesto (requisito del navegador).
// Las notas se programan con el reloj de audio (preciso); gsap.ticker solo despierta al programador.
import { TEMA } from "./tema.js";

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** El motor, sobre cualquier contexto (también OfflineAudioContext, para renderizar y comprobar). */
export function crearMotor(ctx, salida = ctx.destination) {
  // mezcla: música y efectos por separado → compresor suave → filtro de calidez → salida, con una nave de piedra (reverb)
  const master = ctx.createGain(); master.gain.value = 0.9;
  const calidez = ctx.createBiquadFilter(); calidez.type = "lowpass"; calidez.frequency.value = 9500; // el chip del SNES no daba agudos limpios
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(calidez).connect(comp).connect(salida);
  const musica = ctx.createGain(); musica.gain.value = 0.55; musica.connect(master);
  const efectos = ctx.createGain(); efectos.gain.value = 0.7; efectos.connect(master);
  const analizador = ctx.createAnalyser(); analizador.fftSize = 256; analizador.smoothingTimeConstant = 0.7; musica.connect(analizador);
  // reverb: impulso generado (ruido que se apaga en 2,2 s), como una nave de iglesia
  const nave = ctx.createConvolver(), largo = Math.round(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3.2); }
  nave.buffer = ir;
  const humedo = ctx.createGain(); humedo.gain.value = 0.22; nave.connect(humedo).connect(master);
  // ruido blanco compartido (caja, charles, látigo)
  const ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const env = (g, t, a, pico, d, sostener, r, fin) => { // envolvente ADSR sobre un GainNode
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pico, t + a);
    g.gain.setTargetAtTime(pico * sostener, t + a, d);
    g.gain.setValueAtTime(pico * sostener, fin);
    g.gain.exponentialRampToValueAtTime(0.0001, fin + r);
  };
  const osc = (tipo, f, t, fin, destino, detune = 0) => { const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(destino); o.start(t); o.stop(fin + 0.05); return o; };
  const salidaDe = (bus, envio = 0) => { const g = ctx.createGain(); g.connect(bus); if (envio) { const e = ctx.createGain(); e.gain.value = envio; g.connect(e).connect(nave); } return g; };
  const golpeRuido = (t, dur, filtro, f, q, pico, bus, envio = 0) => {
    const s = ctx.createBufferSource(); s.buffer = ruido; const b = ctx.createBiquadFilter(); b.type = filtro; b.frequency.value = f; b.Q.value = q;
    const g = salidaDe(bus, envio); g.gain.setValueAtTime(pico, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); return { b, g };
  };

  // instrumentos: (nota, inicio, duración en s, velocidad 0–1, bus)
  const INSTRUMENTOS = {
    organo(n, t, d, v, bus) { // órgano de iglesia: dos pulsos desafinados y un quinto por encima, con vibrato
      const g = salidaDe(bus, 0.55), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.connect(g);
      const fin = t + d * 0.92; env(g, t, 0.012, 0.17 * v, 0.2, 0.75, 0.09, fin);
      const vib = ctx.createOscillator(), prof = ctx.createGain(); vib.frequency.value = 5.4; prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(9, t + 0.25);
      vib.connect(prof); vib.start(t); vib.stop(fin + 0.15);
      for (const [tipo, mult, det] of [["square", 1, -6], ["sawtooth", 1, 6], ["square", 2, 0]]) { const o = osc(tipo, hz(n) * mult, t, fin + 0.1, lp, det); prof.connect(o.detune); }
    },
    clave(n, t, d, v, bus) { // clavecín: pulso estrecho que se apaga enseguida, sin graves
      const g = salidaDe(bus, 0.25), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500; hp.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc("square", hz(n), t, t + 0.35, hp); osc("sawtooth", hz(n + 12), t, t + 0.2, hp, 4);
    },
    bajo(n, t, d, v, bus) {
      const g = salidaDe(bus), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(300, t + d); lp.connect(g);
      env(g, t, 0.005, 0.26 * v, 0.08, 0.6, 0.05, t + d * 0.85);
      osc("triangle", hz(n), t, t + d, lp); osc("square", hz(n), t, t + d, lp, 3);
    },
    cuerdas(n, t, d, v, bus) { // tres sierras desafinadas que entran despacio
      const g = salidaDe(bus, 0.6), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300; lp.connect(g);
      env(g, t, 0.35, 0.08 * v, 0.5, 0.9, 0.5, t + d);
      for (const det of [-9, 0, 8]) osc("sawtooth", hz(n), t, t + d + 0.6, lp, det);
    },
    campana(n, t, d, v, bus) { // campana tubular: síntesis FM con el índice apagándose
      const g = salidaDe(bus, 0.7); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      const portadora = osc("sine", hz(n), t, t + 2.5, g), mod = ctx.createOscillator(), indice = ctx.createGain();
      mod.frequency.value = hz(n) * 3.5; indice.gain.setValueAtTime(hz(n) * 2.2, t); indice.gain.exponentialRampToValueAtTime(1, t + 2.2);
      mod.connect(indice).connect(portadora.frequency); mod.start(t); mod.stop(t + 2.5);
    },
    bateria(n, t, d, v, bus) {
      if (n === 36) { // bombo: seno que cae de tono
        const g = salidaDe(bus); g.gain.setValueAtTime(0.55 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        const o = osc("sine", 130, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      } else if (n === 38) { // caja: ruido en banda y un tono corto
        golpeRuido(t, 0.16, "bandpass", 1900, 0.8, 0.32 * v, bus, 0.3);
        const g = salidaDe(bus); g.gain.setValueAtTime(0.18 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); osc("triangle", 190, t, t + 0.1, g);
      } else golpeRuido(t, 0.045, "highpass", 7200, 0.7, 0.13 * v, bus); // charles
    },
  };

  // efectos: notas y ruidos cortos, en el bus de efectos
  const nota = (inst, n, t, d, v = 1) => INSTRUMENTOS[inst](n, t, d, v, efectos);
  const pulso = (n, t, d, v = 1, tipo = "square") => { const g = salidaDe(efectos, 0.2); env(g, t, 0.004, 0.14 * v, 0.06, 0.6, 0.04, t + d); osc(tipo, hz(n), t, t + d + 0.06, g); };
  const EFECTOS = {
    inicio(t) { [62, 65, 69, 74].forEach((n, i) => pulso(n + 12, t + i * 0.07, 0.07)); nota("campana", 86, t + 0.3, 1); },
    latigo(t) { // el chasquido: ruido que barre de agudo a medio, con un clic delante
      const { b } = golpeRuido(t, 0.16, "bandpass", 6500, 2.5, 0.5, efectos, 0.3); b.frequency.exponentialRampToValueAtTime(1300, t + 0.14);
      golpeRuido(t + 0.13, 0.05, "highpass", 4000, 0.7, 0.45, efectos);
    },
    vela(t) { golpeRuido(t, 0.22, "highpass", 2500, 0.7, 0.35, efectos, 0.3); nota("campana", 100, t + 0.02, 0.4, 0.5); },
    corazon(t) { pulso(83, t, 0.05); pulso(88, t + 0.06, 0.09); },
    salto(t) { const g = salidaDe(efectos); env(g, t, 0.004, 0.12, 0.08, 0.5, 0.05, t + 0.16); const o = osc("square", 330, t, t + 0.22, g); o.frequency.exponentialRampToValueAtTime(990, t + 0.16); },
    cae(t) { const g = salidaDe(efectos); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); const o = osc("sine", 110, t, t + 0.22, g); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); golpeRuido(t, 0.09, "lowpass", 900, 0.7, 0.25, efectos); },
    acierto(t) { pulso(81, t, 0.06); pulso(86, t + 0.07, 0.12); },
    superada(t) { [74, 77, 81, 86].forEach((n, i) => pulso(n, t + i * 0.08, 0.08)); nota("organo", 81, t + 0.34, 0.7, 0.9); nota("organo", 86, t + 0.34, 0.7, 0.9); nota("campana", 98, t + 0.34, 1, 0.6); },
    fallo(t) { [64, 60, 57].forEach((n, i) => pulso(n, t + i * 0.11, 0.1, 0.9, "sawtooth")); },
    arma(t) { [84, 88, 91, 96].forEach((n, i) => pulso(n, t + i * 0.045, 0.05, 0.8)); },
    golpe(t) { golpeRuido(t, 0.12, "lowpass", 700, 1, 0.5, efectos, 0.3); const g = salidaDe(efectos); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15); osc("square", 70, t, t + 0.16, g); },
    secreto(t) { [72, 76, 79, 84, 88, 91].forEach((n, i) => pulso(n, t + i * 0.06, 0.06, 0.8)); nota("campana", 96, t + 0.4, 1.2, 0.7); },
  };

  // secuenciador del tema: se le pide que programe lo que cae en los próximos 0,25 s
  const paso = 60 / TEMA.bpm / TEMA.pasosPorPulso, ciclo = TEMA.pasos * paso;
  const porPaso = Array.from({ length: TEMA.pasos }, () => []);
  for (const p of TEMA.pistas) for (const [s, d, n, v] of p.notas) porPaso[s].push([p.instrumento, n, d * paso, v / 127]);
  let sonando = false, siguiente = 0, indice = 0;
  function programar(hasta) {
    while (sonando && siguiente < hasta) {
      for (const [inst, n, d, v] of porPaso[indice]) INSTRUMENTOS[inst](n, siguiente, d, v, musica);
      indice = (indice + 1) % TEMA.pasos; siguiente += paso;
    }
  }
  return {
    ctx, analizador, ciclo,
    tocar(desde = ctx.currentTime + 0.08) { if (sonando) return; sonando = true; siguiente = desde; indice = 0; musica.gain.cancelScheduledValues(desde); musica.gain.setValueAtTime(0.0001, desde); musica.gain.exponentialRampToValueAtTime(0.55, desde + 1.2); },
    parar() { if (!sonando) return; sonando = false; const t = ctx.currentTime; musica.gain.cancelScheduledValues(t); musica.gain.setValueAtTime(musica.gain.value, t); musica.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); },
    programar,
    efecto(nombre, t = ctx.currentTime + 0.005) { if (EFECTOS[nombre]) EFECTOS[nombre](t); },
    get sonando() { return sonando; },
  };
}

/** Sonido de la página: un único AudioContext, programado desde gsap.ticker. */
export function crearSonido({ gsap, ctx: dado }) {
  const ctx = dado || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); // la página lo crea en el gesto
  const motor = crearMotor(ctx);
  const tic = () => motor.programar(ctx.currentTime + 0.25);
  gsap.ticker.add(tic);
  const bins = new Uint8Array(motor.analizador.frequencyBinCount);
  // sin pestaña a la vista, el sonido se calla (y no gasta)
  const visibilidad = () => (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
  document.addEventListener("visibilitychange", visibilidad);
  const api = {
    reanudar: () => ctx.resume(),
    /** n niveles 0–1 del tema que suena, de graves a agudos (para el ecualizador) */
    niveles(n) {
      motor.analizador.getByteFrequencyData(bins);
      const out = []; const util = Math.floor(bins.length * 0.7);
      for (let i = 0; i < n; i++) { const a = Math.floor(Math.pow(i / n, 1.6) * util), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * util)); let m = 0; for (let k = a; k < b; k++) m = Math.max(m, bins[k]); out.push(m / 255); }
      return out;
    },
    salir() { gsap.ticker.remove(tic); document.removeEventListener("visibilitychange", visibilidad); ctx.close(); },
  };
  // con los descriptores, no con «...motor»: el reparto copiaría «sonando» congelado en su valor de ahora
  return Object.defineProperties(api, Object.getOwnPropertyDescriptors(motor));
}
