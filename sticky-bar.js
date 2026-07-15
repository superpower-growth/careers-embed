/* Superpower sticky-bar enhancements (Bar - Sticky Bottom redesign, July 2026)
   1) Marquee the bar title ONLY when it would wrap to a 2nd line.
   2) Match Lorikeet launcher height to the bar (64px) and keep the greeting
      bubble positioned ABOVE the launcher icon. */
(function () {
  // ---------- 1) title marquee (overflow-triggered) ----------
  function marquee() {
    document.querySelectorAll('.sp2_banner-bottom').forEach(function (bar) {
      var t = bar.querySelector('.banner-bottom_title-wrapper .text-size-medium');
      if (!t || t.dataset.spMarquee) return;
      if (t.scrollWidth <= t.clientWidth + 1) return; // fits on one line -> leave static
      t.dataset.spMarquee = '1';
      var x = t.textContent;
      var trk = document.createElement('span');
      trk.className = 'sp-marquee__track';
      var a = document.createElement('span');
      a.className = 'sp-marquee__item';
      a.textContent = x;
      var c = a.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      trk.appendChild(a);
      trk.appendChild(c);
      t.textContent = '';
      t.classList.add('sp-marquee');
      t.appendChild(trk);
      // ~18px/s => super slow, min 24s per loop
      trk.style.animationDuration = Math.max(24, (a.getBoundingClientRect().width + 40) / 18) + 's';
    });
  }

  // ---------- 2) lorikeet: 64px launcher + bubble on top ----------
  function lorikeetAlign() {
    if (!document.querySelector('.sp2_banner-bottom')) return; // only on bar pages
    var host = document.getElementById('lorikeet-widget-shadow-host');
    if (host) {
      host.style.setProperty('--lorikeet-button-size', '64px', 'important');
    }
    var lk = window.lorikeet;
    var btn = lk && lk.$floatingImageButton;
    var bubble = document.querySelector('.lorikeet-promo-bubble');
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
    setTimeout(marquee, 400);
    window.addEventListener('resize', function () {
      clearTimeout(window.__spBarMq);
      window.__spBarMq = setTimeout(marquee, 300);
    });
    setInterval(lorikeetAlign, 300); // enforce over the nav embed's own sync loop
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
