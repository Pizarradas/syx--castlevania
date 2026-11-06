# Super Castlevania IV · «belmont»

Homenaje visual no oficial a *Super Castlevania IV* (Konami, Super Nintendo, 1991), construido como **app que consume SYX** (tema base `example-01`), con la skill de **grid-system** para la composición, la skill de **GSAP + Lenis** para el movimiento y **three.js** con un castillo modelado en **Blender 5.2** (bpy) para el hero y el final.

Abrir `index.html` con un servidor local (`python3 -m http.server`); no depende de ninguna CDN.

## Estructura

```
index.html            marcado (SYX: atom-btn, atom-pill, atom-stat, atom-table, mol-card, mol-disclosure)
css/syx.css           SYX v5.0.0 compilado, tema example-01 (sin tocar)
css/belmont.css       1) override de tokens semánticos  2) tokens --belmont-*  3) @layer syx.app
js/orquestador.js     plantilla de la skill GSAP+Lenis (sin tocar)
js/belmont.js         escenas; todo entra por mov.añadir()
js/escena.js          escena three.js: castillo, luna, lluvia (shader), murciélagos instanciados, bruma, relámpagos y derrumbe
js/syx-colors.js      colores del canvas y de la escena resueltos desde los tokens de SYX
models/iconos.glb     armas secundarias y carne asada en 3D
models/castillo.glb   castillo gótico sobre acantilado, 155 piezas (Blender 5.2, bpy procedural; el .blend está en tu carpeta)
vendor/               gsap 3.15.1 · ScrollTrigger · SplitText · lenis 1.3.27 · three 0.187.0 (+ GLTFLoader)
fonts/                UnifrakturMaguntia, Cinzel, EB Garamond, Press Start 2P (woff2, OFL)
movimiento.perfil     gsap+lenis
```

## Identidad «belmont» (gótica)

Casi negro violáceo, pergamino, sangre de buey, latón de vela y luna fría, en OKLCH sobre los roles semánticos de SYX (`--semantic-color-*`). Dark-only, radios a cero. Fraktur (UnifrakturMaguntia) en los titulares, Cinzel en los títulos de componente, EB Garamond para leer y Press Start 2P para el HUD. Arco apuntado (clip-path de dos arcos de 60°) en el arte de fases y armas, doble filete interior en las tarjetas, cruz ✠ como ornamento y separador, sangre que gotea bajo el hero, grano de película, viñeta y una luz de vela que sigue al puntero.

## 3D (three.js + Blender)

- Reloj único: la escena no tiene bucle propio; `gsap.ticker` llama a `escena.dibujar(t)` (perfil gsap+lenis, `cmb-reloj`; `fra-canvas-webgl`: un render por tick).
- Solo dibuja cuando el hero o el final están en pantalla; al salir libera geometrías, materiales, texturas y contexto.
- Hero fijado (+140 %): la cámara hace *dolly* hacia el castillo (nunca *roll*, motion/blender §4). Final: el castillo se desmorona pieza a pieza y la niebla vira a un amanecer de sangre.
- Relámpagos: como mucho 2 destellos por segundo (WCAG 2.3.1).
- Halos con sprites aditivos, no con posproceso: el EffectComposer devolvía un búfer vacío en Chrome headless, y así no depende de render targets flotantes.
- Calidad adaptativa: si 30 fotogramas seguidos superan 40 ms, baja la resolución.
- Mejora progresiva: sin WebGL 2 se queda el castillo en SVG y el cielo en canvas 2D; con movimiento reducido, un fotograma quieto.

## Movimiento (perfil `gsap+lenis`)

`decidir.py pin pista-horizontal parallax scrub secuencia texto svg scroll-suave canvas-dom modal arrastre` → **gsap+lenis**. `auditar_proyecto.py`: 0 bloqueantes, 0 avisos.

### Quién hace qué

| Necesidad | Dueño | Por qué |
|---|---|---|
| Inercia de la rueda, anclas, posición | **Lenis** | El encargo pide scroll suave en toda la página; Lenis no envuelve el marcado y convive con `sticky`/`fixed` (HUD, lienzo 3D) |
| Bloqueo (intro, sala secreta) | **Lenis** (`mov.bloquear()` → `lenis.stop()`) | cmb-modal: es el único que para rueda y AvPág |
| Reloj (Lenis, three.js, canvas, ecualizador, candelabro) | **gsap.ticker** | Un solo reloj (O01, cmb-reloj) |
| Pines, tramos laterales, parallax, escenas por scroll | **GSAP ScrollTrigger** con `scrub: true` | Lenis ya suaviza; un `scrub` numérico sería doble suavizado (O16) |
| Secuencias, rebotes, caídas, latigazos | **GSAP** timelines | Coordinación y eases (bounce, elastic, back) |
| Hover, foco, parpadeo de velas, acordeón | **CSS / HTML nativo** | No necesitan biblioteca (`transicion-simple`) |
| Descartados | ScrollSmoother (A3, dos suavizados), `scroll-snap` mandatory (O11), lenis/snap y snap de ScrollTrigger (no hacen falta), Draggable/Observer (apuntar con el puntero basta) | |

### Ritmo: vertical ↔ lateral

| # | Tramo | Eje | Técnica |
|---|---|---|---|
| 1 | Hero 3D | vertical fijado | dolly three.js hacia el castillo de Blender |
| 2 | Prólogo | vertical | palabras que se encienden |
| 3 | El látigo | vertical | **jugable**: apunta en 8 direcciones (ratón o flechas) y azota (clic o Intro) |
| 4 | Once fases | **lateral** | pista con `pin` + `containerAnimation` |
| 5 | El candelabro (fase 6) | vertical fijado | **jugable**: la lámpara se balancea con el scroll; rompe las 5 velas, caen corazones, una daga y una llave. Tres planos de profundidad (vitrales, columnas, cortinas) |
| 6 | El bosque (fase 2) | **lateral** | cinco planos de parallax (montañas, bosque lejano, medio, río, primer plano); plataforma que se hunde y tronco que se balancea |
| 7 | Modo 7 | vertical fijado | suelo que gira + sala cilíndrica |
| 8 | Arsenal | **lateral** | galería con profundidad: las cartas giran en Y y avanzan en Z al pasar |
| 9 | La torre del reloj (fase A) | vertical **inverso** | bajar el scroll hace subir la torre: engranajes en tres profundidades con giro según sus dientes, péndulo, agujas y plataformas |
| 10 | Muro secreto | vertical | **jugable**: tres latigazos, cae el muro, carne asada (vida llena) y sala secreta en `<dialog>`; si cogiste la llave del candelabro, el cofre se abre |
| 11 | Música, ficha | vertical | ecualizador por velocidad del scroll |
| 12 | Final | vertical fijado | el castillo 3D se derrumba al amanecer |
| — | Código de Konami | toda la página | ↑ ↑ ↓ ↓ ← → ← → B A: modo sangre y 99 corazones |

Los corazones y la puntuación del HUD suman lo que recoges.

## Acabado gráfico

- **Castillo (Blender 5.2):** ventanas en arco apuntado con marco hundido, viaducto de arcos góticos (booleanas) con pretil almenado, bisel en toda la piedra para que los bordes cojan la luna, cruces de remate, árboles muertos en la ladera.
- **three.js:** piedra procedural en el shader (sillares con juntas, tejas, vetas de roca, rugosidad variable) sin texturas en el GLB; sombras de la luna; estrellas que titilan; nubes y niebla baja en movimiento; haces de luz; rayo visible en cada destello; ascuas en el derrumbe; luna con cráteres.
- **2D:** candelabro en oro con degradados SVG, cirios con llama animada, haces de luz desde los vitrales y polvo en suspensión; bosque con luna, dos bancos de niebla y luciérnagas; engranajes de hierro con reflejo dorado.

## Iconos 3D

`models/iconos.glb` (Blender 5.2, bpy): daga, hacha, agua bendita, cruz, cronómetro y carne asada, con oro, acero, cuero, vidrio y gemas. Un **solo lienzo WebGL fijo** (`js/iconos.js`) dibuja cada objeto en el hueco de su tarjeta con *scissor*, en vez de un contexto por tarjeta. Giran solos, se aceleran con la velocidad del scroll, se pueden **arrastrar con inercia** (o girar con las flechas si tienen el foco) y crecen al pasar el puntero. Reflejos con un entorno de estudio (RoomEnvironment + PMREM). Sin WebGL se ven los iconos SVG.

## GRID SPEC — belmont

```
Contexto       : web, mobile first · homenaje editorial muy visual · expresividad experimental
Tipografía     : titular Fraktur «Castlevania» = 4.659em → 21.46cqi · cuerpo EB Garamond 400 (xh 0.405, char 0.374em es) · 18→22 px / 1.556 · medida 70 car. reales = 27.567em
                 titular Cinzel 900 · «CASTLEVANIA» = 7.484em medido con kerning → 13.36cqi
Densidad       : uso reading · densidad default · razón de cadena 2
Cadena         : micro 4 · inner 8 · padding 14→18 · gutter 16→36 · margen 16→120 · sección 112→144
Retícula base  : 6 col. en uso (<64em) / 12 col. (≥64em) · gutter clamp(1rem, .5833rem + 1.8519vw, 2.25rem)
                 margen clamp(1rem, -1.1667rem + 9.6296vw, 7.5rem) · máx. 1440 (col. 67 px, col/gutter 1.86)
Proporciones   : escala tipográfica 1.5 (5 pasos) · compuesto 3 + 4 sobre 12
Operadores     : O2 compuesto 3+4 (líneas d3-*, d4-*) · O6 ritmo euclídeo E(5,11) en las fases (acentos 1,4,6,8,A)
                 · O9 retícula polar 360/8 (rosa del látigo)
Invariantes    : orden DOM = orden de lectura · prosa ≤ 27.567em · columna ≥ 1.5 × gutter
Ruptura        : numeral «IV» → de la línea d3-2 a full-end (sangra fuera del margen); solape de 1 módulo con el titular
Transformación : <64em 6 col. (líneas d2/d3) · ≥64em 12 col. con nombres · tamaños continuos con clamp()
Validación     : C2 sin scroll horizontal a 320 ✓ · C5 media 54 (768) y 50 (1440), máx. 75 ✓; a 320 la media
                 baja a 35 car. (límite físico del ancho: 42.8 car. a toda la caja) · C6 ✓ · C10/C13 ✓ (perfiles SHA-1)
                 · C11 ✓ (gridcalc sin avisos de orden) · C12: párrafos a 0.75lh
```

## SYX

- `syx-scan`: 0 alta · 0 media · 42 baja (todas `position` en CSS plano, marcadas) (`position` en crudo: en CSS plano no hay mixins; son capas escénicas y el HUD).
- Ninguna regla pinta clases de SYX; las tarjetas y la tabla se recolorean escribiendo sus `--component-*` en el contexto (CONSUMING §6).
- Pieza candidata a SYX: un HUD/indicador de progreso decorativo (`belmont-hud`).

## Sin verificar

Toque real, iOS y Safari (la skill GSAP+Lenis tampoco los tiene medidos). Probado en Chrome 1440×900, 960×600, 390×844 y 320, con `prefers-reduced-motion` y sin WebGL. La escena 3D se probó con WebGL por software (SwiftShader): las cifras de rendimiento en una GPU real están sin medir.

---

Homenaje no oficial. Castlevania es marca de Konami. Las ilustraciones son originales.
Diseñado y desarrollado por José Luis Pizarro.

## Pruebas, criaturas, luz y ejes (v6)

- **Pruebas jugables** (`prueba()` en `js/belmont.js`): látigo (derribar 6 murciélagos apuntando en 8 direcciones), candelabro (saltar 3 veces cuando la aguja está en la franja) y torre del reloj (detener la aguja dorada en las XII, 3 veces y cada vez más rápido). Al superarlas se abre la explicación siguiente (bloque `data-sealed`, `inert` hasta abrirse) y el scroll la trae si no está a la vista. «Saltar prueba» la abre siempre.
- **Criaturas** (`js/criaturas.js`): tres calaveras que persiguen al puntero con retraso y castañetean con la velocidad; arañas que bajan con el scroll (scrub), se balancean con la velocidad de Lenis y huyen del puntero; ojos que parpadean en el bosque, las fases y el final.
- **Luz**: relieve de sillares por derivadas, regueros de lluvia, borde de luna (fresnel), brasa roja desde el abismo, ventanas que se apagan y dejan ver ojos rojos; iconos con vela temblorosa, contraluz de luna y menos entorno.
- **Ejes X, Y, Z**: tarjetas que se inclinan hacia el puntero (propiedades CSS `rotate`/`translate`, que se suman a las transformaciones de GSAP), titulares que se levantan en X, fases que llegan desde el fondo en Z y la tarjeta del Modo 7 que da la vuelta entera en Z.
- **Tipografía**: HUD en Tiny5 (mayúsculas acentuadas correctas, a 16 px nítido), titulares enteros en Fraktur y la C de «Castlevania» sin recortes.

## Rutas narrativas y capas (v7)

- **Rutas que cuentan algo** (`js/rutas.js`, MotionPath + getPointAtLength, scrub sobre Lenis): la sangre del castillo baja serpenteando por el prólogo (el reguero va detrás del texto, la gota delante); en el mapa de las once fases una senda une los hitos por detrás de las tarjetas y Simon la recorre por delante encendiendo cada fase; en la torre Simon salta de plataforma en plataforma mientras la torre baja a su alrededor y los engranajes cercanos (desenfocados) le pasan por delante; en el final el murciélago de Drácula huye del derrumbe hacia la luna que cae.
- **Capas**: las secciones aíslan su contexto (`isolation: isolate`) para que haya un plano detrás del texto (z −1) y otro delante (z 3). Arañas en dos planos (pequeñas y nítidas detrás, grandes y desenfocadas delante), telarañas y niebla de primer plano con parallax más rápido que la página.
- Fuera las calaveras que seguían al cursor.

## Modo prueba y cazador 3D (v8)

- **Modo prueba**: al llegar a cada prueba el scroll se detiene (`mov.bloquear`) y su panel queda fijo abajo (se lleva al `body` mientras dura, para que `position: fixed` no quede atrapado en una tarjeta con transform). Espacio o Intro juegan, Esc salta y la rueda avisa de que hay una prueba en curso. Al superarla se libera el scroll.
- **Más claras y más justas**: el látigo se juega con la rosa enfocada (flechas + Espacio o clic sobre el murciélago); el candelabro acierta a ±10° y se balancea más despacio; en la torre la tolerancia es de ±16°, va más lenta y las agujas que no cuentan se apagan mientras dura la prueba, con las XII brillando cuando la aguja dorada pasa por ellas.
- **Ventanas bajas** (≤ 760 px): rosa al 64 % del alto y tarjetas fijadas compactas.
- **El cazador** (`models/cazador.glb`, Blender 5.2 con bpy; `.blend` en la carpeta del proyecto): personaje original encapuchado, con abrigo largo deshilachado y forro rojo, esclavina, hombreras, cinturón con cruz y látigo de cadena. Sustituye a la silueta en la cornisa del candelabro, en el mapa de fases y en la torre; lo pinta el mismo lienzo WebGL de los iconos (modo «figura»: mira hacia donde avanza, de tres cuartos).

## Jugado como usuario (v9)

- **Látigo**: los murciélagos aguantan 6 s (9 con movimiento reducido); si uno escapa cuenta como fallo y aparece otro, así que azotar a ciegas no basta. Quitado el rótulo «ahora», que confundía.
- **Torre del reloj**: un fallo bloquea el botón 0,8 s («te pasaste · espera»), para que no se gane machacando la tecla.
- **Al ganar**: 1,5 s de gracia en los que Espacio no desplaza la página; se baja a la explicación desbloqueada sola.
- **Activación**: una prueba solo empieza si su escena está a la vista y no se pasa por ella a toda velocidad; al recargar se empieza arriba (`scrollRestoration = "manual"`), para que no se active a media página.
- **Panel de prueba**: en pantallas anchas va a la esquina inferior derecha para no tapar la rosa; los titulares de escenas fijadas ya no se ocultan al volver hacia arriba.
- Comprobado de principio a fin: látigo 6/6, candelabro 3/3 → velas, reloj 3/3, muro (3 golpes → premio → sala secreta → Esc libera el scroll) y Konami.

## La carta y el cuaderno del cazador (v10)

- **El prólogo es una carta** de los ancianos de la villa a Simon, fechada en la víspera de Todos los Santos de 1691: pergamino con los bordes roídos, letra IM Fell English (imprenta del XVII), capitular en Fraktur y una posdata que cuenta qué es *Super Castlevania IV*. Se escribe mientras bajas: cada renglón aparece bajo la pluma (máscara que avanza con el scroll, SplitText `autoSplit` para que se rehaga al cargar las fuentes o cambiar el ancho) y la pluma sigue la punta de la escritura. Al firmar cae el lacre, y el reguero de sangre del castillo baja por el margen y acaba justo en él. Con movimiento reducido la carta ya está escrita.
- **Cuaderno del cazador** (`js/bocetos.js`): las arañas y telarañas son ahora láminas a tinta y sanguina al modo de Leonardo (dos pasadas de la mano, sombreado de zurdo en diagonal, ejes de proporción, lupas de detalle) que se trazan al entrar su sección y se borran al salir (`stroke-dashoffset` con `pathLength = 1`, scrub). Cada una lleva una nota en escritura especular que se escribe de derecha a izquierda y su traducción legible al pie, y cuenta algo de su sección:
  - Lám. I, el murciélago, junto a la prueba del látigo: «apunta adonde vuela, no adonde está» (la pista para ganarla).
  - Lám. II, la araña de la cripta, sobre el mapa de las fases.
  - Lám. III, la telaraña sobre la esquina del muro hueco: «donde hay telaraña, nadie ha pasado». Se va cuando rompes el muro.
  - Lám. IV, el órgano de la capilla, en la banda sonora.
  - Lám. V, la calavera en sección, en la ficha del cartucho.
- Van en los márgenes y detrás del texto (salvo la telaraña del muro, que no recibe el puntero); en móvil quedan pequeñas y tenues en una esquina, sin notas.

## Mapa de niveles (v11)

- **Las once fases son la pantalla del mapa** (`js/atlas.js`): Transilvania dibujada a tinta con la misma mano que el cuaderno del cazador (montañas, luna, río, bosque, cueva, la mansión, la muralla y las torres del castillo, rosa de los vientos y rótulo). La mano traza el mapa mientras llegas a él.
- La sección se fija y el scroll lleva al cazador 3D por el camino, de la verja (1) al trono (B). La cámara entra de lejos, se acerca a él y lo sigue, y al final se aleja para enseñar el viaje entero. El camino se tiñe de sangre a su paso, cada hito se enciende al llegar y un cartucho de pergamino, arriba a la izquierda, cuenta qué hay en esa fase. El HUD marca la fase en curso.
- Las fases siguen en el HTML como lista ordenada (los cartuchos): se leen enteras con lector de pantalla. Con movimiento reducido el mapa está completo y quieto, y las fases van en rejilla debajo.

## El cazador con personalidad (v12)

- **Modelo** (`models/cazador.glb`, `cazador_v2.blend`): sombrero de ala ancha ladeado con chulería (ala levantada a un lado, cinta roja, hebilla y pluma) en lugar de la capucha, cabeza, manos y botas más rotundas, ojos rasgados hacia dentro, dos colas de bufanda y pose de reposo con contrapposto.
- **Esqueleto de empties** (`rig_cadera`, `rig_torso`, `rig_cabeza`, `rig_pierna_i/d`, `rig_hombro_i/d`, `rig_bufanda`) que `iconos.js` anima a mano sumando giros a la pose de reposo:
  - anda con zancada, braceo, rebote y torso adelantado cuando avanza (en el mapa se lo dice `atlas.js`, porque allí la cámara lo sigue);
  - en el aire encoge las piernas y abre los brazos (los saltos del candelabro y de la torre);
  - quieto respira, carga el peso de una pierna a otra, echa vistazos y, si el puntero está cerca, lo mira;
  - parpadea, la bufanda ondea con el paso y cada pocos segundos se toca el ala del sombrero a modo de saludo.

## El bosque, prueba a prueba (v13)

- Las tres tarjetas del bosque (fase 2) son ahora pruebas jugables, dentro de la misma pista lateral con sus planos de parallax. Cada una se activa cuando su tarjeta llega al centro (ScrollTrigger con `containerAnimation` sobre la timeline del bosque): la pista se para y el cazador 3D juega dentro de la tarjeta. Al superarla se abre su explicación y se sigue bajando.
  - **2-1 · Plataformas que se hunden**: cuatro troncos que suben y bajan; salta cuando el siguiente asoma. Si saltas a uno sumergido, o te quedas más de tres segundos sobre el que pisas, al agua y vuelta a la orilla.
  - **2-2 · Troncos colgantes**: salta al tronco cuando llegue a tu orilla y te lleva a la otra; tres cruces, cada uno más rápido. A destiempo, al barranco.
  - **2-3 · La primera anilla**: el cazador va y viene por el borde; engancha el látigo cuando está bajo la anilla y suéltalo en lo alto del balanceo, hacia delante. Si sueltas a destiempo, caes y empiezas otra vez.
- Mientras se juega, el plano cercano de árboles se aparta (más transparente) para no tapar la prueba. La pista tiene margen final para que la última tarjeta también llegue al centro.

## Modo 7 jugable y tarjetas quietas (v14)

- **Prueba del Modo 7**: al llegar a la sala, el cazador queda colgado del látigo en el centro y la sala entera (suelo y pilares) se voltea a su alrededor, empujando a un lado y a otro cada vez con más fuerza. Contrarréstala con ← y → (o manteniendo pulsados los botones ⟲ ⟳): cada segundo y medio nivelada (±12°) cuenta, tres para superarla. Si la dejas volcar pasados 75°, empiezas otra vez. Al superarla la sala vuelve a su sitio y se abre la explicación de la fase 4.
- **Tarjetas de información sutiles**: fuera la inclinación con el puntero en todas las tarjetas, el volteo de la tarjeta del Modo 7, el giro en Y del arsenal y el volteo de los titulares. Ahora las tarjetas solo aparecen con un ligero ascenso y se leen quietas; el movimiento queda en las escenas.

## Arsenal: equipa al cazador (v15)

- **Prueba del arsenal**: el armero (las cinco armas en 3D, como botones) a un lado y el campo de pruebas al otro, con el cazador, un esqueleto en el suelo y un murciélago en lo alto. Arrastra cada arma hasta el cazador (ratón o táctil; con teclado, enfócala y pulsa Intro) y verás su efecto:
  - **Daga**: recta y a la altura de la mano contra el esqueleto (`x = x₀ + v·t`).
  - **Hacha**: tiro parabólico que pasa por el murciélago (`y = y₀ − v·t + ½·g·t²`).
  - **Agua bendita**: arco corto, se rompe y deja llamas que queman al esqueleto.
  - **Cruz**: bumerán que frena, vuelve a la mano y golpea a la ida y a la vuelta (`v = v₀ − a·t`).
  - **Cronómetro**: congela a los enemigos (la escena se queda en frío) mientras el cazador sigue.
  Cada vez, la ficha explica cómo funciona por dentro. Con las cinco equipadas se abre la nota de los corazones y los multiplicadores.
- El panel de esta prueba se queda en su sitio (`enLinea`) para no tapar la ficha. Los iconos 3D del armero no giran al arrastrarlos (`data-icon3d-fijo`): el arrastre es para equipar.

## Revisión sección por sección (v16)

Recorrida la página entera con la rueda, como un usuario, en 1440×800, 1280×640 y móvil (390×844, táctil), midiendo en cada prueba si su zona de juego se ve entera y si el panel la tapa, y jugándolas todas.

- **CSS recuperado**: en la v15 se borró por error un bloque grande de estilos (música, ficha, final y escenas jugables); está restaurado.
- **Látigo**: las flechas funcionan como una cruceta (cada una apunta a su lado, dos a la vez dan la diagonal) en vez de girar paso a paso; en táctil el toque apunta y azota a la vez (antes, sin puntero que se moviera, azotaba hacia donde no era). Instrucciones más claras.
- **Bosque**: cada prueba se activa con la tarjeta centrada (se corrige el fotograma que la pista se pasaba, que en móvil dejaba media tarjeta fuera) y su panel se queda dentro de la tarjeta, sin confundirse con los de las otras.
- **Arsenal**: al empezar, la zona de juego se coloca justo bajo el HUD (antes quedaba tapada arriba). Un clic suelto también equipa.
- **Torre del reloj**: la aguja va más despacio (90, 120 y 150 °/s: ventanas de 0,36 a 0,21 s) y el cazador espera de pie en la plataforma al empezar, en vez de estar fuera de la vista.
- **Avisos según el dispositivo**: en táctil no se habla de Espacio ni de Esc; cada prueba dice su control («← → para nivelar», «arrastra las armas al cazador», «toca cada murciélago»…).

## v17 · Nueve correcciones

1. **El "IV" se lee**: numeral en Cinzel 900, relleno de sangre con trazo oscuro y sombra.
2. **Separador de sangre animado**: gotas que se forman, se estiran y caen (filtro *goo* + degradado y brillo); solo se anima mientras está a la vista.
3. **Tras los murciélagos**: la rosa queda marcada como dominada y aparece «Lo que acabas de aprender · sigue bajando».
4. **Candelabro**: la aguja vuelve a oscilar (choque de nombres entre el objeto de estado y el nodo DOM); saltar fuera del centro falla.
5. **Río**: al superar cada prueba el scroll lleva solo a la siguiente card (y al final, fuera del bosque), luciendo el parallax horizontal.
6. **Modo 7**: indicador «Nivel de la sala» con franja dorada y anillo de aguante; el cazador cuelga de la cuerda.
7. **Armamento**: enemigos en boceto Da Vinci (hombre lobo, vampiro, murciélago) con trayectorias trazadas y fichas técnicas que aparecen según equipas cada arma.
8. **Nuevo cazador**: base *KayKit Character Pack: Adventurers* (Rogue) de Kay Lousberg, licencia **CC0**, retocado (sombrero con pluma, embozo rojo, látigo, paleta sangre/cuero/oro). 12 animaciones (Idle, Walking, Running, Jump, Throw, Cheer…) mediante AnimationMixer. En la torre del reloj pisa las plataformas visibles y solo salta en el tercio central del recorrido.
9. **Final**: fuera los ojos flotantes.

## v18 · Grimorio, hierro y Modo 7

- **Sombrero** encajado en la cabeza del cazador (ala a la altura de la frente, copa envolviendo el pelo, ligeramente ladeado).
- **IV** en *New Rocker* (gótica de remates afilados, legible como número romano).
- **Candelabro 3D** procedural (three.js): corona de hierro forjado con púas, cadenas, brazos en voluta, velas que gotean y luz de vela que parpadea. Gira despacio sobre su eje; las velas clicables (botones HTML) se recolocan sobre la mecha proyectada en cada fotograma y, al romperlas, queda el cabo apagado.
- **Modo 7** como en la fase 4: una sola capa de fondo con la sala entera en tiles (sillares, púas, ventanas rojas, antorchas, cadenas) que gira y escala alrededor del anillo del látigo, pintada a baja resolución y sin suavizado para que se vean los dientes de sierra de la consola.
- **Bocetos de grimorio**: tramas de grabado que modelan la luz (tinta clara sobre papel negro), contornos cargados, hondos de tinta en órbitas y fauces, líneas ocultas y rótulos latinos. Rehechos: calavera (con sello «Memento mori»), hombre lobo, vampiro y el estudio del ala del murciélago.
- **Torre del reloj**: el cazador apoya los pies sobre la plataforma (el centrado lo pone GSAP con xPercent/yPercent).

## v19 · Monitores anchos, calco de maniquíes y enhorabuena

- **Paneles de prueba**: al saltar a la esquina, el panel deja en la tarjeta un hueco del mismo alto («Prueba en curso · el panel está abajo a la derecha»): la tarjeta ya no da un salto ni los controles pasan por encima del texto.
- **Sellos del bosque**: el texto suelto se envuelve para que se difumine bajo el rótulo «Sellado» (antes el rótulo quedaba encima de texto nítido).
- **Monitores ultraanchos**: el HUD, el panel de la prueba, el indicador del Modo 7 y el cartucho del mapa se alinean con el borde del contenido (máx. 1440) en vez de irse a la esquina de la pantalla. En el bosque, cada prueba ocupa su propio tramo (separación de hasta ~62vw), así el parallax horizontal se aprecia a cualquier anchura.
- **Lienzo 3D**: respeta lo que el HTML oculta o recorta (visibility/opacity y el overflow de la escena fijada): ya no aparece el cazador de la torre del reloj flotando sobre el armamento.
- **Armamento**: la zona donde se suelta el arma era, por un selector global, la primera vela del candelabro; ahora es la del campo de pruebas. Al equipar, el cazador lanza, se vuelve hacia quien mira y celebra (dos veces con la última arma), con un «¡DAGA!» / «¡ARSENAL COMPLETO!» sobre la cabeza.
- **Bocetos calcados de maniquíes**: el hombre lobo, el vampiro y el murciélago se dibujan sobre maniquíes low poly «esculpidos» con funciones de distancia (tools-ref/modelos.html, raymarching con unión suave). De ellos salen la silueta, lo que tapa a qué y la trama de luz (tools-ref/calcar.py → js/bocetos-ref.js); el pelo, las garras, los ojos, las fauces y los rótulos van a mano. Los maniquíes no se ven en la página.

## v20 · La torre del reloj en 3D

- **torre3d.js** (three.js, procedural): engranajes de hierro y latón con dientes, radios, cubo y remaches; la esfera de bronce ennegrecido con números romanos, el lema «TEMPVS FVGIT · MORS VENIT», una calavera grabada y el vidrio roto; agujas recortadas (la del juego, dorada, se enciende al pasar por las XII); el péndulo de hierro y latón; vigas de madera vieja con bandas y escuadras de hierro; cadenas al fondo; luz de luna fría, el resplandor de la esfera y una lámpara de aceite que oscila.
- No sustituye a la escena HTML: la **lee** cada fotograma (posición, tamaño y giro de cada pieza, que siguen animando el scroll y la prueba) con una cámara en perspectiva calibrada para que el plano z = 0 coincida con la página. Las plataformas 3D están exactamente donde pisa el cazador; los engranajes del fondo conservan su sitio en pantalla pero reciben otra luz y la niebla. Los engranajes del primer plano siguen siendo siluetas desenfocadas en SVG.

## v21 · Pluma 3D, papel, un solo cazador en el bosque y plumilla fina

- **Pluma 3D** (pluma3d.js): pluma negra de cuervo (barba con textura y roturas, cálamo translúcido, plumín de hierro con tinta) que se apoya inclinada sobre el papel y proyecta su sombra real (luz de vela arriba a la izquierda). La mano escribe con bucles y se despega entre palabras; al cambiar de renglón se levanta y vuelve en arco; al cambiar de párrafo sube más y titubea. La sombra se separa de la punta al alzarla.
- **Papel**: fibras (ruido SVG), dos dobleces, cerco de un vaso, mancha de cera y bordes tostados. La capitular ya no se recorta (el renglón tiene sitio para la máscara).
- **Bosque**: un solo cazador. Al superar o saltar una prueba celebra, salta en arco hasta la tarjeta siguiente mientras avanza la pista y aterriza; en la última sale por la derecha. El plano cercano de árboles pasa por detrás de las tarjetas.
- **Textos**: revisión de desbordes de 360 a 2543 px (fichas de armas, titulares estrechos, estado de las pruebas). Las fórmulas del campo de pruebas llevan halo y no se salen del campo; las viejas se apagan.
- **Monstruos a plumilla**: trazos cortos y paralelos en diagonal (de zurdo, como Leonardo), el tono por capas casi paralelas y siluetas de varias líneas finas que buscan la forma, siempre calcadas de los maniquíes de tools-ref.

## v22 · El bosque en 3D, con tormenta

- **bosque3d.js** (three.js, procedural): cielo de tormenta con nubes de ruido que corren, la luna con cráteres y halo tras dos capas de nubes, tres cordilleras low poly de crestas afiladas, el suelo, el río que refleja la luna, árboles muertos retorcidos (cinco variantes ramificadas, instanciadas a tres profundidades), ojos rojos que parpadean entre los troncos y lluvia en diagonal.
- **Rayos**: cada 5-11 s, un rayo quebrado con ramales cae al fondo con dos destellos encadenados (≤ 3 por segundo, WCAG 2.3.1) que iluminan nubes, paisaje y lluvia; el trueno llega después, según la distancia, y sacude 2 px la escena. El sonido del trueno es opcional: botón «Truenos: no / sí» en la esquina del bosque (WebAudio, ruido marrón filtrado; nada suena sin pulsarlo).
- La cámara se desliza con la pista del bosque: el parallax sale de la perspectiva. Las tarjetas, las pruebas, las luciérnagas y el cazador siguen siendo HTML por delante. Sin WebGL quedan los planos dibujados de antes; con movimiento reducido, la escena es estática y sin rayos.

## v23 · El gran salón en 3D y las velas a latigazos

- **salon3d.js**: muro de sillares con cuatro ventanales de arco apuntado (tracería, parteluz, óculo y vidrio emplomado que se enciende con el rayo), la tormenta al otro lado (nubes que corren, la luna velada, lluvia y rayos que caen a lo lejos), haces de luz que entran por los ventanales, columnas de haces en dos profundidades, suelo de losas y cortinas de terciopelo que se mecen. La cámara entra en el salón con el scroll (el zoom de antes, ahora con perspectiva).
- **Velas**: el cazador azota desde su repisa (animación de ataque), el látigo se estira hasta la vela siguiendo el balanceo de la lámpara y, al chasquear, la vela se rompe y suelta su objeto.
- **Rendimiento**: las escenas 3D pesadas (pluma, candelabro, salón, bosque, torre) se construyen cuando su sección está a vista y media, no al cargar la página; las nubes del bosque se generan a menor resolución.

## v24 · El final: el castillo estalla y amanece

- **Escena final** (escena.js): el castillo tiembla y se enciende de oro por dentro; al estallar, un fogonazo y las piezas salen despedidas hacia fuera y hacia arriba desde su corazón, se frenan en el aire, caen y se desvanecen. Después se hace de día: el cielo pasa del amanecer de sangre al azul con el sol saliendo por la izquierda, escampa, se apagan las estrellas, la luna se pone, las nubes se aclaran y los murciélagos huyen.
- **El cazador** está dentro del castillo desde el principio (no se ve mientras sigue en pie); aparece en el centro de la plataforma en el instante del estallido, levanta el puño (dos veces) en el instante del estallido con un resplandor de triunfo y se queda en el centro de la plataforma. Su posición se calcula proyectando la cima del modelo 3D en cada fotograma.
- El texto del final sube al cielo para dejar libre la cima, con sombra para leerse sobre el día.
- **Bosque**: mientras el cazador vuela de una tarjeta a otra, el de la tarjeta de destino no aparece hasta que aterriza (ya no se ven dos a la vez).
- **Corrección (v26)**: el cazador del final vive en el body (al soltarse el pin, su posición fija ya no se desplaza) y se oculta cuando el pie de página le tapa los pies; al acabar un gesto repetido (dos «Cheer») vuelve fundido al reposo en vez de quedarse en la pose en cruz.

## v27 · Aterrizaje a salvo, torre sin huecos y amanecer de primavera
- Modo 7: al ganar, la sala se endereza, aparece una cornisa de piedra (con su pilar) y el cazador suelta el látigo, cae sobre ella lejos de los pinchos y celebra ("¡A SALVO!"), como en la fase 4 del juego.
- Reloj: si el texto o el panel de la prueba tapan casi todas las plataformas, el cazador sigue saltando sobre las que haya (antes desaparecía).
- Final: el cazador está en el centro exacto de la cima y solo aparece cuando el castillo estalla (el estallido es más rápido); se quita el murciélago de Drácula; de día el texto pasa a tinta oscura con halo claro (clase `is-dia`), cielo azul limpio, nubes blancas nítidas que pasan más deprisa, bruma que se disipa y roca que reverdece.

## v28 · Látigo con física y salto balístico entre tarjetas
- Rosa del látigo: el cuero es una cuerda de verlet (22 puntos con inercia, tramos de longitud fija) que persigue una forma objetivo: la mano carga hacia atrás, un bucle rueda por el cuero hasta la punta y se acelera, el látigo se tensa más allá del reposo y restalla (destello y chispas en la punta), rebota rizado y se asienta. Los rayos se iluminan en el chasquido.
- Bosque: el salto entre tarjetas va por fases (celebra, se agacha con Jump_Start, despega con polvo, vuela y cae con Jump_Land y polvo). La trayectoria es una parábola real (avance constante y gravedad constante) trazada sobre la pista, entre la tarjeta de origen y la de destino, que se mueven a la vez; la altura crece con la distancia.

## v29 · Revisión GSAP + Lenis
- O27: `html { scrollbar-gutter: stable }`. Con barras clásicas (Chrome en Windows), `lenis.stop()` al empezar una prueba quitaba la barra y los pines y el HUD ganaban ~15 px de ancho de golpe.

## v30 · Mejoras GSAP + Lenis
- Al empezar una prueba, la zona de juego se encuadra con un desplazamiento corto (0,35 s, `mov.irA` con `forzar`, ya con el scroll bloqueado) en lugar de un salto inmediato; en el bosque, la pista se desliza hasta centrar la tarjeta.
- Bosque: `lenis/snap` (vendor/lenis-snap.min.js, mismo 1.3.27) en modo `proximity`: al soltar la rueda cerca de una tarjeta, la pista se asienta con ella centrada. Posiciones calculadas desde el ScrollTrigger de la pista (nunca midiendo el elemento fijado, O19) y recalculadas en cada `refresh`. Sin ajuste con movimiento reducido.
- `aLaVista()`: las escenas 3D de la pluma, el salón, el bosque y la torre enganchan su pintado a `gsap.ticker` solo mientras su sección está en pantalla (antes, cuatro funciones comprobaban cada fotograma si tocaba pintar).
- HUD: marco de arma secundaria, como en el juego. Al equipar un arma en el arsenal, su icono sale girando y vuela en arco (MotionPathPlugin) hasta el marco.

## v31 · Rendimiento de carga
Medido en Chrome sin caché, con 4G lento (1,6 Mbps, 150 ms) y gzip en el texto, como lo sirve GitHub Pages. La GPU del banco de pruebas es simulada (SwiftShader): los tiempos de 3D son peores que en un equipo real, pero la comparación antes/después es válida.

| | v30 | v31 |
|---|---|---|
| Transferido | 2.959 KB | 1.519 KB |
| Pantalla de inicio | 3,6 s | 1,9–3,1 s |
| Castillo 3D | 16,0 s | 5,7 s |
| Página lista | 19,9 s | 10,7 s |
| Con buena conexión, lista | 7,2 s | 6,2–7,0 s |

- **Modelos** (1,9 MB → 710 KB): `EXT_meshopt_compression`, normales, UV y pesos cuantizados, posiciones intactas; en el cazador, fuera las 858 pistas de animación que no se mueven y un clip sin uso. Originales en `models/originales/`; se regeneran con `tools-build/`.
- **three.js** (2,2 MB sin minificar → 697 KB, 179 KB comprimido): un único módulo con solo lo que usa la página, `vendor/three/three-belmont.js`; el mapa de importación apunta a él los complementos.
- **Orden de carga**: el castillo se descarga lo primero; el cazador e iconos empiezan cuando ha llegado y la página no los espera más de 2,5 s (hasta entonces, sus siluetas SVG). Los calcos de los bocetos (148 KB) ya no retienen el arranque. `modulepreload` para los módulos de arranque.
- **Hilo principal**: el atlas calculaba la posición de cada hito con ~8.000 llamadas a `getPointAtLength` (1 s); ahora ~250. `webgl()` creaba un contexto de prueba en cada llamada (siete, sin soltar): ahora se mira una vez y se libera.
- Probado y descartado: precargar los GLB (competían con la pantalla de inicio: 9,9 s), compilar los shaders por adelantado (`compileAsync`: sin mejora medible, o peor con los iconos) y recortar más las fuentes (−5 %).
- GitHub Pages: `.nojekyll` en la raíz; todas las rutas son relativas, así que funciona también como página de proyecto (`usuario.github.io/repositorio/`).

## v32 · Aviso de resolución y versión ligera para móvil
- **Aviso** en la pantalla de inicio: «mejor experiencia en ordenador a partir de 1280 × 720»; si la ventana es más pequeña, sugiere ampliarla; en la versión ligera, explica qué se queda fuera.
- **Versión ligera** (`html.is-lite`) en pantallas de hasta 767 px, o táctiles de hasta 1023 px: sin 3D (no se descargan ni three.js ni los modelos: se ven las ilustraciones SVG de reserva), sin el grano a pantalla completa, sin desenfoques ni sombras de filtro en capas grandes o en movimiento, sin desenfoque de fondo, cielo 2D a resolución CSS y 14 luciérnagas en lugar de 60. Las pruebas, el texto y la navegación son los mismos. `?completa` la desactiva y `?lite` la fuerza, para probar.
- Las pruebas del bosque solo miran sus tarjetas cuando la pista está en pantalla (antes, en cada fotograma de toda la página).
- Móvil emulado (390 × 844, CPU ×4 más lenta, 4G lento): lista en 7,2 s (antes 17,4), 620 KB (antes 1.546), scroll a 25 fps (antes 1).

## v33 · La C del título y repaso de textos en móvil
- Título: durante la entrada, letra a letra, el degradado se pintaba dos veces (en la palabra y en cada letra, desalineados) y aparecía una C fantasma más clara. Ahora, troceado, solo pintan las letras; las paradas del degradado van en em y se compensan con la ampliación de la caja de cada letra, así que el color es idéntico durante la entrada y en reposo.
- Móvil, revisado a 320, 360, 390, 414 px, 667 × 375 y 768 px, sin desbordes de texto ni de página:
  - el lacre de la carta, que espera escalado antes de caer, ensanchaba la página 17–22 px: la sección se recorta por los lados;
  - «Ha caído» cabe hasta en 320 px;
  - el IV queda tras el texto de la portada como marca de agua, sin taparlo, y la luna se encoge para no quedar detrás del texto;
  - las armas del arsenal van en 3 + 2 con los nombres enteros (antes «Cro-nó-me-tro»).
- El foco que se lleva por programa a la explicación que se abre ya no dibuja un recuadro pegado al texto.

## v34 · Sonido: tema principal y efectos
- **Tema original**, «La noche de 1691» (no es música del juego): re menor, 132 ppm, 16 compases en bucle (29 s), con órgano, clave, bajo, cuerdas, campanas y batería. Está escrito como datos MIDI en `js/tema.js` (paso, duración, nota, velocidad).
- **Motor** (`js/sonido.js`, WebAudio): instrumentos sintetizados al estilo del chip de 16 bits (pulsos, sierras, FM para las campanas, ruido para la percusión), reverberación de nave generada, compresor y filtro de calidez. Las notas se programan con el reloj de audio, con 0,25 s de adelanto, y `gsap.ticker` despierta al programador. Sin pestaña a la vista, el sonido se suspende.
- **Efectos** escritos también como notas: inicio, látigo (al restallar), vela, corazón, salto, caída, acierto, fallo, prueba superada, arma, golpe y secreto (muro y código Konami).
- **Activación**: apagado por defecto, con un interruptor en la pantalla de inicio, otro en el HUD y otro en la banda sonora; la elección se recuerda. El AudioContext se crea dentro del gesto (clic o tecla), y si se vuelve con el sonido activado, arranca con el primer clic o tecla. `sonido.js` y `tema.js` solo se descargan si se activa.
- **Banda sonora**: con el tema sonando, el ecualizador muestra sus frecuencias reales (AnalyserNode). Enlace para descargar el MIDI (`audio/la-noche-de-1691.mid`, que genera `node tools-build/midi.mjs` desde la misma partitura).
- `tools-build/oir.html` renderiza el tema fuera de tiempo real (OfflineAudioContext) para comprobar niveles: pico 0,61–0,66, sin recortes.
- El HUD deja de estar entero oculto a los lectores de pantalla: el interruptor de sonido es accesible y el resto sigue oculto. En móvil estrecho, solo la nota (tachada si está apagado).
