# Catalogue changes

`catalog.json` in this folder is the full replacement: 137 items, the original 123 with the edits below plus 14 new entries. Diff it against the current file before replacing it. Nothing was removed and no id was renumbered.

## Edits to existing entries

| id | field | old | new | why |
|---|---|---|---|---|
| H009 | title | Hit 200g protein (~2g/kg bodyweight) | Hit 1.6–2g protein per kg bodyweight | 200g fits a 100kg man and nobody else. Audience says "all". |
| H022 | requires | [] | ["gym"] | Lift heavy needs a bar. |
| H033 | requires | [] | ["hair"] | Cannot maintain a haircut without hair. Profile knows. |
| H077 | title | Have the 10 pre-marriage conversations | Have the 10 conversations | Useless to a married couple by its old title, and landing Y2 needs it. |
| H084 to H087 | requires | [] | ["self-employed"] | Entrepreneur habits. Hide from employees. |

## New requirement vocabulary

`requires` may now contain any of: `partner`, `children`, `hair`, `gym`, `employed`, `self-employed`, `single`, or a habit id (the item is available once that item is completed). `single` means `partner == false`. Enforce at seed time and on every discovery screen.

## New entries

| id | title | domain | kind | cadence | imp | effort | evidence | requires | starter |
|---|---|---|---|---|---|---|---|---|---|
| H124 | Bodyweight session at home: squats, push-ups, rows, 20 minutes | training | habit | weekly | 4 | medium | strong | | true |
| H125 | Groom: nails, brows, beard or shave | appearance | habit | weekly | 2 | low | anecdotal | | false |
| H126 | Ten minutes outside. Nothing in your ears. | mindset | habit | daily | 3 | low | moderate | | true |
| H127 | Pick the one skill for the next 6–12 months | mindset | milestone | once | 4 | low | anecdotal | | true |
| H128 | Message one person you have lost touch with | social | habit | weekly | 4 | low | moderate | | true |
| H129 | Find one recurring thing with the same people every week | social | milestone | once | 4 | medium | strong | | true |
| H130 | Go to it | social | habit | weekly | 4 | medium | strong | H129 | true |
| H131 | Make one plan with someone this week | social | habit | weekly | 4 | low | moderate | | true |
| H132 | Be in one room with people you do not know yet | family | habit | weekly | 4 | medium | anecdotal | single | true |
| H133 | One hour a week, just the two of you, no phones, no logistics | family | habit | weekly | 5 | medium | moderate | partner | true |
| H134 | Five-minute money look: every account, every week | finance | habit | weekly | 4 | low | moderate | | true |
| H135 | One hour a week on the thing that raises your rate | finance | habit | weekly | 4 | medium | moderate | employed | true |
| H136 | List every debt on one page | finance | milestone | once | 5 | low | strong | | true |
| H137 | Smallest debt first, automated | finance | habit | monthly | 5 | low | strong | H136 | true |

H132 sits in `family` on purpose. It is the only item that feeds the partner panel for a single person. Under `social` it would move the wrong picture.

## What was not done, and why

No new tag axis on the catalogue. The mapping from answers to habits lives in `landings.json` (about 40 rows) rather than as a tag on 137 items. The catalogue describes habits. The tree describes people. Keep them apart.

## Known thin spots left as they are

- 27 side quests (H088 to H114) and 9 etiquette reminders (H115 to H123) cannot be ticked on an ordinary day and are never seeded. They remain discoverable.
- Partner panel for a couple still has no daily habit. H133 is weekly. Acceptable for now.
- Wealth panel for an employee still has no daily habit. H134 is weekly. Acceptable for now.
- H031's milestones (six-pack, 2x bodyweight deadlift) are one person's list. Left alone.
