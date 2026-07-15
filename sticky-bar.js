/* Superpower sticky-bar enhancements (Bar - Sticky Bottom redesign, July 2026)
   1) Scroll reveal via .sp-shown class on ALL bars (the legacy per-embed script
      only targets the first bar and loses to the component CSS anyway).
   2) Marquee title AND subtext rows ONLY when they would wrap to a 2nd line.
      Seamless: two copies, item padding-right = the gap, -50% = exact cycle.
   3) Match Lorikeet launcher to the bar (64px, r14, beside the pill) and keep
      the greeting bubble positioned ABOVE the launcher icon. */
(function () {
  // ---------- 1) scroll reveal ----------
  function reveal() {
    var on = window.scrollY > 10;
    document.querySelectorAll('.sp2_banner-bottom').forEach(function (b) {
      b.classList.toggle('sp-shown', on);
    });
  }

  // ---------- 2) marquee (generic, overflow-triggered) ----------
  function makeMarquee(el) {
    if (!el || el.dataset.spMarquee) return;
    if (el.scrollWidth <= el.clientWidth + 1) return; // fits -> leave static
    el.dataset.spMarquee = '1';
    var track = document.createElement('span');
    track.className = 'sp-marquee__track';
    var a = document.createElement('span');
    a.className = 'sp-marquee__item';
    while (el.firstChild) a.appendChild(el.firstChild);
    var c = a.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(a);
    track.appendChild(c);
    el.classList.add('sp-marquee');
    el.appendChild(track);
    // ~18px/s => super slow; cycle length = one copy incl. its padding gap
    track.style.animationDuration = Math.max(24, (a.getBoundingClientRect().width) / 18) + 's';
  }
  function marquee() {
    document.querySelectorAll('.sp2_banner-bottom').forEach(function (bar) {
      makeMarquee(bar.querySelector('.banner-bottom_title-wrapper .text-size-medium'));
      makeMarquee(bar.querySelector('.banner-bottom_text-row'));
    });
  }
  // keep duplicated countdown copies ticking in sync with the live one
  function syncTimerClones() {
    document.querySelectorAll('.sp2_banner-bottom .sp-marquee__track').forEach(function (t) {
      if (t.children.length !== 2) return;
      var src = t.children[0].querySelectorAll('[data-timer]');
      var dst = t.children[1].querySelectorAll('[data-timer]');
      src.forEach(function (s, i) {
        if (dst[i] && dst[i].textContent !== s.textContent) dst[i].textContent = s.textContent;
      });
    });
  }

  // ---------- 3) lorikeet: 64px launcher beside the bar + bubble on top ----------
  function lorikeetAlign() {
    if (!document.querySelector('.sp2_banner-bottom')) return; // only on bar pages
    var host = document.getElementById('lorikeet-widget-shadow-host');
    if (host) host.style.setProperty('--lorikeet-button-size', '64px', 'important');
    var btn = window.lorikeet && window.lorikeet.$floatingImageButton;
    var bubble = document.querySelector('.lorikeet-promo-bubble');
    var isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (btn) {
      btn.style.setProperty('width', '64px', 'important');
      btn.style.setProperty('height', '64px', 'important');
      btn.style.setProperty('border-radius', '14px', 'important');
      // ponytail: static base pin; pages also running .sp2_sticky-cta-wrap
      // would need the dynamic offset back
      btn.style.setProperty('bottom', isMobile ? '20px' : '24px', 'important');
      btn.style.setProperty('right', isMobile ? '8px' : '24px', 'important');
    }
    if (btn && bubble) {
      var r = btn.getBoundingClientRect();
      if (r.width) {
        // sit 12px ABOVE the launcher, right edges aligned
        bubble.style.setProperty('bottom', Math.round(window.innerHeight - r.top + 12) + 'px', 'important');
        bubble.style.setProperty('right', Math.round(window.innerWidth - r.right) + 'px', 'important');
      }
    }
  }

  function boot() {
    window.addEventListener('scroll', reveal, { passive: true });
    reveal();
    setTimeout(marquee, 400);
    window.addEventListener('resize', function () {
      clearTimeout(window.__spBarMq);
      window.__spBarMq = setTimeout(marquee, 300);
    });
    setInterval(function () {
      lorikeetAlign();
      syncTimerClones();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
