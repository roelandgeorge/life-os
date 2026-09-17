# Onboarding spec

> **Partly superseded.** `04-revisions.md` overrides §3.4, parts of §6 and §8, and the §9 checks
> that rest on them. Read it before building anything from this document.

This document is the source of truth. `onboarding-tree.json` and `landings.json` are the same content as static data. If they ever disagree, this document wins and the data is wrong.

## 1. What this replaces

The current onboarding asks, in order: which drawing is you, hair, partner, what they look like, children, which of ten domains to work on and in what order, then one screen per domain with three habits pre-checked. All of that goes. Nothing from it survives except the four profile fields.

The reason: it asks about means. Nobody wants "Training". They want to look good. Training is the answer, not the question, and knowing that is the app's job.

## 2. Principle

Point at the panel, then ask what's in the way.

The opener asks which of the five panels is furthest from where the person wants it. That one question lets a want and a hurt give the same answer without the app having to pick a register. The second question is asked about that panel only, in the panel's own words, and it is the question that selects habits.

## 3. Rules the tree follows

1. Every landing seeds at most two habits. One of them is daily wherever the domain has a daily habit. The People (network) domain and most Partner and Money landings have no daily habit, so those landings are the exception and `landings.json` marks them with `dailyAnchor: null`.
2. Nothing with cadence `situational` is ever seeded. Cadence `once` is seeded only where it gates a habit that is seeded alongside it (H127, H129, H136) or where it is the only honest answer (H077, H078).
3. Each landing shows one seed switched on and one offer switched off. The offer is a single tap to add. Nothing else is shown.
4. Two panels is the cap. After the second landing, the "One more?" screen is not shown.
5. Answering the profile questions never seeds anything. Off-panel seeds are forbidden.
6. The appearance questions come last. The first screen shows an unpersonalised grey figure. The personalised figure is drawn on the landing screen, next to the habits.
7. Copy is final. Every question, option and screen line appears exactly as written here. No exclamation marks, no congratulations, nothing is a journey.

## 4. Engine assumptions the onboarding depends on

These are decisions, not implementation detail. The tree does not work without them.

1. **Unfed panels hold.** A panel with no habit feeding it stays at its current step. It does not decay. If the engine currently decays unfed panels, that must change before this onboarding ships, otherwise "seed few" is impossible.
2. **The threshold must be defined for one and two habits.** With one or two seeded habits, a single miss is a total miss. Proposed rule, open to change: a panel moves on a rolling seven-day window. Daily habits count per day, weekly habits count once per week on their close-out day, monthly habits once per month. The panel moves up one step when at least five of the last seven days closed out well, down one step when two or fewer did, and holds otherwise. A day "closes out well" when every habit due that day was ticked. A panel cannot move more than one step per week in either direction.
3. **Requires is enforced everywhere.** `requires` on a catalogue item is checked against the Profile at seed time and on the discovery screens inside the app. New requirement values: `hair`, `gym`, `employed`, `self-employed`, `single`, plus habit ids (an item can require another item to be completed first). `single` means `partner == false`.
4. **The third panel is labelled People on screen.** The code may keep calling it network.

## 5. Profile

Written by the tree, needed to draw the figure:

- `gender` (from the drawing set)
- `hair` (from the drawing set, must include a none option)
- `partner` (true/false)
- `children` (true/false)

Also written by the tree, used only for `requires`: `gym`, `employed`, `self-employed`. All optional, default unset.

## 6. The tree

Question counts at the bottom. Landing ids in bold. Everything in quotes is on-screen copy, verbatim.

### Screen 0. No question.

Five grey panels, all at the middle step.

> This is you in fifteen years.
> Everything starts in the middle. It moves with what you do, both ways.

Button: **Go on**

### Q1

> Which one is furthest from where you want it?

Five cards. Each is the panel drawing at step 2, a label, one line under it. Then a sixth row in text only.

- **Body** / How you look. How you feel in it.
- **Head** / Calm, focus, doing what you said you'd do.
- **People** / Friends. Who you call, who calls you.
- **Partner** / Someone to come home to. Or the one already there.
- **Money** / What's in the account, and where it goes.
- None of them. I'm here to keep it that way. → **Z**, then straight to the situation block.

On a second visit (via Q-More) the chosen card is removed and the sixth row is not shown.

### Body

**Q2-Body** > What's the main thing?
- The weight. → Q3-Body-a
- No strength. No shape. → Q3-Body-b
- Tired all the time. → **B4**
- I've let myself go. Hair, skin, clothes. → **B5**
- All of it, a bit. → **B6**

**Q3-Body-a** > Which is more true?
- I eat too much of the wrong things. → **B1**
- I barely move. → **B2**

**Q3-Body-b** > Where would you train?
- A gym. → **B3** (sets gym)
- At home. Some kit. → **B3**
- Nowhere yet. → **B3n**

### Head

**Q2-Head** > What's the main thing?
- I put things off. → Q3-Head-a
- My head won't settle. → Q3-Head-b
- I say I'll do things and don't. → **H5**
- I feel behind. → **H6**
- Foggy. Can't hold a thought. → Q3-Head-c
- All of it, a bit. → **H8**

**Q3-Head-a** > Where does the time go instead?
- The phone. → **H1**
- Anything but the thing. → **H2**

**Q3-Head-b** > When is it worst?
- At night. → **H3**
- All day. → **H4**

**Q3-Head-c** > Do you sleep enough?
- Yes. → **H7a**
- No. → **H7b**
- No idea. → **H7b**

### People

**Q2-People** > What's the shape of it?
- I've lost touch with people I like. → **P1**
- There aren't many people to lose touch with. → Q3-People-a
- I have people. I never see them. → Q3-People-b
- I go quiet around people. → **P4**
- It's family. I don't call. → **P5**

**Q3-People-a** > Is there anything you go to every week? A club, a class, a game, a team.
- Yes. → **P2y**
- No. → **P2n**

**Q3-People-b** > Could you have four people over next month, without cooking?
- Yes. → **P3y**
- No. → **P3n**

### Partner

The two profile questions are asked here because the branch cannot proceed without them.

**Q2-Partner** > Is there someone? (writes `partner`)
- Yes. → Q3-Partner-y
- No. → Q3-Partner-n

**Q3-Partner-y** > Children? (writes `children`)
- Yes. → Q4-Partner-y
- No. → Q4-Partner-y

**Q4-Partner-y** > What's true?
- We're good. I want to keep it that way. → **Y1**
- We don't talk about anything that matters. → **Y2**
- It's all logistics now. → **Y3** if children, else **Y3n**
- We're thinking about children. → **Y4** (only shown when children is false)
- I'm not sure about us. → **Y5**

**Q3-Partner-n** > What's true?
- I'm not meeting anyone. → **N1**
- I meet people. It goes nowhere. → **N2**
- I'm not ready. I'd sort myself out first. → **N3**

### Money

**Q2-Money** > What's the main thing?
- Nothing gets saved. → **M1**
- I don't know where it goes. → **M2**
- I don't earn enough. → Q3-Money (low)
- Debt. → **M4**
- It's fine. I want it to grow. → Q3-Money (grow)

**Q3-Money** > Employed, or your own thing?
- Employed. → **M3e** or **M5e** (sets employed)
- My own thing. → **M3s** or **M5s** (sets self-employed)
- Both. → same as "My own thing" (sets both)

### Q-More

Shown once, after the first landing, unless Q1 was answered "None of them".

> One more, or is that it?
- One more. → Q1 with the chosen card removed
- That's it. → situation block

### Situation block

Skipped entirely when the Partner branch already answered both.

Header: > Two things the drawing needs.

> Is there someone? (skipped if `partner` set)
- Yes. / No.

> Children? (skipped if `children` set)
- Yes. / No.

### The figure

> Now the figure. Which one?
Options are the gender drawings, shown as drawings.

> Hair?
Options are the hair drawings, shown as drawings. Must include none.

### Landing screen

Personalised figure, all five panels at step 2. Under it the seeded habits switched on, the offers switched off with a one-tap add, and two lines of copy.

> Fifteen years out. Everything in the middle.
> One box today. / Two boxes today. / Three boxes today. / Four boxes today. / Nothing due today.

The count is the number of seeded habits across both landings with cadence `daily`. When it is zero, the weekly seeds are listed under "Nothing due today." No tour, no tips, no next button. This is the app's main screen.

## 7. Landings

See `landings.json`. Summary, seed first, then offer:

| Landing | Who | Seeds | Offer |
|---|---|---|---|
| Z | Fine, wants to stay that way | H001, H020 | H057 |
| B1 | Weight, eats badly | H014 | H020 |
| B2 | Weight, sedentary | H020 | H014 |
| B3 | Strength, has somewhere to train | H019, H020 | H023 |
| B3n | Strength, nowhere to train | H020, H124 | H019 |
| B4 | Tired | H001 | H003 |
| B5 | Let it go | H036, H033 (if hair) | H125 |
| B6 | Body, everything | H001, H020 | H014 |
| H1 | Procrastinates, phone | H057, H066 | H065 |
| H2 | Procrastinates, general | H057 | H059 |
| H3 | Restless at night | H003, H006 | H007 |
| H4 | Restless all day | H126 | H056 |
| H5 | Doesn't trust own word | H057 | H051 |
| H6 | Feels behind | H048, H127 | H053 |
| H7a | Foggy, sleeps fine | H058 | H065 |
| H7b | Foggy, doesn't sleep | H001 | H003 |
| H8 | Head, everything | H057, H001 | H048 |
| P1 | Lost touch | H128 | H079 |
| P2y | Few people, has a regular thing | H072 | H079 |
| P2n | Few people, no regular thing | H129, H130 | H072 |
| P3y | Has people, can host | H079, H131 | H080 |
| P3n | Has people, can't host | H131 | H079 |
| P4 | Goes quiet | H052 | H068 |
| P5 | Family | H073 | H128 |
| N1 | Single, not meeting anyone | H132 | H129 |
| N2 | Single, goes nowhere | H052 | H069 |
| N3 | Single, not ready | H001, H020 | none |
| Y1 | Couple, good | H075, H133 | H077 |
| Y2 | Couple, don't talk | H133, H077 | H075 |
| Y3 | Couple, logistics, kids | H133, H074 | H076 |
| Y3n | Couple, logistics, no kids | H133 | H075 |
| Y4 | Thinking about children | H078, H075 | H133 |
| Y5 | Not sure about us | H133 | H077 |
| M1 | Nothing saved | H082, H134 | H083 |
| M2 | Don't know where it goes | H083, H134 | H082 |
| M3e | Underpaid, employed | H135 | H071 |
| M3s | Underpaid, own thing | H087, H085 | H086 |
| M4 | Debt | H136, H137 | H134 |
| M5e | Fine, employed | H082, H134 | H135 |
| M5s | Fine, own thing | H087, H086 | H084 |

Two choices that look odd and are deliberate. H5 gets "plan tomorrow tonight" rather than H051 "keep promises to yourself", because H051 is what the app is and seeding it is seeding a mirror. N3 seeds the two foundations and leaves the partner panel unfed, because the person said they are not ready and the app should not pretend to have something.

## 8. Path lengths

Counting question taps only:

- Shortest: 5 (Q1 none, partner, children, gender, hair)
- Typical: 7 or 8 (Q1, Q2, Q3, Q-More, partner, children, gender, hair)
- Longest: 11 (Q1, Q2, Q3, Q-More, Q1, Q2, Q3, partner, children, gender, hair)

The Partner branch moves the two profile questions earlier and adds none, so 11 holds there too.

## 9. Acceptance checks

- Every landing in `landings.json` is reachable from Q1 by some path.
- Every seed and offer id exists in `catalog.json`.
- No seeded item has cadence `situational`.
- Seeded items with cadence `once` are exactly H077, H078, H127, H129, H136 and nothing else.
- The longest path is 11 question taps and the shortest is 5.
- The Partner branch never asks partner or children twice.
- Q1 on second visit never shows the panel already chosen and never shows "None of them".
- H033 is not seeded when `hair == none`.
- Every string on every screen matches this document character for character.
- The old onboarding (domain picker, per-domain habit screens, "which drawing is you" as the first question) is gone.
