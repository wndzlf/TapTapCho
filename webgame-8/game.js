import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 2, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 4;
controls.maxDistance = 40;

const hemi = new THREE.HemisphereLight(0xbad4ff, 0x1f2937, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(8, 12, 6);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x101622 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const loader = new GLTFLoader();
const base = '../assets/kenney_retro-urban-kit/Models/GLB format/';

function loadGLB(name, scale = 1) {
  return new Promise((resolve, reject) => {
    const url = encodeURI(base + name);
    loader.load(url, (gltf) => {
      const obj = gltf.scene;
      obj.scale.setScalar(scale);
      resolve(obj);
    }, undefined, reject);
  });
}

async function buildVillage() {
  const roadStraight = await loadGLB('road-asphalt-straight.glb');
  const roadCorner = await loadGLB('road-asphalt-corner.glb');
  const roadCenter = await loadGLB('road-asphalt-center.glb');
  const grass = await loadGLB('grass.glb');
  const wall = await loadGLB('wall-a-flat.glb');
  const wallWindow = await loadGLB('wall-a-window.glb');
  const wallDoor = await loadGLB('wall-a-door.glb');
  const roof = await loadGLB('wall-a-roof.glb');
  const tree = await loadGLB('tree-park-large.glb');
  const bench = await loadGLB('detail-bench.glb');

  const tileSize = 2;
  const grid = 9;

  function place(obj, x, z, rotY = 0) {
    const o = obj.clone();
    o.position.set(x * tileSize, 0, z * tileSize);
    o.rotation.y = rotY;
    scene.add(o);
  }

  for (let x = -grid; x <= grid; x++) {
    for (let z = -grid; z <= grid; z++) {
      place(grass, x, z);
    }
  }

  for (let x = -4; x <= 4; x++) {
    place(roadStraight, x, 0, 0);
    place(roadStraight, x, -2, 0);
  }
  for (let z = -6; z <= 6; z++) {
    place(roadStraight, 0, z, Math.PI / 2);
    place(roadStraight, 2, z, Math.PI / 2);
  }

  place(roadCenter, 0, 0);
  place(roadCenter, 2, -2);

  place(roadCorner, -4, -2, 0);
  place(roadCorner, 4, 0, Math.PI / 2);
  place(roadCorner, -2, 4, Math.PI);
  place(roadCorner, 2, -6, -Math.PI / 2);

  // simple houses
  function house(cx, cz) {
    place(wall, cx, cz);
    place(wallWindow, cx + 1, cz);
    place(wallWindow, cx - 1, cz);
    place(wallDoor, cx, cz + 1, Math.PI / 2);
    place(roof, cx, cz, 0);
  }

  house(-6, 3);
  house(6, -3);
  house(-6, -4);
  house(5, 5);

  place(tree, -8, 1);
  place(tree, 8, -1);
  place(tree, -5, -7);
  place(bench, -3, 6);
  place(bench, 3, -6);
}

buildVillage();

// movement
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function updateMovement(delta) {
  const speed = 6 * delta;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();

  if (keys.has('w')) camera.position.addScaledVector(dir, speed);
  if (keys.has('s')) camera.position.addScaledVector(dir, -speed);
  if (keys.has('a')) camera.position.addScaledVector(right, -speed);
  if (keys.has('d')) camera.position.addScaledVector(right, speed);
  if (keys.has('q')) camera.rotation.y += 1.2 * delta;
  if (keys.has('e')) camera.rotation.y -= 1.2 * delta;

  controls.target.copy(camera.position).add(new THREE.Vector3(0, 2, 0));
}

let last = performance.now();
function animate(now) {
  const delta = (now - last) / 1000;
  last = now;
  updateMovement(delta);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
