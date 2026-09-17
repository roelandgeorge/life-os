#!/usr/bin/env node
/**
 * One-shot importer: docs/habits.csv (123 Dutch items) -> src/content/catalog.json.
 *
 * After this runs once, the JSON is the source of truth (§1.1 of
 * docs/plan/phase-1.md) — the CSV stays as archive. Re-run only to regenerate
 * from a changed CSV; hand edits to the JSON are otherwise safe and will not
 * be clobbered by anything else in the app.
 *
 * Translation and tagging (English titles/notes, domain, kind, cadence,
 * audience, requires) are authored below rather than derived mechanically —
 * the CSV has no English and no tags. The user reviews the result in the
 * commit diff.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CSV_PATH = path.join(ROOT, 'docs/habits.csv');
const OUT_PATH = path.join(ROOT, 'src/content/catalog.json');

// --- CSV parsing (RFC4180-ish: quoted fields, embedded commas, "" escapes) ---

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

// --- Domain mapping ---

const DOMAIN_MAP = {
  'Slaap & Herstel': 'sleep',
  Voeding: 'nutrition',
  'Training & Beweging': 'training',
  'Uiterlijk, Verzorging & Houding': 'appearance',
  'Mindset & Persoonlijke Groei': 'mindset',
  'Productiviteit & Systemen': 'productivity',
  'Sociale Vaardigheid & Communicatie': 'social',
  'Gastvrijheid & Sociale Verbinding': 'hospitality',
  'Financiën & Ondernemerschap': 'finance',
  // The challenges are personal-growth flavour with no domain of their own in
  // the CSV; filed under mindset, the closest fit.
  'Challenges (uit de life-guide, ter inspiratie)': 'mindset',
};

// "Relaties, Gezin & Ouderschap" splits per §1.1: parents/family -> social,
// partner/children/upbringing -> family.
const RELATIONS_OVERRIDE = {
  H073: { domain: 'social', requires: [] }, // Call parents / family dinner
  H074: { domain: 'family', requires: ['children'] }, // Play with kids
  H075: { domain: 'family', requires: ['partner'] }, // Monthly couple check-in
  H076: { domain: 'family', requires: ['children'] }, // Correct behaviour not identity
  H077: { domain: 'family', requires: ['partner'] }, // 10 pre-marriage conversations
  H078: { domain: 'family', requires: ['partner'] }, // 7 pre-pregnancy conversations
};

function mapDomain(row) {
  if (row.domein === 'Relaties, Gezin & Ouderschap') {
    const override = RELATIONS_OVERRIDE[row.id];
    if (!override) throw new Error(`No relations override for ${row.id}`);
    return override.domain;
  }
  const domain = DOMAIN_MAP[row.domein];
  if (!domain) throw new Error(`Unknown domein "${row.domein}" for ${row.id}`);
  return domain;
}

function mapRequires(row) {
  return RELATIONS_OVERRIDE[row.id]?.requires ?? [];
}

// --- Kind + cadence mapping ---

function mapKind(row) {
  const type = row.type;
  const freq = row.frequentie.toLowerCase();
  if (type === 'Milestone/eenmalig') return 'milestone';
  if (type.startsWith('Challenge')) return 'challenge';
  if (type === 'Contextuele herinnering') return 'reminder';
  // §1.1: "situationeel" wordt een herinnering — even when the CSV still
  // calls the row a Habit, a continuous/situational cadence makes it one.
  if (freq.includes('situationeel') || freq === 'doorlopend') return 'reminder';
  return 'habit';
}

function mapCadence(row, kind) {
  if (kind === 'milestone') return 'once';
  if (kind === 'challenge') return 'situational';
  if (kind === 'reminder') return 'situational';
  switch (row.frequentie) {
    case 'Dagelijks':
      return 'daily';
    case 'Wekelijks':
    case 'Wekelijkse zelfcheck':
      return 'weekly';
    case 'Maandelijks':
      return 'monthly';
    case 'Elke 2-3 weken':
      return { everyDays: 18 };
    case 'Per kwartaal':
      return { everyDays: 90 };
    // §1.1: "Per sessie" hoort bij training — training's own cadence is
    // already a few times a week, so a per-session technique note follows it.
    case 'Per sessie':
      return 'weekly';
    case 'Bij elke bijeenkomst':
      return 'monthly'; // gatherings themselves are monthly (H079)
    default:
      return 'weekly';
  }
}

function mapEffort(raw) {
  switch (raw) {
    case 'Laag':
      return 'low';
    case 'Gemiddeld':
      return 'medium';
    case 'Hoog':
      return 'high';
    default:
      throw new Error(`Unknown effort "${raw}"`);
  }
}

function mapEvidence(raw) {
  const s = raw.toLowerCase();
  if (s.includes('hoog')) return 'strong';
  const match = s.match(/(\d+)/);
  if (!match) return 'anecdotal';
  const n = Number(match[1]);
  if (n >= 3) return 'strong';
  if (n === 2) return 'moderate';
  return 'anecdotal';
}

// --- English translations (title + note), authored by hand ---
// prettier-ignore
const TRANSLATIONS = {
  H001: { title: 'Sleep 7–9 hours', note: 'Foundational — affects every other domain.' },
  H002: { title: 'Keep a fixed, early bedtime (e.g. 21:30)', note: '' },
  H003: { title: 'Charge your phone outside the bedroom from a fixed evening hour', note: '' },
  H004: { title: 'Stop eating 2–3 hours before bed', note: '' },
  H005: { title: 'Stretch for 5 minutes before sleep', note: '' },
  H006: { title: 'Evening journal: 1 worry, 3 things that went well', note: '' },
  H007: { title: 'Take your sleep stack (magnesium, optionally L-theanine/glycine)', note: '' },
  H008: { title: 'Schedule recovery on purpose (family time, alone time, downtime)', note: '' },
  H009: { title: 'Hit 200g protein (~2g/kg bodyweight)', note: 'Best-supported nutrition rule in the collection.' },
  H010: { title: 'Eat 35–40g protein at breakfast', note: '' },
  H011: { title: 'Take your daily base supplements (creatine, zinc, D3, omega-3, magnesium)', note: 'Creatine dose is debated: 5g (classic) vs 10g (one source).' },
  H012: { title: 'Drink 2–4L of water', note: '' },
  H013: { title: 'Schedule a meal-prep session', note: '' },
  H014: { title: 'Eat 80–90% whole, single-ingredient food', note: '' },
  H015: { title: "Review the week against the 80/20 rule (hit 80% clean?)", note: '' },
  H016: { title: 'Cap alcohol at 0–1 drinks a week', note: '' },
  H017: { title: 'Weigh your food (while losing weight is the goal)', note: 'Only relevant while weight loss is an active goal.' },
  H018: { title: 'Cut sugar when skin feels dull or puffy', note: '' },
  H019: { title: 'Train full body 3–4x a week', note: 'Avoid both 6x/week and <2x/week.' },
  H020: { title: 'Hit 8,000–10,000 steps', note: 'Best-supported rule in the whole collection.' },
  H021: { title: 'Put training first in your calendar', note: '' },
  H022: { title: 'Lift heavy: 5–8 reps on main lifts', note: '' },
  H023: { title: 'Apply progressive overload (a little more than last session)', note: '' },
  H024: { title: 'Log training progress (reps/weight/time)', note: '' },
  H025: { title: 'Zone 2 cardio (~90 min/week at conversation pace)', note: '' },
  H026: { title: 'Hill sprints (6×30s, once a week)', note: '' },
  H027: { title: 'Train lower body as much as upper body', note: '' },
  H028: { title: 'Hip/back mobility routine (7-step flow)', note: '' },
  H029: { title: 'Hip bridges (1 min ×3, or 3×8 reps)', note: '' },
  H030: { title: "Take a fitness benchmark test (e.g. 'Test Your Reps' or 'Cindy')", note: 'A measurement moment, not a daily habit.' },
  H031: { title: 'Hit a physical milestone (six-pack, 2x bodyweight deadlift, 10 pull-ups…)', note: '' },
  H032: { title: 'Watch your posture on purpose (shoulders back, chin up)', note: 'Free, and the most recurring signal of confidence.' },
  H033: { title: 'Maintain your haircut', note: '' },
  H034: { title: 'Clean your shoes', note: '' },
  H035: { title: 'Wear a signature scent', note: '' },
  H036: { title: 'Basic skincare routine (cleanser, moisturiser, SPF)', note: '' },
  H037: { title: 'Vitamin C serum (morning)', note: '' },
  H038: { title: 'Retinol (evening)', note: '' },
  H039: { title: 'Exfoliate skin', note: '' },
  H040: { title: 'Correct tongue position / mouth breathing (at night)', note: '' },
  H041: { title: 'Take a cold shower', note: '' },
  H042: { title: 'Get bloodwork done', note: '' },
  H043: { title: 'Build a neutral, quality wardrobe', note: '' },
  H044: { title: 'Olive oil instead of coffee, first thing in the morning', note: '' },
  H045: { title: 'Silk pillowcase instead of cotton', note: '' },
  H046: { title: 'Red light after 7pm instead of bright white light', note: '' },
  H047: { title: 'SPF every day, regardless of season', note: '' },
  H048: { title: 'Read at least 10 pages a day (non-fiction)', note: '' },
  H049: { title: "Weekly journal review (Sunday: what worked, what didn't)", note: '' },
  H050: { title: "Short daily journal (who you're becoming)", note: '' },
  H051: { title: 'Keep promises to yourself (self-tracking)', note: '' },
  H052: { title: "Do one thing weekly that's mildly uncomfortable", note: '' },
  H053: { title: 'Check progress on your 6–12 month skill or habit', note: '' },
  H054: { title: 'Say no, on purpose, to something that drains you', note: '' },
  H055: { title: 'Do one side quest (a small break from routine)', note: 'See Challenges for the 20 options.' },
  H056: { title: 'Self-check: did I respond today, or react?', note: '' },
  H057: { title: 'Plan tomorrow tonight (schedule + top task)', note: 'The best-supported productivity rule.' },
  H058: { title: 'Protect your morning (fixed early wake-up, first hour for yourself)', note: '' },
  H059: { title: 'Do 3 non-negotiables before 9am', note: '' },
  H060: { title: 'Weekly life audit / week planning', note: '' },
  H061: { title: 'Clear your inbox', note: '' },
  H062: { title: 'Monthly goals review', note: '' },
  H063: { title: 'Block selfless/selfish hours in your calendar', note: '' },
  H064: { title: 'One full social-media-free day a week', note: '' },
  H065: { title: 'Phone away during conversations', note: '' },
  H066: { title: 'Evening doomscroll check (did you avoid it?)', note: '' },
  H067: { title: 'Actively block one weekend a month', note: '' },
  H068: { title: 'Use the eye-contact technique (smile first, 3–5s, the 50/70 rule)', note: '' },
  H069: { title: 'Pause before you answer in a conversation', note: '' },
  H070: { title: "Say 'no' once a week, on purpose, with no explanation", note: '' },
  H071: { title: 'Actively ask for something (a raise, a deal, a yes)', note: '' },
  H072: { title: 'Invest time in inspiring, like-minded people', note: '' },
  H073: { title: 'Call your parents / a family dinner', note: '' },
  H074: { title: 'Play with your kids on the floor', note: '' },
  H075: { title: 'Monthly couple check-in (gratitude, gripes, energy, finances, calendar)', note: 'One source, a 5-point system.' },
  H076: { title: 'Correct behaviour, not identity, when correcting your kids', note: '' },
  H077: { title: 'Have the 10 pre-marriage conversations', note: 'One source, a coherent set.' },
  H078: { title: 'Have the 7 pre-pregnancy conversations', note: 'One source, a coherent set.' },
  H079: { title: 'Host an informal gathering (drop-in, not a formal dinner)', note: 'Best-supported life lesson in the whole collection — 3 independent sources.' },
  H080: { title: 'Let guests help instead of making everything perfect', note: '' },
  H081: { title: 'Run an open-door policy (lower the bar for spontaneous visits)', note: '' },
  H082: { title: 'Automate saving/investing before you spend', note: '' },
  H083: { title: 'Track finances on one overview page', note: '' },
  H084: { title: 'CEO hour: the first hour of the day is strategy only', note: '' },
  H085: { title: 'Block a no-meeting slot for deep work', note: '' },
  H086: { title: 'Review your client base (cut the bottom 20%)', note: '' },
  H087: { title: 'Check cash flow, not just paper profit', note: '' },
  H088: { title: "Pay for someone's coffee and walk away without a word", note: CHALLENGE_NOTE() },
  H089: { title: 'Walk into a luxury store and ask a question with confidence', note: CHALLENGE_NOTE() },
  H090: { title: 'Read a hardcover book in a quiet public place', note: CHALLENGE_NOTE() },
  H091: { title: 'Go to a rooftop bar and connect with a stranger', note: CHALLENGE_NOTE() },
  H092: { title: "Drink an espresso at a café without saying anything", note: CHALLENGE_NOTE() },
  H093: { title: 'Walk alone through an upscale neighbourhood', note: CHALLENGE_NOTE() },
  H094: { title: 'Spend an hour at an art auction, observing in silence', note: CHALLENGE_NOTE() },
  H095: { title: '24 hours screen-free (Friday–Saturday)', note: CHALLENGE_NOTE() },
  H096: { title: 'Clear every email that gives you that behind feeling', note: CHALLENGE_NOTE() },
  H097: { title: 'Buy an unfamiliar ingredient and cook with it', note: CHALLENGE_NOTE() },
  H098: { title: '10 minutes of coffee by the window, no scrolling', note: CHALLENGE_NOTE() },
  H099: { title: 'Read 3 pages in a bookshop section you normally ignore', note: CHALLENGE_NOTE() },
  H100: { title: 'Explore a neighbourhood 20 minutes away, no GPS', note: CHALLENGE_NOTE() },
  H101: { title: 'Rearrange one room to break the visual routine', note: CHALLENGE_NOTE() },
  H102: { title: 'Watch the sunset until the first star appears', note: CHALLENGE_NOTE() },
  H103: { title: 'Spend 30 minutes doing something you loved at age ten', note: CHALLENGE_NOTE() },
  H104: { title: 'Send a physical letter to someone from your past', note: CHALLENGE_NOTE() },
  H105: { title: 'One dinner without your phone (leave it in the car)', note: CHALLENGE_NOTE() },
  H106: { title: 'Spend 4 hours on something with no career benefit', note: CHALLENGE_NOTE() },
  H107: { title: 'Swap podcasts for lofi/jazz for one afternoon', note: CHALLENGE_NOTE() },
  H108: { title: 'Make something imperfect out of clay', note: CHALLENGE_NOTE() },
  H109: { title: 'Deliberately let go of a work mistake you keep replaying', note: CHALLENGE_NOTE() },
  H110: { title: 'Attend the first neighbourhood event you see on a flyer', note: CHALLENGE_NOTE() },
  H111: { title: 'Give three genuine compliments to strangers', note: CHALLENGE_NOTE() },
  H112: { title: 'Delete your most-used app for 72 hours', note: CHALLENGE_NOTE() },
  H113: { title: "Write down every 'should' until your head is empty", note: CHALLENGE_NOTE() },
  H114: { title: 'Use the good candles and the expensive coffee, just because you can', note: CHALLENGE_NOTE() },
  H115: { title: 'If someone asks you to delete a photo or video, do it immediately.', note: '' },
  H116: { title: 'Always wait for someone tying their shoelace.', note: '' },
  H117: { title: "Never point out someone's flaws or insecurities.", note: '' },
  H118: { title: "Don't make plans in front of someone who isn't invited.", note: '' },
  H119: { title: "Don't spoil a child's belief (Santa, the tooth fairy…).", note: '' },
  H120: { title: "Never comment on someone's clothes, shoes, house, or car.", note: '' },
  H121: { title: "Don't force your beliefs on anyone else.", note: '' },
  H122: { title: 'Offer your food to someone who has none.', note: '' },
  H123: { title: "Don't play loud music in public.", note: '' },
};

// Hoisted above its use in TRANSLATIONS — function declarations are.
function CHALLENGE_NOTE() {
  return 'One source, from a list of 8–20 variants.';
}

// --- Starter selection: top 3 per domain by importance, ties by lowest effort ---
//
// Eligible means it can actually move the picture once accepted: a habit
// (not a milestone, challenge or reminder) on a cadence `core/habits.ts`'s
// drivesPanel() also accepts. Kept as its own copy here — this script does
// not import TypeScript — but catalog.test.ts imports the real drivesPanel
// and pins the two against each other.

const EFFORT_RANK = { low: 0, medium: 1, high: 2 };

function drivesPanel(cadence) {
  return cadence !== 'situational' && cadence !== 'once';
}

function markStarters(items) {
  const byDomain = new Map();
  for (const item of items) {
    if (item.kind !== 'habit' || !drivesPanel(item.cadence)) continue;
    const list = byDomain.get(item.domain) ?? [];
    list.push(item);
    byDomain.set(item.domain, list);
  }
  const starterIds = new Set();
  for (const list of byDomain.values()) {
    const sorted = [...list].sort(
      (a, b) =>
        b.importance - a.importance || EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] || a.id.localeCompare(b.id),
    );
    for (const item of sorted.slice(0, 3)) starterIds.add(item.id);
  }
  return items.map((item) => ({ ...item, starter: starterIds.has(item.id) }));
}

// --- Run ---

function main() {
  const csv = readFileSync(CSV_PATH, 'utf8');
  const [header, ...rows] = parseCsv(csv).filter((r) => r.length > 1 || r[0] !== '');
  const cols = header;

  const items = rows.map((cells) => {
    const row = Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
    const translation = TRANSLATIONS[row.id];
    if (!translation) throw new Error(`No translation for ${row.id}`);
    const kind = mapKind(row);
    return {
      id: row.id,
      title: translation.title,
      domain: mapDomain(row),
      kind,
      cadence: mapCadence(row, kind),
      importance: Number(row.belang_1_5),
      effort: mapEffort(row.effort),
      evidence: mapEvidence(row.bewijskracht),
      note: translation.note,
      audience: 'all',
      requires: mapRequires(row),
      starter: false,
    };
  });

  const withStarters = markStarters(items);
  writeFileSync(OUT_PATH, JSON.stringify(withStarters, null, 2) + '\n');
  console.log(`Wrote ${withStarters.length} catalog items to ${path.relative(ROOT, OUT_PATH)}`);
}

main();
