import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

let activeViewer = null;

const COLORS = {
  H: 0xf4f6f8,
  C: 0x343b43,
  N: 0x4779db,
  O: 0xe64b4b,
  F: 0x65bd73,
  CL: 0x65bd73,
  BR: 0x98563c,
  I: 0x8b65b7,
  S: 0xe0c54e,
  P: 0xe49b46,
  NA: 0x875cc1,
  K: 0x9d5ccd,
  MG: 0x4bbb83,
  CA: 0x58bda3,
  FE: 0xb87152
};
const BALL_RADII = { H: 0.22, C: 0.39, N: 0.37, O: 0.36, F: 0.34, CL: 0.42, BR: 0.45, I: 0.48, S: 0.43, P: 0.42 };
const SPACE_RADII = { H: 1.2, C: 1.7, N: 1.55, O: 1.52, F: 1.47, CL: 1.75, BR: 1.85, I: 1.98, S: 1.8, P: 1.8 };

function parseSDF(sdf) {
  const lines = String(sdf || "").replace(/\r/g, "").split("\n");
  const v3000Start = lines.findIndex(line => line.includes("M  V30 BEGIN ATOM"));
  let atoms = [];
  let bonds = [];

  if (v3000Start >= 0) {
    const atomEnd = lines.findIndex((line, index) => index > v3000Start && line.includes("M  V30 END ATOM"));
    const bondStart = lines.findIndex((line, index) => index > atomEnd && line.includes("M  V30 BEGIN BOND"));
    const bondEnd = lines.findIndex((line, index) => index > bondStart && line.includes("M  V30 END BOND"));
    if (atomEnd < 0 || bondStart < 0 || bondEnd < 0) throw new Error("V3000 SDF の区切りが不正です。");
    const atomIds = new Map();

    for (let i = v3000Start + 1; i < atomEnd; i++) {
      const t = lines[i].trim().split(/\s+/);
      if (t.length < 7) continue;
      const id = Number(t[2]);
      const element = String(t[3]).toUpperCase();
      const x = Number(t[4]), y = Number(t[5]), z = Number(t[6]);
      if (![x, y, z].every(Number.isFinite)) continue;
      atomIds.set(id, atoms.length);
      atoms.push({ element, x, y, z });
    }
    for (let i = bondStart + 1; i < bondEnd; i++) {
      const t = lines[i].trim().split(/\s+/);
      if (t.length < 6) continue;
      const order = Number(t[3]);
      const a = atomIds.get(Number(t[4]));
      const b = atomIds.get(Number(t[5]));
      if (a !== undefined && b !== undefined) bonds.push({ a, b, order: Math.max(1, Math.min(3, order || 1)) });
    }
  } else {
    const countIndex = lines.findIndex(line => line.includes("V2000"));
    if (countIndex < 0) throw new Error("SDF に V2000/V3000 の座標がありません。");
    const atomCount = Number.parseInt(lines[countIndex].slice(0, 3).trim(), 10);
    const bondCount = Number.parseInt(lines[countIndex].slice(3, 6).trim(), 10);
    if (!Number.isFinite(atomCount) || !Number.isFinite(bondCount) || atomCount < 1) throw new Error("SDF の原子数を読み取れません。");

    for (let i = 0; i < atomCount; i++) {
      const line = lines[countIndex + 1 + i];
      const x = Number.parseFloat(line.slice(0, 10));
      const y = Number.parseFloat(line.slice(10, 20));
      const z = Number.parseFloat(line.slice(20, 30));
      const element = line.slice(31, 34).trim().toUpperCase() || (line.trim().split(/\s+/)[3] || "").toUpperCase();
      if (![x, y, z].every(Number.isFinite) || !element) throw new Error("原子座標を読み取れません。");
      atoms.push({ element, x, y, z });
    }
    const bondStart = countIndex + 1 + atomCount;
    for (let i = 0; i < bondCount; i++) {
      const line = lines[bondStart + i];
      const t = line.trim().split(/\s+/);
      const a = Number.parseInt(t[0], 10) - 1;
      const b = Number.parseInt(t[1], 10) - 1;
      const order = Number.parseInt(t[2], 10);
      if (a >= 0 && b >= 0 && a < atoms.length && b < atoms.length) bonds.push({ a, b, order: Math.max(1, Math.min(3, order || 1)) });
    }
  }

  if (!atoms.length) throw new Error("3D座標に原子がありません。");
  return { atoms, bonds };
}

function getElementColor(element) {
  return COLORS[element] || 0xaab2bb;
}
function atomRadius(element, mode) {
  const key = String(element || "C").toUpperCase();
  if (mode === "spacefill") return SPACE_RADII[key] || 1.65;
  return BALL_RADII[key] || 0.38;
}
function disposeTree(root) {
  root.traverse(object => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material.dispose();
    }
  });
}
function renderSDF(sdf, host, initialMode = "spacefill") {
  if (!host) throw new Error("3D表示領域がありません。");
  if (activeViewer) activeViewer.dispose();

  const parsed = parseSDF(sdf);
  const coordinates = parsed.atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z));
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  coordinates.forEach(point => { min.min(point); max.max(point); });
  const center = min.clone().add(max).multiplyScalar(0.5);
  const points = coordinates.map(point => point.clone().sub(center));
  const span = max.clone().sub(min);
  const maxSpan = Math.max(span.x, span.y, span.z, 3);

  host.replaceChildren();
  const width = Math.max(280, host.clientWidth || 600);
  const height = Math.max(280, host.clientHeight || 420);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080c);

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 2000);
  camera.position.set(maxSpan * 0.18, maxSpan * 0.12, maxSpan * 2.25 + 3);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x05080c, 1);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x343b47, 2.05));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
  keyLight.position.set(maxSpan * 0.6, maxSpan * 0.9, maxSpan * 1.3);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xa8c6ff, 1.35);
  fillLight.position.set(-maxSpan, maxSpan * 0.1, -maxSpan);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
  rimLight.position.set(maxSpan * 0.2, -maxSpan, -maxSpan * 0.4);
  scene.add(rimLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.85;
  controls.minDistance = Math.max(2.4, maxSpan * 0.42);
  controls.maxDistance = maxSpan * 6 + 20;
  controls.target.set(0, 0, 0);
  controls.update();

  let mode = initialMode;
  let modelRoot = null;
  let animationFrame = 0;
  let resizeObserver = null;
  let disposed = false;

  function buildModel(nextMode) {
    if (modelRoot) {
      scene.remove(modelRoot);
      disposeTree(modelRoot);
    }
    modelRoot = new THREE.Group();
    const sphereGeometry = new THREE.SphereGeometry(1, 28, 20);
    const materialCache = new Map();
    const getMaterial = (element, atomMode) => {
      const key = String(element).toUpperCase() + ":" + atomMode;
      if (!materialCache.has(key)) {
        materialCache.set(key, new THREE.MeshStandardMaterial({
          color: getElementColor(element),
          roughness: atomMode === "spacefill" ? 0.26 : 0.34,
          metalness: 0.025
        }));
      }
      return materialCache.get(key);
    };

    if (nextMode === "ballstick") {
      const bondMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd4dd, roughness: 0.47, metalness: 0.02 });
      parsed.bonds.forEach(bond => {
        const a = points[bond.a], b = points[bond.b];
        if (!a || !b) return;
        const direction = b.clone().sub(a);
        const length = direction.length();
        if (length < 0.001) return;
        direction.normalize();
        const normalBase = Math.abs(direction.y) < 0.86 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const perpendicular = new THREE.Vector3().crossVectors(direction, normalBase).normalize();
        const order = Math.max(1, Math.min(3, bond.order || 1));
        const spread = 0.105;
        for (let k = 0; k < order; k++) {
          const offset = (k - (order - 1) / 2) * spread;
          const start = a.clone().addScaledVector(perpendicular, offset);
          const end = b.clone().addScaledVector(perpendicular, offset);
          const midpoint = start.clone().add(end).multiplyScalar(0.5);
          const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, length, 12), bondMaterial);
          cylinder.position.copy(midpoint);
          cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
          modelRoot.add(cylinder);
        }
      });
    }

    parsed.atoms.forEach((atom, index) => {
      const sphere = new THREE.Mesh(sphereGeometry, getMaterial(atom.element, nextMode));
      sphere.position.copy(points[index]);
      const radius = atomRadius(atom.element, nextMode);
      sphere.scale.setScalar(radius);
      modelRoot.add(sphere);
    });
    scene.add(modelRoot);
    mode = nextMode;
  }

  buildModel(mode);
  const renderFrame = () => {
    if (disposed) return;
    animationFrame = window.requestAnimationFrame(renderFrame);
    controls.update();
    renderer.render(scene, camera);
  };
  renderFrame();

  function resize() {
    if (disposed) return;
    const w = Math.max(280, host.clientWidth || 600);
    const h = Math.max(280, host.clientHeight || 420);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  } else {
    window.addEventListener("resize", resize);
  }

  const viewer = {
    setMode(nextMode) {
      if (nextMode !== "spacefill" && nextMode !== "ballstick") return;
      buildModel(nextMode);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resize);
      controls.dispose();
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
      host.replaceChildren();
      if (activeViewer === viewer) activeViewer = null;
    }
  };
  activeViewer = viewer;
  return viewer;
}

window.Molecule3DViewer = {
  render: renderSDF,
  dispose() {
    if (activeViewer) activeViewer.dispose();
  }
};
