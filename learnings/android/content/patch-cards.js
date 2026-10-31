/* Patch-the-line: one correct fix and two plausible-but-wrong ones for each of the 20 findings.
   Rules obeyed here, same as the rest of the guide:
   - the broken line is never retyped: it is pulled from FINDINGS at runtime
   - every wrong option is a real hardening action - it just does not fix THIS finding,
     and the card says why. Students learn to match a fix to a root cause, not to guess.
   - fixes are minimal single changes. No version bumps, no rewrites. */
window.PATCHES = {
  intro: "Same twenty findings, one step further. You named them on the report desk; now choose the patch. " +
    "Every card shows the real line, three things a developer might plausibly do, and only one of them " +
    "fixes the finding you are looking at. The wrong ones are not nonsense - each is genuine advice that " +
    "belongs to a different bug, and picking it teaches you the difference.",

  cards: {
    /* ---------- hpAndro 1.3 ---------- */
    "h-allowbackup": {
      fix: { t: "Set android:allowBackup=\"false\" on <application>, or add a <fullBackupContent> rule that excludes shared_prefs.", tag: "config" },
      wrong: [
        { t: "Set android:exported=\"false\" on the HiddenActivity.", why: "That closes a different hole. Exported stops other apps from starting the activity; it does nothing about the backup agent copying the app's private files off the device." },
        { t: "Obfuscate the app with ProGuard/R8 so the prefs are harder to read.", why: "Obfuscation renames classes; it does not change what the backup system copies. The prefs file ships as-is inside the backup payload." }
      ]
    },
    "h-cleartext": {
      fix: { t: "Set android:usesCleartextTraffic=\"false\" and drop the cleartext permit from the task screen; HTTPS only.", tag: "config" },
      wrong: [
        { t: "Add a certificate pinning layer to the HTTP calls.", why: "Pinning is stronger on an already-encrypted channel. You cannot pin cleartext HTTP - there is no certificate to pin." },
        { t: "Put the API behind a VPN so the traffic is protected.", why: "A tunnel may protect the hop but the app still speaks HTTP, and any cleartext permit in the manifest keeps every other request exposed too." }
      ]
    },
    "h-ca": {
      fix: { t: "Remove the <trust-anchors> user entry from network_security_config.xml; trust only the system store, pin where you can.", tag: "config" },
      wrong: [
        { t: "Add android:networkSecurityConfig pointing at a stricter file.", why: "The finding is the CONTENT of the config, not the pointer. You already point at a config; it is the one that trusts user CAs." },
        { t: "Install the app on a device without a proxy.", why: "You cannot control where students and attackers install a publicly shareable APK. The config travels with the app." }
      ]
    },
    "h-hidden": {
      fix: { t: "Set android:exported=\"false\" on HiddenActivity, or guard it with a signature-level permission.", tag: "component" },
      wrong: [
        { t: "Delete the string resources the activity displays.", why: "The risk is that any app can start the activity with an Intent and reach its logic. The strings are not the boundary; the exported flag is." },
        { t: "Rename the activity so attackers cannot find it.", why: "Names are visible in the parsed manifest regardless. Renaming changes nothing about who can launch it." }
      ]
    },
    "h-fp": {
      fix: { t: "Nothing to patch - but write it down: these two exports are library defaults (WorkManager, FCM), documented and safe to leave.", tag: "triage" },
      wrong: [
        { t: "Set android:exported=\"false\" on SystemJobService.", why: "That one breaks background work: WorkManager's scheduler expects its service to be startable by the system. This card is a false-positive lesson, not a patch." },
        { t: "Report them as high severity because they are exported.", why: "Severity comes from reachability plus impact, not from the exported flag alone. The system is the legitimate caller here." }
      ]
    },
    "h-priv": {
      fix: { t: "Nothing to patch - the permission is signature|privileged, a normal app cannot hold it. Record why it is not exploitable.", tag: "triage" },
      wrong: [
        { t: "Remove the uses-permission element from the manifest.", why: "You cannot remove it - it guards a platform behaviour the app needs, and it is exactly the kind of permission the OS only grants to privileged code anyway." },
        { t: "Downgrade the protection level to dangerous.", why: "The protection level belongs to whoever declares the permission, not to the app that requests it. And lowering it would weaken, not harden." }
      ]
    },
    "h-target": {
      fix: { t: "Raise targetSdkVersion and re-test - newer targets switch on platform defaults (exported required, scoped storage). Not a one-line change: plan it.", tag: "triage" },
      wrong: [
        { t: "Set tools:targetApi=\"31\" so lint stops warning.", why: "That silences the message; it changes no runtime behaviour. The manifest still runs under old defaults." },
        { t: "Add android:exported=\"true\" to every component.", why: "That is the opposite direction - it makes the exposure explicit AND keeps the components reachable. The target raise is what forces honest declaration." }
      ]
    },

    /* ---------- BugBazaar v1.2.1 ---------- */
    "debuggable": {
      fix: { t: "Remove android:debuggable=\"true\" from the release manifest (and stop ignoring the lint warning that caught it).", tag: "config" },
      wrong: [
        { t: "Strip the attribute in a release build type with a different sourceSet.", why: "That is how it SHOULD work - but the shipped release APK carries the attribute, so the release config is not what got fixed. Ship what you patch." },
        { t: "Require a PIN before the debug screen opens.", why: "The flag opens JDWP debugging and dump access to whoever holds the device - a UI gate does not close the debugger port." }
      ]
    },
    "permtypo": {
      fix: { t: "Make the required name match the declared one: com.BugBazaar.permission.contact -> com.BugBazaar.permission.contacts (or fix both ends).", tag: "permission" },
      wrong: [
        { t: "Change the declared protection level from signature to dangerous.", why: "The provider is broken because the names differ, so NOBODY can hold the guard. Lowering the protection level of the declared one widens who could hold it - it does not join the two names." },
        { t: "Set android:exported=\"false\" on MyContactsProvider.", why: "That would also close it - but it changes the app's contract (no other component may read contacts) and hides the real bug: a typo that made the guard unhidable." }
      ]
    },
    "addressprovider": {
      fix: { t: "Add android:readPermission=\"com.BugBazaar.permission.addresses\" (signature level) to AddressContentProvider.", tag: "component" },
      wrong: [
        { t: "Validate the Uri in query() and reject malformed paths.", why: "Input validation helps the SQL problem, not the access problem. Every app on the device is still an allowed caller." },
        { t: "Store the addresses encrypted in SQLite.", why: "The provider hands plaintext rows to any caller because of a missing permission - encryption at rest does not stop a legitimate query through the same door." }
      ]
    },
    "userprofile": {
      fix: { t: "Point android:readPermission at a real permission name, not @string/app_name - a label nobody can hold is not a guard.", tag: "permission" },
      wrong: [
        { t: "Add android:writePermission as well, to match.", why: "You would be adding a second broken guard in the same style. The bug is that the value is a display label; fixing the read side is the actual patch." },
        { t: "Set android:grantUriPermissions=\"true\".", why: "That widens access: it lets callers request temporary one-shot grants. The provider currently LOOKS locked but is not - this makes it worse." }
      ]
    },
    "deeplink": {
      fix: { t: "Drop the autoVerify host / tighten the intent-filter scheme+host, and require re-authentication inside ExternalAuthLogin before trusting the URI.", tag: "component" },
      wrong: [
        { t: "Add a second scheme so links are easier to type.", why: "More schemes means more entry paths from outside, exactly what made this an issue." },
        { t: "Set android:launchMode=\"singleTop\".", why: "launchMode is about instance reuse in the task stack. An attacker launching the activity with a crafted URI still gets their instance." }
      ]
    },
    "cleartext": {
      fix: { t: "Remove android:requestLegacyExternalStorage and the ScopedStorage suppression; use scoped storage APIs.", tag: "config" },
      wrong: [
        { t: "Set android:allowBackup=\"false\".", why: "Backup scope and file-storage scope are different mechanisms. This fixes the hpAndro backup finding, not legacy external storage." },
        { t: "Keep the flag but encrypt the files the app writes.", why: "Legacy storage exposes the whole shared volume to whatever gets file access; encrypting your own writes does not take the app out of legacy mode." }
      ]
    },
    "perms": {
      fix: { t: "Remove SMS / contacts / MANAGE_EXTERNAL_STORAGE unless a feature needs them; request the minimum at runtime, not in the manifest block.", tag: "permission" },
      wrong: [
        { t: "Move the dangerous permissions to runtime-only requests.", why: "Runtime requests still come from declared permissions. The manifest block IS the declaration you have to shrink." },
        { t: "Set android:maxSdkVersion on each uses-permission.", why: "That narrows the OS versions where the grant applies - useful hygiene, but the app still asks for SMS and contacts on every supported device." }
      ]
    },
    "exportedservices": {
      fix: { t: "Guard CustomBR and SMSService with a signature-level permission, or set android:exported=\"false\" if nothing outside the app starts them.", tag: "component" },
      wrong: [
        { t: "Rename the service and receiver classes.", why: "Names come out of the parsed manifest for anyone to read. Renaming is not an access control." },
        { t: "Log every incoming Intent for review.", why: "Logging an attack is detection, not prevention - and in this app it would also record message contents, which is a privacy finding of its own." }
      ]
    },
    "merger": {
      fix: { t: "Nothing to patch in your own code - but audit the 8 library-added components and pin your dependencies. The build writes manifest lines you never wrote.", tag: "triage" },
      wrong: [
        { t: "Delete the library components from the final manifest.", why: "They are merged in at build time from manifests you do not own; deleting them breaks the libraries. You audit them, you do not erase them." },
        { t: "Set android:exported=\"false\" on all 21 exports.", why: "That closes the app's own components AND the libraries' - Firebase messaging and WorkManager expect their entries to be reachable by the system." }
      ]
    },
    "target": {
      fix: { t: "Raise targetSdkVersion to a current level and re-test - the tools:targetApi=\"31\" lie is masking that the app ships under old defaults.", tag: "triage" },
      wrong: [
        { t: "Bump compileSdkVersion only.", why: "compileSdk is which APIs you build against; targetSdk is which runtime behaviours you accept. The defaults problem follows target, not compile." },
        { t: "Remove tools:targetApi so lint complains again.", why: "That restores the warning - a good tripwire, but the shipped manifest still behaves as if it targets 32." }
      ]
    },
    "creds-plaintext": {
      fix: { t: "Stop writing the password to userCred.xml: store a token or use EncryptedSharedPreferences / Keystore-backed crypto.", tag: "storage" },
      wrong: [
        { t: "Base64-encode the password before writing the pref.", why: "Encoding is not encryption - it is the finding with an extra step, and the guide is explicit about that distinction." },
        { t: "Set android:allowBackup=\"false\".", why: "That stops backup extraction, but any app with root-on-device, a backup bug or debug access still reads the plaintext pref. The store itself is the problem." }
      ]
    },
    "provider-sqli": {
      fix: { t: "Never concatenate into the query: parameterise (selection args), or a strict path-based switch on the URI in query().", tag: "code" },
      wrong: [
        { t: "Escape single quotes in the caller's string.", why: "Blocklist escaping has a long history of being bypassed (encoding, second-order, different quote contexts). Parameter binding makes the injection structurally impossible." },
        { t: "Add android:readPermission to the provider.", why: "That reduces WHO can ask, but the caller who legitimately holds the permission can still inject. Two findings, two patches - this one is the SQL." }
      ]
    },
    "webview-bridge": {
      fix: { t: "On an exported screen: remove the @JavascriptInterface bridge, disable file access, and load only app-controlled content over HTTPS.", tag: "code" },
      wrong: [
        { t: "Set android:exported=\"false\" on the activity and stop.", why: "It also kills the deeplink path that legitimately opens TermsAndConditions. And if any other entry keeps the activity reachable, the bridge is still armed." },
        { t: "Call setAllowFileAccess(true) so the WebView renders terms correctly.", why: "That is the current bug, restated as a fix. File access plus JavaScript is exactly the pair that turns a WebView into a file reader." }
      ]
    }
  }
};