/* ===========================================================
   PIT BOARD — poker section (hub, stakes lobby, table vs bots)
   ---------------------------------------------------------
   Bankroll lives on this device (localStorage 'pitboard-poker').
   You buy in at a stake, chips at the table are "in play" and go
   back to the bankroll when you leave (or the next time the app
   opens, if it was closed mid-session). Higher stakes unlock as
   the bankroll grows; going broke gets a free top-up.
   Uses Poker (poker-engine.js) and PokerBots (poker-bots.js).
   =========================================================== */

'use strict';

const PokerUI = (() => {
  const STAKES = [
    { id: 'rookie', name: 'Rookie Saloon', sb: 5, bb: 10, buyIn: 1000, level: 'easy', unlock: 0, blurb: 'Loose, forgiving bots' },
    { id: 'river', name: 'Riverboat', sb: 25, bb: 50, buyIn: 5000, level: 'medium', unlock: 4000, blurb: 'A mix of styles, fewer mistakes' },
    { id: 'high', name: 'High Rollers', sb: 100, bb: 200, buyIn: 20000, level: 'hard', unlock: 16000, blurb: 'Sharp, aggressive regulars' },
  ];
  const START_BANKROLL = 2000;
  const TOP_UP = 1000;
  const NAMES = ['Dusty', 'Marge', 'Big Earl', 'Lucky Lou', 'Rosa', 'Slim', 'Duke', 'Ivy', 'The Prof', 'Bo', 'Nina', 'Tex', 'Gus', 'Pearl', 'Jojo', 'Hank', 'Vera', 'Moe'];
  const AVATAR_COLORS = ['#3FA7D6', '#A77BF3', '#E3689B', '#D9824B', '#45C4B0', '#8C9BFF', '#C9B458', '#F07F89'];
  const SUIT = ['♣', '♦', '♥', '♠'];
  // Seat positions on the felt (percent), clockwise from you at the bottom
  const LAYOUT = {
    2: ['me', 't'],
    4: ['me', 'l', 't', 'r'],
    6: ['me', 'bl', 'tl', 't', 'tr', 'br'],
  };

  let bank = load();
  let T = null;   // the table session
  let lobby = { stake: 'rookie', seats: 6 };

  const chips = n => Math.round(n).toLocaleString('en-US');
  const stakeOf = id => STAKES.find(s => s.id === id);

  function load() {
    const s = store.get('pitboard-poker', null) || { bankroll: START_BANKROLL, inPlay: 0, unlocked: ['rookie'], hands: 0, handsWon: 0, biggestPot: 0 };
    if (s.inPlay) { s.bankroll += s.inPlay; s.inPlay = 0; }   // app was closed at the table: cash out
    return s;
  }
  const save = () => store.set('pitboard-poker', bank);

  // -------------------- CARDS --------------------
  function card(c, cls = '') {
    if (c === undefined || c === null) return `<span class="pc empty ${cls}"></span>`;
    const s = Poker.suitOf(c);
    return `<span class="pc ${s === 1 || s === 2 ? 'red' : ''} ${cls}"><b>${Poker.RANKS[Poker.rankOf(c)].replace('T', '10')}</b><i>${SUIT[s]}</i></span>`;
  }
  const back = (cls = '') => `<span class="pc back ${cls}"></span>`;

  // -------------------- HUB (inside the home screen) --------------------
  function renderHub() {
    $('pkBankroll').textContent = chips(bank.bankroll);
    $('pkStats').textContent = bank.hands ? `${chips(bank.hands)} hands played · biggest pot ${chips(bank.biggestPot)}` : 'No hands played yet';
  }

  // -------------------- LOBBY --------------------
  function openLobby() {
    renderLobby();
    showScreen('pokerLobby');
  }

  function renderLobby() {
    const total = bank.bankroll + bank.inPlay;
    for (const s of STAKES) if (!bank.unlocked.includes(s.id) && total >= s.unlock) bank.unlocked.push(s.id);
    save();
    $('pkLobbyBank').textContent = chips(bank.bankroll);
    $('pkStakes').innerHTML = STAKES.map(s => {
      const locked = !bank.unlocked.includes(s.id);
      return `
        <button class="book-row pk-stake${lobby.stake === s.id ? ' active' : ''}" data-stake="${s.id}" ${locked ? 'disabled' : ''}>
          <span class="badge" style="--c:${['#4CAF6E', '#E8A33D', '#E06C75'][STAKES.indexOf(s)]}">${s.sb}/${s.bb}</span>
          <span class="book-name"><b>${s.name}</b><small>${locked ? `🔒 Unlocks at a ${chips(s.unlock)} bankroll` : `${s.blurb} · ${s.level} bots`}</small></span>
          <span class="book-best">${chips(s.buyIn)}<small>buy-in</small></span>
        </button>`;
    }).join('');
    document.querySelectorAll('#pkSeats button').forEach(b => {
      const on = Number(b.dataset.value) === lobby.seats;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    const st = stakeOf(lobby.stake);
    const buyIn = Math.min(st.buyIn, bank.bankroll);
    const enough = buyIn >= st.bb * 40;
    $('pkSit').disabled = !enough;
    $('pkSit').textContent = enough ? `Sit down with ${chips(buyIn)}` : `Need ${chips(st.bb * 40)} to sit here`;
    const broke = bank.bankroll < STAKES[0].bb * 40;
    $('pkTopUp').hidden = !broke;
  }

  // -------------------- TABLE --------------------
  function newBot(stake, usedNames) {
    const name = shuffle(NAMES).find(n => !usedNames.includes(n)) || 'Bot';
    const prof = PokerBots.profile(stake.level);
    return {
      id: `bot-${name}-${Date.now()}`, name, human: false, prof,
      stack: Math.round((stake.buyIn * (0.7 + Math.random() * 0.8)) / stake.bb) * stake.bb,
      color: pick(AVATAR_COLORS),
    };
  }

  function sitDown() {
    const stake = stakeOf(lobby.stake);
    const buyIn = Math.min(stake.buyIn, bank.bankroll);
    if (buyIn < stake.bb * 40) return;
    bank.bankroll -= buyIn;
    bank.inPlay = buyIn;
    save();
    const players = [{ id: 'me', name: 'You', human: true, stack: buyIn, color: '#E8A33D' }];
    while (players.length < lobby.seats) players.push(newBot(stake, players.map(p => p.name)));
    T = {
      stake, players, layout: LAYOUT[lobby.seats], timer: null, raiseOpen: false, notes: [],
      game: new Poker.Game({ players, sb: stake.sb, bb: stake.bb, button: Math.floor(Math.random() * players.length) - 1 }),
    };
    $('pkTitle').textContent = `${stake.name} · ${stake.sb}/${stake.bb}`;
    showScreen('pokerTable');
    nextHand();
  }

  function nextHand() {
    const g = T.game;
    $('pkResult').hidden = true;
    T.raiseOpen = false;
    T.notes = [];
    // Busted bots leave; someone new sits down
    T.players.forEach((p, i) => {
      if (!p.human && p.stack <= 0) {
        const fresh = newBot(T.stake, T.players.map(x => x.name));
        T.notes.push(`${p.name} busted out — ${fresh.name} sits down.`);
        T.players[i] = Object.assign(p, fresh);
      }
    });
    if (me().stack <= 0) { showBust(); return; }
    g.startHand();
    render();
    loop();
  }

  const me = () => T.players[0];

  function loop() {
    clearTimeout(T.timer);
    const g = T.game;
    if (g.over) { handEnd(); return; }
    if (g.toAct === 0) { render(); return; }   // your turn: wait for a button
    const inHand = me().inHand && !me().folded;
    T.timer = setTimeout(() => {
      if (!T || T.game !== g || g.over) return;
      g.act(PokerBots.decide(g, T.players[g.toAct].prof));
      render();
      loop();
    }, inHand ? 650 + Math.random() * 650 : 260);
    render();
  }

  function humanAct(type, to) {
    const g = T.game;
    if (g.over || g.toAct !== 0) return;
    T.raiseOpen = false;
    g.act({ type, to });
    render();
    loop();
  }

  function handEnd() {
    const g = T.game, r = g.result, mine = me();
    bank.inPlay = mine.stack;
    bank.hands += 1;
    const won = r.pots.filter(p => p.winners.includes(0)).reduce((s, p) => s + Math.floor(p.amount / p.winners.length), 0);
    if (won) {
      bank.handsWon += 1;
      bank.biggestPot = Math.max(bank.biggestPot, r.pots.reduce((s, p) => s + p.amount, 0));
    }
    save();
    render();
    // One line per distinct set of winners (main + side pots won by the same player are added up)
    const groups = [];
    r.pots.forEach((p, k) => {
      const key = p.winners.join();
      const g0 = groups.find(x => x.key === key);
      const label = r.pots.length > 1 ? (k === 0 ? 'main pot' : `side pot ${k}`) : 'pot';
      if (g0) { g0.amount += p.amount; g0.labels.push(label); }
      else groups.push({ key, winners: p.winners, amount: p.amount, hand: p.hand, labels: [label] });
    });
    const lines = groups.map(gr => {
      const names = gr.winners.map(i => (i === 0 ? 'You' : T.players[i].name)).join(' & ');
      const verb = gr.winners.length > 1 ? 'split' : gr.winners.includes(0) ? 'win' : 'wins';
      const what = gr.labels.length > 1 ? `${chips(gr.amount)} (${gr.labels.join(' + ')})` : `the ${gr.labels[0]} of ${chips(gr.amount)}`;
      return `<div class="${gr.winners.includes(0) ? 'win' : ''}"><b>${names}</b> ${verb} ${what}${gr.hand ? ` <small>— ${gr.hand}</small>` : ''}</div>`;
    });
    $('pkResultBody').innerHTML = lines.join('') + T.notes.map(n => `<div class="dim">${n}</div>`).join('');
    $('pkResult').hidden = false;
    $('pkNext').textContent = mine.stack > 0 ? 'Next hand' : 'Continue';
  }

  function showBust() {
    render();
    const st = T.stake;
    const can = Math.min(st.buyIn, bank.bankroll);
    $('pkResultBody').innerHTML = `<div><b>You're out of chips.</b></div><div class="dim">${can >= st.bb * 40 ? `Rebuy ${chips(can)} from your bankroll, or leave the table.` : 'Your bankroll is too low to rebuy here.'}</div>`;
    $('pkResult').hidden = false;
    $('pkNext').textContent = can >= st.bb * 40 ? `Rebuy ${chips(can)}` : 'Leave table';
    T.bust = can >= st.bb * 40 ? can : 0;
  }

  function onNext() {
    if (!T) return;
    if (T.bust !== undefined) {
      const amount = T.bust;
      delete T.bust;
      if (!amount) { leave(); return; }
      bank.bankroll -= amount;
      me().stack = amount;
      bank.inPlay = amount;
      save();
    }
    nextHand();
  }

  function leave() {
    if (!T) return;
    const g = T.game;
    if (!g.over && me().inHand && !me().folded && !confirm('Leave now? Chips you already put in this pot are lost.')) return;
    clearTimeout(T.timer);
    bank.bankroll += me().stack;
    bank.inPlay = 0;
    save();
    T = null;
    openLobby();
  }

  // -------------------- RENDER --------------------
  function render() {
    if (!T) return;
    const g = T.game, mine = me();
    const showAll = g.over && g.result && g.result.showdown;
    $('pkSeatsLayer').innerHTML = T.players.map((p, i) => {
      const pos = T.layout[i];
      const active = !g.over && g.toAct === i;
      const out = !p.inHand;
      let cards = '';
      if (i !== 0 && p.inHand && !p.folded) {
        cards = showAll && g.result.shown.includes(i) ? p.hole.map(c => card(c, 'sm')).join('') : back('sm') + back('sm');
      }
      const winner = g.over && g.result && g.result.pots.some(pt => pt.winners.includes(i));
      return `
        <div class="pk-seat pos-${pos}${active ? ' active' : ''}${p.folded ? ' folded' : ''}${out ? ' out' : ''}${winner ? ' winner' : ''}">
          ${i !== 0 ? `<div class="pk-cards">${cards}</div>` : ''}
          <div class="pk-avatar" style="--c:${p.color}">${i === 0 ? '★' : p.name[0]}</div>
          <div class="pk-name">${p.name}${i !== 0 ? ` <small>${p.prof.label}</small>` : ''}</div>
          <div class="pk-stack">${out && p.stack <= 0 ? 'Busted' : chips(p.stack)}</div>
          ${p.lastAction ? `<div class="pk-act">${p.lastAction}</div>` : ''}
          ${p.bet > 0 ? `<div class="pk-bet">${chips(p.bet)}</div>` : ''}
          ${g.button === i ? '<span class="pk-dealer">D</span>' : ''}
        </div>`;
    }).join('');
    $('pkBoard').innerHTML = [0, 1, 2, 3, 4].map(k => card(g.board[k])).join('');
    $('pkPot').textContent = `Pot ${chips(g.pot())}`;

    // Your cards and what you have
    $('pkHole').innerHTML = mine.inHand ? mine.hole.map(c => card(c, 'lg')).join('') : '';
    let label = '';
    if (mine.inHand && mine.hole.length) {
      label = g.board.length >= 3 ? Poker.describe(Poker.evaluate([...mine.hole, ...g.board])) : Poker.describeHole(mine.hole);
      if (mine.folded) label = `Folded · ${label}`;
    }
    $('pkHand').textContent = label;
    $('pkMyStack').textContent = chips(mine.stack);
    $('pkInPlay').textContent = chips(bank.bankroll);

    // Controls
    const myTurn = !g.over && g.toAct === 0;
    $('pkControls').classList.toggle('waiting', !myTurn);
    if (!myTurn) {
      $('pkOdds').textContent = g.over ? '' : mine.folded ? 'You folded — the hand plays out.' : `Waiting for ${T.players[g.toAct].name}…`;
      $('pkActions').innerHTML = '';
      $('pkRaise').hidden = true;
      return;
    }
    const L = g.legal();
    // Pot-odds helper: what share of the final pot you are paying
    $('pkOdds').innerHTML = L.toCall
      ? `Call <b>${chips(L.toCall)}</b> to win <b>${chips(L.pot)}</b> → you need <b>${Math.round((100 * L.toCall) / (L.pot + L.toCall))}%</b> equity`
      : 'No bet to you — check for free or bet.';
    const betWord = L.currentBet === 0 ? 'Bet' : 'Raise';
    $('pkActions').innerHTML = `
      <button class="btn btn-ghost pk-fold" data-a="fold">Fold</button>
      <button class="btn btn-ghost" data-a="${L.toCall ? 'call' : 'check'}">${L.toCall ? (L.toCall >= mine.stack ? `All-in ${chips(L.toCall)}` : `Call ${chips(L.toCall)}`) : 'Check'}</button>
      ${L.canRaise ? `<button class="btn btn-primary" data-a="open-raise">${betWord}…</button>` : ''}`;
    $('pkRaise').hidden = !T.raiseOpen;
    if (T.raiseOpen) renderRaise(L);
  }

  function raisePresets(L) {
    const g = T.game;
    const potAfterCall = L.pot + L.toCall;
    const at = x => Math.round((g.currentBet + x * potAfterCall) / g.sb) * g.sb;
    return [
      ['Min', L.minTo], ['½ pot', at(0.5)], ['¾ pot', at(0.75)], ['Pot', at(1)], ['All-in', L.maxTo],
    ].map(([lbl, v]) => [lbl, Math.max(L.minTo, Math.min(L.maxTo, v))]);
  }

  function renderRaise(L) {
    const slider = $('pkSlider');
    slider.min = L.minTo;
    slider.max = L.maxTo;
    slider.step = T.game.sb;
    if (!T.raiseTo || T.raiseTo < L.minTo || T.raiseTo > L.maxTo) T.raiseTo = L.minTo;
    slider.value = T.raiseTo;
    $('pkPresets').innerHTML = raisePresets(L).map(([lbl, v]) => `<button class="btn btn-ghost" data-to="${v}">${lbl}</button>`).join('');
    updateRaiseLabel(L);
  }

  function updateRaiseLabel(L) {
    const word = L.currentBet === 0 ? 'Bet' : 'Raise to';
    $('pkRaiseGo').textContent = T.raiseTo >= L.maxTo ? `All-in ${chips(L.maxTo)}` : `${word} ${chips(T.raiseTo)}`;
  }

  // -------------------- INIT --------------------
  $('pokerHubList').addEventListener('click', e => {
    const row = e.target.closest('[data-pk]');
    if (!row) return;
    if (row.dataset.pk === 'play') openLobby();
    else if (row.dataset.pk.startsWith('pk')) PokerPuzzles.openSetup(row.dataset.pk);
  });
  $('pokerPuzzleList').addEventListener('click', e => {
    const row = e.target.closest('[data-pk]');
    if (row) PokerPuzzles.openSetup(row.dataset.pk);
  });
  $('pkStakes').addEventListener('click', e => {
    const row = e.target.closest('[data-stake]');
    if (!row || row.disabled) return;
    lobby.stake = row.dataset.stake;
    renderLobby();
  });
  $('pkSeats').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    lobby.seats = Number(b.dataset.value);
    renderLobby();
  });
  $('pkSit').addEventListener('click', sitDown);
  $('pkTopUp').addEventListener('click', () => {
    bank.bankroll += TOP_UP;
    save();
    renderLobby();
  });
  $('pkLobbyBack').addEventListener('click', () => goHome());
  $('pkLeave').addEventListener('click', leave);
  $('pkNext').addEventListener('click', onNext);
  $('pkActions').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    if (b.dataset.a === 'open-raise') { T.raiseOpen = !T.raiseOpen; render(); return; }
    humanAct(b.dataset.a);
  });
  $('pkPresets').addEventListener('click', e => {
    const b = e.target.closest('button[data-to]');
    if (!b) return;
    T.raiseTo = Number(b.dataset.to);
    $('pkSlider').value = T.raiseTo;
    updateRaiseLabel(T.game.legal());
  });
  $('pkSlider').addEventListener('input', e => {
    T.raiseTo = Number(e.target.value);
    updateRaiseLabel(T.game.legal());
  });
  $('pkRaiseGo').addEventListener('click', () => humanAct('raise', T.raiseTo));
  save();
  if (!$('pokerSection').hidden) renderHub();

  // Puzzles pay into the same bankroll
  function addChips(n) {
    bank.bankroll += n;
    save();
    if (!$('pokerSection').hidden) renderHub();
  }

  return { renderHub, card, addChips };
})();
