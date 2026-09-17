# Onboarding rethink

Design documents for the onboarding, not a build plan. Nothing here is
executable the way `docs/plan/phase-N.md` is: those describe what to build and
in what order, these describe what the onboarding should *ask* and why.

## Why this exists

Phase 4 built a working decision tree and testing it showed the questions sit
one layer too deep. It asks which **domains** you want to work on: Sleep,
Nutrition, Training, Appearance, Mindset, Productivity, Social, Hospitality,
Family, Finance.

Those are means. Nobody opens a habit tracker wanting "Training". They want to
look good, and that training is how you get there is the app's conclusion to
draw, not the user's to declare. Asking someone to pick "Training" assumes
they have already done the reasoning the app exists to do for them.

What a person actually arrives with is a want or a hurt. Good-looking. Rich.
Friends. Someone to come home to. Calmer. Less of a procrastinator. Or from
the other side: I put everything off, I am lonely, I do not trust myself.

The app's own five panels are already almost exactly that list, and
`DOMAINS[].panels` in `src/core/domains.ts` already carries the trickle-down
from a panel back to the habits that feed it. The picture has been speaking
the right language the whole time. Only the questions were not.

## How these documents were made

Written by Claude Fable from a brief, deliberately outside this repository so
the existing implementation would not steer the answer. The brief asked for
three passes:

1. Diverge. Several genuinely different ways in, each argued against honestly.
2. Choose one and write the whole tree, every question and answer in the words
   they appear in on screen, every branch, and where each path terminates.
3. Audit `src/content/catalog.json` against that tree, name the kinds of
   person the 123 items do not serve, and write the habits that are missing.

Two constraints shaped it and still bind anything built from it: no language
model runs inside the app, so the tree has to be static data, and every answer
is a tap rather than typed text.

## What happens next

An Opus planning session turns these into an executable phase plan under
`docs/plan/`, and that plan is what gets built. The tree design and the
technical plan stay two separate documents, because the first should survive
the second being rewritten.
