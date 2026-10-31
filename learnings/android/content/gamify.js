/* Gamification data for the workshop guide.
 *
 * Design rules, deliberately:
 *  - XP is awarded for work a student actually does in the guide (a step ticked, a quiz answered, a
 *    judgement call made). Nothing is awarded for clicking around.
 *  - Badges are derived from the SAME step ids the guide already tracks, so they cannot drift from the
 *    modules. No badge can be earned by editing localStorage alone without also ticking the steps.
 *  - Quizzes test facts the labs establish (versionName, targetSdk, provider authority, ART, zygote,
 *    PEM vs DER, the checkdetect short-circuit). No trivia, no memorising tool flags.
 *  - Scenarios are judgement calls: the "wrong" answers are the ones a real report gets marked down for.
 */
window.GAMIFY = {
  levels: [
    { xp: 0, name: "Apprentice", note: "setting up, running commands you were given" },
    { xp: 120, name: "Analyst", note: "reading an app instead of running tools at it" },
    { xp: 320, name: "Tester", note: "proving things on a device, not hypothesising" },
    { xp: 650, name: "Reverser", note: "hooking what is loaded, not what you guessed" },
    { xp: 1100, name: "Assessor", note: "knowing what a finding is worth, and what it is not" }
  ],

  /* badge: id, name, why, requirement */
  badges: [
    { id: "first-blood", name: "First contact", why: "You installed the lab apps and got adb talking to a device.", need: { steps: ["m0/devices", "m0/install"] } },
    { id: "manifest-reader", name: "Manifest reader", why: "You read the declared surface instead of guessing at it.", need: { steps: ["m1/decode", "m1/exported"] } },
    { id: "storage-archaeologist", name: "Storage archaeologist", why: "You pulled a database and read it outside the app.", need: { steps: ["m1/tree", "m1/db"] } },
    { id: "jadx-bridge", name: "Code to hook", why: "You turned a jadx class path into a hook target.", need: { steps: ["m1/jadx-gui", "m1/jadx-to-frida"] } },
    { id: "boundary-crossed", name: "Boundary crossed", why: "You enumerated the components, then called one from outside.", need: { steps: ["m2/inventory", "m2/leak"] } },
    { id: "not-a-control", name: "Not a control", why: "You proved a guard that looks real is decorative.", need: { steps: ["m2/trap"] } },
    { id: "hook-attached", name: "Hook attached", why: "The agent loaded and a check fired in front of you.", need: { steps: ["m3/server", "m3/baseline"] } },
    { id: "before-and-after", name: "Before and after", why: "You observed a check, then changed its answer - the only pair that counts.", need: { steps: ["m3/baseline", "m3/hook"] } },
    { id: "trust-anchor", name: "Trust anchor", why: "You decided whether the app pins before installing any certificate.", need: { steps: ["m4/verify", "m4/trustconfig"] } },
    { id: "intercepted", name: "Intercepted", why: "A request and a response crossed your proxy.", need: { steps: ["m4/setproxy", "m4/capture"] } },
    { id: "repacked", name: "Repacked", why: "You rebuilt an APK, signed it, and proved the signature with apksigner.", need: { steps: ["m5/build", "m5/verify"] } },
    { id: "honest-report", name: "Honest report", why: "You wrote down what you could not test. That is the mark of an assessor.", need: { steps: ["m6/report", "m6/limits"] } },
    { id: "sweep-static", name: "Static sweep", why: "Every static step in Module 01.", need: { module: "m1", all: true } },
    { id: "sweep-runtime", name: "Runtime sweep", why: "Every step in the Frida module.", need: { module: "m3", all: true } },
    { id: "assessor", name: "Assessor", why: "Fifteen findings triaged the way a report defends them.", need: { report: 15 } },
    { id: "sharp-eye", name: "Sharp eye", why: "Five artifacts read correctly, no false positives.", need: { spot: 5 } },
    { id: "scholar", name: "Scholar", why: "Ten quiz questions right.", need: { quiz: 10 } },
    { id: "judgement", name: "Judgement", why: "Five judgement calls answered the way a report demands.", need: { scenarios: 5 } },
    { id: "flag-hunter", name: "Flag hunter", why: "Three capstone flags found without draining the hint ladder.", need: { cap: 3 } },
    { id: "command-builder", name: "Command builder", why: "Twenty commands constructed by you, not copied.", need: { gate: 20 } },
    { id: "door-knocker", name: "Door knocker", why: "All three manifest rounds cleared with the real component lists.", need: { doors: 3 } },
    { id: "risk-namer", name: "Risk namer", why: "All ten Top-10 risks matched to real evidence lines.", need: { match: 10 } },
    { id: "patch-author", name: "Patch author", why: "Twenty findings, twenty correct fixes chosen - and every wrong option understood.", need: { patch: 20 } },
    { id: "total-recall", name: "Total recall", why: "The whole deck banked: findings and lab facts, no card left behind.", need: { recall: 999 } },
    { id: "clean-room", name: "Clean room", why: "Environment verified before the first step - the reason nothing stalled.", need: { ready: 1 } }
  ],

  quiz: [
    { mod: "m0", q: "Which version does BugBazaar v1.2.1 report in its manifest?",
      options: ["1.2.1", "1.0", "2.1.1", "it is not declared"], a: 1,
      why: "versionName='1.0', versionCode='1'. The filename is a label, the manifest is the target - cite the manifest." },
    { mod: "m0", q: "What does BugBazaar's targetSdk decide, for certificate testing?",
      options: ["whether the app can be installed on Android 7", "whether a user-installed CA is trusted by default", "whether the app can be repackaged", "the minimum Android version"],
      a: 1, why: "From API 24, apps only trust user CAs if their network security config says so. targetSdk 32 makes that per-app decision unavoidable." },
    { mod: "m1", q: "Which command shows the authority strings a content provider is actually registered with?",
      options: ["aapt2 dump badging", "dumpsys package <pkg>", "unzip -l", "apktool b"],
      a: 1, why: "aapt2 shows what the manifest declares; the package manager shows what is registered, including merged library providers." },
    { mod: "m1", q: "An app declares android:readPermission=\"@string/app_name\" and never declares that permission. What is it?",
      options: ["a strong control", "a decorative guard - the permission does not exist", "a signature-level permission", "a runtime permission"],
      a: 1, why: "A permission that is never declared protects nothing. It looks like a control in the manifest, which is exactly why you call the component." },
    { mod: "m1", q: "You find a hardcoded API key in the decompiled source. What do you have so far?",
      options: ["a High finding", "an observation that still needs a reachable path", "a false positive", "an informational note only"],
      a: 1, why: "A secret in unreachable code is a code smell. It becomes a finding when you show the path that uses it." },
    { mod: "m1", q: "Why is 'the private directory is world-readable as root' not a finding?",
      options: ["root cannot read it", "root is supposed to read everything; you need a path that works on a stock device", "it is a finding only on Android 12", "the directory is not private"],
      a: 1, why: "Root is the point of root. The finding requires a route that works without it - debug flag, backup, provider, external storage." },
    { mod: "m2", q: "BugBazaar's AddressContentProvider is exported and has no android:permission. What is the fastest proof?",
      options: ["aapt2 dump xmltree, and read the attribute", "adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses", "jadx the provider class", "run apksigner verify"],
      a: 1, why: "The attribute is a hypothesis; rows are proof. A leak is data returned, not an attribute you read." },
    { mod: "m2", q: "A deep link is exported with an intent filter. Which parts do you need to reproduce it?",
      options: ["scheme only", "scheme and host", "scheme, host and path", "the activity name only"],
      a: 2, why: "scheme, host and path sit on separate <data> lines. Drop the path and three different entry points collapse into one." },
    { mod: "m2", q: "An exported component refuses your intent with a SecurityException. What is the correct conclusion?",
      options: ["the export is a false positive", "the component is protected - note the permission and move on", "the device is not rooted", "you must use su to call it"],
      a: 1, why: "Exported is not the same as unprotected. The exception is the control working - record it and stop calling that component a finding." },
    { mod: "m3", q: "In the architecture, which component executes your app's DEX bytecode?",
      options: ["the Linux kernel", "PackageManager", "Android Runtime (ART)", "the HAL"],
      a: 2, why: "ART runs DEX. The kernel schedules threads and PackageManager decides installation - neither executes your code." },
    { mod: "m3", q: "Why does frida -f (spawn) let you hook onCreate?",
      options: ["it restarts the app", "it stops the app between the zygote fork and its first instruction", "it patches the APK", "it uses root to read the dex"],
      a: 1, why: "Spawn holds the process before user code runs, so the agent is installed in time. Attach is fine for later methods only." },
    { mod: "m3", q: "A hook reports 'attached' but the app still detects Frida. What do you check first?",
      options: ["reinstall frida-server", "whether the class was loaded when you hooked it, and whether an earlier check short-circuits", "the APK signature", "the device locale"],
      a: 1, why: "Classes load lazily, and checkdetect.someMethod returns on isEmulator()/AdbEnabled1() before checkfrida() ever runs." },
    { mod: "m3", q: "Java hooks fail on the handset but work on the emulator, and native hooks work on both. What is it?",
      options: ["the app's anti-tampering", "a toolchain limitation of that ROM/ART build", "a version mismatch between client and server", "the script is wrong"],
      a: 1, why: "It reproduces against system apps too. Reporting it as anti-tampering is the classic wrong conclusion." },
    { mod: "m4", q: "The proxy sees CONNECT but the app's traffic stays encrypted. What is the first thing to establish?",
      options: ["that the app pins", "that the device is routing to your proxy at all", "that Burp is licensed", "that the app uses HTTP/2"],
      a: 1, why: "Routing first, then trust anchor, then pinning. Plain HTTP on the same device settles routing in ten seconds." },
    { mod: "m4", q: "After installing your CA, curl still fails. The system store rejected it. What is the usual reason?",
      options: ["the CA file is DER and the store wants PEM", "the CA expired", "SELinux is enforcing", "the device is rooted"],
      a: 0, why: "The Android system store reads PEM. A DER file is silently ignored - no error, which is why it burns an hour." },
    { mod: "m4", q: "Two CA files share the filename 9a5ba575.0. What happens if the wrong one is installed?",
      options: ["both are trusted", "nothing errors, and your CA is shadowed by the other one", "the store is wiped", "TLS fails for every app"],
      a: 1, why: "The filename is the subject hash. Two CAs with the same subject DN collide on the same filename, silently." },
    { mod: "m5", q: "You rebuilt and signed hpAndro with your own key. What does that prove?",
      options: ["the app is secure", "nothing yet - signature binding only matters when something verifies it", "the app will not install", "the signature scheme changed"],
      a: 1, why: "A repack proves a chain only when a check depends on the signature. Otherwise you have a new file." },
    { mod: "m5", q: "Why guard the keystore creation with [ -f student.keystore ] ||?",
      options: ["keytool is slow", "a second run aborts with 'alias already exists' and stops the class", "apksigner needs two keys", "to avoid a password prompt"],
      a: 1, why: "The guard makes the command idempotent - the same reason every lab command is safe to re-run." },
    { mod: "m6", q: "Which statement belongs in an assessment report?",
      options: ["'the app is insecure'", "'the provider returned 42 rows of addresses to an unprivileged app'", "'pinning was bypassed' with no request shown", "'no vulnerabilities found'"],
      a: 1, why: "Specific, reproducible, and measured. Everything else is an opinion that the next tester will take apart." },
    { mod: "m6", q: "You could not test the mobile-network path. What goes in the report?",
      options: ["nothing - it is not a finding", "'not tested, and why', under scope", "a Low finding to be safe", "an assumption that it is safe"],
      a: 1, why: "A stated scope boundary is more credible than silence, and far more credible than an invented finding." }
  ],

  scenarios: [
    {
      title: "The provider that looks protected",
      setup: "BugBazaar's UserProfile provider has readPermission set to @string/app_name, which resolves to 'BugBazaar'. Nothing in the manifest declares a permission named BugBazaar.",
      options: [
        { t: "Report an unprotected provider - the guard does not exist", ok: false, why: "Half right, and you skipped the proof. Report it only after content query returns rows." },
        { t: "Query it as an unprivileged app, then report what came back", ok: true, why: "The attribute is the hypothesis, the rows are the finding. This is the exact pair the lab grades on." },
        { t: "Report a medium finding because a permission is configured", ok: false, why: "A configured string is not a control. Severity follows the data, not the manifest line." },
        { t: "Ignore it - the app intended to protect it", ok: false, why: "Intent is not enforcement. The permission does not exist, so nothing is checked." }
      ]
    },
    {
      title: "The app that pings the wrong server",
      setup: "You set the proxy, the device shows CONNECT traffic to your listener, but every HTTPS request dies after the TLS handshake. Plain HTTP to a test host through the same proxy returns 200.",
      options: [
        { t: "The app pins its certificate - report it", ok: false, why: "Plain HTTP working proves routing, not pinning. You have not yet established that the app rejected your CA rather than never trusting it." },
        { t: "Check whether your CA is the one the app would trust: targetSdk, network security config, and whether the installed file is PEM with the right subject hash", ok: true, why: "That is the order: trust anchor, then policy, then pinning. Most 'pinning' reports die here." },
        { t: "Install the CA into the system store and retry", ok: false, why: "You have not established that the user store was even consulted. That is the exception path, not the first move." },
        { t: "Use Frida to disable SSL verification", ok: false, why: "Jumping to instrumentation hides the diagnosis. You would never learn whether the app pins at all." }
      ]
    },
    {
      title: "The hook that never fires",
      setup: "You wrote a Frida script against com.bug.hook.checkdetect.checkfrida(), it reports attached, and the app still blocks with the detection dialog.",
      options: [
        { t: "The check must be implemented in native code", ok: false, why: "Possible, but you have not looked. Check the loaded-class inventory and the caller before blaming the layer." },
        { t: "Read someMethod(): an earlier branch on isEmulator()/AdbEnabled1() returns before checkfrida() is reached", ok: true, why: "Short-circuit order. This is why the lab script hooks ten places and why the first observe run shows only two." },
        { t: "Reinstall frida-server - the versions must differ", ok: false, why: "Version skew was disproved in this project with a matched 17.3.2 pair; the symptom was identical." },
        { t: "Report anti-tampering that cannot be bypassed", ok: false, why: "Never report a failure of your own tooling as a property of the app." }
      ]
    },
    {
      title: "The database you can read",
      setup: "As root you cat the app's SQLite database and find a session token in plaintext.",
      options: [
        { t: "Report plaintext storage of a session token as High", ok: false, why: "Root reads everything. On its own this is not a vulnerability - it is the definition of root." },
        { t: "Look for a non-root route to the same file - debuggable, backup, exported provider, external storage - and report the one that works", ok: true, why: "The finding is the route, not the file. Without a route, the token is protected by the sandbox like every other app's." },
        { t: "Report it as Informational and move on", ok: false, why: "Too quick. The route may well exist - allowBackup or an exported provider would make it High." },
        { t: "Report that the app does not encrypt its database", ok: false, why: "Encryption at rest is a design choice, not a requirement. The requirement is that other apps cannot read it." }
      ]
    },
    {
      title: "The deep link that changes the destination",
      setup: "You found bb://bugbazaar/web exported, which opens a WebView. The obvious test is to pass your own URL.",
      options: [
        { t: "Report a WebView URL injection as High immediately", ok: false, why: "You have not established that the URL is attacker-controlled end to end, or that the WebView loads it with JavaScript bridged." },
        { t: "Send the link with an external URL, see what loads, and check whether a JS interface is attached", ok: true, why: "Two facts decide the severity: does it load arbitrary URLs, and is there a bridge to reach native code." },
        { t: "Report it as informational because it is only a browser", ok: false, why: "A WebView inside a banking app is not 'only a browser' - it can carry the app's session and its bridges." },
        { t: "Patch the manifest to remove the export and call it remediation", ok: false, why: "You are assessing, not changing the client. Patch-and-resign is a separate lab and proves a different thing." }
      ]
    },
    {
      title: "The check that only exists on the client",
      setup: "You bypass root detection, emulator detection and the debug check on a rooted handset. The app then behaves normally against the server.",
      options: [
        { t: "Report three High findings - three protections bypassed", ok: false, why: "Three bypasses, no impact. These are client-side speed bumps; the server still enforces what matters." },
        { t: "Report one Low/Informational finding about client-side enforcement, and say what the server still did", ok: true, why: "The finding is the pattern, not a count. Stating what remained enforced is what makes the report credible." },
        { t: "Report nothing - bypassing a check is not a vulnerability", ok: false, why: "It is worth documenting: it tells the client their detections provide no assurance, which affects how they treat other controls." },
        { t: "Escalate by attacking the server now that the client is open", ok: false, why: "Out of scope unless authorised. A bypass does not widen your authorisation." }
      ]
    },
    {
      title: "The finding you cannot reproduce",
      setup: "Yesterday content query returned rows from a provider. Today it returns an empty cursor. Nothing else changed.",
      options: [
        { t: "Report it anyway - you saw it", ok: false, why: "A finding nobody can reproduce, including you, is not a finding. It is a maybe." },
        { t: "Record what changed (app update, fresh install, empty tables) and report the mechanism if it still holds", ok: true, why: "Empty tables on a fresh install is the usual answer - the access control is still missing, the data just is not there." },
        { t: "Assume the vendor fixed it", ok: false, why: "Do not attribute a cause you have not checked. Verify the version, then say what you observed." },
        { t: "Delete the note", ok: false, why: "Never delete the observation. Downgrade it with the reason - that is what the ladder is for." }
      ]
    },
    {
      title: "The signature you did not need to break",
      setup: "You repacked hpAndro with your own key and it installs and runs. A colleague calls it a code-execution finding.",
      options: [
        { t: "Agree - a rebuilt APK that runs is proof of tampering", ok: false, why: "It proves the build works. Whether it matters depends on a check that verifies the signature - which this app does not." },
        { t: "State exactly what it shows: the app does not bind behaviour to its signature, so an attacker can modify and redistribute it", ok: true, why: "That is the honest impact statement, and it is a real one - just not code execution on someone else's device." },
        { t: "Drop it - repacking is not a vulnerability", ok: false, why: "It is a distribution-integrity observation. Whether it is reportable depends on the threat model, but it is not nothing." },
        { t: "Test it against a banking app instead", ok: false, why: "Out of scope. Authorisation covers the two lab apps." }
      ]
    }
  ]
};
