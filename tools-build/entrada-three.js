// Solo las piezas de three.js que usa la página (tree shaking). Lista sacada de los THREE.* de js/*.js:
// si un módulo usa una clase nueva, añádela aquí y ejecuta `npm run three`
export { ACESFilmicToneMapping,AdditiveBlending,AmbientLight,AnimationMixer,BackSide,Box3,BoxGeometry,BufferAttribute,BufferGeometry,CanvasTexture,CapsuleGeometry,CatmullRomCurve3,CircleGeometry,Color,ConeGeometry,CylinderGeometry,DirectionalLight,DoubleSide,Euler,ExtrudeGeometry,Float32BufferAttribute,Fog,FogExp2,Group,HemisphereLight,InstancedMesh,LatheGeometry,Line,LineBasicMaterial,LineSegments,LoopOnce,MathUtils,Matrix4,Mesh,MeshBasicMaterial,MeshDepthMaterial,MeshStandardMaterial,Object3D,OrthographicCamera,PCFShadowMap,PMREMGenerator,Path,PerspectiveCamera,PlaneGeometry,PointLight,Points,Quaternion,RGBADepthPacking,RepeatWrapping,SRGBColorSpace,Scene,ShaderMaterial,ShadowMaterial,Shape,ShapeGeometry,SphereGeometry,Sprite,SpriteMaterial,TorusGeometry,TubeGeometry,UniformsLib,Vector2,Vector3,WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { clone } from 'three/addons/utils/SkeletonUtils.js';
export { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
