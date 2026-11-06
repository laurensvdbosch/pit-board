/* Poker engine + bot tests:  node tools/test-poker.cjs */
const P = require('../poker-engine.js');
const B = require('../poker-bots.js');

let failures = 0;
const check = (name, cond, extra = '') => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };
const cards = s => s.split(' ').map(P.parseCard);
const ev = s => P.evaluate(cards(s));
const desc = s => P.describe(ev(s));

// ---------- hand evaluation ----------
check('royal flush', desc('Ah Kh Qh Jh Th 2c 3d') === 'Royal flush');
check('steel wheel', desc('Ad 2d 3d 4d 5d Kc Kh') === 'Straight flush, Five high');
check('quads + best kicker', desc('9s 9h 9d 9c Ah Kd 2c') === 'Four of a kind, Nines' && ev('9s 9h 9d 9c Ah Kd 2c') > ev('9s 9h 9d 9c Kh Qd 2c'));
check('two trips make a full house', desc('7s 7h 7d 4c 4h 4d 2c') === 'Full house, Sevens full of Fours');
check('flush beats straight', ev('2h 7h 9h Jh Kh Ts Qd') > ev('9c Td Jh Qs Kc 2d 3h'));
check('wheel straight', desc('Ac 2d 3h 4s 5c 9d Kh') === 'Straight, Five high');
check('six-high straight beats wheel', ev('2c 3d 4h 5s 6c') > ev('Ac 2d 3h 4s 5c'));
check('two pair kicker from third pair', ev('Kc Kd 8h 8s 6c 6d Ah') > ev('Kc Kd 8h 8s 6c 6d Qh'));
check('pair kickers count', ev('Jc Jd Ah 9s 7c 3d 2h') > ev('Jc Jd Ah 9s 6c 3d 2h'));
check('board plays: split', ev('Ah Kh Qd Jc Tc 2s 3s') === ev('Ah Kh Qd Jc Tc 4d 5d'));
check('describe sixes', desc('6c 6d Ah 9s 7c 3d 2h') === 'Pair of Sixes');
check('hole description', P.describeHole(cards('Ks Kd')) === 'Pocket Kings' && P.describeHole(cards('Qh As')) === 'Ace-Queen offsuit');
check('chen AA = 20, 72o low', P.chen(cards('Ah Ad')) === 20 && P.chen(cards('7c 2d')) <= 0);

// Category frequencies over random 7-card hands vs known probabilities
const freq = new Array(9).fill(0), N = 200000;
for (let i = 0; i < N; i++) freq[P.categoryOf(P.evaluate(P.shuffledDeck().slice(0, 7)))]++;
const known = [0.1741, 0.4383, 0.2350, 0.0483, 0.0462, 0.0303, 0.0260, 0.00168, 0.00031];
check('7-card category frequencies match theory', known.every((k, i) => Math.abs(freq[i] / N - k) < Math.max(0.006, k * 0.25)),
  JSON.stringify(freq.map(f => (f / N).toFixed(4))));

// Equity sanity
check('AA vs one random hand ≈ 85%', Math.abs(P.equity(cards('Ah Ad'), [], 1, 20000) - 0.852) < 0.015);
check('nut flush draw + ace on the flop is a favourite vs 1', P.equity(cards('Ah 5h'), cards('Kh 9h 2c'), 1, 20000) > 0.5);

// ---------- betting rules ----------
const mk = stacks => stacks.map((s, i) => ({ id: i, name: `P${i}`, stack: s }));
{
  const g = new P.Game({ players: mk([1000, 1000, 1000]), sb: 5, bb: 10, button: -1 });
  g.startHand();
  check('3-handed: button seat 0, SB 1, BB 2, UTG (button) acts first', g.button === 0 && g.sbSeat === 1 && g.bbSeat === 2 && g.toAct === 0);
  g.act({ type: 'call' }); g.act({ type: 'call' });
  check('BB gets the option after limps', g.toAct === 2 && g.legal().canCheck);
  g.act({ type: 'check' });
  check('flop dealt, SB acts first', g.street === 'flop' && g.board.length === 3 && g.toAct === 1);
}
{
  const g = new P.Game({ players: mk([1000, 1000]), sb: 5, bb: 10, button: -1 });
  g.startHand();
  check('heads-up: button posts SB and acts first preflop', g.sbSeat === g.button && g.toAct === g.button);
  g.act({ type: 'call' }); g.act({ type: 'check' });
  check('heads-up: BB acts first after the flop', g.toAct === g.bbSeat);
}
{
  const g = new P.Game({ players: mk([1000, 1000, 1000]), sb: 5, bb: 10, button: -1 });
  g.startHand();
  g.act({ type: 'raise', to: 30 });   // raise by 20
  const L = g.legal();
  check('min re-raise = last raise size (to 50)', L.minTo === 50, JSON.stringify(L));
  g.act({ type: 'raise', to: 25 });   // below min → clamped
  check('too-small raise is clamped up to the minimum', g.currentBet === 50);
}
{
  // Incomplete all-in raise does not reopen raising for a player who already acted
  const g = new P.Game({ players: mk([1000, 1000, 75]), sb: 5, bb: 10, button: -1 });
  g.startHand();                       // seat0 button/UTG, seat1 SB, seat2 BB (75 stack)
  g.act({ type: 'raise', to: 60 });   // seat0 raises to 60 (raise of 50)
  g.act({ type: 'call' });            // seat1 calls 60
  g.act({ type: 'raise', to: 75 });   // seat2 all-in 75: only +15, incomplete
  const L = g.legal();
  check('incomplete all-in: original raiser may only call or fold', g.toAct === 0 && !L.canRaise && L.toCall === 15, JSON.stringify(L));
}
{
  // Side pots: short stack all-in, two bigger stacks keep betting
  const g = new P.Game({ players: mk([100, 500, 500]), sb: 5, bb: 10, button: -1 });
  g.startHand();
  g.act({ type: 'raise', to: 100 });  // seat0 all-in 100
  g.act({ type: 'raise', to: 300 });  // seat1
  g.act({ type: 'call' });            // seat2
  const pots = g.sidePots();
  check('side pots: main 300 (3 eligible), side 400 (2 eligible)',
    pots.length === 2 && pots[0].amount === 300 && pots[0].eligible.length === 3 && pots[1].amount === 400 && pots[1].eligible.length === 2, JSON.stringify(pots));
}
{
  // Uncalled bet comes back: everyone folds to a raise
  const g = new P.Game({ players: mk([1000, 1000, 1000]), sb: 5, bb: 10, button: -1 });
  g.startHand();
  g.act({ type: 'raise', to: 40 }); g.act({ type: 'fold' }); g.act({ type: 'fold' });
  check('uncontested: raiser wins blinds, stacks conserved', g.over && g.players[0].stack === 1015 && g.players.reduce((s, p) => s + p.stack, 0) === 3000);
}

// ---------- long bot-vs-bot simulation ----------
for (const level of ['easy', 'medium', 'hard']) {
  for (const seats of [2, 4, 6]) {
    const players = mk(Array.from({ length: seats }, () => 1000)).map(p => ({ ...p, prof: B.profile(level) }));
    const g = new P.Game({ players, sb: 5, bb: 10, button: -1 });
    let hands = 0, actions = 0, bad = '', total = 1000 * seats;
    while (hands < (level === 'hard' ? 150 : 300)) {
      for (const p of players) if (p.stack === 0) { p.stack = 1000; total += 1000; }   // rebuy busted bots
      if (!g.startHand()) { bad = 'could not start'; break; }
      let guard = 0;
      while (!g.over) {
        const L = g.legal();
        if (L.seat < 0 || !g.canAct(g.players[L.seat])) { bad = `invalid seat to act at hand ${hands}`; break; }
        g.act(B.decide(g, g.players[L.seat].prof));
        actions++;
        if (++guard > 200) { bad = `hand ${hands} never ended`; break; }
      }
      if (bad) break;
      const sum = g.players.reduce((s, p) => s + p.stack, 0);
      if (sum !== total) { bad = `chips not conserved at hand ${hands}: ${sum} vs ${total}`; break; }
      if (g.players.some(p => p.stack < 0)) { bad = 'negative stack'; break; }
      hands++;
    }
    check(`sim ${level} ${seats}-handed: ${hands} hands, ${actions} actions, chips conserved`, !bad, bad);
  }
}

// ---------- scripted lessons play out exactly as written ----------
const { LESSONS, rig } = require('../poker-lessons.js');
for (const L of LESSONS) {
  const players = L.seats.map((name, i) => ({ id: i, name, stack: L.stack }));
  const g = new P.Game({ players, sb: L.sb, bb: L.bb, button: L.button });
  g.startHand();
  rig(g, L, P.parseCard);
  let problem = '';
  L.steps.forEach((st, k) => {
    if (problem) return;
    if (st.bot) {
      if (g.over || g.toAct === 0) { problem = `step ${k}: expected a bot to act (toAct ${g.toAct}, over ${g.over})`; return; }
      const L2 = g.legal();
      if (st.bot.type === 'check' && !L2.canCheck) problem = `step ${k}: bot cannot check`;
      if (st.bot.type === 'call' && L2.canCheck) problem = `step ${k}: bot has nothing to call`;
      if (st.bot.type === 'raise' && (st.bot.to < L2.minTo || st.bot.to > L2.maxTo)) problem = `step ${k}: bot raise ${st.bot.to} outside ${L2.minTo}-${L2.maxTo}`;
      g.act(st.bot);
    } else if (st.you) {
      if (g.over || g.toAct !== 0) { problem = `step ${k}: expected you to act (toAct ${g.toAct})`; return; }
      const L2 = g.legal(), t = st.you[0];
      if (t === 'check' && !L2.canCheck) problem = `step ${k}: you cannot check`;
      if (t === 'call' && L2.canCheck) problem = `step ${k}: nothing to call`;
      if (t === 'raise' && (st.to < L2.minTo || st.to > L2.maxTo)) problem = `step ${k}: raise ${st.to} outside ${L2.minTo}-${L2.maxTo}`;
      g.act({ type: t, to: st.to });
    } else if (st.end && !g.over) problem = `step ${k}: hand not over at the end`;
  });
  if (!problem && !g.result.pots[0].winners.includes(L.winner)) problem = `expected seat ${L.winner} to win, got ${g.result.pots[0].winners}`;
  if (!problem && g.board.map(P.cardStr).join(' ') !== L.board.slice(0, g.board.length).join(' ')) problem = `board ${g.board.map(P.cardStr)} vs ${L.board}`;
  check(`lesson ${L.id} "${L.title}" plays out as scripted`, !problem, problem);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
