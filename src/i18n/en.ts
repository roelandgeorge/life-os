/**
 * §5.3 — all user-facing strings live here as a flat key map. English only in
 * v1. `domains.ts` labels and `visual/layers.ts` panels reference these keys
 * by name; nothing else hardcodes copy. Habit *titles* are data now
 * (`UserHabit.title`, from the catalogue or typed by the user), not i18n —
 * only the fixed chrome around them lives here.
 */

export const en = {
  // The 10 catalogue domains (§1.2) — group headings in the habit list.
  'domain.sleep': 'Sleep',
  'domain.nutrition': 'Nutrition',
  'domain.training': 'Training',
  'domain.appearance': 'Appearance',
  'domain.mindset': 'Mindset',
  'domain.productivity': 'Productivity',
  'domain.social': 'Social',
  'domain.hospitality': 'Hospitality',
  'domain.family': 'Family',
  'domain.finance': 'Finance',

  // The 5 panels (§1.2) — row labels in History.
  'panel.body': 'Body',
  'panel.head': 'Head',
  'panel.network': 'Network',
  'panel.partner': 'Partner',
  'panel.wealth': 'Wealth',

  'main.headline': 'This is future you.',
  'main.subhead': 'If today holds.',
  'main.nextMove.gained': "Today's ticks moved {count} of them up a step.",
  'main.nextMove.waiting': 'Tick a box today and the picture moves.',
  'main.day.today': 'Today',
  'main.day.yesterday': 'Yesterday',
  'habits.own': 'Your own habits',
  'habits.streak': '{count}× streak',
  'main.restDay': 'Rest day',
  'main.risk.one': '{name} runs out {when} — that streak is about to break.',
  'main.risk.many': '{count} things are about to lapse — check them below.',
  'main.risk.today': 'today',
  'main.risk.tomorrow': 'tomorrow',
  'main.editingPast': "Filling in {day}. The picture still shows today's standing.",
  'main.fullDay': 'Full day. This is the trajectory.',
  'main.allDone': 'Daily tasks all done',
  'main.lastHit': 'last: {date}',
  'main.neverHit': 'not yet',
  'main.loading': 'Loading…',
  'error.storage.title': "Can't reach your data",
  'error.storage.retry': 'Try again',

  // Best-version comparison. A deliberate, documented reversal of the spec's
  // "no idealised self for comparison" — see README.
  'main.bestVersion.show': 'See your best version',
  'main.bestVersion.hide': 'Back to now',
  'main.bestVersion.headline': 'This is future you, at your best.',
  'main.bestVersion.subhead': 'Every part at its top step. Two good days is all any one of them takes.',

  // Onboarding — one explanation screen; the decision tree is phase 4.
  'onboarding.closing.title': 'How this works',
  'onboarding.closing.line1': 'Each day you check off the habits you picked — sleep, food, training, and whatever else you added. Some only need a tick once a week or once a month.',
  'onboarding.closing.line2': "Nothing here scores your day. Each part of the picture moves one step at a time: enough of your habits closing out well takes it up, a stretch of them missing takes it down.",
  'onboarding.closing.line3': 'The picture above is you in fifteen years. Everything starts halfway, so it can move either way from day one.',
  'onboarding.closing.iosNote': "On iPhone: add this to your home screen from the share menu — that's what lets the evening reminder in Settings actually notify you.",
  'onboarding.closing.start': 'Start',

  'nav.main': 'Home',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  'history.title': 'History',
  'history.subhead': 'Last {days} days.',
  'history.fullDay': 'Full Day density, last 30 days',
  'history.habit.daily': 'last 30 days',
  'history.habit.periods': 'last {count} periods',

  'settings.title': 'Settings',

  'settings.habits': 'Your habits',
  'settings.habits.note': 'Weight decides how much a habit counts towards the picture. A habit with no domain still counts for streaks but moves nothing.',
  'settings.habits.title.placeholder': 'Habit name',
  'settings.habits.weight': 'Weight',
  'settings.habits.domain.none': 'No domain (your own)',
  'settings.habits.cadence.daily': 'Daily',
  'settings.habits.cadence.weekly': 'Weekly',
  'settings.habits.cadence.monthly': 'Monthly',
  'settings.habits.cadence.other': 'Other (catalogue default)',
  'settings.habits.remove': 'Remove',
  'settings.habits.empty': 'No habits yet — add one below or from the catalogue.',
  'settings.habits.add.placeholder': 'e.g. No alcohol',
  'settings.habits.add.button': 'Add a habit of your own',

  'settings.catalog': 'Add from the catalogue',
  'settings.catalog.note': 'Curated habits, tagged by domain and how well-evidenced they are.',
  'settings.catalog.add': 'Add',
  'settings.catalog.added': 'Added',

  'settings.notifications': 'Daily reminder',
  'settings.notifications.note': 'One notification a day, in the evening. The exact minute is not guaranteed — the free plan schedules it within the hour.',
  'settings.notifications.enable': 'Remind me each evening',
  'settings.notifications.on': 'On. A reminder arrives each evening.',
  'settings.notifications.working': 'Setting up…',
  'settings.notifications.error.unsupported': 'This browser cannot do push notifications.',
  'settings.notifications.error.notInstalled': 'On iPhone, add Life OS to your home screen first — Safari only allows notifications for an installed app. Share menu, then "Add to Home Screen".',
  'settings.notifications.error.denied': 'Notifications are blocked. Allow them for this app in your browser or phone settings, then try again.',
  'settings.notifications.error.failed': 'Could not set up notifications.',
  'settings.notifications.test': 'Send a test notification',
  'settings.notifications.testing': 'Sending…',
  'settings.notifications.test.note':
    'Goes through the whole chain the evening reminder uses, and says where it stops if it stops.',
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
