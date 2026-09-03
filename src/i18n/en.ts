/**
 * §5.3 — all user-facing strings live here as a flat key map. English only in
 * v1. `domains.ts` labels reference these keys by name; nothing else hardcodes
 * copy.
 */

export const en = {
  'domain.sleep': 'Slept 8 hours',
  'domain.food': 'Hit calories & protein',
  'domain.sport': 'Trained',
  'domain.order': 'Cleared a todo',
  'domain.relationship': 'Invested in the relationship',
  'domain.mind': 'Learned something deliberately',
  'domain.income': 'Worked on career or income',

  'main.headline': 'This is you at {age}.',
  'main.subhead': 'If today holds.',
  'main.nextMove.gained': "Today's ticks moved {count} of them up a step.",
  'main.nextMove.waiting': 'Tick a box today and the picture moves. {days} day(s) until the next one settles.',
  'main.fullDay': 'Full day. This is the trajectory.',
  'main.lastHit': 'last: {date}',
  'main.neverHit': 'not yet',
  'main.loading': 'Loading…',

  // Best-version comparison. §3 says "no idealised self for comparison" — this
  // is a deliberate, documented reversal of that call, not an oversight; see
  // README.
  'main.bestVersion.show': 'See your best version',
  'main.bestVersion.hide': 'Back to now',
  'main.bestVersion.headline': 'This is you at {age}, at your best.',
  'main.bestVersion.subhead': 'Every part at its top step. Five good days is all any one of them takes.',

  // §7 onboarding — one question per screen, then the closing explanation.
  'onboarding.next': 'Next',
  'onboarding.back': 'Back',

  'onboarding.currentAge.question': 'How old are you now?',
  'onboarding.currentAge.note': 'This sets how far ahead the picture looks — always 15 years out.',











  'onboarding.closing.title': 'How this works',
  'onboarding.closing.line1': 'Each day you check off a handful of small things — sleep, food, training, order, the people and the work that matter.',
  'onboarding.closing.line2': "None of it scores your day. It scores your average, and the average moves slowly on purpose — a bad week doesn't erase a good month.",
  'onboarding.closing.line3': 'The picture above is you at {age}, and right now it is at its worst — you have no days behind you yet. Five days of ticking a box takes any part of it all the way up.',
  'onboarding.closing.iosNote': "On iPhone: add this to your home screen from the share menu — that's what lets the evening reminder in Settings actually notify you.",
  'onboarding.closing.start': 'Start',

  // §6 navigation
  'nav.main': 'Today',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  // §6 screen 2 — history
  'history.title': 'History',
  'history.subhead': 'Last {days} days.',
  'history.fullDay': 'Full Day density, last 30 days',

  // §6 screen 3 — settings
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.notifications': 'Daily reminder',
  'settings.notifications.note': "One notification a day, in the evening. On iOS this needs the app installed to the home screen.",
  'settings.data': 'Data',
  'settings.export': 'Export',
  'settings.import': 'Import',
  'settings.reset': 'Reset',
  'settings.reset.note': 'Deletes everything on this device and returns to onboarding. Export first if you want to keep it.',
  'settings.reset.confirm': 'Delete all Life OS data on this device? This cannot be undone.',
} as const;

export type I18nKey = keyof typeof en;

/** `{token}` substitution. No pluralisation, no nesting — v1 doesn't need it. */
export function t(key: I18nKey, vars: Record<string, string | number> = {}): string {
  let out: string = en[key];
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
