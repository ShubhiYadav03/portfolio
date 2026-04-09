import * as THREE from "three";

/**
 * Globe — "A Little World Made Cunningly"
 *
 * Interactive wireframe globe with glowing hotspots representing
 * life facets (Gaming, Reading, Engineering, Music).
 * Responds to mouse movement for gentle rotation.
 */

interface Hotspot {
  position: THREE.Vector3;
  label: string;
  emoji: string;
  color: THREE.Color;
}

const HOTSPOTS: Hotspot[] = [
  { position: new THREE.Vector3(), label: "Gaming", emoji: "🎮", color: new THREE.Color(0xff9f43) },
  { position: new THREE.Vector3(), label: "Reading", emoji: "📚", color: new THREE.Color(0xd4a853) },
  { position: new THREE.Vector3(), label: "Engineering", emoji: "💻", color: new THREE.Color(0xe8e0f0) },
  { position: new THREE.Vector3(), label: "Music", emoji: "🎵", color: new THREE.Color(0xf0c66e) },
];

// Place hotspots on sphere surface using lat/lng
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createGlobeMesh(): THREE.Group {
  const group = new THREE.Group();

  // Main wireframe sphere
  const sphereGeom = new THREE.IcosahedronGeometry(1.8, 3);
  const wireframe = new THREE.WireframeGeometry(sphereGeom);
  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0xd4a853,
    transparent: true,
    opacity: 0.12,
  });
  const wireLines = new THREE.LineSegments(wireframe, wireMaterial);
  group.add(wireLines);

  // Inner glow sphere
  const glowGeom = new THREE.SphereGeometry(1.75, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        // Fresnel-like edge glow
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        vec3 gold = vec3(0.83, 0.66, 0.33);
        vec3 indigo = vec3(0.06, 0.08, 0.2);

        // Subtle pulse
        float pulse = sin(uTime * 0.8) * 0.1 + 0.9;

        vec3 color = mix(indigo, gold, fresnel * pulse);
        float alpha = fresnel * 0.35 * pulse;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowSphere = new THREE.Mesh(glowGeom, glowMaterial);
  group.add(glowSphere);

  // Latitude / longitude grid lines
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xd4a853,
    transparent: true,
    opacity: 0.06,
  });

  // Latitude circles
  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = [];
    for (let lng = 0; lng <= 360; lng += 5) {
      points.push(latLngToVec3(lat, lng, 1.81));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geom, gridMaterial));
  }

  // Longitude arcs
  for (let lng = 0; lng < 360; lng += 30) {
    const points: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      points.push(latLngToVec3(lat, lng, 1.81));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geom, gridMaterial));
  }

  return group;
}

function createHotspotMeshes(globe: THREE.Group): THREE.Mesh[] {
  const positions = [
    latLngToVec3(35, -100, 1.85),   // Gaming (North America)
    latLngToVec3(50, 10, 1.85),     // Reading (Europe)
    latLngToVec3(20, 78, 1.85),     // Engineering (India)
    latLngToVec3(-35, 150, 1.85),   // Music (Australia)
  ];

  const meshes: THREE.Mesh[] = [];

  positions.forEach((pos, i) => {
    HOTSPOTS[i].position.copy(pos);

    // Hotspot dot
    const dotGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({
      color: HOTSPOTS[i].color,
      transparent: true,
      opacity: 0.9,
    });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    dot.position.copy(pos);
    dot.userData = { index: i, label: HOTSPOTS[i].label };
    globe.add(dot);
    meshes.push(dot);

    // Pulse ring
    const ringGeom = new THREE.RingGeometry(0.08, 0.12, 24);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: HOTSPOTS[i].color },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float pulse = sin(uTime * 2.0 + ${i.toFixed(1)} * 1.5) * 0.4 + 0.6;
          gl_FragColor = vec4(uColor, pulse * 0.6);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    globe.add(ring);
  });

  return meshes;
}

export function initGlobe(canvas: HTMLCanvasElement): void {
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 5.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // Globe
  const globe = createGlobeMesh();
  scene.add(globe);

  // Hotspots
  const hotspotMeshes = createHotspotMeshes(globe);

  // Mouse tracking for rotation
  const mouse = { x: 0, y: 0 };
  const targetRotation = { x: 0, y: 0 };

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  // Tooltip for hotspots
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  container.style.cursor = "grab";
  canvas.style.pointerEvents = "auto";

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hotspotMeshes);

    if (intersects.length > 0) {
      container.style.cursor = "pointer";
      const idx = intersects[0].object.userData.index;
      highlightFacet(idx);
    } else {
      container.style.cursor = "grab";
      highlightFacet(-1);
    }
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hotspotMeshes);

    if (intersects.length > 0) {
      const idx = intersects[0].object.userData.index;
      highlightFacet(idx);
    }
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

  // Animation
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Auto-rotate + mouse influence
    targetRotation.y = elapsed * 0.15 + mouse.x * 0.5;
    targetRotation.x = mouse.y * 0.3;

    globe.rotation.y += (targetRotation.y - globe.rotation.y) * 0.02;
    globe.rotation.x += (targetRotation.x - globe.rotation.x) * 0.02;

    // Update shader uniforms
    globe.children.forEach((child) => {
      if ((child as THREE.Mesh).material && "uniforms" in (child as any).material) {
        (child as any).material.uniforms.uTime.value = elapsed;
      }
    });

    renderer.render(scene, camera);
  }

  animate();
}

/** Highlight the corresponding facet card in the DOM */
function highlightFacet(index: number) {
  const cards = document.querySelectorAll(".facet-card");
  cards.forEach((card, i) => {
    if (i === index) {
      card.classList.add("border-lamplight/40", "bg-lamplight/[0.06]");
      card.classList.remove("border-cream/5", "bg-cream/[0.02]");
    } else {
      card.classList.remove("border-lamplight/40", "bg-lamplight/[0.06]");
      card.classList.add("border-cream/5", "bg-cream/[0.02]");
    }
  });
}
