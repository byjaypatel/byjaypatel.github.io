/* Animated mechanisms for the lesson sections.
 *
 * One sequence per module. Each frame highlights the node(s) that matter at that moment and says what is
 * happening there, so the student watches the flow once and then reads the prose with a picture in mind.
 *
 * Every claim here is something the labs prove elsewhere in the guide: the uid/SELinux outcome from the
 * Module 01 storage steps, the Binder path from Module 02, the agent channel from Module 03, the trust
 * decision from Module 04, the build order from Module 05, the scanner-vs-evidence rule from Module 06.
 */
window.LESSON_VIS = {
  m0: {
    asks: [
      { at: 1, q: "adb shell runs as uid 2000. It asks for /data/data/com.BugBazaar - what happens?", opts: ["It reads the directory, 2000 is a system uid", "EACCES - the kernel refuses a uid that does not own it", "It reads it, but SELinux hides the file names"], a: 1, why: "Ownership decides first: the directory is u0_a398, mode 700. uid 2000 owns nothing there, and SELinux denies the attempt before the permission check even matters." },
      { at: 2, q: "run-as switches to the app's uid. Why does it work on BugBazaar but not on a release build?", opts: ["run-as checks android:debuggable", "run-as needs root", "run-as only works on API 29 and below"], a: 0, why: "run-as is gated on the app being debuggable, plus an SELinux rule that allows the transition. Both must hold - which is why 'run-as fails' is a setup question, not a finding." }
    ],
    title: "Why where you stand decides what you can see",
    nodes: [
      { id: "dir", label: "/data/data/com.BugBazaar", sub: "owner u0_a398 \u00b7 mode 700" },
      { id: "shell", label: "adb shell", sub: "uid 2000 \u00b7 unprivileged" },
      { id: "runas", label: "run-as com.BugBazaar", sub: "works only if debuggable" },
      { id: "su", label: "su", sub: "uid 0 \u00b7 root" }
    ],
    frames: [
      { focus: ["dir"], caption: "Every app gets a directory owned by its own uid, mode 700, and an SELinux label with MLS categories. Nothing else on the device can open it." },
      { focus: ["shell"], caption: "adb shell runs as uid 2000. It is on the device, it is not the app, and the kernel refuses it: EACCES on the directory, and SELinux denies before that." },
      { focus: ["runas"], caption: "run-as switches to the app's uid - but only for a debuggable app. BugBazaar is debuggable, so this works; a release build refuses." },
      { focus: ["su"], caption: "su is uid 0 and reads everything. That is what root means - which is exactly why 'readable as root' is not a finding." }
    ]
  },

  m1: {
    asks: [
      { at: 2, q: "You need the exact class and method name to hook. Which view do you trust?", opts: ["The decompiled Java in jadx", "The smali - one line of it is one bytecode instruction", "The file name inside the APK"], a: 1, why: "jadx is a reconstruction and it is occasionally wrong about names. smali is what ART actually loads, so the name you hook must come from there." },
      { at: 3, q: "jadx shows a method that looks like token validation. What comes before you write the hook?", opts: ["Write the hook - jadx output is reliable", "Confirm the name in smali and confirm the method is actually called", "Ask MobSF what to hook"], a: 1, why: "A method that exists but is never called produces a hook that attaches and never fires - the most common wasted hour in this module." }
    ],
    title: "An APK is an archive: three views of the same code",
    nodes: [
      { id: "apk", label: "app.apk", sub: "a zip: manifest, dex, res, lib, assets" },
      { id: "dex", label: "classes.dex", sub: "Dalvik bytecode, what ART executes" },
      { id: "smali", label: "smali", sub: "one line of smali = one bytecode instruction" },
      { id: "java", label: "decompiled Java", sub: "jadx's best guess at the source" },
      { id: "target", label: "the hook target", sub: "class + method, exactly as loaded" }
    ],
    frames: [
      { focus: ["apk"], caption: "It is a zip. unzip -l shows you the parts before any tool touches it: AndroidManifest.xml, one or more classes*.dex, res/, lib/, assets/." },
      { focus: ["dex"], caption: "The dex files are Dalvik bytecode. This is what ART loads and executes - not Java source, and not smali." },
      { focus: ["smali"], caption: "apktool disassembles dex to smali. The mapping is one-to-one, so a class or method name you read in smali is a name Frida can use." },
      { focus: ["java"], caption: "jadx guesses the original Java. It is far easier to read, and occasionally wrong - which is why the hook target comes from smali, not from the guess." },
      { focus: ["target"], caption: "So the order is: read in Java to understand, confirm in smali for the exact name, then hook that name." }
    ]
  },

  m2: {
    asks: [
      { at: 2, q: "The calling app holds no permission and shares no uid with BugBazaar. What decides whether the query succeeds?", opts: ["The caller's uid", "The provider's exported attribute and its android:permission", "SELinux on the caller"], a: 1, why: "Binder carries the request into the app's process, so the filesystem check that would have stopped the caller never happens. The provider's own declaration is the only gate." },
      { at: 3, q: "The provider executes the query. Whose uid does SQLite see?", opts: ["The caller's uid", "The app's own uid", "Root"], a: 1, why: "The app opens its own database as itself, on the caller's behalf. That is exactly why a permission-less exported provider is a data leak rather than a filesystem bug." }
    ],
    title: "A query crossing the app boundary",
    nodes: [
      { id: "caller", label: "another app", sub: "no permission, no uid in common" },
      { id: "resolver", label: "ContentResolver", sub: "content://com.bugbazaar.provider.addresses/addresses" },
      { id: "binder", label: "Binder", sub: "the kernel-mediated channel between processes" },
      { id: "provider", label: "AddressContentProvider", sub: "exported=true \u00b7 no android:permission" },
      { id: "sqlite", label: "SQLite", sub: "the app's own database file" },
      { id: "rows", label: "rows returned", sub: "data has crossed the boundary" }
    ],
    frames: [
      { focus: ["caller", "resolver"], caption: "The caller has no permission and shares nothing with the app. On a filesystem it would be stopped here - but this is not the filesystem." },
      { focus: ["binder"], caption: "Binder carries the request into the app's own process. The caller never opens the database; the app does it on the caller's behalf." },
      { focus: ["provider"], caption: "Now the only gate: is the provider exported, and does it name a permission? Here exported=true and no permission attribute at all." },
      { focus: ["sqlite"], caption: "The provider runs its query against the app's own SQLite file, with the app's own uid, inside the app's own sandbox." },
      { focus: ["rows"], caption: "Rows come back through Binder. That is the finding - not the attribute, the rows." }
    ]
  },

  m3: {
    asks: [
      { at: 3, q: "frida-server is up and the agent is injected. Why does Java.perform sometimes never produce a hook?", opts: ["frida-server is not running", "The class is not loaded yet when the hook is installed", "SELinux blocks java hooks"], a: 1, why: "Java hooks land on loaded classes. Hook too early and Frida reports success while nothing is instrumented - poll or hook the loader, do not assume." },
      { at: 4, q: "Attach prints 'attached' but no console output ever appears. Most likely cause?", opts: ["Wrong frida version on server and client", "The code path already ran before your hook was installed", "USB debugging is off"], a: 1, why: "An attach that succeeds only tells you the socket is open. Silence after that is usually timing - the method executed before the hook existed, or the class was never loaded." }
    ],
    title: "Two processes and a channel",
    nodes: [
      { id: "host", label: "your laptop", sub: "frida CLI, or a python script" },
      { id: "forward", label: "adb forward tcp:27042", sub: "USB carries the socket" },
      { id: "server", label: "frida-server", sub: "runs as root on the device" },
      { id: "agent", label: "agent in the app", sub: "a thread inside com.BugBazaar" },
      { id: "art", label: "ART", sub: "the runtime that loads your classes" }
    ],
    frames: [
      { focus: ["host"], caption: "The script runs on your machine, not on the phone. Nothing you write executes there until it is delivered." },
      { focus: ["forward"], caption: "adb forward maps a local port to a device port over USB. No Wi-Fi, no server, no network - which is why this works in an offline lab." },
      { focus: ["server"], caption: "frida-server is the daemon on the device. It runs as root, so it can attach to another app's process at all." },
      { focus: ["agent"], caption: "The agent is injected into the target process and runs there. Its console is your terminal, through the same socket." },
      { focus: ["art"], caption: "Java.perform only sees classes that ART has already loaded - which is why a hook written too early reports 'attached' and never fires." }
    ]
  },

  m4: {
    asks: [
      { at: 2, q: "The proxy presents its own CA. From API 24, when does the platform trust a user-installed CA?", opts: ["Always - the user store is trusted", "Only when the app's network security config allows it", "Never, user CAs are ignored entirely"], a: 1, why: "targetSdk decides the default, and a network security config can override it either way. That is why 'my CA is in the user store' is not an answer on its own." },
      { at: 3, q: "A certificate that validates is presented. What is pinning?", opts: ["Another name for the trust anchor", "A separate check on the key or certificate the app expects", "A TLS 1.3 feature"], a: 1, why: "Pinning runs after chain validation and compares the key itself. A proxy CA cannot satisfy it, which is why pinning has to be bypassed rather than installed around." }
    ],
    title: "How TLS actually decides",
    nodes: [
      { id: "hello", label: "ClientHello", sub: "the app offers TLS and a hostname" },
      { id: "cert", label: "server certificate", sub: "plus the chain it presents" },
      { id: "store", label: "trust anchors", sub: "system store \u00b7 user store \u00b7 targetSdk decides" },
      { id: "pin", label: "pinning", sub: "does the app also check the key itself?" },
      { id: "ok", label: "handshake completes", sub: "your proxy sees plaintext" }
    ],
    frames: [
      { focus: ["hello"], caption: "The app starts a handshake for a hostname. This happens whether or not a proxy is in the middle." },
      { focus: ["cert"], caption: "The server - or your proxy - presents a certificate and a chain. Nothing is trusted yet." },
      { focus: ["store"], caption: "The chain must reach an anchor the platform trusts. From API 24, user-installed CAs are only trusted if the app's network security config says so - so targetSdk is the first question." },
      { focus: ["pin"], caption: "Only after the chain validates does pinning matter: a separate check on the key itself, which a proxy CA cannot satisfy." },
      { focus: ["ok"], caption: "Anchor trusted and no pin: the handshake completes and Burp reads plaintext. That is the state you are trying to reach before you claim pinning." }
    ]
  },

  m5: {
    asks: [
      { at: 3, q: "You edit a smali file after apksigner already signed the APK. What breaks?", opts: ["Nothing, the signature is per-file", "The signature - it covers the finished archive", "Only zipalign alignment"], a: 1, why: "The signature is over the whole archive. Any edit after signing invalidates it, which is why the order build-then-sign is not a style preference." },
      { at: 4, q: "adb install -r fails with INSTALL_FAILED_UPDATE_INCOMPATIBLE. Why?", opts: ["The new APK is signed with a different key", "targetSdk differs from the installed build", "The device storage is full"], a: 0, why: "Android refuses an update signed by a different key. You must uninstall first - and note that you just lost the app's data, which is often the thing you were about to test." }
    ],
    title: "The pipeline, and why the order is fixed",
    nodes: [
      { id: "decode", label: "apktool d", sub: "smali + resources on disk" },
      { id: "patch", label: "edit smali", sub: "one method, the smallest change that proves the point" },
      { id: "build", label: "apktool b", sub: "rebuild an unsigned APK" },
      { id: "sign", label: "apksigner sign", sub: "v1+v2 with your key" },
      { id: "install", label: "adb install -r", sub: "different key = uninstall first" },
      { id: "verify", label: "apksigner verify", sub: "and run it, and watch for the crash" }
    ],
    frames: [
      { focus: ["decode"], caption: "Decode with resources when you intend to rebuild - apktool -r leaves res/ as a binary blob and the build fails later, not now." },
      { focus: ["patch"], caption: "Change one thing. A patch you cannot describe in one sentence is a patch you cannot defend in a report." },
      { focus: ["build"], caption: "apktool b produces an APK that is not signed at all. It will not install yet, and that is expected." },
      { focus: ["sign"], caption: "Signing must come after building, because the signature covers the finished archive. Any edit after this point invalidates it." },
      { focus: ["install"], caption: "Installing over the original fails if the key differs - Android refuses. Uninstall first, and note what you lost." },
      { focus: ["verify"], caption: "apksigner verify proves the signature, not the app's behaviour. Then run it: most failures appear at launch, not at install." }
    ]
  },

  m6: {
    asks: [
      { at: 2, q: "A scanner reports 'exported provider'. At that moment it is...", opts: ["A finding", "A hypothesis until you reproduce it on a device", "A false positive"], a: 1, why: "The scanner read an attribute. Whether the provider is reachable, and what it returns, is a separate question answered by a command you can paste into a report." },
      { at: 4, q: "Two providers are both exported. Can their severities differ?", opts: ["No, exported is exported", "Yes - severity follows the data and who can reach it", "No, both are informational"], a: 1, why: "One may return address rows to any app; the other may be protected by a permission that is actually declared. Same attribute, different finding." }
    ],
    title: "From scanner output to a finding",
    nodes: [
      { id: "scan", label: "MobSF report", sub: "hundreds of lines, ranked by nothing" },
      { id: "claim", label: "a claim", sub: "'exported provider' - from a static rule" },
      { id: "repro", label: "reproduce by hand", sub: "on a device, with a command" },
      { id: "ev", label: "evidence", sub: "the request, the output, the count" },
      { id: "sev", label: "severity", sub: "what an attacker gains, and what they do not" }
    ],
    frames: [
      { focus: ["scan"], caption: "A scanner gives you candidates. It cannot tell you what is reachable, and it cannot tell you what the data is worth." },
      { focus: ["claim"], caption: "Each hit is a hypothesis about a line in a file. Treat it as a question, not a finding." },
      { focus: ["repro"], caption: "Answer it on the device. If you cannot reproduce it with a command you can paste into a report, you do not have it." },
      { focus: ["ev"], caption: "The evidence is the artefact: rows returned, a token in a log, a dialog that did not appear. Screenshots are supporting, not primary." },
      { focus: ["sev"], caption: "Severity follows the data and the reach, not the rule name. Two 'exported provider' hits can be High and Informational." }
    ]
  }
};
