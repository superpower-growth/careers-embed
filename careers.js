/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page footer freeform block. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
  var TEAM = ['Max Marchione, Founder', 'Hannah Ahn, Head of Design', 'Daniel Nemani, Product', 'Grace Guerrero, Designer'];
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  // Hero silhouette parallax on scroll.
  function parallax() {
    var m = document.querySelector('.careers_hero-media');
    var img = m && m.querySelector('.careers_hero-media-img');
    if (!img) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ticking = false;
    function update() {
      var r = m.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var p = (vh - r.top) / (vh + r.height); p = p < 0 ? 0 : (p > 1 ? 1 : p);
      img.style.transform = 'translate3d(0,' + ((p - 0.5) * 140).toFixed(1) + 'px,0)';
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  // Open roles: live from Ashby, category filter, count sync. Falls back to static server-rendered rows on failure.
  function roles() {
    var list = document.querySelector('[data-ashby-list]');
    if (!list) return;
    var counts = document.querySelectorAll('[data-ashby-count]');
    var pills = [].slice.call(document.querySelectorAll('.careers_pill'));
    var active = 'all';
    function applyFilter() {
      [].forEach.call(list.querySelectorAll('.careers_role-item'), function (a) {
        var d = a.getAttribute('data-dept') || '';
        a.style.display = (active === 'all' || d === active) ? '' : 'none';
      });
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
      applyFilter();
    }
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        active = p.getAttribute('data-filter') || 'all';
        pills.forEach(function (x) { x.classList.toggle('is-active', x === p); });
        applyFilter();
      });
    });
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
