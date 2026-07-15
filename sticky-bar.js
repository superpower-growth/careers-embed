/* Superpower sticky-bar enhancements (Bar - Sticky Bottom redesign, July 2026)
   1) Scroll reveal via .sp-shown class on ALL bars (the legacy per-embed script
      only targets the first bar and loses to the component CSS anyway).
   2) Marquee title AND subtext rows ONLY when they would wrap to a 2nd line.
      Seamless: two copies, item padding-right = the gap, -50% = exact cycle.
   3) Match Lorikeet launcher to the bar (64px desktop / 56px mobile, r14,
      beside the pill), slide it in with the bar on mobile, and keep the
      greeting bubble positioned ABOVE the launcher (mobile bubble is created
      here — the nav embed only builds it on desktop). */
(function () {
  var revealed = false;

  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

  // ---------- 1) scroll reveal ----------
  function reveal() {
    revealed = window.scrollY > 10;
    document.querySelectorAll('.sp2_banner-bottom').forEach(function (b) {
      b.classList.toggle('sp-shown', revealed);
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

  // ---------- 3) lorikeet ----------
  function lorikeetAlign() {
    if (!document.querySelector('.sp2_banner-bottom')) return; // only on bar pages
    var mob = isMobile();
    var size = mob ? 56 : 64; // launcher height == bar height per breakpoint
    var host = document.getElementById('lorikeet-widget-shadow-host');
    if (host) host.style.setProperty('--lorikeet-button-size', size + 'px', 'important');
    var btn = window.lorikeet && window.lorikeet.$floatingImageButton;
    var bubble = document.querySelector('.lorikeet-promo-bubble');
    if (btn) {
      btn.style.setProperty('width', size + 'px', 'important');
      btn.style.setProperty('height', size + 'px', 'important');
      btn.style.setProperty('border-radius', '14px', 'important');
      // ponytail: static base pin; pages also running .sp2_sticky-cta-wrap
      // would need the dynamic offset back
      btn.style.setProperty('bottom', mob ? '20px' : '24px', 'important');
      // `right` is relative to the widget's host container, not the viewport —
      // converge on the true viewport inset by measuring and correcting
      var want = mob ? 8 : 24;
      var r0 = btn.getBoundingClientRect();
      if (r0.width) {
        var err = (window.innerWidth - want) - r0.right; // >0 => move right
        if (Math.abs(err) > 1) {
          var cur = parseFloat(getComputedStyle(btn).right) || 0;
          btn.style.setProperty('right', (cur - err) + 'px', 'important');
        }
      }
      if (mob) {
        // slide in with the bar; hidden start sits deep below Safari's UI bar
        btn.style.setProperty('transition', 'opacity .25s ease-in-out, transform .4s ease', 'important');
        btn.style.setProperty('transform', revealed ? 'translateY(0)' : 'translateY(220px)', 'important');
      } else {
        btn.style.removeProperty('transform');
      }
    }
    if (btn && bubble) {
      var r = btn.getBoundingClientRect();
      if (r.width && (!mob || revealed)) {
        // sit 12px ABOVE the launcher, right edges aligned
        bubble.style.setProperty('bottom', Math.round(window.innerHeight - r.top + 12) + 'px', 'important');
        bubble.style.setProperty('right', Math.round(window.innerWidth - r.right) + 'px', 'important');
      }
    }
  }

  // mobile greeting bubble (the nav embed only creates one on desktop)
  function ensureMobileBubble() {
    if (!isMobile()) return;
    if (document.querySelector('.lorikeet-promo-bubble')) return;
    if (!(window.lorikeet && window.lorikeet.$floatingImageButton)) return;
    if (!document.querySelector('.sp2_banner-bottom')) return;
    var bub = document.createElement('div');
    bub.className = 'lorikeet-promo-bubble sp-mobile-bubble'; // styled by the bar component CSS
    document.body.appendChild(bub);
    var msgs = [
      'Hey there! Got any questions?',
      "Curious about what's included?",
      'Have a question before you sign up?'
    ];
    var i = 0, iv = null;
    function show() {
      if (!revealed) return; // only over a visible launcher
      bub.textContent = msgs[i++ % msgs.length];
      bub.classList.add('visible');
      setTimeout(function () { bub.classList.remove('visible'); }, 6000);
    }
    function stop() {
      bub.classList.remove('visible');
      if (iv) { clearInterval(iv); iv = null; }
    }
    bub.addEventListener('click', function () {
      window.lorikeet.open();
      stop();
    });
    var host = document.getElementById('lorikeet-widget-shadow-host');
    if (host) {
      new MutationObserver(function () {
        var v = window.lorikeet.visibility;
        if (v === 'open' || v === 'visible') stop();
      }).observe(host, { attributes: true, childList: true, subtree: true });
    }
    setTimeout(function () {
      show();
      iv = setInterval(show, 16000);
    }, 5000);
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
      ensureMobileBubble();
      syncTimerClones();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
