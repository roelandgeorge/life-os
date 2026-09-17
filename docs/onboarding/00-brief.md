# Brief: replace the onboarding

Read everything in this folder before writing anything. Then produce a plan and wait for approval before you change a file.

## What is in this folder

- `00-brief.md` (this file). What to do and in what order.
- `01-onboarding-spec.md`. The source of truth. Every screen, every question, every option, every landing, in the words that go on screen. Section 4 lists engine decisions the onboarding depends on. Section 9 is the acceptance list.
- `02-catalog-changes.md`. Edits to existing catalogue items, new requirement vocabulary, 14 new items.
- `catalog.json`. Full replacement catalogue, 137 items.
- `onboarding-tree.json`. The tree from the spec as static data.
- `landings.json`. Landing id to seeds and offers.

## Constraints

- No language model runs in the app. Local-only, offline, no account, no server. The tree is static data and nothing else.
- Every answer is a tap. No typing anywhere in onboarding.
- The onboarding terminates in a set of catalogue habit ids and a Profile carrying `gender`, `hair`, `partner`, `children`, plus the optional `gym`, `employed`, `self-employed`.
- Copy is final. Every string on screen must match the spec character for character. Do not rephrase, do not add helper text, do not add a progress indicator, do not add a back button unless one already exists in the app's chrome.
- No exclamation marks anywhere. Nothing is congratulated. Nothing is a journey.
- Do not touch the drawing system, the panel step logic, or the daily tick screen except where section 4 of the spec requires it.
- Code comments explain logic and structure only. No comments about what was here before, no iteration notes, no version history in the code.

## Order of work

Do these as separate steps, each with its own commit. Stop after step 1 and show the plan.

1. **Plan.** Restate in your own words what changes, list every file you expect to touch, and list every place in the current code that assumes something the spec contradicts (decaying unfed panels, domain picker, three pre-checked habits per domain, the thresholds). Wait for approval.
2. **Catalogue.** Replace `catalog.json` with the one in this folder. Verify 137 items, no duplicate ids, every `requires` value is either a known key or an existing habit id. Extend the `requires` check to the new vocabulary everywhere it is evaluated, including the in-app discovery screens.
3. **Engine.** Implement spec section 4: unfed panels hold, the rolling seven-day threshold for one and two habits, requires enforced at seed time. Do not change anything else in the engine.
4. **Tree data.** Load `onboarding-tree.json` and `landings.json` as static data. Write a validation that runs in tests: every landing reachable, every id exists in the catalogue, no situational item seeded, once-items seeded are exactly H077, H078, H127, H129, H136, longest path 11, shortest 5, partner and children never asked twice, Q1 second visit hides the chosen card and the none row.
5. **Screens.** Build the onboarding screens from the tree data. One thumb, standing up: options are large tap targets, one per row or one per card, nothing below the fold on a phone. The first screen shows the unpersonalised grey figure. The landing screen is the app's main screen with the personalised figure, seeds on, offers off with a one-tap add, and the count line.
6. **Remove the old onboarding.** Domain picker, per-domain habit screens, the drawing questions as the opener, the partner-appearance question. Anything only they used goes too.
7. **Verify.** Walk every path in the spec on a phone-sized viewport and tick the acceptance list in spec section 9. Report which items passed and which did not, with no softening.

## What to do when the spec is silent

Ask. Do not invent copy, do not invent a screen, do not add a habit that is not in `landings.json`. If a landing cannot be reached or a habit cannot be seeded because of something in the current code, say so and stop.
