// Three.js globe with orbit controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVector3, subsolarPoint, spinAngles, orbitPosition } from './geo.js';

let scene, camera, renderer, earth;
let yearGroup = null;
let tiltGroup = null;
let globeGroup = null;
let axisLine = null;
let markerGroup = null;
let sunMesh, sunLight;
let controls = null;
let orbitRing = null;
let mode = 'orbit';

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
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(container);
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

  // Globe group holds earth and marker.
  globeGroup = new THREE.Group();
  globeGroup.add(earth);

  // Tilt group: leans the axis by ~23.4°. Holds globeGroup and the axis line.
  tiltGroup = new THREE.Group();
  tiltGroup.add(globeGroup);

  // Axis line through the poles (visible only in spin mode)
  axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.4, 0),
      new THREE.Vector3(0, 1.4, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  axisLine.visible = false;
  tiltGroup.add(axisLine);

  // Year group: turns the direction of the lean as the year progresses.
  yearGroup = new THREE.Group();
  yearGroup.add(tiltGroup);
  scene.add(yearGroup);

  // Lighting — dim ambient, bright directional from the sun
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.target = yearGroup; // always light the Earth, wherever it is
  scene.add(sunLight);

  // Sun sphere (not to scale)
  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  scene.add(sunMesh);

  // The Earth's orbit ring (only in the "Sun in the middle" view)
  const ringPts = [];
  for (let i = 0; i <= 128; i++) {
    const a = i / 128 * Math.PI * 2;
    ringPts.push(new THREE.Vector3(4 * Math.cos(a), 0, 4 * Math.sin(a)));
  }
  orbitRing = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0x666666 })
  );
  orbitRing.visible = false;
  scene.add(orbitRing);

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    globeGroup.remove(markerGroup);
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

  globeGroup.add(markerGroup);
}

/** Move the sun mesh and directional light based on the current mode. */
export function updateGlobe(state) {
  yearGroup.position.set(0, 0, 0);
  yearGroup.scale.setScalar(1);
  sunMesh.scale.setScalar(1);
  orbitRing.visible = false;
  if (mode === 'sun') {
    const a = spinAngles(state.simTime);
    const p = orbitPosition(state.simTime, 4);
    yearGroup.rotation.set(0, 0, 0);
    yearGroup.position.set(p.x, p.y, p.z);
    yearGroup.scale.setScalar(0.5);
    tiltGroup.rotation.set(0, 0, a.tilt);
    globeGroup.rotation.set(0, a.spin, 0);
    axisLine.visible = true;
    sunMesh.position.set(0, 0, 0);
    sunMesh.scale.setScalar(5);
    sunLight.position.set(0, 0, 0);
    orbitRing.visible = true;
  } else if (mode === 'orbit') {
    yearGroup.rotation.set(0, 0, 0);
    tiltGroup.rotation.set(0, 0, 0);
    globeGroup.rotation.set(0, 0, 0);
    axisLine.visible = false;
    const sp = subsolarPoint(state.simTime);
    const pos = latLonToVector3(sp.lat, sp.lon, 3);
    sunMesh.position.set(pos.x, pos.y, pos.z);
    sunLight.position.copy(sunMesh.position);
  } else {
    const a = spinAngles(state.simTime);
    yearGroup.rotation.set(0, a.year, 0);
    tiltGroup.rotation.set(0, 0, a.tilt);
    globeGroup.rotation.set(0, a.spin, 0);
    axisLine.visible = true;
    sunMesh.position.set(3, 0, 0);
    sunLight.position.set(3, 0, 0);
  }
}

/** Switch between the "orbit", "spin" and "sun" views. */
export function setGlobeMode(m) {
  if (m === mode) return;
  if (m === 'sun') {
    controls.maxDistance = 20;
    camera.position.set(0, 7, 9);
  } else if (mode === 'sun') {
    camera.position.set(0, 0, 3.2);
    controls.maxDistance = 6;
  }
  mode = m;
}

/** Return the current mode string ("orbit" or "spin"). */
export function getGlobeMode() {
  return mode;
}
