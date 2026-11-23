/* ===========================================================
   PIT BOARD — Puzzles (brainteaser) bank
   ---------------------------------------------------------
   Written for Pit Board: questions, hints and solutions are our own
   wording. Puzzles marked bs: N are classics that also appear on
   Brainstellar (brainstellar.com/puzzles/N) and are credited there.

   Item fields
     id  unique slug            t  title
     c   prob | maths | strat | logic
     d   1 easy · 2 medium · 3 hard · 4 expert
     k   insight (the answer is an idea) | working (needs calculation)
     q   question               h  hint          s  solution paragraphs
     a   answer, one of
         { n, show, int?, tol? }  a number, checked automatically
                                  (int: must match exactly; tol: absolute
                                  tolerance; otherwise within 1%)
         { opts, i }              a choice, checked automatically
         { self }                 self-marked after reading the solution
     bs  Brainstellar puzzle number, when the classic appears there
   Every number answer is verified independently by tools/test-puzzles.cjs.
   =========================================================== */

'use strict';

const PUZZLE_BANK = [
  // ===================== PROBABILITY =====================
  {
    id: 'capgun', t: 'Second pull', c: 'prob', d: 1, k: 'working', bs: 1,
    q: "A toy revolver has six chambers in a ring. Two caps are loaded in adjacent chambers, the cylinder is spun, and the trigger is pulled: click, no bang. The trigger is about to be pulled again and you'd like to avoid a bang. Should the cylinder be spun first?",
    a: { opts: ["Don't spin", 'Spin', 'It makes no difference'], i: 0 },
    h: 'Without a spin, the next chamber depends on which empty chamber just fired. How many of the empty chambers are followed by a loaded one?',
    s: [
      'Label the chambers 1–6 with caps in 1 and 2, and let the cylinder advance one chamber per pull (1 → 2 → … → 6 → 1).',
      'The click came from one of the four empty chambers 3, 4, 5 or 6, each equally likely. Only chamber 6 is followed by a loaded chamber, so without a spin the chance of a bang is 1/4.',
      'A fresh spin lands on a random chamber: 2 loaded out of 6, a 1/3 chance of a bang.',
      "1/4 is less than 1/3, so don't spin.",
    ],
  },
  {
    id: 'marbles', t: 'Two jars', c: 'prob', d: 2, k: 'working', bs: 5,
    q: 'You have 30 gold marbles, 30 grey marbles and two jars. Put all 60 marbles into the jars however you like, with neither jar empty. Then a jar is picked at random and a marble is drawn from it at random. What is the highest possible chance of drawing gold?',
    a: { n: 0.5 + 0.5 * 29 / 59, show: '1/2 + 29/118 ≈ 0.746' },
    h: 'A jar holding a single gold marble wins every time it is picked.',
    s: [
      'Put one gold marble alone in the first jar and the other 59 marbles (29 gold, 30 grey) in the second.',
      'P(gold) = ½ × 1 + ½ × 29/59 ≈ 0.5 + 0.246 = 0.746.',
      'Each jar counts for exactly half, whatever it holds. A lone gold marble makes one half a certainty while giving up as little gold as possible from the other jar.',
    ],
  },
  {
    id: 'stopboy', t: 'Stop at a boy', c: 'prob', d: 1, k: 'insight', bs: 6,
    q: 'In a country, every couple keeps having children until they have a boy, then stops. Each birth is a boy or a girl with equal chance, independently. In the long run, what does the population of children look like?',
    a: { opts: ['More girls than boys', 'More boys than girls', 'About equal'], i: 2 },
    h: "A single birth doesn't know about the family's stopping rule.",
    s: [
      "Every birth is a boy or a girl with 50% each, whatever the family plans. A stopping rule decides how many births happen, not how each one turns out.",
      'Counting it out: each family has exactly one boy, and the expected number of girls is ½ + ¼ + ⅛ + … = 1. One of each per family, on average.',
    ],
  },
  {
    id: 'meteor', t: 'Shooting stars', c: 'prob', d: 2, k: 'working', bs: 13,
    q: 'On a clear night, the chance of seeing at least one shooting star in an hour is 84%. Shooting stars arrive at a steady random rate. What is the chance of seeing at least one in half an hour?',
    a: { n: 0.6, show: '0.6 (60%)' },
    h: 'Work with the chance of seeing none. How does "none in an hour" relate to "none in each half-hour"?',
    s: [
      'P(none in an hour) = 0.16. An hour is two independent half-hours, so P(none in half an hour)² = 0.16, which gives 0.4.',
      'So P(at least one in half an hour) = 1 − 0.4 = 0.6.',
      "Halving the 84% to 42% doesn't work: doubling a probability for longer intervals would soon pass 100%.",
    ],
  },
  {
    id: 'monty', t: 'Three doors', c: 'prob', d: 1, k: 'working', bs: 14,
    q: 'A prize is behind one of three doors. You pick door 1. The host, who knows where the prize is, always opens one of the other two doors to show it is empty, then lets you switch. What is your chance of winning if you switch?',
    a: { n: 2 / 3, show: '2/3' },
    h: "What's the chance your first pick was right? Opening an empty door that the host could always open doesn't change it.",
    s: [
      "Your first pick is right with probability 1/3, and the host's move, which he can always make, doesn't change that.",
      'If you were wrong (probability 2/3), the prize is behind the one door the host left closed, so switching wins.',
      'Switching wins 2/3 of the time.',
    ],
  },
  {
    id: 'monty4', t: 'Four doors', c: 'prob', d: 2, k: 'working', bs: 14,
    q: 'Now there are four doors and one prize. You pick a door. The host, who knows where the prize is, opens one of the other doors to show it is empty. You switch to one of the two remaining closed doors at random. What is your chance of winning?',
    a: { n: 3 / 8, show: '3/8' },
    h: 'First find the chance your original door was wrong, then the chance you pick the right one of the remaining two.',
    s: [
      'Your first door is wrong with probability 3/4. Then the prize is behind one of the two other doors still closed.',
      'Switching at random picks it with probability 1/2.',
      '3/4 × 1/2 = 3/8, better than the 1/4 from staying.',
    ],
  },
  {
    id: 'vonneumann', t: 'Fair from unfair', c: 'prob', d: 2, k: 'working', bs: 19,
    q: 'A bent coin lands heads 30% of the time. To get a fair result, you toss it twice: HT means "A", TH means "B", and HH or TT means toss twice again. On average, how many tosses does it take to get one fair result?',
    a: { n: 100 / 21, show: '100/21 ≈ 4.76' },
    h: 'Each pair of tosses succeeds with probability 2 × 0.3 × 0.7.',
    s: [
      "HT and TH each have probability 0.3 × 0.7 = 0.21. They're equally likely, which is why the result is fair.",
      'A pair succeeds with probability 0.42, so the number of pairs needed averages 1/0.42.',
      'Tosses = 2/0.42 = 100/21 ≈ 4.76.',
    ],
  },
  {
    id: 'twobuses', t: 'Two bus routes', c: 'prob', d: 2, k: 'insight', bs: 20,
    q: 'Two bus routes leave the same stop, each exactly every 12 minutes, all day. A commuter arrives at random moments and takes whichever bus comes first. Over a year, 75% of trips are on route A. How many minutes after each route-B bus does the next route-A bus leave?',
    a: { n: 9, int: true, show: '9 minutes' },
    h: 'Both routes run equally often. What decides which bus you catch is the gap you arrive in.',
    s: [
      "In every 12-minute cycle there's one A and one B. You catch A if you arrive after a B but before the next A.",
      'If A leaves x minutes after B, that window lasts x minutes, so P(A) = x/12.',
      'x/12 = 0.75 gives x = 9. The routes run equally often; the offset does all the work.',
    ],
  },
  {
    id: 'boygirl', t: 'At least one boy', c: 'prob', d: 1, k: 'working', bs: 25,
    q: 'A family has two children, and you are told that at least one of them is a boy. What is the probability that both are boys? Each child is a boy or a girl with equal chance.',
    a: { n: 1 / 3, show: '1/3' },
    h: 'List the equally likely families: BB, BG, GB, GG. Which ones fit what you were told?',
    s: [
      'The four equally likely families are BB, BG, GB and GG.',
      '"At least one boy" rules out only GG, leaving three equally likely families, one of which is BB.',
      "So the answer is 1/3, not 1/2: you weren't told which child is the boy.",
    ],
  },
  {
    id: 'liar', t: 'Did it rain?', c: 'prob', d: 2, k: 'working', bs: 28,
    q: 'On any given night it rains with probability 1/5. Your neighbour tells the truth 2/3 of the time and lies 1/3 of the time. This morning she says it rained last night. What is the probability it actually rained?',
    a: { n: 1 / 3, show: '1/3' },
    h: 'Compare "it rained and she\'s telling the truth" with "it was dry and she\'s lying".',
    s: [
      'P(rain and she says rain) = 1/5 × 2/3 = 2/15.',
      'P(dry and she says rain) = 4/5 × 1/3 = 4/15.',
      'P(rain | she says rain) = (2/15) / (2/15 + 4/15) = 1/3. Her word moves the chance from 20% to 33%, but no further, because dry nights are far more common.',
    ],
  },
  {
    id: 'meetup', t: 'Meeting for lunch', c: 'prob', d: 2, k: 'working', bs: 30,
    q: 'Two friends each arrive at a café at a uniformly random time between 12:00 and 13:00, independently. Each stays exactly 20 minutes. What is the probability that they are there at the same time?',
    a: { n: 5 / 9, show: '5/9 ≈ 0.556' },
    h: 'Draw the 60 × 60 square of arrival times. Where are the two arrivals within 20 minutes of each other?',
    s: [
      'Plot the two arrival times as a point in a 60 × 60 square. They overlap when the times differ by at most 20 minutes: a band around the diagonal.',
      'The two corner triangles outside the band have legs of 40, so together they cover 40² = 1600 of the 3600.',
      'P(meet) = 1 − 1600/3600 = 5/9 ≈ 0.556.',
    ],
  },
  {
    id: 'triangle', t: 'Broken into three', c: 'prob', d: 2, k: 'working', bs: 102,
    q: 'A stick is broken at two points chosen uniformly at random along its length. What is the probability that the three pieces can form a triangle?',
    a: { n: 1 / 4, show: '1/4' },
    h: 'Three pieces form a triangle exactly when no piece is longer than half the stick.',
    s: [
      'Call the cut points X and Y on a stick of length 1. The pieces form a triangle exactly when every piece is shorter than ½.',
      'If X < Y the pieces are X, Y − X and 1 − Y. All under ½ means X < ½, Y > ½ and Y − X < ½: a small triangle with corners (0, ½), (½, ½) and (½, 1), area 1/8.',
      'The case Y < X gives another 1/8, so the probability is 1/4.',
    ],
  },
  {
    id: 'chuck', t: 'Three dice bet', c: 'prob', d: 2, k: 'working', bs: 106,
    q: "You bet $1 on a number from 1 to 6, then three dice are rolled. If your number shows on one die you get your $1 back plus $1; on two dice, back plus $2; on all three, back plus $3. If it doesn't show, you lose the $1. What is your expected profit per game, in dollars?",
    a: { n: -17 / 216, tol: 0.002, show: '−17/216 ≈ −$0.079' },
    h: 'The number of matches is binomial: 3 dice, each matching with probability 1/6.',
    s: [
      'P(0 matches) = 125/216, P(1) = 75/216, P(2) = 15/216, P(3) = 1/216.',
      'Expected profit = (−125 + 75 + 2 × 15 + 3 × 1)/216 = −17/216 ≈ −$0.079.',
      "Three dice with a 1/6 chance each looks like an even bet, but matches overlap, so you win less often than it seems.",
    ],
  },
  {
    id: 'weather', t: 'Sunny streaks', c: 'prob', d: 2, k: 'working',
    q: 'In a town, a sunny day is followed by another sunny day 80% of the time, and a rainy day is followed by a sunny day 40% of the time. Over the long run, what fraction of days are sunny?',
    a: { n: 2 / 3, show: '2/3' },
    h: 'In the long run, the days switching from sunny to rainy must balance those switching from rainy to sunny.',
    s: [
      'Let s be the long-run fraction of sunny days. Each day, a share 0.2s of days switch from sunny to rainy and 0.4(1 − s) switch from rainy to sunny.',
      'In balance these are equal: 0.2s = 0.4(1 − s), so 0.6s = 0.4 and s = 2/3.',
    ],
  },
  {
    id: 'ratio', t: 'A random ratio', c: 'prob', d: 3, k: 'working', bs: 112,
    q: 'X and Y are independent and uniform between 0 and 1. What is the probability that X/Y lies between 1 and 3?',
    a: { n: 1 / 3, show: '1/3' },
    h: 'Split it into P(X/Y > 1) minus P(X/Y > 3). Each is a triangle in the unit square.',
    s: [
      'P(X > Y) = 1/2: the triangle below the diagonal.',
      'P(X > 3Y) is the triangle under the line y = x/3, with base 1 and height 1/3: area 1/6.',
      'P(1 < X/Y < 3) = 1/2 − 1/6 = 1/3.',
    ],
  },
  {
    id: 'reroll', t: 'One reroll', c: 'prob', d: 2, k: 'working', bs: 114,
    q: 'You roll a die and are paid its face value in dollars. After seeing the roll you may reroll once, but then you must take the second result. With the best strategy, what is your expected payout?',
    a: { n: 4.25, show: '$4.25' },
    h: 'A reroll is worth 3.5 on average. Which first rolls are worth keeping?',
    s: [
      'A reroll is worth 3.5 on average, so keep a 4, 5 or 6 and reroll a 1, 2 or 3.',
      'E = ½ × (4 + 5 + 6)/3 + ½ × 3.5 = 2.5 + 1.75 = 4.25.',
    ],
  },
  {
    id: 'reroll2', t: 'Two rerolls', c: 'prob', d: 3, k: 'working', bs: 114,
    q: 'Same die game, but now you may reroll up to two times, always keeping the last roll. With the best strategy, what is your expected payout?',
    a: { n: 14 / 3, show: '14/3 ≈ $4.67' },
    h: 'Work backwards. With one reroll left, the game is worth 4.25. Which first rolls beat that?',
    s: [
      'With one reroll left the game is worth 4.25 (keep 4–6, otherwise reroll).',
      'On the first roll, keep only what beats 4.25: a 5 or a 6.',
      'E = (2/6) × 5.5 + (4/6) × 4.25 = 11/6 + 17/6 = 14/3 ≈ 4.67.',
    ],
  },
  {
    id: 'bonusroll', t: 'Sixes roll again', c: 'prob', d: 2, k: 'working', bs: 115,
    q: 'Roll a die and win its face value in coins. A 6 pays 6 coins and you roll again, and again after every further 6. What are your expected total winnings?',
    a: { n: 4.2, show: '4.2 coins' },
    h: 'Call the answer E. A 6 gives you 6 coins plus a fresh game worth E.',
    s: [
      'E = (1 + 2 + 3 + 4 + 5)/6 + (1/6)(6 + E).',
      'E = 15/6 + 1 + E/6, so (5/6)E = 21/6 and E = 4.2.',
    ],
  },
  {
    id: 'hhh', t: 'Three heads in a row', c: 'prob', d: 2, k: 'working', bs: 116,
    q: 'You toss a fair coin until you get three heads in a row. What is the expected number of tosses?',
    a: { n: 14, int: true, show: '14' },
    h: 'Track your current streak of heads: 0, 1 or 2. A tail sends you back to 0.',
    s: [
      'Let E₀, E₁ and E₂ be the expected tosses still needed with a streak of 0, 1 and 2 heads.',
      'E₂ = 1 + ½E₀, E₁ = 1 + ½E₂ + ½E₀ and E₀ = 1 + ½E₁ + ½E₀.',
      'Solving gives E₀ = 14. In general, n heads in a row take 2ⁿ⁺¹ − 2 tosses on average.',
    ],
  },
  {
    id: 'knockout', t: 'Will they meet?', c: 'prob', d: 2, k: 'insight',
    q: '32 equally skilled players enter a knockout tournament with a random draw, and every match is a coin flip. What is the probability that two particular players play each other at some point?',
    a: { n: 1 / 16, show: '1/16' },
    h: 'How many matches are played in total, and how many pairs of players are there?',
    s: [
      'A knockout with 32 players has 31 matches, since each match eliminates one player.',
      'By symmetry, each of the C(32, 2) = 496 pairs is equally likely to be one of those matches.',
      'P = 31/496 = 1/16.',
    ],
  },
  {
    id: 'htcount', t: 'Counting HT', c: 'prob', d: 2, k: 'working', bs: 118,
    q: 'A fair coin is tossed 20 times. What is the expected number of times a head is immediately followed by a tail?',
    a: { n: 4.75, show: '4.75' },
    h: 'Look at the 19 neighbouring pairs of tosses one at a time.',
    s: [
      'There are 19 adjacent pairs of tosses, and each is HT with probability 1/4.',
      'Expectations add even though the pairs overlap: 19 × 1/4 = 4.75.',
    ],
  },
  {
    id: 'shortpiece', t: 'The shorter piece', c: 'prob', d: 1, k: 'working', bs: 119,
    q: 'A 2-metre stick is broken at a uniformly random point. What is the expected length of the shorter piece, in metres?',
    a: { n: 0.5, show: '0.5 m' },
    h: 'What values can the shorter piece take, and are they equally likely?',
    s: [
      'The shorter piece is anything from 0 to 1 metre, all equally likely: the break is equally likely in either half, and uniform within it.',
      'So its expected length is 0.5 m, a quarter of the stick.',
    ],
  },
  {
    id: 'longpiece', t: 'The longest piece', c: 'prob', d: 3, k: 'working', bs: 204,
    q: 'A stick of length 1 is broken at two uniformly random points into three pieces. What is the expected length of the longest piece?',
    a: { n: 11 / 18, show: '11/18 ≈ 0.611' },
    h: 'Start with the shortest piece: P(all three pieces are longer than t) = (1 − 3t)².',
    s: [
      'P(shortest > t) = (1 − 3t)² for t < 1/3, so E[shortest] = ∫(1 − 3t)² dt from 0 to 1/3 = 1/9.',
      'Remove the shortest piece from each of the others and the leftovers behave like a fresh random split. This gives E[middle] = 1/9 + 1/6 = 5/18 and E[longest] = 1/9 + 1/6 + 1/3 = 11/18.',
      'Check: 1/9 + 5/18 + 11/18 = 1. The longest piece averages about 0.611.',
    ],
  },
  {
    id: 'redball', t: 'First to the red ball', c: 'prob', d: 1, k: 'insight', bs: 1002,
    q: 'A bag holds 8 black balls and 1 red ball. Two players take turns drawing one ball at a time without replacement, and whoever draws the red ball wins. What is the probability that the player who goes first wins?',
    a: { n: 5 / 9, show: '5/9' },
    h: 'The red ball is equally likely to be at any position in the drawing order.',
    s: [
      'Drawing without replacement just reveals a random order of the 9 balls, and the red ball is equally likely to be in any position.',
      'The first player draws positions 1, 3, 5, 7 and 9: five of the nine.',
      'P = 5/9. With an even number of balls it would be exactly 1/2.',
    ],
  },
  {
    id: 'polya', t: 'The growing urn', c: 'prob', d: 3, k: 'working', bs: 1003,
    q: 'An urn starts with 1 red and 1 blue ball. Repeatedly draw a ball at random, then put it back together with one extra ball of the same colour. After 10 draws, what is the probability that exactly 5 of them were red?',
    a: { n: 1 / 11, show: '1/11' },
    h: 'Try 1 draw, then 2. How is the number of red draws distributed?',
    s: [
      'Any particular sequence with r reds and b blues has probability r! · b! / (n + 1)!, whatever the order.',
      'So P(exactly r reds in n draws) = C(n, r) · r! (n − r)! / (n + 1)! = 1/(n + 1), the same for every r.',
      'With 10 draws there are 11 equally likely counts, so the answer is 1/11.',
    ],
  },
  {
    id: 'lowbid', t: 'One sealed offer', c: 'prob', d: 3, k: 'insight', bs: 1004,
    q: "A company's owner knows its value; to you it is equally likely to be anything from $0 to $100. In your hands it would be worth 1.4 times that value. You make one offer, and the owner accepts if the offer is at least the value. What offer, in dollars, maximises your expected profit?",
    a: { n: 0, int: true, show: "$0: don't bid" },
    h: 'If your offer is accepted, what does that tell you about the value?',
    s: [
      'If you offer b and it is accepted, the value is uniform between 0 and b, so b/2 on average.',
      'In your hands that is worth 1.4 × b/2 = 0.7b, and you paid b: an expected loss of 0.3b every time you trade.',
      'Every positive offer loses money on average, so the best offer is $0. Being accepted is bad news: the winner\'s curse.',
    ],
  },
  {
    id: 'poisson', t: 'Waiting for a bus', c: 'prob', d: 2, k: 'insight', bs: 1005,
    q: 'Buses arrive completely at random (a Poisson process), on average one every 12 minutes. You turn up at a random moment. How long, on average, will you wait, in minutes?',
    a: { n: 12, show: '12 minutes' },
    h: 'Random arrivals have no memory.',
    s: [
      'The arrivals are memoryless: however long it has been since the last bus, the time to the next one still averages 12 minutes.',
      'So you wait 12 minutes on average, not 6. You tend to land in a long gap, because long gaps cover more of the timeline. The gap you land in averages 24 minutes.',
    ],
  },
  {
    id: 'archer', t: 'Three arrows', c: 'prob', d: 2, k: 'insight', bs: 1006,
    q: 'An archer shoots three arrows, independently and with the same skill. You are told the first arrow landed closer to the centre than the second. What is the probability that the third arrow is closer than the first?',
    a: { n: 1 / 3, show: '1/3' },
    h: 'Only the ranking of the three distances matters, and all 6 rankings are equally likely.',
    s: [
      'All 6 orderings of the three distances are equally likely.',
      '"First beats second" leaves 3 of them. Listing the arrows from closest to furthest: (3, 1, 2), (1, 3, 2) and (1, 2, 3).',
      'The third beats the first in only one of those, so P = 1/3.',
    ],
  },
  {
    id: 'runs', t: 'Colour runs', c: 'prob', d: 3, k: 'working', bs: 201,
    q: 'A standard deck (26 red, 26 black cards) is shuffled. A run is a maximal block of consecutive cards of the same colour. What is the expected number of runs?',
    a: { n: 27, int: true, show: '27' },
    h: 'The number of runs is 1 plus the number of colour changes between neighbouring cards.',
    s: [
      'Runs = 1 + the number of adjacent pairs with different colours.',
      'Each of the 51 adjacent pairs differs with probability 2 × (26/52) × (26/51) = 26/51.',
      'Expected runs = 1 + 51 × 26/51 = 27.',
    ],
  },
  {
    id: 'cubeant', t: 'Ant on a cube', c: 'prob', d: 3, k: 'working', bs: 202,
    q: 'An ant starts at one corner of a cube and walks along the edges. At each corner it picks one of the three edges at random. What is the expected number of edges it walks before reaching the opposite corner?',
    a: { n: 10, int: true, show: '10' },
    h: 'Group the corners by how many edges they are from the target: 3, 2, 1 or 0.',
    s: [
      'Let E₃, E₂ and E₁ be the expected steps from distance 3, 2 and 1.',
      'From 3, every edge leads to distance 2: E₃ = 1 + E₂. From 2, two edges lead to 1 and one back to 3: E₂ = 1 + ⅔E₁ + ⅓E₃. From 1, one edge finishes and two go back to 2: E₁ = 1 + ⅔E₂.',
      'Solving gives E₂ = 9 and E₃ = 10.',
    ],
  },
  {
    id: 'sphere', t: 'Two points on a sphere', c: 'prob', d: 4, k: 'working', bs: 203,
    q: 'Two points are chosen independently and uniformly on the surface of a sphere of radius 1. What is the expected straight-line distance between them, through the sphere?',
    a: { n: 4 / 3, show: '4/3' },
    h: 'Fix one point at the north pole. The height of a uniform random point on a sphere is uniform between −1 and 1.',
    s: [
      'By symmetry, fix the first point at the north pole (0, 0, 1).',
      "Archimedes' result: the height z of a uniform point on the sphere is uniform on [−1, 1].",
      'The distance to the pole is √(x² + y² + (1 − z)²) = √(2 − 2z).',
      'E = ½ ∫ √(2 − 2z) dz over [−1, 1]. With u = 2 − 2z this is ¼ ∫₀⁴ √u du = ¼ × 16/3 = 4/3.',
    ],
  },
  {
    id: 'letters', t: 'Every letter wrong', c: 'prob', d: 3, k: 'working', bs: 205,
    q: 'Five letters are put into five addressed envelopes completely at random, one per envelope. What is the probability that no letter is in its correct envelope?',
    a: { n: 11 / 30, show: '11/30 ≈ 0.367' },
    h: 'Inclusion–exclusion: start from all arrangements, take away those with a given letter right, add back the double counts, and so on.',
    s: [
      'By inclusion–exclusion, P(none right) = 1 − 1/1! + 1/2! − 1/3! + 1/4! − 1/5!.',
      '= 1 − 1 + 0.5 − 0.1667 + 0.0417 − 0.0083 = 44/120 = 11/30 ≈ 0.367.',
      'Already very close to 1/e ≈ 0.368, the limit for many letters.',
    ],
  },
  {
    id: 'allfaces', t: 'Every face', c: 'prob', d: 2, k: 'working', bs: 206,
    q: 'You roll a fair die repeatedly until every face from 1 to 6 has appeared at least once. What is the expected number of rolls?',
    a: { n: 14.7, show: '14.7' },
    h: "Once you've seen k different faces, how long does a new one take on average?",
    s: [
      "Split the wait into stages. Once you've seen k different faces, each roll is new with probability (6 − k)/6, so that stage takes 6/(6 − k) rolls on average.",
      'Total = 6/6 + 6/5 + 6/4 + 6/3 + 6/2 + 6/1 = 6 × (1 + ½ + ⅓ + ¼ + ⅕ + ⅙) = 14.7.',
    ],
  },
  {
    id: 'noodles', t: 'Bowl of noodles', c: 'prob', d: 4, k: 'working', bs: 207,
    q: 'A bowl holds 10 noodles. Repeatedly pick two loose ends at random and tie them together, until there are no loose ends left. What is the expected number of loops?',
    a: { n: 2.133256, show: '1 + 1/3 + 1/5 + … + 1/19 ≈ 2.13' },
    h: "With n noodles there are 2n ends. Take one end: what's the chance that the end it gets tied to closes a loop?",
    s: [
      'With n noodles there are 2n loose ends. Of the 2n − 1 ends a given end can be tied to, exactly one is the other end of its own noodle, so a loop forms with probability 1/(2n − 1).',
      'Either way, n − 1 noodles are left: a loop is set aside, or two noodles become one.',
      'Expected loops = 1/19 + 1/17 + … + 1/3 + 1/1 ≈ 2.13.',
    ],
  },
  {
    id: 'distinct', t: 'Different faces', c: 'prob', d: 3, k: 'working', bs: 208,
    q: 'You roll a fair die six times. What is the expected number of different faces that appear?',
    a: { n: 6 * (1 - Math.pow(5 / 6, 6)), show: '6(1 − (5/6)⁶) ≈ 3.99' },
    h: 'For each face separately, what is the chance it shows up at least once?',
    s: [
      'For each face, P(it appears at least once) = 1 − (5/6)⁶ ≈ 0.665.',
      'Adding over the six faces: 6 × 0.665 ≈ 3.99 different faces on average.',
    ],
  },
  {
    id: 'firstace', t: 'First ace', c: 'prob', d: 3, k: 'working', bs: 209,
    q: 'A shuffled deck of 52 cards is dealt face up one card at a time. On average, at what position does the first ace appear?',
    a: { n: 53 / 5, show: '53/5 = 10.6' },
    h: 'The four aces split the other 48 cards into five groups. How big is each group on average?',
    s: [
      'The 4 aces split the other 48 cards into 5 gaps (before the first ace, between aces, after the last), and by symmetry each gap holds 48/5 = 9.6 cards on average.',
      'The first ace comes right after the first gap: position 9.6 + 1 = 10.6.',
    ],
  },
  {
    id: 'disk', t: 'Dart on a disk', c: 'prob', d: 3, k: 'working',
    q: 'A point is chosen uniformly at random inside a disk of radius 1. What is its expected distance from the centre?',
    a: { n: 2 / 3, show: '2/3' },
    h: 'The chance of landing within distance r of the centre is the ratio of areas, r².',
    s: [
      'P(distance ≤ r) = r², so the distance has density 2r on [0, 1].',
      'E = ∫ r × 2r dr = 2/3. It is more than ½ because there is more area near the edge.',
    ],
  },
  {
    id: 'centre5', t: 'Five points, one centre', c: 'prob', d: 4, k: 'working', bs: 211,
    q: 'Five points are chosen independently and uniformly on a circle. What is the probability that the pentagon they form contains the centre of the circle?',
    a: { n: 11 / 16, show: '11/16' },
    h: 'The polygon misses the centre exactly when all the points fit in some half of the circle.',
    s: [
      'The centre is outside the polygon exactly when all 5 points lie in a semicircle.',
      'For each point, the chance that the other four all lie in the half-circle clockwise from it is (½)⁴ = 1/16. At most one point can have this property, so P(semicircle) = 5/16.',
      'P(contains the centre) = 1 − 5/16 = 11/16.',
    ],
  },
  {
    id: 'sumone', t: 'Past one', c: 'prob', d: 3, k: 'working', bs: 213,
    q: 'Keep adding independent random numbers, each uniform between 0 and 1, until the total goes above 1. What is the expected number of numbers you add?',
    a: { n: Math.E, show: 'e ≈ 2.718' },
    h: 'The chance that the first n numbers add up to less than 1 is 1/n!.',
    s: [
      'You need more than n numbers exactly when the first n add up to less than 1, which has probability 1/n! (the volume of a corner of the n-dimensional cube).',
      'E[N] = P(N > 0) + P(N > 1) + … = 1 + 1 + 1/2! + 1/3! + … = e ≈ 2.718.',
    ],
  },
  {
    id: 'walk32', t: 'Up three or down two', c: 'prob', d: 2, k: 'working', bs: 215,
    q: 'You start at 0 and each second step left or right with equal probability. What is the probability that you reach +3 before you reach −2?',
    a: { n: 2 / 5, show: '2/5' },
    h: 'A fair random walk is a fair game: on average you end where you started.',
    s: [
      'Your position is a fair game, so its expected value when you stop is 0.',
      'If p = P(reach +3 first), then 3p − 2(1 − p) = 0, so p = 2/5.',
    ],
  },
  {
    id: 'candies', t: 'Last of the red', c: 'prob', d: 4, k: 'working', bs: 216,
    q: 'A jar has 4 red, 6 blue and 10 green sweets. You take them out one at a time at random. At the moment you take the last red sweet, what is the probability that at least one blue and at least one green are still in the jar?',
    a: { n: 18 / 35, show: '18/35 ≈ 0.514' },
    h: 'Read the drawing order backwards. Which colour is drawn last overall, and then which of the other two runs out last?',
    s: [
      'Read the order backwards. We need the very last sweet to be blue or green, and then, of the two remaining colours, the last one drawn must not be red.',
      'Last sweet green (10/20), then among red and blue the last is blue (6/10): 0.5 × 0.6 = 0.3.',
      'Last sweet blue (6/20), then among red and green the last is green (10/14): 0.3 × 5/7 ≈ 0.214.',
      'Total = 0.3 + 0.214 = 18/35 ≈ 0.514.',
    ],
  },
  {
    id: 'clans', t: 'Survey of clans', c: 'prob', d: 3, k: 'insight', bs: 1009,
    q: 'To estimate the average size of a clan in a country, 1,000 random people are each asked how big their own clan is, and the answers are averaged. How does this compare with the true average size of a clan?',
    a: { opts: ['Too high', 'Too low', 'About right'], i: 0 },
    h: 'Is every clan equally likely to be asked?',
    s: [
      'A clan of 50 is 50 times more likely to have a member asked than a clan of 1, so big clans are over-represented.',
      "The survey measures clan size from a person's point of view, which is higher than the true average unless every clan is the same size. To fix it, average 1/size and invert the result.",
    ],
  },
  {
    id: 'birthday', t: 'Shared birthday', c: 'prob', d: 1, k: 'working',
    q: 'What is the smallest group in which the chance that two people share a birthday is above 50%? Ignore leap years and assume all 365 birthdays are equally likely.',
    a: { n: 23, int: true, show: '23 people' },
    h: "Find the chance that everyone's birthday is different: (365/365)(364/365)(363/365)… When does it drop below ½?",
    s: [
      'P(all different) = (365/365)(364/365)…((365 − n + 1)/365).',
      'It first drops below 0.5 at n = 23 (about 0.493).',
      'It happens so soon because 23 people form C(23, 2) = 253 pairs, each with a 1/365 chance.',
    ],
  },
  {
    id: 'mybirthday', t: 'Your birthday', c: 'prob', d: 2, k: 'working',
    q: 'How many other people do you need to ask before the chance that at least one shares your birthday is above 50%? Assume 365 equally likely days.',
    a: { n: 253, int: true, show: '253 people' },
    h: 'Solve (364/365)ⁿ < ½.',
    s: [
      'P(nobody shares your birthday) = (364/365)ⁿ.',
      'This drops below ½ when n > ln 2 / −ln(364/365) ≈ 252.7, so n = 253.',
      'Far more than 23, because now every match has to involve you.',
    ],
  },
  {
    id: 'testpos', t: 'Positive test', c: 'prob', d: 2, k: 'working',
    q: "A condition affects 1% of people. A test catches 95% of people who have it, but also flags 10% of people who don't. Someone tests positive. What is the probability they have the condition?",
    a: { n: 0.0095 / 0.1085, tol: 0.003, show: '≈ 0.088' },
    h: 'Picture 1,000 people. How many true positives, and how many false positives?',
    s: [
      'In 1,000 people, 10 have the condition and 9.5 of them test positive. Of the 990 without it, 99 test positive.',
      'P = 9.5 / (9.5 + 99) ≈ 0.088, under 9%. When a condition is rare, false positives swamp the true ones.',
    ],
  },
  {
    id: 'boxes', t: 'Three boxes', c: 'prob', d: 2, k: 'working',
    q: 'One box holds two gold coins, one holds two silver coins, and one holds one of each. You pick a box at random and draw a coin: it is gold. What is the probability that the other coin in that box is also gold?',
    a: { n: 2 / 3, show: '2/3' },
    h: 'Count gold coins, not boxes.',
    s: [
      'There are three gold coins, each equally likely to be the one you drew.',
      'Two of them are in the gold–gold box, where the other coin is gold.',
      'So the answer is 2/3, not 1/2.',
    ],
  },
  {
    id: 'ants3', t: 'Ants on a triangle', c: 'prob', d: 1, k: 'working',
    q: 'Three ants sit on the corners of a triangle. Each picks one of its two edges at random and walks along it at the same speed. What is the probability that no two ants meet?',
    a: { n: 1 / 4, show: '1/4' },
    h: 'When does nobody collide?',
    s: [
      'They avoid each other only if all three go clockwise or all three go anticlockwise.',
      'Each of those has probability (½)³ = 1/8, so P = 2/8 = 1/4.',
    ],
  },
  {
    id: 'penney', t: 'HH or TH?', c: 'prob', d: 3, k: 'insight',
    q: 'A fair coin is tossed until either HH or TH appears as two consecutive tosses. What is the probability that TH appears first?',
    a: { n: 3 / 4, show: '3/4' },
    h: 'When can HH win at all?',
    s: [
      'Once any tail has been tossed, the first H after it completes TH, before an HH can form.',
      'So HH wins only if the first two tosses are both heads, probability 1/4.',
      'P(TH first) = 3/4, even though both patterns are equally common in the long run.',
    ],
  },
  {
    id: 'prisoners10', t: 'Ten prisoners, ten boxes', c: 'prob', d: 4, k: 'working',
    q: 'Ten prisoners are numbered 1 to 10, and their numbers are placed in ten boxes at random, one per box. Each prisoner, alone, may open 5 boxes looking for their own number. They all go free only if every prisoner finds their number, and they cannot communicate once it starts. With the best strategy agreed beforehand, what is the probability they all go free?',
    a: { n: 1 - (1 / 6 + 1 / 7 + 1 / 8 + 1 / 9 + 1 / 10), show: '1 − (1/6 + … + 1/10) ≈ 0.354' },
    h: 'Prisoner k opens box k first, then the box numbered by what they found, and so on. When does this fail?',
    s: [
      'Strategy: open box k first, then the box whose number you found, and so on. You follow the cycle that contains your own number and find it within 5 boxes if that cycle has length 5 or less.',
      'Everyone succeeds exactly when the random arrangement has no cycle longer than 5.',
      'P(there is a cycle of length L > 5) = 1/L, and at most one such cycle can exist, so P(fail) = 1/6 + 1/7 + 1/8 + 1/9 + 1/10 ≈ 0.646.',
      'P(all free) ≈ 0.354, compared with (½)¹⁰ ≈ 0.001 if everyone opened boxes at random.',
    ],
  },
  {
    id: 'secretary', t: 'Best candidate', c: 'prob', d: 3, k: 'working',
    q: 'You interview a long line of candidates in random order and must accept or reject each on the spot. You reject a fixed share of them, then take the first one better than everyone so far, choosing that share optimally. As the number of candidates grows, what is the probability you pick the very best one?',
    a: { n: 1 / Math.E, show: '1/e ≈ 0.368' },
    h: 'If you skip a fraction t, you win when the best candidate comes after the cutoff and the best one before them was among those you skipped.',
    s: [
      'Skip a fraction t, then take the first candidate who beats everyone so far.',
      'P(win) ≈ −t ln t: the best candidate must come after the cutoff, and the best one seen before them must be in the skipped group.',
      'This is largest at t = 1/e, where P(win) = 1/e ≈ 0.368.',
    ],
  },
  {
    id: 'beforesix', t: 'Before the six', c: 'prob', d: 3, k: 'working',
    q: 'You roll a die until the first 6 appears. What is the expected sum of all the rolls before that 6, not counting the 6 itself?',
    a: { n: 15, int: true, show: '15' },
    h: 'How many rolls come before the 6 on average, and what is each worth?',
    s: [
      'The number of rolls up to and including the first 6 averages 6, so 5 rolls come before it on average.',
      'Each of those rolls is not a six, so it is uniform on 1–5 with mean 3.',
      'Expected sum = 5 × 3 = 15.',
    ],
  },
  {
    id: 'maxdice', t: 'Higher of two dice', c: 'prob', d: 2, k: 'working',
    q: 'Two fair dice are rolled. What is the expected value of the higher of the two?',
    a: { n: 161 / 36, show: '161/36 ≈ 4.47' },
    h: 'P(max ≤ k) = (k/6)².',
    s: [
      'P(max = k) = (k² − (k − 1)²)/36 = (2k − 1)/36.',
      'E = Σ k(2k − 1)/36 = (1 + 6 + 15 + 28 + 45 + 66)/36 = 161/36 ≈ 4.47.',
    ],
  },
  {
    id: 'onesix', t: 'A six in four rolls', c: 'prob', d: 1, k: 'working',
    q: 'You roll a fair die four times. What is the probability of getting at least one 6?',
    a: { n: 1 - Math.pow(5 / 6, 4), show: '1 − (5/6)⁴ ≈ 0.518' },
    h: 'Find the chance of no sixes at all.',
    s: [
      'P(no six) = (5/6)⁴ = 625/1296 ≈ 0.482.',
      'P(at least one) ≈ 1 − 0.482 = 0.518: slightly better than even.',
    ],
  },
  {
    id: 'firstheads', t: 'First to heads', c: 'prob', d: 1, k: 'working',
    q: 'You and a friend take turns tossing a fair coin, you first. The first to toss heads wins. What is your probability of winning?',
    a: { n: 2 / 3, show: '2/3' },
    h: 'If you both miss once, the game is exactly as it was at the start.',
    s: [
      'Let p be your chance. You win straight away with probability ½. Otherwise your friend is in the position you started in, and wins with probability p.',
      'p = ½ + ½(1 − p), so p = 2/3.',
    ],
  },
  {
    id: 'increasing', t: 'Climbing dice', c: 'prob', d: 2, k: 'working',
    q: 'Three fair dice are rolled one after another. What is the probability that the results are strictly increasing?',
    a: { n: 20 / 216, show: '20/216 = 5/54 ≈ 0.093' },
    h: 'A set of three different numbers can be put in increasing order in exactly one way.',
    s: [
      'Choose 3 different values: C(6, 3) = 20 ways, each with exactly one increasing order.',
      'P = 20/216 = 5/54 ≈ 0.093.',
    ],
  },
  {
    id: 'hatcheck', t: 'Coats at random', c: 'prob', d: 2, k: 'insight',
    q: 'Twenty people leave their coats at a cloakroom, and the coats are handed back completely at random. What is the expected number of people who get their own coat back?',
    a: { n: 1, int: true, show: '1' },
    h: 'Look at each person on their own.',
    s: [
      'Each person gets their own coat with probability 1/20.',
      'Expectations add even when the events depend on each other: 20 × 1/20 = 1, whatever the number of people.',
    ],
  },
  {
    id: 'maxuniform', t: 'Higher of two numbers', c: 'prob', d: 2, k: 'working',
    q: 'Two numbers are drawn independently and uniformly between 0 and 1. What is the expected value of the larger one?',
    a: { n: 2 / 3, show: '2/3' },
    h: 'P(max ≤ x) = x².',
    s: [
      'P(max ≤ x) = x², so the maximum has density 2x.',
      'E = ∫ x × 2x dx = 2/3. In general, the largest of n uniform numbers averages n/(n + 1).',
    ],
  },
  {
    id: 'hitfive', t: 'Walk to five', c: 'prob', d: 3, k: 'working',
    q: 'You start at 0 on a number line and step +1 or −1 with equal probability each second. What is the expected number of steps until you first reach +5 or −5?',
    a: { n: 25, int: true, show: '25' },
    h: 'Try E(x) = 25 − x² and check that it satisfies E(x) = 1 + ½E(x − 1) + ½E(x + 1).',
    s: [
      'Let E(x) be the expected number of steps from x, with E(±5) = 0 and E(x) = 1 + ½E(x − 1) + ½E(x + 1).',
      'E(x) = 25 − x² fits: ½(25 − (x − 1)²) + ½(25 − (x + 1)²) = 25 − x² − 1.',
      'From 0: 25 steps. In general a fair walk takes a × b steps on average to leave the interval from −a to b.',
    ],
  },
  {
    id: 'pairs30', t: 'Birthday pairs', c: 'prob', d: 2, k: 'working',
    q: 'In a room of 30 people, what is the expected number of pairs of people who share a birthday? Assume 365 equally likely days.',
    a: { n: 435 / 365, show: '435/365 ≈ 1.19' },
    h: 'How many pairs are there, and what is the chance that a given pair matches?',
    s: [
      'There are C(30, 2) = 435 pairs, and each matches with probability 1/365.',
      'Expected matching pairs = 435/365 ≈ 1.19.',
    ],
  },
  {
    id: 'diceduel', t: 'Higher die wins', c: 'prob', d: 1, k: 'working',
    q: 'You and an opponent each roll a die. You win only if your number is strictly higher; ties go to your opponent. What is your probability of winning?',
    a: { n: 5 / 12, show: '15/36 = 5/12 ≈ 0.417' },
    h: 'Ties happen 1/6 of the time. Split the rest.',
    s: [
      'P(tie) = 6/36 = 1/6. By symmetry, the remaining 5/6 splits evenly between you and your opponent.',
      'P(win) = (1 − 1/6)/2 = 5/12 ≈ 0.417.',
    ],
  },

  // ===================== MATHS =====================
  {
    id: 'lockers', t: 'Toggling lamps', c: 'maths', d: 1, k: 'insight', bs: 18,
    q: 'There are 200 lamps in a row, all off. On pass 1 you toggle every lamp, on pass 2 every second lamp, on pass 3 every third lamp, and so on up to pass 200. How many lamps are on at the end?',
    a: { n: 14, int: true, show: '14' },
    h: 'Lamp n is toggled once for each divisor of n. Which numbers have an odd number of divisors?',
    s: [
      'Lamp n is toggled once for each divisor of n, so it ends up on if n has an odd number of divisors.',
      'Divisors come in pairs (d, n/d), except when d = n/d, which only happens for perfect squares.',
      'The squares up to 200 are 1, 4, 9, …, 196 = 14²: 14 lamps.',
    ],
  },
  {
    id: 'socks', t: 'Dark drawer', c: 'maths', d: 1, k: 'insight', bs: 11,
    q: 'A drawer holds 8 red, 6 blue and 10 green socks, all mixed up, and the room is dark. How many socks must you take out to be certain of having two red ones?',
    a: { n: 18, int: true, show: '18' },
    h: 'Think of the worst case: what could you draw before your second red sock?',
    s: [
      'In the worst case you draw all 6 blue and all 10 green first, plus one red: 17 socks and still only one red.',
      'The 18th sock must be red, so 18 guarantees two reds. (Any matching pair would need only 4.)',
    ],
  },
  {
    id: 'josephus', t: 'Every second one out', c: 'maths', d: 3, k: 'working', bs: 23,
    q: '100 people stand in a circle, numbered 1 to 100. Going round the circle starting from person 1, every second person is removed (2, 4, 6, …), with the count continuing round the circle until one person is left. What number does the survivor have?',
    a: { n: 73, int: true, show: '73' },
    h: 'With a power of 2 people, person 1 survives. How many removals until the circle is a power of 2?',
    s: [
      'With 2ᵏ people, the person who starts survives: every lap halves the circle and the count starts again from them.',
      '100 = 64 + 36. After 36 removals (people 2, 4, …, 72) there are 64 left, and the count carries on from person 73.',
      'So person 73 survives. In general, with n = 2ᵏ + m people, the survivor is 2m + 1.',
    ],
  },
  {
    id: 'dicesum', t: 'A strange die', c: 'maths', d: 2, k: 'insight', bs: 24,
    q: 'You have one normal die (1–6) and a blank die. You write a whole number on each face of the blank die so that the total of the two dice is equally likely to be any number from 1 to 12. What is the sum of the six numbers you wrote?',
    a: { n: 18, int: true, show: '18 (faces 0, 0, 0, 6, 6, 6)' },
    h: 'The normal die covers a block of six consecutive totals. How can the second die move that block?',
    s: [
      'The normal die gives six consecutive totals with probability 1/6 each. To spread evenly over 1–12, the second die should add 0 half the time (totals 1–6) and 6 half the time (totals 7–12).',
      'So write 0, 0, 0, 6, 6, 6, which add up to 18.',
    ],
  },
  {
    id: 'bread', t: 'Shared loaves', c: 'maths', d: 2, k: 'working', bs: 104,
    q: 'Three hikers share their bread equally. Ana brought 7 loaves, Ben brought 5 and Cal brought none. Cal pays $12 for his share. How many dollars should Ana fairly receive?',
    a: { n: 9, int: true, show: '$9' },
    h: 'Each hiker ate 4 loaves. How many did Ana give to Cal?',
    s: [
      '12 loaves shared three ways: each ate 4.',
      'Ana gave away 7 − 4 = 3 loaves and Ben gave away 5 − 4 = 1. Cal paid $12 for 4 loaves, $3 a loaf.',
      'Ana gets $9 and Ben $3, not $7 and $5.',
    ],
  },
  {
    id: 'languages', t: 'Who speaks what', c: 'maths', d: 4, k: 'working', bs: 107,
    q: "A club has 250 members. For any two members, each speaks a language the other doesn't. What is the smallest number of different languages the club could speak in total?",
    a: { n: 10, int: true, show: '10' },
    h: "No member's set of languages may be contained in another's. How many such sets can n languages give?",
    s: [
      "The condition says no member's set of languages is a subset of another member's.",
      "Sperner's theorem: with n languages, the largest family of sets with no set inside another has C(n, ⌊n/2⌋) members, for example all sets of size n/2.",
      'C(9, 4) = 126 is too few, but C(10, 5) = 252 ≥ 250, so 10 languages.',
    ],
  },
  {
    id: 'friends', t: 'Same number of friends', c: 'maths', d: 2, k: 'insight', bs: 111,
    q: 'At a party of at least two people, some pairs are friends, and friendship goes both ways. Show that two people at the party have the same number of friends there.',
    a: { self: 'Pigeonhole: counts run from 0 to n − 1, but 0 and n − 1 can\'t both occur.' },
    h: 'What friend counts are possible? Can someone have no friends while someone else is friends with everyone?',
    s: [
      'With n people, each person has between 0 and n − 1 friends: n possible counts.',
      'But 0 and n − 1 cannot both occur: if someone is friends with everyone, nobody has 0 friends.',
      'So n people share at most n − 1 different counts, and by the pigeonhole principle two of them have the same count.',
    ],
  },
  {
    id: 'twoasks', t: 'Two questions', c: 'maths', d: 3, k: 'insight', bs: 122,
    q: "I'm thinking of three positive whole numbers x, y and z. Twice, you may choose whole numbers a, b and c and ask me for a·x + b·y + c·z. How can you always work out x, y and z?",
    a: { self: 'Ask for x + y + z = S first, then use the base S + 1.' },
    h: 'After the first question you can know an upper limit for each number.',
    s: [
      'First ask with (1, 1, 1) to get S = x + y + z, so each number is at most S.',
      'Then ask with (1, B, B²) where B = S + 1. The answer x + yB + zB² is the number with digits z, y, x in base B.',
      'Each of x, y and z is less than B, so you can read them off as the digits.',
    ],
  },
  {
    id: 'chessboard', t: 'Missing corners', c: 'maths', d: 1, k: 'insight', bs: 123,
    q: 'Two opposite corner squares are cut from an 8 × 8 chessboard, leaving 62 squares. Can the rest be covered exactly by 31 dominoes, each covering two neighbouring squares?',
    a: { opts: ['Yes', 'No'], i: 1 },
    h: 'What colours does a domino always cover?',
    s: [
      'Each domino covers one black square and one white square.',
      'Opposite corners are the same colour, so 32 squares of one colour remain and 30 of the other.',
      '31 dominoes would need 31 of each, so it cannot be done.',
    ],
  },
  {
    id: 'fruits', t: 'Fruit collisions', c: 'maths', d: 3, k: 'working', bs: 124,
    q: 'A magic hat holds 10 apples, 14 bananas and 19 cherries. Whenever two different fruits collide, both turn into the third kind: an apple and a banana become two cherries, and so on. After a series of collisions only one kind of fruit is left. Which kind can it be?',
    a: { opts: ['Apples', 'Bananas', 'Cherries', 'None of them'], i: 1 },
    h: 'Look at the differences between the counts, modulo 3.',
    s: [
      'Each collision changes the counts by −1, −1 and +2, so every difference between two counts changes by 0 or ±3. The differences modulo 3 never change.',
      'Only bananas needs apples and cherries both at 0, so their difference must be a multiple of 3: 19 − 10 = 9 is. Only apples would need 14 − 19 = −5 to be a multiple of 3, and only cherries 14 − 10 = 4. Neither is.',
      'So only bananas can be left, and a sequence of collisions that gets there does exist.',
    ],
  },
  {
    id: 'antsstick', t: 'Ants on a stick', c: 'maths', d: 2, k: 'insight', bs: 129,
    q: '30 ants are placed anywhere on a 2-metre stick, each facing left or right, and all walk at 1 cm per second. When two ants meet, both turn around. Ants fall off at the ends. Over all possible starting positions, what is the longest time, in seconds, before the last ant falls off?',
    a: { n: 200, int: true, show: '200 seconds' },
    h: 'If you ignore which ant is which, does a bounce look any different from two ants passing through each other?',
    s: [
      'Two ants bouncing off each other looks exactly like two ants passing through each other, if you ignore which ant is which.',
      'So it is as if every ant walks straight off the stick, which takes at most 200 cm ÷ 1 cm/s = 200 seconds.',
      'The worst case is an ant starting at one end, facing the other way: 200 seconds.',
    ],
  },
  {
    id: 'gridcolour', t: 'Two-colour grid', c: 'maths', d: 3, k: 'insight', bs: 126,
    q: 'Every point with whole-number coordinates in the plane is coloured black or white, in any way at all. Is there always a rectangle with sides parallel to the axes whose four corners all have the same colour?',
    a: { opts: ['Yes, always', 'No, it can be avoided', 'Only if one colour is used more'], i: 0 },
    h: 'Look at columns of three points. How many different colour patterns can a column have?',
    s: [
      'Take the rows y = 1, 2 and 3. In each column, two of the three points share a colour. Call that a pair: a choice of 2 rows (3 options) and a colour (2 options), 6 kinds in all.',
      'Among any 7 columns, two have the same kind of pair: the same two rows in the same colour.',
      'Those four points are the corners of a rectangle with all corners the same colour. So yes, always.',
    ],
  },
  {
    id: 'chocolate', t: 'Breaking chocolate', c: 'maths', d: 1, k: 'insight', bs: 128,
    q: 'A chocolate bar is a 5 × 9 grid of squares. Each break takes one piece and splits it along a straight line between squares. What is the smallest number of breaks needed to get all 45 single squares?',
    a: { n: 44, int: true, show: '44' },
    h: 'What does each break do to the number of pieces?',
    s: [
      'Every break increases the number of pieces by exactly one.',
      'You start with 1 piece and need 45, so it takes exactly 44 breaks, in whatever order you break it.',
    ],
  },
  {
    id: 'infection', t: 'Spreading infection', c: 'maths', d: 3, k: 'insight', bs: 130,
    q: 'On a 10 × 10 grid, some squares start infected. Each minute, any healthy square with at least two infected neighbours (sharing an edge) becomes infected. What is the smallest number of starting squares that can eventually infect the whole grid?',
    a: { n: 10, int: true, show: '10' },
    h: 'Track the total perimeter of the infected region. Can it ever grow?',
    s: [
      'A square becomes infected only with at least 2 infected neighbours, so at least 2 of its 4 edges were already on the boundary and at most 2 new ones are added. The total perimeter never increases.',
      'The whole grid has perimeter 40, and each starting square brings at most 4, so at least 10 are needed.',
      'Ten is enough: infect one diagonal, and it spreads to the whole grid.',
    ],
  },
  {
    id: 'minmax', t: 'Minimum and maximum', c: 'maths', d: 3, k: 'working', bs: 1011,
    q: 'You want to find both the largest and the smallest of 100 different numbers, comparing two numbers at a time. What is the smallest number of comparisons that always suffices?',
    a: { n: 148, int: true, show: '148' },
    h: 'Pair the numbers up first.',
    s: [
      'Compare the numbers in 50 pairs: 50 comparisons. The maximum is among the 50 winners and the minimum among the 50 losers.',
      'Finding the largest winner takes 49 more comparisons, and the smallest loser another 49.',
      'Total 50 + 49 + 49 = 148, which is 3n/2 − 2, compared with 198 the obvious way. No method can do better in the worst case.',
    ],
  },
  {
    id: 'consecutive', t: 'Sums of neighbours', c: 'maths', d: 2, k: 'working',
    q: 'Some numbers can be written as a sum of two or more consecutive positive whole numbers, such as 9 = 4 + 5 = 2 + 3 + 4. How many of the numbers from 1 to 100 cannot?',
    a: { n: 7, int: true, show: '7 (the powers of 2)' },
    h: 'Try small numbers. Which ones fail? Look for a pattern.',
    s: [
      'A sum of k consecutive numbers starting at a is k(2a + k − 1)/2. One of k and 2a + k − 1 is odd and bigger than 1, so the total has an odd factor bigger than 1.',
      'Conversely, every number with an odd factor bigger than 1 can be written this way, so the exceptions are exactly the powers of 2.',
      'Up to 100 these are 1, 2, 4, 8, 16, 32 and 64: 7 numbers.',
    ],
  },
  {
    id: 'pillars', t: 'Crossing pillars', c: 'maths', d: 4, k: 'working', bs: 1018,
    q: 'Two solid cylinders, each of radius 1, cross at right angles with their axes meeting. What is the volume of the region inside both?',
    a: { n: 16 / 3, show: '16/3 ≈ 5.33' },
    h: 'Slice the shape parallel to both axes. What shape is each slice?',
    s: [
      'Put the axes along x and y. The slice at height z is a square: |x| ≤ √(1 − z²) and |y| ≤ √(1 − z²).',
      'Its area is 4(1 − z²).',
      'Volume = ∫ 4(1 − z²) dz from −1 to 1 = 4 × 4/3 = 16/3 ≈ 5.33.',
    ],
  },
  {
    id: 'lookandsay', t: 'Say what you see', c: 'maths', d: 1, k: 'insight', bs: 1019,
    q: 'What comes next? 1, 11, 21, 1211, 111221, …',
    a: { n: 312211, int: true, show: '312211' },
    h: 'Read each term out loud.',
    s: [
      'Each term describes the one before: "1" is one 1 → 11; "11" is two 1s → 21; "21" is one 2, one 1 → 1211; and so on.',
      '111221 is three 1s, two 2s, one 1 → 312211.',
    ],
  },
  {
    id: 'zeros', t: 'Trailing zeros', c: 'maths', d: 1, k: 'working',
    q: 'How many zeros does 125! (125 factorial) end with?',
    a: { n: 31, int: true, show: '31' },
    h: 'Each trailing zero needs a factor 10 = 2 × 5. Which factor is rarer?',
    s: [
      'Factors of 2 are plentiful, so count factors of 5.',
      'Multiples of 5: 25. Multiples of 25 give one extra 5 each: 5 more. Multiples of 125: 1 more.',
      '25 + 5 + 1 = 31.',
    ],
  },
  {
    id: 'paintcube', t: 'Painted cube', c: 'maths', d: 2, k: 'insight',
    q: 'A 10 × 10 × 10 cube is painted on the outside, then cut into 1,000 unit cubes. How many of the small cubes have paint on exactly two faces?',
    a: { n: 96, int: true, show: '96' },
    h: 'These sit along the edges of the big cube, but not at its corners.',
    s: [
      'Cubes with exactly two painted faces lie on the 12 edges of the big cube, not counting the corners.',
      'Each edge has 10 − 2 = 8 of them: 12 × 8 = 96.',
    ],
  },
  {
    id: 'squares', t: 'Squares on a chessboard', c: 'maths', d: 2, k: 'working',
    q: 'How many squares of any size can be found on an 8 × 8 chessboard, with sides along the grid lines?',
    a: { n: 204, int: true, show: '204' },
    h: 'How many positions are there for a k × k square?',
    s: [
      'A k × k square fits in (9 − k)² positions.',
      'Total = 8² + 7² + … + 1² = 204.',
    ],
  },
  {
    id: 'lastdigit', t: 'Last digit', c: 'maths', d: 1, k: 'working',
    q: 'What is the last digit of 7²⁰²⁶?',
    a: { n: 9, int: true, show: '9' },
    h: 'The last digits of powers of 7 repeat.',
    s: [
      'The last digits of 7, 7², 7³ and 7⁴ are 7, 9, 3 and 1, and then the pattern repeats every 4.',
      '2026 = 4 × 506 + 2, so the last digit matches 7²: 9.',
    ],
  },
  {
    id: 'threefive', t: 'Three or five', c: 'maths', d: 1, k: 'working',
    q: 'How many whole numbers from 1 to 1,000 are divisible by 3 or by 5?',
    a: { n: 467, int: true, show: '467' },
    h: 'Count the multiples of 3 and of 5, then fix the double count.',
    s: [
      'Multiples of 3: 333. Multiples of 5: 200. Multiples of both (that is, of 15): 66.',
      '333 + 200 − 66 = 467.',
    ],
  },
  {
    id: 'rightangles', t: 'Right angles', c: 'maths', d: 2, k: 'working',
    q: 'How many times in one day (24 hours) are the hour and minute hands of a clock exactly at right angles?',
    a: { n: 44, int: true, show: '44' },
    h: 'How many times does the minute hand overtake the hour hand in a day?',
    s: [
      'The minute hand goes round 24 times a day and the hour hand twice, so the minute hand overtakes it 22 times.',
      'Between two overtakes, the gap between the hands passes 90° and 270° once each.',
      '22 × 2 = 44.',
    ],
  },
  {
    id: 'quarterpast', t: 'Quarter past three', c: 'maths', d: 1, k: 'working',
    q: 'What is the angle, in degrees, between the hour and minute hands of a clock at 3:15?',
    a: { n: 7.5, show: '7.5°' },
    h: "The hour hand doesn't stay on the 3.",
    s: [
      'The minute hand points at the 3: 90° from 12.',
      'The hour hand moves 0.5° per minute, so at 3:15 it is at 90° + 7.5° = 97.5°.',
      'The angle between them is 7.5°.',
    ],
  },
  {
    id: 'knockout77', t: 'Knockout matches', c: 'maths', d: 1, k: 'insight',
    q: '77 players enter a knockout tennis tournament, with byes wherever needed. How many matches are played to find the winner?',
    a: { n: 76, int: true, show: '76' },
    h: 'What does each match do?',
    s: [
      'Every match knocks out exactly one player, and 76 players must be knocked out.',
      'So 76 matches, however the byes are arranged.',
    ],
  },
  {
    id: 'rope', t: 'Rope around the Earth', c: 'maths', d: 1, k: 'insight',
    q: "A rope is pulled tight around the Earth's equator. It is made 1 metre longer and lifted evenly so that it floats at the same height all the way round. About how high above the ground is it, in centimetres?",
    a: { n: 100 / (2 * Math.PI), tol: 0.6, show: '100/(2π) ≈ 16 cm' },
    h: 'Circumference = 2πr. How much does r change if the circumference grows by 1 metre?',
    s: [
      'C = 2πr, so adding 1 metre to the circumference adds 1/(2π) metres to the radius.',
      'That is about 0.16 m, roughly 16 cm, whatever the size of the sphere.',
    ],
  },
  {
    id: 'stairs', t: 'Climbing stairs', c: 'maths', d: 2, k: 'working', bs: 103,
    q: 'You climb a 10-step staircase taking 1, 2 or 3 steps at a time. In how many different ways can you reach the top?',
    a: { n: 274, int: true, show: '274' },
    h: 'Your last move was 1, 2 or 3 steps. How does that relate the counts for different steps?',
    s: [
      'Let W(n) be the number of ways to reach step n. The last move was 1, 2 or 3 steps, so W(n) = W(n − 1) + W(n − 2) + W(n − 3), with W(0) = 1.',
      'W(1) to W(10): 1, 2, 4, 7, 13, 24, 44, 81, 149, 274.',
    ],
  },
  {
    id: 'avgspeed', t: 'There and back', c: 'maths', d: 1, k: 'working',
    q: 'You drive to a town at 30 km/h and come straight back along the same road at 60 km/h. What is your average speed for the whole trip, in km/h?',
    a: { n: 40, show: '40 km/h' },
    h: 'Pick a distance, say 60 km each way, and work out the total time.',
    s: [
      'Say it is 60 km each way: 2 hours there and 1 hour back.',
      '120 km in 3 hours is 40 km/h, not 45: you spend longer at the slower speed.',
    ],
  },
  {
    id: 'bird', t: 'Bird between trains', c: 'maths', d: 1, k: 'insight',
    q: 'Two trains 120 km apart head towards each other on the same track, at 40 km/h and 20 km/h. A bird flies at 90 km/h from one train to the other and back, over and over, until the trains meet. How far does the bird fly in total, in km?',
    a: { n: 180, show: '180 km' },
    h: "Don't add up the zig-zags. How long does the bird fly for?",
    s: [
      'The trains close in at 60 km/h, so they meet after 2 hours.',
      'The bird flies for 2 hours at 90 km/h: 180 km.',
    ],
  },
  {
    id: 'lilies', t: 'Lily pads', c: 'maths', d: 1, k: 'insight',
    q: 'A patch of lily pads doubles in size every day. It covers the whole pond on day 48. On which day did it cover half the pond?',
    a: { n: 47, int: true, show: 'Day 47' },
    h: 'Work back one day.',
    s: ['It doubles every day, so the day before the pond was full it was half full: day 47.'],
  },
  {
    id: 'batball', t: 'Bat and ball', c: 'maths', d: 1, k: 'insight',
    q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How many cents does the ball cost?',
    a: { n: 5, int: true, show: '5 cents' },
    h: 'If the ball cost 10 cents, what would the bat cost?',
    s: [
      'Ball = x and bat = x + 1.00, so 2x + 1.00 = 1.10 and x = 0.05.',
      '5 cents, not the instinctive 10: with a 10-cent ball the total would be $1.20.',
    ],
  },
  {
    id: 'machines', t: 'Machines and widgets', c: 'maths', d: 1, k: 'insight',
    q: 'If 6 machines make 6 widgets in 6 minutes, how many minutes do 60 machines take to make 60 widgets?',
    a: { n: 6, int: true, show: '6 minutes' },
    h: 'How long does one machine take to make one widget?',
    s: [
      'Each machine makes one widget in 6 minutes.',
      '60 machines working at once make 60 widgets in the same 6 minutes.',
    ],
  },
  {
    id: 'ages', t: 'Three daughters', c: 'maths', d: 2, k: 'insight',
    q: 'A man says: "The product of my three daughters\' ages is 36, and their sum is the number on that house." His friend looks at the house and says, "I still can\'t tell." The man adds: "My oldest daughter plays the piano." How old is the oldest daughter?',
    a: { n: 9, int: true, show: '9' },
    h: "List every way to write 36 as a product of three ages, with their sums. Why couldn't the friend tell?",
    s: [
      'The triples with product 36 and their sums: (1, 1, 36) 38, (1, 2, 18) 21, (1, 3, 12) 16, (1, 4, 9) 14, (1, 6, 6) 13, (2, 2, 9) 13, (2, 3, 6) 11, (3, 3, 4) 10.',
      'Only the sum 13 is ambiguous, so the house is number 13: the ages are (1, 6, 6) or (2, 2, 9).',
      '"My oldest daughter" means there is a single oldest, which rules out 6 and 6. The oldest is 9.',
    ],
  },

  // ===================== STRATEGY =====================
  {
    id: 'pirates', t: 'Seven pirates', c: 'strat', d: 2, k: 'working', bs: 2,
    q: 'Seven pirates, ranked from 1 (most junior) to 7 (captain), must split 100 gold coins. The most senior pirate still aboard proposes a split and everyone votes, including the proposer. If at least half vote yes it passes; otherwise the proposer is thrown overboard and the next most senior proposes. Pirates are perfectly logical, want to survive, then want as much gold as possible, and vote no when it makes no difference to them. How many coins does the captain keep?',
    a: { n: 97, int: true, show: '97' },
    h: 'Work up from two pirates. Who would get nothing one round later? They are cheap to buy.',
    s: [
      'Two pirates: pirate 2 keeps all 100, since his own vote is half.',
      'Three: pirate 3 needs one more vote and buys pirate 1, who would get nothing, with 1 coin. Four: pirate 4 buys pirate 2. Five: pirate 5 needs two more votes and buys pirates 3 and 1, keeping 98. Six: pirate 6 buys pirates 4 and 2, keeping 98.',
      'Seven: the captain needs three more votes and buys pirates 5, 3 and 1 with a coin each. He keeps 97.',
    ],
  },
  {
    id: 'lions', t: 'Hungry lions', c: 'strat', d: 2, k: 'insight', bs: 7,
    q: 'An island has 47 lions and one sheep. A lion that eats the sheep becomes a sheep itself and can then be eaten by another lion. Lions are perfectly logical and would rather stay hungry than be eaten, and only one lion can eat at a time. Does the sheep get eaten?',
    a: { opts: ['Yes', 'No'], i: 0 },
    h: 'Start small: 1 lion, then 2, then 3.',
    s: [
      'One lion eats the sheep safely. With two lions, whichever eats becomes a sheep facing one lion and gets eaten, so neither eats.',
      'With three lions, one can eat and leave the safe two-lion situation, so it eats.',
      'The pattern alternates: with an odd number of lions the sheep gets eaten. 47 is odd, so yes.',
    ],
  },
  {
    id: 'duck', t: 'Duck on the pond', c: 'strat', d: 3, k: 'insight', bs: 8,
    q: "A duck sits in the middle of a circular pond. A fox runs around the edge at 4 times the duck's swimming speed, always trying to be where the duck will land. The duck can only fly off from the bank. Can the duck escape?",
    a: { opts: ['Yes', 'No', 'Only if the fox makes a mistake'], i: 0 },
    h: 'Close to the centre, the duck can circle faster, in angle, than the fox.',
    s: [
      "At a quarter of the radius from the centre, the duck's angular speed equals the fox's. Inside that circle the duck circles faster, so it can get directly opposite the fox, just under r/4 from the centre.",
      'From there it swims straight to the bank: just over ¾r, taking about 0.75 r/v.',
      'The fox has to run half the circumference, πr, at speed 4v: about 0.785 r/v. The duck lands first and escapes.',
    ],
  },
  {
    id: 'hatline', t: 'Hats in a line', c: 'strat', d: 2, k: 'insight', bs: 15,
    q: "20 prisoners stand in a line, each wearing a black or white hat. Each sees all the hats in front of them, but not their own or those behind. Starting from the back, each says 'black' or 'white', heard by everyone. With a strategy agreed beforehand, how many can be guaranteed to name their own hat correctly?",
    a: { n: 19, int: true, show: '19' },
    h: "The prisoner at the back can't be sure of their own hat. What could they say that helps everyone else?",
    s: [
      "The prisoner at the back says 'black' if they see an odd number of black hats and 'white' otherwise. They have a 50% chance.",
      "Everyone after that knows the parity at the start, sees the hats in front of them and has heard the correct answers behind them, which is enough to work out their own hat.",
      'All 19 others are certain: 19.',
    ],
  },
  {
    id: 'hatseven', t: 'Seven colours', c: 'strat', d: 3, k: 'insight', bs: 120,
    q: 'Now 50 prisoners stand in a line and each hat is one of 7 colours. Same rules: each sees every hat in front of them and hears every answer. How many can be guaranteed to name their own colour correctly?',
    a: { n: 49, int: true, show: '49' },
    h: 'Number the colours 0 to 6 and use the total modulo 7.',
    s: [
      'Number the colours 0 to 6. The prisoner at the back names the colour equal to the total of all the hats in front of them, modulo 7.',
      'Each later prisoner knows this total, sees the hats in front of them and has heard the correct colours behind, so they can work out their own.',
      'Everyone except the back prisoner is certain: 49.',
    ],
  },
  {
    id: 'numberhats', t: 'Number hats', c: 'strat', d: 4, k: 'insight', bs: 121,
    q: "N players each get a hat with a number from 1 to N; numbers can repeat. Each sees everyone else's number but not their own, and they all guess their own number at the same time. Find a strategy, agreed beforehand, that guarantees at least one correct guess.",
    a: { self: 'Player i guesses so that the total of all hats would be i modulo N.' },
    h: 'Number the players 0 to N − 1 and think about the total of all the hats, modulo N.',
    s: [
      'Number the players 0 to N − 1. Player i assumes the total of all the hats is i modulo N, and guesses the number that would make it so.',
      'The real total has exactly one remainder modulo N, say k. Player k has assumed correctly, so player k guesses right.',
      'Exactly one player is always right.',
    ],
  },
  {
    id: 'islanders', t: 'Blue eyes', c: 'strat', d: 3, k: 'insight', bs: 27,
    q: 'On an island of perfect logicians, 7 people have blue eyes. Nobody knows their own eye colour and nobody talks about it. Anyone who works out that they have blue eyes leaves on the next ferry, and a ferry leaves every night. A visitor tells everyone: "At least one of you has blue eyes." On which night do the blue-eyed people leave?',
    a: { n: 7, int: true, show: 'Night 7' },
    h: 'Solve it with 1 blue-eyed person, then with 2.',
    s: [
      'With one blue-eyed person: they see no blue eyes, realise it must be them, and leave on night 1.',
      'With two: each sees one and expects them to leave on night 1. When nobody leaves, both realise they have blue eyes and leave on night 2.',
      'By the same reasoning, k blue-eyed people all leave on night k: night 7. The announcement matters because it makes the fact common knowledge.',
    ],
  },
  {
    id: 'strips', t: 'Poisoned barrel', c: 'strat', d: 2, k: 'insight', bs: 31,
    q: 'One of 600 barrels of wine is poisoned. You have test strips that change colour if dipped in poisoned wine, even a drop, but only show the result after 24 hours. You have 24 hours. What is the smallest number of strips that can identify the poisoned barrel?',
    a: { n: 10, int: true, show: '10' },
    h: 'Each strip gives one yes/no answer. How many barrels can k strips tell apart?',
    s: [
      'Number the barrels in binary. Strip j gets a drop from every barrel whose j-th binary digit is 1.',
      "The pattern of strips that change colour spells out the poisoned barrel's number.",
      'k strips give 2ᵏ patterns: 2⁹ = 512 is too few and 2¹⁰ = 1024 is enough. So 10.',
    ],
  },
  {
    id: 'strips2', t: 'Two rounds of tests', c: 'strat', d: 3, k: 'insight', bs: 31,
    q: 'Now there are 240 barrels, one poisoned. The strips still take 24 hours, but you have 48 hours, so you can test in two rounds, and a strip that stays clean can be used again. What is the smallest number of strips needed?',
    a: { n: 5, int: true, show: '5' },
    h: 'A strip can now end three ways: it changes after round 1, after round 2, or never.',
    s: [
      'Each strip has three outcomes: it changes after round 1, after round 2, or not at all. So k strips can tell apart 3ᵏ barrels.',
      "Write the barrel numbers in base 3. In round 1, dip strip j into barrels whose j-th digit is 2. In round 2, dip the strips that are still clean into barrels whose j-th digit is 1.",
      '3⁴ = 81 is too few and 3⁵ = 243 is enough, so 5 strips.',
    ],
  },
  {
    id: 'eggs', t: 'Two eggs, 200 floors', c: 'strat', d: 2, k: 'working', bs: 21,
    q: 'You have two identical eggs and a 200-floor building. An egg breaks when dropped from a certain floor or higher, and survives from any lower floor. What is the smallest number of drops that always finds that floor?',
    a: { n: 20, int: true, show: '20' },
    h: 'If the first egg breaks, the second must check the floors below one by one. So the gaps between first-egg drops should shrink by one each time.',
    s: [
      'With d drops, drop the first egg from floor d, then d + (d − 1), then d + (d − 1) + (d − 2), and so on. If it breaks, the second egg checks the gap floor by floor, and the total stays within d.',
      'This covers d + (d − 1) + … + 1 = d(d + 1)/2 floors.',
      '19 × 20/2 = 190 is less than 200, but 20 × 21/2 = 210 is enough, so 20 drops.',
    ],
  },
  {
    id: 'goldbar', t: 'Paying with gold', c: 'strat', d: 2, k: 'insight',
    q: 'You must pay a worker one unit of gold at the end of each day for 15 days, from a bar of 15 units. The worker can give pieces back as change. What is the smallest number of cuts to the bar?',
    a: { n: 3, int: true, show: '3' },
    h: 'Which piece sizes let you make every total from 1 to 15?',
    s: [
      'Cut the bar into pieces of 1, 2, 4 and 8 units: three cuts.',
      'Every amount from 1 to 15 is a sum of these pieces (think binary), so each day you hand over the right pieces and take back change.',
      'Two cuts give only three pieces, which can make at most 7 different totals, so 3 is the minimum.',
    ],
  },
  {
    id: 'balance', t: 'The heavy coin', c: 'strat', d: 2, k: 'insight',
    q: 'One coin in a pile is slightly heavier and all the others are identical. Using a balance scale 4 times, what is the largest pile in which you can always find the heavy coin?',
    a: { n: 81, int: true, show: '81' },
    h: 'A weighing has three possible outcomes.',
    s: [
      'Split the pile into three groups and weigh two of them. The heavier side holds the coin, or if they balance it is in the third group.',
      'Each weighing cuts the possibilities by a factor of 3, so 4 weighings handle 3⁴ = 81 coins.',
    ],
  },
  {
    id: 'roundtable', t: 'Coins on a round table', c: 'strat', d: 2, k: 'insight', bs: 29,
    q: "Two players take turns placing identical coins flat on a round table, without overlapping. The first player who can't place a coin loses. Who can always win?",
    a: { opts: ['The first player', 'The second player', 'Neither: it depends on the table'], i: 0 },
    h: 'Symmetry.',
    s: [
      'The first player puts a coin exactly in the centre.',
      "After that, whenever the opponent places a coin, the first player places one at the mirror-image spot through the centre, which is always free.",
      'So the first player always has a move, and the opponent runs out first.',
    ],
  },
  {
    id: 'submarine', t: 'Hidden submarine', c: 'strat', d: 4, k: 'insight', bs: 217,
    q: 'A submarine starts at an unknown whole number on a line and moves by an unknown, fixed whole number of steps each minute, possibly negative. Each minute you can fire one torpedo at any whole-number position. Find a strategy that is certain to hit it eventually.',
    a: { self: 'List every (start, speed) pair and test one pair per minute.' },
    h: 'The whole path of the submarine is described by two whole numbers.',
    s: [
      'At minute t the submarine is at a + b·t, for some whole numbers a and b.',
      'There are countably many pairs (a, b), so they can be listed in one sequence, for example spiralling out from (0, 0).',
      'At minute t, take the t-th pair (a, b) in the list and fire at a + b·t. When you reach the true pair, you hit.',
    ],
  },
  {
    id: 'divisors', t: 'Crossing out divisors', c: 'strat', d: 3, k: 'insight', bs: 221,
    q: 'The numbers 1 to N are written on a board, with N at least 2. Players take turns choosing a number still on the board and crossing out that number and all its divisors still on the board. Whoever crosses out the last number wins. Which player can always win?',
    a: { opts: ['The first player', 'The second player', 'It depends on N'], i: 0 },
    h: 'Suppose the second player had a winning strategy. What if the first player starts by crossing out only the number 1?',
    s: [
      "Suppose the second player could always win. The first player crosses out just 1, and the second player's winning reply is some number x, with its divisors.",
      'But the first player could have played x straight away. That crosses out x, its divisors and 1 too: the same position, with the second player to move.',
      'Then the first player would be the one winning, a contradiction. So the first player can always win, even though no simple explicit strategy is known. This argument is called strategy stealing.',
    ],
  },
  {
    id: 'locks', t: 'Majority locks', c: 'strat', d: 4, k: 'working', bs: 223,
    q: 'Seven partners want a safe that any 4 of them can open together, but no 3 of them can. They fit several locks, all of which must be opened, and they can hand out copies of each key to whichever partners they choose. What is the smallest number of locks?',
    a: { n: 35, int: true, show: '35' },
    h: 'For every group of 3, there must be a lock that none of them can open.',
    s: [
      'Each group of 3 must be blocked by some lock none of them can open. Every other partner must have that key, or adding them to the 3 would still fail.',
      'So two different groups of 3 need different locks: a lock missing from both groups would be missing from at least 4 people, who then could not open the safe.',
      'One lock per group of 3: C(7, 3) = 35 locks, each with keys for the other 4 partners.',
    ],
  },
  {
    id: 'petrol', t: 'Circular road trip', c: 'strat', d: 3, k: 'insight', bs: 225,
    q: 'Petrol stations are spaced around a circular road. Together they hold exactly enough fuel for one lap, but in different amounts. Your car starts with an empty tank. Show that there is a station you can start from and complete the lap.',
    a: { self: 'Start at the station where the running fuel balance is lowest.' },
    h: 'Imagine driving a lap anyway, allowing the tank to go negative. Where is it lowest?',
    s: [
      'Start anywhere and pretend the tank may go negative. Track the fuel level round the lap: it ends where it started, because the total fuel is exactly one lap.',
      'Find the station where the level is lowest, just before refuelling there, and start from that station instead.',
      'Measured from that lowest point, the level is never lower anywhere on the lap, so starting there with an empty tank it never goes negative.',
    ],
  },
  {
    id: 'nim30', t: 'Last stick wins', c: 'strat', d: 1, k: 'working',
    q: 'There are 30 sticks on a table. Two players take turns removing 1, 2 or 3 sticks, and whoever takes the last stick wins. You go first. How many sticks should you take?',
    a: { n: 2, int: true, show: '2' },
    h: 'How many sticks would you hate to face? Start from 4.',
    s: [
      'Facing 4 sticks loses: whatever you take, your opponent takes the rest. The same holds for any multiple of 4.',
      'So always leave a multiple of 4. From 30, take 2 to leave 28, then answer every move of k sticks by taking 4 − k.',
    ],
  },
  {
    id: 'race100', t: 'Race to 100', c: 'strat', d: 2, k: 'working',
    q: 'Two players take turns adding a whole number from 1 to 10 to a running total that starts at 0. Whoever brings the total to exactly 100 wins. You go first. What number should you start with?',
    a: { n: 1, int: true, show: '1' },
    h: 'Reaching 89 guarantees a win. What guarantees reaching 89?',
    s: [
      'If you reach 89, your opponent can only get to 90–99, and you finish at 100.',
      'Going back in steps of 11: 78, 67, …, 12, 1.',
      'So start with 1, then always bring the total to the next number in 1, 12, 23, …, 89.',
    ],
  },
  {
    id: 'twothirds', t: 'Two-thirds of the average', c: 'strat', d: 1, k: 'insight',
    q: 'Everyone in a group picks a whole number from 0 to 100. The winner is whoever comes closest to two-thirds of the average. If everyone is perfectly rational and knows that everyone else is too, what number do they all pick?',
    a: { n: 0, int: true, show: '0' },
    h: 'Nobody should pick more than 67. Then what?',
    s: [
      'The average is at most 100, so two-thirds of it is at most 67, and picking above 67 never makes sense.',
      'If everyone knows that, the limit drops to 44, then 30, and so on.',
      'Repeating this all the way down, the only stable choice is 0. Real groups usually land around 20 to 35.',
    ],
  },
  {
    id: 'horses', t: '25 horses', c: 'strat', d: 2, k: 'working',
    q: 'You have 25 horses and want to find the 3 fastest. You can race at most 5 at a time, and you only see the finishing order, not times. What is the smallest number of races needed?',
    a: { n: 7, int: true, show: '7' },
    h: 'Race them all in 5 groups first. Which horses can still be in the top 3 after that?',
    s: [
      'Race 5 groups of 5 (5 races), then race the 5 group winners (race 6). Call the groups A, B, C, … in the order their winners finished: A1 is the fastest overall.',
      'Only A2, A3, B1, B2 and C1 can still be 2nd or 3rd. Every other horse has at least three horses known to be faster.',
      'Race those 5 (race 7): the first two are 2nd and 3rd overall. 7 races.',
    ],
  },
  {
    id: 'torch', t: 'Crossing the bridge', c: 'strat', d: 2, k: 'working',
    q: 'Four people must cross a narrow bridge at night with one torch. At most two can cross at once, and anyone crossing needs the torch, so it has to be carried back. They take 1, 3, 6 and 8 minutes, and a pair walks at the slower one\'s pace. What is the shortest total time to get everyone across, in minutes?',
    a: { n: 18, int: true, show: '18 minutes' },
    h: 'Send the two slowest across together.',
    s: [
      '1 and 3 cross (3 minutes). 1 returns (1). 6 and 8 cross (8). 3 returns (3). 1 and 3 cross (3).',
      'Total 3 + 1 + 8 + 3 + 3 = 18 minutes.',
      'Having 1 walk everyone across takes 8 + 1 + 6 + 1 + 3 = 19 minutes.',
    ],
  },
  {
    id: 'jugs', t: 'Four litres', c: 'strat', d: 2, k: 'working',
    q: 'You have a 3-litre jug, a 5-litre jug and a tap. Filling a jug, emptying a jug, or pouring one into the other until the first is empty or the second is full each count as one step. What is the fewest number of steps to get exactly 4 litres in the 5-litre jug?',
    a: { n: 6, int: true, show: '6' },
    h: 'Start by filling the 5-litre jug.',
    s: [
      'Fill the 5 (5, 0). Pour it into the 3 (2, 3). Empty the 3 (2, 0). Pour the 5 into the 3 (0, 2). Fill the 5 (5, 2). Pour into the 3 until it is full (4, 3).',
      'That is 6 steps, and checking every possibility shows nothing shorter works.',
    ],
  },
  {
    id: 'coinsrow', t: 'Coins in a row', c: 'strat', d: 3, k: 'insight',
    q: 'An even number of coins of various values lie in a row. Two players take turns taking one coin from either end of the row, and the higher total wins. Who can always make sure they do not lose?',
    a: { opts: ['The first player', 'The second player', 'Neither'], i: 0 },
    h: 'Colour the coins alternately. Can the first player choose to collect every coin of one colour?',
    s: [
      'Number the positions 1 to 2n. If the first player takes an odd-numbered end, both ends left are even-numbered. Whatever the opponent takes, an odd-numbered coin is exposed for the first player to take next.',
      'So the first player can collect all the odd-positioned coins, or in the same way all the even ones.',
      'They add up both sets in advance and collect the bigger one, which is at least half the total.',
    ],
  },
  {
    id: 'threehats', t: 'Three hats, pass allowed', c: 'strat', d: 3, k: 'working',
    q: "Three players each get a red or blue hat at random, 50/50. Each sees the others' hats but not their own. At the same time, each either guesses their own colour or passes. The team wins if at least one guesses correctly and nobody guesses wrong. With the best strategy agreed beforehand, what is the probability of winning?",
    a: { n: 3 / 4, show: '3/4' },
    h: 'If you see two hats of the same colour, guess the other colour. Otherwise pass.',
    s: [
      'Strategy: if you see two hats of the same colour, guess the other colour. If you see two different colours, pass.',
      'If the hats are not all the same (6 of the 8 cases), exactly one player sees a matching pair and guesses correctly, while the other two pass.',
      'If all three match (2 of 8 cases), everyone guesses wrong. P(win) = 6/8 = 3/4.',
    ],
  },
  {
    id: 'bricks', t: 'Packing bricks', c: 'strat', d: 4, k: 'insight', bs: 226,
    q: 'Can 53 bricks measuring 1 × 1 × 4 be packed into a 6 × 6 × 6 box, with their faces parallel to the box?',
    a: { opts: ['Yes', 'No'], i: 1 },
    h: 'Colour the box in 2 × 2 × 2 blocks, like a 3D chessboard.',
    s: [
      'Split the box into 27 blocks of 2 × 2 × 2 and colour them alternately black and white: 14 blocks of one colour and 13 of the other.',
      'That gives 112 unit cells of one colour and 104 of the other. Wherever a 1 × 1 × 4 brick sits, it covers 2 cells of each colour.',
      'So at most 104 ÷ 2 = 52 bricks fit, and 53 cannot.',
    ],
  },
  {
    id: 'kelly', t: 'How much to bet', c: 'strat', d: 2, k: 'working',
    q: 'You can bet again and again on a coin that wins 60% of the time, at even money: win and you gain your stake, lose and you lose it. To maximise the long-run growth of your bankroll, what fraction of it should you bet each time?',
    a: { n: 0.2, show: '0.2 (20%)' },
    h: 'Maximise the expected log of your bankroll after one bet: 0.6 ln(1 + f) + 0.4 ln(1 − f).',
    s: [
      'Long-run growth is maximised by maximising the expected logarithm of your wealth: g(f) = 0.6 ln(1 + f) + 0.4 ln(1 − f).',
      "g'(f) = 0.6/(1 + f) − 0.4/(1 − f) = 0 gives f = 0.2.",
      'This is the Kelly criterion. For an even-money bet it gives f = p − q = 0.6 − 0.4.',
    ],
  },

  // ===================== LOGIC =====================
  {
    id: 'switches', t: 'Three switches', c: 'logic', d: 1, k: 'insight', bs: 4,
    q: 'Three switches outside a closed room control three bulbs inside it. You can flip the switches as often as you like, then enter the room once. How do you find out which switch controls which bulb?',
    a: { self: 'Use heat: leave one switch on for a while, then off, and turn another on.' },
    h: 'A bulb can tell you more than just on or off.',
    s: [
      'Turn switch 1 on for ten minutes, then turn it off. Turn switch 2 on and go in.',
      'The lit bulb belongs to switch 2, the warm unlit bulb to switch 1, and the cold one to switch 3.',
    ],
  },
  {
    id: 'fuses', t: 'Two fuses', c: 'logic', d: 1, k: 'insight', bs: 10,
    q: "You have two fuses that each take exactly 60 minutes to burn, but unevenly: half the length doesn't take half the time. How do you measure 45 minutes?",
    a: { self: "Light fuse A at both ends and fuse B at one end; when A burns out, light B's other end." },
    h: 'A fuse lit at both ends burns out in half the time.',
    s: [
      'Light fuse A at both ends and fuse B at one end, at the same time.',
      "A burns out after 30 minutes. At that moment light B's other end: its remaining 30 minutes of burning now take 15.",
      'B burns out at 30 + 15 = 45 minutes.',
    ],
  },
  {
    id: 'twoguards', t: 'Two doors', c: 'logic', d: 1, k: 'insight', bs: 16,
    q: "One of two doors leads out and the other doesn't. A guard stands at each: one always tells the truth and one always lies, and you don't know which is which. You may ask one guard one yes/no question. What do you ask?",
    a: { self: 'Ask "Would the other guard say your door leads out?" and do the opposite.' },
    h: 'Make your question pass through both guards.',
    s: [
      'Ask either guard: "If I asked the other guard whether your door leads out, would they say yes?"',
      "The answer is always wrong: the truthful guard honestly reports the liar's lie, and the liar lies about the truthful guard's honest answer.",
      "So do the opposite of what you're told.",
    ],
  },
  {
    id: 'darkdeck', t: 'Cards in the dark', c: 'logic', d: 2, k: 'insight', bs: 26,
    q: "In a dark room you're handed a deck of 52 cards, exactly 12 of them face up. You can't see or feel which way any card faces. How do you split the deck into two piles with the same number of face-up cards?",
    a: { self: 'Take any 12 cards as one pile and turn all of them over.' },
    h: "The piles don't have to be the same size.",
    s: [
      'Count off any 12 cards as pile A; the other 40 are pile B.',
      'If pile A has k face-up cards, pile B has 12 − k.',
      'Turn every card in pile A over: it now has 12 − k face-up cards too.',
    ],
  },
  {
    id: 'hourglass', t: 'Two hourglasses', c: 'logic', d: 2, k: 'insight',
    q: 'With a 7-minute hourglass and an 11-minute hourglass, how do you measure exactly 15 minutes?',
    a: { self: 'Start both. Turn the 7 over when it runs out, and again when the 11 runs out; it then runs 4 more minutes.' },
    h: 'When the 11-minute glass runs out, how much sand has fallen in the 7-minute glass since you last turned it?',
    s: [
      'Start both glasses. When the 7-minute glass runs out, turn it over.',
      'At 11 minutes the large glass runs out, and the small one has been running for 4 minutes since it was turned. Turn it over again: those 4 minutes of sand now run back.',
      'It runs out at 11 + 4 = 15 minutes.',
    ],
  },
  {
    id: 'river', t: 'Wolf, goat and cabbage', c: 'logic', d: 1, k: 'working',
    q: "A farmer must get a wolf, a goat and a cabbage across a river. The boat holds the farmer and one of them. The wolf can't be left alone with the goat, nor the goat with the cabbage. What is the smallest number of crossings, counting each one-way trip?",
    a: { n: 7, int: true, show: '7' },
    h: 'The goat is the problem, and it may have to come back once.',
    s: [
      'Take the goat over (1) and return (2). Take the wolf over (3) and bring the goat back (4).',
      'Take the cabbage over (5) and return (6). Take the goat over (7).',
      'Seven crossings. The trick is bringing the goat back once.',
    ],
  },
  {
    id: 'labels', t: 'Wrong labels', c: 'logic', d: 1, k: 'insight',
    q: "Three boxes are labelled 'Apples', 'Oranges' and 'Mixed', and every label is wrong. You may take fruit out of the boxes without looking inside. What is the smallest number of pieces of fruit you must take out to label every box correctly?",
    a: { n: 1, int: true, show: '1' },
    h: 'Which box tells you the most from a single fruit?',
    s: [
      "Take one fruit from the box labelled 'Mixed'. It isn't mixed, so that fruit tells you what it holds: say apples.",
      "The box labelled 'Oranges' can't hold oranges (wrong label) or apples (already found), so it's the mixed box. The last box holds oranges.",
      'One piece of fruit is enough.',
    ],
  },
  {
    id: 'fakestack', t: 'The fake stack', c: 'logic', d: 1, k: 'insight',
    q: 'There are 10 stacks of 10 coins. One whole stack is fake: fake coins weigh 11 g and real ones 10 g. With one reading on a digital scale, how do you find the fake stack?',
    a: { self: 'Take 1 coin from stack 1, 2 from stack 2, …, 10 from stack 10, and weigh them all.' },
    h: 'Take a different number of coins from each stack.',
    s: [
      'Take 1 coin from stack 1, 2 from stack 2, and so on up to 10 from stack 10: 55 coins.',
      'If they were all real they would weigh 550 g. Each fake coin adds 1 g, so the extra weight in grams is the number of the fake stack.',
    ],
  },
  {
    id: 'explorer', t: 'South, east, north', c: 'logic', d: 2, k: 'insight', bs: 3,
    q: 'A hiker walks 5 km south, then 5 km east, then 5 km north, and ends up exactly where she started. The North Pole is one place where this works. How many starting points on Earth work?',
    a: { opts: ['Only the North Pole', 'Exactly two', 'Infinitely many'], i: 2 },
    h: 'Think about the South Pole. Could walking east take her all the way around it?',
    s: [
      'The North Pole works: walk south, east along a circle of latitude, then north back to the pole.',
      'Near the South Pole, take the circle of latitude that is exactly 5 km around. Start 5 km north of it: walk south to the circle, once around it going east, and north back to the start.',
      'Circles 5/2 km, 5/3 km, … around work too (going round 2, 3, … times), and each gives a whole ring of starting points. Infinitely many.',
    ],
  },
  {
    id: 'antipodal', t: 'Opposite points', c: 'logic', d: 2, k: 'insight', bs: 12,
    q: "Assume temperature varies continuously around the Earth's equator. Are there always two exactly opposite points on the equator with the same temperature?",
    a: { opts: ['Yes, always', 'No', 'Only at certain times'], i: 0 },
    h: "Look at the difference between a point's temperature and the temperature at the opposite point, as you move halfway round.",
    s: [
      'Let f(x) = T(x) − T(the point opposite x), for points x on the equator.',
      'Moving x halfway round swaps the two points, so f(opposite of x) = −f(x): f changes sign.',
      'A continuous function that changes sign must be 0 somewhere in between (the intermediate value theorem). There, the two opposite points have the same temperature.',
    ],
  },
  {
    id: 'waterwine', t: 'Water and wine', c: 'logic', d: 1, k: 'insight', bs: 17,
    q: 'One glass holds water and another the same amount of wine. A spoonful of water goes into the wine and is stirred in, then a spoonful of the mixture goes back into the water. Is there now more water in the wine, or more wine in the water?',
    a: { opts: ['More water in the wine', 'More wine in the water', 'The same'], i: 2 },
    h: 'Each glass ends up with the same volume it started with.',
    s: [
      'Both glasses end up with their original volume.',
      'Whatever water is missing from the water glass has been replaced by exactly that much wine, and that missing water is now in the wine glass.',
      'So the two amounts are equal, however well it was stirred.',
    ],
  },
  {
    id: 'wind', t: 'Flying in the wind', c: 'logic', d: 1, k: 'insight', bs: 9,
    q: 'A plane flies from A to B and back at a constant airspeed. With a steady wind blowing from A towards B, is the round trip faster, slower or the same as with no wind?',
    a: { opts: ['Faster', 'Slower', 'The same'], i: 1 },
    h: 'The plane spends longer flying into the headwind than with the tailwind.',
    s: [
      'With airspeed v, wind w and distance d, the time is d/(v + w) + d/(v − w) = 2dv/(v² − w²).',
      'That is more than 2d/v whenever there is wind. The headwind leg lasts longer, so the wind costs more than it gives back.',
    ],
  },
  {
    id: 'cointurn', t: 'Rolling coin', c: 'logic', d: 1, k: 'insight',
    q: 'Two identical coins lie flat and touching. One stays still while the other rolls around it without slipping, until it is back where it started. How many full turns does the rolling coin make?',
    a: { opts: ['1', '2', '3'], i: 1 },
    h: 'Follow the centre of the rolling coin. What path does it take?',
    s: [
      "The rolling coin's centre goes around a circle of twice the coin's radius, so it travels twice the coin's circumference.",
      'So the coin makes 2 turns: one from rolling along the edge, and one more from going round the fixed coin.',
    ],
  },
  {
    id: 'hotel', t: 'Full hotel', c: 'logic', d: 2, k: 'insight', bs: 105,
    q: 'A hotel has infinitely many rooms, numbered 1, 2, 3, …, and every room is occupied. A coach arrives with infinitely many new guests, one for each number 1, 2, 3, …. How do you give everyone a room?',
    a: { self: 'Move each guest from room n to room 2n; the new guests take the odd rooms.' },
    h: 'Free up infinitely many rooms without turning anyone away.',
    s: [
      'Ask every guest to move from room n to room 2n. Everyone still has a room, and all the odd-numbered rooms are now empty.',
      'New guest k takes room 2k − 1.',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { PUZZLE_BANK };
