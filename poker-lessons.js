/* ===========================================================
   PIT BOARD — beginner poker lessons (scripted hands)
   ---------------------------------------------------------
   Each lesson rigs the cards and scripts the bots, so the moment
   being taught always happens. Steps run in order:
     { coach }              coach message, tap Next
     { bot: action, coach } the bot whose turn it is does this
     { you: [types], to, coach, wrong }
                            wait for you; only those buttons work
                            (to = amount for a bet/raise)
     { end: true, coach }   hand is over, lesson complete
   tools/test-poker.cjs plays every lesson through the engine to
   check each step matches whose turn it is and who wins.
   =========================================================== */

(function (root) {
  'use strict';

  const LESSONS = [
    {
      id: 'l1', title: 'Your first hand', blurb: 'Cards, the pot and the showdown',
      seats: ['You', 'Dusty'], button: 1, sb: 5, bb: 10, stack: 1000,
      holes: [['Qh', 'Qd'], ['Ac', 'Jc']], board: ['Qs', '7c', '2d', 'Jd', '7h'],
      winner: 0,
      steps: [
        { coach: 'Welcome to the table! You\'re the ★ at the bottom; your opponent is Dusty. Each hand, you play for the chips in the middle — the <b>pot</b>. You win it by having the best hand at the end, or by making everyone else give up.' },
        { coach: 'The two big cards below the table are your <b>hole cards</b>. Only you can see them. You have two queens — "pocket queens", one of the best possible starts.' },
        { coach: 'Before any cards are dealt, two players put in forced bets called <b>blinds</b>: you posted the small blind (5) and Dusty the big blind (10). That\'s the pot so far. Lesson 2 explains blinds properly.' },
        { you: ['call'], coach: 'To stay in, you must match Dusty\'s 10. You already put in 5, so calling costs 5 more. Tap <b>Call</b>.', wrong: 'For this lesson, tap Call.' },
        { bot: { type: 'check' }, coach: 'Dusty <b>checks</b> — he passes without betting more.' },
        { coach: 'Three cards appeared in the middle: the <b>flop</b>. These are <b>community cards</b> — everyone combines them with their own two. Your best five cards are now Q Q Q 7 2: <b>three of a kind</b>!' },
        { bot: { type: 'check' }, coach: 'After the flop, Dusty acts first. He checks.' },
        { you: ['check'], coach: 'You can check too. (Lesson 4 shows why betting a strong hand is usually better.) Tap <b>Check</b>.', wrong: 'For now, tap Check.' },
        { coach: 'The fourth community card is the <b>turn</b>. You still have three queens.' },
        { bot: { type: 'check' }, coach: 'Dusty checks.' },
        { you: ['check'], coach: 'Check again.', wrong: 'Tap Check.' },
        { coach: 'The fifth and last card is the <b>river</b>. Your best five are now Q Q Q 7 7 — a <b>full house</b> (three of one rank plus a pair).' },
        { bot: { type: 'check' }, coach: 'Dusty checks.' },
        { you: ['check'], coach: 'Check, and the cards are turned over: the <b>showdown</b>.', wrong: 'Tap Check.' },
        { end: true, coach: 'Dusty had A♣ J♣: <b>two pair</b> (jacks and sevens). Your full house beats two pair, so the pot is yours. From best to worst: Royal flush, Straight flush, Four of a kind, Full house, Flush, Straight, Three of a kind, Two pair, Pair, High card. It\'s all in <b>Poker basics</b> any time.' },
      ],
    },
    {
      id: 'l2', title: 'Blinds & positions', blurb: 'Who pays, who acts first, why the button is best',
      seats: ['You', 'Marge', 'Slim', 'Rosa'], button: 1, sb: 5, bb: 10, stack: 1000,
      holes: [['Kd', 'Td'], ['9c', '4s'], ['As', '6s'], ['8h', '3h']], board: ['Ts', '6h', '2c', '4d', 'Kc'],
      winner: 0,
      steps: [
        { coach: 'Lesson 2: who acts when. The white <b>D</b> is the dealer button — Slim has it this hand. It moves one seat clockwise every hand.' },
        { coach: 'The two players to the left of the button post the <b>blinds</b>: Rosa the small blind (5), you the big blind (10). Blinds make sure there is always something to win.' },
        { coach: 'Before the flop, the action starts with the player left of the big blind and goes clockwise. Watch.' },
        { bot: { type: 'fold' }, coach: 'Marge <b>folds</b>: she gives up her cards and is out of this hand.' },
        { bot: { type: 'call' }, coach: 'Slim <b>calls</b> 10.' },
        { bot: { type: 'call' }, coach: 'Rosa adds 5 more to call the full 10.' },
        { you: ['check'], coach: 'Your 10 is already in, so as the big blind you can just <b>Check</b>.', wrong: 'Everyone only called — tap Check.' },
        { coach: 'Flop: T♠ 6♥ 2♣. You paired your ten — <b>top pair</b>. From now on, the action starts left of the button: Rosa, then you, then Slim. The button acts last on every street, which is the best <b>position</b>: you see what everyone did first.' },
        { bot: { type: 'check' }, coach: 'Rosa checks.' },
        { you: ['check'], coach: 'Check and see what the others do.', wrong: 'Tap Check for now.' },
        { bot: { type: 'raise', to: 20 }, coach: 'Slim <b>bets</b> 20.' },
        { bot: { type: 'fold' }, coach: 'Rosa folds.' },
        { you: ['call'], coach: 'Top pair is a good hand here. <b>Call</b> the 20.', wrong: 'Call the 20 — top pair is worth it.' },
        { coach: 'The turn: 4♦. Rosa folded, so you act first now.' },
        { you: ['check'], coach: 'Check.', wrong: 'Tap Check.' },
        { bot: { type: 'check' }, coach: 'Slim checks behind.' },
        { coach: 'The river K♣ gives you <b>two pair</b>, kings and tens!' },
        { you: ['raise'], to: 40, coach: 'Make a bet: tap <b>Bet</b> to bet 40.', wrong: 'Tap Bet — you have two pair.' },
        { bot: { type: 'fold' }, coach: 'Slim folds.' },
        { end: true, coach: 'You win the pot without a showdown — most pots are won this way, by the last player to bet. Recap: blinds → preflop → flop → turn → river, each round clockwise, and the button acts last after the flop.' },
      ],
    },
    {
      id: 'l3', title: 'Which hands to play', blurb: 'Folding is a skill',
      seats: ['You', 'Big Earl', 'Ivy', 'Duke', 'Nina', 'Tex'], button: 2, sb: 5, bb: 10, stack: 1000,
      holes: [['9c', '3d'], ['7s', '2h'], ['Ah', 'Qh'], ['Jc', '5d'], ['8d', '4c'], ['Kh', '6c']], board: ['Ks', '9h', '4s', '2d', 'Th'],
      winner: 2,
      steps: [
        { coach: 'Lesson 3: which hands to play. You get two cards every hand, but most of them aren\'t worth playing. Good players fold most hands before the flop.' },
        { coach: 'You have 9♣ 3♦: two unconnected, different-suit cards with no high card — one of the weakest starts there is.' },
        { coach: 'Worth playing: <b>pairs</b> (higher is better), <b>two high cards</b> like A-K, A-Q, K-Q, and <b>suited connectors</b> like 8♥ 9♥. You\'re first to act with five players behind you, so be extra picky.' },
        { you: ['fold'], coach: 'Tap <b>Fold</b>. It costs you nothing — you haven\'t put in a chip.', wrong: 'This hand is a fold — tap Fold.' },
        { bot: { type: 'fold' }, coach: 'The hand goes on without you. Big Earl folds.' },
        { bot: { type: 'raise', to: 30 }, coach: 'Ivy raises to 30 with a strong hand.' },
        { bot: { type: 'fold' }, coach: 'Duke folds.' },
        { bot: { type: 'fold' }, coach: 'Nina folds her small blind.' },
        { bot: { type: 'call' }, coach: 'Tex calls from the big blind.' },
        { bot: { type: 'check' }, coach: 'Flop K♠ 9♥ 4♠. Tex checks.' },
        { bot: { type: 'raise', to: 40 }, coach: 'Ivy bets 40.' },
        { bot: { type: 'fold' }, coach: 'Tex folds.' },
        { end: true, coach: 'Folding the 9-3 cost you nothing. Expect to play only about 1 hand in 6 from early seats, and more from the button. There\'s a starting-hand guide in <b>Poker basics</b>, and the Best action puzzle trains it.' },
      ],
    },
    {
      id: 'l4', title: 'Betting for value', blurb: 'Make worse hands pay you',
      seats: ['You', 'Big Earl'], button: 1, sb: 5, bb: 10, stack: 1000,
      holes: [['Ah', 'Kc'], ['Ks', 'Js']], board: ['Kd', '8s', '3h', '2c', '5d'],
      winner: 0,
      steps: [
        { coach: 'Lesson 4: betting for value. With a strong hand you want to <b>bet</b>, so that weaker hands put chips in the pot.' },
        { coach: 'You have A♥ K♣ — "big slick", a premium hand. Instead of just calling, <b>raise</b> to build the pot.' },
        { you: ['raise'], to: 30, coach: 'Tap <b>Raise</b> to raise to 30 — three big blinds is a standard size.', wrong: 'With A-K, raise. Tap Raise.' },
        { bot: { type: 'call' }, coach: 'Big Earl calls.' },
        { coach: 'Flop K♦ 8♠ 3♥: you made <b>top pair</b> with the best possible <b>kicker</b> (your ace). You\'re very likely ahead.' },
        { bot: { type: 'check' }, coach: 'Earl checks.' },
        { you: ['raise'], to: 40, coach: 'Bet about two-thirds of the pot: <b>Bet 40</b>. Worse kings, eights and draws will call.', wrong: 'You\'re ahead — tap Bet.' },
        { bot: { type: 'call' }, coach: 'Earl calls.' },
        { coach: 'Turn 2♣ — a "blank" that changes nothing.' },
        { bot: { type: 'check' }, coach: 'Earl checks again.' },
        { you: ['raise'], to: 100, coach: 'Keep betting: <b>Bet 100</b>. Checking would let worse hands see a free card and win you less.', wrong: 'Keep value betting — tap Bet.' },
        { bot: { type: 'call' }, coach: 'Earl calls.' },
        { coach: 'River 5♦. Still a blank.' },
        { bot: { type: 'check' }, coach: 'Earl checks.' },
        { you: ['raise'], to: 200, coach: 'One more value bet: <b>Bet 200</b>.', wrong: 'Tap Bet one more time.' },
        { bot: { type: 'call' }, coach: 'Earl calls — showdown.' },
        { end: true, coach: 'Earl had K♠ J♠: also top pair, but your ace kicker beats his jack. He paid you on every street. That\'s <b>value betting</b>: when you\'re probably ahead, bet so that worse hands can call.' },
      ],
    },
    {
      id: 'l5', title: 'Pot odds with a draw', blurb: 'When calling a bet is worth it',
      seats: ['You', 'Lucky Lou'], button: 1, sb: 5, bb: 10, stack: 1000,
      holes: [['9h', '8h'], ['Qc', 'Qs']], board: ['7h', 'Tc', '2h', '6c', 'Qd'],
      winner: 0,
      steps: [
        { coach: 'Lesson 5: <b>pot odds</b> — when calling a bet with an unfinished hand is worth it.' },
        { you: ['call'], coach: 'You have 9♥ 8♥ — suited and connected, so it can make straights and flushes. <b>Call</b> 10 to see the flop.', wrong: 'Tap Call.' },
        { bot: { type: 'raise', to: 30 }, coach: 'Lucky Lou raises to 30.' },
        { you: ['call'], coach: 'Calling 20 more is cheap. Tap <b>Call</b>.', wrong: 'Tap Call — it\'s cheap.' },
        { coach: 'Flop 7♥ T♣ 2♥. No pair yet, but two <b>draws</b>: any heart gives you a flush, and any 6 or jack gives you a straight (6-7-8-9-10 or 7-8-9-10-J).' },
        { bot: { type: 'raise', to: 40 }, coach: 'Lou bets 40 into the pot of 60.' },
        { coach: 'Count your <b>outs</b> — cards that complete your hand: 9 hearts left, plus the three other 6s and three other jacks = <b>15 outs</b>. Rule of thumb: outs × 4 on the flop ≈ <b>60%</b> to hit by the river (outs × 2 for one card ≈ 30%).' },
        { coach: 'Now the price: you call 40 to win 100 (the 60 already in plus Lou\'s 40). 40 ÷ 140 ≈ <b>29%</b> — the line above the buttons shows it. Against Lou\'s queens you actually win about <b>{EQ}%</b> by the river, far more than 29%, so calling makes money.' },
        { you: ['call'], coach: 'Tap <b>Call</b>.', wrong: 'The price is right — tap Call.' },
        { coach: 'Turn 6♣ — you made the <b>straight</b>: 6 7 8 9 10!' },
        { bot: { type: 'raise', to: 80 }, coach: 'Lou bets 80. He likely has a big pair and doesn\'t know he\'s behind.' },
        { you: ['raise'], to: 240, coach: 'Now you\'re ahead: <b>Raise</b> to 240 for value.', wrong: 'You have the straight — tap Raise.' },
        { bot: { type: 'call' }, coach: 'Lou calls.' },
        { coach: 'River Q♦ gives Lou three queens… but a straight beats three of a kind.' },
        { bot: { type: 'check' }, coach: 'Lou checks.' },
        { you: ['raise'], to: 300, coach: 'Bet 300 for value.', wrong: 'Tap Bet.' },
        { bot: { type: 'call' }, coach: 'Lou calls.' },
        { end: true, coach: 'Your straight beats his three queens. <b>Pot odds</b> in one line: call when your chance to win is bigger than call ÷ (pot after you call). The table shows the price; the <b>Outs & odds</b> puzzle trains the rest.' },
      ],
    },
  ];

  // Give everyone the lesson's hole cards and stack the deck so the board comes out as scripted.
  // Call right after game.startHand(). The deck pops from the end: burn, flop ×3, burn, turn, burn, river.
  function rig(game, lesson, parse) {
    lesson.holes.forEach((h, i) => { game.players[i].hole = h.map(parse); });
    const b = lesson.board.map(parse);
    game.deck = [b[4], -3, b[3], -2, b[2], b[1], b[0], -1];
  }

  const API = { LESSONS, rig };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.PokerLessons = API;
})(typeof window !== 'undefined' ? window : globalThis);
