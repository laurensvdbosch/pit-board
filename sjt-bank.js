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

  // ======================= MORE FINANCE =======================
  {
    id: 'fin-code-rewrite', sec: 'fin', comp: 'learning', t: 'Your code, rewritten',
    s: 'A senior quant reviews your pricing code and rewrites half of it without explaining why.',
    r: [
      ['Ask them to walk you through the main changes when they have a moment, so you understand the reasons.', 4, 'Understanding why it was changed is how you stop the same issues coming back.'],
      ['Accept the changes and move on.', 2, 'The code is better, but you\'ve learned nothing from it.'],
      ['Change it back where you preferred your own version.', 1, 'Undoing a senior\'s review without discussing it damages trust and may reintroduce bugs.'],
      ['Study the changes yourself and keep notes on the patterns they used.', 3, 'Good self-directed learning; a short conversation would fill the gaps faster.'],
    ],
  },
  {
    id: 'fin-same-mistake', sec: 'fin', comp: 'learning', t: 'The same mistake, three times',
    s: 'Your manager points out the same formatting mistake in your pitch book for the third time.',
    r: [
      ['Apologise, and make a short checklist you run through before sending anything.', 4, 'A simple system fixes a repeated mistake in a way good intentions don\'t.'],
      ['Explain that formatting isn\'t the important part of the work.', 1, 'In client-facing work, presentation is part of quality; dismissing it looks careless.'],
      ['Ask a colleague to check your work every time.', 2, 'It catches the error, but uses someone else\'s time instead of fixing the habit.'],
      ['Fix it and promise to be more careful.', 3, 'The right attitude, but a promise alone hasn\'t worked twice already.'],
    ],
  },
  {
    id: 'fin-quiet-week', sec: 'fin', comp: 'initiative', t: 'A quiet week on the desk',
    s: 'It\'s a quiet week on the desk and nobody has given you any work.',
    r: [
      ['Ask your manager or senior colleagues what would help, and suggest a small piece of research you could do.', 4, 'Asking and proposing something concrete shows initiative while staying useful to the team.'],
      ['Read the news and wait to be asked.', 2, 'Keeping up with markets helps, but waiting looks passive.'],
      ['Prepare a short note on a topic you think the desk would find useful, then share it.', 3, 'Proactive and helpful; checking what the desk needs first would make it more useful.'],
      ['Leave early, since there\'s nothing to do.', 1, 'Being visibly absent in a quiet week is noticed and suggests a lack of interest.'],
    ],
  },
  {
    id: 'fin-client-faq', sec: 'fin', comp: 'initiative', t: 'The same question from every client',
    s: 'While preparing client reports, you notice that several clients are asking the same question about a new regulation.',
    r: [
      ['Suggest to your manager a short note for all clients on the topic, and offer to draft it.', 4, 'Spotting a pattern and offering a scalable fix is valuable initiative, with your manager\'s approval.'],
      ['Keep answering each client separately as the questions come in.', 3, 'Every client gets an answer, but the team repeats the same work.'],
      ['Write a note and send it to all clients yourself.', 1, 'Client communication on regulation must be approved; sending it yourself is a real risk.'],
      ['Mention it to a colleague in passing.', 2, 'The idea may never reach someone who can act on it.'],
    ],
  },
  {
    id: 'fin-no-offer', sec: 'fin', comp: 'resilience', t: 'No return offer',
    s: 'You don\'t get the return offer you hoped for after your summer internship. Another bank has invited you to its graduate assessment centre next month.',
    r: [
      ['Ask for feedback on your internship, work on the points raised, and prepare for the new assessment centre.', 4, 'Turning a setback into specific improvements is exactly what resilience looks like.'],
      ['Decide finance isn\'t for you and withdraw from the assessment centre.', 1, 'One outcome rarely means the whole path is wrong; withdrawing throws away a real chance.'],
      ['Go to the assessment centre without thinking about what happened.', 2, 'You keep going, but may repeat whatever held you back.'],
      ['Take a week to reset, then prepare properly for the new assessment centre.', 3, 'Healthy and forward-looking; feedback from the internship would make the preparation sharper.'],
    ],
  },
  {
    id: 'fin-volatile-day', sec: 'fin', comp: 'resilience', t: 'The same report, four times',
    s: 'On a very volatile market day, you\'re asked to update the same risk report four times as prices keep moving.',
    r: [
      ['Stay calm, update it each time, and later suggest an automatic refresh for days like this.', 4, 'Composed under pressure, and turning the frustration into an improvement.'],
      ['Complain to the team that the requests are pointless.', 1, 'Risk numbers matter most on volatile days; complaining shows poor judgement and hurts morale.'],
      ['Update it carefully each time without comment.', 3, 'Reliable and calm; suggesting an improvement afterwards would add more.'],
      ['Update it less carefully each time to keep up.', 2, 'Speed matters, but a sloppy risk report on a volatile day can be costly.'],
    ],
  },
  {
    id: 'fin-busy-md-email', sec: 'fin', comp: 'communication', t: 'An email to a busy MD',
    s: 'You need to tell a busy MD that a client meeting has moved and that two documents need changes before it.',
    r: [
      ['Send a short email with the key facts first: the new time, what needs changing, and what you need from them.', 4, 'Busy senior people read the first lines; leading with facts and the ask gets action.'],
      ['Write a long email explaining the full background.', 2, 'Complete, but the key points may be missed.'],
      ['Wait until you see them in person.', 1, 'Time-sensitive information shouldn\'t depend on bumping into someone.'],
      ['Message the new time on chat, and send the document details by email.', 3, 'Quick, though splitting it across channels makes it easier to miss part.'],
    ],
  },
  {
    id: 'fin-flawed-proposal', sec: 'fin', comp: 'communication', t: 'You see a flaw',
    s: 'In a team meeting, your VP proposes an approach that you think rests on a flawed assumption.',
    r: [
      ['Raise it respectfully, explain the assumption and its effect, and ask whether you\'ve missed something.', 4, 'Constructive challenge, open to being wrong, is valued at every level.'],
      ['Say nothing; they\'re more senior.', 2, 'Seniority doesn\'t make an assumption right, and the team may build on the flaw.'],
      ['Tell the VP in front of everyone that the approach is wrong.', 1, 'Blunt public contradiction puts people on the defensive and the point gets lost.'],
      ['Mention it to the VP privately after the meeting.', 3, 'Respectful and safe, though the team may already be moving on it.'],
    ],
  },
  {
    id: 'fin-confirm-error', sec: 'fin', comp: 'client', t: 'The client spots your error',
    s: 'A client points out an error in a trade confirmation you prepared.',
    r: [
      ['Thank them, confirm the error, correct it immediately, and tell your manager what happened.', 4, 'Fast, honest correction keeps the client\'s trust, and your manager isn\'t surprised later.'],
      ['Fix it quietly without telling your manager.', 2, 'The client gets the fix, but your manager may need to know about errors that reach clients.'],
      ['Tell the client the system caused the error.', 1, 'Deflecting blame to a system the client can\'t see sounds like an excuse and erodes trust.'],
      ['Apologise and pass it to the operations team to fix.', 3, 'Responsive, but owning the follow-up yourself is better than handing it off.'],
    ],
  },
  {
    id: 'fin-twenty-minutes', sec: 'fin', comp: 'priorities', t: 'A chart in 20 minutes',
    s: 'Your manager asks for a quick chart for a meeting in 20 minutes. You\'re halfway through an analysis due tomorrow.',
    r: [
      ['Make the chart now, check it, and then go back to the analysis.', 4, 'The chart is urgent and short; tomorrow\'s deadline still has room.'],
      ['Say you\'re busy and offer to do it after the meeting.', 2, 'Help after the meeting is no help for the meeting.'],
      ['Make a rushed chart in five minutes without checking the numbers.', 1, 'A wrong number in a meeting is worse than no chart at all.'],
      ['Ask a colleague whether they can make the chart.', 3, 'May work, but it hands off a quick task your manager asked you for.'],
    ],
  },
  {
    id: 'fin-holiday-handover', sec: 'fin', comp: 'teamwork', t: 'Holiday during a live deal',
    s: 'You\'re going on holiday for a week in the middle of a live deal.',
    r: [
      ['Write a clear handover note, walk a colleague through it, and say how to reach you in an emergency.', 4, 'A proper handover protects the deal and your colleagues, and lets you switch off.'],
      ['Leave your files on the shared drive.', 2, 'The files are there, but nobody knows where things stand.'],
      ['Tell nobody and deal with any questions when you\'re back.', 1, 'Leaving a live deal with no handover puts the team and the client at risk.'],
      ['Send a handover email the evening before you leave.', 3, 'Useful, but there\'s no time left for questions.'],
    ],
  },
  {
    id: 'fin-broker-tickets', sec: 'fin', comp: 'integrity', t: 'Concert tickets from a broker',
    s: 'A broker you deal with offers you expensive concert tickets.',
    r: [
      ['Check the gifts policy and with compliance before accepting, and record it if it\'s allowed.', 4, 'Gifts can create conflicts of interest; following the policy protects you and the firm.'],
      ['Accept; it\'s normal in the industry.', 1, 'Expensive gifts can breach rules on inducements, and "everyone does it" is no defence.'],
      ['Decline politely without checking anything.', 3, 'Safe, though the policy might have allowed it if recorded properly.'],
      ['Accept, and mention it to your manager afterwards.', 2, 'Being open is good, but compliance needs to approve before you accept, not after.'],
    ],
  },

  // ============== MORE CONSULTING & BIG 4 ==============
  {
    id: 'pro-talked-too-much', sec: 'pro', comp: 'learning', t: '"You didn\'t let the client talk"',
    s: 'After a client workshop, a partner tells you that you spoke too much and didn\'t give the client room to talk.',
    r: [
      ['Thank them, ask what they\'d have done differently, and focus on listening in the next session.', 4, 'Open, specific and acted on: the most effective way to take feedback.'],
      ['Explain that the client seemed engaged.', 2, 'You may see it differently, but defending yourself first sounds like you aren\'t listening.'],
      ['Tell colleagues the partner was being unfair.', 1, 'Complaining about feedback behind someone\'s back harms your reputation more than the feedback did.'],
      ['Note it, and watch how the partner runs the next workshop.', 3, 'Good learning by observation; asking directly would add detail.'],
    ],
  },
  {
    id: 'pro-new-tool', sec: 'pro', comp: 'learning', t: 'A tool you\'ve never used',
    s: 'Your team uses a data tool you\'ve never used, and you\'re expected to work with it from next week.',
    r: [
      ['Do the internal training, and ask a colleague to show you how the team uses it.', 4, 'Formal training plus how the team really works with it gets you ready fastest.'],
      ['Wait and learn it once the work starts.', 2, 'You\'ll learn it, but slowly and under deadline pressure.'],
      ['Tell your manager you\'re not familiar with it and hope someone else takes that part.', 1, 'Avoiding a core skill limits what you can be given and how you\'re seen.'],
      ['Teach yourself with online tutorials this week.', 3, 'Proactive, though the team\'s own way of using it may differ.'],
    ],
  },
  {
    id: 'pro-slide-template', sec: 'pro', comp: 'initiative', t: 'The same slides, every time',
    s: 'You notice that every engagement rebuilds the same set of slides from scratch.',
    r: [
      ['Propose a shared template to your manager and offer to build the first version.', 4, 'A concrete improvement with an offer to do the work is exactly what firms reward.'],
      ['Keep rebuilding them; that\'s how things are done.', 2, 'Reliable, but it misses an obvious saving.'],
      ['Complain to colleagues that the firm is inefficient.', 1, 'Complaining without proposing anything changes nothing and spreads negativity.'],
      ['Build yourself a personal template.', 3, 'Saves you time; sharing it would help the whole team.'],
    ],
  },
  {
    id: 'pro-fraud-signal', sec: 'pro', comp: 'initiative', t: 'Something outside your area',
    s: 'While testing a client\'s data on an audit, you notice something outside your area that might point to a fraud risk.',
    r: [
      ['Write down exactly what you saw and raise it with your senior straight away.', 4, 'Possible fraud must be escalated quickly and factually; it isn\'t yours to investigate alone.'],
      ['Investigate it yourself in your spare time before telling anyone.', 2, 'Well meant, but it delays escalation and could tip off the client.'],
      ['Ignore it; it isn\'t your area.', 1, 'Auditors must raise possible fraud wherever they see it.'],
      ['Mention it at the end-of-week team catch-up.', 3, 'It gets raised, but possible fraud shouldn\'t wait days.'],
    ],
  },
  {
    id: 'pro-near-burnout', sec: 'pro', comp: 'resilience', t: 'Close to burning out',
    s: 'You\'ve worked long hours for weeks during busy season and feel close to burning out.',
    r: [
      ['Talk to your manager or counsellor about your workload, and protect some time to recover.', 4, 'Raising it early lets the firm adjust before your health or work suffers.'],
      ['Keep going and say nothing; busy season ends eventually.', 2, 'Sometimes it works, but it risks a crash at the worst moment.'],
      ['Start missing deadlines without explanation.', 1, 'Unexplained missed deadlines damage trust and don\'t solve the workload.'],
      ['Talk to a colleague or friend about how you feel.', 3, 'Support helps, though nothing changes unless someone who sets your workload knows.'],
    ],
  },
  {
    id: 'pro-rude-client', sec: 'pro', comp: 'resilience', t: 'A rude client contact',
    s: 'A client contact is consistently rude to you in meetings.',
    r: [
      ['Stay professional, and tell your manager so they can decide whether to address it.', 4, 'You keep your composure, and the person responsible for the relationship can act.'],
      ['Respond in the same tone.', 1, 'Matching rudeness escalates it and reflects badly on the firm.'],
      ['Avoid speaking in meetings with them.', 2, 'Protects you short term, but your contribution suffers.'],
      ['Stay professional and let it go.', 3, 'Composed, but if it continues your manager should know.'],
    ],
  },
  {
    id: 'pro-behind-schedule', sec: 'pro', comp: 'communication', t: 'A status update when you\'re behind',
    s: 'Your manager asks for a quick status update on your workstream, which is behind schedule.',
    r: [
      ['Give an honest update: where it stands, why it\'s late, and your plan to catch up.', 4, 'Honest, concise and solution-focused: your manager can plan around it.'],
      ['Say it\'s going fine and work late to catch up.', 1, 'Hiding a delay means it surfaces later, when it\'s harder to fix.'],
      ['Explain the reasons for the delay in detail, without a plan.', 2, 'Honest, but your manager needs to know what happens next.'],
      ['Say it\'s slightly behind and that you\'ll update them properly tomorrow.', 3, 'Honest, though a clear plan now would help them more.'],
    ],
  },
  {
    id: 'pro-earlier-deadline', sec: 'pro', comp: 'client', t: 'Two days earlier, please',
    s: 'A client asks whether a report can arrive two days earlier than agreed. You don\'t think the team can do it at the right quality.',
    r: [
      ['Say you\'ll check with the engagement manager and come back today with what\'s realistic.', 4, 'Takes the request seriously without overpromising, and involves the person who decides.'],
      ['Agree straight away to keep them happy.', 1, 'Committing the team without checking risks a rushed report or a missed promise.'],
      ['Say no immediately.', 2, 'Honest, but there may be options, such as an early draft, that your manager would offer.'],
      ['After checking with your manager, offer an early draft of the key findings.', 3, 'A useful compromise; just make sure it\'s agreed before you offer it.'],
    ],
  },
  {
    id: 'pro-client-gossip', sec: 'pro', comp: 'client', t: 'Gossip at a client dinner',
    s: 'At a client dinner, the client\'s CFO starts telling you personal details about one of their colleagues.',
    r: [
      ['Politely steer the conversation to another topic.', 4, 'Keeps the relationship warm without joining in on gossip about someone who isn\'t there.'],
      ['Join in to build rapport.', 1, 'Joining gossip about a client\'s staff can embarrass everyone and damage trust in you.'],
      ['Listen without commenting.', 2, 'Neutral, but it lets an awkward conversation carry on.'],
      ['Excuse yourself from the table for a moment.', 3, 'Avoids it, though a gentle change of subject is smoother.'],
    ],
  },
  {
    id: 'pro-small-requests', sec: 'pro', comp: 'priorities', t: 'Death by small requests',
    s: 'Your days fill up with small requests from the team, and your main analysis keeps slipping.',
    r: [
      ['Plan your day around the main analysis, batch the small requests, and tell people when you\'ll get to them.', 4, 'Protects the important work while staying responsive and open about timing.'],
      ['Deal with each request as it arrives.', 2, 'Helpful, but the main deliverable keeps slipping.'],
      ['Ignore the small requests.', 1, 'Ignoring colleagues damages the team and the requests may matter.'],
      ['Ask your manager to help you prioritise the requests.', 3, 'Sensible if it keeps happening, though you can often manage it yourself first.'],
    ],
  },
  {
    id: 'pro-two-offices', sec: 'pro', comp: 'teamwork', t: 'The other office is left out',
    s: 'Your team is split across two offices, and the other office often isn\'t told about decisions.',
    r: [
      ['Suggest a short written summary after each meeting, and offer to send it.', 4, 'A simple, owned fix that keeps the whole team aligned.'],
      ['Accept it; they can ask if they need something.', 1, 'People can\'t ask about decisions they don\'t know were made.'],
      ['Forward them things when you remember.', 2, 'Helps sometimes, but it isn\'t reliable.'],
      ['Raise the problem with your manager.', 3, 'Useful, especially with a suggested fix.'],
    ],
  },
  {
    id: 'pro-hours-pressure', sec: 'pro', comp: 'integrity', t: '"Don\'t record all your hours"',
    s: 'Your manager asks the team not to record all the hours they work, so the engagement looks on budget.',
    r: [
      ['Record your hours accurately, and raise your concern with your manager, or the firm\'s ethics contact if needed.', 4, 'Accurate records matter for pricing, staffing and wellbeing; there are proper routes to raise concerns.'],
      ['Under-record like everyone else.', 1, 'False time records hide real costs and are a breach of firm policy.'],
      ['Record your hours accurately but say nothing.', 3, 'You stay honest, though the wider problem continues.'],
      ['Record fewer hours, but keep a private note of the real ones.', 2, 'A private note doesn\'t fix the false official record.'],
    ],
  },

  // ======================= MORE GENERAL =======================
  {
    id: 'gen-new-jargon', sec: 'gen', comp: 'learning', t: 'Lost in the jargon',
    s: 'You\'ve rotated into a new team on your graduate scheme and don\'t understand much of the terminology.',
    r: [
      ['Keep a list of terms, ask colleagues about them at sensible moments, and read up in your own time.', 4, 'Structured, quick, and respectful of other people\'s time.'],
      ['Nod along and hope it becomes clear.', 1, 'Pretending to understand leads to mistakes and makes it harder to ask later.'],
      ['Ask about every unfamiliar term the moment you hear it, even mid-meeting.', 2, 'Curious, but constant interruptions disrupt meetings.'],
      ['Look everything up yourself without asking anyone.', 3, 'Good independence, though some terms are team-specific and best explained by colleagues.'],
    ],
  },
  {
    id: 'gen-peer-feedback', sec: 'gen', comp: 'learning', t: 'Feedback from a peer',
    s: 'A colleague at your level tells you that your emails are hard to follow.',
    r: [
      ['Thank them, ask for an example, and try a clearer structure.', 4, 'Feedback is valuable from anyone; asking for an example makes it usable.'],
      ['Ignore it; they\'re not your manager.', 1, 'Good feedback doesn\'t need seniority, and dismissing it can sour the relationship.'],
      ['Check with your manager whether others find the same.', 3, 'A reasonable sense check, though you could simply try improving first.'],
      ['Thank them but change nothing.', 2, 'Polite, but nothing improves.'],
    ],
  },
  {
    id: 'gen-charity-event', sec: 'gen', comp: 'initiative', t: 'Someone to organise the charity event',
    s: 'Your team is looking for someone to organise a charity event alongside their normal work.',
    r: [
      ['Volunteer if you can manage it with your workload, and agree the time with your manager.', 4, 'Taking initiative while being realistic about your main job is the ideal balance.'],
      ['Volunteer, and let your normal work slip.', 1, 'Extra activities don\'t make up for missed core work.'],
      ['Stay quiet; it isn\'t part of your job.', 2, 'Not wrong, but you miss a chance to contribute and build relationships.'],
      ['Offer to help whoever leads it with smaller tasks.', 3, 'A good middle ground if you can\'t take on the whole thing.'],
    ],
  },
  {
    id: 'gen-signup-idea', sec: 'gen', comp: 'initiative', t: 'An idea for someone else\'s project',
    s: 'You have an idea that could improve the customer sign-up process, but it isn\'t your project.',
    r: [
      ['Write it up briefly and share it with the project lead.', 4, 'Good ideas help most when they reach the person who can use them.'],
      ['Keep it to yourself, since it isn\'t your project.', 2, 'Respects boundaries, but the idea is lost.'],
      ['Change the sign-up page yourself.', 1, 'Changing someone else\'s live process without agreement can break things and trust.'],
      ['Mention it to your manager and ask how best to raise it.', 3, 'Sensible route, though sharing directly with the lead is often fine.'],
    ],
  },
  {
    id: 'gen-tough-questions', sec: 'gen', comp: 'resilience', t: 'A presentation that went badly',
    s: 'You presented to senior management and couldn\'t answer several of their tough questions.',
    r: [
      ['Follow up with the answers by email, and ask your manager how to prepare better next time.', 4, 'Closing the loop shows ownership, and asking for advice builds the skill.'],
      ['Avoid presenting again.', 1, 'Avoiding it makes the next one harder and limits your growth.'],
      ['Tell yourself it doesn\'t matter.', 2, 'Moving on is fine, but the open questions and the lessons are left behind.'],
      ['Prepare much harder for your next presentation.', 3, 'Good resolve; answering the open questions now would complete it.'],
    ],
  },
  {
    id: 'gen-requirements-change', sec: 'gen', comp: 'resilience', t: 'Requirements changed halfway',
    s: 'Halfway through a project, the requirements change and much of your work has to be redone.',
    r: [
      ['Ask what changed and why, then re-plan the work with your team.', 4, 'Understanding the reason lets you adapt well and avoid redoing it again.'],
      ['Complain that the change wasn\'t thought through.', 1, 'Complaining doesn\'t help, and it may not be true.'],
      ['Redo the work as quickly as possible without asking questions.', 3, 'Adaptable, but you might redo it the wrong way.'],
      ['Keep the old version going in case they change their mind.', 2, 'Hedging wastes effort and splits your focus.'],
    ],
  },
  {
    id: 'gen-plain-language', sec: 'gen', comp: 'communication', t: 'Explaining tech to marketing',
    s: 'You need to explain a technical issue to a colleague in the marketing team.',
    r: [
      ['Explain it in plain language with an example, and check they\'ve understood.', 4, 'Adapting to your audience and checking understanding is the core of good communication.'],
      ['Use the technical terms; they can look them up.', 1, 'Putting the effort on the listener makes the message likely to fail.'],
      ['Send them a link to the technical documentation.', 2, 'Accurate, but probably not what they need.'],
      ['Give a simple summary and offer more detail if they want it.', 3, 'Clear and kind; checking they\'ve understood would complete it.'],
    ],
  },
  {
    id: 'gen-who-does-what', sec: 'gen', comp: 'communication', t: 'Who agreed to do what?',
    s: 'After a meeting, nobody seems sure who agreed to do what.',
    r: [
      ['Send a short summary of actions, owners and deadlines, and ask people to correct anything.', 4, 'A clear written record turns a vague meeting into action.'],
      ['Assume someone else will follow up.', 1, 'If everyone assumes that, nothing happens.'],
      ['Ask the meeting organiser to send a summary.', 3, 'Helpful, though you could simply offer to do it.'],
      ['Just do the actions you remember being yours.', 2, 'You do your part, but the rest may be dropped.'],
    ],
  },
  {
    id: 'gen-social-media', sec: 'gen', comp: 'client', t: 'A complaint on social media',
    s: 'A member of the public complains about your organisation on social media. A colleague suggests you reply from your personal account.',
    r: [
      ['Explain you shouldn\'t reply personally, and pass it to the team that handles public comments.', 4, 'Public responses are best handled by the people trained and authorised to do it.'],
      ['Reply from your own account defending the organisation.', 1, 'A personal, defensive reply can escalate things and breach social media policy.'],
      ['Ignore it.', 2, 'Doesn\'t make things worse, but the complaint may go unanswered.'],
      ['Reply politely from your own account, pointing them to the official complaints route.', 3, 'Helpful and polite, though many organisations prefer staff not to reply personally.'],
    ],
  },
  {
    id: 'gen-conflicting-managers', sec: 'gen', comp: 'priorities', t: 'Two managers, two instructions',
    s: 'Two managers give you conflicting instructions about the same task.',
    r: [
      ['Point out the conflict to both, explain what each instruction means for the task, and ask them to agree.', 4, 'Surfaces the conflict openly so the people responsible can resolve it.'],
      ['Follow whichever manager is more senior.', 2, 'Often what happens, but the other manager is left unaware.'],
      ['Do a mix of both.', 1, 'Satisfies neither, and may produce something that doesn\'t work.'],
      ['Ask your own line manager which to follow.', 3, 'A sensible route, though both managers should hear the outcome.'],
    ],
  },
  {
    id: 'gen-holiday-cover', sec: 'gen', comp: 'priorities', t: 'Covering a colleague\'s work',
    s: 'You\'re covering a colleague\'s work while they\'re on holiday, and your own deadlines are tight.',
    r: [
      ['List both workloads, flag the clashes to your manager, and agree what can wait.', 4, 'Makes the trade-offs visible so the right things get done.'],
      ['Do their work first; covering is a favour to them.', 2, 'Kind, but your own deadlines matter just as much.'],
      ['Leave their work until they\'re back.', 1, 'Cover means the work continues; leaving it lets people down.'],
      ['Do what you can of both, working late if needed.', 3, 'Committed, but not sustainable without your manager knowing.'],
    ],
  },
  {
    id: 'gen-director-praise', sec: 'gen', comp: 'teamwork', t: 'Praise from a director',
    s: 'A director praises your team\'s project and thanks you personally.',
    r: [
      ['Thank them, and mention the colleagues who did key parts of the work.', 4, 'Gracious, and it makes sure credit reaches everyone who earned it.'],
      ['Accept the praise.', 2, 'Fine, though the rest of the team goes unmentioned.'],
      ['Accept it and add that you did most of the work.', 1, 'Claiming the credit undermines the team and is often noticed.'],
      ['Say it was mostly the others\' work, even though you did a lot of it.', 3, 'Generous, though it\'s fine to accept your share too.'],
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
