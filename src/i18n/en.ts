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

  // The 5 panels (§1.2) — row labels in History. The third is labelled
  // People on screen (docs/onboarding/01-onboarding-spec.md §4.4) — the code
  // keeps calling it network.
  'panel.body': 'Body',
  'panel.head': 'Head',
  'panel.network': 'People',
  'panel.partner': 'Partner',
  'panel.wealth': 'Wealth',

  'main.headline': 'This is future you.',
  'main.subhead': 'If today holds.',
  'main.nextMove.gained': "Today's ticks moved {count} of them up a step.",
  'main.nextMove.waiting': 'Tick a box today and the picture moves.',
  'main.day.today': 'Today',
  'main.day.yesterday': 'Yesterday',
  'habits.own': 'Your own habits',
  /** Opens a domain group's own catalogue (docs/onboarding/04-revisions.md §6) — the only route in. */
  'main.domain.browse': 'Add to {domain}',
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

  'nav.main': 'Home',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  'history.title': 'History',
  'history.subhead': 'Last {days} days.',
  'history.fullDay': 'Full Day density, last 30 days',
  'history.habit.daily': 'last 30 days',
  'history.habit.periods': 'last {count} periods',

  'settings.title': 'Settings',

  // Profile fields — the figure's gender and hair, asked by onboarding
  // (app/Onboarding.tsx's drawing pickers) and nowhere else, per
  // docs/onboarding/04-revisions.md §4 and §10.
  'profile.gender.male': 'Male',
  'profile.gender.female': 'Female',
  'profile.hair.blond': 'Blond',
  'profile.hair.dark': 'Dark',
  'profile.hair.none': 'None',

  'catalog.effort.low': 'Low effort',
  'catalog.effort.medium': 'Medium effort',
  'catalog.effort.high': 'High effort',

  'settings.habits': 'Your habits',
  'settings.habits.title.placeholder': 'Habit name',
  'settings.habits.cadence.daily': 'Daily',
  'settings.habits.cadence.weekly': 'Weekly',
  'settings.habits.cadence.monthly': 'Monthly',
  'settings.habits.remove': 'Remove',
  'settings.habits.empty': 'No habits yet. Add one from a domain above, or redo what you work on in Settings.',

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

  // Settings' two remaining onboarding controls (docs/onboarding/04-revisions.md
  // §5, §10) — each re-runs one independent half of onboarding and writes only
  // its own fields.
  'settings.figure': 'Figure',
  'settings.figure.redo': 'Redo the figure',
  'settings.workOn': 'What you work on',
  'settings.workOn.redo': 'Redo what you work on',

  // A domain group's own catalogue (docs/onboarding/04-revisions.md §6) — the
  // only way into the catalogue, replacing the old cross-domain Discover.
  'domainCatalog.back': 'Back',
  'domainCatalog.add': 'Add {title}',
  'domainCatalog.write.open': 'Write your own',
  'domainCatalog.write.title.placeholder': 'Habit name',
  'domainCatalog.write.importance.important': 'Important',
  'domainCatalog.write.importance.medium': 'Medium',
  'domainCatalog.write.importance.notImportant': 'Not important',
  'domainCatalog.write.emoji.placeholder': 'Emoji (optional)',
  'domainCatalog.write.save': 'Add',
  'domainCatalog.edit.save': 'Save',
  'action.cancel': 'Cancel',

  // A habit row's menu (§9) — Remove for everyone, Edit for a habit the user
  // wrote themselves. Remove reuses settings.habits.remove.
  'habits.menu.edit': 'Edit',

  // The landing screen (docs/onboarding/01-onboarding-spec.md §6) — shown
  // once, right after onboarding, as MainScreen's own headline for that
  // session. Copy pinned verbatim against src/content/onboarding-tree.json's
  // LAND node, which App.tsx/Onboarding.tsx never render directly.
  'main.landing.headline': 'Fifteen years out. Everything in the middle.',
  'main.landing.count.0': 'Nothing due today.',
  'main.landing.count.1': 'One box today.',
  'main.landing.count.2': 'Two boxes today.',
  'main.landing.count.3': 'Three boxes today.',
  'main.landing.count.4': 'Four boxes today.',
} as const;

export type I18nKey = keyof typeof en;

/** `{token}` substitution. No pluralisation, no nesting — v1 doesn't need it. */
export function t(key: I18nKey, vars: Record<string, string | number> = {}): string {
  let out: string = en[key];
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
