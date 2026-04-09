import * as THREE from "three";

/**
 * Star Field — "Fate Written in the Stars"
 *
 * A persistent particle system that fills the background with drifting stars.
 * Stars respond to mouse movement (parallax) and scroll position.
 * A constellation traces connecting lines on the hero section.
 */

interface StarFieldState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  stars: THREE.Points;
  constellation: THREE.LineSegments;
  mouse: { x: number; y: number };
  scroll: number;
  animationId: number;
}

// Constellation points that will connect to form a pattern
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
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

    sizes[i] = Math.random() * 2.5 + 0.5;
    opacities[i] = Math.random() * 0.7 + 0.3;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      varying float vOpacity;
      uniform float uTime;
      uniform float uPixelRatio;

      void main() {
        vec3 pos = position;
        // Gentle drift
        pos.x += sin(uTime * 0.1 + position.y * 0.5) * 0.05;
        pos.y += cos(uTime * 0.08 + position.x * 0.3) * 0.05;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Twinkle
        float twinkle = sin(uTime * 2.0 + position.x * 10.0 + position.y * 10.0) * 0.3 + 0.7;
        gl_PointSize = aSize * uPixelRatio * (8.0 / -mvPosition.z) * twinkle;

        vOpacity = aOpacity * twinkle;
      }
    `,
    fragmentShader: `
      varying float vOpacity;

      void main() {
        // Soft circular point
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;

        float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
        // Warm starlight color: mix of white and gold
        vec3 color = mix(vec3(0.91, 0.88, 0.94), vec3(0.83, 0.66, 0.33), 0.15);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
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
      varying vec2 vUv;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;

      void main() {
        float glow = sin(uTime * 1.5) * 0.15 + 0.85;
        vec3 gold = vec3(0.83, 0.66, 0.33);
        gl_FragColor = vec4(gold, uProgress * 0.4 * glow);
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
  // Detect reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Adapt star count to device
  const isMobile = window.innerWidth < 768;
  const starCount = isMobile ? 800 : 1500;

  // Scene setup
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
  renderer.setClearColor(0x000000, 0);

  // Create objects
  const stars = createStars(starCount);
  const constellation = createConstellation();
  scene.add(stars);
  scene.add(constellation);

  // State
  const state: StarFieldState = {
    scene, camera, renderer, stars, constellation,
    mouse: { x: 0, y: 0 },
    scroll: 0,
    animationId: 0,
  };

  // Mouse tracking (parallax)
  window.addEventListener("mousemove", (e) => {
    state.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Scroll tracking
  window.addEventListener("scroll", () => {
    state.scroll = window.scrollY / window.innerHeight;
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    (stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  });

  // Animation loop
  const clock = new THREE.Clock();

  function animate() {
    state.animationId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    const starMaterial = stars.material as THREE.ShaderMaterial;
    const constellationMaterial = constellation.material as THREE.ShaderMaterial;

    // Update uniforms
    starMaterial.uniforms.uTime.value = elapsed;
    constellationMaterial.uniforms.uTime.value = elapsed;

    // Constellation fades in during first 3 seconds, fades out as you scroll past hero
    const constellationProgress = Math.min(elapsed / 3, 1) * Math.max(1 - state.scroll * 1.5, 0);
    constellationMaterial.uniforms.uProgress.value = constellationProgress;

    if (!prefersReducedMotion) {
      // Parallax: camera follows mouse gently
      camera.position.x += (state.mouse.x * 0.3 - camera.position.x) * 0.02;
      camera.position.y += (-state.mouse.y * 0.3 - camera.position.y) * 0.02;

      // Scroll: camera drifts deeper into the star field
      camera.position.z = 8 - state.scroll * 0.5;

      // Gentle star field rotation
      stars.rotation.y = elapsed * 0.01;
      stars.rotation.x = elapsed * 0.005;
    }

    // Fade out stars slightly as user scrolls deep
    starMaterial.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
  }

  animate();
  return state;
}
