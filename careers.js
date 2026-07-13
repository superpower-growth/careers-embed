/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page freeform blocks. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
  var TEAM = ['Max Marchione, Founder', 'Hannah Ahn, Head of Design', 'Daniel Nemani, Product', 'Grace Guerrero, Designer'];
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  // Shared reveal: slide up from `dy` px + blur 5px -> 0 + fade in. No scale — scaling a full-width
  // element overflows the viewport on mobile, and the design calls for a y-move only.
  function prime(n, dy) {
    n.style.opacity = '0';
    n.style.transform = 'translateY(' + (dy || 24) + 'px)';
    n.style.filter = 'blur(5px)';
    n.style.willChange = 'opacity,transform,filter';
  }
  function play(n, dur, delay) {
    var t = dur + 'ms cubic-bezier(.22,1,.36,1) ' + delay + 'ms';
    n.style.transition = 'opacity ' + t + ', transform ' + t + ', filter ' + t;
    n.style.opacity = '1'; n.style.transform = 'none'; n.style.filter = 'blur(0)';
  }

  // Hero silhouette parallax. Scales the image up so there is headroom to travel, then translates
  // within that headroom on scroll — travel is derived from container height so it never reveals a gap.
  function parallax() {
    var m = document.querySelector('.careers_hero-media');
    var img = m && m.querySelector('.careers_hero-media-img');
    if (!img) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // No parallax on mobile: the scale needed for headroom zooms the portrait crop past the subject's
    // head, and the design shows a plain cover crop there.
    if (window.matchMedia && matchMedia('(max-width: 767px)').matches) { img.style.transform = 'none'; return; }
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
    var rawTerm = '';
    var searchInput = null;

    // Empty state, shown when no role survives the current pill + search. Lives inside the list so it
    // sits where the rows would be; render() removes only the rows, never this node.
    var empty = document.createElement('div');
    empty.className = 'careers_empty';
    empty.hidden = true;
    empty.setAttribute('role', 'status');
    empty.setAttribute('aria-live', 'polite');
    list.appendChild(empty);

    function renderEmpty(count) {
      if (count > 0) { empty.hidden = true; return; }
      empty.hidden = false;
      empty.innerHTML = '';
      var p = document.createElement('p');
      p.className = 'text-size-medium careers_text-muted';
      p.textContent = rawTerm
        ? 'No roles match “' + rawTerm + '”.'
        : 'No open roles in this area right now.';
      empty.appendChild(p);
      if (rawTerm && searchInput) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'careers_empty-clear'; btn.textContent = 'Clear search';
        btn.addEventListener('click', function () {
          searchInput.value = ''; term = ''; rawTerm = ''; commit(); searchInput.focus();
        });
        empty.appendChild(btn);
      }
    }

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
      var count = 0;
      [].forEach.call(list.querySelectorAll('.careers_role-item'), function (a) {
        var ok = matches(a);
        a.style.display = ok ? '' : 'none';
        if (ok) count++;
      });
      // Listing "Open roles N" tracks the active filter + search; the hero count stays the total.
      [].forEach.call(counts, function (el) {
        if (!el.closest('.careers_hero-open-roles')) el.textContent = count;
      });
      renderEmpty(count);
    }
    // One-at-a-time reveal: each visible row slides/deblurs in, staggered.
    function reveal(items) {
      items.forEach(function (a) { prime(a, 24); });
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
      [].slice.call(list.querySelectorAll('.careers_role-item')).forEach(function (n) { n.remove(); });
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
      list.appendChild(empty); // keep the empty state below the rows
      // Count is set straight to its value — no count-up animation (design feedback).
      [].forEach.call(counts, function (el) { el.textContent = jobs.length; });
      buildPills(jobs);
      // Deep-link: honor ?dept= if it matches a derived pill.
      var want = (new URLSearchParams(location.search).get('dept') || 'all').toLowerCase();
      if (pills.some(function (p) { return (p.getAttribute('data-filter') || '') === want; })) active = want;
      setActive(); commit();
      // First reveal: play the stagger when the listing scrolls into view.
      var shown = visibleItems();
      if (reduceMo || !('IntersectionObserver' in window)) return;
      shown.forEach(function (a) { a.style.opacity = '0'; }); // pre-hide to avoid a flash before reveal
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); reveal(shown); } });
      }, { threshold: 0.12 });
      io.observe(list);
    }

    // Search box: live-filters the visible roles by title/department, combined with the active pill.
    // Sits at the top of the filter column (above the pills), with a leading magnifier per the design.
    (function () {
      var anchor = pillWrap || list;
      if (!anchor || !anchor.parentNode) return;
      var wrap = document.createElement('div');
      wrap.className = 'careers_search-wrap';
      wrap.innerHTML = '<svg class="careers_search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle>' +
        '<path d="M20 20l-3.6-3.6"></path></svg>';
      var search = document.createElement('input');
      search.type = 'search'; search.className = 'careers_search';
      search.placeholder = 'Search roles';
      search.setAttribute('aria-label', 'Search roles');
      wrap.appendChild(search);
      anchor.parentNode.insertBefore(wrap, anchor);
      searchInput = search;
      search.addEventListener('input', function () {
        rawTerm = search.value.trim();
        term = rawTerm.toLowerCase();
        commit();
      });
    })();

    wirePills(); // fallback: keep static pills functional if the fetch fails
    fetch(ASHBY).then(function (r) { return r.json(); })
      .then(function (d) { var jobs = (d.jobs || []).filter(function (j) { return j.isListed !== false; }); if (jobs.length) render(jobs); })
      .catch(function () { });
  }

  // Meet the team: wrap each avatar, inject a name+title tooltip, and on hover push the neighbouring
  // avatars away from the hovered one (rather than scaling it) — matches the Figma prototype.
  function avatars() {
    [].slice.call(document.querySelectorAll('.careers_team-avatar')).forEach(function (av, i) {
      if (av.parentNode && av.parentNode.classList && av.parentNode.classList.contains('careers_av-wrap')) return;
      var wrap = document.createElement('span'); wrap.className = 'careers_av-wrap';
      wrap.style.marginLeft = getComputedStyle(av).marginLeft; av.style.marginLeft = '0';
      av.parentNode.insertBefore(wrap, av); wrap.appendChild(av);
      var t = document.createElement('span'); t.className = 'careers_av-tooltip';
      t.textContent = TEAM[i] || av.getAttribute('alt') || ''; wrap.appendChild(t);
    });
    var wraps = [].slice.call(document.querySelectorAll('.careers_av-wrap'));
    var touch = window.matchMedia && matchMedia('(hover: none)').matches;
    function imgOf(w) { return w.querySelector('.careers_team-avatar'); }
    if (touch) {
      // Tap: black outline on the tapped avatar, others grey out, name pill lands on the
      // left of the team pill (CSS in the footer freeform block). Tap again / outside clears.
      var pill = document.querySelector('.careers_team-pill');
      if (!pill) return;
      var clearOpen = function () {
        pill.classList.remove('has-open');
        wraps.forEach(function (w) { w.classList.remove('is-open'); });
      };
      wraps.forEach(function (w) {
        w.addEventListener('click', function (e) {
          e.stopPropagation();
          var was = w.classList.contains('is-open');
          clearOpen();
          if (!was) { w.classList.add('is-open'); pill.classList.add('has-open'); }
        });
      });
      document.addEventListener('click', function (e) { if (!pill.contains(e.target)) clearOpen(); });
      return;
    }
    var SHIFT = 8; // px each neighbour moves away from the hovered avatar
    wraps.forEach(function (w, i) {
      w.addEventListener('mouseenter', function () {
        wraps.forEach(function (o, j) {
          var img = imgOf(o); if (!img) return;
          var dx = j < i ? -SHIFT : (j > i ? SHIFT : 0);
          img.style.transform = 'translateX(' + dx + 'px)';
          // no z-index bump: keep the natural left-under-right stacking while hovered
        });
      });
      w.addEventListener('mouseleave', function () {
        wraps.forEach(function (o) {
          var img = imgOf(o); if (img) img.style.transform = '';
        });
      });
    });
  }

  // Hero reveal: heading and the right-hand paragraph block move up 16px, deblur and fade in together.
  function heroReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var row = document.querySelector('.careers_hero-headline-row');
    if (!row || reduce) return;
    var cols = row.querySelectorAll('.careers_hero-col');
    var heading = cols[0] && (cols[0].querySelector('[class*="heading-style"]') || cols[0]);
    var intro = cols[1] && (cols[1].querySelector('.careers_hero-intro') || cols[1]);
    var targets = [heading, intro].filter(Boolean);
    targets.forEach(function (n) { prime(n, 16); });
    if (targets[0]) void targets[0].offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      targets.forEach(function (n) { play(n, 850, 0); }); // heading + paragraph reveal together
    }); });
  }

  // Scroll reveal: quick, snappy slide-up + deblur, staggered, for the company block and "how do we work?".
  function scrollReveal() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    function group(trigger, nodes, stagger) {
      nodes = [].slice.call(nodes);
      if (!nodes.length) return;
      nodes.forEach(function (n) { prime(n, 24); });
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

  // Copy fixes, all per the design:
  //  - hero H1 breaks after the muted "Our mission is to" so "enhance" starts line 2
  //  - "You can read about our culture here." and "In short, ..." sit on separate lines
  //  - the last words of "...than your resume." are bound with non-breaking spaces so
  //    "resume." can never sit orphaned on its own line (no break after "exits." — R2)
  function copyFixes() {
    var h = document.querySelector('.careers_hero-headline-row [class*="heading-style"]');
    var muted = h && h.querySelector('.careers_text-muted');
    if (muted && !(muted.nextSibling && muted.nextSibling.nodeName === 'BR')) {
      h.insertBefore(document.createElement('br'), muted.nextSibling);
    }
    var ps = document.querySelectorAll('p.text-size-medium');
    var nb = String.fromCharCode(160); // non-breaking space
    [].forEach.call(ps, function (p) {
      var s = p.innerHTML;
      if (s.indexOf('figure exits') !== -1) {
        s = s.replace('exits.<br>We care', 'exits. We care'); // undo the break if the static markup kept it
        s = s.replace('than your resume', 'than' + nb + 'your' + nb + 'resume');
        p.innerHTML = s;
      } else if (s.indexOf('read about our culture') !== -1 && s.indexOf('In short') !== -1) {
        p.innerHTML = s.replace(/\.\s+In short/, '.<br>In short');
      } else if (s.indexOf('open to anyone great') !== -1 && s.indexOf('We often') !== -1) {
        p.innerHTML = s.replace(/\.\s+We often/, '.<br>We often'); // roles panel copy sits on 2 lines
      }
    });
  }

  // Hero "View roles →": isolate the arrow so it can slide on hover (CSS handles the transition).
  function viewRolesArrow() {
    var a = document.querySelector('.careers_hero-view-roles');
    if (!a || a.querySelector('.careers_arrow')) return;
    a.innerHTML = a.innerHTML.replace(/→/, '<span class="careers_arrow">→</span>');
  }

  // Contact card: the paper-plane belongs on the right of the card and filled, not stacked above the
  // copy as an outline. The icon itself is injected by the separate careersPaperPlaneIcon script, so
  // retry once in case it lands after us.
  function contactCard() {
    function apply() {
      var card = document.querySelector('.careers_contact-card');
      var svg = card && card.querySelector('svg');
      if (!svg) return false;
      svg.removeAttribute('style');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('stroke', 'none');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = '<path d="M22 2L15 22L11 13L2 9L22 2Z"></path>';
      svg.setAttribute('class', 'careers_contact-icon');
      card.appendChild(svg); // card is flex + space-between → icon lands right, vertically centred
      return true;
    }
    if (!apply()) setTimeout(apply, 400);
  }

  // On mobile the hero box is portrait, so `cover` renders the image at roughly twice its CSS width.
  // Widen `sizes` so the browser picks a large enough srcset candidate instead of upscaling a small one.
  function heroImage() {
    var img = document.querySelector('.careers_hero-media-img');
    if (!img || !window.matchMedia) return;
    if (matchMedia('(max-width: 767px)').matches) img.sizes = '200vw';
  }

  function boot() {
    copyFixes(); viewRolesArrow(); heroImage(); parallax(); roles(); avatars();
    heroReveal(); scrollReveal(); contactCard();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot, { once: true }); } else { boot(); }
})();
