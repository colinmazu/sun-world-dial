// Three.js globe — scene, camera, renderer, Earth sphere, orbit controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVector3, subsolarPoint } from './geo.js';

let scene;
let camera;
let renderer;
let earth;
let markerGroup = null;
let sunMesh;
let sunLight;

/**
 * Set up the globe inside the given container element.
 */
export function createGlobe(container) {
  // Scene with black background
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera looking at origin from +z
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Earth sphere with texture
  const loader = new THREE.TextureLoader();
  const map = loader.load('assets/earth.jpg');
  map.colorSpace = THREE.SRGBColorSpace;

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshStandardMaterial({ map })
  );
  // Rotate so longitude 0° faces +z (matching latLonToVector3)
  earth.rotation.y = -Math.PI / 2;
  scene.add(earth);

  // Dim ambient light + directional sun light aimed at origin
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(sunLight);

  // Orbit controls: no pan, damping (unless reduced-motion), zoom range 1.5–6
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

  // Yellow sun sphere (not to scale)
  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  scene.add(sunMesh);
}

/**
 * Position the sun mesh and directional light at the subsolar point for state.simTime.
 */
export function updateGlobe(state) {
  const sp = subsolarPoint(state.simTime);
  const pos = latLonToVector3(sp.lat, sp.lon, 3);

  sunMesh.position.set(pos.x, pos.y, pos.z);
  sunLight.position.copy(sunMesh.position);
}

/**
 * Place a red sphere-and-line marker at the given lat/lon on the globe.
 * Removes any previous marker first. The group is added to the scene (not earth)
 * so it stays fixed while orbit controls rotate the view.
 */
export function setMarker(lat, lon) {
  // Remove previous marker
  if (markerGroup !== null) {
    scene.remove(markerGroup);
    markerGroup = null;
  }

  const pos = latLonToVector3(lat, lon, 1.01);
  const base = latLonToVector3(lat, lon, 1.0);
  const tip = latLonToVector3(lat, lon, 1.15);

  // Red sphere dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02),
    new THREE.MeshBasicMaterial({ color: 0xff3333 })
  );
  dot.position.set(pos.x, pos.y, pos.z);

  // Red line sticking out from the surface
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(base.x, base.y, base.z),
    new THREE.Vector3(tip.x, tip.y, tip.z)
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff3333 });
  const line = new THREE.Line(lineGeo, lineMat);

  markerGroup = new THREE.Group();
  markerGroup.add(dot);
  markerGroup.add(line);
  scene.add(markerGroup);
}
