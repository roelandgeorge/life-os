# Life OS v2 — catalogus, gewogen panelen, onboarding-boom, gamification, dark editorial

## Context

Life OS toont nu een toekomstbeeld uit 3 panelen, gestuurd door 5 vaste
bouwblokken. De gebruiker wil (1) de inhoud van `docs/habits.csv` (123 items)
en `docs/lifeguide.docx` als suggesties integreren, en (2) de app "hip" maken
in de sfeer van Instagram-lifemaxxing. Na 6 interviewrondes zijn de
kernbeslissingen genomen (hieronder). Alles wordt gebouwd vóór de
vriendentest (Android + iOS); verwachte doorlooptijd 2–3 maanden.

Dit document is de **roadmap** plus het **uitvoerbare plan voor fase 1**.
Elke volgende fase krijgt een eigen plan → goedkeuring → bouw-cyclus.

## Genomen beslissingen

**Model & beeld**
- Elke zelfgekozen habit telt, gewogen met `importance` (1–5, uit de catalogus, per habit aanpasbaar; eigen habits standaard 3).
- Stappenmodel blijft (0–4, start 2). Per paneel per dag: gewogen score van de habits die die dag *afsluiten*. ≥ 70% → +1, anders −1. Geen afsluitende habits die dag → geen verandering (rustdagen blijven gratis).
- Dagelijks, wekelijks en om de N dagen tellen mee voor het beeld. Maandelijks bestaat, maar alleen voor streaks en XP, niet voor het beeld. "Per sessie" hoort bij training, "situationeel" wordt een herinnering.
- Periodes worden per habit verankerd op zijn startdatum, niet meer op `logs[0].date`.
- Paneel zonder gekozen habits: blijft op stand 2 en beweegt niet.
- **5 delen**: welvaart (band bovenaan), lichaam (vak links) + hoofd (overlay), netwerk (vak rechts) + partner (overlay, weg als je geen partner wil).
- Domein → paneel: slaap, voeding en uiterlijk → lichaam + hoofd · training → lichaam · mindset en productiviteit → hoofd · sociaal en gastvrijheid → netwerk · partner & gezin → partner · financiën → welvaart.

**Content**
- Alles in het Engels, gecureerd uit de NL-bronnen.
- Items krijgen tags: `audience` (all/male/female) en `requires` (partner, children, …). Male-only-items worden nooit aan vrouwen getoond. Niet-gewenste partner/gezin-items worden niet gevraagd en niet getoond.
- Alles blijft in de catalogus, met een genormaliseerd bewijslabel (strong/moderate/anecdotal).
- Getallen worden binair, met het doel in de tekst ("Hit 200g protein").
- Milestones: doelenlijst met checklist en badge. Challenges: wekelijkse side quest. Contextuele herinneringen en de gids-inhoud: dagkaart op Home plus een Guide-tab.
- Personas: historische figuren bij naam (publiek domein), fictieve figuren als naamloos archetype. Citaten enkel met bron. Het effect is alleen de dagelijkse wijsheid.

**Onboarding & uiterlijk**
- Volgorde: uiterlijk eerst (man/vrouw → lichaam + hoofd; blond/donker → hoofd), zodat de figuur meteen verschijnt.
- Daarna: partner ja/nee (zo ja: man/vrouw, blond/donker) → gezin/kinderen → domeinen aan/uit en in volgorde → per domein 3 voorgeselecteerde starters ("Customize" voor de hele lijst) → persona.
- Alleen man/vrouw. Achteraf altijd aanpasbaar.
- Varianten worden bepaald door een manifest met fallback; placeholders mogen naar hetzelfde bestand verwijzen.
- Accessoire-slots bestaan al, voorlopig met een transparante placeholder.
- ±60 tekeningen in "korrelige editorial illustratie".

**Gamification**
- Badges, een deelbare 9:16 story-kaart, een weekrecap, en een globaal level.
- XP/dag = gewogen voltooiing van de eigen habits × 100 (4/4 = 6/6 = 100). Geen XP uit side quests of milestones. Level is puur status. Dit draait spec §2.5 terug; wordt gedocumenteerd.

**Design**: dark editorial. Bijna-zwart, gebroken wit, serif-koppen, fijne korrel, bronzen accent.

## Roadmap

| Fase | Inhoud | Hangt af van |
|---|---|---|
| **1** | Catalogus als data, datamodel v2, migratie v1→v2, gewogen paneel-engine, habit-CRUD. Huidige UI minimaal aangepast zodat de app blijft werken. | — |
| **2** | Renderer: panelen + overlays + variantenmanifest + placeholders; artwork-promptgids voor de gebruiker | 1 |
| **3** | Designsysteem dark editorial: tokens, typografie, korrel, basiscomponenten; bestaande schermen omzetten | 2 |
| **4** | Onboarding-beslisboom + profiel + Discover/aanpassen | 1–3 |
| **5** | Check-in UI (Home): habits per domein, gewichten, rustdagen, dagkaart-slot | 3–4 |
| **6** | Contentlaag + gamification: personas & wijsheden (met bron), Guide-tab, side quests, milestones, badges, XP/level, weekrecap, story-kaart | 5 |
| **7** | Release-klaar: multi-user push, artwork inwisselen, EN-copy nalopen, PWA/iOS-check, README/CLAUDE.md, testersinstructies | alles |

De artwork-productie door de gebruiker loopt parallel vanaf fase 2.

## Fase 1 — uitvoerbaar plan

### 1.1 Catalogus als data
- **Nieuw** `scripts/import-catalog.mjs`: leest `docs/habits.csv` en schrijft een eerste versie van `src/content/catalog.json`. Daarna is die JSON de bron; de CSV blijft archief.
- Per item:
  - `id` (H001…), `title` (EN), `domain`, `kind` (habit/milestone/challenge/reminder), `cadence`, `importance`, `effort` (low/medium/high), `evidence` (strong/moderate/anecdotal), `note` (EN), `audience`, `requires[]`, `starter` (bool).
  - `domain` is een van: sleep, nutrition, training, appearance, mindset, productivity, social, hospitality, family, finance.
  - `cadence` is een van: daily, weekly, monthly, `{everyDays:n}`, situational, once.
  - Mapping van "Relaties, Gezin & Ouderschap": ouders/familie → `social`; partner, kinderen, opvoeding → `family`.
  - `starter`: per domein de 3 met hoogste `importance`, bij gelijke stand de laagste `effort`.
- Vertaling en tags schrijft Claude. De gebruiker reviewt de JSON (diff in de PR/commit).
- **Nieuw** `src/core/catalog.ts`: types plus getypte toegang (`catalogById`, `catalogFor(domain, profile)`) met de filters `audience` en `requires`.

### 1.2 Domeinen en panelen als data
- `src/core/domains.ts` herschrijven naar de 10 catalogusdomeinen, elk met kleur en `panels: PanelKey[]`. `PanelKey` = body, head, network, partner, wealth.
- `DomainKey` blijft een gesloten union van deze 10, zodat nog steeds niets op een sleutel vertakt.
- `visual/layers.ts` in fase 1 alleen via een **tijdelijke adapter** naar de 3 huidige PNG-sets: body/head → `user`, network+partner → `lief`, wealth → `achtergrond`, telkens het minimum. Fase 2 vervangt dit.

### 1.3 Datamodel v2 (`src/core/types.ts`)
- `UserHabit = { id, catalogId?, title, domain?, cadence, importance, startDate, removedDate?, color? }`
  - Een eigen habit zonder `domain` telt voor XP maar niet voor een paneel.
- `DayLog = { date, opened, ticks: Record<habitId, true> }`
- `Profile` (optioneel, pas in fase 4 gevuld): `gender`, `hair`, `partner {wanted, gender?, hair?}`, `children?`, `domainOrder[]`, `personaId?`
- `AppState = { schemaVersion: 2, logs, habits, profile?, notificationTime?, … }`
- De `removedDate` verwijdert zacht: historiek en streaks blijven kloppen.

### 1.4 Migratie v1 → v2 (`src/store/migrate.ts`, nieuw)
- Elk zichtbaar oud blok wordt een `UserHabit` met de oude `taskLabel` als titel en `startDate = logs[0].date`:
  - SLEEP → domein sleep, daily
  - FOOD → nutrition, daily
  - SPORT → training, `{everyDays:2}`
  - RELATIONSHIP → family, weekly
  - INCOME → finance, weekly
- `ticks[DOMAIN]` wordt `ticks[habitId]`.
- Custom tasks worden `UserHabit`s zonder domein (cadans, kleur en startdatum blijven). `customTicks` worden samengevoegd in `ticks`.
- Aangeroepen in `serialize.deserialize` (import) **en** in `indexeddb.load` (opgeslagen v1-record). Het migreerde record wordt meteen weggeschreven. `SCHEMA_VERSION` = 2 in `store/types.ts`.

### 1.5 Gewogen paneel-engine
- `src/core/steps.ts` herschrijven naar `panelSteps(state, today, {includeCurrentPeriod})`. Hergebruikt:
  - `core/periods.ts` (`completedPeriods`, `periodAt`, `hitInRange`, `currentPeriod`), met de habit-`startDate` als anker
  - `core/dates.ts`
  - `MAX_STEP`/`START_STEP`
- Per dag, per paneel: verzamel de habits van dat paneel die op die dag een periode afsluiten (maandelijks nooit). Score = Σ(importance × hit) / Σ(importance). Geen habits → geen verandering. ≥ `PANEL_THRESHOLD` (0,70) → +1, anders −1, begrensd.
- Preview: een periode die nog loopt, telt alleen als +1 wanneer hij vandaag al gehaald is. Nooit −1 voor vandaag.
- `projection.ts` levert `panelSteps` + `preview`.
- `due.ts` (`isDueToday`, `isRestDay`, `dailyTasksDone`), `customTasks.ts` (streaks → `habitStreak`) en `atRisk.ts` (digest per habit-id) omzetten naar `UserHabit`. De logica blijft dezelfde, de input verandert.

### 1.6 CRUD in `app/useLifeOS.ts`
- `toggleHabit(id, day)`, `addHabit(fromCatalog | custom)`, `updateHabit(id, patch)` (titel, gewicht, cadans, kleur, domein), `removeHabit(id)` (zacht).
- De bestaande `mutateCustomTasks`- en `taskLabels`-patronen worden hergebruikt, inclusief de regel "ruw opslaan, trimmen bij tonen".

### 1.7 UI minimaal bijwerken (geen redesign)
- `MainScreen`: lijst van actieve habits (gegroepeerd per domein) in plaats van 5 blokken plus aparte eigen taken. Rustdag-label, confetti (`dailyTasksDone`) en dagkiezer blijven.
- `SettingsScreen`: de secties "What each box means" en "Your own tasks" samengevoegd tot één habit-editor (titel, gewicht 1–5, cadans, domein, verwijderen) plus een eenvoudige "Add from catalog"-lijst.
- `HistoryScreen`: steptracks per paneel en per-habit-strips.

### 1.8 Documentatie en werkbestanden
- **Eerste stap van de uitvoering** (nog in deze sessie): `docs/plan/PLAN.md` (roadmap + status per fase) en `docs/plan/phase-1.md` (dit plan) aanmaken. Committen samen met `docs/habits.csv` en `docs/lifeguide.docx`. **Stop daarna.** Het bouwen gebeurt in een nieuwe sessie op Sonnet.
- Aan het einde van fase 1:
  - README: nieuwe sectie "v2 model", plus de omkeringen (gewogen panelen i.p.v. één tick = één stap; 5 panelen; Engelse catalogus).
  - CLAUDE.md kort bijwerken: het contract wordt `habits → panelSteps → layers → Avatar`; custom tasks zijn geen uitzondering meer; verwijzing naar `docs/plan/PLAN.md`.
  - `PLAN.md` status bijwerken.

### Tests (nieuw of aangepast)
- `catalog.test.ts`
  - alle ids uniek, enums geldig
  - elk domein heeft ≥ 1 paneel en precies 3 starters (of minder als het domein kleiner is)
  - `audience`/`requires`-filter
- `migrate.test.ts`
  - v1-voorbeeldstaat (met SPORT om de dag, weekly RELATIONSHIP, custom tasks met kleur en cadans) → v2
  - ticks behouden, titels uit `taskLabels`
  - roundtrip export/import van v1 én v2
- `steps.test.ts` herschreven
  - drempel precies op 70%
  - gewicht verschuift de uitkomst
  - rustdag geen verandering
  - weekly telt pas bij afsluiten
  - monthly nooit
  - leeg paneel blijft op 2
  - `startDate`-anker
  - verwijderde habit telt niet na `removedDate`
- `layers.test.ts`: de adapter zet elk paneel om naar de 3 bestaande lagen.
- Bestaande `due`-, `atRisk`- en `serialize`-tests omgezet naar habits.

## Werkwijze tussen sessies

1. **Nu (Opus, plan mode)**: dit plan goedkeuren. Claude schrijft alleen `docs/plan/*` en commit.
2. **Nieuwe sessie, model Sonnet** (via de modelkiezer in de app): "Lees CLAUDE.md en docs/plan/phase-1.md en bouw fase 1. Commit per substap 1.1–1.8."
3. Na fase 1: nieuwe sessie op **Opus** in plan mode voor fase 2 ("lees docs/plan/PLAN.md, plan fase 2"). Dan weer Sonnet om te bouwen.
4. Alleen terug naar Opus tijdens het bouwen bij een echte architecturale knoop.

In een terminal-sessie doet `/model opusplan` die wissel automatisch.

## Verificatie fase 1

- `npm test`, `npm run typecheck`, `npm run build` groen.
- Browser (`life-os-dev`, mobiele viewport):
  1. Een **v1-record** in IndexedDB zetten (zoals de huidige echte data) → herladen → habits en ticks zijn gemigreerd, titels komen uit taskLabels, geen dataverlies.
  2. Habits toevoegen uit de catalogus en gewicht wijzigen → paneel beweegt pas als de gewogen score van vandaag ≥ 70% haalt.
  3. Rustdag (training om de 2 dagen) → geen daling.
  4. Export → reset → import → identieke staat.
- De echte gebruikersdata op de telefoon: vóór het deployen van fase 1 een export maken als backup.
