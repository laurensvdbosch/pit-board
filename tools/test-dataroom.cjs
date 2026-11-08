// Checks the Data Room generator: node tools/test-dataroom.cjs
'use strict';
const DataGen = require('../dataroom.js');

let fail = 0;
const bad = (msg, q) => { if (fail++ < 25) console.log('FAIL', msg, q ? JSON.stringify({ t: q.text, o: q.options, a: q.answerIndex }) : ''); };
const val = s => Number(s.replace(/[^0-9.]/g, '')) * (s.startsWith('−') ? -1 : 1);

for (const level of ['standard', 'hard']) {
  const pos = [0, 0, 0, 0, 0];
  const lengths = [];
  const templates = new Set();
  for (let r = 0; r < 800; r++) {
    const run = DataGen.run(level);
    if (run.length !== 20) bad(`run has ${run.length} questions`);
    const kinds = new Set(run.map(q => q.exhibit.kind));
    if (kinds.size !== 6) bad(`run has ${kinds.size} exhibit kinds`);
    for (const q of run) {
      templates.add(q.text.replace(/[0-9,.$%]+/g, '#').replace(/\b[A-Z]{3,4}\b/g, 'X').slice(0, 30));
      lengths.push(q.text.length);
      const blob = q.text + q.how + q.options.join() + q.exhibit.title + q.exhibit.html;
      if (/NaN|undefined|Infinity/.test(blob)) bad('bad text', q);
      if (q.options.length < 4 || q.options.length > 5) bad(`${q.options.length} options`, q);
      if (new Set(q.options).size !== q.options.length) bad('duplicate options', q);
      if (!(q.answerIndex >= 0 && q.answerIndex < q.options.length)) bad('answer missing', q);
      if (q.options.length === 5 && /\d/.test(q.options[0])) {
        pos[q.answerIndex]++;
        const nums = q.options.map(val);
        if (nums.some((v, i) => i && v <= nums[i - 1])) bad('options not ascending', q);
      }
    }
  }
  const sum = pos.reduce((a, b) => a + b, 0);
  const share = pos.map(p => Math.round(100 * p / sum));
  lengths.sort((a, b) => a - b);
  console.log(`${level}: 800 runs · answer position % ${share.join(' / ')} · question length median ${lengths[lengths.length >> 1]}, max ${lengths[lengths.length - 1]} · ~${templates.size} question patterns`);
  if (Math.max(...share) > 32 || Math.min(...share) < 10) bad(`answer position predictable: ${share}`);
}

console.log(fail ? `\n${fail} failures` : '\nall passed');
process.exit(fail ? 1 : 0);
