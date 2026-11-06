/* ===========================================================
   PIT BOARD — matrix puzzle generator (no DOM; runs in Node too)
   ---------------------------------------------------------
   generate(level, rng) → {
     kind: 'grid' | 'series', rows, cols, cells (null = the gap),
     options (8 figures), answer (index), rules (explanations), family, level
   }
   Figures:
     { t: 'shape', shape, sides, fill, size, count, rot, pos, dot }
     { t: 'lines', segs }   9 possible strokes as a bitmask
     { t: 'dots', n, frame }
   Families (levels 1–5): attribute grids (one-of-each, constant
   rows/columns, progressions in size/count/rotation/position),
   figure series, counting/arithmetic grids, overlay grids
   (OR / XOR / AND / minus) and polygon-side arithmetic.
   Every attribute is either constant or follows a visible rule,
   so the answer is fully determined; all 8 options are distinct.
   =========================================================== */

(function (root) {
  'use strict';

  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star'];
  const ROT_SHAPES = ['arrow', 'triangle', 'flag'];
  const FILLS = ['black', 'gray', 'white'];
  const SIZE_WORD = ['small', 'medium', 'large'];
  const CORNER = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const SEG_NAMES = ['top line', 'bottom line', 'left line', 'right line', '\\ diagonal', '/ diagonal', 'middle horizontal', 'middle vertical', 'centre circle'];
  const POLY_NAME = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon' };

  // -------------------- helpers --------------------
  const mk = rng => ({
    ri: (a, b) => a + Math.floor(rng() * (b - a + 1)),
    pick: arr => arr[Math.floor(rng() * arr.length)],
    shuffle: arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    chance: p => rng() < p,
  });
  const key = f => JSON.stringify(f, Object.keys(f).sort());
  const same = (a, b) => key(a) === key(b);
  const shapeFig = o => ({ t: 'shape', shape: 'circle', sides: 0, fill: 'black', size: 2, count: 1, rot: 0, pos: -1, dot: -1, ...o });
  const popcount = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
  const fillWord = f => f;
  const shapeWord = f => (f.shape === 'poly' ? POLY_NAME[f.sides] : f.shape);

  // A figure that can actually be drawn
  const valid = f => {
    if (f.t === 'shape') return f.count >= 1 && f.count <= 9 && (f.shape !== 'poly' || (f.sides >= 3 && f.sides <= 9));
    if (f.t === 'dots') return f.n >= 1 && f.n <= 9;
    return f.segs > 0;
  };

  // Seven distractors from mutations of the answer, all distinct from each other and the answer
  function buildOptions(answer, mutants, R) {
    const opts = [answer];
    for (const m of R.shuffle(mutants)) {
      if (opts.length >= 8) break;
      if (m && valid(m) && !opts.some(o => same(o, m))) opts.push(m);
    }
    if (opts.length < 8) return null;
    const order = R.shuffle(opts);
    return { options: order, answer: order.findIndex(o => same(o, answer)) };
  }

  // ============================================================
  //  ATTRIBUTE GRIDS
  // ============================================================
  // Each attribute: { rule, vals } → value at (r, c)
  function valueAt(spec, r, c, n) {
    switch (spec.rule) {
      case 'const': return spec.vals[0];
      case 'row': return spec.vals[r];
      case 'col': return spec.vals[c];
      case 'latin': return spec.vals[(r * spec.k + c) % n];
      case 'prog': return spec.base + spec.step * (c + spec.diag * r);
      default: throw new Error(spec.rule);
    }
  }
  const RULE_COST = { const: 0, row: 1, col: 1, latin: 2, prog: 2 };

  function describeAttr(name, spec, n) {
    const list = vals => vals.slice(0, n).map(v => (name === 'size' ? SIZE_WORD[v] : name === 'pos' ? CORNER[v] : v)).join(', ');
    const nice = { shape: 'Shape', fill: 'Colour', size: 'Size', count: 'Number of figures', rot: 'Rotation', pos: 'Position' }[name];
    switch (spec.rule) {
      case 'row': return `${nice} stays the same along each row (${list(spec.vals)}).`;
      case 'col': return `${nice} stays the same down each column (${list(spec.vals)}).`;
      case 'latin': return `${nice}: every row and every column has each of ${list(spec.vals)} exactly once.`;
      case 'prog':
        if (name === 'rot') return `Rotation: each step to the right turns the figure ${spec.step}° clockwise${spec.diag ? ', and each row starts one step further' : ''}.`;
        if (name === 'pos') return `Position: the figure moves one corner clockwise each step to the right${spec.diag ? ', each row starting one corner further' : ''}.`;
        if (name === 'size') return `Size grows from small to large from left to right.`;
        return `Number of figures goes up by ${spec.step} each step to the right${spec.diag ? ', each row starting one higher' : ''}.`;
      default: return null;
    }
  }

  function gridAttr(level, R) {
    const n = level <= 2 && R.chance(0.45) ? 2 : 3;
    // Which attributes vary, by level
    const budget = { 1: [1, 2], 2: [2, 3], 3: [3, 5], 4: [5, 7], 5: [7, 10] }[level];
    for (let tries = 0; tries < 200; tries++) {
      const spec = {};
      const useRot = level >= 3 && n === 3 && R.chance(0.35);
      const usePos = !useRot && level >= 3 && n === 3 && R.chance(0.35);
      const varyCount = !usePos && R.chance(level >= 2 ? 0.45 : 0.25);
      // shape
      const shapePool = useRot ? ROT_SHAPES : SHAPES;
      spec.shape = useRot
        ? { rule: 'const', vals: [R.pick(ROT_SHAPES)] }
        : { rule: R.pick(n === 2 ? ['const', 'row', 'col', 'latin'] : ['const', 'row', 'col', 'latin', 'latin']), vals: R.shuffle(shapePool).slice(0, n) };
      spec.fill = { rule: R.pick(n === 2 ? ['const', 'row', 'col', 'latin'] : ['const', 'row', 'col', 'latin', 'latin']), vals: R.shuffle(FILLS).slice(0, n) };
      if (n === 2 && spec.fill.rule !== 'const') spec.fill.vals = R.shuffle(FILLS).slice(0, 2);
      if (varyCount) {
        const rule = R.pick(n === 2 ? ['row', 'col', 'latin'] : ['row', 'col', 'latin', 'prog', 'prog']);
        spec.count = rule === 'prog'
          ? { rule, base: R.ri(1, 2), step: 1, diag: level >= 4 && R.chance(0.5) ? 1 : 0 }
          : { rule, vals: R.shuffle([1, 2, 3, 4]).slice(0, n) };
        spec.size = { rule: 'const', vals: [0] };
      } else {
        spec.count = { rule: 'const', vals: [1] };
        const sizeRule = usePos ? 'const' : R.pick(n === 2 ? ['const', 'row', 'col'] : ['const', 'const', 'row', 'col', 'latin', 'prog']);
        spec.size = sizeRule === 'prog' ? { rule: 'prog', base: 0, step: 1, diag: 0 } : { rule: sizeRule, vals: usePos ? [0] : R.shuffle([0, 1, 2]).slice(0, n) };
      }
      spec.rot = useRot
        ? (R.chance(0.6) ? { rule: 'prog', base: R.pick([0, 90, 180, 270]), step: R.pick([90, 45, 90]), diag: level >= 4 && R.chance(0.5) ? 1 : 0 } : { rule: 'latin', k: 1, vals: R.shuffle([0, 90, 180, 270]).slice(0, 3) })
        : { rule: 'const', vals: [0] };
      if (spec.rot.rule === 'latin') spec.rot.k = 1;
      spec.pos = usePos ? { rule: 'prog', base: R.ri(0, 3), step: 1, diag: R.chance(0.5) ? 1 : 0 } : { rule: 'const', vals: [-1] };
      for (const s of Object.values(spec)) if (s.rule === 'latin') s.k = s.k || R.pick([1, n - 1]);

      // Cost → level
      let cost = 0;
      for (const [name, s] of Object.entries(spec)) {
        cost += RULE_COST[s.rule] + (s.diag ? 1 : 0) + (name === 'rot' && s.step === 45 ? 1 : 0);
      }
      if (cost < budget[0] || cost > budget[1]) continue;
      // Two attributes on the same row/col rule can look like one rule, that's fine; but every
      // varying attribute must actually vary
      const fig = (r, c) => {
        const v = name => valueAt(spec[name], r, c, n);
        return shapeFig({
          shape: v('shape'), fill: v('fill'), size: v('size'), count: v('count'),
          rot: ((v('rot') % 360) + 360) % 360, pos: spec.pos.rule === 'const' ? -1 : ((v('pos') % 4) + 4) % 4,
        });
      };
      if (spec.count.rule === 'prog' && valueAt(spec.count, n - 1, n - 1, n) > 6) continue;
      const cells = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(fig(r, c));
      const gap = level <= 1 ? n * n - 1 : R.chance(0.6) ? n * n - 1 : R.ri(0, n * n - 1);
      const answer = cells[gap];
      // No visible cell may equal another in a way that makes the grid trivial: need at least 2 distinct figures
      if (new Set(cells.map(key)).size < Math.min(4, n * n - 1)) continue;

      // Distractors: change one or two governed (or constant) attributes
      const mut = [];
      const alt = (name, values) => values.filter(v => v !== answer[name]).map(v => ({ ...answer, [name]: v }));
      mut.push(...alt('shape', spec.shape.rule === 'const' ? R.shuffle(useRot ? ROT_SHAPES : SHAPES).slice(0, 3) : spec.shape.vals));
      mut.push(...alt('fill', FILLS));
      if (spec.count.rule !== 'const') mut.push(...alt('count', [answer.count - 1, answer.count + 1, answer.count + 2].filter(v => v >= 1)));
      if (spec.size.rule !== 'const') mut.push(...alt('size', [0, 1, 2]));
      if (useRot) mut.push(...alt('rot', [0, 45, 90, 135, 180, 225, 270, 315].map(v => v)));
      if (usePos) mut.push(...alt('pos', [0, 1, 2, 3]));
      // Two-attribute changes: right shape, wrong colour and size etc.
      const singles = [...mut];
      for (let i = 0; i < 6; i++) {
        const a = R.pick(singles), b = R.pick(singles);
        const merged = { ...answer };
        for (const k of ['shape', 'fill', 'size', 'count', 'rot', 'pos']) { if (a[k] !== answer[k]) merged[k] = a[k]; if (b[k] !== answer[k]) merged[k] = b[k]; }
        mut.push(merged);
      }
      // Also figures that appear elsewhere in the grid
      mut.push(...cells.filter((f, i) => i !== gap));
      const built = buildOptions(answer, mut, R);
      if (!built) continue;
      const rules = Object.entries(spec).map(([name, s]) => describeAttr(name, s, n)).filter(Boolean);
      return { kind: 'grid', rows: n, cols: n, cells: cells.map((f, i) => (i === gap ? null : f)), ...built, rules, family: 'grid', level };
    }
    return null;
  }

  // ============================================================
  //  FIGURE SERIES (find the next one)
  // ============================================================
  function series(level, R) {
    const changeCount = { 1: 1, 2: R.pick([1, 2]), 3: 2, 4: R.pick([2, 3]), 5: 3 }[level];
    const kinds = R.shuffle(['rot', 'dot', 'count', 'fill', 'sides', 'size']).slice(0, changeCount);
    // Compatibility: count and sides don't mix; rotation needs a rotatable shape
    if (kinds.includes('count') && (kinds.includes('sides') || kinds.includes('rot'))) return null;
    if (kinds.includes('rot') && kinds.includes('sides')) return null;   // a rotated square looks the same
    const shown = R.pick(level <= 2 ? [4, 5] : [5, 6]);
    const start = shapeFig({ shape: R.pick(['circle', 'square', 'diamond', 'hexagon']), fill: R.pick(FILLS), size: 2 });
    const steps = {};
    const rules = [];
    if (kinds.includes('rot')) {
      start.shape = R.pick(ROT_SHAPES);
      steps.rot = level >= 4 && R.chance(0.6) ? R.pick([45, -45, 135]) : R.pick([90, -90]);
      start.rot = R.pick([0, 90, 180, 270]);
      rules.push(`The figure turns ${Math.abs(steps.rot)}° ${steps.rot > 0 ? 'clockwise' : 'anticlockwise'} each step.`);
    }
    if (kinds.includes('sides')) {
      start.shape = 'poly';
      start.sides = 3;
      steps.sides = 1;
      rules.push('The shape gains one side each step (triangle, square, pentagon, …).');
    }
    if (kinds.includes('count')) {
      start.count = R.ri(1, 2);
      start.size = 0;
      steps.count = 1;
      rules.push('One more figure each step.');
    }
    if (kinds.includes('dot')) {
      start.dot = R.ri(0, 3);
      steps.dot = R.pick(level >= 3 ? [1, -1, 2] : [1, -1]);
      rules.push(steps.dot === 2 ? 'The dot jumps to the opposite corner each step.' : `The dot moves one corner ${steps.dot > 0 ? 'clockwise' : 'anticlockwise'} each step.`);
    }
    if (kinds.includes('fill')) {
      const period = level >= 3 ? R.pick([2, 3]) : 2;
      steps.fillCycle = R.shuffle(FILLS).slice(0, period);
      start.fill = steps.fillCycle[0];
      rules.push(`The colour repeats ${steps.fillCycle.join(' → ')} → …`);
    }
    if (kinds.includes('size')) {
      if (kinds.includes('count')) return null;
      steps.sizeCycle = R.chance(0.5) ? [0, 1, 2] : [2, 1, 0];
      start.size = steps.sizeCycle[0];
      rules.push(`The size repeats ${steps.sizeCycle.map(s => SIZE_WORD[s]).join(' → ')} → …`);
    }
    const at = k => {
      const f = { ...start };
      if (steps.rot !== undefined) f.rot = ((((start.rot + steps.rot * k) % 360) + 360) % 360);
      if (steps.sides) f.sides = start.sides + k;
      if (steps.count) f.count = start.count + k;
      if (steps.dot !== undefined) f.dot = (((start.dot + steps.dot * k) % 4) + 4) % 4;
      if (steps.fillCycle) f.fill = steps.fillCycle[k % steps.fillCycle.length];
      if (steps.sizeCycle) f.size = steps.sizeCycle[k % 3];
      return f;
    };
    const figs = Array.from({ length: shown + 1 }, (_, k) => at(k));
    if (figs.some(f => f.count > 7 || f.sides > 9)) return null;
    const answer = figs[shown];
    const mut = [at(shown - 1), at(shown + 1), at(shown - 2)];
    if (steps.rot !== undefined) mut.push({ ...answer, rot: (answer.rot + 90) % 360 }, { ...answer, rot: (answer.rot + 180) % 360 }, { ...answer, rot: (answer.rot + 45) % 360 });
    if (steps.dot !== undefined) mut.push({ ...answer, dot: (answer.dot + 1) % 4 }, { ...answer, dot: (answer.dot + 2) % 4 }, { ...answer, dot: (answer.dot + 3) % 4 });
    if (steps.count) mut.push({ ...answer, count: answer.count - 1 }, { ...answer, count: answer.count + 1 });
    if (steps.sides) mut.push({ ...answer, sides: answer.sides - 1 }, { ...answer, sides: answer.sides + 1 });
    mut.push(...FILLS.filter(f => f !== answer.fill).map(fill => ({ ...answer, fill })));
    if (steps.sizeCycle) mut.push(...[0, 1, 2].filter(s => s !== answer.size).map(size => ({ ...answer, size })));
    // Extra near-misses so even one-rule series get 7 distinct wrong options
    if (!steps.count) mut.push(...[0, 1].filter(s => s !== answer.size).map(size => ({ ...answer, size })));
    if (!steps.rot && !steps.sides) mut.push(...R.shuffle(SHAPES.filter(s => s !== answer.shape)).slice(0, 3).map(shape => ({ ...answer, shape })));
    if (steps.rot !== undefined) mut.push({ ...answer, rot: (answer.rot + 270) % 360 }, { ...answer, shape: R.pick(ROT_SHAPES.filter(s => s !== answer.shape)) });
    const prevFill = { ...answer, fill: FILLS[(FILLS.indexOf(answer.fill) + 1) % 3] };
    mut.push({ ...at(shown - 1), fill: prevFill.fill }, { ...at(shown + 1), fill: prevFill.fill });
    const built = buildOptions(answer, mut, R);
    if (!built) return null;
    return { kind: 'series', rows: 1, cols: shown + 1, cells: [...figs.slice(0, shown), null], ...built, rules, family: 'series', level };
  }

  // ============================================================
  //  COUNTING / ARITHMETIC GRIDS
  // ============================================================
  const ARITH = {
    plus: { f: (a, b) => a + b, text: 'In each row, the third box has as many dots as the first two together.' },
    minus: { f: (a, b) => a - b, text: 'In each row, the third box has the dots of the first minus the dots of the second.' },
    times: { f: (a, b) => a * b, text: 'In each row, the third box has the first number of dots times the second.' },
  };
  function arith(level, R) {
    const opName = level <= 3 ? R.pick(['plus', 'minus']) : R.pick(['plus', 'minus', 'times', 'total']);
    for (let tries = 0; tries < 100; tries++) {
      const rows = [];
      if (opName === 'total') {
        const total = R.ri(7, 12);
        for (let r = 0; r < 3; r++) {
          const a = R.ri(1, Math.min(7, total - 2)), b = R.ri(1, Math.min(7, total - a - 1));
          rows.push([a, b, total - a - b]);
        }
      } else {
        for (let r = 0; r < 3; r++) {
          let a = R.ri(1, 6), b = R.ri(1, 5);
          if (opName === 'minus' && a <= b) [a, b] = [b + 1, a];
          if (opName === 'times') { a = R.ri(1, 3); b = R.ri(2, 3); }
          rows.push([a, b, ARITH[opName].f(a, b)]);
        }
      }
      if (rows.flat().some(v => v < 1 || v > 9)) continue;
      // The two complete rows must rule out the other operations
      const fits = name => rows.slice(0, 2).every(([a, b, c]) => (name === 'total' ? a + b + c === rows[0].reduce((s, x) => s + x, 0) : ARITH[name].f(a, b) === c));
      const rivals = ['plus', 'minus', 'times', 'total'].filter(o => o !== opName && fits(o));
      const predict = name => (name === 'total' ? rows[0].reduce((s, x) => s + x, 0) - rows[2][0] - rows[2][1] : ARITH[name].f(rows[2][0], rows[2][1]));
      if (rivals.some(o => predict(o) !== rows[2][2])) continue;
      const frame = R.pick(['none', 'circle', 'square']);
      const cells = rows.flat().map(n => ({ t: 'dots', n, frame }));
      const answer = cells[8];
      const mut = [answer.n - 1, answer.n + 1, answer.n + 2, answer.n - 2, rows[2][0], rows[2][1], answer.n + 3].filter(v => v >= 1 && v <= 9).map(n => ({ t: 'dots', n, frame }));
      mut.push({ t: 'dots', n: answer.n, frame: frame === 'circle' ? 'square' : 'circle' });
      const built = buildOptions(answer, mut, R);
      if (!built) continue;
      const text = opName === 'total' ? `Every row has ${rows[0].reduce((s, x) => s + x, 0)} dots in total.` : ARITH[opName].text;
      return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === 8 ? null : f)), ...built, rules: [text], family: 'arith', level };
    }
    return null;
  }

  // Polygon sides add up: third shape has as many sides as the first two together
  function sidesArith(level, R) {
    for (let tries = 0; tries < 100; tries++) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const a = R.ri(3, 5), b = R.ri(3, 9 - a);
        if (a + b > 9) continue;
        rows.push([a, b, a + b]);
      }
      if (rows.length < 3) continue;
      const fill = R.pick(FILLS);
      const cells = rows.flat().map(s => shapeFig({ shape: 'poly', sides: s, fill, size: 2 }));
      const answer = cells[8];
      const mut = [-2, -1, 1, 2].map(d => answer.sides + d).filter(s => s >= 3 && s <= 9 && s !== answer.sides).map(s => ({ ...answer, sides: s }));
      mut.push(...FILLS.filter(f => f !== fill).map(f => ({ ...answer, fill: f })));
      mut.push({ ...answer, sides: rows[2][0] }, { ...answer, sides: rows[2][1] }, { ...answer, shape: 'circle', sides: 0 });
      const built = buildOptions(answer, mut, R);
      if (!built) continue;
      return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === 8 ? null : f)), ...built, rules: ['Count the sides: in each row, the third shape has as many sides as the first two together (e.g. triangle + square = heptagon).'], family: 'sides', level };
    }
    return null;
  }

  // ============================================================
  //  OVERLAY GRIDS
  // ============================================================
  const OPS = {
    or: { f: (a, b) => a | b, text: 'The third figure shows every line from the first two put together.' },
    xor: { f: (a, b) => a ^ b, text: 'The third figure keeps only the lines that appear in exactly one of the first two (shared lines disappear).' },
    and: { f: (a, b) => a & b, text: 'The third figure keeps only the lines the first two have in common.' },
    minus: { f: (a, b) => a & ~b, text: 'The third figure is the first one with the lines of the second removed.' },
  };
  function overlay(level, R) {
    const opName = level <= 4 ? R.pick(['or', 'xor']) : R.pick(['xor', 'and', 'minus', 'or']);
    const op = OPS[opName].f;
    const randMask = (lo, hi) => { let m = 0; const k = R.ri(lo, hi); for (const b of R.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, k)) m |= 1 << b; return m; };
    for (let tries = 0; tries < 200; tries++) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const a = randMask(3, 5), b = randMask(3, 5);
        const c = op(a, b);
        if (!c || c === a || c === b) break;
        rows.push([a, b, c]);
      }
      if (rows.length < 3) continue;
      // Two complete rows must single out the operation
      const rivals = Object.keys(OPS).filter(o => o !== opName && rows.slice(0, 2).every(([a, b, c]) => OPS[o].f(a, b) === c));
      if (rivals.some(o => OPS[o].f(rows[2][0], rows[2][1]) !== rows[2][2])) continue;
      const cells = rows.flat().map(segs => ({ t: 'lines', segs }));
      const gap = opName === 'xor' && level >= 5 && R.chance(0.4) ? R.pick([6, 7, 8]) : 8;
      const answer = cells[gap];
      const [a, b] = rows[2];
      const mut = Object.keys(OPS).filter(o => o !== opName).map(o => ({ t: 'lines', segs: OPS[o].f(a, b) }));
      for (let bit = 0; bit < 9; bit++) mut.push({ t: 'lines', segs: answer.segs ^ (1 << bit) });
      mut.push({ t: 'lines', segs: a }, { t: 'lines', segs: b });
      const built = buildOptions(answer, mut.filter(m => m.segs), R);
      if (!built) continue;
      const rules = [OPS[opName].text];
      if (gap !== 8) rules.push('Here the gap is not the result: work backwards — the missing figure combined with the other one must give the third.');
      return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === gap ? null : f)), ...built, rules, family: 'overlay', level };
    }
    return null;
  }

  // ============================================================
  //  ENTRY
  // ============================================================
  const FAMILIES_BY_LEVEL = {
    1: [['grid', 3], ['series', 2]],
    2: [['grid', 3], ['series', 2], ['arith', 1]],
    3: [['grid', 3], ['series', 2], ['arith', 2]],
    4: [['grid', 3], ['series', 2], ['arith', 1], ['overlay', 3]],
    5: [['grid', 2], ['series', 2], ['arith', 1], ['overlay', 3], ['sides', 1]],
  };
  const GEN = { grid: gridAttr, series, arith, overlay, sides: sidesArith };

  function generate(level, rng = Math.random) {
    const R = mk(rng);
    const lv = Math.max(1, Math.min(5, level));
    const bag = FAMILIES_BY_LEVEL[lv].flatMap(([f, w]) => Array(w).fill(f));
    for (let tries = 0; tries < 60; tries++) {
      const fam = R.pick(bag);
      const p = GEN[fam](lv, R);
      if (p) return p;
    }
    throw new Error(`could not generate level ${lv}`);
  }

  const API = { generate, SEG_NAMES, key, same };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.MatrixGen = API;
})(typeof window !== 'undefined' ? window : globalThis);
