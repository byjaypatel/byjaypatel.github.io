/* Android pentest methodology - the "how do I approach an APK" page.
 *
 * Deliberately not a copy of any one methodology document: every door points at the module and step in
 * THIS course that performs the work, and every command below is one the labs actually run. A phase with
 * no lab behind it says so, rather than pretending the course covers it.
 *
 * Shape:
 *   phases[]   eight doors, in the order that pays; each with actions, artifacts, exit criteria, trap
 *   presets[]   what to keep and what to cut for a 30-minute triage vs a two-day assessment
 *   ladder[]    three real observations from the lab apps, each climbing observation -> reportable
 *   matrix[]    the same doors as a filterable table (static / dynamic / device required)
 */
window.METHODOLOGY = {
  title: "Android pentest methodology",
  subtitle: "Eight doors, in the order that pays",
  intro: "An APK assessment fails in one of two ways: someone runs tools before understanding the app, or " +
         "someone reads code for a day and never proves a single finding. The order below is the fix - each " +
         "door answers a question the previous door raised, and stops when the answer is evidenced.",
  note: "This is the course's methodology, not a generic checklist: every door names the module that does the " +
        "work, and the commands are the ones the labs run. Where a door is out of scope here, it says so.",

  phases: [
    {
      n: 1, key: "recon", name: "Recon without a device",
      question: "What am I actually holding?",
      effort: 15, kind: "static",
      objective: "Establish identity and shape before running anything: hash, package, SDK level, component count, " +
                 "code volume. Half of the interesting behaviour later is only explainable against these numbers.",
      actions: [
        "Hash the APK and write the hash into the report - two files with the same name are routine.",
        "Read the version from the manifest, not the filename: BugBazaar 1.2.1 ships as versionName 1.0.",
        "Count components and natives so you can tell a small attack surface from a large one.",
        "Note minSdk/targetSdk: targetSdk decides whether a user-installed CA is trusted at all.",
        "Unpack enough to know what kind of app it is - dex count, frameworks, packers."
      ],
      cmd: "shasum -a 256 \"$APK_B\"\naapt2 dump badging \"$APK_B\" | head -3\nunzip -l \"$APK_B\" | grep -cE 'classes.*dex|\\.so$'",
      evidence: "One line per fact: hash, package, versionName, versionCode, minSdk, targetSdk.",
      done: "You can say in one sentence what the app is, what it is built with, and which Android versions it runs on.",
      trap: "Trusting the filename. The lab app named 1.2.1 reports versionName='1.0' - if your report cites the filename, every later finding has the wrong target.",
      module: { label: "Module 00 - device, ADB, apps", route: "#/m0" }
    },
    {
      n: 2, key: "surface", name: "The declared surface",
      question: "What does this app publish to the rest of the phone?",
      effort: 20, kind: "static",
      objective: "Read the manifest as an API description: every exported component, every intent filter, every " +
                 "permission, every deep link. This is where most findings in a banking app live.",
      actions: [
        "List exported components, then subtract the ones a framework merged in (androidx.startup, firebase, picasso).",
        "For each exported component ask: what permission protects it, and is that permission actually declared?",
        "Extract deep links with scheme, host AND path - the path is the part that changes the destination.",
        "Check android:debuggable, allowBackup, networkSecurityConfig and usesCleartextTraffic.",
        "Compare the manifest the APK declares with what the package manager registered."
      ],
      cmd: "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -B2 -A2 'exported(0x01010010)=true'\nadb shell dumpsys package com.BugBazaar | sed -n '/Providers:/,/Receivers:/p'",
      evidence: "A table: component, type, exported, permission, and the URI or action that reaches it.",
      done: "Every entry point another app can address is written down with the exact string an attacker sends.",
      trap: "Reading aapt2 alone. It shows what the developer wrote; dumpsys shows what the device registered - the authority strings and intent filters you actually address appear only in the second.",
      module: { label: "Module 01 and Module 02 - manifest explorer, exported components", route: "#/m1/manifest" }
    },
    {
      n: 3, key: "code", name: "Code, following data",
      question: "Where do secrets and decisions actually live?",
      effort: 45, kind: "static",
      objective: "Not 'decompile and read everything'. Search for the six things that generate findings, then follow " +
                 "each hit to the place the value is used.",
      actions: [
        "Grep for secrets, keys, tokens, URLs, and 'password' - then check whether the hit is real or a decoy.",
        "Find the crypto calls: which algorithm, which mode, is the IV static, where does the key come from.",
        "Find logging that prints tokens or PII, and check whether it is compiled out in release.",
        "Find WebView usage: is JavaScript enabled, is an interface added, does it load attacker-influenced URLs.",
        "Find exported-provider query construction and check for concatenation.",
        "Mark every finding as 'in code' until a runtime step confirms it."
      ],
      cmd: "jadx --no-res -d jx-bb \"$APK_B\"\ngrep -rnE 'getInstance\\(|Cipher\\|SecretKeySpec|setJavaScriptEnabled|addJavascriptInterface' jx-bb/sources | head -20",
      evidence: "File:line for each hit, plus the call path that shows whether it is reachable from an exported entry point.",
      done: "Each candidate finding has a file:line and a stated precondition. Unreachable code is downgraded, not reported.",
      trap: "Reporting the grep hit. A hardcoded string that no code path reaches is a code smell; it becomes a vulnerability only when you show the path.",
      module: { label: "Module 01 - static analysis and jadx-gui", route: "#/m1" }
    },
    {
      n: 4, key: "baseline", name: "Dynamic baseline",
      question: "What does the app do to the device when it runs?",
      effort: 20, kind: "dynamic",
      objective: "Install, run it once, and capture the mess it leaves: files, databases, preferences, logs. " +
                 "This baseline is what every later 'this changed' claim is measured against.",
      actions: [
        "Install and launch, then walk the screens the app has - code that never ran cannot have written anything.",
        "List the private directory with root and note what appears where (shared_prefs, databases, files, no_backup).",
        "Pull the SQLite databases and open them read-only; look for tokens, PII and hashes.",
        "Clear logcat, exercise one flow, then read only the lines the app wrote.",
        "Record which screens refuse to open: those are the checks worth defeating next."
      ],
      cmd: "adb shell run-as com.BugBazaar ls -R /data/data/com.BugBazaar\nadb exec-out run-as com.BugBazaar cat databases/app.db > app.db\nsqlite3 app.db 'select name from sqlite_master where type=\"table\";'",
      evidence: "A directory listing, at least one database opened locally, and the exact log lines containing a secret.",
      done: "You know where the app persists data and which of it is readable without defeating anything.",
      trap: "Calling storage 'insecure' because the directory is readable as root. Root reads everything - that is what root is. The finding requires a path that works on a stock device.",
      module: { label: "Module 01 - storage, logging, files", route: "#/m1" }
    },
    {
      n: 5, key: "ipc", name: "Cross the trust boundary",
      question: "What happens when a different app calls in?",
      effort: 40, kind: "dynamic",
      objective: "Become the attacker app. Send the intent, query the provider, start the deep link, and record what " +
                 "comes back - as a normal user, not as root.",
      actions: [
        "Query each unprotected provider with content query and dump the columns that come back.",
        "Start each exported activity with am start, including the deep links carrying an external URL.",
        "Send broadcasts to receivers that accept them and watch for state change.",
        "Try the provider with a SQL payload only if the code shows concatenation - otherwise you are guessing.",
        "Repeat the same call from a second app context to prove it is not a shell artefact."
      ],
      cmd: "adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses\nadb shell am start -a android.intent.action.VIEW -d 'bugbazaar://externalAuthentication'",
      evidence: "The command, the response, and the row count. A leak is rows - not an error message, not a status code.",
      done: "At least one boundary crossed with data returned that the caller should not see.",
      trap: "A component that is exported but guarded looks identical to one that is not, until you call it. The 'protected' provider in the lab is guarded by a permission the app never declares - a copy-paste bug, not a control.",
      module: { label: "Module 02 - exported components and deep links", route: "#/m2" }
    },
    {
      n: 6, key: "transport", name: "Traffic and trust anchors",
      question: "What leaves the device, and who can read it?",
      effort: 40, kind: "dynamic",
      objective: "Decide in this order: can the proxy see anything at all, then is TLS pinned, then does the peer " +
                 "validate the chain. Most 'pinning' reports are actually a trust-anchor problem.",
      actions: [
        "Confirm traffic reaches the proxy before touching certificates - routing first, crypto second.",
        "Read targetSdk and the network security config before installing any CA.",
        "Prefer the user store where the policy allows it; the system store is the exception, not the default.",
        "Check for cleartext to any host, and for pinning that is actually implemented (pin-set or CertificatePinner).",
        "Test one request per endpoint class after interception: auth, data, upload."
      ],
      cmd: "adb shell settings put global http_proxy $HOST:5555\nopenssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 -servername example.com -showcerts </dev/null | head -20",
      evidence: "A captured request and response for one authenticated flow, plus the decision that made it visible.",
      done: "You can say whether the app pins, and what evidence proves it - not what a blog says apps do.",
      trap: "Blaming pinning when the phone never sent the traffic. Plain HTTP on the same device settles it in ten seconds.",
      module: { label: "Module 04 - proxy, capture, pinning", route: "#/m4" }
    },
    {
      n: 7, key: "runtime", name: "Runtime manipulation",
      question: "Which client-side checks are real, and which are decoration?",
      effort: 45, kind: "dynamic",
      objective: "Observe a check fire, then change its answer once, and prove the app's behaviour changed. That pair " +
                 "of facts is the entire finding.",
      actions: [
        "Confirm the check runs at all - a hook that never fires proves nothing about the app.",
        "Read the check's first branch: one guard often short-circuits the interesting ones.",
        "Hook the decision, not the implementation: return false from the boolean, not the framework call.",
        "Re-run the same screen and show the difference in the UI or the next request.",
        "Note what stays broken after the bypass - that residue is usually the real control."
      ],
      cmd: "frida -H 127.0.0.1:27042 -f com.BugBazaar -l frida-scripts/offline/f5_bugbazaar_detection.js\n# observe first, then set MODE = \"bypass\" and run again",
      evidence: "Two transcripts: observe (the real value) and bypass (the same call flipped), plus what the screen did differently.",
      done: "A before/after pair, reproducible by someone else with your script and your command.",
      trap: "Hooking a method that is never called, then concluding the protection is native. Check the loaded class inventory before you blame the app.",
      module: { label: "Module 03 - Frida, plus the six scripts", route: "#/m3/scripts" }
    },
    {
      n: 8, key: "report", name: "Turn observations into findings",
      question: "What can I prove, and who cares?",
      effort: 30, kind: "report",
      objective: "Every observation climbs the same ladder: observed, hypothesised, proven, impact, reportable. " +
                 "Anything that stops climbing is documented as such - not deleted, and not inflated.",
      actions: [
        "State the observation as a fact with its command, then the hypothesis it suggests.",
        "Attach the reproduction: exact command, exact response, exact device state.",
        "Write the impact from the user's point of view, not the API's.",
        "Name the fix at the layer that failed, and say what the fix does not solve.",
        "List what you did not test - a scope boundary is more credible than a clean bill of health."
      ],
      evidence: "One page per finding: what, how to reproduce, impact, fix, what remains.",
      done: "A reader who has never seen the app can reproduce every finding from the page alone.",
      trap: "Severity by category. Two providers with the same misconfiguration can differ between High and Low depending on what rows come back - the data decides, not the label.",
      module: { label: "Module 06 - automated pass, then the write-up", route: "#/m6" }
    }
  ],

  presets: [
    { key: "triage", name: "30-minute triage", keep: ["recon", "surface"], note: "Enough to answer 'is this app obviously broken' - and to stop wasting a day if it is not." },
    { key: "halfday", name: "Half-day assessment", keep: ["recon", "surface", "code", "ipc", "report"], note: "The static half plus one proven boundary crossing. No runtime work, no traffic." },
    { key: "twoday", name: "Two-day assessment", keep: ["recon", "surface", "code", "baseline", "ipc", "transport", "runtime", "report"], note: "Everything in this course, one pass each, with the report written as you go." }
  ],

  ladder: [
    {
      observation: "AddressContentProvider is exported and takes no permission",
      rungs: [
        ["observed", "aapt2 shows exported=true and no android:permission", "the manifest only"],
        ["hypothesised", "another app can read every saved address", "needs the authority string from dumpsys"],
        ["proven", "content query returns rows as a normal app", "needs the command and the row count"],
        ["impact", "any installed app reads names, addresses and phones", "needs the actual columns returned"],
        ["reportable", "High - unauthorised access to other users' PII", "needs the fix: permission + checkCallingPermission"]
      ],
      stop: "Stops at 'proven' if the tables turn out empty on a fresh install - downgrade, do not delete."
    },
    {
      observation: "The provider's UserProfile authority is guarded by @string/app_name",
      rungs: [
        ["observed", "readPermission resolves to the app's own name", "needs the string table, not the attribute"],
        ["hypothesised", "the permission is never declared, so the guard is decorative", "needs a manifest-wide grep"],
        ["proven", "content query succeeds from another app", "needs the command, not the reasoning"],
        ["impact", "same data exposure as the unprotected provider", "needs the columns"],
        ["reportable", "High - a control that does not exist", "needs both the attribute and the absence of the declaration"]
      ],
      stop: "Stops at 'hypothesised' if another permission happens to guard the same provider."
    },
    {
      observation: "BugBazaar checks for Frida at startup",
      rungs: [
        ["observed", "checkdetect.someMethod runs two seconds after launch", "needs the caller in SplashActivity"],
        ["hypothesised", "the check can be defeated at runtime", "needs the method signatures from the loaded class"],
        ["proven", "the app reaches the dashboard with the check flipped", "needs observe and bypass transcripts"],
        ["impact", "root/emulator/debug checks are speed bumps only", "needs the statement that server-side controls still apply"],
        ["reportable", "Low/Info as a finding; High as an argument for server-side enforcement", "needs restraint in the wording"]
      ],
      stop: "Stops at 'proven' as a client-side weakness - it is not a vulnerability in the app's data protection."
    }
  ],

  matrix: [
    { door: "Recon", kind: "static", device: false, answers: "identity, size, SDK level", artefact: "badging output" },
    { door: "Declared surface", kind: "static", device: false, answers: "what other apps can reach", artefact: "component table" },
    { door: "Code review", kind: "static", device: false, answers: "secrets, crypto, logging, WebView", artefact: "file:line list" },
    { door: "Dynamic baseline", kind: "dynamic", device: true, answers: "what the app persists", artefact: "dir listing, DB" },
    { door: "Trust boundary", kind: "dynamic", device: true, answers: "what a neighbouring app gets", artefact: "command + rows" },
    { door: "Transport", kind: "dynamic", device: true, answers: "what crosses the wire, pinned or not", artefact: "request/response" },
    { door: "Runtime", kind: "dynamic", device: true, answers: "which checks are real", artefact: "observe + bypass" },
    { door: "Report", kind: "report", device: false, answers: "what is proven and what it costs", artefact: "one page per finding" }
  ],

  checklist: [
    "hash and version from the manifest, not the filename",
    "exported components, minus library-merged ones",
    "each exported component: permission declared, or absent",
    "deep links with scheme, host and path",
    "debuggable, allowBackup, cleartext, network security config",
    "grep: secrets, keys, URLs, logging of tokens",
    "crypto: algorithm, mode, IV, key source",
    "private dir tree, databases, shared_prefs",
    "one provider query, one am start, one broadcast",
    "proxy routing first, then trust anchor, then pinning",
    "observe a runtime check, then flip it once",
    "signing scheme and tamper behaviour",
    "findings ladder: observed, hypothesised, proven, impact, reportable",
    "what you did not test"
  ],

  next: [
    { label: "Android architecture - where each door physically lands", route: "#/arch" },
    { label: "Module 00 - start the labs", route: "#/m0" }
  ]
};
