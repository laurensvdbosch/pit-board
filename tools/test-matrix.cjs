/* Matrix generator checks:  node tools/test-matrix.cjs */
const M = require('../matrix-gen.js');

let failures = 0;
const check = (name, cond, extra = '') => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };

for (let level = 1; level <= 5; level++) {
  const fam = {}, kinds = {};
  let bad = '', ms = 0;
  const N = 3000;
  for (let i = 0; i < N && !bad; i++) {
    const t0 = Date.now();
    let p;
    try { p = M.generate(level); } catch (e) { bad = e.message; break; }
    ms += Date.now() - t0;
    fam[p.family] = (fam[p.family] || 0) + 1;
    kinds[`${p.rows}x${p.cols}`] = (kinds[`${p.rows}x${p.cols}`] || 0) + 1;
    const keys = p.options.map(M.key);
    if (p.options.length !== 8) bad = 'not 8 options';
    else if (new Set(keys).size !== 8) bad = 'duplicate options';
    else if (!(p.answer >= 0 && p.answer < 8)) bad = 'answer index';
    else if (p.cells.filter(c => c === null).length !== 1) bad = 'not exactly one gap';
    else if (p.cells.length !== p.rows * p.cols) bad = 'cell count';
    else if (!p.rules.length) bad = 'no explanation';
    else if (p.options.some(o => o.t === 'shape' && (o.count < 1 || o.count > 9 || (o.shape === 'poly' && (o.sides < 3 || o.sides > 9))))) bad = 'invalid figure';
    else if (p.options.some(o => o.t === 'dots' && (o.n < 1 || o.n > 9))) bad = 'invalid dots';
    else if (p.options.some(o => o.t === 'lines' && !o.segs)) bad = 'empty lines';
  }
  check(`level ${level}: ${N} puzzles valid (${(ms / N).toFixed(2)} ms each) families ${JSON.stringify(fam)} shapes ${JSON.stringify(kinds)}`, !bad, bad);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
