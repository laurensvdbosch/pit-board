/* ===========================================================
   PITPREP — Situational judgement (SJT) scenarios
   ---------------------------------------------------------
   Written for PitPrep. Each scenario has four responses, each rated on
   the usual SJT scale, with a one-line reason:
     4 very effective · 3 fairly effective · 2 ineffective · 1 counterproductive
   The ratings reflect common professional norms (own mistakes early,
   escalate through the right person, protect clients and confidential
   information, talk to people directly before going over their heads),
   not any one employer's key.
   One bank serves both formats: "most / least effective" uses the single
   highest and lowest rated response, "rate each" uses all four ratings.

   Item: { id, sec, comp, t, s, r: [[text, rating, why] × 4] }
     sec   fin (banking, trading, asset management)
           pro (consulting, audit, tax: Big 4 and strategy firms)
           gen (graduate schemes, office, tech, public sector)
     comp  integrity | teamwork | client | priorities | communication |
           learning | initiative | resilience
   Checked by tools/test-sjt.cjs.
   =========================================================== */

'use strict';

const SJT_BANK = [
  // ======================= FINANCE =======================
  {
    id: 'fin-model-error', sec: 'fin', comp: 'integrity', t: 'An error in a sent model',
    s: 'You realise that a model you built last week has a formula error that slightly understates the fees. Your VP already sent it to the client.',
    r: [
      ['Tell your VP straight away, explain the error and bring a corrected version.', 4, 'Owning it quickly, with the fix ready, lets the VP decide how to tell the client while the impact is still small.'],
      ['Correct the file and send it to the client yourself with a short note.', 2, 'Fixing it is right, but going to the client directly bypasses the VP, who owns that relationship.'],
      ['Leave it: the difference is small and nobody may notice.', 1, 'Hoping it goes unnoticed puts the client and the bank at risk, and destroys trust if it surfaces later.'],
      ['Fix the model and mention it to your VP at your next weekly catch-up.', 2, 'You do own it, but waiting days on something a client already has is far too slow.'],
    ],
  },
  {
    id: 'fin-overheard', sec: 'fin', comp: 'integrity', t: 'Overheard in the lift',
    s: 'In the lift you overhear two senior bankers discussing a takeover of a listed company. That evening a friend who trades shares messages you asking for "any tips".',
    r: [
      ['Tell your friend you can\'t discuss anything from work, and let compliance know a live deal was discussed in a public lift.', 4, 'A clear refusal protects you and your friend, and compliance needs to know confidential information is being discussed openly.'],
      ['Tell your friend you can\'t discuss anything from work, and leave it there.', 3, 'The right answer to your friend; the leak in the lift still goes unreported.'],
      ['Tell your friend you heard something interesting but can\'t say what.', 2, 'Even a hint can be read as a tip, and could put you both in legal trouble.'],
      ['Say nothing to your friend, but buy a few shares yourself since it\'s a small amount.', 1, 'Trading on inside information is a criminal offence whatever the size, and ends careers.'],
    ],
  },
  {
    id: 'fin-two-deadlines', sec: 'fin', comp: 'priorities', t: 'Two 6pm deadlines',
    s: 'At 4pm your MD asks for a pitch-book page by 6pm. An associate has already asked you for a data check, also due at 6pm. You can\'t do both well.',
    r: [
      ['Tell the associate about the clash now, explain the MD\'s request, and agree together what can move.', 4, 'Raising the clash early lets the people who own the work agree priorities, and nobody is surprised at 6pm.'],
      ['Do the MD\'s page and send the associate a half-finished check without mentioning it.', 1, 'Silently handing over incomplete work misleads the associate, who may rely on it.'],
      ['Stay late and try to finish both, without telling anyone.', 2, 'Admirable effort, but you risk two rushed results with nobody warned in time.'],
      ['Finish the MD\'s page first and tell the associate their check will be an hour late.', 3, 'Honest and sensible, though it decides the priority for the associate instead of agreeing it with them.'],
    ],
  },
  {
    id: 'fin-credit', sec: 'fin', comp: 'teamwork', t: 'Your analysis, their name',
    s: 'In a team meeting, a fellow intern presents your analysis as if it were their own work.',
    r: [
      ['Talk to them privately afterwards, say calmly how it came across, and agree how to present joint work in future.', 4, 'Dealing with it directly and calmly gives them a chance to put it right and protects the working relationship.'],
      ['Correct them in front of the team during the meeting.', 1, 'A public confrontation embarrasses everyone and makes you look worse than the original problem.'],
      ['Mention to your manager afterwards that the analysis was yours.', 3, 'Reasonable if it matters for your review, but it skips talking to the intern first.'],
      ['Say nothing; it isn\'t worth the conflict.', 2, 'It avoids conflict, but the pattern may continue and your contribution goes unseen.'],
    ],
  },
  {
    id: 'fin-late-report', sec: 'fin', comp: 'client', t: 'An angry client call',
    s: 'You\'re an analyst at an asset manager. A client calls, upset that their quarterly report is late. It is waiting for your manager\'s sign-off.',
    r: [
      ['Apologise, explain it\'s in final review, give a time by which you\'ll update them, then chase your manager.', 4, 'The client is heard and gets a firm next step, and you don\'t promise what you can\'t control.'],
      ['Tell the client the delay is because your manager hasn\'t signed it off yet.', 1, 'Blaming a colleague to a client damages trust in the whole firm.'],
      ['Promise the report within the hour without checking with your manager.', 2, 'Overpromising to calm someone down usually leads to a second, worse disappointment.'],
      ['Take a message and pass it on to your manager.', 3, 'Polite and safe, but the client is left without any idea of when they\'ll hear back.'],
    ],
  },
  {
    id: 'fin-summary-feedback', sec: 'fin', comp: 'learning', t: '"Too long, not useful"',
    s: 'The head of your trading desk tells you your morning market summary was "too long and not useful".',
    r: [
      ['Ask what a useful summary looks like to them, ideally with an example, and change tomorrow\'s.', 4, 'Asking for specifics turns vague criticism into something you can actually fix.'],
      ['Explain why you included everything you did.', 2, 'Defending yourself makes it harder for people to give you honest feedback next time.'],
      ['Make tomorrow\'s summary much shorter without asking anything.', 3, 'You act on it, but you\'re guessing at what "useful" means to them.'],
      ['Suggest someone else takes over the summary, since you\'re clearly not good at it.', 1, 'Giving up after one piece of feedback looks like you can\'t handle criticism.'],
    ],
  },
  {
    id: 'fin-automate', sec: 'fin', comp: 'initiative', t: 'Two hours of copy and paste',
    s: 'Every day you spend two hours copying prices into a spreadsheet by hand. You think a short script could do it.',
    r: [
      ['Suggest it to your manager with an estimate of the time saved, and build it once agreed, checked against the manual version.', 4, 'Initiative with a business case, permission and a check against the old process is exactly what teams want.'],
      ['Write the script and stop doing the manual check straight away.', 1, 'An unchecked script feeding prices can cause silent, costly errors.'],
      ['Keep doing it by hand; it\'s how the team works.', 2, 'Safe, but it wastes your time and misses an easy improvement.'],
      ['Ask a colleague whether anyone has tried automating it, then raise it with your manager.', 3, 'Sensible groundwork; just make sure the idea actually reaches your manager.'],
    ],
  },
  {
    id: 'fin-trading-loss', sec: 'fin', comp: 'resilience', t: 'A bad first week',
    s: 'In your first week on a trading training programme you lose a large (simulated) amount on one trade, and the desk jokes about it.',
    r: [
      ['Take the joke in good humour, work out what went wrong, and ask a senior trader for their view.', 4, 'Staying composed and learning from it fast is exactly what trading desks look for.'],
      ['Stop trading for the rest of the week to avoid more losses.', 2, 'Understandable, but avoiding the activity stops you learning when it matters most.'],
      ['Double your next position to win it back quickly.', 1, 'Chasing losses is the classic trading mistake and multiplies the damage.'],
      ['Write a note for yourself on what happened and move on.', 3, 'Good reflection, but you miss the chance to learn from someone more experienced.'],
    ],
  },
  {
    id: 'fin-explain-bonds', sec: 'fin', comp: 'communication', t: 'Explaining to a non-expert',
    s: 'A relationship manager asks you to explain to a client, who has no finance background, why their bond fund fell when interest rates rose.',
    r: [
      ['Use a simple everyday comparison, avoid jargon, and check they\'ve understood.', 4, 'Pitching it at the client\'s level and checking understanding is what good client communication looks like.'],
      ['Send a detailed technical note on bond duration.', 2, 'Accurate, but it\'s pitched at the wrong audience and is likely to confuse.'],
      ['Tell them it\'s normal market movement and nothing to worry about.', 1, 'Dismissing the question without explaining it leaves the client uneasy and less trusting.'],
      ['Give a short, simple explanation and offer a written follow-up.', 3, 'Clear and helpful; checking they\'ve understood would make it complete.'],
    ],
  },
  {
    id: 'fin-late-night', sec: 'fin', comp: 'teamwork', t: 'Your part is done',
    s: 'It\'s 11pm and your team is racing to finish documents for a deal deadline. You\'ve finished your part.',
    r: [
      ['Ask the associate whether there\'s anything you can take on before you leave.', 4, 'Offering help when the team is under pressure shows you care about the shared result.'],
      ['Leave quietly; your part is done.', 2, 'Not wrong, but it misses an easy chance to support the team.'],
      ['Stay, but work on unrelated tasks so it looks like you\'re helping.', 1, 'Pretending to contribute is worse than leaving honestly.'],
      ['Tell the team you\'re done and reachable by phone if needed, then go home.', 3, 'Honest and helpful, though asking directly if they need a hand now would be better.'],
    ],
  },
  {
    id: 'fin-taxi-receipts', sec: 'fin', comp: 'integrity', t: 'Rounding up expenses',
    s: 'A colleague suggests you round up all your taxi receipts on your expense claim. "Everyone does it, the amounts are tiny."',
    r: [
      ['Claim only what you actually spent, and say politely you\'d rather stick to the policy.', 4, 'Small amounts still count as dishonesty, and saying so calmly sets a clear line.'],
      ['Round up a little; the amounts really are small.', 1, 'Falsifying expenses is a sackable offence, and in finance it raises questions about your honesty everywhere else.'],
      ['Claim correctly yourself but say nothing.', 3, 'You stay honest; a friendly word might also stop your colleague getting into trouble.'],
      ['Report your colleague to compliance immediately.', 2, 'Escalating a passing remark without talking to them first may be out of proportion.'],
    ],
  },
  {
    id: 'fin-training-deadline', sec: 'fin', comp: 'priorities', t: 'Mandatory training on a busy day',
    s: 'Your mandatory compliance training is due today, and your desk is extremely busy.',
    r: [
      ['Find a quieter moment today to do it properly, telling your manager when you\'ll step away.', 4, 'Regulatory training is non-negotiable in finance; planning it openly keeps both the desk and compliance happy.'],
      ['Skip it; the desk matters more and nobody checks.', 1, 'Missing mandatory training is tracked and can stop you working on the desk at all.'],
      ['Ask compliance for a short extension, explaining the situation.', 3, 'Reasonable if it\'s genuinely impossible, but it should be the exception.'],
      ['Click through it as fast as possible without reading.', 2, 'Technically complete, but it defeats the point and you may miss rules that apply to you.'],
    ],
  },

  // ============== CONSULTING & BIG 4 ==============
  {
    id: 'pro-audit-error', sec: 'pro', comp: 'integrity', t: '"It\'s immaterial anyway"',
    s: 'On an audit, you find a small error in the client\'s accounts. Their finance manager asks you not to mention it because "it\'s immaterial and will only cause hassle".',
    r: [
      ['Record it in your working papers and tell your senior as usual, so they can judge materiality.', 4, 'Deciding what\'s material isn\'t your call or the client\'s; documenting and escalating is the professional standard.'],
      ['Agree, since it really is small.', 1, 'Leaving out a finding because the client asked undermines the independence an audit depends on.'],
      ['Tell the finance manager you\'ll include it, and argue the point with them.', 2, 'Right outcome, but the argument isn\'t yours to have; your senior handles that conversation.'],
      ['Mention it to your senior informally, but don\'t document it.', 2, 'Telling your senior helps, but undocumented findings disappear from the audit trail.'],
    ],
  },
  {
    id: 'pro-scope-creep', sec: 'pro', comp: 'client', t: 'Extra work by Friday',
    s: 'A consulting client asks you, the most junior team member, to add an extra analysis by Friday. It isn\'t part of the agreed scope.',
    r: [
      ['Say you\'ll gladly look into it, and check with your engagement manager how it fits the scope and timeline.', 4, 'Positive with the client while letting the manager, who owns scope and fees, decide.'],
      ['Do it in the evenings without telling anyone, to keep the client happy.', 2, 'Well meant, but unagreed work creates scope and expectation problems for the team.'],
      ['Tell the client it\'s out of scope, so you can\'t help.', 2, 'Accurate, but blunt, and it closes a conversation your manager may want to have.'],
      ['Promise it for Friday, then tell your manager on Thursday.', 1, 'Committing the firm without asking, and flagging it late, leaves your manager no room to manage it.'],
    ],
  },
  {
    id: 'pro-teammate-slack', sec: 'pro', comp: 'teamwork', t: 'Picking up the slack',
    s: 'On a case team, one teammate keeps missing internal deadlines and you\'re quietly picking up their work.',
    r: [
      ['Talk to them privately, ask how things are going and whether anything is blocking them, and agree a plan.', 4, 'There may be a reason you don\'t know about; a direct, supportive conversation is the best first step.'],
      ['Keep covering for them; it\'s quicker than talking about it.', 2, 'It keeps work moving short term, but the problem grows and you burn out.'],
      ['Complain about them in the team chat.', 1, 'Calling someone out publicly damages trust across the whole team.'],
      ['Tell the engagement manager that the workload feels uneven.', 3, 'Fair if talking to them hasn\'t worked, but it shouldn\'t be your first move.'],
    ],
  },
  {
    id: 'pro-two-engagements', sec: 'pro', comp: 'priorities', t: 'Two managers, one morning',
    s: 'You\'re staffed on two engagements, and both managers expect a deliverable from you tomorrow morning. You can\'t do both properly.',
    r: [
      ['Tell both managers about the clash now and ask them to agree priorities between them.', 4, 'Flagging it early with the facts lets the people who own the work make the call.'],
      ['Work through the night to deliver both.', 2, 'Sometimes needed, but it risks two weaker deliverables and hides a staffing problem.'],
      ['Prioritise the bigger client without telling the other manager.', 1, 'The other manager finds out too late to make other plans.'],
      ['Ask a colleague to help with one, then tell your managers what you\'ve arranged.', 3, 'Resourceful, but your managers should agree before you hand work to someone else.'],
    ],
  },
  {
    id: 'pro-bad-news', sec: 'pro', comp: 'communication', t: 'Unwelcome findings',
    s: 'Your analysis shows that the client\'s favourite project is unlikely to be profitable. You\'re presenting to their head of strategy tomorrow.',
    r: [
      ['Agree the message with your manager first, then present it clearly with the evidence and some options.', 4, 'Aligning internally and then being clear but constructive is how difficult messages land well.'],
      ['Soften the numbers so the meeting goes smoothly.', 1, 'Changing findings to please the client breaks the trust they pay for.'],
      ['Put the finding in the appendix and focus on the positives.', 2, 'Technically honest, but hiding the key message fails the client.'],
      ['Present it clearly and directly, without discussing it with your manager first.', 3, 'Honest and clear, but a sensitive message should be agreed with your manager before it reaches the client.'],
    ],
  },
  {
    id: 'pro-review-notes', sec: 'pro', comp: 'learning', t: '25 review comments',
    s: 'Your senior returns your audit file with 25 review comments.',
    r: [
      ['Work through each one and ask about any you don\'t understand, so you don\'t repeat them.', 4, 'Review notes are how auditors learn; understanding the "why" matters more than clearing the list.'],
      ['Fix them all as quickly as possible, without asking questions.', 3, 'Diligent, but you may make the same mistakes on the next file.'],
      ['Explain to your senior that you were short on time.', 2, 'Context can help, but it sounds like an excuse and doesn\'t improve the work.'],
      ['Ask to move to a different engagement.', 1, 'Review comments are normal; leaving over them looks like you can\'t take feedback.'],
    ],
  },
  {
    id: 'pro-on-the-beach', sec: 'pro', comp: 'initiative', t: 'Two quiet weeks',
    s: 'You\'re between projects for two weeks, with no client work yet.',
    r: [
      ['Ask your staffing team and counsellor what would be useful, and take on training or internal work meanwhile.', 4, 'Using quiet time productively, in agreement with the people who staff you, is what firms expect.'],
      ['Enjoy the quiet time until you\'re staffed.', 1, 'Unstaffed time is visible, and doing nothing with it is noticed.'],
      ['Build a skill you\'ve noticed your teams lack, and tell your counsellor.', 3, 'Good initiative; checking what\'s most useful first would make it even better.'],
      ['Email partners every day asking to join their projects.', 2, 'Showing interest is fine, but daily emails become pushy and bypass staffing.'],
    ],
  },
  {
    id: 'pro-rejected-deck', sec: 'pro', comp: 'resilience', t: 'A week of work rejected',
    s: 'The client rejects the slide deck you spent a week on and asks for a different approach.',
    r: [
      ['Ask what didn\'t work for them, take notes, and plan the rework with your manager.', 4, 'Staying constructive and understanding the client\'s view is the quickest way to a deck they\'ll accept.'],
      ['Defend the original deck point by point.', 2, 'You may be right, but arguing rarely changes a client\'s mind and can harm the relationship.'],
      ['Quietly decide the client doesn\'t understand the analysis.', 1, 'Dismissing the client\'s view stops you learning and shows in the next deliverable.'],
      ['Start reworking it straight away, based on what you think they meant.', 3, 'Shows energy, but guessing risks another round of rework.'],
    ],
  },
  {
    id: 'pro-competitor-question', sec: 'pro', comp: 'integrity', t: 'What is the competitor planning?',
    s: 'You\'re working for two clients in the same industry. One of them asks what their competitor, your other client, is planning.',
    r: [
      ['Say politely that you can\'t share anything about other clients, just as you\'d never share theirs.', 4, 'Clear and reassuring: it protects both clients and shows why they can trust the firm.'],
      ['Share general market trends from public sources, without naming the competitor.', 3, 'Public information is fine to share, but say clearly that client information is off limits.'],
      ['Hint at the answer without giving details.', 1, 'Even a hint breaches confidentiality, and could cost the firm both clients.'],
      ['Change the subject, and afterwards tell your manager the client asked.', 3, 'Telling your manager is sensible, but a clear answer to the client would be better than dodging.'],
    ],
  },
  {
    id: 'pro-direct-emails', sec: 'pro', comp: 'client', t: 'The client emails you directly',
    s: 'A client contact keeps emailing you directly with requests, bypassing your manager.',
    r: [
      ['Help with quick questions, copy your manager in, and agree with your manager how to handle bigger requests.', 4, 'Responsive for the client and transparent with your manager, who keeps oversight.'],
      ['Ignore any email that isn\'t also sent to your manager.', 1, 'Ignoring a client damages the relationship and reflects badly on the firm.'],
      ['Do everything they ask as fast as possible.', 2, 'Helpful in the moment, but unmanaged requests cause scope and quality problems.'],
      ['Forward each email to your manager without replying.', 3, 'Keeps your manager informed, but the client hears nothing back from you.'],
    ],
  },
  {
    id: 'pro-new-joiner', sec: 'pro', comp: 'teamwork', t: 'A lost new joiner',
    s: 'A new analyst joins your team halfway through a project and seems lost.',
    r: [
      ['Offer to walk them through the project and share your notes.', 4, 'A little time from you gets them productive fast, which helps the whole team.'],
      ['Leave it to the manager to bring them up to speed.', 2, 'The manager is responsible, but a peer can often help more quickly.'],
      ['Help them when they ask, but don\'t offer.', 3, 'Helpful, but new joiners often don\'t know what to ask.'],
      ['Joke in the team chat about the basic questions they ask.', 1, 'Mocking a colleague makes the team less safe for everyone to ask questions.'],
    ],
  },
  {
    id: 'pro-vague-brief', sec: 'pro', comp: 'communication', t: 'A vague brief',
    s: 'Your manager gives you a vague brief: "Have a look at the market for the client."',
    r: [
      ['Ask a few questions about the purpose, format and deadline, then confirm them in a short email.', 4, 'A few minutes of clarifying saves days of work in the wrong direction.'],
      ['Spend two days producing a full market report.', 2, 'Thorough, but it may not be what was needed.'],
      ['Wait until you\'re given more instructions.', 1, 'Waiting wastes time; it\'s on you to clarify.'],
      ['Make a quick first draft and share it early to check you\'re on track.', 3, 'A good way to test direction, though a couple of questions first would help even more.'],
    ],
  },

  // ======================= GENERAL =======================
  {
    id: 'gen-manager-error', sec: 'gen', comp: 'integrity', t: 'Your manager\'s wrong number',
    s: 'You notice that a report your manager is about to send to a director contains a wrong figure.',
    r: [
      ['Tell your manager privately and show where the right figure comes from.', 4, 'Discreet and helpful: it fixes the problem and saves your manager embarrassment.'],
      ['Say nothing; the report is their responsibility.', 1, 'Letting a known error go through helps nobody, including you.'],
      ['Email the director the correct figure yourself.', 2, 'The right number, but going over your manager\'s head damages trust.'],
      ['Point it out in the next team meeting.', 2, 'It gets fixed, but raising it publicly may embarrass your manager unnecessarily.'],
    ],
  },
  {
    id: 'gen-angry-customer', sec: 'gen', comp: 'client', t: 'An angry customer',
    s: 'On a graduate rotation in customer service, a customer is angry about a problem you aren\'t authorised to fix.',
    r: [
      ['Listen, apologise for the trouble, explain what you can do, and pass it to the right person with a clear note.', 4, 'The customer feels heard and the problem reaches someone who can solve it, without them repeating everything.'],
      ['Explain the policy and that there is nothing you can do.', 2, 'Accurate, but it leaves the customer stuck and more frustrated.'],
      ['Promise a refund to calm them down.', 1, 'Promising something you can\'t authorise creates a bigger problem later.'],
      ['Give them the number of the right department.', 3, 'Helpful, but they have to start again; a warm handover is better.'],
    ],
  },
  {
    id: 'gen-team-deadlock', sec: 'gen', comp: 'teamwork', t: 'A team stuck in an argument',
    s: 'Two members of your project team disagree strongly about the approach, and the team is stuck.',
    r: [
      ['Suggest the team lists the pros and cons of both approaches and agrees how to choose.', 4, 'Moving the discussion from people to criteria usually unlocks a decision everyone can accept.'],
      ['Back whichever approach you prefer.', 2, 'Taking sides can entrench the disagreement rather than resolve it.'],
      ['Ask your manager to decide straight away.', 3, 'Gets a decision, though the team could probably have resolved it themselves first.'],
      ['Go ahead with your own approach without telling them.', 1, 'Working around the team creates duplicate work and resentment.'],
    ],
  },
  {
    id: 'gen-friday-request', sec: 'gen', comp: 'priorities', t: 'Friday at 4pm',
    s: 'It\'s Friday at 4pm. You\'re finishing a report due on Monday when a colleague asks for urgent help with an email to a client that must go out today.',
    r: [
      ['Ask how long it will take and help if it\'s short, then get back to your report.', 4, 'Today\'s deadline is real and yours has slack; helping briefly is the best use of the time.'],
      ['Say no; your report is your priority.', 2, 'Protects your work, but ignores a more urgent deadline for the team.'],
      ['Drop your report and spend the evening on their task.', 3, 'Generous, but you may not need to give up the whole evening.'],
      ['Offer to help on Monday.', 1, 'Help on Monday is useless for something that has to go out today.'],
    ],
  },
  {
    id: 'gen-rude-message', sec: 'gen', comp: 'communication', t: 'A message read as rude',
    s: 'A colleague in another office read a short chat message from you as rude. That wasn\'t your intention.',
    r: [
      ['Call them, apologise for how it came across, and explain what you meant.', 4, 'A quick call restores tone that text loses, and repairs the relationship fast.'],
      ['Reply in the chat that they misread it.', 2, 'You may be right, but it puts the blame on them.'],
      ['Ignore it; it was only a text message.', 1, 'Small frictions with remote colleagues grow when they\'re ignored.'],
      ['Send a short apology in the chat.', 3, 'Good, though a quick call usually works better for tone.'],
    ],
  },
  {
    id: 'gen-speak-up', sec: 'gen', comp: 'learning', t: '"Speak up more"',
    s: 'Your performance review says you should speak up more in meetings.',
    r: [
      ['Agree a concrete goal, such as one contribution per meeting, and ask for feedback after a few weeks.', 4, 'A specific, measurable step plus a check-in makes feedback easy to act on.'],
      ['Explain that you\'re naturally quiet and that\'s how you work.', 2, 'Self-awareness is good, but rejecting the feedback outright closes the conversation.'],
      ['Start talking at length in every meeting.', 2, 'Overcorrecting can be as unhelpful as saying nothing.'],
      ['Disagree and ask for the comment to be removed.', 1, 'Contesting fair feedback makes you look defensive.'],
    ],
  },
  {
    id: 'gen-calendar-fix', sec: 'gen', comp: 'initiative', t: 'Double bookings every week',
    s: 'You notice the team\'s shared calendar causes double-bookings almost every week.',
    r: [
      ['Suggest a simple fix to your manager and offer to set it up.', 4, 'Spotting a problem and offering to own the fix is the kind of initiative teams value.'],
      ['Fix it yourself without asking, changing everyone\'s settings.', 2, 'Well meant, but changing shared tools without agreement can cause new problems.'],
      ['Complain about it at lunch.', 1, 'Complaining without suggesting anything changes nothing.'],
      ['Mention it at the next team meeting.', 3, 'Raises it openly, though coming with a suggested fix would be stronger.'],
    ],
  },
  {
    id: 'gen-project-cancelled', sec: 'gen', comp: 'resilience', t: 'Three months, cancelled',
    s: 'A project you have worked on for three months is cancelled.',
    r: [
      ['Ask why it was cancelled, note what you learned, and look for the next priority.', 4, 'Understanding the decision and moving on constructively shows maturity and resilience.'],
      ['Keep working on it in case it\'s restarted.', 2, 'Spending time on cancelled work takes it away from current priorities.'],
      ['Tell colleagues the decision was wrong.', 1, 'Undermining a decision openly harms your reputation and team morale.'],
      ['Accept it and ask your manager for new work.', 3, 'A positive reaction; reflecting on the lessons too would make it complete.'],
    ],
  },
  {
    id: 'gen-personal-data', sec: 'gen', comp: 'integrity', t: 'Data you shouldn\'t have',
    s: 'You\'re sent a spreadsheet containing customers\' personal data that you don\'t need for your work.',
    r: [
      ['Tell the sender, delete your copy, and check whether it needs reporting under the data protection policy.', 4, 'Personal data sent to the wrong person can be a reportable breach; acting quickly limits the harm.'],
      ['Keep it in case it\'s useful later.', 1, 'Holding personal data you don\'t need breaks data protection law.'],
      ['Delete it and say nothing.', 3, 'Limits the risk, but the sender may keep making the same mistake, and a breach may go unreported.'],
      ['Email it back to the sender asking why you received it.', 2, 'Sending the data around again spreads it further.'],
    ],
  },
  {
    id: 'gen-colleague-bug', sec: 'gen', comp: 'teamwork', t: 'A bug while they\'re off sick',
    s: 'In a tech team, a colleague is off sick and a bug in their code needs fixing today.',
    r: [
      ['Tell your lead, offer to take it on, and document what you change for when they\'re back.', 4, 'Steps in for the team, keeps the lead informed, and makes the handover easy.'],
      ['Wait until they\'re back; it\'s their code.', 1, 'Leaving an urgent problem unfixed because of ownership lets the team and users down.'],
      ['Fix it quickly without telling anyone.', 2, 'Solves it, but nobody knows what changed or why.'],
      ['Message them at home to ask how to fix it.', 2, 'They\'re ill; the team should handle it without them.'],
    ],
  },
  {
    id: 'gen-signoff-away', sec: 'gen', comp: 'client', t: 'A signature nobody can give',
    s: 'In a public-sector role, someone urgently needs a form processed. It needs your manager\'s sign-off, and your manager is away this week.',
    r: [
      ['Explain the situation honestly, find who can sign in your manager\'s absence, and keep the person updated.', 4, 'Follows the rules while doing everything possible to help, and keeps the person informed.'],
      ['Sign it yourself to save time.', 1, 'Signing without authority breaks the process the sign-off exists to protect.'],
      ['Tell them to come back next week.', 2, 'Follows the rules, but makes no effort to help with an urgent need.'],
      ['Phone your manager on leave to ask them to sign.', 3, 'Gets it done, but there is usually a deputy who can sign instead.'],
    ],
  },
  {
    id: 'gen-too-many-meetings', sec: 'gen', comp: 'priorities', t: 'A calendar full of meetings',
    s: 'Your calendar is full of meetings and your actual work is falling behind.',
    r: [
      ['Check which meetings need you, ask to skip or get notes from the others, and block out focus time.', 4, 'Managing your own time actively, and openly, protects your work and other people\'s meetings.'],
      ['Accept every meeting and work in the evenings.', 2, 'Keeps everyone happy short term, but isn\'t sustainable.'],
      ['Stop going to meetings without telling anyone.', 1, 'Silently disappearing leaves people waiting and damages trust.'],
      ['Ask your manager which meetings matter most.', 3, 'Sensible, though you can usually judge most of it yourself first.'],
    ],
  },
];

// ---------------- scoring (shared with the tests) ----------------
const SJTScore = {
  RATING: ['', 'Counterproductive', 'Ineffective', 'Fairly effective', 'Very effective'],
  best: sc => sc.r.reduce((b, x, i) => (x[1] > sc.r[b][1] ? i : b), 0),
  worst: sc => sc.r.reduce((b, x, i) => (x[1] < sc.r[b][1] ? i : b), 0),
  // Most / least: one point each, out of 2
  mostLeast(sc, most, least) {
    return (most === SJTScore.best(sc) ? 1 : 0) + (least === SJTScore.worst(sc) ? 1 : 0);
  },
  // Rate each: 2 for the key's rating, 1 if one step off, out of 8
  rate(sc, ratings) {
    return sc.r.reduce((s, x, i) => s + (ratings[i] === x[1] ? 2 : Math.abs(ratings[i] - x[1]) === 1 ? 1 : 0), 0);
  },
  max: format => (format === 'rate' ? 8 : 2),
};

if (typeof module !== 'undefined') module.exports = { SJT_BANK, SJTScore };
