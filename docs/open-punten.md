# Open points

What is known to be unfinished or wrong, in one place. Each entry says what
it is, how it is known, and where the code lives. It does not say what to do
about it unless the decision is already made somewhere.

For what is *planned* rather than broken, see [`plan/PLAN.md`](plan/PLAN.md).
For why the built app departs from the spec, see `README.md`.

Last checked against `main` on 2026-10-03.

---

## 1. Push is single-user

`api/subscribe.ts` writes the one subscription to a fixed blob path
(`SUBSCRIPTION_PATH`), so a second person switching the reminder on silently
replaces the first. Everything else in the app is per-device and already
works for any number of users.

Fix before the app is shared: one blob per subscription, and a cron that
walks them all.

`api/subscribe.ts`, `api/cron.ts`.

## 2. Two of the five panels have no artwork

`public/avatar/` holds 15 drawings: `body`, `network` and `wealth`, five
states each. `head` and `partner` have none, and `public/avatar/you/` does not
exist at all.

Two consequences:

- Those two panels render as nothing. The figure is three layers, not five.
- **Gender and hair currently change no pixel.** They only feed the variant
  chain for `head` and `partner`, which has no files to resolve to. The
  onboarding asks two questions whose answers are invisible.

`docs/artwork-guide.md` says what to draw and under what filename.
`npm run slice` cuts a contact sheet, `npm run manifest` regenerates
`src/content/artwork.json`.

## 3. Catalogue thin spots

Recorded in `docs/onboarding/02-catalog-changes.md` and
`docs/plan/phase-4.md`, repeated here so they are not rediscovered:

- **Hospitality** has 2 eligible items in the whole catalogue, both monthly.
- **Family** has 2, one of which requires children. A user with a partner and
  no children gets exactly one family habit (H075, monthly).
- The **partner** panel has no daily habit for a couple. H133 is weekly.
- The **wealth** panel has no daily habit for an employee. H134 is weekly.
- 27 side quests (H088–H114) and 9 etiquette reminders (H115–H123) cannot be
  ticked on an ordinary day and are never seeded. They stay discoverable.

So `network` and `partner` move slowly for those users. Filling it is content
work, not code.

## 4. Not yet tested on a real phone keyboard

The in-row habit editor (`docs/onboarding/07-revisions.md` §3) was verified
headless at 390x844. What a headless browser cannot show:

- whether the field stays visible above the on-screen keyboard
- whether Enter commits as intended on iOS, where a `<textarea>` may insert a
  newline before the handler runs
- whether the 22px row actions are comfortable with a thumb, since they are
  deliberately under the 44px tap floor
