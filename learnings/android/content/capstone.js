/* Capstone: six flags, one per module, each answerable only from work done in that module.
 *
 * Answers are stored as sha256 of the normalised reply (trim, lowercase, collapse spaces, strip quotes and a
 * trailing slash) so the page does not print the answers in plain text. This is a learning gate, not a security
 * boundary: anyone who reads this file can brute-force six short strings. The guide already contains every one
 * of these facts, and that is the point - the capstone tests whether you found them, not whether you can hide.
 *
 * Hint costs are real: a flag is worth 25 xp, and each hint taken off the same flag costs 5, 10 then 15.
 */
window.CAPSTONE = {
  readinessSample: {
  "label": "A real transcript - recorded on the API 34 emulator, 2026-10-31 12:45",
  "note": "7 pass, 4 warn, 0 fail. Read the four warnings: an emulator serial instead of a handset, no proxy set, no frida-server, no forward. That is what a correctly-installed machine looks like before Module 04 and 03 set those three - nothing is broken. On your handset every value differs except the shape.",
  "text": "ASW generated: 2026-10-31 12:45\nASW adb: 1.0.41\nASW apktool: 2.11.1\nASW jadx: 1.5.6\nASW apksigner: 0.9\nASW java: 23.0.2\nASW devices: emulator-5554\tdevice\nASW serial: emulator-5554\nASW sdk: 34\nASW model: sdk_gphone64_arm64\nASW apps: BugBazaar=1 hpAndro=1\nASW proxy: null\nASW frida: absent\nASW forward: \nASW end"
},

  intro:
    "Six flags, one per module. Each one is a fact you cannot guess - you have to open the app, run the command, " +
    "or read the artifact. Submit it exactly as it appears; case and stray spaces do not matter. " +
    "Hints cost experience, so try first.",

  flags: [
    {
      id: "f1",
      mod: "m1",
      label: "The version that lies",
      ask: "BugBazaar ships as BugBazaar_v1.2.1.apk. What does the manifest inside it actually declare as versionName?",
      where: "#/m1/manifest - read <manifest> before any tool reformats it",
      hash: "d0ff5974b6aa52cf562bea5921840c032a860a91a3512f7fe8f768f6bbe005f6",
      hints: [
        "aapt2 dump badging, or the manifest explorer, prints versionName= on the first line.",
        "The file name is the release the project published; the manifest is what the device installs.",
        "It is a two-character answer that starts with 1."
      ],
      why: "Version strings that disagree with reality break your findings table - you must quote what the manifest says, not the file name."
    },
    {
      id: "f2",
      mod: "m3",
      label: "The digest you produced",
      ask: "Run the hash hook over a string. What is the MD5 digest of the plain string test?",
      where: "#/m3 - f4_observe_hashes.js, or the Module 01 hash challenge",
      hash: "52bbea75ee75a6f1d24781d56e6c8ffb9b76e1024013b516bbaaac27e21ae9e0",
      hints: [
        "32 hex characters, no dashes, lowercase.",
        "You saw this exact value in the recorded output of the hash hook.",
        "It starts with 098f and ends with 627b4f6."
      ],
      why: "Half of Android crypto findings are 'the app hashes with MD5'. The finding is what that digest is of, and whether the salt is per-user."
    },
    {
      id: "f3",
      mod: "m2",
      label: "The door with no lock",
      ask: "One content provider in BugBazaar declares no android:permission at all. What is its authority string?",
      where: "#/m2 - content query against the providers you enumerated",
      hash: "b6bb07e916368cb41289c4f0ddaa431dd47430af3e9a30f010d49611eb2607ca",
      hints: [
        "Look at the exported=true providers and check each one for a permission attribute.",
        "There are three BugBazaar providers; two of them name something.",
        "It ends in .addresses and starts with the package name."
      ],
      why: "An exported provider is only half of it. The permission attribute is the lock - and its absence is what makes the query possible from another app."
    },
    {
      id: "f4",
      mod: "m4",
      label: "Why your proxy CA was trusted",
      ask: "What is BugBazaar's targetSdkVersion?",
      where: "#/m1/manifest - the same <manifest> tag",
      hash: "e29c9c180c6279b0b02abd6a1801c7c04082cf486ec027aa13515e4f3884bb6b",
      hints: [
        "It is an integer, not a codename.",
        "Below 24 means a user-installed CA is trusted by default. BugBazaar is above that line and ships no network security config at all, so a user CA is simply ignored.",
        "Two digits. The second is 2."
      ],
      why: "targetSdk decides whether a user-installed CA is trusted without a network security config. BugBazaar has none, so only the system store worked for it - hpAndro does have one, and it opts into the user store for hpandro.raviramesh.info while task.hpandro.raviramesh.info stays system-only. Getting this wrong is how people conclude 'no pinning' when they simply had the wrong device."
    },
    {
      id: "f5",
      mod: "m2",
      label: "The deeplink into the webview",
      ask: "One BugBazaar deeplink opens a URL inside the app's own webview. Give it as scheme://host/path.",
      where: "#/m2 - the exported activity filter, or #/spot artifact 5",
      hash: "43879f71759a8779b1d0371e18afee56cd0f0fc183c028085cd2bec59927db50",
      hints: [
        "Four deeplinks exist: an auth callback, a cart add, an offers page, and this one.",
        "The host is the app's own name, and the path is the thing that loads a page.",
        "bb://bugbazaar/web"
      ],
      why: "Handing a URL to a webview is only a finding when the app's own trust in that webview is higher than the caller's - file:// and javascript: are where it becomes reachable."
    },
    {
      id: "f6",
      mod: "m2",
      label: "The surface count",
      ask: "How many components in BugBazaar are exported? (an integer)",
      where: "#/m2 - count them from dumpsys package, do not trust a scanner",
      hash: "6f4b6612125fb3a0daecd2799dfd6c9c299424fd920f9b308110a2c1fbd8f443",
      hints: [
        "Activities + services + receivers + providers, not just activities.",
        "More than twenty and fewer than twenty-five - and the source manifest is not the answer.",
        "Twenty-one: nine activities, five receivers, four services, three providers."
      ],
      why: "The count is your attack surface budget. Claim 13 because that is what the source manifest declares, and the built APK ships 21 - the reviewer stops believing the rest of the table."
    }
  ],

  /* shown once all six are in */
  done:
    "Six for six. That is the whole course in six facts: a lying version string, a digest you produced, a provider " +
    "with no lock, a targetSdk that explains your proxy, a deeplink into a webview, and a surface count you did " +
    "not copy from a scanner. Export the lab log from Your progress and hand it in."
};
