import * as THREE from "three";

/**
 * 3D Book — "An Ancient Tome Lost in Time"
 *
 * Procedural 3D book model: leather covers, page block with gold edges,
 * spine, and ornamental details. Floats and rotates in the scene.
 * When the experience section scrolls into view, docks to center.
 */

const BOOK = {
  width: 2.4,
  height: 3.2,
  coverThickness: 0.06,
  pageThickness: 0.5,
  spineRadius: 0.15,
  coverOverhang: 0.06,
};

/** Leather-like material for covers */
function createCoverMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1a1008,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x0a0804,
    emissiveIntensity: 0.15,
  });
}

/** Gold trim material */
function createGoldMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb48c3c,
    roughness: 0.35,
    metalness: 0.7,
    emissive: 0x5a4420,
    emissiveIntensity: 0.2,
  });
}

/** Page block material (cream/off-white page edges) */
function createPageMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xe0d4b8,
    roughness: 0.9,
    metalness: 0.0,
    emissive: 0x3a3020,
    emissiveIntensity: 0.05,
  });
}

/** Build the ornamental border as lines on a cover face */
function createCoverOrnament(width: number, height: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const goldLineMat = new THREE.LineBasicMaterial({ color: 0xb48c3c, transparent: true, opacity: 0.5 });

  // Outer border
  const inset = 0.15;
  const outerPts = [
    new THREE.Vector3(-width/2 + inset, -height/2 + inset, z),
    new THREE.Vector3( width/2 - inset, -height/2 + inset, z),
    new THREE.Vector3( width/2 - inset,  height/2 - inset, z),
    new THREE.Vector3(-width/2 + inset,  height/2 - inset, z),
    new THREE.Vector3(-width/2 + inset, -height/2 + inset, z),
  ];
  const outerGeom = new THREE.BufferGeometry().setFromPoints(outerPts);
  group.add(new THREE.Line(outerGeom, goldLineMat));

  // Inner border
  const inset2 = 0.25;
  const innerMat = new THREE.LineBasicMaterial({ color: 0xb48c3c, transparent: true, opacity: 0.3 });
  const innerPts = [
    new THREE.Vector3(-width/2 + inset2, -height/2 + inset2, z),
    new THREE.Vector3( width/2 - inset2, -height/2 + inset2, z),
    new THREE.Vector3( width/2 - inset2,  height/2 - inset2, z),
    new THREE.Vector3(-width/2 + inset2,  height/2 - inset2, z),
    new THREE.Vector3(-width/2 + inset2, -height/2 + inset2, z),
  ];
  const innerGeom = new THREE.BufferGeometry().setFromPoints(innerPts);
  group.add(new THREE.Line(innerGeom, innerMat));

  // Corner diamonds
  const diamondSize = 0.08;
  const corners = [
    [-width/2 + inset + 0.05, -height/2 + inset + 0.05],
    [ width/2 - inset - 0.05, -height/2 + inset + 0.05],
    [ width/2 - inset - 0.05,  height/2 - inset - 0.05],
    [-width/2 + inset + 0.05,  height/2 - inset - 0.05],
  ];
  const diamondMat = new THREE.MeshBasicMaterial({ color: 0xb48c3c, transparent: true, opacity: 0.6 });
  for (const [cx, cy] of corners) {
    const dGeom = new THREE.CircleGeometry(diamondSize, 4);
    const dMesh = new THREE.Mesh(dGeom, diamondMat);
    dMesh.position.set(cx, cy, z + 0.001);
    dMesh.rotation.z = Math.PI / 4;
    group.add(dMesh);
  }

  // Center diamond (larger)
  const centerDiamond = new THREE.CircleGeometry(0.12, 4);
  const centerMesh = new THREE.Mesh(centerDiamond, diamondMat);
  centerMesh.position.set(0, 0, z + 0.001);
  centerMesh.rotation.z = Math.PI / 4;
  group.add(centerMesh);

  return group;
}

/** Create the full 3D book group */
export function createBookModel(): THREE.Group {
  const book = new THREE.Group();
  const { width, height, coverThickness, pageThickness, coverOverhang } = BOOK;

  const coverMat = createCoverMaterial();
  const goldMat = createGoldMaterial();
  const pageMat = createPageMaterial();

  const totalThickness = pageThickness + coverThickness * 2;
  const halfThick = totalThickness / 2;

  // Front cover
  const frontCoverGeom = new THREE.BoxGeometry(width + coverOverhang, height + coverOverhang, coverThickness);
  const frontCover = new THREE.Mesh(frontCoverGeom, coverMat);
  frontCover.position.z = halfThick - coverThickness / 2;
  book.add(frontCover);

  // Back cover
  const backCover = new THREE.Mesh(frontCoverGeom, coverMat);
  backCover.position.z = -halfThick + coverThickness / 2;
  book.add(backCover);

  // Page block
  const pageBlockGeom = new THREE.BoxGeometry(width - 0.04, height - 0.04, pageThickness);
  const pageBlock = new THREE.Mesh(pageBlockGeom, pageMat);
  pageBlock.position.x = 0.02;
  book.add(pageBlock);

  // Gold edge strip on pages (top, bottom, right)
  const goldEdgeThickness = 0.008;

  // Top gold edge
  const topEdgeGeom = new THREE.BoxGeometry(width - 0.04, goldEdgeThickness, pageThickness);
  const topEdge = new THREE.Mesh(topEdgeGeom, goldMat);
  topEdge.position.set(0.02, height / 2 - 0.02, 0);
  book.add(topEdge);

  // Bottom gold edge
  const bottomEdge = topEdge.clone();
  bottomEdge.position.y = -height / 2 + 0.02;
  book.add(bottomEdge);

  // Right gold edge (fore-edge)
  const rightEdgeGeom = new THREE.BoxGeometry(goldEdgeThickness, height - 0.04, pageThickness);
  const rightEdge = new THREE.Mesh(rightEdgeGeom, goldMat);
  rightEdge.position.set(width / 2, 0, 0);
  book.add(rightEdge);

  // Spine (rounded cylinder)
  const spineGeom = new THREE.CylinderGeometry(BOOK.spineRadius, BOOK.spineRadius, height + coverOverhang, 12, 1, false, Math.PI, Math.PI);
  const spine = new THREE.Mesh(spineGeom, coverMat);
  spine.rotation.z = 0;
  spine.rotation.x = 0;
  spine.position.set(-width / 2 - coverOverhang / 2 + 0.02, 0, 0);
  spine.rotation.set(0, 0, Math.PI / 2);
  // Reorient: cylinder is along Y, we need along Y (height), rotated to form spine
  spine.rotation.set(0, 0, 0);
  spine.position.set(-width / 2 + 0.01, 0, 0);
  book.add(spine);

  // Spine gold bands
  const bandGeom = new THREE.TorusGeometry(BOOK.spineRadius + 0.01, 0.01, 8, 16, Math.PI);
  for (const yOff of [-height * 0.35, -height * 0.1, height * 0.1, height * 0.35]) {
    const band = new THREE.Mesh(bandGeom, goldMat);
    band.position.set(-width / 2 + 0.01, yOff, 0);
    band.rotation.set(Math.PI / 2, 0, 0);
    book.add(band);
  }

  // Cover ornaments (front)
  const frontOrnaments = createCoverOrnament(width + coverOverhang, height + coverOverhang, halfThick + 0.001);
  book.add(frontOrnaments);

  // Cover ornaments (back)
  const backOrnaments = createCoverOrnament(width + coverOverhang, height + coverOverhang, -halfThick - 0.001);
  book.add(backOrnaments);

  return book;
}

/**
 * Initialize the 3D book scene in the experience section.
 * The book floats and rotates. Scroll position controls its dock-to-center animation.
 */
export function initBookScene(canvas: HTMLCanvasElement): void {
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.z = 7;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Lighting — dramatic with warm key light
  const ambientLight = new THREE.AmbientLight(0x332211, 0.6);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffe8c0, 1.2);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.3);
  rimLight.position.set(-3, -2, -3);
  scene.add(rimLight);

  const bottomLight = new THREE.PointLight(0xb44dff, 0.4, 10);
  bottomLight.position.set(0, -3, 2);
  scene.add(bottomLight);

  // Book model
  const book = createBookModel();
  book.rotation.set(0.2, -0.3, 0.05);
  scene.add(book);

  // Mouse tracking for tilt
  const mouse = { x: 0, y: 0 };
  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  // Resize
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  // Animate
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Floating bob
    book.position.y = Math.sin(elapsed * 0.6) * 0.15;
    book.position.x = Math.sin(elapsed * 0.3) * 0.05;

    // Gentle rotation + mouse tilt
    const targetRotX = 0.15 + mouse.y * 0.15;
    const targetRotY = -0.3 + Math.sin(elapsed * 0.2) * 0.1 + mouse.x * 0.2;

    book.rotation.x += (targetRotX - book.rotation.x) * 0.03;
    book.rotation.y += (targetRotY - book.rotation.y) * 0.03;
    book.rotation.z = Math.sin(elapsed * 0.4) * 0.02;

    renderer.render(scene, camera);
  }

  animate();
}
