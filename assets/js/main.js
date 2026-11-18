/* Footnote Talent — interactions & scroll animations */
(function () {
  const body = document.body;
  body.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Menu ---------- */
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => {
    const o = body.classList.toggle('open');
    burger.setAttribute('aria-expanded', o);
  });
  document.querySelectorAll('#drawer a').forEach(a => a.addEventListener('click', () => {
    body.classList.remove('open'); burger.setAttribute('aria-expanded', false);
  }));

  /* ---------- Tabs ---------- */
  const tabsEl = document.querySelector('.tabs');
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    const k = t.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
    document.querySelectorAll('.fpanel').forEach(p => p.classList.toggle('on', p.dataset.panel === k));
    tabsEl.classList.toggle('cand', k === 'cand');
  }));

  /* ---------- Forms (front-end only — connect to your backend) ---------- */
  const up = document.getElementById('b3'), upTxt = document.getElementById('b3txt');
  up.addEventListener('change', () => { if (up.files[0]) upTxt.textContent = up.files[0].name; });
  function wire(id, req, msg) {
    const f = document.getElementById(id), ok = f.querySelector('.okmsg');
    f.addEventListener('submit', e => {
      e.preventDefault();
      let bad = 0;
      req.forEach(r => {
        const el = document.getElementById(r);
        const b = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
        el.classList.toggle('bad', b); if (b) bad++;
      });
      if (bad) { ok.textContent = 'Please fill in the highlighted fields.'; return; }
      ok.textContent = msg(document.getElementById(req[0]).value.trim().split(' ')[0]);
      f.reset(); upTxt.textContent = 'Upload your CV — PDF or DOCX';
    });
  }
  wire('fFirm', ['a1', 'a2', 'a3'], n => `Thank you, ${n}. A specialist recruiter will call you within one working day.`);
  wire('fCand', ['b1', 'b2'], n => `Thanks, ${n}. We'll reach out only when a role matches your profile.`);

  /* ---------- Videos: play only when visible ---------- */
  const vids = document.querySelectorAll('video');
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
  }), { threshold: 0.15 });
  vids.forEach(v => { v.muted = true; vio.observe(v); });

  /* ---------- Statement: split into words ---------- */
  const st = document.getElementById('scrubText');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="sw">${w}</span>`).join(' ');

  /* ---------- Nav state ---------- */
  const nav = document.getElementById('nav'); let lastY = 0;
  const navState = y => {
    nav.classList.toggle('hide', y > lastY && y > 300 && !body.classList.contains('open'));
    lastY = y;
  };

  if (typeof gsap === 'undefined' || reduce) {
    document.querySelectorAll('.sw').forEach(s => s.style.opacity = 1);
    document.querySelectorAll('[data-to]').forEach(b => b.textContent = b.dataset.to);
    document.querySelector('.expand__copy').style.opacity = 1;
    addEventListener('scroll', () => navState(scrollY), { passive: true });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); const t = id.length > 1 && document.querySelector(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -20 }); }
    }));
  }
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => navState(s.scroll()) });

  /* ---------- Hero intro ---------- */
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('#heroFrame', { clipPath: 'inset(8% 6% 8% 6% round 28px)', duration: 1.6, ease: 'expo.inOut' })
    .from('.hero__title .w', { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.08 }, '-=.9')
    .from('.hero-fade', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, '-=1');

  /* hero: 3D parallax on pointer (title layers vs video) */
  if (fine) {
    const vx = gsap.quickTo('#heroVideo', 'x', { duration: 1.2, ease: 'power3' });
    const vy = gsap.quickTo('#heroVideo', 'y', { duration: 1.2, ease: 'power3' });
    const tx = gsap.quickTo('#heroTitle', 'x', { duration: 1, ease: 'power3' });
    const ty = gsap.quickTo('#heroTitle', 'y', { duration: 1, ease: 'power3' });
    const hero = document.getElementById('hero');
    hero.addEventListener('pointermove', e => {
      const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
      vx(px * -30); vy(py * -20); tx(px * 24); ty(py * 14);
    });
  }
  /* hero: scroll — video zooms out, title lifts, frame shrinks */
  gsap.to('#heroVideo', { scale: 1, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -25, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('#heroFrame', { scale: 0.94, borderRadius: 48, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'center top', end: 'bottom top', scrub: true } });

  /* ---------- Ticker: infinite + scroll-velocity boost + direction flip ---------- */
  (function () {
    const el = document.getElementById('ticker'); let x = 0, dir = -1, boost = 0;
    gsap.ticker.add(() => {
      x += dir * (0.7 + boost); boost *= 0.9;
      const W = el.scrollWidth / 2;
      if (x <= -W) x += W; if (x > 0) x -= W;
      el.style.transform = `translate3d(${x}px,0,0)`;
    });
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 150, 14); dir = s.direction > 0 ? -1 : 1; } });
  })();

  /* ---------- Statement: word-by-word scrub + floating images ---------- */
  gsap.to('.sw', { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top 70%', end: 'bottom 75%', scrub: true } });
  gsap.utils.toArray('[data-par]').forEach(el => {
    const s = parseFloat(el.dataset.par);
    gsap.fromTo(el, { y: -s * 300 }, { y: s * 300, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1001px)', () => {
    /* ---------- Expanding video (pinned) ---------- */
    const etl = gsap.timeline({ scrollTrigger: { trigger: '#expand', start: 'top top', end: '+=140%', pin: '.expand__pin', scrub: 1, anticipatePin: 1 } });
    etl.to('#expandBox', { width: '100vw', height: '100vh', borderRadius: 0, ease: 'none' })
       .to('.expand__shade', { opacity: 1, ease: 'none' }, '<0.3')
       .to('#expandCopy', { opacity: 1, y: 0, ease: 'none' }, '<0.4')
       .from('#expandCopy h2', { yPercent: 40, ease: 'none' }, '<');

    /* ---------- Work: horizontal video reel (pinned) ---------- */
    const track = document.getElementById('workTrack');
    const dist = () => track.scrollWidth - innerWidth + 60;
    const hz = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#workPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => { gsap.set('#workBar', { scaleX: s.progress }); document.getElementById('workNum').textContent = '0' + Math.min(5, 1 + Math.floor(s.progress * 5)); }
      }
    });
    gsap.utils.toArray('.vcard').forEach(c => {
      gsap.from(c, { y: 80, rotate: 3, opacity: 0.4, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: hz, start: 'left 105%', end: 'left 70%', scrub: true } });
    });

    /* ---------- Roles: cursor-following image ---------- */
    const box = document.getElementById('cursorImg'), img = box.querySelector('img');
    const cx = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' });
    const cy = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
    addEventListener('pointermove', e => { cx(e.clientX + 40); cy(e.clientY); });
    document.querySelectorAll('.rrow').forEach(r => {
      r.addEventListener('pointerenter', () => { img.src = r.dataset.img; gsap.to(box, { opacity: 1, scale: 1, rotate: -4, duration: 0.5, ease: 'expo.out' }); });
      r.addEventListener('pointerleave', () => gsap.to(box, { opacity: 0, scale: 0.6, rotate: 0, duration: 0.4 }));
    });
  });
  mm.add('(max-width: 1000px)', () => { gsap.set('#expandCopy', { opacity: 1 }); gsap.set('.expand__shade', { opacity: 1 }); gsap.set('#expandBox', { width: '100%', height: '100%', borderRadius: 0 }); });

  /* ---------- Stacked cards: scale back as next card arrives ---------- */
  const cards = gsap.utils.toArray('.scard');
  cards.forEach((c, i) => {
    gsap.fromTo(c.querySelector('img'), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 110px', scrub: true } });
    if (i < cards.length - 1) {
      gsap.to(c, { scale: 0.92 - (cards.length - i) * 0.01, filter: 'brightness(.82)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 110px', scrub: true } });
    }
  });

  /* ---------- Roles rows reveal ---------- */
  gsap.from('.rrow', { y: 50, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '#rlist', start: 'top 80%' } });

  /* ---------- Counters ---------- */
  document.querySelectorAll('[data-to]').forEach(b => {
    const o = { v: 0 }, to = +b.dataset.to;
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => b.textContent = Math.round(o.v), scrollTrigger: { trigger: b, start: 'top 85%' } });
  });

  /* ---------- Timeline ---------- */
  gsap.to('#tlLine', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 75%', end: 'bottom 55%', scrub: true } });
  document.querySelectorAll('.tstep').forEach((s, i) => {
    ScrollTrigger.create({ trigger: '#timeline', start: () => `top+=${i * 60} 70%`, onEnter: () => s.classList.add('on'), onLeaveBack: () => s.classList.remove('on') });
    gsap.from(s, { y: 40, opacity: 0, duration: 1, delay: i * 0.12, ease: 'expo.out', scrollTrigger: { trigger: '#timeline', start: 'top 80%' } });
  });

  /* ---------- Section headings reveal ---------- */
  gsap.utils.toArray('.sec-head .display, .faq .display, .contact .display').forEach(h => {
    gsap.from(h, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  /* ---------- Footer wordmark drift ---------- */
  gsap.fromTo('#footWord', { xPercent: 10 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
