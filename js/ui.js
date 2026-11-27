/* A to Z Signs — page UI: smooth scroll, nav, reveals, gallery drag, quote form */
(function () {
  document.body.classList.add('is-loading');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Smooth scrolling (Lenis) ----
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (document.body.classList.contains('is-loading')) lenis.stop();
  }
  window.__lenis = lenis;

  // ---- Loader end (called by scene.js; fallback timeout if WebGL/CDN fails) ----
  let done = false;
  window.finishLoading = function () {
    if (done) return; done = true;
    const fill = document.getElementById('loader-fill');
    if (fill) fill.style.width = '100%';
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('loaded');
      if (lenis) lenis.start();
      revealHero();
    }, 350);
  };
  window.setLoadProgress = function (p) {
    const fill = document.getElementById('loader-fill');
    if (fill) fill.style.width = Math.round(p * 100) + '%';
  };
  setTimeout(() => {
    if (!done) { document.body.classList.add('no-webgl'); window.finishLoading(); }
  }, 12000);

  // ---- Anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id === '#top' ? document.body : document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: 0, duration: 1.8 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ---- Nav state + mobile menu ----
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  const links = document.getElementById('nav-links');
  function closeMenu() { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = !links.classList.contains('open');
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  // ---- Reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && !en.target.closest('.hero')) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  function revealHero() {
    document.querySelectorAll('.hero [data-reveal]').forEach((el) => el.classList.add('in'));
  }

  // ---- Gallery: drag to scroll + tilt ----
  const rail = document.getElementById('work-rail');
  if (rail) {
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft;
      rail.classList.add('dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 3) moved = true;
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { down = false; rail.classList.remove('dragging'); });
    rail.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);

    const tiles = [...rail.querySelectorAll('.tile')];
    const tilt = () => {
      const mid = window.innerWidth / 2;
      tiles.forEach((t) => {
        const r = t.getBoundingClientRect();
        const d = (r.left + r.width / 2 - mid) / mid;
        t.style.setProperty('--ry', (Math.max(-1, Math.min(1, d)) * -14).toFixed(2) + 'deg');
      });
    };
    rail.addEventListener('scroll', tilt, { passive: true });
    window.addEventListener('resize', tilt);
    tilt();
  }

  // ---- Quote form → email ----
  const form = document.getElementById('quote-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d = Object.fromEntries(new FormData(form).entries());
      const subject = `Free quote request — ${d.service} — ${d.name}`;
      const body = `Name: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || '-'}\nService: ${d.service}\n\nProject details:\n${d.details || '-'}`;
      window.location.href = `mailto:AtoZsigns21@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.getElementById('form-note').textContent = 'Thanks! Your email app should open now. Or call (713) 645-4527.';
    });
  }

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
