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

  // Onboarding — the decision tree (§4.6 of docs/plan/phase-4.md).
  'onboarding.nav.back': 'Back',
  'onboarding.nav.next': 'Next',
  'onboarding.nav.start': 'Start',
  'onboarding.nav.step': 'Step {current} of {total}',

  'onboarding.gender.title': 'Which drawing is you?',
  'onboarding.gender.note': 'Changeable later in Settings.',
  'onboarding.hair.title': 'And your hair?',
  'onboarding.hair.note': 'Changeable later in Settings.',

  'onboarding.partner.title': 'Do you have a partner?',
  'onboarding.partner.note': "One panel is theirs — this is only about whether it's drawn.",
  'onboarding.partner.yes': 'Yes',
  'onboarding.partner.no': 'No',

  'onboarding.partnerLooks.title': 'Which drawing is your partner?',
  'onboarding.partnerLooks.note': 'Changeable later in Settings.',

  'onboarding.children.title': 'Do you have children?',
  'onboarding.children.note': "Some habits only make sense once there's a child in the picture.",
  'onboarding.children.yes': 'Yes',
  'onboarding.children.no': 'No',

  'onboarding.domains.title': "Which parts of life do you want to work on, and in what order?",
  'onboarding.domains.note': "Turn on as many as you like. The order decides where each group sits on Home — nothing is ever hidden by this.",

  'onboarding.starters.title': '{domain}: pick your habits',
  'onboarding.starters.note': 'Three are checked already, picked for evidence and importance. Add or remove anything.',

  // Onboarding tree (docs/onboarding/01-onboarding-spec.md) — the rebuild
  // replacing everything above; copy pinned verbatim by
  // core/onboarding.test.ts against src/content/onboarding-tree.json. The
  // renderer reads text and labels straight off that tree data, the same way
  // HabitPicker reads a catalogue item's own title — these keys exist as the
  // audit trail "every fixed user-facing string lives here" asks for, not as
  // lookups the renderer performs itself.
  'onboarding.tree.s0.text':
    'This is you in fifteen years.\nEverything starts in the middle. It moves with what you do, both ways.',
  'onboarding.tree.s0.button': 'Go on',

  'onboarding.tree.q1.text': 'Which one is furthest from where you want it?',
  'onboarding.tree.q1.body.label': 'Body',
  'onboarding.tree.q1.body.sub': 'How you look. How you feel in it.',
  'onboarding.tree.q1.head.label': 'Head',
  'onboarding.tree.q1.head.sub': "Calm, focus, doing what you said you'd do.",
  'onboarding.tree.q1.people.label': 'People',
  'onboarding.tree.q1.people.sub': 'Friends. Who you call, who calls you.',
  'onboarding.tree.q1.partner.label': 'Partner',
  'onboarding.tree.q1.partner.sub': 'Someone to come home to. Or the one already there.',
  'onboarding.tree.q1.money.label': 'Money',
  'onboarding.tree.q1.money.sub': "What's in the account, and where it goes.",
  'onboarding.tree.q1.none.label': "None of them. I'm here to keep it that way.",

  'onboarding.tree.mainThing.text': "What's the main thing?",
  'onboarding.tree.body.weight.label': 'The weight.',
  'onboarding.tree.body.noStrength.label': 'No strength. No shape.',
  'onboarding.tree.tiredAllTheTime.label': 'Tired all the time.',
  'onboarding.tree.letMyselfGo.label': "I've let myself go. Hair, skin, clothes.",
  'onboarding.tree.allOfItABit.label': 'All of it, a bit.',

  'onboarding.tree.q3Ba.text': 'Which is more true?',
  'onboarding.tree.eatTooMuch.label': 'I eat too much of the wrong things.',
  'onboarding.tree.barelyMove.label': 'I barely move.',

  'onboarding.tree.q3Bb.text': 'Where would you train?',
  'onboarding.tree.aGym.label': 'A gym.',
  'onboarding.tree.atHome.label': 'At home. Some kit.',
  'onboarding.tree.nowhereYet.label': 'Nowhere yet.',

  'onboarding.tree.putThingsOff.label': 'I put things off.',
  'onboarding.tree.headWontSettle.label': "My head won't settle.",
  'onboarding.tree.sayAndDont.label': "I say I'll do things and don't.",
  'onboarding.tree.feelBehind.label': 'I feel behind.',
  'onboarding.tree.foggy.label': "Foggy. Can't hold a thought.",

  'onboarding.tree.q3Ha.text': 'Where does the time go instead?',
  'onboarding.tree.thePhone.label': 'The phone.',
  'onboarding.tree.anythingButTheThing.label': 'Anything but the thing.',

  'onboarding.tree.q3Hb.text': 'When is it worst?',
  'onboarding.tree.atNight.label': 'At night.',
  'onboarding.tree.allDay.label': 'All day.',

  'onboarding.tree.q3Hc.text': 'Do you sleep enough?',
  'onboarding.tree.yes.label': 'Yes.',
  'onboarding.tree.no.label': 'No.',
  'onboarding.tree.noIdea.label': 'No idea.',

  'onboarding.tree.q2P.text': "What's the shape of it?",
  'onboarding.tree.lostTouch.label': "I've lost touch with people I like.",
  'onboarding.tree.notManyPeople.label': "There aren't many people to lose touch with.",
  'onboarding.tree.haveNeverSee.label': 'I have people. I never see them.',
  'onboarding.tree.goQuiet.label': 'I go quiet around people.',
  'onboarding.tree.itsFamily.label': "It's family. I don't call.",

  'onboarding.tree.q3Pa.text': 'Is there anything you go to every week? A club, a class, a game, a team.',
  'onboarding.tree.q3Pb.text': 'Could you have four people over next month, without cooking?',

  'onboarding.tree.isThereSomeone.text': 'Is there someone?',
  'onboarding.tree.childrenQuestion.text': 'Children?',

  'onboarding.tree.whatsTrue.text': "What's true?",
  'onboarding.tree.coupleGood.label': "We're good. I want to keep it that way.",
  'onboarding.tree.coupleDontTalk.label': "We don't talk about anything that matters.",
  'onboarding.tree.allLogistics.label': "It's all logistics now.",
  'onboarding.tree.thinkingChildren.label': "We're thinking about children.",
  'onboarding.tree.notSureAboutUs.label': "I'm not sure about us.",

  'onboarding.tree.notMeetingAnyone.label': "I'm not meeting anyone.",
  'onboarding.tree.goesNowhere.label': 'I meet people. It goes nowhere.',
  'onboarding.tree.notReady.label': "I'm not ready. I'd sort myself out first.",

  'onboarding.tree.nothingSaved.label': 'Nothing gets saved.',
  'onboarding.tree.dontKnowWhereItGoes.label': "I don't know where it goes.",
  'onboarding.tree.dontEarnEnough.label': "I don't earn enough.",
  'onboarding.tree.debt.label': 'Debt.',
  'onboarding.tree.fineWantGrow.label': "It's fine. I want it to grow.",

  'onboarding.tree.employedOrOwnThing.text': 'Employed, or your own thing?',
  'onboarding.tree.employed.label': 'Employed.',
  'onboarding.tree.ownThing.label': 'My own thing.',
  'onboarding.tree.both.label': 'Both.',

  'onboarding.tree.oneMoreOrThatsIt.text': 'One more, or is that it?',
  'onboarding.tree.oneMore.label': 'One more.',
  'onboarding.tree.thatsIt.label': "That's it.",

  'onboarding.tree.sit.text': 'Two things the drawing needs.',

  'onboarding.tree.figGender.text': 'Now the figure. Which one?',
  'onboarding.tree.figHair.text': 'Hair?',

  'onboarding.tree.land.text': 'Fifteen years out. Everything in the middle.',
  'onboarding.tree.land.count.0': 'Nothing due today.',
  'onboarding.tree.land.count.1': 'One box today.',
  'onboarding.tree.land.count.2': 'Two boxes today.',
  'onboarding.tree.land.count.3': 'Three boxes today.',
  'onboarding.tree.land.count.4': 'Four boxes today.',

  'nav.main': 'Home',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  'history.title': 'History',
  'history.subhead': 'Last {days} days.',
  'history.fullDay': 'Full Day density, last 30 days',
  'history.habit.daily': 'last 30 days',
  'history.habit.periods': 'last {count} periods',

  'settings.title': 'Settings',

  'settings.appearance': 'Appearance',
  'settings.appearance.note': 'Decides which drawing of you and your partner the picture uses.',
  'settings.domainOrder': 'Domain order',
  'settings.domainOrder.note': 'Turn on as many as you like. The order decides where each group sits on Home — nothing is ever hidden by this.',

  // Profile fields (app/ProfileFields.tsx) — shared by onboarding and
  // Settings' Profile section, so a control met once reads the same the
  // second time.
  'profile.gender.male': 'Male',
  'profile.gender.female': 'Female',
  'profile.hair.blond': 'Blond',
  'profile.hair.dark': 'Dark',
  'profile.hair.none': 'None',
  'profile.partner.wanted': 'I have a partner',
  'profile.children': 'I have children',
  'profile.domains.up': 'Move up',
  'profile.domains.down': 'Move down',

  // Catalogue metadata line (app/HabitPicker.tsx) — onboarding's starter
  // step and Discover both read it.
  'catalog.cadence.daily': 'Daily',
  'catalog.cadence.weekly': 'Weekly',
  'catalog.cadence.monthly': 'Monthly',
  'catalog.cadence.everyDays': 'Every {days} days',
  'catalog.cadence.situational': 'As needed',
  'catalog.cadence.once': 'One-time',
  'catalog.importance': 'Importance {n}/5',
  'catalog.effort.low': 'Low effort',
  'catalog.effort.medium': 'Medium effort',
  'catalog.effort.high': 'High effort',
  'catalog.evidence.strong': 'Strong evidence',
  'catalog.evidence.moderate': 'Moderate evidence',
  'catalog.evidence.anecdotal': 'Anecdotal evidence',

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
  'settings.catalog.added': 'Added',
  'settings.catalog.discover': 'Browse the catalogue',

  // Discover (app/DiscoverScreen.tsx) — a full-screen sub-view from Settings.
  'discover.title': 'Discover',
  'discover.back': 'Back',
  'discover.search.label': 'Search',
  'discover.search.placeholder': 'Search habits…',
  'discover.empty': 'Nothing matches.',

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
