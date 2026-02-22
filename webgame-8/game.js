import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2.2, 8);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const startOverlay = document.getElementById('start');
renderer.domElement.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});
startOverlay.addEventListener('click', () => {
  controls.lock();
  startOverlay.classList.add('hidden');
});
controls.addEventListener('unlock', () => {
  startOverlay.classList.remove('hidden');
});

const hemi = new THREE.HemisphereLight(0xbad4ff, 0x1f2937, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(8, 12, 6);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x101622 })
);

// debug helpers (숨김)
// const grid = new THREE.GridHelper(120, 60, 0x1f2a3a, 0x151b27);
// scene.add(grid);
// const axes = new THREE.AxesHelper(3);
// axes.position.y = 0.1;
// scene.add(axes);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
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
  let roadStraight, roadCorner, roadCenter, grass, wall, wallWindow, wallDoor, roof, tree, bench;
  try {
    roadStraight = await loadGLB('road-asphalt-straight.glb');
    roadCorner = await loadGLB('road-asphalt-corner.glb');
    roadCenter = await loadGLB('road-asphalt-center.glb');
    grass = await loadGLB('grass.glb');
    wall = await loadGLB('wall-a-flat.glb');
    wallWindow = await loadGLB('wall-a-window.glb');
    wallDoor = await loadGLB('wall-a-door.glb');
    roof = await loadGLB('wall-a-roof.glb');
    tree = await loadGLB('tree-park-large.glb');
    bench = await loadGLB('detail-bench.glb');
  } catch (e) {
    console.error('GLB load failed', e);
    // fallback simple boxes
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
    const tile = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    const treeBox = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    roadStraight = tile;
    roadCorner = tile;
    roadCenter = tile;
    grass = tile;
    wall = box;
    wallWindow = box;
    wallDoor = box;
    roof = box;
    tree = treeBox;
    bench = box;
  }

  let tileSize = 2;
  const grid = 12;

  // auto tile size from asset bounds
  try {
    const size = new THREE.Box3().setFromObject(grass).getSize(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.z);
    if (Number.isFinite(maxSide) && maxSide > 0) tileSize = maxSide;
  } catch {}

  function tuneMaterials(o) {
    o.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });
  }

  function place(obj, x, z, rotY = 0, y = 0.02) {
    const o = obj.clone();
    tuneMaterials(o);
    o.position.set(x * tileSize, y, z * tileSize);
    o.rotation.y = rotY;
    scene.add(o);
  }

  for (let x = -grid; x <= grid; x++) {
    for (let z = -grid; z <= grid; z++) {
      place(grass, x, z);
    }
  }

  // main cross roads
  for (let x = -6; x <= 6; x++) {
    place(roadStraight, x, 0, 0);
  }
  for (let z = -6; z <= 6; z++) {
    place(roadStraight, 0, z, Math.PI / 2);
  }
  place(roadCenter, 0, 0);

  // side streets
  for (let x = -6; x <= 6; x++) place(roadStraight, x, 4, 0);
  for (let z = -6; z <= 6; z++) place(roadStraight, 4, z, Math.PI / 2);
  place(roadCenter, 4, 4);

  // simple houses block
  function house(cx, cz, rot = 0) {
    place(wall, cx, cz, rot);
    place(wallWindow, cx + 1, cz, rot);
    place(wallWindow, cx - 1, cz, rot);
    place(wallDoor, cx, cz + 1, rot + Math.PI / 2);
    place(roof, cx, cz, rot);
  }

  const homes = [
    [-6, 3], [-6, 6], [-6, -4], [-6, -7],
    [6, -3], [6, -6], [6, 4], [6, 7],
    [2, 8], [8, 2], [2, -8], [-8, 2]
  ];
  homes.forEach(([x,z]) => house(x, z, (x+z)%2===0 ? 0 : Math.PI));

  // decor
  place(tree, -8, 1);
  place(tree, 8, -1);
  place(tree, -5, -7);
  place(tree, 7, 7);
  place(tree, -9, 6);
  place(tree, 6, -9);
  place(bench, -3, 6);
  place(bench, 3, -6);
}

buildVillage().then(() => {
  controls.getObject().position.set(0, 2.2, 8);
});

// movement (1st person)
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function updateMovement(delta) {
  const speed = 6 * delta;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

  const move = new THREE.Vector3();
  if (keys.has('w')) move.add(forward);
  if (keys.has('s')) move.addScaledVector(forward, -1);
  if (keys.has('a')) move.addScaledVector(right, -1);
  if (keys.has('d')) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed);
    controls.getObject().position.add(move);
  }
}

let last = performance.now();
function animate(now) {
  const delta = (now - last) / 1000;
  last = now;
  updateMovement(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
