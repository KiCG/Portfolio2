import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// import { Text } from 'troika-three-text';

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fresnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(vNormal, viewDir), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor * uIntensity * fresnel, fresnel);
  }
`;

// const SPHERE_R = 2.06;
// const LEFT = -10;
// const SPACING = 0.42;

// const PARTICLE_COUNT = 250;
// const PARTICLE_R = 2.0;

export function mountFlowingSphere(container: HTMLElement) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(5, 6, 5);
  scene.add(dir);
  const p1 = new THREE.PointLight(0x5fb9ff, 0.8);
  p1.position.set(-6, -3, -4);
  scene.add(p1);
  const p2 = new THREE.PointLight(0xff8a5f, 0.6);
  p2.position.set(4, -2, 6);
  scene.add(p2);

  const fresnelUniforms = {
    uColor: { value: new THREE.Color('#ff7a2a') },
    uPower: { value: 2.8 },
    uIntensity: { value: 2.6 },
  };
  const fresnelMat = new THREE.ShaderMaterial({
    vertexShader: fresnelVertex,
    fragmentShader: fresnelFragment,
    uniforms: fresnelUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fresnelMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 96), fresnelMat);
  scene.add(fresnelMesh);

  /*
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);
    const dist = PARTICLE_R * (1 + Math.random() * 1.5);
    positions[i * 3] = nx * dist;
    positions[i * 3 + 1] = ny * dist;
    positions[i * 3 + 2] = nz * dist;
    const speed = 0.4 + Math.random() * 0.6;
    velocities[i * 3] = nx * speed;
    velocities[i * 3 + 1] = ny * speed;
    velocities[i * 3 + 2] = nz * speed;
  }
  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.025,
    color: 0xff9a5a,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeom, particleMat);
  scene.add(particles);

  const streamText = '   Hello, I`m Ryusei Kishi   ';
  const streamY = 0;
  const streamSpeed = 1.2;
  const streamFontSize = 0.45;
  const streamColor = '#ffffff';

  const src = Array.from(streamText);
  const minCount = Math.ceil(20 / SPACING) + 4;
  const charCount = Math.ceil(minCount / src.length) * src.length;
  const span = charCount * SPACING;
  const charObjects: Text[] = [];
  const charXs: number[] = [];
  for (let i = 0; i < charCount; i++) {
    const t = new Text();
    t.text = src[i % src.length];
    t.fontSize = streamFontSize;
    t.color = streamColor;
    t.anchorX = 'center';
    t.anchorY = 'middle';
    t.sync();
    scene.add(t);
    charObjects.push(t);
    charXs.push(4 + i * SPACING);
  }
  */

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    1.4,
    0.4,
    0.9,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const clock = new THREE.Clock();
  let rafId = 0;
  let running = true;

  const tick = () => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);

    fresnelMesh.rotation.y += dt * 0.1;

    /*
    const pos = particleGeom.attributes.position.array as Float32Array;
    const limit2 = (PARTICLE_R * 2.5) ** 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] += velocities[i * 3] * dt;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      const dx = pos[i * 3];
      const dy = pos[i * 3 + 1];
      const dz = pos[i * 3 + 2];
      if (dx * dx + dy * dy + dz * dz > limit2) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.sin(phi) * Math.sin(theta);
        const nz = Math.cos(phi);
        pos[i * 3] = nx * PARTICLE_R;
        pos[i * 3 + 1] = ny * PARTICLE_R;
        pos[i * 3 + 2] = nz * PARTICLE_R;
        const s = 0.4 + Math.random() * 0.6;
        velocities[i * 3] = nx * s;
        velocities[i * 3 + 1] = ny * s;
        velocities[i * 3 + 2] = nz * s;
      }
    }
    particleGeom.attributes.position.needsUpdate = true;

    for (let i = 0; i < charCount; i++) {
      let x = charXs[i] - dt * streamSpeed;
      if (x < LEFT) x += span;
      charXs[i] = x;

      const r = SPHERE_R;
      const outerEdge = r + 0.3;
      const innerEdge = r - 0.5;
      const d = Math.sqrt(x * x + streamY * streamY);
      const g = charObjects[i];

      if (d < outerEdge) {
        const zSphere = Math.sqrt(r * r - Math.min(d, r - 0.001) ** 2);
        const raw = (outerEdge - d) / (outerEdge - innerEdge);
        const t = Math.max(0, Math.min(1, raw));
        const st = t * t * (3 - 2 * t);
        const z = zSphere * st;
        g.position.set(x, streamY, z + 0.02 * st);
        g.rotation.y = Math.atan2(x, Math.max(z, 0.001)) * st;
      } else {
        g.position.set(x, streamY, 0);
        g.rotation.y = 0;
      }
    }
    */

    composer.render();
    rafId = requestAnimationFrame(tick);
  };

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !running) {
          running = true;
          clock.getDelta();
          rafId = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(rafId);
        }
      }
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(container);

  tick();

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    renderer.dispose();
    composer.dispose();
    // particleGeom.dispose();
    // particleMat.dispose();
    fresnelMat.dispose();
    fresnelMesh.geometry.dispose();
    // charObjects.forEach((t) => t.dispose());
    renderer.domElement.remove();
  };
}
