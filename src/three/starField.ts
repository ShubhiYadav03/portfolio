import * as THREE from "three";

/**
 * TRIPPY Star Field — Neon particles, nebula clouds, floating 3D geometry.
 * Multicolor neon particles with reactive parallax, pulsing nebula,
 * and drifting wireframe shapes throughout the background.
 */

interface StarFieldState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  stars: THREE.Points;
  nebula: THREE.Points;
  floatingShapes: THREE.Group;
  constellation: THREE.LineSegments;
  mouse: { x: number; y: number };
  scroll: number;
  animationId: number;
}

const CONSTELLATION_POINTS = [
  new THREE.Vector3(-1.8, 0.8, 0),
  new THREE.Vector3(-1.2, 1.4, 0),
  new THREE.Vector3(-0.5, 0.9, 0),
  new THREE.Vector3(0.2, 1.5, 0),
  new THREE.Vector3(0.8, 1.0, 0),
  new THREE.Vector3(1.5, 1.3, 0),
  new THREE.Vector3(1.9, 0.7, 0),
  new THREE.Vector3(-1.5, -0.3, 0),
  new THREE.Vector3(-0.8, -0.8, 0),
  new THREE.Vector3(0.0, -0.4, 0),
  new THREE.Vector3(0.7, -0.9, 0),
  new THREE.Vector3(1.4, -0.2, 0),
];

const CONSTELLATION_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [0, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
  [2, 9], [4, 11],
];

function createStars(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colorIndices = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
    sizes[i] = Math.random() * 3.0 + 0.5;
    colorIndices[i] = Math.random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aColorIdx", new THREE.BufferAttribute(colorIndices, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aColorIdx;
      varying float vColorIdx;
      varying float vOpacity;
      uniform float uTime;
      uniform float uPixelRatio;

      void main() {
        vec3 pos = position;
        // Trippy wave drift
        pos.x += sin(uTime * 0.15 + position.y * 0.3 + position.z * 0.2) * 0.15;
        pos.y += cos(uTime * 0.12 + position.x * 0.2 + position.z * 0.3) * 0.15;
        pos.z += sin(uTime * 0.1 + position.x * 0.1) * 0.1;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Aggressive twinkle
        float twinkle = sin(uTime * 3.0 + position.x * 8.0 + position.y * 8.0) * 0.4 + 0.6;
        gl_PointSize = aSize * uPixelRatio * (10.0 / -mvPosition.z) * twinkle;

        vColorIdx = aColorIdx + sin(uTime * 0.5 + position.x) * 0.1;
        vOpacity = (0.5 + aColorIdx * 0.5) * twinkle;
      }
    `,
    fragmentShader: `
      varying float vColorIdx;
      varying float vOpacity;

      vec3 neonPalette(float t) {
        // Cycle through: cyan → pink → purple → green → cyan
        vec3 cyan   = vec3(0.0, 0.94, 1.0);
        vec3 pink   = vec3(1.0, 0.0, 0.67);
        vec3 purple = vec3(0.71, 0.3, 1.0);
        vec3 green  = vec3(0.22, 1.0, 0.08);

        float tt = fract(t) * 4.0;
        if (tt < 1.0) return mix(cyan, pink, tt);
        if (tt < 2.0) return mix(pink, purple, tt - 1.0);
        if (tt < 3.0) return mix(purple, green, tt - 2.0);
        return mix(green, cyan, tt - 3.0);
      }

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;

        float alpha = smoothstep(0.5, 0.05, d) * vOpacity;
        // Extra glow ring
        float ring = smoothstep(0.35, 0.25, d) - smoothstep(0.25, 0.15, d);
        alpha += ring * 0.3;

        vec3 color = neonPalette(vColorIdx);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

/** Soft nebula clouds — large fuzzy colored blobs */
function createNebula(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const nebulaColors = [
    [0.0, 0.94, 1.0],    // cyan
    [1.0, 0.0, 0.67],    // pink
    [0.71, 0.3, 1.0],    // purple
    [0.22, 1.0, 0.08],   // green
    [1.0, 0.42, 0.17],   // orange
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 35;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 10;
    sizes[i] = Math.random() * 120 + 50;

    const c = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uPixelRatio;

      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.05 + position.y * 0.1) * 0.5;
        pos.y += cos(uTime * 0.04 + position.x * 0.1) * 0.5;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (5.0 / -mvPosition.z);

        vColor = color;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uTime;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * 0.08;
        // Stronger pulse
        alpha *= 0.6 + sin(uTime * 0.3) * 0.4;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

/** Floating 3D wireframe shapes drifting through the scene */
function createFloatingShapes(): THREE.Group {
  const group = new THREE.Group();
  const neonColors = [0x00f0ff, 0xff00aa, 0xb44dff, 0x39ff14, 0xff6b2b];

  const geometries = [
    new THREE.TorusKnotGeometry(0.6, 0.15, 64, 8, 2, 3),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.TorusGeometry(0.5, 0.15, 12, 32),
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.TetrahedronGeometry(0.5, 0),
    new THREE.DodecahedronGeometry(0.4, 0),
    new THREE.TorusKnotGeometry(0.4, 0.12, 48, 6, 3, 2),
    new THREE.OctahedronGeometry(0.35, 1),
  ];

  for (let i = 0; i < geometries.length; i++) {
    const color = neonColors[i % neonColors.length];
    const edges = new THREE.EdgesGeometry(geometries[i]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
    });
    const wireShape = new THREE.LineSegments(edges, mat);

    // Spread them out in a large volume
    wireShape.position.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 15 - 8
    );

    const scale = 0.8 + Math.random() * 1.5;
    wireShape.scale.setScalar(scale);

    // Store unique rotation speeds
    wireShape.userData = {
      rotSpeedX: (Math.random() - 0.5) * 0.4,
      rotSpeedY: (Math.random() - 0.5) * 0.4,
      rotSpeedZ: (Math.random() - 0.5) * 0.2,
      driftSpeed: 0.05 + Math.random() * 0.1,
      driftOffset: Math.random() * Math.PI * 2,
      baseY: wireShape.position.y,
    };

    group.add(wireShape);
  }

  return group;
}

function createConstellation(): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (const [a, b] of CONSTELLATION_EDGES) {
    const pa = CONSTELLATION_POINTS[a];
    const pb = CONSTELLATION_POINTS[b];
    positions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;

      void main() {
        float glow = sin(uTime * 2.0) * 0.2 + 0.8;
        // Neon cyan lines
        vec3 color = vec3(0.0, 0.94, 1.0);
        gl_FragColor = vec4(color, uProgress * 0.6 * glow);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.position.z = 1;
  return lines;
}

export function initStarField(canvas: HTMLCanvasElement): StarFieldState {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.innerWidth < 768;
  const starCount = isMobile ? 1200 : 2500;
  const nebulaCount = isMobile ? 25 : 45;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050510, 1);

  const nebula = createNebula(nebulaCount);
  const stars = createStars(starCount);
  const floatingShapes = createFloatingShapes();
  const constellation = createConstellation();
  scene.add(nebula);
  scene.add(floatingShapes);
  scene.add(stars);
  scene.add(constellation);

  const state: StarFieldState = {
    scene, camera, renderer, stars, nebula, floatingShapes, constellation,
    mouse: { x: 0, y: 0 },
    scroll: 0,
    animationId: 0,
  };

  window.addEventListener("mousemove", (e) => {
    state.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("scroll", () => {
    state.scroll = window.scrollY / window.innerHeight;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const pr = Math.min(window.devicePixelRatio, 2);
    (stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
    (nebula.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
  });

  const clock = new THREE.Clock();

  function animate() {
    state.animationId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    const starMat = stars.material as THREE.ShaderMaterial;
    const nebulaMat = nebula.material as THREE.ShaderMaterial;
    const constMat = constellation.material as THREE.ShaderMaterial;

    starMat.uniforms.uTime.value = elapsed;
    nebulaMat.uniforms.uTime.value = elapsed;
    constMat.uniforms.uTime.value = elapsed;

    const constellationProgress = Math.min(elapsed / 3, 1) * Math.max(1 - state.scroll * 1.5, 0);
    constMat.uniforms.uProgress.value = constellationProgress;

    if (!prefersReducedMotion) {
      // Stronger parallax
      camera.position.x += (state.mouse.x * 0.5 - camera.position.x) * 0.03;
      camera.position.y += (-state.mouse.y * 0.5 - camera.position.y) * 0.03;
      camera.position.z = 8 - state.scroll * 0.5;

      // Faster rotation for trippy feel
      stars.rotation.y = elapsed * 0.02;
      stars.rotation.x = elapsed * 0.008;
      nebula.rotation.y = elapsed * 0.005;
      nebula.rotation.x = elapsed * 0.003;

      // Animate floating 3D shapes
      floatingShapes.children.forEach((shape) => {
        const d = shape.userData;
        shape.rotation.x += d.rotSpeedX * 0.016;
        shape.rotation.y += d.rotSpeedY * 0.016;
        shape.rotation.z += d.rotSpeedZ * 0.016;
        // Gentle vertical drift
        shape.position.y = d.baseY + Math.sin(elapsed * d.driftSpeed + d.driftOffset) * 1.5;
        // Subtle opacity pulse via material
        const mat = (shape as THREE.LineSegments).material as THREE.LineBasicMaterial;
        mat.opacity = 0.15 + Math.sin(elapsed * 0.5 + d.driftOffset) * 0.1;
      });
    }

    renderer.render(scene, camera);
  }

  animate();
  return state;
}
