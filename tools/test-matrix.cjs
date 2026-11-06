/* Matrix generator checks:  node tools/test-matrix.cjs */
const M = require('../matrix-gen.js');

let failures = 0;
const check = (name, cond, extra = '') => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };

const costs = {};
for (let level = 1; level <= 9; level++) {
  const fam = {}, sigs = new Set();
  let bad = '', ms = 0, inBand = 0, typicalGiveaway = 0;
  const N = 1500;
  const history = [];
  for (let i = 0; i < N && !bad; i++) {
    const t0 = Date.now();
    let p;
    try { p = M.generate(level, Math.random, history); } catch (e) { bad = e.message; break; }
    ms += Date.now() - t0;
    history.push(p.signature);
    fam[p.family] = (fam[p.family] || 0) + 1;
    sigs.add(p.signature);
    const [lo, hi] = M.BANDS[level];
    if (p.cost >= lo && p.cost < hi) inBand++;
    const keys = p.options.map(M.key);
    const gaps = p.cells.filter(c => c === null).length;
    if (p.options.length !== 8) bad = 'not 8 options';
    else if (new Set(keys).size !== 8) bad = 'duplicate options';
    else if (!(p.answer >= 0 && p.answer < 8)) bad = 'answer index';
    else if (gaps !== 1) bad = 'not exactly one gap';
    else if (p.kind === 'grid' && p.cells.length !== p.rows * p.cols) bad = 'cell count';
    else if (p.kind === 'series' && p.cells.length > 9) bad = 'series too long';
    else if (!p.rules.length || p.rules.some(r => !r || r.includes('undefined'))) bad = 'bad explanation: ' + JSON.stringify(p.rules);
    else if (p.options.some(o => !M.build(o).length)) bad = 'empty figure';
    // Answer must not be the unique "most typical" option
    const feats = p.options.map(M.features);
    const typ = feats.map(fs => fs.reduce((s, f) => s + feats.filter(g => g.includes(f)).length, 0) / Math.max(1, fs.length));
    if (typ.every((t, i) => i === p.answer || t < typ[p.answer])) typicalGiveaway++;
    costs[level] = (costs[level] || 0) + p.cost;
  }
  check(`level ${level}: ${N} valid · ${(100 * inBand / N).toFixed(0)}% in band · avg cost ${(costs[level] / N).toFixed(1)} · ${sigs.size} kinds · ${(ms / N).toFixed(1)} ms · ${JSON.stringify(fam)}`, !bad && typicalGiveaway === 0, bad || `${typicalGiveaway} typical giveaways`);
}

// A simulated 20-question test run: how varied is one run?
const TEST = [1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 9, 9];
let minFam = 99, minKinds = 99;
for (let run = 0; run < 200; run++) {
  const h = [];
  const ps = TEST.map(l => { const p = M.generate(l, Math.random, h); h.push(p.signature); return p; });
  minFam = Math.min(minFam, new Set(ps.map(p => p.family)).size);
  minKinds = Math.min(minKinds, new Set(ps.map(p => p.signature)).size);
}
check(`every 20-question run uses ≥4 families and ≥18 distinct kinds (worst run: ${minFam} families, ${minKinds} kinds)`, minFam >= 4 && minKinds >= 18);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
