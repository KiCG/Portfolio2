import './style.css';
import { mountCubeBackground } from './cubeBackground';
// import { mountFlowingSphere } from './flowingSphere';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

const cubeBg = document.querySelector<HTMLElement>('.cube-bg');
if (cubeBg) mountCubeBackground(cubeBg);

type ScrollVideoOptions = {
  section: HTMLElement;
  video: HTMLVideoElement;
  smoothing?: number;
};

function initScrollVideo({ section, video, smoothing = 0.15 }: ScrollVideoOptions) {
  let duration = 0;
  let targetTime = 0;
  let currentTime = 0;
  let rafId: number | null = null;

  const computeProgress = (): number => {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = -rect.top;
    return Math.min(1, Math.max(0, scrolled / scrollable));
  };

  const tick = () => {
    const diff = targetTime - currentTime;
    if (Math.abs(diff) < 0.001) {
      currentTime = targetTime;
      rafId = null;
    } else {
      currentTime += diff * smoothing;
      rafId = requestAnimationFrame(tick);
    }
    if (video.readyState >= 2) {
      video.currentTime = currentTime;
    }
  };

  const schedule = () => {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    if (duration <= 0) return;
    targetTime = computeProgress() * duration;
    schedule();
  };

  const onMetadata = () => {
    duration = video.duration;
    onScroll();
  };

  if (video.readyState >= 1 && video.duration > 0) {
    onMetadata();
  } else {
    video.addEventListener('loadedmetadata', onMetadata, { once: true });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

type TapToPlayOptions = {
  section: HTMLElement;
  video: HTMLVideoElement;
  fallbackDuration?: number;
};

function initTapToPlay({ section, video, fallbackDuration = 2400 }: TapToPlayOptions) {
  let animating = false;

  const scrollTo = (targetY: number, duration: number) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 1 || duration <= 0) return;

    const startTime = performance.now();
    animating = true;

    const cancel = () => {
      animating = false;
    };
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchmove', cancel, { passive: true, once: true });
    window.addEventListener('keydown', cancel, { once: true });

    const step = (now: number) => {
      if (!animating) return;
      const elapsed = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, startY + distance * elapsed);
      if (elapsed < 1) {
        requestAnimationFrame(step);
      } else {
        animating = false;
      }
    };
    requestAnimationFrame(step);
  };

  section.addEventListener('click', () => {
    if (animating) return;
    const videoScrollable = section.offsetHeight - window.innerHeight;
    const endY = section.offsetTop + section.offsetHeight + 100;
    const remaining = Math.max(0, endY - window.scrollY);
    const ratio = videoScrollable > 0 ? remaining / videoScrollable : 0;
    const totalMs = video.duration > 0 ? video.duration * 1000 : fallbackDuration;
    scrollTo(endY, totalMs * ratio);
  });
}

function initRevealOnScroll() {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-revealed', entry.isIntersecting);
      }
    },
    { threshold: 0.8 },
  );

  targets.forEach((el) => observer.observe(el));
}

function initRevealUpOnScroll() {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal-up]');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.3 },
  );

  targets.forEach((el) => observer.observe(el));
}

const heroSection = document.querySelector<HTMLElement>('[data-hero]');
const heroVideo = document.querySelector<HTMLVideoElement>('[data-hero-video]');

if (heroSection && heroVideo) {
  initScrollVideo({ section: heroSection, video: heroVideo });
  initTapToPlay({ section: heroSection, video: heroVideo });
}

initRevealOnScroll();
initRevealUpOnScroll();

// document.querySelectorAll<HTMLElement>('[data-sphere]').forEach((el) => {
//   mountFlowingSphere(el);
//   el.addEventListener('click', () => {
//     el.classList.toggle('is-active');
//   });
// });

const aboutNavButton = document.querySelector<HTMLButtonElement>('[data-nav-to="about"]');
if (aboutNavButton && heroSection) {
  aboutNavButton.addEventListener('click', () => {
    const target = heroSection.offsetTop + heroSection.offsetHeight + 100;
    window.scrollTo({ top: target, behavior: 'smooth' });
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function typewriteInto(target: HTMLElement, html: string, speed = 25) {
  const template = document.createElement('template');
  template.innerHTML = html;

  const typeNode = async (node: Node, parent: HTMLElement) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (const ch of text) {
        parent.appendChild(document.createTextNode(ch));
        if (!/\s/.test(ch)) await sleep(speed);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const clone = el.cloneNode(false) as HTMLElement;
      parent.appendChild(clone);
      if (el.tagName === 'BR') {
        await sleep(speed * 10);
        return;
      }
      for (const child of Array.from(el.childNodes)) {
        await typeNode(child, clone);
      }
    }
  };

  for (const child of Array.from(template.content.childNodes)) {
    await typeNode(child, target);
  }
}

function initTypewriter(target: HTMLElement, delayMs = 1500, speed = 25, threshold = 0.3) {
  const originalHTML = target.innerHTML;
  target.innerHTML = '';
  let typed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!typed && entry.isIntersecting) {
          typed = true;
          observer.unobserve(entry.target);
          setTimeout(() => typewriteInto(target, originalHTML, speed), delayMs);
        }
      }
    },
    { threshold },
  );
  observer.observe(target);
}

const aboutRight = document.querySelector<HTMLParagraphElement>('.about-right p');
const aboutSticky = document.querySelector<HTMLElement>('.about-sticky');
if (aboutRight && aboutSticky) {
  const originalHTML = aboutRight.innerHTML;
  aboutRight.innerHTML = '';
  let typed = false;

  const start = () => {
    if (typed || !aboutSticky.classList.contains('is-revealed')) return;
    typed = true;
    setTimeout(() => typewriteInto(aboutRight, originalHTML, 25), 1500);
  };

  const mutObserver = new MutationObserver(start);
  mutObserver.observe(aboutSticky, { attributes: true, attributeFilter: ['class'] });
  start();
}

const workRight = document.querySelector<HTMLParagraphElement>('.work-right p');
if (workRight) {
  initTypewriter(workRight, 500, 25, 0.3);
}

const homeNavButton = document.querySelector<HTMLButtonElement>('[data-nav-to="top"]');
if (homeNavButton) {
  homeNavButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const cursor = document.querySelector<HTMLElement>('.cursor');
if (cursor) {
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let rafId: number | null = null;

  const tick = () => {
    currentX += (targetX - currentX) * 0.25;
    currentY += (targetY - currentY) * 0.25;
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (rafId === null) rafId = requestAnimationFrame(tick);
  });

  window.addEventListener(
    'click',
    () => {
      cursor.classList.remove('is-hint');
      document.body.classList.remove('is-locked');
    },
    { once: true },
  );
}

document.querySelectorAll<HTMLElement>('.work-card[data-href]').forEach((card) => {
  const href = card.dataset.href;
  if (!href) return;
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.work-card__nav, .work-card__dot')) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  });
});

document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((card) => {
  const slides = Array.from(card.querySelectorAll<HTMLElement>('.work-card__slide'));
  if (slides.length <= 1) {
    card.querySelectorAll('.work-card__nav').forEach((btn) => btn.remove());
    return;
  }

  const dotsContainer = card.querySelector<HTMLElement>('[data-dots]');
  const dots: HTMLButtonElement[] = [];
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'work-card__dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', `${i + 1}枚目へ`);
    dot.addEventListener('click', () => go(i));
    dotsContainer?.appendChild(dot);
    dots.push(dot);
  });

  let index = 0;
  const go = (next: number) => {
    const n = (next + slides.length) % slides.length;
    slides[index].classList.remove('is-active');
    dots[index].classList.remove('is-active');
    slides[n].classList.add('is-active');
    dots[n].classList.add('is-active');
    index = n;
  };

  card.querySelectorAll<HTMLButtonElement>('.work-card__nav').forEach((btn) => {
    const dir = Number(btn.dataset.dir ?? 1);
    btn.addEventListener('click', () => go(index + dir));
  });
});

const historySection = document.querySelector<HTMLElement>('.history');
if (historySection) {
  const themeObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        document.body.classList.toggle('theme-dark', entry.isIntersecting);
      }
    },
    { threshold: 0, rootMargin: '-30% 0px -30% 0px' },
  );
  themeObserver.observe(historySection);
}
