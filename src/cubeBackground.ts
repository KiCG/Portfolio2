import * as THREE from 'three';

type Cube = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseScale: number;
  rotationSpeed: number;
  riseSpeed: number;
  // vx: number;
  // vy: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mountCubeBackground(container: HTMLElement) {
  const isMobile = window.innerWidth < 768;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
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
  const COUNT = isMobile ? 10 : 24;
  const Y_RANGE = 20;

  let xRange = 24;
  const computeXRange = () => {
    const vFOV = (camera.fov * Math.PI) / 180;
    const distance = camera.position.z - -2;
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    xRange = visibleWidth * 1.0;
  };

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeXRange();
  };
  resize();
  // 初回ロード時のサイズ誤測定を自動で補正するため、コンテナのサイズ変化を監視する
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener('resize', resize);

  const INIT_SEED = 42;
  const INIT_Y_TOP_MARGIN = 1;
  const INIT_Y_BOTTOM_MARGIN = -0.5;
  const INIT_MAX_TRIES = 20;
  const seededRand = mulberry32(INIT_SEED);
  const projected = new THREE.Vector3();

  for (let i = 0; i < COUNT; i++) {
    const cubeMaterial = material.clone();
    const mesh = new THREE.Mesh(geometry, cubeMaterial);

    const px = (seededRand() - 0.5) * xRange;
    const pz = (seededRand() - 0.5) * 8 - 2;
    let py = (seededRand() - 0.5) * Y_RANGE;
    for (let t = 0; t < INIT_MAX_TRIES; t++) {
      projected.set(px, py, pz).project(camera);
      if (projected.y < 1 - INIT_Y_TOP_MARGIN && projected.y > -1 + INIT_Y_BOTTOM_MARGIN) break;
      py = (seededRand() - 0.5) * Y_RANGE;
    }
    mesh.position.set(px, py, pz);

    const scale = 0.5 + seededRand() * 1.2;
    mesh.scale.setScalar(scale);
    mesh.rotation.set(
      seededRand() * Math.PI,
      seededRand() * Math.PI,
      seededRand() * Math.PI,
    );
    scene.add(mesh);
    cubes.push({
      mesh,
      material: cubeMaterial,
      baseScale: scale,
      rotationSpeed: 0.002 + seededRand() * 0.004,
      riseSpeed: 0.01 + seededRand() * 0.015,
      // vx: 0,
      // vy: 0,
    });
  }

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

  // const MOUSE_COLLIDER_RADIUS = 0.2;
  // const MOUSE_KICK_STRENGTH = 0.5;
  // const VELOCITY_FRICTION = 0.94;
  // const mouseNdc = new THREE.Vector2(10, 10);
  // const rayOrigin = new THREE.Vector3();
  // const rayFar = new THREE.Vector3();
  // const rayDir = new THREE.Vector3();
  // let prevMouseX = 0;
  // let prevMouseY = 0;
  // let hasPrevMouse = false;

  // const onMouseMove = (e: MouseEvent) => {
  //   mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
  //   mouseNdc.y = -((e.clientY / window.innerHeight) * 2 - 1);
  // };
  // const onMouseLeave = () => {
  //   mouseNdc.set(10, 10);
  // };
  // window.addEventListener('mousemove', onMouseMove, { passive: true });
  // window.addEventListener('mouseleave', onMouseLeave);

  // カメラから見えている範囲の外でリサイクルする（キューブの z ごとに可視高さが違うため個別に計算）
  const visibleHalfHeightAt = (z: number) => {
    const vFOV = (camera.fov * Math.PI) / 180;
    return Math.tan(vFOV / 2) * (camera.position.z - z);
  };

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

    // const mouseActive = Math.abs(mouseNdc.x) <= 1 && Math.abs(mouseNdc.y) <= 1;
    // let mouseVx = 0;
    // let mouseVy = 0;
    // if (mouseActive) {
    //   rayOrigin.set(mouseNdc.x, mouseNdc.y, -1).unproject(camera);
    //   rayFar.set(mouseNdc.x, mouseNdc.y, 1).unproject(camera);
    //   rayDir.subVectors(rayFar, rayOrigin).normalize();

    //   if (Math.abs(rayDir.z) > 1e-6) {
    //     const t0 = (0 - rayOrigin.z) / rayDir.z;
    //     const curX = rayOrigin.x + t0 * rayDir.x;
    //     const curY = rayOrigin.y + t0 * rayDir.y;
    //     if (hasPrevMouse) {
    //       mouseVx = curX - prevMouseX;
    //       mouseVy = curY - prevMouseY;
    //     }
    //     prevMouseX = curX;
    //     prevMouseY = curY;
    //     hasPrevMouse = true;
    //   }
    // } else {
    //   hasPrevMouse = false;
    // }

    for (const c of cubes) {
      c.mesh.position.y += c.riseSpeed + boost;
      c.mesh.rotation.z += c.rotationSpeed;

      // if (mouseActive && Math.abs(rayDir.z) > 1e-6) {
      //   const t = (c.mesh.position.z - rayOrigin.z) / rayDir.z;
      //   const hitX = rayOrigin.x + t * rayDir.x;
      //   const hitY = rayOrigin.y + t * rayDir.y;
      //   const dx = c.mesh.position.x - hitX;
      //   const dy = c.mesh.position.y - hitY;
      //   const combinedR = MOUSE_COLLIDER_RADIUS + c.baseScale * 0.5;
      //   const d2 = dx * dx + dy * dy;
      //   if (d2 < combinedR * combinedR) {
      //     const d = Math.max(Math.sqrt(d2), 1e-4);
      //     const overlap = combinedR - d;
      //     const nx = dx / d;
      //     const ny = dy / d;
      //     c.mesh.position.x += nx * overlap;
      //     c.mesh.position.y += ny * overlap;
      //     c.vx += mouseVx * MOUSE_KICK_STRENGTH;
      //     c.vy += mouseVy * MOUSE_KICK_STRENGTH;
      //   }
      // }

      // c.mesh.position.x += c.vx;
      // c.mesh.position.y += c.vy;
      // c.vx *= VELOCITY_FRICTION;
      // c.vy *= VELOCITY_FRICTION;

      const margin = visibleHalfHeightAt(c.mesh.position.z) + c.baseScale;
      const topY = Math.max(20, margin);
      const bottomY = -margin;
      if (c.mesh.position.y > topY) {
        c.mesh.position.y = bottomY;
        c.mesh.position.x = (Math.random() - 0.5) * xRange;
        // c.vx = 0;
        // c.vy = 0;
      } else if (c.mesh.position.y < bottomY) {
        c.mesh.position.y = topY;
        c.mesh.position.x = (Math.random() - 0.5) * xRange;
        // c.vx = 0;
        // c.vy = 0;
      }
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    window.removeEventListener('resize', resize);
    // window.removeEventListener('resize', updateScrollRange);
    window.removeEventListener('scroll', onScroll);
    // window.removeEventListener('mousemove', onMouseMove);
    // window.removeEventListener('mouseleave', onMouseLeave);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    for (const c of cubes) c.material.dispose();
    container.removeChild(renderer.domElement);
  };
}
