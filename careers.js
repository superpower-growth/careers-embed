/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page freeform blocks. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
  var TEAM = ['Max Marchione, Founder', 'Hannah Ahn, Head of Design', 'Daniel Nemani, Product', 'Grace Guerrero, Designer'];
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  // Count-up: animate each node from 0 to target the first time it scrolls into view.
  function animateCounts(nodes, target) {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function run(el) {
      if (reduce || !window.requestAnimationFrame) { el.textContent = target; return; }
      el.textContent = '0';
      var start = null, dur = 1200;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * e);
        if (t < 1) requestAnimationFrame(step); else el.textContent = target;
      }
      requestAnimationFrame(step);
    }
    [].forEach.call(nodes, function (el) {
      if (!('IntersectionObserver' in window)) { run(el); return; }
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); run(el); } });
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  // Hero silhouette parallax. Scales the image up so there is headroom to travel, then translates
  // within that headroom on scroll — travel is derived from container height so it never reveals a gap.
  function parallax() {
    var m = document.querySelector('.careers_hero-media');
    var img = m && m.querySelector('.careers_hero-media-img');
    if (!img) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var SCALE = 1.5;                                      // more headroom → more visible travel
    img.style.willChange = 'transform';
    var target = 0, current = 0, raf = null;
    function targetY() {
      var r = m.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var p = (vh - r.top) / (vh + r.height); p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var overhang = (SCALE - 1) * r.height / 2;          // px of image beyond each edge after scaling
      return (p - 0.5) * 2 * overhang * 0.9;              // stay just inside the safe range
    }
    function tick() {
      current += (target - current) * 0.08;               // lerp → smooth, lagged parallax feel
      img.style.transform = 'translate3d(0,' + current.toFixed(1) + 'px,0) scale(' + SCALE + ')';
      if (Math.abs(target - current) > 0.1) { raf = requestAnimationFrame(tick); } else { raf = null; }
    }
    function onScroll() { target = targetY(); if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    target = current = targetY();
    img.style.transform = 'translate3d(0,' + current.toFixed(1) + 'px,0) scale(' + SCALE + ')';
  }

  // Open roles: live from Ashby. Pills are derived from the actual departments in the data so they
  // always match. ?dept= deep-links/shares a filter. Count syncs to hero + section. Static rows/pills
  // are the fallback if the fetch fails.
  function roles() {
    var list = document.querySelector('[data-ashby-list]');
    if (!list) return;
    var counts = document.querySelectorAll('[data-ashby-count]');
    var pillWrap = document.querySelector('.careers_pills');
    var active = 'all';
    var pills = [];

    function setActive() {
      pills.forEach(function (x) { x.classList.toggle('is-active', (x.getAttribute('data-filter') || 'all') === active); });
    }
    function setUrl() {
      var u = new URL(location.href);
      if (active === 'all') u.searchParams.delete('dept'); else u.searchParams.set('dept', active);
      history.replaceState(null, '', u);
    }
    var reduceMo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function visibleItems() {
      return [].filter.call(list.querySelectorAll('.careers_role-item'), function (a) {
        return active === 'all' || (a.getAttribute('data-dept') || '') === active;
      });
    }
    function commit() {
      [].forEach.call(list.querySelectorAll('.careers_role-item'), function (a) {
        var d = a.getAttribute('data-dept') || '';
        a.style.display = (active === 'all' || d === active) ? '' : 'none';
      });
    }
    // Scattered, one-at-a-time reveal: each visible row eases in from a small random offset, staggered.
    function reveal(items) {
      items.forEach(function (a) {
        var dy = (14 + Math.random() * 20).toFixed(0);
        a.style.transition = 'none';
        a.style.opacity = '0';
        a.style.transform = 'translateY(' + dy + 'px)';
      });
      if (items[0]) void items[0].offsetWidth; // flush hidden state before transitioning
      items.forEach(function (a, i) {
        var d = i * 70;
        a.style.transition = 'opacity .55s cubic-bezier(.22,1,.36,1) ' + d + 'ms, transform .55s cubic-bezier(.22,1,.36,1) ' + d + 'ms';
        a.style.opacity = '1';
        a.style.transform = 'none';
      });
    }
    function applyFilter(animate) {
      commit();
      if (animate && !reduceMo) reveal(visibleItems());
    }
    function wirePills() {
      pills = [].slice.call(pillWrap ? pillWrap.querySelectorAll('.careers_pill') : []);
      pills.forEach(function (p) {
        p.addEventListener('click', function () {
          active = p.getAttribute('data-filter') || 'all';
          setActive(); setUrl(); applyFilter(true);
        });
      });
    }
    function buildPills(jobs) {
      if (!pillWrap) { wirePills(); return; }
      var seen = {}, order = [];
      jobs.forEach(function (j) {
        var label = ((j.department || j.team || '') + '').trim();
        var s = slug(label);
        if (s && !seen[s]) { seen[s] = label; order.push(s); }
      });
      pillWrap.innerHTML = '';
      function mk(filter, label) {
        var d = document.createElement('div');
        d.className = 'careers_pill'; d.setAttribute('data-filter', filter); d.textContent = label;
        pillWrap.appendChild(d);
      }
      mk('all', 'All');
      order.forEach(function (s) { mk(s, seen[s]); });
      wirePills();
    }
    function render(jobs) {
      list.innerHTML = '';
      jobs.forEach(function (j) {
        var dept = ((j.department || j.team || '') + '').trim();
        var a = document.createElement('a');
        a.className = 'careers_role-item'; a.href = j.jobUrl || j.applyUrl || '#';
        a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('data-dept', slug(dept));
        var d = document.createElement('div'); d.className = 'careers_role-dept';
        var dp = document.createElement('p'); dp.className = 'text-size-small careers_text-muted'; dp.textContent = dept; d.appendChild(dp);
        var tp = document.createElement('p'); tp.className = 'text-size-medium'; tp.textContent = (j.title || '').trim();
        a.appendChild(d); a.appendChild(tp); list.appendChild(a);
      });
      animateCounts(counts, jobs.length);
      buildPills(jobs);
      // Deep-link: honor ?dept= if it matches a derived pill.
      var want = (new URLSearchParams(location.search).get('dept') || 'all').toLowerCase();
      if (pills.some(function (p) { return (p.getAttribute('data-filter') || '') === want; })) active = want;
      setActive(); commit();
      // First reveal: play the scattered stagger when the listing scrolls into view.
      var shown = visibleItems();
      if (reduceMo || !('IntersectionObserver' in window)) return;
      shown.forEach(function (a) { a.style.opacity = '0'; }); // pre-hide to avoid a flash before reveal
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); reveal(shown); } });
      }, { threshold: 0.12 });
      io.observe(list);
    }

    wirePills(); // fallback: keep static pills functional if the fetch fails
    fetch(ASHBY).then(function (r) { return r.json(); })
      .then(function (d) { var jobs = (d.jobs || []).filter(function (j) { return j.isListed !== false; }); if (jobs.length) render(jobs); })
      .catch(function () { });
  }

  // Meet the team: wrap each avatar and inject a name+title tooltip (hover styling is CSS).
  function avatars() {
    [].slice.call(document.querySelectorAll('.careers_team-avatar')).forEach(function (av, i) {
      if (av.parentNode && av.parentNode.classList && av.parentNode.classList.contains('careers_av-wrap')) return;
      var wrap = document.createElement('span'); wrap.className = 'careers_av-wrap';
      wrap.style.marginLeft = getComputedStyle(av).marginLeft; av.style.marginLeft = '0';
      av.parentNode.insertBefore(wrap, av); wrap.appendChild(av);
      var t = document.createElement('span'); t.className = 'careers_av-tooltip';
      t.textContent = TEAM[i] || av.getAttribute('alt') || ''; wrap.appendChild(t);
    });
  }

  // Hero mask reveal: each heading line + the right-hand paragraph slide up from behind an
  // overflow mask, fading in, slightly offset. Runs after fonts settle so line-splitting is correct.
  function heroReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var row = document.querySelector('.careers_hero-headline-row');
    if (!row || reduce) return;
    row.style.visibility = 'hidden'; // avoid a flash of unmasked text before we prime it
    function masked(inner) {
      var mask = document.createElement('span');
      mask.style.display = 'block'; mask.style.overflow = 'hidden';
      mask.style.paddingBottom = '0.12em'; mask.style.marginBottom = '-0.12em'; // protect descenders
      inner.style.display = 'block';
      return mask.appendChild(inner), mask;
    }
    function splitLines(el) {
      var words = (el.textContent || '').trim().split(/\s+/);
      el.textContent = '';
      var probe = words.map(function (w, i) {
        var s = document.createElement('span'); s.textContent = w + (i < words.length - 1 ? ' ' : '');
        s.style.display = 'inline-block'; el.appendChild(s); return s;
      });
      var lines = [], cur = [], top = null;
      probe.forEach(function (s) { var t = s.offsetTop; if (top !== null && Math.abs(t - top) > 3) { lines.push(cur); cur = []; } cur.push(s); top = t; });
      if (cur.length) lines.push(cur);
      el.textContent = '';
      return lines.map(function (grp) {
        var inner = document.createElement('span');
        grp.forEach(function (s) { s.style.display = 'inline'; inner.appendChild(s); });
        el.appendChild(masked(inner)); return inner;
      });
    }
    function wrapWhole(el) {
      var inner = document.createElement('span');
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(masked(inner)); return inner;
    }
    function build() {
      var cols = row.querySelectorAll('.careers_hero-col');
      var headingEl = cols[0] && (cols[0].querySelector('[class*="heading-style"]') || cols[0]);
      var paraEl = cols[1] && (cols[1].querySelector('.careers_hero-intro') || cols[1]);
      var targets = [];
      if (headingEl) targets = targets.concat(splitLines(headingEl));
      if (paraEl) targets.push(wrapWhole(paraEl));
      targets.forEach(function (n) { n.style.transform = 'translateY(110%)'; n.style.opacity = '0'; n.style.willChange = 'transform,opacity'; });
      row.style.visibility = '';
      if (targets[0]) void targets[0].offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        targets.forEach(function (n, i) {
          var d = i * 110;
          n.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1) ' + d + 'ms, opacity .7s cubic-bezier(.22,1,.36,1) ' + d + 'ms';
          n.style.transform = 'none'; n.style.opacity = '1';
        });
      }); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build); else build();
  }

  // Scroll reveal: quick, snappy slide-up + fade, staggered. Used for the company block and the
  // "how do we work?" rows. Each group triggers when its container scrolls into view.
  function scrollReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    function group(trigger, nodes, stagger) {
      nodes = [].slice.call(nodes);
      if (!nodes.length) return;
      nodes.forEach(function (n) { n.style.opacity = '0'; n.style.transform = 'translateY(16px)'; n.style.willChange = 'opacity,transform'; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; io.disconnect();
          nodes.forEach(function (n, i) {
            var d = i * stagger;
            n.style.transition = 'opacity .45s cubic-bezier(.22,1,.36,1) ' + d + 'ms, transform .45s cubic-bezier(.22,1,.36,1) ' + d + 'ms';
            n.style.opacity = '1'; n.style.transform = 'none';
          });
        });
      }, { threshold: 0.18 });
      io.observe(trigger);
    }
    var companyLabel = [].filter.call(document.querySelectorAll('.careers_col-label'), function (l) { return /the company/i.test(l.textContent); })[0];
    var companyRow = companyLabel && companyLabel.closest('.careers_row');
    if (companyRow) group(companyRow, companyRow.children, 80);
    var hiw = document.querySelector('.careers_hiw');
    if (hiw) {
      var intro = hiw.querySelector('.careers_row');
      if (intro) group(intro, intro.children, 80);
      var list = hiw.querySelector('.careers_hiw-list');
      if (list) group(list, list.querySelectorAll('.careers_hiw-item'), 60);
    }
  }

  function boot() { parallax(); roles(); avatars(); heroReveal(); scrollReveal(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot, { once: true }); } else { boot(); }
})();
