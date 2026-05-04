import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const DAY_NAMES = [
  'Petto + Tricipiti',
  'Schiena + Bicipiti',
  'Spalle + Core',
  'Gambe',
  'Recupero Attivo',
  'Riposo',
  'Riposo',
];

// iOS weekday: 1=Sun, 2=Mon, ... 7=Sat
// Our dow: 0=Mon ... 6=Sun
function iosWeekday(dow) {
  return ((dow + 1) % 7) + 1;
}

export async function scheduleWorkoutNotifications(hour, minute, scheduleOffset = 0) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'workout') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (let dow = 0; dow <= 4; dow++) {
    const name = DAY_NAMES[dow];
    const isRest = dow === 4;
    const body = isRest
      ? 'Oggi: Recupero Attivo. Tapis roulant o riposo, ascolta il tuo corpo.'
      : `Oggi: ${name} 💪 Dai, si parte!`;
    const actualDow = (dow + (scheduleOffset ?? 0)) % 7;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: isRest ? 'Giorno di recupero' : 'È ora di allenarsi!',
        body,
        data: { type: 'workout', dow },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: iosWeekday(actualDow),
        hour,
        minute,
      },
    });
  }
}

export async function scheduleEveningReminder(hour, minute) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'evening') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nutrizione serale 🥗',
      body: 'Hai raggiunto i tuoi macro di oggi? Controlla il log.',
      data: { type: 'evening' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

const WATER_SCHEDULE = [
  { hour: 8,  minute: 0,  body: 'Buongiorno 💧 Inizia la giornata con un bicchiere d\'acqua.' },
  { hour: 11, minute: 0,  body: 'Metà mattina 💧 Hai bevuto abbastanza?' },
  { hour: 13, minute: 0,  body: 'Ora di pranzo 💧 Ricordati di idratare bene.' },
  { hour: 16, minute: 0,  body: 'Pomeriggio 💧 Ancora qualche bicchiere, dai!' },
  { hour: 19, minute: 0,  body: 'Serata 💧 Quasi alla quota giornaliera!' },
  { hour: 21, minute: 0,  body: 'Ultima chiamata 💧 Chiudi la giornata con 3L.' },
];

export async function scheduleWaterReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'water') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const { hour, minute, body } of WATER_SCHEDULE) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bevi acqua! 💧',
        body,
        data: { type: 'water' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
