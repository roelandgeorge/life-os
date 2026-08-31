# Life OS — Technical Specification v1

A habit tracker whose only output is a rendered projection of the user's future self.
Input: binary daily checks. Output: a portrait at age +15, plus its environment.

This document is the source of truth for the scoring engine and the visual mapping.
Build the model first, verify it against the test vectors, then build the UI.

---

## 1. Domains

Seven domains. Each has a checkbox, a target rate, and a rolling window.

| Key | Label (EN) | Target rate `r` | Window `W` (days) | Cadence intent |
|---|---|---|---|---|
| `SLEEP` | Slept 8 hours | 1.0 | 14 | every day |
| `FOOD` | Hit calories & protein | 1.0 | 14 | every day |
| `SPORT` | Trained | 0.571 (4/7) | 21 | 4× per week |
| `ORDER` | Cleared a todo | 0.857 (6/7) | 14 | 6× per week |
| `RELATIONSHIP` | Invested in the relationship | 0.143 (1/7) | 28 | weekly |
| `MIND` | Learned something deliberately | 0.143 (1/7) | 28 | weekly |
| `INCOME` | Worked on career or income | 0.033 (3/90) | 90 | 3× per quarter |

Domains are **data, not code**. Store them in a single config array so a future version
can let users define their own. Every domain object carries: `key`, `label`, `r`, `W`,
`visualChannel`, `color`.

Every check is binary. No partial credit, no intensity, no notes. Filling in a day must
take under five seconds.

---

## 2. Scoring engine

### 2.1 Two stages

Stage 1 converts a sparse hit history into an **adherence ratio** `A ∈ [0,1]`.
Stage 2 smooths that into a **score** `S ∈ [0,100]` with asymmetric response.

The two stages exist for different reasons. The window handles cadence: it lets a
weekly domain and a daily domain produce comparable numbers. The EWMA handles
asymmetry: it makes recovery slightly faster than decay, which a window alone cannot do.

### 2.2 Stage 1 — rolling adherence

For domain `d` on day `t`:

```
unlogged_d   = number of days in the last W_d days with no app interaction at all
excluded_d   = min(unlogged_d, AMNESTY)          // AMNESTY = 2
effectiveW_d = W_d - excluded_d
hits_d       = number of ticks for d in the last W_d days
A_d(t)       = clamp( hits_d / (r_d * effectiveW_d), 0, 1 )
```

Amnesty applies only to days the app was never opened. A day the user opened and left
unticked is a real miss. Amnesty is capped at 2 within any window, so absence stops
being free after two days.

### 2.3 Stage 2 — asymmetric EWMA

```
target = A_d(t) * 100

if target > S_d:
    S_d ← S_d + ALPHA_UP   * (target - S_d)      // ALPHA_UP   = 0.05
else:
    S_d ← S_d + ALPHA_DOWN * (target - S_d)      // ALPHA_DOWN = 0.04
```

Run exactly one update per calendar day, at day rollover. Never run it twice for the
same day — persist `lastEvaluatedDate` and replay any missed days on app open.

Time constants this produces:

- 0 → 95 at full adherence: **~60 days**
- 100 → 5 at zero adherence: **~74 days**

Recovery is deliberately faster than decay. This is not physiologically accurate. It is
there so that a bad week does not feel unrecoverable, because an unrecoverable state is
one the user stops looking at.

### 2.4 Cold start

At first launch all scores initialise to **50** and the app is in `warmup` state until
14 days of history exist. During warmup, display the projection normally but with a
persistent line: *"Reading from N days of data. The picture sharpens at 14."*
Do not show a confident verdict on data you do not have.

### 2.5 Composite: BODY

```
BODY = 0.7 * min(SLEEP, FOOD, SPORT) + 0.3 * mean(SLEEP, FOOD, SPORT)
```

The weakest of the three dominates. Neglecting one body domain visibly degrades the
whole body, but effort in the other two is not erased.

There is **no global life score**. Each domain drives its own visual channel. A single
headline number invites optimising the number instead of the behaviour.

### 2.6 Full Day

```
fullDay(t) = SLEEP(t) AND FOOD(t) AND SPORT(t) AND ORDER(t)
```

Only the four daily domains, since the others are not due every day. A Full Day
triggers the positive-confirmation state described in §4.7.

### 2.7 Immediate feedback

The daily score update happens once at rollover, but the avatar must respond the moment
a box is ticked, or the causal link is lost.

On tick, compute a **preview score**: the score the domain would hold if today's ticks
were rolled forward. Animate the affected visual parameters from current to preview over
~600 ms and hold there for the rest of the day. At rollover the real score catches up.
The preview is display-only and is never persisted.

---

## 3. Projection

Horizon is fixed. No slider, no alternate timelines.

```
projectionAge = currentAge + 15
```

Header text: **"This is you at {projectionAge}."**
Subhead: *"If your current average holds."*

The projection assumes each domain's current EWMA score holds constant for 15 years.
No decay curve, no compounding — the score already encodes the trend, and layering a
second model on top would obscure the causal link between today's tick and today's image.

Do not render an idealised self for comparison. There is one figure on screen.

---

## 4. Visual mapping

All parameters are continuous in `[0,1]` and derived from `s_domain = S_domain / 100`.
Use parametric SVG with interpolation — no sprite sets, no discrete states, no runtime
image generation. Every parameter must be renderable at any value between its extremes.

Style: stylised illustration, not photoreal. Photoreal lands in the uncanny valley and
makes the degraded state unreadable as a projection.

### 4.1 SLEEP → face and light

| Parameter | Formula | At `s=0` | At `s=1` |
|---|---|---|---|
| `eyeBagDepth` | `1 - s` | heavy dark hollows | none |
| `scleraRedness` | `1 - s` | bloodshot | clear |
| `eyelidDroop` | `0.8 * (1 - s)` | half-closed | open, alert |
| `skinGreyness` | `1 - s` | ashen, waxy | warm |
| `ambientLight` | `0.25 + 0.75 * s` | dim, flat, cold | bright, warm |

### 4.2 FOOD → mass and decay

The check is *eating enough*. Failure means undereating, so a low score produces gaunt,
not fat.

| Parameter | Formula | At `s=0` | At `s=1` |
|---|---|---|---|
| `gauntness` | `1 - s` | hollow cheeks, sunken temples, visible ribs | full face |
| `skinToneHealth` | `s` | sallow, yellowish | healthy |
| `toothStain` | `1 - s` | brown, gapped, one missing | white, even |
| `acneCount` | `round(12 * (0.6*(1-s_food) + 0.4*(1-s_sleep)))` | ~12 lesions, cystic | 0 |
| `hairThinning` | `1 - (0.5*s_food + 0.5*s_sleep)` | receded crown, patchy scalp | full |

### 4.3 SPORT → build and posture

```
effectiveMuscle = s_sport * (0.4 + 0.6 * s_food)
```

Muscle is gated by food. Training without eating cannot produce a built figure — the
model must teach this, not contradict it.

| Parameter | Formula | At `0` | At `1` |
|---|---|---|---|
| `muscleMass` | `effectiveMuscle` | thin, no definition | broad, defined |
| `shoulderWidth` | `0.75 + 0.25 * effectiveMuscle` | narrow, sloped | wide, square |
| `postureUpright` | `0.5*s_sport + 0.5*s_sleep` | hunched, head forward, curved spine | tall, open chest |

### 4.4 Aging overlay → BODY

Age is fixed at `projectionAge`; only severity varies.

| Parameter | Formula |
|---|---|
| `wrinkleDepth` | `0.2 + 0.8 * (1 - body)` |
| `skinSag` | `0.15 + 0.85 * (1 - body)` |
| `hairGrey` | `0.3 + 0.7 * (1 - body)` |

Baseline values are non-zero because a 50-year-old has lines regardless.

### 4.5 ORDER → clothing and room

| Parameter | Formula | At `0` | At `1` |
|---|---|---|---|
| `clothingCondition` | `s` | stained, frayed collar, missing button, ill-fitting | clean, pressed, fitted |
| `groomingNeatness` | `s` | unkempt beard, greasy hair, overgrown nails | groomed |
| `roomTidiness` | `s` | clutter on the floor, peeling paint, crooked frames | ordered, straight lines |

### 4.6 Environment layers

| Domain | Parameter | Bands |
|---|---|---|
| `RELATIONSHIP` | `partnerPresence` | `<30` absent · `30–60` present, turned away, distant · `>60` close, oriented toward the figure |
| | `partnerDistance` | `1 - s` mapped to horizontal offset |
| `INCOME` | `backgroundTier` | `0–25` cramped flat · `25–50` modest flat · `50–75` house · `75–100` villa |
| | `vehicle` | `0–30` none · `30–60` old, dented · `60–85` decent · `85–100` premium |
| `MIND` | `shelfFill` | empty and dusty → sparse → full, lit workspace |

Tier transitions must crossfade across a ±8-point band around each boundary. A hard
switch at a threshold invites gaming the threshold.

### 4.7 Full Day state

When `fullDay(t)` is true:

- A rim light on the figure and a warm shift in `ambientLight`, both additive and
  independent of the underlying scores.
- Line under the portrait: **"Full day. This is the trajectory."**
- A 30-cell strip below, one cell per day, filled for each Full Day. This is a density
  view, not a streak counter — it does not reset to zero on a miss.

---

## 5. Data model

```ts
type DayLog = {
  date: string;          // "YYYY-MM-DD", local, day boundary at 04:00
  opened: boolean;       // false = unlogged, eligible for amnesty
  ticks: Record<DomainKey, boolean>;
}

type DomainState = {
  key: DomainKey;
  score: number;         // 0..100
}

type Profile = {
  currentAge: number;
  // appearance fields, see §7
}

type AppState = {
  profile: Profile;
  domains: DomainState[];
  logs: DayLog[];        // append-only, keep 400 days
  lastEvaluatedDate: string;
}
```

### 5.1 Storage

IndexedDB, behind a thin interface:

```ts
interface Store {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  export(): Promise<string>;   // JSON
  import(json: string): Promise<void>;
}
```

Everything else in the app talks to `Store`, never to IndexedDB directly. A later
Supabase backend must be a drop-in replacement.

No accounts in v1. Ship the JSON export as a visible button — it is the only defence
against a cleared cache.

### 5.2 Dates

Store bare date strings. Never timestamps. Day rolls at **04:00 local**. Retroactive
editing is allowed for **3 days back** and no further.

### 5.3 Copy

All user-facing strings live in `src/i18n/en.ts` as a flat key map. English only in v1.

---

## 6. Screens

Three, no more.

**1. Main.** The portrait fills the upper two-thirds. Below it: the age line, then
today's checkboxes. Any domain not due today is shown collapsed with its last-hit date.

**2. History.** One sparkline per domain over 90 days, plus the Full Day strip.
Nothing else. Additional analytics turn this into an ordinary tracker.

**3. Settings.** Profile edit, notification time, export/import, reset.

Notifications: one per day, evening, configurable. On iOS these require the PWA to be
installed to the home screen — surface that in onboarding.

---

## 7. Onboarding

Runs once. Builds the avatar's fixed identity so the projection is recognisably the user.

**Required for the model:**
1. Current age *(drives the projection age — explain why it is asked)*

**Appearance:**
2. Body frame: slight / average / broad
3. Height: short / average / tall
4. Skin tone: 6-step swatch scale
5. Hair colour: 6 swatches + grey
6. Hair type: straight / wavy / curly / coily
7. Hair length: shaved / short / medium / long
8. Current hairline: full / slight recession / receding / bald crown
9. Facial hair: none / stubble / short beard / full beard / moustache
10. Eye colour: 5 swatches
11. Glasses: none / glasses
12. Face shape: oval / round / square / long
13. Presentation: masculine / feminine / neutral *(drives base silhouette)*

Store all of it in `Profile`. These are fixed identity, never touched by scores — scores
only modulate the parameters in §4. The person in the picture must stay the same person
across every state, or the confrontation does not land.

**Closing screen:** explain the mechanic in three lines, then start all domains at 50.

---

## 8. Test vectors

Verify the engine against these before writing any UI.

| # | Scenario | Expected |
|---|---|---|
| 1 | 60 consecutive days, all domains at target | every score ≥ 94 |
| 2 | From 100, 74 days of zero ticks with app opened daily | every score ≤ 6 |
| 3 | SLEEP=90, FOOD=90, SPORT=20 | `BODY` = 0.7·20 + 0.3·66.7 = **34.0** |
| 4 | SPORT=100, FOOD=0 | `effectiveMuscle` = **0.40** |
| 5 | App unopened 2 days, then reopened | those days excluded, no score drop |
| 6 | App unopened 5 days | 2 excluded, 3 counted as misses |
| 7 | SPORT ticked 4× in the last 7 days, window full | `A_sport` = 1.0 |
| 8 | INCOME ticked 3× in the last 90 days | `A_income` = 1.0 |
| 9 | Day 1, no history | all scores 50, `warmup` true |
| 10 | Two app opens in one day | exactly one EWMA update |

---

## 9. Build order

1. Scoring engine as a pure module, no DOM. Pass all of §8.
2. Storage layer with export/import.
3. Parametric SVG avatar. Build a debug screen with a slider per parameter first —
   this is the longest part of the project and the sliders are what make it tractable.
4. Wire scores to parameters.
5. Main screen and check-in flow.
6. Onboarding.
7. History, settings.
8. PWA manifest, service worker, icon.

Do not start step 3 by drawing a figure. Start by defining the parameter list from §4
and building the debug harness. Every parameter must be independently drivable before
any of them is connected to a score.
