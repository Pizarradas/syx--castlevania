# Herramientas de construcción

No hacen falta para servir la página: el repositorio ya lleva los resultados. Sirven para regenerarlos.

```bash
cd tools-build && npm install
npm run glb     # models/originales/*.glb → models/*.glb (meshopt, sin tocar posiciones ni nodos)
npm run three   # entrada-three.js → vendor/three/three-belmont.js (solo lo que usa la página)
```

- **Modelos.** `comprimir-glb.mjs` deduplica, remuestrea las animaciones, quita las pistas que no se mueven (constantes e iguales a la pose de reposo en todos los clips), cuantiza normales, UV y pesos (no las posiciones: el código anima la escala y la posición de cada pieza del castillo) y comprime con `EXT_meshopt_compression`. Los originales, sin comprimir, se quedan en `models/originales/` para editarlos en Blender.
- **three.js.** `entrada-three.js` exporta solo las clases que usa la página y los cuatro complementos (GLTFLoader, RoomEnvironment, BufferGeometryUtils, SkeletonUtils) más el decodificador de meshopt. Si un módulo empieza a usar una clase nueva de `THREE`, hay que añadirla a la lista y volver a generar el paquete.
