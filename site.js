// Tier Athletics site: the tier calculator and the climb (aurora + ladder rail).
(function () {
  document.documentElement.classList.add('js');

  var TIERS = [
    null,
    { n: 'I',    name: 'Courage',    c: '#C6CDD6', t: '#C6CDD6', m: [135, 135, 135], w: [45, 45, 45] },
    { n: 'II',   name: 'Resilience', c: '#4A90E2', t: '#4A90E2', m: [185, 200, 200], w: [65, 65, 65] },
    { n: 'III',  name: 'Hunger',     c: '#0FA958', t: '#0FA958', m: [200, 225, 225], w: [75, 95, 95] },
    { n: 'IV',   name: 'Focus',      c: '#F056BF', t: '#F056BF', m: [215, 275, 275], w: [95, 135, 135] },
    { n: 'V',    name: 'Devotion',   c: '#D45D28', t: '#D45D28', m: [225, 315, 315], w: [105, 155, 155] },
    { n: 'VI',   name: 'Sacrifice',  c: '#C62828', t: '#E0553C', m: [275, 365, 365], w: [135, 185, 185] },
    { n: 'VII',  name: 'Conviction', c: '#6A1B9A', t: '#A05CD0', m: [315, 405, 405], w: [155, 225, 225] },
    { n: 'VIII', name: 'Grace',      c: '#FFC107', t: '#FFC107', m: [365, 455, 455], w: [185, 245, 245] },
    { n: 'IX',   name: 'Ascended',   c: '#FFFFFF', t: '#FFFFFF', m: [405, 495, 495], w: [225, 275, 275] }
  ];
  var LIFTS = ['bench', 'squat', 'deadlift'];
  var UNRANKED = { c: '#3A3F46', t: '#B0B0B0' };
  var body = document.body;

  function setLight(c, t) {
    body.style.setProperty('--hue', c);
    body.style.setProperty('--hue-text', t);
  }

  // ---------- Calculator ----------
  var form = document.getElementById('calc');
  if (form) {
    var ladder = 'm';
    var seg = form.querySelectorAll('[data-ladder]');
    var inputs = LIFTS.map(function (l) { return form.querySelector('[name="' + l + '"]'); });
    var ring = document.getElementById('ring');
    var title = document.getElementById('result-title');
    var line = document.getElementById('result-line');
    var next = document.getElementById('result-next');

    try { var saved = JSON.parse(localStorage.getItem('tier-calc') || 'null'); } catch (e) { saved = null; }
    if (saved) {
      ladder = saved.ladder === 'w' ? 'w' : 'm';
      inputs.forEach(function (el, i) { if (saved.v && saved.v[i]) el.value = saved.v[i]; });
    }

    function tierFor(v) {
      var best = 0;
      for (var k = 1; k <= 9; k++) {
        var req = TIERS[k][ladder];
        if (v[0] >= req[0] && v[1] >= req[1] && v[2] >= req[2]) best = k; else break;
      }
      return best;
    }

    function shortfall(v, k) {
      var req = TIERS[k][ladder], parts = [];
      for (var i = 0; i < 3; i++) {
        if (v[i] == null) parts.push('your ' + LIFTS[i]);
        else if (v[i] < req[i]) parts.push((req[i] - v[i]) + ' lb on ' + LIFTS[i]);
      }
      if (parts.length > 1) return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
      return parts[0];
    }

    function render(fromUser) {
      seg.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ladder === ladder)); });
      var raw = inputs.map(function (el) { var n = parseInt(el.value, 10); return isNaN(n) || n <= 0 ? null : Math.min(n, 1500); });
      var any = raw.some(function (x) { return x != null; });
      var v = raw.map(function (x) { return x == null ? 0 : x; });
      var k = tierFor(v);
      if (fromUser) {
        try { localStorage.setItem('tier-calc', JSON.stringify({ ladder: ladder, v: inputs.map(function (el) { return el.value; }) })); } catch (e) {}
      }

      if (!any) {
        ring.textContent = '—'; ring.classList.remove('lit');
        title.textContent = 'Unranked';
        line.textContent = 'Enter your best bench, squat and deadlift.';
        next.textContent = '';
        if (!body.dataset.rung || body.dataset.rung === 'hero') setLight(UNRANKED.c, UNRANKED.t);
        return;
      }
      if (k === 0) {
        ring.textContent = '—'; ring.classList.remove('lit');
        title.textContent = 'Unranked';
        line.textContent = 'All three lifts have to clear a rung. Tier I is ' + TIERS[1][ladder].join(' / ') + '.';
        next.textContent = 'Climbing to I · Courage: ' + shortfall(raw, 1) + '.';
        setLight(UNRANKED.c, TIERS[1].t);
      } else {
        var T = TIERS[k];
        ring.textContent = T.n; ring.classList.add('lit');
        title.textContent = 'Tier ' + T.n + ' · ' + T.name;
        line.textContent = ladder === 'w' ? "On the women's ladder." : "On the men's ladder.";
        next.textContent = k === 9 ? 'The top of the ladder. Nothing left to prove.'
          : 'Climbing to ' + TIERS[k + 1].n + ' · ' + TIERS[k + 1].name + ': ' + shortfall(raw, k + 1) + '.';
        setLight(T.c, T.t);
      }
      heroTier = k;
    }

    var heroTier = 0;
    form.addEventListener('input', function () { render(true); });
    seg.forEach(function (b) {
      b.addEventListener('click', function () { ladder = b.dataset.ladder; render(true); });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    render(false);
  }

  // ---------- The climb ----------
  var rungs = Array.prototype.slice.call(document.querySelectorAll('[data-rung-section]'));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  if (!rungs.length || !('IntersectionObserver' in window)) {
    rungs.forEach(function (r) { r.classList.add('seen'); });
    return;
  }

  var floatCta = document.getElementById('float-cta');
  function activate(id) {
    body.dataset.rung = id;
    if (floatCta) floatCta.hidden = id === 'hero' || id === '9';
    railLinks.forEach(function (a) { a.setAttribute('aria-current', String(a.dataset.target === id)); });
    if (id === 'hero') {
      var h = typeof heroTier === 'number' && heroTier > 0 ? TIERS[heroTier] : null;
      if (h) setLight(h.c, h.t); else setLight(UNRANKED.c, UNRANKED.t);
      return;
    }
    var T = TIERS[+id];
    if (T) setLight(T.c, T.t);
  }

  var seenIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); seenIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -18% 0px' });

  var active = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) activate(e.target.dataset.rungSection); });
  }, { rootMargin: '-45% 0px -45% 0px' });

  rungs.forEach(function (r) { seenIO.observe(r); active.observe(r); });
})();
