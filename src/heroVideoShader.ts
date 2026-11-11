import * as THREE from 'three';

type MountOptions = {
  container: HTMLElement;
  video: HTMLVideoElement;
  section: HTMLElement;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform float uIntensity;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uVideoAspect;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 coverUv(vec2 uv) {
    float screenAspect = uResolution.x / uResolution.y;
    if (screenAspect > uVideoAspect) {
      float scale = uVideoAspect / screenAspect;
      uv.y = (uv.y - 0.5) * scale + 0.5;
    } else {
      float scale = screenAspect / uVideoAspect;
      uv.x = (uv.x - 0.5) * scale + 0.5;
    }
    return uv;
  }

  void main() {
    vec2 uv = coverUv(vUv);

    vec2 center = vec2(0.5);
    vec2 dir = uv - center;
    float dist = length(dir);

    float sparkleHz = 26.0;
    float jitter = 0.7 + 0.3 * sin(uTime * sparkleHz);
    float jitterSub = 0.75 + 0.25 * sin(uTime * 9.0 + 1.3);

    vec2 verticalBias = vec2(1.0, 2.2);
    float baseAmount = uIntensity * 0.09;
    vec2 offset = dir * (dist + 0.15) * baseAmount * verticalBias * jitter;

    vec3 color;
    color.r = texture2D(uVideo, uv + offset).r;
    color.g = texture2D(uVideo, uv).g;
    color.b = texture2D(uVideo, uv - offset).b;

    float sparkleSeed = floor(uTime * 24.0);
    float sparkle = hash(vUv * 420.0 + sparkleSeed);
    sparkle = pow(sparkle, 42.0) * uIntensity * 2.4 * jitterSub;

    float edgeBoost = smoothstep(0.1, 0.9, dist);
    sparkle *= 0.4 + edgeBoost;

    color += sparkle;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function mountHeroVideoShader({ container, video, section }: MountOptions) {
  const isMobile = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const texture = new THREE.VideoTexture(video);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const uniforms = {
    uVideo: { value: texture },
    uIntensity: { value: 0 },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVideoAspect: { value: 16 / 9 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  };

  const updateVideoAspect = () => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight;
    }
  };

  resize();
  updateVideoAspect();
  window.addEventListener('resize', resize);
  video.addEventListener('loadedmetadata', updateVideoAspect);

  const MAX_INTENSITY = 1.6;
  const EASE_POWER = 1.6;
  const SMOOTHING = 0.15;

  let targetIntensity = 0;

  const computeProgress = (): number => {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = -rect.top;
    return Math.min(1, Math.max(0, scrolled / scrollable));
  };

  const updateTarget = () => {
    const progress = computeProgress();
    targetIntensity = Math.pow(progress, EASE_POWER) * MAX_INTENSITY;
  };

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', updateTarget, { passive: true });
  updateTarget();

  const startTs = performance.now();
  let rafId: number;
  const tick = () => {
    if (!container.hidden) {
      uniforms.uTime.value = (performance.now() - startTs) / 1000;
      uniforms.uIntensity.value += (targetIntensity - uniforms.uIntensity.value) * SMOOTHING;
      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('resize', updateTarget);
    window.removeEventListener('scroll', updateTarget);
    video.removeEventListener('loadedmetadata', updateVideoAspect);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    texture.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
