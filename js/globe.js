// Three.js globe with Earth texture and orbit controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVector3, subsolarPoint } from './geo.js';

let scene, camera, renderer, earth;
let markerGroup = null;
let sunMesh, sunLight;

/** Create the globe inside the given container element. */
export function createGlobe(container) {
  // Scene and camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Earth sphere — texture wraps so lon 0 faces +x; rotate to face +z
  const texLoader = new THREE.TextureLoader();
  const map = texLoader.load('assets/earth.jpg');
  map.colorSpace = THREE.SRGBColorSpace;

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshStandardMaterial({ map }),
  );
  earth.rotation.y = -Math.PI / 2;
  scene.add(earth);

  // Lighting: dim ambient + directional sun light
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(sunLight);

  // Sun sphere (not to scale)
  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  scene.add(sunMesh);

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Render loop
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

/** Place (or move) a red marker at the given lat/lon on the globe. */
export function setMarker(lat, lon) {
  if (markerGroup) {
    scene.remove(markerGroup);
    markerGroup = null;
  }
  const pos  = latLonToVector3(lat, lon, 1.01);
  const base = latLonToVector3(lat, lon, 1.0);
  const tip  = latLonToVector3(lat, lon, 1.15);

  markerGroup = new THREE.Group();

  // Red sphere dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02),
    new THREE.MeshBasicMaterial({ color: 0xff3333 }),
  );
  dot.position.set(pos.x, pos.y, pos.z);
  markerGroup.add(dot);

  // Red line sticking out from the surface
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(base.x, base.y, base.z),
    new THREE.Vector3(tip.x, tip.y, tip.z),
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff3333 });
  markerGroup.add(new THREE.Line(lineGeo, lineMat));

  scene.add(markerGroup);
}

/** Position sun mesh and directional light at the subsolar point for state.simTime. */
export function updateGlobe(state) {
  const sp = subsolarPoint(state.simTime);
  const pos = latLonToVector3(sp.lat, sp.lon, 3);
  sunMesh.position.set(pos.x, pos.y, pos.z);
  sunLight.position.copy(sunMesh.position);
}
