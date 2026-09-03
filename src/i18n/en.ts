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

  'main.headline': 'This is future you.',
  'main.subhead': 'If today holds.',
  'main.nextMove.gained': "Today's ticks moved {count} of them up a step.",
  'main.nextMove.waiting': 'Tick a box today and the picture moves. {days} day(s) until the next one settles.',
  'main.day.today': 'Today',
  'main.day.yesterday': 'Yesterday',
  'main.custom.title': 'Also today',
  'main.custom.streak': '{days}-day streak',
  'settings.custom': 'Your own tasks',
  'settings.custom.note': "Things you want to track that are not one of the five. They do not move the picture — nothing in the artwork answers to them — but the app will keep your streak.",
  'settings.custom.add': 'Add a task',
  'settings.custom.placeholder': 'e.g. No alcohol',
  'settings.custom.remove': 'Remove',
  'settings.custom.full': 'That is the maximum. Remove one to add another.',
  'settings.custom.unnamed': 'Unnamed task',
  'settings.tasks': 'What each box means',
  'settings.tasks.note': 'Name the thing you actually do. Leave a box empty to use the default.',
  'main.editingPast': "Filling in {day}. The picture still shows today's standing.",
  'main.fullDay': 'Full day. This is the trajectory.',
  'main.lastHit': 'last: {date}',
  'main.neverHit': 'not yet',
  'main.loading': 'Loading…',
  'error.storage.title': "Can't reach your data",
  'error.storage.retry': 'Try again',

  // Best-version comparison. §3 says "no idealised self for comparison" — this
  // is a deliberate, documented reversal of that call, not an oversight; see
  // README.
  'main.bestVersion.show': 'See your best version',
  'main.bestVersion.hide': 'Back to now',
  'main.bestVersion.headline': 'This is future you, at your best.',
  'main.bestVersion.subhead': 'Every part at its top step. Two good days is all any one of them takes.',

  // §7 onboarding — one question per screen, then the closing explanation.
  'onboarding.next': 'Next',
  'onboarding.back': 'Back',

  'onboarding.currentAge.question': 'How old are you now?',
  'onboarding.currentAge.note': 'This sets how far ahead the picture looks — always 15 years out.',

  'onboarding.closing.title': 'How this works',
  'onboarding.closing.line1': 'Each day you check off a handful of small things — sleep, food, training, and the people and work that matter. The last two only need a tick once a week.',
  'onboarding.closing.line2': 'Nothing here scores your day. Each part of the picture moves one step at a time: a tick takes it up, a period without one takes it down.',
  'onboarding.closing.line3': 'The picture above is you at {age}. Everything starts halfway, so it can move either way from day one: two good days takes any part of it to the top, two missed ones take it down.',
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
  'settings.notifications.note': 'One notification a day, in the evening. The exact minute is not guaranteed — the free plan schedules it within the hour.',
  'settings.notifications.enable': 'Remind me each evening',
  'settings.notifications.on': 'On. A reminder arrives each evening.',
  'settings.notifications.working': 'Setting up…',
  'settings.notifications.error.unsupported': 'This browser cannot do push notifications.',
  'settings.notifications.error.notInstalled': 'On iPhone, add Life OS to your home screen first — Safari only allows notifications for an installed app. Share menu, then "Add to Home Screen".',
  'settings.notifications.error.denied': 'Notifications are blocked. Allow them for this app in your browser or phone settings, then try again.',
  'settings.notifications.error.failed': 'Could not set up notifications.',
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
