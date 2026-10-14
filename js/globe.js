// Three.js globe with Earth texture and orbit controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVector3 } from './geo.js';

let scene, camera, renderer, earth;

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

  // Lighting (ambient only for now)
  scene.add(new THREE.AmbientLight(0xffffff, 2));

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
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
