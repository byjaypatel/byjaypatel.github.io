/* Crack the doors - three rounds over the real component lists.
 *
 * A round lists component names only. Whether each one is open, locked, or "locked" by a permission nobody can
 * hold is DERIVED from the parsed manifest at runtime, so the game cannot claim something the XML does not say.
 *
 *   open    - another app can reach it
 *   locked  - a real permission guards it
 *   fake    - the permission attribute points at a string resource (a label), so nothing is enforced
 */
window.DOORS_GAME = {
  intro: "Three lines per door. Click the ones another app can open.",
  rounds: [
    {
      id: "r1",
      app: "bugbazaar",
      kicker: "round 1 \u00b7 the ones that say it out loud",
      line: "BugBazaar writes <code>android:exported</code> on every component. Read the permission line too.",
      doors: [
        "com.BugBazaar.ui.addresses.AddressContentProvider",
        "com.BugBazaar.ui.Deeplink",
        "com.BugBazaar.ui.components.SMSService",
        "com.BugBazaar.provider.MyContactsProvider",
        "androidx.work.impl.diagnostics.DiagnosticsReceiver",
        "com.google.android.gms.auth.api.signin.RevocationBoundService"
      ],
      after: "<b>exported=\"true\" is only half of it.</b> Three of those doors have no permission at all - those are the findings. The other three name one, and a named permission is a lock you cannot pick."
    },
    {
      id: "r2",
      app: "hpandro",
      kicker: "round 2 \u00b7 the ones that say nothing",
      line: "hpAndro leaves <code>exported</code> off 114 components. Only the ones with an intent-filter matter.",
      doors: [
        "hpandro.android.security.ui.activity.SplashActivity",
        "com.onesignal.NotificationOpenedActivityHMS",
        "com.onesignal.BootUpReceiver",
        "hpandro.android.security.ui.activity.task.misc.Backdoor7Activity",
        "hpandro.android.security.utils.fcm.OSNotificationExtenderService",
        "hpandro.android.security.ui.activity.task.datastorage.HiddenActivity"
      ],
      after: "<b>No attribute plus an intent-filter means exported.</b> That is the rule people skip, and it is why 'grep exported=true' misses doors. A component with <code>exported=\"false\"</code> stays shut even with a filter on it."
    },
    {
      id: "r3",
      app: "bugbazaar",
      kicker: "round 3 \u00b7 the lock that is not a lock",
      line: "One of these looks protected. Its permission is a string resource - the app's own name.",
      doors: [
        "com.BugBazaar.provider.UserProfileProvider",
        "com.BugBazaar.ui.addresses.AddressContentProvider",
        "com.BugBazaar.provider.MyContactsProvider",
        "com.darvin.security.IsolatedService",
        "com.BugBazaar.ui.Signin",
        "androidx.work.impl.background.systemjob.SystemJobService"
      ],
      after: "<b><code>readPermission=\"@string/app_name\"</code> protects nothing.</b> It points at the same resource as <code>android:label</code>, and no app can ever hold it. Scanners still print it as protected - which is exactly how a High gets filed as Info."
    }
  ]
};
