import * as THREE from 'three';

type Cube = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseScale: number;
  rotationSpeed: number;
  riseSpeed: number;
};

export function mountCubeBackground(container: HTMLElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const BASE_OPACITY = 0.4;
  const material = new THREE.MeshBasicMaterial({
    color: 0x999999,
    wireframe: true,
    transparent: true,
    opacity: BASE_OPACITY,
  });

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const cubes: Cube[] = [];
  const COUNT = 24;
  const Y_RANGE = 20;

  for (let i = 0; i < COUNT; i++) {
    const cubeMaterial = material.clone();
    const mesh = new THREE.Mesh(geometry, cubeMaterial);
    mesh.position.x = (Math.random() - 0.5) * 24;
    mesh.position.y = (Math.random() - 0.5) * Y_RANGE;
    mesh.position.z = (Math.random() - 0.5) * 8 - 2;
    const scale = 0.5 + Math.random() * 1.2;
    mesh.scale.setScalar(scale);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);
    cubes.push({
      mesh,
      material: cubeMaterial,
      baseScale: scale,
      rotationSpeed: 0.002 + Math.random() * 0.004,
      riseSpeed: 0.01 + Math.random() * 0.015,
    });
  }

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let lastScrollY = window.scrollY;
  let scrollDelta = 0;
  const PARALLAX_FACTOR = 0.001;
  const SCROLL_DECAY = 0.9;

  const onScroll = () => {
    const current = window.scrollY;
    scrollDelta += current - lastScrollY;
    lastScrollY = current;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const topY = 20;
  const bottomY = -Y_RANGE / 2;

  // const heroSection = document.querySelector<HTMLElement>('.hero');
  // let FADE_IN_START = 0;
  // let FADE_IN_END = 1;
  // const updateScrollRange = () => {
  //   if (!heroSection) return;
  //   const heroEnd = heroSection.offsetTop + heroSection.offsetHeight;
  //   FADE_IN_START = heroEnd - window.innerHeight;
  //   FADE_IN_END = heroEnd;
  // };
  // updateScrollRange();
  // window.addEventListener('resize', updateScrollRange);

  // const TOP_FADE_RANGE_PX = 200;
  // const projected = new THREE.Vector3();

  let rafId: number;
  const tick = () => {
    const boost = scrollDelta * PARALLAX_FACTOR;
    scrollDelta *= SCROLL_DECAY;

    // const scrollY = window.scrollY;
    // let fadeRatio = 0;
    // if (scrollY >= FADE_IN_END) {
    //   fadeRatio = 1;
    // } else if (scrollY > FADE_IN_START) {
    //   fadeRatio = (scrollY - FADE_IN_START) / (FADE_IN_END - FADE_IN_START);
    // }

    // const canvasH = container.clientHeight;

    for (const c of cubes) {
      c.mesh.position.y += c.riseSpeed + boost;
      c.mesh.rotation.z += c.rotationSpeed;

      // projected.copy(c.mesh.position).project(camera);
      // const pixelY = (-projected.y * 0.5 + 0.5) * canvasH;
      // const topFade = Math.max(0, Math.min(1, pixelY / TOP_FADE_RANGE_PX));
      // c.material.opacity = BASE_OPACITY * fadeRatio;

      if (c.mesh.position.y > topY) {
        c.mesh.position.y = bottomY;
        c.mesh.position.x = (Math.random() - 0.5) * 24;
      } else if (c.mesh.position.y < bottomY) {
        c.mesh.position.y = topY;
        c.mesh.position.x = (Math.random() - 0.5) * 24;
      }
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    // window.removeEventListener('resize', updateScrollRange);
    window.removeEventListener('scroll', onScroll);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    for (const c of cubes) c.material.dispose();
    container.removeChild(renderer.domElement);
  };
}
