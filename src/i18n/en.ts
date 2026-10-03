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
  'main.day.today': 'Today',
  'main.day.yesterday': 'Yesterday',
  'habits.own': 'Your own habits',
  /** Opens a domain group's own catalogue (docs/onboarding/04-revisions.md §6) — the only route in. */
  'main.add': 'Add a habit',
  'habits.streak': '{count}× streak',
  'main.restDay': 'Rest day',
  'main.recover.daily': 'Missed yesterday.',
  'main.recover.other': 'Missed last time.',
  'main.recover.twice': 'Not twice.',
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

  // One window for every track on the screen (app/history.ts), so no row
  // states its own span.
  'history.title': 'History',
  'history.fullDay': 'Full Day density',

  'settings.title': 'Settings',

  // Profile fields — the figure's gender and hair, asked by onboarding
  // (app/Onboarding.tsx's drawing pickers) and nowhere else, per
  // docs/onboarding/04-revisions.md §4 and §10.
  'profile.gender.male': 'Male',
  'profile.gender.female': 'Female',
  'profile.hair.blond': 'Blond',
  'profile.hair.dark': 'Dark',
  'profile.hair.none': 'None',


  'settings.habits': 'Your habits',
  'settings.habits.title.placeholder': 'Habit name',
  // The cadences the habit editor offers (core/habits.ts's CADENCE_CHOICES).
  // Two of them are `{ everyDays }`, which the model always had and the
  // screen never offered.
  'habits.cadence.daily': 'Daily',
  'habits.cadence.everyOtherDay': 'Every other day',
  'habits.cadence.weekly': 'Weekly',
  'habits.cadence.everyTwoWeeks': 'Every 2 weeks',
  'habits.cadence.monthly': 'Monthly',
  'settings.habits.remove': 'Remove',
  'settings.habits.empty': 'No habits yet. Tap + below to add one.',

  'settings.notifications': 'Daily reminder',
  'settings.notifications.enable': 'Remind me each evening, give or take an hour',
  'settings.notifications.on': 'On. A reminder arrives each evening.',
  'settings.notifications.working': 'Setting up…',
  'settings.notifications.error.unsupported': 'This browser cannot do push notifications.',
  'settings.notifications.error.notInstalled': 'On iPhone, add Life OS to your home screen first — Safari only allows notifications for an installed app. Share menu, then "Add to Home Screen".',
  'settings.notifications.error.denied': 'Notifications are blocked. Allow them for this app in your browser or phone settings, then try again.',
  'settings.notifications.error.failed': 'Could not set up notifications.',
  'settings.notifications.test': 'Send a test notification',
  'settings.notifications.testing': 'Sending…',
  'settings.data': 'Data',
  'settings.export': 'Export',
  'settings.import': 'Import',
  'settings.reset': 'Reset',
  'settings.reset.confirm': 'Delete all Life OS data on this device? This cannot be undone.',

  // Settings' two remaining onboarding controls (docs/onboarding/04-revisions.md
  // §5, §10) — each re-runs one independent half of onboarding and writes only
  // its own fields.
  'settings.figure.redo': 'Change the figure',
  'settings.workOn.redo': 'Add life domains',

  // A domain group's own catalogue (docs/onboarding/04-revisions.md §6) — the
  // only way into the catalogue, replacing the old cross-domain Discover.
  'domainCatalog.back': 'Back',
  'domainCatalog.add': 'Add {title}',
  'domainCatalog.write.open': 'Write your own',
  'addHabit.title': 'Add a habit',
  'addHabit.count': '{count} on your list',
  'action.cancel': 'Cancel',

  // The habit editor (docs/onboarding/07-revisions.md §3) — an editable row,
  // so these are the fields' accessible names as much as their placeholders.
  'habits.edit.title.placeholder': 'Habit name',
  'habits.edit.note.placeholder': 'One line under it (optional)',
  'habits.edit.emoji': 'Emoji',
  'habits.edit.save': 'Save',
  'habits.edit.moveUp': 'Move up',
  'habits.edit.moveDown': 'Move down',

  // A habit row's menu — Edit and Remove for every habit, catalogue or not
  // (docs/onboarding/06-revisions.md §2). Remove reuses settings.habits.remove.
  'habits.menu.edit': 'Edit',

  // The landing screen (docs/onboarding/01-onboarding-spec.md §6) — shown
  // once, right after onboarding, as MainScreen's own headline for that
  // session, and nothing else: the count line under it is gone
  // (docs/onboarding/06-revisions.md §4). Copy pinned verbatim against
  // src/content/onboarding-tree.json's LAND node, which App.tsx and
  // Onboarding.tsx never render directly.
  'main.landing.headline': 'This is you in fifteen years.',
} as const;

export type I18nKey = keyof typeof en;

/** `{token}` substitution. No pluralisation, no nesting — v1 doesn't need it. */
export function t(key: I18nKey, vars: Record<string, string | number> = {}): string {
  let out: string = en[key];
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
