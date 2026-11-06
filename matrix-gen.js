/* ===========================================================
   PIT BOARD — matrix puzzle generator v2 (no DOM; runs in Node)
   ---------------------------------------------------------
   generate(level 1–9, rng, history) → {
     kind: 'grid' | 'series', rows, cols, cells (null = gap),
     options (8 figures), answer, rules (plain-English), level,
     cost, family, signature
   }
   A figure is { tpl, rec }: a template plus its attribute record.
   build(fig) turns it into drawable elements for the renderer.

   Difficulty: every puzzle gets a cost from how many features
   change, which rule each follows (row/column < one-of-each <
   diagonal < progression with offset …) and how they interact.
   A level accepts only puzzles in its cost band, so level 9 really
   is harder than level 5. `history` (signatures already used this
   run) steers away from repeating the same kind of puzzle.
   Options: 7 near-misses, chosen so every feature of the answer
   also appears on another option — no spotting the odd one out.
   =========================================================== */

(function (root) {
  'use strict';

  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'cross'];
  const ROT_SHAPES = ['arrow', 'flag', 'ell', 'triangle'];
  const OUTER = ['circle', 'square', 'hexagon', 'diamond', 'pentagon'];
  const SMALL = ['circle', 'square', 'triangle', 'star', 'diamond', 'cross'];
  const FILLS = ['solid', 'shaded', 'outline'];
  const SIZE_WORD = ['small', 'medium', 'large'];
  const POLY = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon' };
  const BANDS = { 1: [0.5, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5], 5: [5, 6.25], 6: [6.25, 7.5], 7: [7.5, 8.75], 8: [8.75, 10], 9: [10, 99] };

  // -------------------- helpers --------------------
  const mk = rng => ({
    ri: (a, b) => a + Math.floor(rng() * (b - a + 1)),
    pick: arr => arr[Math.floor(rng() * arr.length)],
    shuffle: arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    chance: p => rng() < p,
  });
  const keyOf = fig => fig.tpl + JSON.stringify(fig.rec, Object.keys(fig.rec).sort());
  const same = (a, b) => keyOf(a) === keyOf(b);
  const mod = (v, m) => ((v % m) + m) % m;

  // -------------------- templates --------------------
  // attrs: categorical (domain list) or numeric ({ min, max, mod }) ; build → drawable elements
  const TPL = {
    solo: {
      base: 0,
      attrs: { shape: SHAPES, fill: FILLS, size: { min: 0, max: 2 }, rot: { mod: 360 } },
      build: r => [{ k: 'shape', shape: r.shape, fill: r.fill, x: 50, y: 50, r: [16, 26, 38][r.size], rot: r.rot }],
    },
    count: {
      base: 0.5,
      attrs: { shape: SMALL, fill: FILLS, count: { min: 1, max: 6 } },
      build: r => LAYOUT[r.count].map(([x, y]) => ({ k: 'shape', shape: r.shape, fill: r.fill, x, y, r: r.count > 4 ? 9 : 11, rot: 0 })),
    },
    nested: {
      base: 1,
      attrs: { outer: OUTER, oFill: ['outline', 'shaded'], inner: SMALL, iFill: FILLS, rot: { mod: 360 } },
      build: r => [
        { k: 'shape', shape: r.outer, fill: r.oFill, x: 50, y: 50, r: 40, rot: 0 },
        { k: 'shape', shape: r.inner, fill: r.iFill, x: 50, y: 50, r: 15, rot: r.rot },
      ],
    },
    orbit: {
      base: 1,
      attrs: { shape: OUTER, fill: FILLS, pos: { mod: 8 }, sat: ['circle', 'square', 'triangle'] },
      build: r => {
        const a = ((-90 + 45 * r.pos) * Math.PI) / 180;
        return [
          { k: 'shape', shape: r.shape, fill: r.fill, x: 50, y: 50, r: 20, rot: 0 },
          { k: 'shape', shape: r.sat, fill: 'solid', x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a), r: 8, rot: 0 },
        ];
      },
    },
    pair: {
      base: 1.5,
      attrs: { lShape: SHAPES, lFill: FILLS, rShape: SHAPES, rFill: FILLS },
      build: r => [
        { k: 'shape', shape: r.lShape, fill: r.lFill, x: 29, y: 50, r: 17, rot: 0 },
        { k: 'shape', shape: r.rShape, fill: r.rFill, x: 71, y: 50, r: 17, rot: 0 },
      ],
    },
    lines: { base: 0, attrs: {}, build: r => bits(r.mask, 9).map(i => ({ k: 'seg', i })).concat(r.c ? [{ k: 'shape', shape: r.c, fill: r.cf || 'solid', x: 50, y: 50, r: 10, rot: 0 }] : []) },
    dotgrid: { base: 0, attrs: {}, build: r => bits(r.mask, 9).map(i => ({ k: 'dot', x: 22 + 28 * (i % 3), y: 22 + 28 * Math.floor(i / 3) })) },
    dots: { base: 0, attrs: {}, build: r => (r.frame ? [{ k: 'frame', frame: r.frame }] : []).concat(LAYOUT[r.n].map(([x, y]) => ({ k: 'dot', x, y }))) },
    poly: { base: 0, attrs: {}, build: r => [{ k: 'shape', shape: 'poly', sides: r.sides, fill: r.fill, x: 50, y: 50, r: 36, rot: 0 }] },
  };
  const LAYOUT = {
    1: [[50, 50]], 2: [[30, 50], [70, 50]], 3: [[50, 28], [28, 70], [72, 70]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[24, 34], [50, 34], [76, 34], [24, 66], [50, 66], [76, 66]],
    7: [[24, 24], [50, 24], [76, 24], [24, 50], [50, 50], [76, 50], [50, 76]],
    8: [[24, 24], [50, 24], [76, 24], [24, 50], [76, 50], [24, 76], [50, 76], [76, 76]],
    9: [[24, 24], [50, 24], [76, 24], [24, 50], [50, 50], [76, 50], [24, 76], [50, 76], [76, 76]],
  };
  const bits = (m, n) => Array.from({ length: n }, (_, i) => i).filter(i => m & (1 << i));
  const build = fig => TPL[fig.tpl].build(fig.rec);

  const NAME = {
    shape: 'Shape', fill: 'Colour', size: 'Size', rot: 'Rotation', count: 'Number of shapes', outer: 'Outer shape', oFill: 'Outer colour',
    inner: 'Inner shape', iFill: 'Inner colour', pos: 'The small satellite', sat: 'Satellite shape', lShape: 'Left shape', lFill: 'Left colour',
    rShape: 'Right shape', rFill: 'Right colour',
  };
  const word = (attr, v) => (attr === 'size' ? SIZE_WORD[v] : attr === 'rot' ? `${v}°` : String(v));

  // Valid, drawable record
  function valid(fig) {
    const r = fig.rec;
    if (fig.tpl === 'count') return r.count >= 1 && r.count <= 6;
    if (fig.tpl === 'solo') return r.size >= 0 && r.size <= 2;
    if (fig.tpl === 'lines' || fig.tpl === 'dotgrid') return r.mask > 0;
    if (fig.tpl === 'dots') return r.n >= 1 && r.n <= 9;
    if (fig.tpl === 'poly') return r.sides >= 3 && r.sides <= 9;
    return true;
  }

  // Features used for the "no odd one out" check
  function features(fig) {
    const out = [];
    for (const [k, v] of Object.entries(fig.rec)) {
      if (k === 'mask') bits(v, 9).forEach(b => out.push(`b${b}`));
      else out.push(`${k}=${v}`);
    }
    return out;
  }

  // Pick 7 distinct distractors so each answer feature shows up on at least one of them
  function buildOptions(answer, mutants, R) {
    const pool = [];
    for (const m of R.shuffle(mutants)) if (m && valid(m) && !same(m, answer) && !pool.some(p => same(p, m))) pool.push(m);
    if (pool.length < 7) return null;
    const need = features(answer);
    for (let attempt = 0; attempt < 25; attempt++) {
      const chosen = [];
      for (const f of R.shuffle(need)) {
        if (chosen.some(c => features(c).includes(f))) continue;
        const withF = R.shuffle(pool.filter(p => features(p).includes(f) && !chosen.includes(p)));
        if (withF.length && chosen.length < 7) chosen.push(withF[0]);
      }
      for (const p of R.shuffle(pool)) { if (chosen.length >= 7) break; if (!chosen.includes(p)) chosen.push(p); }
      const opts = [answer, ...chosen];
      // "Most typical option" must not give the answer away: some distractor is at least as typical
      const typical = o => { const fs = features(o); return fs.reduce((s, f) => s + opts.filter(p => features(p).includes(f)).length, 0) / Math.max(1, fs.length); };
      const answerTyp = typical(answer);
      if (need.every(f => chosen.some(c => features(c).includes(f))) && chosen.some(c => typical(c) >= answerTyp)) {
        const order = R.shuffle(opts);
        return { options: order, answer: order.findIndex(o => same(o, answer)) };
      }
    }
    return null;
  }

  // Generic mutants: change one attribute, two attributes, or borrow from other cells
  function mutate(answer, R, changeable, extra = []) {
    const out = [...extra];
    const attrs = TPL[answer.tpl].attrs;
    const one = [];
    for (const a of changeable) {
      const dom = attrs[a];
      const cur = answer.rec[a];
      let vals;
      if (Array.isArray(dom)) vals = dom.filter(v => v !== cur);
      else if (dom.mod) vals = (a === 'rot' ? [45, 90, 135, 180, 270] : [1, 2, 3, 4]).map(d => mod(cur + d, dom.mod));
      else vals = [cur - 1, cur + 1, cur + 2, cur - 2].filter(v => v >= dom.min && v <= dom.max);
      for (const v of R.shuffle(vals).slice(0, 4)) one.push({ tpl: answer.tpl, rec: { ...answer.rec, [a]: v } });
    }
    out.push(...one);
    for (let i = 0; i < 10 && one.length > 1; i++) {
      const a = R.pick(one), b = R.pick(one);
      out.push({ tpl: answer.tpl, rec: { ...a.rec, ...Object.fromEntries(Object.entries(b.rec).filter(([k, v]) => v !== answer.rec[k])) } });
    }
    return out;
  }

  // ============================================================
  //  ATTRIBUTE GRIDS
  // ============================================================
  function ruleValue(rule, r, c, n) {
    switch (rule.kind) {
      case 'const': return rule.vals[0];
      case 'row': return rule.vals[r];
      case 'col': return rule.vals[c];
      case 'latinA': return rule.vals[mod(r + c, n)];        // constant along ↙ diagonals
      case 'latinB': return rule.vals[mod(c - r, n)];        // constant along ↘ diagonals
      case 'prog': {
        const k = rule.dir === 'h' ? c + rule.diag * r : r + rule.diag * c;
        const v = rule.base + rule.step * k;
        return rule.mod ? mod(v, rule.mod) : v;
      }
      default: throw new Error(rule.kind);
    }
  }
  function ruleCost(attr, rule) {
    let c = { const: 0, row: 1, col: 1, latinA: 2, latinB: 2.5, prog: 2 }[rule.kind];
    if (rule.kind === 'prog') {
      if (rule.diag) c += 1.5;
      if (rule.dir === 'v') c += 0.25;
      if (attr === 'rot' && rule.step % 90) c += 1;
      if (attr === 'pos' && (Math.abs(rule.step) >= 2 || rule.step < 0)) c += 0.5;
    }
    return c;
  }
  function ruleText(attr, rule, n) {
    const nm = NAME[attr];
    const list = () => rule.vals.slice(0, n).map(v => word(attr, v)).join(', ');
    switch (rule.kind) {
      case 'row': return `${nm} stays the same along each row (${list()}).`;
      case 'col': return `${nm} stays the same down each column (${list()}).`;
      case 'latinA': return `${nm}: one of each (${list()}) in every row and column — it stays the same along each ↙ diagonal.`;
      case 'latinB': return `${nm}: one of each (${list()}) in every row and column — it stays the same along each ↘ diagonal.`;
      case 'prog': {
        const dirWord = rule.dir === 'h' ? 'to the right' : 'downwards';
        const offset = rule.diag ? `, and each ${rule.dir === 'h' ? 'row' : 'column'} starts one step further` : '';
        if (attr === 'rot') return `${nm}: turns ${Math.abs(rule.step)}° ${rule.step > 0 ? 'clockwise' : 'anticlockwise'} each step ${dirWord}${offset}.`;
        if (attr === 'pos') return `${nm} moves ${Math.abs(rule.step)} place${Math.abs(rule.step) > 1 ? 's' : ''} ${rule.step > 0 ? 'clockwise' : 'anticlockwise'} around the shape each step ${dirWord}${offset}.`;
        if (attr === 'size') return `${nm} grows by one step ${dirWord}.`;
        return `${nm} goes up by ${rule.step} each step ${dirWord}${offset}.`;
      }
      default: return null;
    }
  }

  function attrGrid(level, R) {
    const tplName = R.pick(level <= 2 ? ['solo', 'count', 'solo', 'pair'] : ['solo', 'count', 'nested', 'orbit', 'pair', 'nested', 'orbit']);
    const tpl = TPL[tplName];
    const n = level <= 2 && R.chance(0.5) ? 2 : 3;
    const want = level <= 2 ? R.ri(1, 2) : level <= 4 ? R.ri(2, 3) : level <= 6 ? 3 : R.ri(3, 4);
    const attrs = Object.keys(tpl.attrs);
    const rotUsable = tplName === 'solo' || tplName === 'nested';
    const varying = R.shuffle(attrs.filter(a => a !== 'rot' || (rotUsable && n === 3))).slice(0, want);
    const rules = {};
    for (const a of attrs) {
      const dom = tpl.attrs[a];
      if (!varying.includes(a)) {
        // constant attribute; rotating shapes only when rotation varies
        let v;
        if (a === 'rot') v = 0;
        else if (Array.isArray(dom)) v = R.pick(dom);
        else v = a === 'size' ? 2 : a === 'count' ? 1 : a === 'pos' ? R.ri(0, 7) : 0;
        rules[a] = { kind: 'const', vals: [v] };
        continue;
      }
      if (Array.isArray(dom)) {
        const kinds = n === 2 ? ['row', 'col', 'latinA'] : ['row', 'col', 'latinA', 'latinB', 'latinA', 'latinB'];
        rules[a] = { kind: R.pick(kinds), vals: R.shuffle(dom).slice(0, n) };
      } else {
        const progAllowed = n === 3;
        const kind = progAllowed && (a === 'rot' || a === 'pos' || R.chance(0.6)) ? 'prog' : R.pick(n === 2 ? ['row', 'col', 'latinA'] : ['row', 'col', 'latinA', 'latinB']);
        if (kind === 'prog') {
          const dir = R.chance(0.65) ? 'h' : 'v';
          if (a === 'rot') rules[a] = { kind, dir, diag: R.chance(0.4) ? 1 : 0, base: R.pick([0, 90, 180, 270]), step: R.pick([90, -90, 45, 135]), mod: 360 };
          else if (a === 'pos') rules[a] = { kind, dir, diag: R.chance(0.4) ? 1 : 0, base: R.ri(0, 7), step: R.pick([1, -1, 2, 3]), mod: 8 };
          else if (a === 'size') rules[a] = { kind, dir, diag: 0, base: 0, step: 1 };
          else rules[a] = { kind, dir, diag: R.chance(0.4) ? 1 : 0, base: R.ri(1, 2), step: 1 };
        } else {
          const pool = a === 'size' ? [0, 1, 2] : a === 'count' ? [1, 2, 3, 4, 5, 6] : a === 'rot' ? [0, 90, 180, 270] : [0, 1, 2, 3, 4, 5, 6, 7];
          rules[a] = { kind, vals: R.shuffle(pool).slice(0, n) };
        }
      }
    }
    // Rotation only shows on asymmetric shapes: lock the rotated shape to one
    if (rules.rot && rules.rot.kind !== 'const') {
      const host = tplName === 'nested' ? 'inner' : 'shape';
      rules[host] = { kind: 'const', vals: [R.pick(ROT_SHAPES)] };
      if (!varying.includes(host)) { /* fine */ } else return null;
    }
    const fig = (r, c) => ({ tpl: tplName, rec: Object.fromEntries(attrs.map(a => [a, ruleValue(rules[a], r, c, n)])) });
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(fig(r, c));
    if (cells.some(f => !valid(f))) return null;
    if (new Set(cells.map(keyOf)).size < n * n - (n === 2 ? 1 : 2)) return null;   // too repetitive to read
    const gap = level <= 2 ? n * n - 1 : R.chance(0.5) ? n * n - 1 : R.ri(0, n * n - 1);
    const answer = cells[gap];
    const activeAttrs = attrs.filter(a => rules[a].kind !== 'const');
    if (!activeAttrs.length) return null;
    const changeable = attrs.filter(a => a !== 'rot' || rules.rot.kind !== 'const');
    const built = buildOptions(answer, mutate(answer, R, changeable, cells.filter((_, i) => i !== gap)), R);
    if (!built) return null;
    let cost = tpl.base + activeAttrs.reduce((s, a) => s + ruleCost(a, rules[a]), 0) + Math.max(0, activeAttrs.length - 2) + (n === 2 ? -0.5 : 0) + (gap !== n * n - 1 ? 0.5 : 0);
    cost = Math.max(0.5, cost);
    const sig = `grid:${tplName}:${activeAttrs.map(a => `${a}-${rules[a].kind}`).sort().join(',')}`;
    return {
      kind: 'grid', rows: n, cols: n, cells: cells.map((f, i) => (i === gap ? null : f)), ...built,
      rules: activeAttrs.map(a => ruleText(a, rules[a], n)).filter(Boolean), cost, family: 'grid', signature: sig,
    };
  }

  // ============================================================
  //  FEATURE COMBINING: third = outer of first + inner of second
  // ============================================================
  function combineGrid(level, R) {
    const byRow = R.chance(0.6);
    const fill = R.chance(0.5) ? { kind: 'const', vals: [R.pick(FILLS)] } : { kind: R.pick(['latinA', 'latinB']), vals: R.shuffle(FILLS) };
    const outers = R.shuffle(OUTER), inners = R.shuffle(SMALL);
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const a = { outer: outers[i], inner: inners[(i + 1) % inners.length] };
      const b = { outer: outers[(i + 2) % outers.length], inner: inners[(i + 3) % inners.length] };
      rows.push([a, b, { outer: a.outer, inner: b.inner }]);
    }
    const oFill = R.pick(['outline', 'shaded']);
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const [line, pos] = byRow ? [r, c] : [c, r];
      const part = rows[line][pos];
      cells.push({ tpl: 'nested', rec: { outer: part.outer, oFill, inner: part.inner, iFill: ruleValue(fill, r, c, 3), rot: 0 } });
    }
    const gap = R.chance(0.7) ? 8 : byRow ? R.pick([2, 5]) : R.pick([6, 7]);
    const answer = cells[gap];
    const ln = byRow ? Math.floor(gap / 3) : gap % 3;
    const swapped = { tpl: 'nested', rec: { ...answer.rec, outer: rows[ln][1].outer, inner: rows[ln][0].inner } };
    const built = buildOptions(answer, mutate(answer, R, ['outer', 'inner', 'iFill'], [swapped, ...cells.filter((_, i) => i !== gap)]), R);
    if (!built) return null;
    const rules = [byRow
      ? 'In each row, the third figure takes its outer shape from the first figure and its inner shape from the second.'
      : 'In each column, the bottom figure takes its outer shape from the top figure and its inner shape from the middle one.'];
    if (fill.kind !== 'const') rules.push(ruleText('iFill', fill, 3));
    const cost = 5 + (fill.kind !== 'const' ? 2 : 0) + (byRow ? 0 : 0.5);
    return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === gap ? null : f)), ...built, rules, cost, family: 'combine', signature: `combine:${byRow ? 'row' : 'col'}:${fill.kind}` };
  }

  // ============================================================
  //  OVERLAYS on lines or dot grids
  // ============================================================
  const OPS = {
    or: { f: (a, b) => a | b, cost: 3, text: 'every mark from the first two put together' },
    xor: { f: (a, b) => a ^ b, cost: 4, text: 'only the marks that appear in exactly one of the first two (shared marks disappear)' },
    and: { f: (a, b) => a & b, cost: 4, text: 'only the marks the first two have in common' },
    minus: { f: (a, b) => a & ~b, cost: 4.5, text: 'the first figure with the marks of the second removed' },
  };
  function overlay(level, R) {
    const tpl = R.chance(0.55) ? 'lines' : 'dotgrid';
    const opName = R.pick(level <= 5 ? ['or', 'xor'] : ['or', 'xor', 'and', 'minus', 'xor']);
    const op = OPS[opName].f;
    const byRow = R.chance(0.7);
    const randMask = () => { let m = 0; for (const b of R.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, R.ri(3, 5))) m |= 1 << b; return m; };
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const a = randMask(), b = randMask(), c = op(a, b);
      if (!c || c === a || c === b) return null;
      lines.push([a, b, c]);
    }
    const rivals = Object.keys(OPS).filter(o => o !== opName && lines.slice(0, 2).every(([a, b, c]) => OPS[o].f(a, b) === c));
    if (rivals.some(o => OPS[o].f(lines[2][0], lines[2][1]) !== lines[2][2])) return null;
    // Extra layer at higher levels: a small centre shape following its own one-of-each rule
    const centre = tpl === 'lines' && level >= 7 && R.chance(0.6) ? { kind: R.pick(['latinA', 'latinB']), vals: R.shuffle(SMALL).slice(0, 3) } : null;
    const centreFill = centre && level >= 8 && R.chance(0.6) ? { kind: centre.kind === 'latinA' ? 'latinB' : 'latinA', vals: R.shuffle(FILLS) } : null;
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const [ln, pos] = byRow ? [r, c] : [c, r];
      const rec = { mask: lines[ln][pos] };
      if (centre) rec.c = ruleValue(centre, r, c, 3);
      if (centreFill) rec.cf = ruleValue(centreFill, r, c, 3);
      cells.push({ tpl, rec });
    }
    const backwards = opName === 'xor' && level >= 6 && R.chance(0.45);
    const gap = backwards ? (byRow ? R.pick([6, 7]) : R.pick([2, 5])) : 8;
    const answer = cells[gap];
    const ln = byRow ? Math.floor(gap / 3) : gap % 3;
    const [a, b] = lines[ln];
    const mut = Object.keys(OPS).filter(o => o !== opName).map(o => ({ tpl, rec: { ...answer.rec, mask: OPS[o].f(a, b) } }));
    for (let bit = 0; bit < 9; bit++) mut.push({ tpl, rec: { ...answer.rec, mask: answer.rec.mask ^ (1 << bit) } });
    mut.push({ tpl, rec: { ...answer.rec, mask: a } }, { tpl, rec: { ...answer.rec, mask: b } });
    if (centre) for (const s of SMALL) mut.push({ tpl, rec: { ...answer.rec, c: s } });
    if (centreFill) for (const f of FILLS) mut.push({ tpl, rec: { ...answer.rec, cf: f } }, { tpl, rec: { ...answer.rec, cf: f, mask: answer.rec.mask ^ 1 } });
    const built = buildOptions(answer, mut, R);
    if (!built) return null;
    const unit = tpl === 'lines' ? 'lines' : 'dots';
    const rules = [`In each ${byRow ? 'row' : 'column'}, the ${byRow ? 'third' : 'bottom'} figure shows ${OPS[opName].text.replace(/marks/g, unit)}.`];
    if (backwards) rules.push('The gap is not the result here: work backwards — whatever combined with the other figure gives the result.');
    if (centre) rules.push(ruleText('shape', centre, 3).replace('Shape', 'The small centre shape'));
    if (centreFill) rules.push(ruleText('fill', centreFill, 3).replace('Colour', 'Its colour'));
    const cost = OPS[opName].cost + (backwards ? 1.5 : 0) + (byRow ? 0 : 0.5) + (tpl === 'dotgrid' ? 0.5 : 0) + (centre ? 2.5 : 0) + (centreFill ? 2 : 0);
    return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === gap ? null : f)), ...built, rules, cost, family: 'overlay', signature: `overlay:${tpl}:${opName}:${backwards}:${!!centre}:${!!centreFill}` };
  }

  // ============================================================
  //  COUNTING: dots and polygon sides
  // ============================================================
  function arith(level, R) {
    const sides = level >= 6 && R.chance(0.35);
    const opName = sides ? R.pick(['plus', 'minus']) : R.pick(level <= 4 ? ['plus', 'minus', 'total'] : ['plus', 'minus', 'times', 'total', 'diff']);
    const F = { plus: (a, b) => a + b, minus: (a, b) => a - b, times: (a, b) => a * b, diff: (a, b) => Math.abs(a - b) };
    const lo = sides ? 3 : 1, hi = 9;
    const rows = [];
    const total = R.ri(sides ? 12 : 8, sides ? 20 : 13);
    for (let i = 0; i < 3; i++) {
      let a, b, c;
      if (opName === 'total') { a = R.ri(lo, 6); b = R.ri(lo, Math.max(lo, total - a - lo)); c = total - a - b; }
      else if (opName === 'times') { a = R.ri(1, 3); b = R.ri(2, 3); c = a * b; }
      else { a = R.ri(lo, sides ? 6 : 7); b = R.ri(lo, sides ? 6 : 5); if (opName !== 'plus' && a < b) [a, b] = [b, a]; c = F[opName](a, b); }
      rows.push([a, b, c]);
    }
    if (rows.flat().some(v => v < lo || v > hi)) return null;
    const fits = o => rows.slice(0, 2).every(([a, b, c]) => (o === 'total' ? a + b + c === total : F[o](a, b) === c));
    const predict = o => (o === 'total' ? total - rows[2][0] - rows[2][1] : F[o](rows[2][0], rows[2][1]));
    if (['plus', 'minus', 'times', 'total', 'diff'].filter(o => o !== opName && fits(o)).some(o => predict(o) !== rows[2][2])) return null;
    const byRow = R.chance(0.65);
    let frame = R.pick(['', 'circle', 'square']);
    let fill = R.pick(FILLS);
    const extraRule = level >= 7 && R.chance(0.7) ? { kind: R.pick(['latinA', 'latinB']), vals: sides ? R.shuffle(FILLS) : R.shuffle(['', 'circle', 'square']) } : null;
    const mkFig = (v, r, c) => {
      if (extraRule && r !== undefined) { if (sides) fill = ruleValue(extraRule, r, c, 3); else frame = ruleValue(extraRule, r, c, 3); }
      return sides ? { tpl: 'poly', rec: { sides: v, fill } } : { tpl: 'dots', rec: { n: v, frame } };
    };
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(mkFig(byRow ? rows[r][c] : rows[c][r], r, c));
    const answer = cells[8];
    ({ fill = fill, frame = frame } = answer.rec);
    const v = sides ? answer.rec.sides : answer.rec.n;
    const mut = [v - 1, v + 1, v - 2, v + 2, rows[2][0], rows[2][1]].map(mkFig);
    if (sides) mut.push(...FILLS.filter(f => f !== fill).map(f => ({ tpl: 'poly', rec: { sides: v, fill: f } })), ...FILLS.map(f => ({ tpl: 'poly', rec: { sides: v + 1, fill: f } })));
    else mut.push(...['', 'circle', 'square'].filter(f => f !== frame).map(f => ({ tpl: 'dots', rec: { n: v, frame: f } })), ...['', 'circle', 'square'].map(f => ({ tpl: 'dots', rec: { n: v - 1, frame: f } })));
    const built = buildOptions(answer, mut, R);
    if (!built) return null;
    const unit = sides ? 'sides' : 'dots';
    const line = byRow ? 'row' : 'column';
    const text = {
      plus: `In each ${line}, the last figure has as many ${unit} as the first two together.`,
      minus: `In each ${line}, the last figure has the ${unit} of the first minus those of the second.`,
      times: `In each ${line}, the last figure has the first number of ${unit} times the second.`,
      diff: `In each ${line}, the last figure has the difference between the first two.`,
      total: `Every ${line} has ${total} ${unit} in total.`,
    }[opName];
    const rules = [text];
    if (extraRule) rules.push(sides ? ruleText('fill', extraRule, 3) : `The frame (${extraRule.vals.map(v => v || 'none').join(', ')}): one of each per row and column, constant along each ${extraRule.kind === 'latinA' ? '↙' : '↘'} diagonal.`);
    const cost = { plus: 3, minus: 3.5, total: 4, times: 4.5, diff: 4.5 }[opName] + (sides ? 2 : 0) + (byRow ? 0 : 0.5) + (extraRule ? 2.5 : 0);
    return { kind: 'grid', rows: 3, cols: 3, cells: cells.map((f, i) => (i === 8 ? null : f)), ...built, rules, cost, family: 'count', signature: `count:${sides ? 'sides' : 'dots'}:${opName}:${!!extraRule}` };
  }

  // ============================================================
  //  SERIES (incl. interleaved odd/even positions)
  // ============================================================
  const SERIES_TPL = ['solo', 'count', 'nested', 'orbit', 'pair'];
  function changesFor(tplName, howMany, level, R) {
    const attrs = TPL[tplName].attrs;
    const options = [];
    for (const [a, dom] of Object.entries(attrs)) {
      if (a === 'rot' && tplName !== 'solo' && tplName !== 'nested') continue;
      if (Array.isArray(dom)) options.push({ attr: a, kind: 'cycle', vals: R.shuffle(dom).slice(0, R.pick(level >= 5 ? [2, 3, 3] : [2, 3])) });
      else if (a === 'rot') options.push({ attr: a, kind: 'step', step: R.pick(level >= 5 ? [45, -45, 135, 90] : [90, -90]), mod: 360 });
      else if (a === 'pos') options.push({ attr: a, kind: 'step', step: R.pick(level >= 5 ? [1, -1, 2, 3] : [1, -1]), mod: 8 });
      else if (a === 'size') options.push({ attr: a, kind: 'cycle', vals: R.chance(0.5) ? [0, 1, 2] : [2, 1, 0] });
      else options.push({ attr: a, kind: 'step', step: 1 });
    }
    return R.shuffle(options).slice(0, howMany);
  }
  function changeCost(ch) {
    if (ch.kind === 'cycle') return ch.vals.length === 3 ? 1.5 : 1;
    if (ch.attr === 'rot') return ch.step % 90 ? 2.5 : 1.5;
    if (ch.attr === 'pos') return Math.abs(ch.step) >= 2 || ch.step < 0 ? 2.5 : 2;
    return 1;
  }
  function changeText(ch) {
    const nm = NAME[ch.attr];
    if (ch.kind === 'cycle') return `${nm} repeats ${ch.vals.map(v => word(ch.attr, v)).join(' → ')} → …`;
    if (ch.attr === 'rot') return `${nm}: turns ${Math.abs(ch.step)}° ${ch.step > 0 ? 'clockwise' : 'anticlockwise'} each step.`;
    if (ch.attr === 'pos') return `${nm} moves ${Math.abs(ch.step)} place${Math.abs(ch.step) > 1 ? 's' : ''} ${ch.step > 0 ? 'clockwise' : 'anticlockwise'} each step.`;
    return `${nm} goes up by ${ch.step} each step.`;
  }
  function apply(startRec, changes, k) {
    const rec = { ...startRec };
    for (const ch of changes) {
      if (ch.kind === 'cycle') rec[ch.attr] = ch.vals[k % ch.vals.length];
      else rec[ch.attr] = ch.mod ? mod(startRec[ch.attr] + ch.step * k, ch.mod) : startRec[ch.attr] + ch.step * k;
    }
    return rec;
  }
  function startRec(tplName, R) {
    const rec = {};
    for (const [a, dom] of Object.entries(TPL[tplName].attrs)) {
      if (Array.isArray(dom)) rec[a] = R.pick(dom);
      else rec[a] = a === 'size' ? 2 : a === 'count' ? 1 : a === 'pos' ? R.ri(0, 7) : a === 'rot' ? R.pick([0, 90, 180, 270]) : 0;
    }
    return rec;
  }

  function series(level, R) {
    const interleaved = level >= 5 && R.chance(0.45);
    const tplName = R.pick(SERIES_TPL);
    const howMany = level <= 2 ? 1 : level <= 4 ? R.ri(1, 2) : level <= 7 ? R.ri(2, 3) : R.ri(3, 4);
    const chA = changesFor(tplName, howMany, level, R);
    if (!chA.length) return null;
    const s0 = startRec(tplName, R);
    if (chA.some(c => c.attr === 'rot')) { if (chA.some(c => c.attr === (tplName === 'nested' ? 'inner' : 'shape'))) return null; s0[tplName === 'nested' ? 'inner' : 'shape'] = R.pick(ROT_SHAPES); }
    const shown = interleaved ? 8 : R.pick(level <= 3 ? [5, 6] : [6, 7, 8]);
    let figs, chB = null, decoy = null;
    if (!interleaved) {
      figs = Array.from({ length: shown + 1 }, (_, k) => ({ tpl: tplName, rec: apply(s0, chA, k) }));
    } else {
      // Odd positions (1st, 3rd, …) follow A; even positions follow a similar-looking but different rule B
      chB = chA.map(c => (c.kind === 'step' ? { ...c, step: c.mod ? (c.step === 90 ? -90 : c.step * -1 || 1) : c.step + 1 } : { ...c, vals: [...c.vals].reverse() }));
      const sB = { ...s0 };
      figs = Array.from({ length: shown + 1 }, (_, i) => ({ tpl: tplName, rec: i % 2 === 0 ? apply(s0, chA, i / 2) : apply(sB, chB, (i - 1) / 2) }));
      decoy = { tpl: tplName, rec: apply(sB, chB, 4) };
    }
    if (figs.some(f => !valid(f))) return null;
    if (new Set(figs.map(keyOf)).size < Math.min(figs.length, 4)) return null;
    const answer = figs[shown];
    const extra = [figs[shown - 1], figs[shown - 2]].filter(Boolean);
    if (decoy) extra.push(decoy);
    if (!interleaved) extra.push({ tpl: tplName, rec: apply(s0, chA, shown + 1) });
    const changeable = Object.keys(TPL[tplName].attrs).filter(a => a !== 'rot' || chA.some(c => c.attr === 'rot'));
    const built = buildOptions(answer, mutate(answer, R, changeable, extra), R);
    if (!built) return null;
    const rules = interleaved
      ? [`Two series take turns. The 1st, 3rd, 5th, 7th figures: ${chA.map(changeText).join(' ')} The 2nd, 4th, 6th, 8th follow a different rule — they're there to throw you off. The 9th continues the odd ones.`]
      : chA.map(changeText);
    const cost = (interleaved ? 4 : 0.5) + chA.reduce((s, c) => s + changeCost(c), 0) + Math.max(0, chA.length - 1) + (tplName === 'pair' || tplName === 'nested' ? 0.5 : 0);
    return {
      kind: 'series', rows: 3, cols: 3, cells: [...figs.slice(0, shown), null], ...built, rules, cost,
      family: interleaved ? 'interleaved' : 'series', signature: `${interleaved ? 'inter' : 'series'}:${tplName}:${chA.map(c => c.attr + c.kind).sort().join(',')}`,
    };
  }

  // ============================================================
  //  ENTRY
  // ============================================================
  const WEIGHTS = {
    grid: [3, 3, 3, 3, 3, 3, 3, 3, 3],
    series: [2, 2, 2, 2, 2, 2, 2, 2, 2],
    count: [0, 1, 1.5, 1.5, 1.5, 1.5, 1.2, 1, 1],
    overlay: [0, 0, 1, 1.5, 2, 2, 2, 2, 2],
    combine: [0, 0, 0, 0, 1, 1.5, 1.5, 1.5, 1.5],
  };
  const GEN = { grid: attrGrid, series, count: arith, overlay, combine: combineGrid };

  // history: signatures of puzzles already asked this run (most recent last)
  function generate(level, rng = Math.random, history = []) {
    const R = mk(rng);
    const lv = Math.max(1, Math.min(9, level));
    const [lo, hi] = BANDS[lv];
    const recent = history.slice(-6);
    const famOf = sig => sig.split(':')[0].replace('inter', 'series').replace('series', 'series');
    let fallback = null;
    for (let tries = 0; tries < 600; tries++) {
      // Families used recently get less weight; the last one is skipped entirely
      const weights = Object.entries(WEIGHTS).map(([f, w]) => {
        const used = recent.filter(s => famOf(s).startsWith(f === 'count' ? 'count' : f)).length;
        const last = recent.length && famOf(recent[recent.length - 1]).startsWith(f);
        return [f, last ? w[lv - 1] * 0.15 : w[lv - 1] / (1 + used)];
      }).filter(([, w]) => w > 0);
      const total = weights.reduce((s, [, w]) => s + w, 0);
      let x = rng() * total, fam = weights[0][0];
      for (const [f, w] of weights) { x -= w; if (x <= 0) { fam = f; break; } }
      const p = GEN[fam](lv, R);
      if (!p) continue;
      if (recent.includes(p.signature)) continue;
      if (p.cost >= lo && p.cost < hi) return { ...p, level: lv };
      if (!fallback || Math.abs(p.cost - (lo + hi) / 2) < Math.abs(fallback.cost - (lo + hi) / 2)) fallback = p;
    }
    if (fallback) return { ...fallback, level: lv };
    throw new Error(`could not generate level ${lv}`);
  }

  const API = { generate, build, key: keyOf, same, BANDS, features };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.MatrixGen = API;
})(typeof window !== 'undefined' ? window : globalThis);
