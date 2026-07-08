/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page freeform blocks. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
  var TEAM = ['Max Marchione, Founder', 'Hannah Ahn, Head of Design', 'Daniel Nemani, Product', 'Grace Guerrero, Designer'];
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  // Shared reveal: blur 5px -> 0, opacity 0 -> 1, plus either a slide up from below (slide=true) or a
  // scale down from 1.1 (hero). prime() sets the hidden start state, play() transitions to rest.
  function prime(n, slide) { n.style.opacity = '0'; n.style.transform = slide ? 'translateY(24px)' : 'scale(1.1)'; n.style.filter = 'blur(5px)'; n.style.willChange = 'opacity,transform,filter'; }
  function play(n, dur, delay) {
    var t = dur + 'ms cubic-bezier(.22,1,.36,1) ' + delay + 'ms';
    n.style.transition = 'opacity ' + t + ', transform ' + t + ', filter ' + t;
    n.style.opacity = '1'; n.style.transform = 'none'; n.style.filter = 'blur(0)';
  }

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
      return (p - 0.5) * 2 * overhang * 0.4;             // subtle travel — a fraction of the safe range
    }
    function tick() {
      current += (target - current) * 0.22;               // lerp → smoothing, snappy (low lag)
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
    var term = '';

    function matches(a) {
      var deptOk = active === 'all' || (a.getAttribute('data-dept') || '') === active;
      var termOk = !term || (a.textContent || '').toLowerCase().indexOf(term) !== -1;
      return deptOk && termOk;
    }
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
      return [].filter.call(list.querySelectorAll('.careers_role-item'), matches);
    }
    function commit() {
      [].forEach.call(list.querySelectorAll('.careers_role-item'), function (a) {
        a.style.display = matches(a) ? '' : 'none';
      });
    }
    // One-at-a-time reveal: each visible row scales/deblurs in, staggered.
    function reveal(items) {
      items.forEach(function (a) { prime(a, true); });
      if (items[0]) void items[0].offsetWidth; // flush hidden state before transitioning
      items.forEach(function (a, i) { play(a, 650, i * 70); });
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

    // Search box: live-filters the visible roles by title/department, combined with the active pill.
    // Sits at the top of the filter column (above the pills) so it spans that column's width and
    // survives list re-renders.
    (function () {
      var anchor = pillWrap || list;
      if (!anchor || !anchor.parentNode) return;
      var search = document.createElement('input');
      search.type = 'search'; search.className = 'careers_search';
      search.placeholder = 'Search open roles…';
      search.setAttribute('aria-label', 'Search open roles');
      anchor.parentNode.insertBefore(search, anchor);
      search.addEventListener('input', function () { term = search.value.trim().toLowerCase(); commit(); });
    })();

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

  // Hero reveal: the heading and the right-hand paragraph block scale/deblur in, slightly offset.
  // No text splitting — the heading markup (muted span + natural line breaks) is left intact.
  function heroReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var row = document.querySelector('.careers_hero-headline-row');
    if (!row || reduce) return;
    var cols = row.querySelectorAll('.careers_hero-col');
    var heading = cols[0] && (cols[0].querySelector('[class*="heading-style"]') || cols[0]);
    var intro = cols[1] && (cols[1].querySelector('.careers_hero-intro') || cols[1]);
    var targets = [heading, intro].filter(Boolean);
    targets.forEach(function (n) { prime(n, false); }); // hero = scale + blur
    if (targets[0]) void targets[0].offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      targets.forEach(function (n) { play(n, 850, 0); }); // heading + paragraph reveal together
    }); });
  }

  // Scroll reveal: quick, snappy scale/deblur, staggered. Used for the company block and the
  // "how do we work?" rows. Each group triggers when its container scrolls into view.
  function scrollReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    function group(trigger, nodes, stagger) {
      nodes = [].slice.call(nodes);
      if (!nodes.length) return;
      nodes.forEach(function (n) { prime(n, true); }); // company + how-we-work = slide up + blur
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; io.disconnect();
          nodes.forEach(function (n, i) { play(n, 620, i * stagger); });
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

  // Copy fix: break the sentence after "exits." (per design) and bind the last three words with
  // non-breaking spaces so "resume." can never sit orphaned on its own line.
  function orphanFix() {
    var ps = document.querySelectorAll('p.text-size-medium');
    for (var i = 0; i < ps.length; i++) {
      var h = ps[i].innerHTML;
      if (h.indexOf('figure exits') === -1) continue;
      var nb = String.fromCharCode(160); // non-breaking space
      h = h.replace('exits. We care', 'exits.<br>We care');
      h = h.replace('than your resume', 'than' + nb + 'your' + nb + 'resume');
      ps[i].innerHTML = h;
      break;
    }
  }

  function boot() { parallax(); roles(); avatars(); heroReveal(); scrollReveal(); orphanFix(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot, { once: true }); } else { boot(); }
})();
