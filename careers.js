/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page freeform blocks. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
  var TEAM = ['Max Marchione, Founder', 'Hannah Ahn, Head of Design', 'Daniel Nemani, Product', 'Grace Guerrero, Designer'];
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  // Hero silhouette parallax. Scales the image up so there is headroom to travel, then translates
  // within that headroom on scroll — travel is derived from container height so it never reveals a gap.
  function parallax() {
    var m = document.querySelector('.careers_hero-media');
    var img = m && m.querySelector('.careers_hero-media-img');
    if (!img) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var SCALE = 1.35, ticking = false;
    img.style.willChange = 'transform';
    function update() {
      var r = m.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var p = (vh - r.top) / (vh + r.height); p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var overhang = (SCALE - 1) * r.height / 2;          // px of image beyond each edge after scaling
      var y = (p - 0.5) * 2 * overhang * 0.9;             // stay just inside the safe range
      img.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + SCALE + ')';
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
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
    function applyFilter(animate) {
      function commit() {
        [].forEach.call(list.querySelectorAll('.careers_role-item'), function (a) {
          var d = a.getAttribute('data-dept') || '';
          a.style.display = (active === 'all' || d === active) ? '' : 'none';
        });
      }
      if (animate) {
        list.style.transition = 'opacity .22s ease, transform .22s ease';
        list.style.opacity = '0'; list.style.transform = 'translateY(8px)';
        setTimeout(function () { commit(); list.style.opacity = '1'; list.style.transform = 'none'; }, 180);
      } else { commit(); }
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
      [].forEach.call(counts, function (c) { c.textContent = jobs.length; });
      buildPills(jobs);
      // Deep-link: honor ?dept= if it matches a derived pill.
      var want = (new URLSearchParams(location.search).get('dept') || 'all').toLowerCase();
      if (pills.some(function (p) { return (p.getAttribute('data-filter') || '') === want; })) active = want;
      setActive(); applyFilter(false);
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

  function boot() { parallax(); roles(); avatars(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot, { once: true }); } else { boot(); }
})();
