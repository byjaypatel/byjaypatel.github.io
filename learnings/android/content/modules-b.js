/* Modules 2 and 3 - exported components first, then the runtime */
window.MODULES = window.MODULES || [];

window.MODULES.push({
  id: "m2", tag: "MODULE 2", time: "70 min", title: "Exported components and deep links",
  goal: "Call BugBazaar's components the way another app would, and separate the real leak from the accidental protection.",
  brief: {"from": "Acme Retail, support desk", "subject": "A link that logs you in?", "body": "A customer reported that tapping a link from a message opened our cart already logged in as them. Engineering says 'that is not possible'. Support has three tickets that say otherwise. Settle it with the two apps in hand.", "want": "Prove which components answer to an outside Intent or a URI, what each one exposes, and turn 'not possible' into a reproduction."},
      intro: "Two commands, two outcomes, one lesson: you cannot tell a leak from a control by reading the manifest.",
  steps: [
    {
      id: "inventory",
      title: "Enumerate the attack surface yourself",
      why: "Every command in this module names a component. A component name you copied from a write-up is worthless on the next app, and the two listings below are how you produce your own - one from the file the developer wrote, one from what the device actually registered.",
      concept: "Two listings, two different jobs. <code>aapt2 dump xmltree</code> shows what the APK <em>declares</em>, including components that library manifests merged in. <code>dumpsys package</code> shows what the <em>package manager registered</em>, with the authority strings, intent filters and permissions that an attacker actually addresses. The interesting row is the one that is exported in the first listing and has no permission in either.",
      see: "Six providers come back for BugBazaar and only one of them is the app's own data. Three are library infrastructure (<code>androidx.startup</code>, <code>firebaseinitprovider</code>, <code>picasso</code>) and are not exported; <code>.provider.MyContactsProvider</code> declares a permission; <code>.ui.addresses.AddressContentProvider</code> declares nothing. That last one is the next step's target, and you found it rather than being told it.",
      cmd: "# 1. what the APK declares - one greppable line per component\naapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" > /tmp/mb.txt\ngrep -c 'E: provider' /tmp/mb.txt\n\n# 2. what the device registered: authorities, which is the real endpoint\nadb shell dumpsys package com.BugBazaar | sed -n '/Providers:/,/Receivers:/p'\n\n# 3. the other two component types, same shape\nadb shell dumpsys package com.BugBazaar \\\n  | sed -n '/Receiver Resolver Table/,/Service Resolver Table/p' \\\n  | grep -E 'com.BugBazaar/|Action:'\nadb shell dumpsys package com.BugBazaar | sed -n '/Service Resolver Table/,/User 0/p' | head -12",
      sim: "$ aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" > /tmp/mb.txt\n$ grep -c 'E: provider' /tmp/mb.txt\n6\n\n$ adb shell dumpsys package com.BugBazaar | sed -n '/Providers:/,/Receivers:/p'\nRegistered ContentProviders:\n  com.BugBazaar/.provider.MyContactsProvider:\n    Provider{618fbf5 com.BugBazaar/.provider.MyContactsProvider}\n  com.BugBazaar/com.squareup.picasso.PicassoProvider:\n    Provider{9e61d8a com.BugBazaar/com.squareup.picasso.PicassoProvider}\n  com.BugBazaar/com.google.firebase.provider.FirebaseInitProvider:\n    Provider{6b6cffb com.BugBazaar/com.google.firebase.provider.FirebaseInitProvider}\n  com.BugBazaar/.provider.UserProfileProvider:\n    Provider{6573818 com.BugBazaar/.provider.UserProfileProvider}\n  com.BugBazaar/.ui.addresses.AddressContentProvider:\n    Provider{ca6271 com.BugBazaar/.ui.addresses.AddressContentProvider}\n  com.BugBazaar/androidx.startup.InitializationProvider:\n    Provider{4908856 com.BugBazaar/androidx.startup.InitializationProvider}\n\nContentProvider Authorities:\n  [com.BugBazaar.androidx-startup]:\n    Provider{4908856 com.BugBazaar/androidx.startup.InitializationProvider}\n  [com.BugBazaar.com.squareup.picasso]:\n    Provider{9e61d8a com.BugBazaar/com.squareup.picasso.PicassoProvider}\n  [com.bugbazaar.mycontacts]:\n    Provider{618fbf5 com.BugBazaar/.provider.MyContactsProvider}\n  [com.BugBazaar.UserProfile]:\n    Provider{6573818 com.BugBazaar/.provider.UserProfileProvider}\n  [com.bugbazaar.provider.addresses]:\n    Provider{ca6271 com.BugBazaar/.ui.addresses.AddressContentProvider}\n\n$ adb shell dumpsys package com.BugBazaar | sed -n '/Service Resolver Table/,/User 0/p' | head -12\nService Resolver Table:\n  Non-Data Actions:\n      com.google.firebase.INSTANCE_ID_EVENT:\n        78f3e com.BugBazaar/.MyFirebaseInstanceIDService filter 8d1119f\n          Action: \"com.google.firebase.INSTANCE_ID_EVENT\"\n      com.google.android.gms.gcm.ACTION_TASK_READY:\n        669614a com.BugBazaar/com.evernote.android.job.gcm.PlatformGcmService filter fbf28bb permission com.google.android.gms.permission.BIND_NETWORK_TASK_SERVICE\n      com.google.firebase.MESSAGING_EVENT:\n        45d22ec com.BugBazaar/com.google.firebase.messaging.FirebaseMessagingService filter ad3f6b5",
      expect: "Six providers declared and six registered, five authorities that are not the app's own data, and a service table where one entry carries a <b>permission</b> and the others do not. <code>content://com.bugbazaar.provider.addresses/addresses</code> is the only provider whose authority, class and lack of permission you can state from these two outputs.",
      expectNote: "Recorded on the attached handset, Android 16, BugBazaar 1.2.1. The receiver table is printed by the same sed range and is long - WorkManager and the Evernote job library own most of it, which is the other half of the lesson: most of what answers broadcasts is not app code.",
      refs: [{"label": "dumpsys", "url": "https://developer.android.com/tools/dumpsys"}, {"label": "aapt2 dump", "url": "https://developer.android.com/tools/aapt2"}]
    },
    {
      id: "deeplinks",
      title: "Extract every deep link the manifest declares",
      why: "A deeplink is only testable once you know which activity answers it, and a deeplink with a path is only testable once you know the path. Reading the XML by eye finds the first activity and quietly loses the paths, because scheme, host and path live on separate <code>&lt;data&gt;</code> lines.",
      concept: "A deeplink is an <code>&lt;intent-filter&gt;</code> containing <code>VIEW</code>, <code>BROWSABLE</code> and at least one <code>&lt;data&gt;</code>. Android joins the scheme and host from consecutive data elements, and a path narrows it further. The activity name sits above all of them, so the only reliable extraction carries the last activity seen while walking the file - which is what the awk below does, and what a grep for <code>android:host=</code> cannot.",
      see: "Four links across two activities. <code>ExternalAuthLogin</code> answers one and is the one the next step fires. <code>ui.Deeplink</code> answers three, and they differ only by path - <code>/cart/add</code>, <code>/offers</code>, <code>/web</code>. The third is the one to fire first: a path called <code>web</code> on an exported activity is a URL loader until proven otherwise. Collapsing those three into one line is how a review loses its best lead.",
      cmd: "# decode once (Module 01 did this; re-run if bb/ is missing)\n[ -d bb ] || apktool d -f -o bb \"$APK_B\"\n\n# every activity another app can open, with the URI it answers\nawk '/<activity/{a=$0}\n     /android:scheme=/{s=$0; p=\"\"}\n     /android:path=/{p=$0}\n     /android:host=/{h=$0\n       if (a!=\"\" && s!=\"\") {\n         match(a, /android:name=\"[^\"]*\"/);   n=substr(a,RSTART+14,RLENGTH-15)\n         match(s, /android:scheme=\"[^\"]*\"/); sc=substr(s,RSTART+16,RLENGTH-17)\n         match(h, /android:host=\"[^\"]*\"/);   ho=substr(h,RSTART+14,RLENGTH-15)\n         pp=\"\"\n         if (p!=\"\") { match(p, /android:path=\"[^\"]*\"/); pp=substr(p,RSTART+14,RLENGTH-15) }\n         print n\" -> \"sc\"://\"ho pp; s=\"\"\n       }}' bb/AndroidManifest.xml | sort -u\n\n# the same thing by eye, when you only need one\ngrep -n -B3 -A3 'android:host=' bb/AndroidManifest.xml",
      sim: "$ awk '/<activity/{a=$0} ... ' bb/AndroidManifest.xml | sort -u\ncom.BugBazaar.ExternalAuthLogin -> bugbazaar://externalAuthentication\ncom.BugBazaar.ui.Deeplink -> bb://bugbazaar/cart/add\ncom.BugBazaar.ui.Deeplink -> bb://bugbazaar/offers\ncom.BugBazaar.ui.Deeplink -> bb://bugbazaar/web\n\n$ grep -n -B3 -A3 'android:host=' bb/AndroidManifest.xml\n89-        <activity android:exported=\"true\" android:name=\"com.BugBazaar.ui.Deeplink\">\n90-            <intent-filter>\n91-                <action android:name=\"android.intent.action.VIEW\"/>\n92-                <category android:name=\"android.intent.category.BROWSABLE\"/>\n94-                <data android:host=\"bugbazaar\" android:path=\"/cart/add\" android:scheme=\"bb\"/>",
      expect: "Four activity-to-URI pairs, including all three paths declared on <code>ui.Deeplink</code>.",
      expectNote: "Real output from BugBazaar 1.2.1's decoded manifest. This course exercises only the first link; the three <code>bb://</code> paths are left as an exercise, which is the honest shape of a review - you enumerate everything and test what time allows.",
      refs: [{"label": "Intent filters and deep links", "url": "https://developer.android.com/training/app-links/deep-linking"}, {"label": "App Links", "url": "https://developer.android.com/training/app-links"}]
    },
    {
      id: "leak", title: "A provider that answers anyone",
            concept: "The shell is uid 2000, a foreign app. If <code>content query</code> returns rows, the provider has no guard at all.",
      see: "Real rows with no <code>SecurityException</code>. That is a leak by any definition: data readable by every installed app.",
cmd: `adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses`,
      sim: `$ adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses
Row: 0 id=2, nickname=Home, address=Dunder Mifflin,1725 Slough Avenue, Suite 200, Scranton, Pennsylvania
Row: 1 id=3, nickname=Office, address=Ved InfoSec Consulting, 5th floor, Business Bay Tower, Milky Way Galaxy, Observable Universe`,
      expect: `rows of another user's saved addresses, returned to uid 2000 (shell) with no credentials.`,
      note: "CWE-926, improper export of an Android component. Impact: any installed app can read the user's address book entries. Remediation: <code>android:exported=\"false\"</code>, or a signature-level permission.",
      refs: [{ label: "Content providers", url: "https://developer.android.com/guide/topics/providers/content-providers" },
             { label: "OWASP MASTG: content provider leakage", url: "https://mas.owasp.org/MASTG/tests/android/MASVS-PLATFORM/MASTG-TEST-0355/" }]
    },
    {
      id: "trap", title: "The provider that looks protected",
      why: "Run this on both an API 34 emulator and an Android 16 handset. The answers differ, and both are correct observations.",
            concept: "An export can be guarded by a permission that does not exist. It fails closed, but by accident - and the failure looks different on different Android versions.",
      see: "<code>No result found.</code> on API 34 versus <code>SecurityException ... requires BugBazaar</code> on Android 16. Both refuse; only one is loud. Report the undefined permission, not a leak.",
cmd: `adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile
adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile 2>&1 | head -3`,
      sim: `$ adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile     # API 34 emulator
No result found.
$ adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile     # Android 16 handset
Error while accessing provider:com.BugBazaar.UserProfile
java.lang.SecurityException: Permission Denial: reading com.BugBazaar.provider.UserProfileProvider
  uri content://com.BugBazaar.UserProfile/userprofile from pid=12978, uid=2000 requires BugBazaar,
  or grantUriPermission()`,
      expect: `either "No result found." or a SecurityException - never rows.`,
      expectNote: 'Neither result is a leak, and neither proves a working control. <code>readPermission</code> resolves to <code>@string/app_name</code>, an undefined permission, so enforcement is accidental and version-dependent. Write it up as a latent exposure plus a manifest defect.',
      note: "This is the sharpest false-positive trap in the course. \"Looks protected\" and \"is properly protected\" are different claims, and a null result supports neither.",
      noteKind: "bad",
      refs: [{ label: "android:readPermission", url: "https://developer.android.com/guide/topics/manifest/provider-element" }]
    },
    {
      id: "deeplink", title: "A deep link into the auth flow",
            concept: "Scheme plus host plus BROWSABLE is a URI anyone can fire from a browser. Without <code>autoVerify</code> the scheme proves nothing about origin.",
      see: "The activity launching from <code>uid 2000</code>, then the crash while forwarding the intent. Report the crash as an observation, not as impact.",
cmd: `adb shell am start -W -a android.intent.action.VIEW -d "bugbazaar://externalAuthentication"
adb logcat -d | grep -A6 "FATAL EXCEPTION"`,
      sim: `$ adb shell am start -W -a android.intent.action.VIEW -d "bugbazaar://externalAuthentication"
Starting: Intent { act=android.intent.action.VIEW dat=bugbazaar://externalAuthentication/... }
Status: ok
Activity: com.BugBazaar/.ExternalAuthLogin
$ adb logcat -d | grep -A6 "FATAL EXCEPTION"
java.lang.RuntimeException: Unable to resume activity {com.BugBazaar/com.BugBazaar.ExternalAuthLogin}:
  android.content.ActivityNotFoundException: No Activity found to handle
  Intent { act=android.intent.action.VIEW dat= (has extras) }`,
      expect: `the activity launches from uid 2000, then throws while forwarding a constructed intent.`,
      expectNote: 'That traceback is the artefact: the component builds an Intent from what it was given and forwards it. Claim "exported activity forwards a constructed intent". Do not claim redirection into a protected component without showing it.',
      refs: [{ label: "Deep links / app links", url: "https://developer.android.com/training/app-links" },
             { label: "MASTG: intent redirection", url: "https://mas.owasp.org/MASTG/tests/android/MASVS-PLATFORM/MASTG-TEST-0035/" }]
    },
    {
      id: "launch",
      title: "Launch a non-exported screen (and read the error)",
      why: "hpAndro's challenge screens are not exported, so a student cannot reach most of them from the launcher. The error you get is also the evidence that they are protected - which is worth more than a screen you could open.",
      concept: "<code>exported=\"false\"</code> is enforced by the activity manager at <code>am start</code> time, by comparing the calling uid with the target app's uid. The adb shell uid is <code>2000</code>, so it is refused; a root shell is the app's equal in the eyes of SELinux and gets in. That is a lab convenience, not a vulnerability.",
      see: "The first command must fail with <code>SecurityException ... not exported from uid 2000</code>. Keep that line - it is the proof the attribute works. The second command opens the screen because it runs as root.",
      cmd: "# as the shell user: refused, and the refusal is the finding\nadb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity\nadb logcat -d | grep -A3 \"SecurityException\" | tail -6\n\n# as root: opens, because root is exempt from the exported check\nadb shell su -c \"am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity\"",
      sim: "$ adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity\nStarting: Intent { cmp=hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity }\nException occurred while executing 'start':\njava.lang.SecurityException: Permission Denial: starting Intent { cmp=... } from null (pid=8821, uid=2000) not exported from uid 10258\n\n$ adb shell su -c \"am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity\"\nStarting: Intent { cmp=hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity }\nWarning: Activity not started, its current task has been brought to the front",
      expect: "A <code>SecurityException ... not exported from uid 2000</code> on the first attempt and a started screen on the second.",
      expectNote: "Recorded on the attached handset. <code>adb root</code> does not work on retail builds, which is why the second command is <code>su -c</code>; on an emulator with a userdebug image <code>adb root</code> then the plain command is equivalent.",
      refs: [{"label": "android:exported", "url": "https://developer.android.com/guide/topics/manifest/activity-element#exported"}]
    }

  ]
});

window.MODULES.push({
  id: "m3", tag: "MODULE 3", time: "90 min", title: "Frida: watching and changing runtime",
  goal: "Attach to hpAndro, defeat its root detection, and observe a hash as it is computed - all evidence-backed, none of it guessed.",
  brief: {"from": "Acme Retail, platform team", "subject": "Our login validates the token locally", "body": "The mobile client checks the session token in memory before trusting the response. The team calls that a control. We suspect it is decoration. Watching the app is allowed - the binary is yours once it is on your device.", "want": "Watch the runtime, not the source: what the app really checks, and what happens when the check is made to say yes."},
      intro: "Frida work happens on the API 34 emulator. On an Android 16 handset the native agent loads but <code>Java</code> kills the session - that is a tooling limit, not app anti-tampering. Every script in this module, with the identification logic behind it and its recorded output, is on the <a href=\"#/m3/scripts\">Frida scripts and tasks</a> page. <b>Before you hook BugBazaar:</b> its detection is behind its own switches - App protection settings has switch1 (rootBeer), switch2 (Magisk/Frida) and switch3, and a fresh install has all three off, so the app goes straight to Signin and no detection code runs. Turn switch2 on, or every BugBazaar hook reports zero calls.",
  steps: [
    {
      id: "server",
      title: "Start frida-server on the device",
      why: "Frida needs a server running as root on the device that matches the client on your laptop. A version mismatch fails as a generic \"unable to connect\", which students read as a broken instrument.",
      concept: "The server runs on the phone; the CLI runs on your laptop and talks to it over a TCP port. Both must come from the same release. The release archive is per-ABI, so pick <code>android-arm64</code> for a 64-bit handset and <code>android-x86_64</code> for most emulators. On a handset <code>adb root</code> usually fails - the shell is not privileged - so the server has to be started through <code>su -c</code> instead.",
      see: "The version is read from your own CLI, never typed from this page: the download URL is built from <code>frida --version</code>, so the two ends cannot drift. <code>ps -A | grep frida-server</code> proves it is alive; the port is 27042 unless you move it in Module 03's stealth step.",
      cmd: "frida --version                                   # your client - the server must match it\nFRIDA_VER=$(frida --version)\nARCH=android-arm64                                # x86_64 for an emulator\n\ncurl -LO \"https://github.com/frida/frida/releases/download/$FRIDA_VER/frida-server-$FRIDA_VER-$ARCH.xz\"\nunxz -f \"frida-server-$FRIDA_VER-$ARCH.xz\"\nadb push \"frida-server-$FRIDA_VER-$ARCH\" /data/local/tmp/frida-server\nadb shell chmod 755 /data/local/tmp/frida-server\n\n# handset: adb root fails, use su.  emulator: adb root works and is simpler\nadb shell su -c \"nohup /data/local/tmp/frida-server >/dev/null 2>&1 &\"\nadb shell ps -A | grep frida-server\n\n# prove the two ends agree\nadb forward tcp:27042 tcp:27042\nfrida-ps -H 127.0.0.1:27042 | head -5",
      sim: "$ frida --version\n17.3.2\n$ curl -LO \"https://github.com/frida/frida/releases/download/17.3.2/frida-server-17.3.2-android-arm64.xz\"\n  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n100 13.1M  100 13.1M    0     0   612k      0  0:00:21  0:00:21 --:--:--  612k\n$ unxz -f frida-server-17.3.2-android-arm64.xz\n$ adb push frida-server-17.3.2-android-arm64 /data/local/tmp/frida-server\nfrida-server-17.3.2-android-arm64: 1 file pushed, 0 skipped. 28.4 MB/s (13732912 bytes in 0.460s)\n\n$ adb shell su -c \"nohup /data/local/tmp/frida-server >/dev/null 2>&1 &\"\n$ adb shell ps -A | grep frida-server\nroot          4127     1  158360  38420 0                   0 S frida-server\n\n$ adb forward tcp:27042 tcp:27042\n27042\n$ frida-ps -H 127.0.0.1:27042 | head -5\n PID  Name\n----  --------------------------------------------------\n 4127  frida-server\n  902  com.android.systemui\n 1188  com.android.settings",
      expect: "<code>frida-ps</code> lists processes, and the server version equals <code>frida --version</code>. Anything else - empty list, <code>unable to connect</code>, <code>Failed to load script</code> - is the version pair or the privilege level, not the app.",
      expectNote: "Recorded on the attached handset: <code>adb root</code> answers \"adbd cannot run as root in production builds\", so the su line is the one that ran. On this device the server had been replaced by a newer build (17.24.3) and the CLI was 17.3.2 - it still connected, but that pairing is the first thing to check when a script dies, so pin both ends deliberately.",
      refs: [{"label": "Frida releases", "url": "https://github.com/frida/frida/releases"}, {"label": "frida-server setup", "url": "https://frida.re/docs/android/"}]
    },
    {
      id: "baseline", title: "Baseline: see the detection before you touch it",
      why: "Never hook blind. Prove the control works first, or you cannot show that you defeated it.",
            concept: "Observe the control working before you touch it. The refusal on screen is your before-picture, and the string it prints is your target.",
      see: "The detection verdict in the UI and the path it names. Compare this exact screen after the hook - that contrast is the evidence.",
cmd: `adb shell "echo x > /data/local/su; chmod 755 /data/local/su"
adb root
adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity
# tap CHECK ROOT, then read the screen
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'`,
      sim: `$ adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity
Starting: Intent { cmp=hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity }
Status: ok
$ adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'
text="SU Binary Task"
text="SU Binary detected on this location

/data/local/su
"
text="CHECK ROOT"`,
      expect: `"SU Binary detected on this location" followed by the exact path you planted.`,
      expectNote: "The path in the output proves it is a file-existence loop, and tells you which list to look at in the smali.",
      refs: [{ label: "MASTG: root detection", url: "https://mas.owasp.org/MASTG/tests/android/MASVS-RESILIENCE/MASTG-TEST-0045/" }]
    },
    {
      id: "hook", title: "Attach and defeat it",
      why: "Open the screen first, then attach. A spawn-mode script enumerates loaded classes before the activity exists, hooks nothing, and still prints a confident 'installed' message.",
            concept: "A hook replaces a method body. Flipping one boolean and watching the UI change is proof the check is client-side.",
      see: "The log line <code>real=true -&gt; false</code>, then the screen no longer naming the path. If the log is silent, you hooked the wrong overload.",
cmd: `# 1. open the challenge screen (as above)
# 2. attach with the provided script
frida -U -n "Android Security Testing" -l frida-scripts/offline/h1_root_detection_bypass.js
# with two devices attached, -U is ambiguous - use the forwarded port instead:
#   adb -s <serial> forward tcp:27042 tcp:27042
#   frida -H 127.0.0.1:27042 -n "Android Security Testing" -l frida-scripts/offline/h1_root_detection_bypass.js
# 3. tap CHECK ROOT again`,
      sim: `$ frida -U -n "Android Security Testing" -l frida-scripts/offline/h1_root_detection_bypass.js
     ____
    / _  |   Frida 17.3.2 - A world-class dynamic instrumentation toolkit
   | (_| |
    > _  |   Commands:
   /_/ |_|       help      -> Displays the help system
[+] hpAndro root/debug/emulator detection neutralised
[+] checkFlagRootManagementApps() real=false -> false
[+] checkFlagPotentialDangerousApps() real=false -> false
[+] checkFlagBusyBoxBinaries() real=false -> false
[+] SuBinaryTaskActivity.checkFlagSUBinaries() real=true -> false
[+] SuBinaryTaskActivity.getSUBinaries() real="/data/local/su\\n" -> ""`,
      expect: `"real=true -> false" for checkFlagSUBinaries, and getSUBinaries returning "".`,
      expectNote: 'On screen the reported <b>path</b> disappears. The label "SU Binary detected on this location" stays - it is composed from a second copy of the logic. Say that precisely in your write-up.',
      refs: [{ label: "Frida JavaScript API", url: "https://frida.re/docs/javascript-api/" },
             { label: "frida-java-bridge", url: "https://github.com/frida/frida-java-bridge" }]
    },
    {
      id: "inventory", title: "List the checks you are up against",
      why: "Eleven detectors, all one hook away. Enumerate them so your report can say what existed, not just what you bypassed.",
            concept: "Do not guess which method matters - enumerate every method whose name looks like a check, and hook them all.",
      see: "Eight <code>checkFlag*</code> methods on <code>RootDetectionUtils$Companion</code>, plus per-screen copies. That duplication is why one hook is not enough.",
cmd: `# hp/ is the apktool decode from Module 01 - recreate it if this is a fresh shell
[ -d hp ] || apktool d -f -o hp $APK_H
grep -E "^\\.method public final" 'hp/smali/hpandro/android/security/utils/rootDetection/RootDetectionUtils$Companion.smali'`,
      sim: `$ grep -E "^\\.method public final" 'hp/smali/hpandro/android/security/utils/rootDetection/RootDetectionUtils$Companion.smali'
.method public final checkFlagBusyBoxBinaries()Z
.method public final checkFlagDangerousProps()Z
.method public final checkFlagDebuggerDetection()Z
.method public final checkFlagEmulatorDetection()Z
.method public final checkFlagPotentialDangerousApps(Landroid/content/Context;)Z
.method public final checkFlagRWSystems()Z
.method public final checkFlagRootClockingApps(Landroid/content/Context;)Z
.method public final checkFlagRootManagementApps(Landroid/content/Context;)Z
.method public final getSUBinaries()Ljava/lang/String;
.method public final getSUExists()Ljava/lang/String;
.method public final getTestKeys()Z`,
      expect: `eleven methods, matching what the hook script targets.`,
      refs: [{ label: "MASTG: anti-root defences", url: "https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0031/" }]
    },
    {
      id: "digest",
      title: "Observe any hash without knowing the app",
      why: "A hash challenge is the one lab where you can succeed without decompiling anything: hook the JDK primitive, press the button, read the input and the digest. It also teaches the app-agnostic habit - instrument the library, not the app.",
      concept: "Every hashing implementation in Java ends in <code>java.security.MessageDigest</code>. <code>getInstance(String)</code> names the algorithm, <code>update(byte[])</code> receives the input in chunks, <code>digest()</code> returns the result. All three are overloaded, so each needs an explicit <code>.overload(...)</code>; a bare <code>.implementation</code> on an overloaded name throws.",
      see: "The MD5 task turns out to hash more than user input: an 8-byte key, a 717-byte DER certificate and a 91-byte signature all pass through the same instrumented object, and only the last of those is what the screen shows. That is the difference between 'the app uses MD5' and knowing exactly what it hashes.",
      cmd: "# the script ships with the course - do not retype it\nfrida -H 127.0.0.1:27042 -f hpandro.android.security -l frida-scripts/offline/f4_observe_hashes.js\n# then open the MD5 task and press CHECK MD5 HASH\nadb shell am start -n hpandro.android.security/.ui.activity.task.hash.MD5HashActivity",
      sim: "[md] getInstance(\"MD5\")\n[md] MD5 update(8 bytes) \"\\x9dt\\xf2\\xb8\\x8dQ\\xa3\\xc5\"\n[md] MD5 digest -> ba876a20dc20bf1653cf95d9c2b8519c\n[md] getInstance(\"MD5\")\n[md] MD5 update(717 bytes) \"0\\x82\\x02\\xc9...(717 bytes)\"\n[md] MD5 digest -> 8eed1fb7c3eefdb9d842b15a5e922a85\n[md] getInstance(\"SHA-256\")\n[md] SHA-256 digest -> a4b90990b418581487bb13a2cc67700a3c359804f91bdfb8e377cd0ec80ddc10",
      expect: "At least one MD5 digest whose input you can reproduce offline: copy the bytes, hash them on the laptop, and compare. A digest you cannot reproduce is a curiosity, not evidence.",
      expectNote: "Recorded on the API 34 image. The 8-byte buffers are binary key material, so they print as escapes - that is correct, not a decoding failure.",
      refs: [{"label": "MessageDigest", "url": "https://developer.android.com/reference/java/security/MessageDigest"}]
    }
,
    {
      id: "stealth",
      title: "Hide the server: rename it, move the port, then remove the leftovers",
      why: "Detection is not magic. Every check you read in Module 01 is a file name, a mount entry, a /proc read or a well-known port. Change those four facts and the check returns false without a single byte of code being hooked.",
      concept: "This is the cheapest bypass there is, and the one students skip. A renamed binary on port 4444 defeats three of the four checks; the fourth reads <code>/proc</code> for the string, which a stripped or memory-patched binary would also need to answer. The lesson is not the trick, it is that <b>you read the check before you defeat it</b>.",
      see: "<code>ss -tlnp</code> proves the listener exists under the new name. <code>frida-ps</code> proves the client reaches it. The last line proves the opposite of success on this device - and knowing which failure you are looking at is the skill.",
      cmd: "# 1. what the app looks for (from the code you read in Module 01)\n#    areFridaFilesPresent()      -> files whose name contains \"frida\"\n#    isFridaDetectedinmounts()   -> a mount entry containing \"frida\"\n#    isFridaServerRunning()      -> runs: find / -name '*frida*'\n#    isFridaDetectedfile()       -> reads /proc and looks for the string\n#    the classic default is also the port: 27042\n\n# 2. rename the binary and move off the default port\nadb shell su -c \"cp /data/local/tmp/frida-server-1724 /data/local/tmp/fsvc\"\nadb shell su -c \"chmod 755 /data/local/tmp/fsvc\"\nadb shell su -c \"/data/local/tmp/fsvc -l 0.0.0.0:4444 -D\"\nadb forward tcp:4444 tcp:4444\nfrida-ps -H 127.0.0.1:4444 | head -3\n\n# 3. remove the old artifact - a renamed server is useless while the file\n#    that contains \"frida\" is still on disk\nadb shell su -c \"mv /data/local/tmp/frida-server-1724 /data/local/tmp/svc.bin\"\nadb shell su -c \"ls /data/local/tmp | grep -i frida\"\n",
      sim: "$ adb shell su -c \"/data/local/tmp/fsvc -l 0.0.0.0:4444 -D\"\n$ adb shell su -c \"ss -tlnp | grep 4444\"\nLISTEN   0   10   0.0.0.0:4444   0.0.0.0:*   users:((\"fsvc\",pid=26380,fd=10))\n\n$ frida-ps -H 127.0.0.1:4444 | wc -l\n     205\n\n$ frida-ps -H 127.0.0.1:4444 | grep -i bugbazaar\n27009  BugBazaar\n\n$ adb shell su -c \"ls /data/local/tmp | grep -i frida\"\n# /data/local/tmp/frida-boot.log and frida-boot.sh also match - rename them too, or the check still fires\n\n# but attaching still ends the session on this Android 16 handset, for every process:\n$ frida -H 127.0.0.1:4444 -p 27009 -l h2_bugbazaar_detection.js\nAttaching...\n[Remote::PID::27009 ]-> Connection terminated",
      expect: "a listener on 4444 owned by a binary whose name contains no 'frida', a client that enumerates processes through it, and no file left on disk that the app's own file checks would match.",
      expectNote: "The last transcript line is this lab's environment, not the app's defence: attaching terminates the session for <b>every</b> process on this handset, including Settings (tested), so it is a platform limitation, not detection. Enumeration through the renamed server works; the Java bridge does not. Say which one you observed before you write 'bypass successful'.",
      refs: [{"label": "Frida: changing the default port", "url": "https://frida.re/docs/modes/"}, {"label": "MASTG: anti-Frida detection", "url": "https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/"}]
    }
  ]
});
