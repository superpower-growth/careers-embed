/* superpower.com /careers page interactions — hosted via jsDelivr, applied to the page footer.
   Wires DOM hooks already present in the built page. CSS lives in the Webflow page freeform blocks. */
(function () {
  'use strict';
  var ASHBY = 'https://api.ashbyhq.com/posting-api/job-board/superpower';
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

  // Hero parallax. Scales the image up so there is headroom to travel, then translates within that
  // headroom on scroll — travel is derived from container height so it never reveals a gap.
  function parallax() {
    var m = document.querySelector('.careers_hero-media');
    var img = m && m.querySelector('.careers_hero-media-img');
    if (!img) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // No parallax on mobile: the scale needed for headroom zooms the portrait crop past the subject's
    // head, and the design shows a plain cover crop there.
    if (window.matchMedia && matchMedia('(max-width: 767px)').matches) { img.style.transform = 'none'; return; }
    // Kept low deliberately: the hero is a group photo, and anything past ~1.1 crops heads and feet.
    var SCALE = 1.08;
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

    // The team label a row shows. Ashby's department and team match except for Member Success
    // (department "Operations"), and the row renders department — so sort on the same value.
    function teamOf(j) { return ((j.department || j.team || '') + '').trim(); }

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
        var label = teamOf(j);
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
      pillOverflow();
    }
    // The filter row is one nowrap scroller. The hints live in a shell wrapped around the scroller,
    // not inside it, so they neither scroll with the pills nor get erased by buildPills's innerHTML
    // reset. The edge flags go on the shell because the CSS fade and the hints both hang off them.
    function pillOverflow() {
      if (!pillWrap) return;
      var shell = pillWrap.parentNode;
      if (!shell || !shell.classList.contains('careers_pills-shell')) {
        shell = document.createElement('div');
        shell.className = 'careers_pills-shell';
        pillWrap.parentNode.insertBefore(shell, pillWrap);
        shell.appendChild(pillWrap);
      }
      function mkHint(dir) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'careers_pills-hint is-' + dir;
        b.setAttribute('aria-label', dir === 'next' ? 'Scroll categories right' : 'Scroll categories left');
        b.addEventListener('click', function () {
          var by = Math.round(pillWrap.clientWidth * 0.8);
          pillWrap.scrollBy({ left: dir === 'next' ? by : -by, behavior: 'smooth' });
        });
        shell.appendChild(b);
      }
      if (!shell.querySelector('.careers_pills-hint')) { mkHint('prev'); mkHint('next'); }
      function sync() {
        var max = pillWrap.scrollWidth - pillWrap.clientWidth;
        shell.classList.toggle('has-start', pillWrap.scrollLeft > 1);
        shell.classList.toggle('has-end', max > 1 && pillWrap.scrollLeft < max - 1);
      }
      if (!pillWrap.dataset.overflowWired) {
        pillWrap.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('resize', sync, { passive: true });
        // Measuring at build time reads fallback-font widths — the row was 717px wide then and
        // 1211px once the webfont swapped, so the end flag never got set. Re-measure after both.
        if (window.ResizeObserver) new ResizeObserver(sync).observe(pillWrap);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync).catch(function () {});
        pillWrap.dataset.overflowWired = '1';
      }
      sync();
      requestAnimationFrame(sync);
      setTimeout(sync, 600);
    }
    function render(jobs) {
      jobs = jobs.slice().sort(function (a, b) {
        return teamOf(a).localeCompare(teamOf(b)) ||
          (a.title || '').trim().localeCompare((b.title || '').trim());
      });
      [].slice.call(list.querySelectorAll('.careers_role-item')).forEach(function (n) { n.remove(); });
      jobs.forEach(function (j) {
        var dept = teamOf(j);
        var a = document.createElement('a');
        a.className = 'careers_role-item'; a.href = j.jobUrl || j.applyUrl || '#';
        a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('data-dept', slug(dept));
        var d = document.createElement('div'); d.className = 'careers_role-dept';
        var dp = document.createElement('p'); dp.className = 'text-size-medium careers_text-muted'; dp.textContent = dept; d.appendChild(dp);
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

  // Meet the team: the list is a CMS Collection List (Blogs filtered to the Team category).
  // CSS caps it at 8 rows; reveal the rest in place rather than paging to a separate index.
  function team() {
    var root = document.getElementById('careers-team');
    if (!root) return;
    // The headless API cannot set a "current collection item" link target, so each row carries a
    // hidden slug marker bound to the CMS and the real URL is assembled here.
    [].slice.call(root.querySelectorAll('.careers_team-row')).forEach(function (a) {
      var n = a.querySelector('.careers_team-slug');
      var s = (n && n.textContent || '').trim();
      if (s) a.setAttribute('href', '/blog/' + s);
    });
    if (root.querySelectorAll('.w-dyn-item').length > 8) root.classList.add('has-more');
    var btn = root.querySelector('.careers_team-more');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      root.classList.add('is-expanded');
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
  //  - hero H1 breaks after the muted "Our mission is to" so "extend" starts line 2
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
      }
    });
  }

  // Sticky section nav: highlight the section currently under the bar, and offset anchor jumps by
  // the bar's own height so the target heading is not hidden beneath it.
  function sectionNav() {
    var bar = document.getElementById('careers-secnav');
    if (!bar) return;
    var links = [].slice.call(bar.querySelectorAll('.careers_secnav-link'));
    var targets = links.map(function (a) {
      return { link: a, el: document.querySelector(a.getAttribute('href')) };
    }).filter(function (t) { return t.el; });
    if (!targets.length) return;

    function barH() { return Math.round(bar.getBoundingClientRect().height); }

    // The site navbar is fixed at z-index 9999, so a bar pinned at top:0 slides underneath it. Pin
    // below the navbar's real height instead — it shrinks from 89 to 81 once you scroll, and mobile
    // differs again, so read it rather than hard-coding.
    var navbar = document.querySelector('.sp-navbar3_component');
    // The navbar's own box is transparent and 16px taller than the pill you can actually see, so
    // measuring it leaves a gap the page scrolls through. Measure the pill, pin the bar at 0 so its
    // background covers the whole strip, and pad down to clear the pill.
    var pill = document.querySelector('.sp-navbar3_inner') || navbar;
    var inner = bar.querySelector('.careers_secnav-inner');
    function navPad() { return (pill ? Math.round(pill.getBoundingClientRect().bottom) : 0) + 24; }

    function setActive() {
      // Once pinned, swap the 64px of lead-in the resting band carries for a pad that clears the
      // navbar exactly. The resting height stays as drawn.
      var stuck = Math.round(bar.getBoundingClientRect().top) <= 1;
      bar.classList.toggle('is-stuck', stuck);
      var pad = stuck ? navPad() + 'px' : '';
      if (inner.style.paddingTop !== pad) inner.style.paddingTop = pad;
      // Sits below the landing offset (barH + 8) on purpose: level with it, a clicked section lands
      // exactly on the line and loses the <= test to sub-pixel rounding, lighting the previous one.
      var line = barH() + 16;
      var current = targets[0];
      targets.forEach(function (t) {
        if (t.el.getBoundingClientRect().top <= line) current = t;
      });
      // past the last section's end, keep the last one lit rather than snapping back
      targets.forEach(function (t) {
        t.link.classList.toggle('is-active', t === current);
        if (t === current) keepInView(t.link);
      });
    }

    // the bar scrolls horizontally on mobile — bring the active item into view there
    function keepInView(a) {
      var inner = a.parentElement;
      if (inner.scrollWidth <= inner.clientWidth + 1) return;
      var l = a.offsetLeft, r = l + a.offsetWidth;
      if (l < inner.scrollLeft) inner.scrollTo({ left: Math.max(0, l - 24), behavior: 'smooth' });
      else if (r > inner.scrollLeft + inner.clientWidth) inner.scrollTo({ left: r - inner.clientWidth + 24, behavior: 'smooth' });
    }

    // Webflow binds its own smooth scroll to same-page anchors and it ignores scroll-margin-top, so
    // headings land under the bar. Claim the click on the document in the CAPTURE phase — that runs
    // before any listener Webflow bound on the anchor or on document bubble.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.careers_secnav-link');
      if (!a) return;
      var el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      // it is about to be stuck, and the landing offset depends on its stuck height
      bar.classList.add('is-stuck');
      inner.style.paddingTop = navPad() + 'px';
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - barH() - 8, behavior: 'smooth' });
    }, true);

    window.addEventListener('scroll', setActive, { passive: true });
    window.addEventListener('resize', setActive, { passive: true });
    setActive();
  }

  function boot() {
    copyFixes(); parallax(); roles(); team();
    heroReveal(); scrollReveal(); sectionNav();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot, { once: true }); } else { boot(); }
})();
