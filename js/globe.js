// Three.js globe with orbit controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVector3 } from './geo.js';

let scene, camera, renderer, earth;
let markerGroup = null;

/** Build the globe inside the given container element. */
export function createGlobe(container) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  container.appendChild(renderer.domElement);

  // Earth texture
  const loader = new THREE.TextureLoader();
  const map = loader.load('assets/earth.jpg');
  map.colorSpace = THREE.SRGBColorSpace;

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshStandardMaterial({ map })
  );
  // Rotate so longitude 0° faces +z (toward the viewer)
  earth.rotation.y = -Math.PI / 2;
  scene.add(earth);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambient);

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.autoRotate = false;

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

  // Red sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.02),
    new THREE.MeshBasicMaterial({ color: 0xff3333 })
  );
  sphere.position.set(pos.x, pos.y, pos.z);
  markerGroup.add(sphere);

  // Red line sticking out from the surface
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(base.x, base.y, base.z),
    new THREE.Vector3(tip.x, tip.y, tip.z)
  ]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xff3333 }));
  markerGroup.add(line);

  scene.add(markerGroup);
}
