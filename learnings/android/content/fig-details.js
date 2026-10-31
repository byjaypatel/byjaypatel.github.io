/* One entry per clickable shape: "<module>/<step>#<index>" -> { w: what it does, y: why it is here,
   s: what breaks if you skip it }. Index = position in that figure's array in figs-map.js.
   Written to be read in 15 seconds: what the box IS, why the step exists, what it costs to skip. */
window.FIGDETAIL = {

  /* ================= Module 0 — setup ================= */
  "m0/shell#0": {
    w: "Your own terminal on the laptop - the only place commands in this course run.",
    y: "Every later step assumes these variables exist, so they are set once here instead of retyped 50 times.",
    s: "every command that uses $APK_H or $ADB fails with 'no such file' and you spend the session debugging paths."
  },
  "m0/shell#1": {
    w: "Three exported variables: the adb binary and the two APK paths.",
    y: "They turn twenty-line commands into copy-paste, and they are the reason the transcripts in this guide match yours.",
    s: "you type a path once, get it slightly wrong, and every following step inherits the typo."
  },
  "m0/shell#2": {
    w: "The Android device or emulator that will run the lab apps.",
    y: "It is where the apps, the files and the runtime live - your laptop only sends commands.",
    s: "nothing else in the course can run: no install, no logcat, no Frida, no traffic."
  },

  "m0/devices#0": {
    w: "The adb server process on your machine, which owns the connection to every attached device.",
    y: "One server multiplexes all devices and emulators, which is why a stale server is the usual cause of 'device offline'.",
    s: "you cannot tell a cable problem from a server problem, and restart it blind."
  },
  "m0/devices#1": {
    w: "The transport: a USB cable, or TCP port 5555 over Wi-Fi.",
    y: "The serial in the left column is how you address one device when several are attached.",
    s: "with two devices attached, every adb command errors out as ambiguous."
  },
  "m0/devices#2": {
    w: "The phone itself, in one of three states: device, unauthorized, or offline.",
    y: "'device' means the RSA key on the phone was accepted - a physical tap on a dialog, not a command you can script.",
    s: "an 'unauthorized' state is mistaken for a broken cable and you waste the session on hardware."
  },

  "m0/avd#0": {
    w: "sdkmanager downloads the Android system image for a specific API level and architecture.",
    y: "The image fixes what the OS does - API 34 behaves differently from the API 30 image a workshop laptop may already have.",
    s: "you pick whatever image is installed, then your transcripts stop matching the guide."
  },
  "m0/avd#1": {
    w: "avdmanager writes a small config that points at that image and names the device profile.",
    y: "The AVD is the throwaway thing - delete it and the system image is still on disk.",
    s: "you inherit the instructor's AVD settings, including a snapshot that boots into a half-configured device."
  },
  "m0/avd#2": {
    w: "The emulator boots the image under QEMU, with the hardware profile you chose (RAM, screen, CPU).",
    y: "This is the device stand-in for students without a physical handset; -no-snapshot keeps every boot clean.",
    s: "a saved snapshot resurrects old state - old certificates, old Frida, old hooks - and confuses later modules."
  },
  "m0/avd#3": {
    w: "adb discovers the booted emulator as emulator-5554 (the next one is 5556).",
    y: "That serial is what every later command addresses; it is also a hint that you are on an emulator, which some apps detect.",
    s: "you run commands against a real handset you thought you were targeting, or vice versa."
  },

  "m0/props#0": {
    w: "ro.build.version.sdk - the API level the device runs.",
    y: "It decides which protections exist: scoped storage, notification permissions, and whether user CAs are trusted by default.",
    s: "you test a TLS bypass that cannot work on this Android version and call it a failed attack."
  },
  "m0/props#1": {
    w: "ro.product.cpu.abi - the instruction set, e.g. arm64-v8a.",
    y: "Native libraries and any .so you pull must match, and Frida's server build must match too.",
    s: "you copy an x86_64 frida-server onto an arm64 phone and it simply will not execute."
  },
  "m0/props#2": {
    w: "ro.debuggable - 1 on an eng/userdebug build, 0 on a stock one.",
    y: "It tells you whether adbd can run as root, which decides if you can read app-private data without a bypass.",
    s: "you plan a root-dependent attack for a build where adb root will never succeed."
  },
  "m0/props#3": {
    w: "ro.secure - whether adbd drops privileges to the shell user (uid 2000).",
    y: "It is the difference between 'adb shell can read /data/data' and 'adb shell is boxed in'.",
    s: "you assume data access you do not have, and the first file read fails mid-demo."
  },
  "m0/props#4": {
    w: "ro.build.type - user, userdebug or eng.",
    y: "Paired with debuggable, it tells you if this is a device you can actually instrument.",
    s: "you cannot explain why the same command works on one phone and fails on the next."
  },
  "m0/props#5": {
    w: "ro.product.model - the marketing name of the device.",
    y: "Useful only as evidence: it is what you cite in a report to say where a finding was reproduced.",
    s: "your findings cannot be matched to a device by anyone re-testing them."
  },

  "m0/install#0": {
    w: "The APK file on your laptop, already downloaded into lab-apps/.",
    y: "Both lab apps are real third-party vulnerable builds, so their behaviour matches what the guide recorded.",
    s: "you install a different version and the transcripts no longer match, which hides real mistakes."
  },
  "m0/install#1": {
    w: "adb install streams the file to the package manager on the device (-r replaces an existing install).",
    y: "It is the bridge between the file on disk and a running app with a package name and a UID.",
    s: "nothing appears in adb shell pm list packages and every later module has nothing to attack."
  },
  "m0/install#2": {
    w: "PackageManager parses the manifest, checks the signature and creates the app's data directory.",
    y: "This is where permissions are granted, the UID is assigned, and the app becomes addressable by intent.",
    s: "you never see the install errors that explain a later 'app not found' failure."
  },
  "m0/install#3": {
    w: "/data/app/<pkg>/ - where the APK is unpacked and kept, owned by the app's UID.",
    y: "It is the copy that runs, and the copy a rooted session can pull back for analysis.",
    s: "you analyse the wrong file: the APK in your Downloads is not necessarily what the device installed."
  },

  "m0/root#0": {
    w: "A stock build: adb is the shell user, and /data/data is closed to it.",
    y: "This is the baseline most students have, and it is enough for exported-component testing but not for data theft.",
    s: "you cannot tell which findings need root, and your report overstates the impact."
  },
  "m0/root#1": {
    w: "A rooted build (or an emulator with adb root): su exists and the app sandbox stops protecting files from you.",
    y: "Root changes the evidence you can collect, not just the convenience - it is what lets you show the database contents.",
    s: "you describe a data leak you never actually observed, which is the kind of finding that gets a report rejected."
  },

  /* ================= Module 1 — static analysis ================= */
  "m1/decode#0": {
    w: "AndroidManifest.xml in binary XML form - the OS reads this before any code runs.",
    y: "It declares every component, permission and flag; it is the only file you can read to know what the app exposes.",
    s: "you cannot answer 'what can another app reach' and must guess from behaviour."
  },
  "m1/decode#1": {
    w: "classes*.dex - the compiled Dalvik bytecode, sometimes split across several files.",
    y: "This is where the logic lives: the checks, the keys, the SQL string building, the pinning code.",
    s: "you stay at the manifest layer and miss every flaw that lives inside a method."
  },
  "m1/decode#2": {
    w: "resources.arsc - the compiled resource table, including the string pool.",
    y: "It is how @string/app_name resolves to an actual value, which matters when a permission name points at a resource.",
    s: "a permission that looks defined appears undefined, and you misjudge the provider's protection."
  },
  "m1/decode#3": {
    w: "res/ and assets/ - layouts, drawables, and any raw file the developer bundled.",
    y: "Keys, config files and certificates are routinely shipped here, and they survive obfuscation untouched.",
    s: "you miss the hardcoded secret that is sitting in a plain text file."
  },
  "m1/decode#4": {
    w: "lib/<abi>/*.so - native libraries, per CPU architecture.",
    y: "Native code carries its own checks (root detection, pinning) and is where an app hides logic from jadx.",
    s: "you believe the app's security is only what the Java shows."
  },
  "m1/decode#5": {
    w: "META-INF/ - the signature files that prove who built the APK.",
    y: "It is the identity Android checks at install time - and the reason your re-signed build cannot update the original.",
    s: "the INSTALL_FAILED_UPDATE_INCOMPATIBLE wall in Module 05 arrives as a surprise instead of a lesson."
  },

  "m1/manifest-facts#0": {
    w: "The manifest root: package name, and the version metadata.",
    y: "The package name is the app's address for intents, adb and content URIs - everything later uses it.",
    s: "your am start commands target a package that does not exist."
  },
  "m1/manifest-facts#1": {
    w: "<application> carries the flags that apply to the whole app: debuggable, allowBackup, cleartext traffic.",
    y: "One line here can be a high-severity finding without any code involved.",
    s: "you hunt through code for a problem that is declared in one attribute."
  },
  "m1/manifest-facts#2": {
    w: "An exported activity declared android:exported=\"true\".",
    y: "Activities are the UI entry points: exported means any app can start it, with any intent it likes.",
    s: "you test only the launcher activity and miss the other seven doors."
  },
  "m1/manifest-facts#3": {
    w: "No android:permission on that component.",
    y: "Exported without a permission is the whole vulnerability: the OS enforces nothing, so the app must.",
    s: "you report 'exported' as if it were automatically a bug, and cannot defend the finding."
  },
  "m1/manifest-facts#4": {
    w: "A content provider declared exported - the component that speaks SQL to other apps.",
    y: "Providers return data, not screens, so an exported one is a direct read path into the database.",
    s: "the most valuable finding in this app is invisible to you."
  },
  "m1/manifest-facts#5": {
    w: "readPermission=\"@string/app_name\" - a resource reference where a permission name belongs.",
    y: "It resolves to the app's display label, so the 'permission' is a string no other app can ever hold.",
    s: "you trust a guard that does not exist, and downgrade a real leak to 'protected'."
  },
  "m1/manifest-facts#6": {
    w: "A service declared exported=\"false\".",
    y: "Included to show the contrast: this is what a correctly closed component looks like in the same file.",
    s: "you cannot tell a real finding from normal Android plumbing."
  },

  "m1/exported#0": {
    w: "Any other app on the device, holding no permissions of yours.",
    y: "This is the attacker model for the whole module: an ordinary app the user installed for another reason.",
    s: "you assume the attacker needs root or adb, and under-rate every exported-component finding."
  },
  "m1/exported#1": {
    w: "A single intent: am start -n <pkg>/<activity>, the same call the OS makes.",
    y: "Intents are public API - no authentication, no session, just a name anyone can read from the manifest.",
    s: "you think reaching the screen requires the app's own UI, and never try from the shell."
  },
  "m1/exported#2": {
    w: "The exported activity, which now runs inside the victim app's process and UID.",
    y: "That is the escalation: the attacker's intent executes with the victim's permissions.",
    s: "you cannot explain why starting a screen is a security issue rather than a UI quirk."
  },
  "m1/exported#3": {
    w: "The victim's data - files, preferences, database rows - reachable because the code runs as the victim.",
    y: "This is the impact line in the report; without it the finding is just 'a screen opened'.",
    s: "the finding has no impact statement and gets triaged as informational."
  },

  "m1/resolve#0": {
    w: "The attribute that should name a permission: android:readPermission.",
    y: "Android does not require a literal here - it accepts a resource reference, which is the trap.",
    s: "you read the manifest literally and conclude the provider is protected."
  },
  "m1/resolve#1": {
    w: "resources.arsc, where resource references are resolved at build time.",
    y: "This is the file that turns @string/app_name into a value you can hold in your hand.",
    s: "the indirection stays invisible and the provider looks safe."
  },
  "m1/resolve#2": {
    w: "<string name=\"app_name\">BugBazaar</string> - the display label of the app.",
    y: "So the required permission is literally the string \"BugBazaar\": no app can declare or request that.",
    s: "you report 'protected by a permission' and miss that the guard is decorative."
  },
  "m1/resolve#3": {
    w: "The effective result: readPermission satisfied by nobody, so the provider answers every caller.",
    y: "This is the finding - the same leak as an unprotected provider, wearing a costume.",
    s: "the most interesting bug in the app is filed as 'no issue'."
  },

  "m1/secrets#0": {
    w: "The left panel: what the scanner reports as secrets - 12 entries here.",
    y: "It is a candidate list produced by entropy and pattern matching, not a set of findings.",
    s: "you paste the scanner's list into a report and hand your client ten non-findings."
  },
  "m1/secrets#1": {
    w: "The right panel: what survives triage - usually two or three real items.",
    y: "Triage means asking 'what does holding this let someone do', and being able to name the API or data it opens.",
    s: "you cannot distinguish a live API key from a base64 drawable, and your credibility goes with it."
  },

  "m1/tree#0": {
    w: "The app's own package root after decompilation.",
    y: "Obfuscation renames classes; it does not remove the packages the developer wrote, and those names describe intent.",
    s: "you read the decompiled code as an undifferentiated wall and miss the obvious entry points."
  },
  "m1/tree#1": {
    w: "ui/ - activities and screens, the components other apps can reach.",
    y: "This is where exported entry points live, so it is the first place to look for reachable behaviour.",
    s: "you miss the deep-link and login activities that later modules exploit."
  },
  "m1/tree#2": {
    w: "provider/ - the content providers, which speak SQL to other apps.",
    y: "Providers are the highest-value static target: they return rows, not screens.",
    s: "you never look at the class that builds queries from caller input."
  },
  "m1/tree#3": {
    w: "Models/ - the classes that load and hold credentials and profile data.",
    y: "Hardcoded keys and unsafe persistence usually sit in the model layer, not the UI.",
    s: "the data-handling bugs stay hidden behind the screen code."
  },
  "m1/tree#4": {
    w: "controller/ - the classes that handle requests and move data between UI and models.",
    y: "This is where input from outside (intents, providers) meets the data layer.",
    s: "you miss the join point where attacker-supplied values reach storage."
  },
  "m1/tree#5": {
    w: "com.darvin.security IsolatedService - a bundled third-party RASP library.",
    y: "Recognising it early tells you which defences you will meet in Module 03, and that they run in a separate process.",
    s: "you treat a library's behaviour as a custom defence and over-plan the bypass."
  },

  "m1/files#0": {
    w: "shared_prefs/ - XML key-value files, often in plain text.",
    y: "Tokens, flags and credentials land here because it is the easiest store to use.",
    s: "you miss the simplest credential theft on a rooted device or a backup."
  },
  "m1/files#1": {
    w: "databases/ - SQLite files created by the app.",
    y: "This is where structured user data lives, and what an exported provider is really exposing.",
    s: "you cannot show what the leak actually returns."
  },
  "m1/files#2": {
    w: "files/ - arbitrary app-private files.",
    y: "Anything the developer wrote with openFileOutput, including cached API responses and keys.",
    s: "you assume prefs and databases are the only places data lives."
  },
  "m1/files#3": {
    w: "cache/ - temporary copies, historically world-readable on older Android.",
    y: "Caches leak because nobody thinks of them as storage, yet they hold the same data.",
    s: "you miss data that persists after logout because only the database was cleared."
  },
  "m1/files#4": {
    w: "no_backup/ - the directory explicitly excluded from Android backup.",
    y: "Its presence tells you the developer thought about backup - and what they chose to protect.",
    s: "you cannot tell which data survives adb backup and which does not."
  },
  "m1/files#5": {
    w: "lib/ - native libraries shipped with the app.",
    y: "Native code can hold keys and checks that never appear in the dex.",
    s: "you conclude a secret is absent because jadx could not see it."
  },

  "m1/db#0": {
    w: "The databases directory inside the app's private data.",
    y: "It is private by UID, so reaching it is either a root action or the result of another bug.",
    s: "you cannot say how the data would be reached in the real world."
  },
  "m1/db#1": {
    w: "adb pull - copies the file off the device to your machine.",
    y: "Analysis happens locally: you never need to install sqlite on the phone.",
    s: "you run queries against a live app database and risk changing evidence."
  },
  "m1/db#2": {
    w: "sqlite3 opening the file read-only.",
    y: "Read-only keeps the evidence intact and is the difference between analysis and tampering.",
    s: "you modify the app's data and invalidate your own reproduction."
  },
  "m1/db#3": {
    w: ".tables and SELECT - the schema, then the rows.",
    y: "The schema tells you what the app thought was worth storing; the rows prove the impact.",
    s: "your report says 'a database exists' instead of 'these 4 addresses were readable'."
  },

  "m1/providers-static#0": {
    w: "Any app on the device, using a content:// URI.",
    y: "Content URIs are the published address of a provider - visible to anyone who reads the manifest.",
    s: "you look for an API endpoint when the data is exposed locally."
  },
  "m1/providers-static#1": {
    w: "The content resolver: the client-side API that turns a URI into a binder call.",
    y: "It is how query(), insert() and delete() reach the provider - the attacker's whole toolkit.",
    s: "you cannot write the one-line proof that returns rows."
  },
  "m1/providers-static#2": {
    w: "The provider itself - the app's code that answers the query.",
    y: "Everything depends on what it checks: exported flag, permission, and whether it trusts the caller's selection.",
    s: "you miss SQL injection because you stopped at 'it is exported'."
  },
  "m1/providers-static#3": {
    w: "SQLite, where the rows actually live.",
    y: "The provider is a thin wrapper; the data model decides the blast radius.",
    s: "you cannot say whether one row or the whole table is exposed."
  },

  "m1/storage#0": {
    w: "/data/data/<pkg> - internal storage, readable only by the app's UID.",
    y: "This is the boundary the sandbox actually enforces; everything else is negotiation.",
    s: "you overstate exposure of data that is genuinely private."
  },
  "m1/storage#1": {
    w: "/sdcard - shared external storage.",
    y: "World-readable on older Android, and still the most common place apps leak files by accident.",
    s: "you miss the leak that needs no exploit at all."
  },
  "m1/storage#2": {
    w: "/sdcard/Android/data/<pkg> - app-specific external storage.",
    y: "Scoped to the app on modern Android, but readable via adb on many builds.",
    s: "you assume 'external' always means 'public' and misstate the impact."
  },
  "m1/storage#3": {
    w: "MediaStore - the indexed, shared media database.",
    y: "Files here are visible to gallery apps and to any app with media permissions.",
    s: "you miss photos and exports the app published to the world."
  },
  "m1/storage#4": {
    w: "cacheDir - the app's cache, cleared by the system under pressure.",
    y: "Data here is both leaked and unreliable - the app cannot assume it persists, and neither can you.",
    s: "you build a finding on a file that may vanish before the client reproduces it."
  },
  "m1/storage#5": {
    w: "getExternalFilesDir - external storage scoped to the app's package.",
    y: "This is where apps put exports and downloads, and where adb can usually read them.",
    s: "you miss the exported report the app wrote to disk."
  },

  "m1/logging#0": {
    w: "The app starting up - the first lines of the log stream.",
    y: "Context for what follows: you need the sequence to show cause and effect.",
    s: "you cannot tell which line belongs to the action you triggered."
  },
  "m1/logging#1": {
    w: "A routine progress line, harmless on its own.",
    y: "Included so you learn to filter noise before reading the interesting lines.",
    s: "you drown the finding in 200 lines of debug output."
  },
  "m1/logging#2": {
    w: "A user identifier written to logcat.",
    y: "PII in logs is a finding by itself on builds where other apps can read logcat.",
    s: "you report only the password and miss the identifier that makes it attributable."
  },
  "m1/logging#3": {
    w: "A password in cleartext in the log stream - the one line that costs money.",
    y: "Any app with READ_LOGS, or anyone with adb, reads this. It is a credential leak with no exploit required.",
    s: "the single most quotable evidence in the module is never captured."
  },
  "m1/logging#4": {
    w: "The request completing, showing the credential was actually used.",
    y: "It ties the leaked secret to an action, which is what turns a log line into an impact.",
    s: "you cannot show the credential was live rather than a test string."
  },

  "m1/webview#0": {
    w: "Remote content the app loads - a page the attacker may control.",
    y: "WebView content is untrusted by definition, even when it comes from the app's own server.",
    s: "you trust the WebView because the URL looked familiar."
  },
  "m1/webview#1": {
    w: "The WebView itself, rendering that content inside your app's process.",
    y: "It is a browser with your app's identity: cookies, permissions and network access.",
    s: "you treat web content as if it were sandboxed from the app."
  },
  "m1/webview#2": {
    w: "A JavaScript bridge exposing native methods to page script.",
    y: "If attacker content reaches this bridge, page script now calls native code with the app's authority.",
    s: "you miss the path from a malicious page to native data."
  },
  "m1/webview#3": {
    w: "Native code and the permissions the app holds.",
    y: "This is the impact end: the bridge call runs as the app, not as the web page.",
    s: "the finding stays 'insecure WebView' with no consequence attached."
  },

  "m1/crypto#0": {
    w: "The ciphertext - encrypted data in assets, prefs or a bundled file.",
    y: "Encryption is only as strong as key custody; this box is the thing you are about to open.",
    s: "you cannot demonstrate that the 'encrypted' data is readable."
  },
  "m1/crypto#1": {
    w: "The key, shipped inside the same APK.",
    y: "The app must be able to decrypt without a user secret, so the key travels with the ciphertext.",
    s: "you call the data protected and stop."
  },
  "m1/crypto#2": {
    w: "The decryption call - AES or DES with a fixed mode and IV.",
    y: "The mode and IV are usually hardcoded too, which is why reproducing the decryption is mechanical.",
    s: "you cannot reproduce the plaintext outside the app."
  },
  "m1/crypto#3": {
    w: "The plaintext - the data the app considered secret.",
    y: "This is the evidence: a string you can put in a report next to the key that produced it.",
    s: "your finding is theoretical instead of demonstrated."
  },

  "m1/jadx-gui#0": {
    w: "The decompiled Java view - what the developer intended to write.",
    y: "Read it first: it gives you names, control flow and the shape of the check.",
    s: "you start in smali and lose an hour reconstructing intent."
  },
  "m1/jadx-gui#1": {
    w: "The same method in smali - what the device actually executes.",
    y: "patches must be made in smali, and the exact instruction is what you will edit.",
    s: "you know what the check does but not where to change it."
  },

  "m1/jadx-to-frida#0": {
    w: "The class and method signature you read in jadx.",
    y: "Frida needs exactly this: package, class, method and argument types - nothing more.",
    s: "you guess an overload and the hook attaches to nothing."
  },
  "m1/jadx-to-frida#1": {
    w: "frida -U -f <pkg> spawns the app under the debugger.",
    y: "Spawning hooks early enough to catch checks that run before you could attach.",
    s: "the app runs its detection before your script loads, and you see the failure with no hook."
  },
  "m1/jadx-to-frida#2": {
    w: "Java.use('...') with the matching overload.",
    y: "This is the moment the runtime method becomes yours to read and change.",
    s: "the script loads but silently hooks nothing."
  },
  "m1/jadx-to-frida#3": {
    w: "args and return value - what you can now read or replace.",
    y: "This is the payload of the whole module: observing and altering behaviour without touching the APK.",
    s: "you can prove nothing changed and the exercise has no result."
  },

  /* ================= Module 2 — exported components ================= */
  "m2/inventory#0": {
    w: "25 activities, 8 of them exported.",
    y: "Activities are the UI doors of the app; the exported count is how many any app can open.",
    s: "you test one screen and call the surface covered."
  },
  "m2/inventory#1": {
    w: "17 services, 1 exported.",
    y: "Services are background logic with no UI - an exported one runs code on demand, which is quieter than a screen.",
    s: "you miss the invisible entry point that needs no user interaction."
  },
  "m2/inventory#2": {
    w: "16 receivers, 1 exported.",
    y: "Receivers fire on broadcasts; an exported one lets any app trigger that logic at will.",
    s: "you overlook a component that can be triggered repeatedly with no UI at all."
  },
  "m2/inventory#3": {
    w: "6 content providers, 3 of them exported - the highest-value row.",
    y: "Providers return data rather than screens, so an exported one is a direct read path into storage.",
    s: "you miss every data-exposure finding in this app."
  },
  "m2/inventory#4": {
    w: "2 deep links, declared as intent-filters with custom schemes.",
    y: "A link is an entry point anyone can trigger from a browser, a QR code or another app.",
    s: "you cannot explain how an attacker reaches the app without installing anything."
  },
  "m2/inventory#5": {
    w: "Zero permissions on the leakiest provider.",
    y: "This is the number that turns 'exported' from a flag into a finding.",
    s: "you report exports generically instead of pointing at the one that answers anyone."
  },

  "m2/deeplinks#0": {
    w: "A link the user taps: bugbazaar://something.",
    y: "The scheme is public by design - it is in the manifest and in any marketing email.",
    s: "you assume deep links are internal because they look like an app URL."
  },
  "m2/deeplinks#1": {
    w: "The OS resolver, which matches the URI against declared intent-filters.",
    y: "This is the trust boundary: Android guarantees the activity is started, not who asked.",
    s: "you think the OS authenticates the caller - it does not."
  },
  "m2/deeplinks#2": {
    w: "The exported activity that receives the intent.",
    y: "It is the code that must validate everything it was handed; most do not.",
    s: "you cannot point to the line that trusts attacker data."
  },
  "m2/deeplinks#3": {
    w: "Extras and path parameters - the attacker-controlled payload.",
    y: "Anything here can be set by whoever writes the link, including URLs, tokens and flags.",
    s: "you test the link with benign input and conclude it is safe."
  },

  "m2/leak#0": {
    w: "adb, or any installed app: the caller needs nothing at all.",
    y: "No permission on the provider means the OS performs no check on the caller.",
    s: "you look for a privilege escalation that is not required."
  },
  "m2/leak#1": {
    w: "content://com.bugbazaar…/addresses - the published URI.",
    y: "The URI is the entire access control: know it and you can query it.",
    s: "you cannot reproduce the leak in one command."
  },
  "m2/leak#2": {
    w: "The provider's query() implementation, receiving your URI and projection.",
    y: "This is where the app decides what to return - and where a missing check becomes the vulnerability.",
    s: "you describe the leak without knowing which rows come back."
  },
  "m2/leak#3": {
    w: "The SQLite rows: saved addresses in this app.",
    y: "Concrete rows are the evidence; a count and a sample turn a config finding into a data breach.",
    s: "your report says 'potentially exposed' and gets downgraded."
  },

  "m2/trap#0": {
    w: "The manifest declares permission .contacts and the provider requires .contact.",
    y: "Two names differing by one letter - you only see it by reading both lines together.",
    s: "the guard looks real and you skip the provider entirely."
  },
  "m2/trap#1": {
    w: "The consequence: nobody can hold .contact, so readPermission can never be satisfied.",
    y: "An unsatisfiable permission is not protection - the provider behaves exactly like an unprotected one.",
    s: "you report a fake protection instead of the leak behind it."
  },

  "m2/deeplink#0": {
    w: "adb shell am start with a VIEW intent and a URI - the same intent a browser sends.",
    y: "Reproducing from the shell proves the attack needs no malicious app, just a link.",
    s: "you cannot demonstrate reachability without installing a helper app."
  },
  "m2/deeplink#1": {
    w: "The Deeplink activity, exported and mapped to the bb:// scheme.",
    y: "It is the landing point: whatever it does with the URI happens as the victim app.",
    s: "you never see the code path the link triggers."
  },
  "m2/deeplink#2": {
    w: "The auth handler that reads extras from the intent.",
    y: "This is where trust is misplaced: it treats caller-supplied data as its own.",
    s: "the finding stays 'a link opens a screen' with no security meaning."
  },
  "m2/deeplink#3": {
    w: "The session or redirect that follows - the actual impact.",
    y: "Proving the flow completes is what distinguishes a bug from a curiosity.",
    s: "you cannot show what the attacker gains."
  },

  "m2/launch#0": {
    w: "An exported component: am start succeeds and the screen opens.",
    y: "This is the positive control - the proof that the component is reachable.",
    s: "you have no baseline to compare a refusal against."
  },
  "m2/launch#1": {
    w: "A non-exported component: SecurityException, Permission Denial.",
    y: "The refusal is evidence too - it shows the OS enforces the flag on this build.",
    s: "you cannot tell 'protected' from 'broken', and over-report exports that do not matter."
  },

  /* ================= Module 3 — Frida ================= */
  "m3/server#0": {
    w: "The frida CLI or Python client on your laptop.",
    y: "It writes the JavaScript and receives the output - it never touches the app directly.",
    s: "you cannot run or debug a script."
  },
  "m3/server#1": {
    w: "The channel: USB forwarding or TCP to port 27042.",
    y: "One channel carries every hook; if it is blocked, every script fails identically.",
    s: "you debug your JavaScript for an hour when the real problem is the port."
  },
  "m3/server#2": {
    w: "frida-server on the device, running as root.",
    y: "This is the half that actually injects into the target process - and the half the app hunts for.",
    s: "the client says 'unable to connect' and nothing is hooked."
  },
  "m3/server#3": {
    w: "The target process, now containing your agent.",
    y: "Hooks run inside the app, which is why they can read arguments and rewrite return values.",
    s: "you have a connection but no observation."
  },

  "m3/baseline#0": {
    w: "/data/local/su - a common root binary path.",
    y: "Apps check for it because its presence usually means a rooted, instrumentable device.",
    s: "you trigger the root check without knowing why it fired."
  },
  "m3/baseline#1": {
    w: "Port 27042 open - frida's default listening port.",
    y: "A single connect() tells the app a debugger server is present.",
    s: "your stealth changes look random because you never knew what was being checked."
  },
  "m3/baseline#2": {
    w: "frida strings in /proc/<pid>/maps - the memory-map scan.",
    y: "This check defeats renaming the binary, because it looks at what is loaded, not what it is called.",
    s: "you rename frida-server, feel safe, and the app still refuses to run."
  },
  "m3/baseline#3": {
    w: "test-keys in the build tags - a signature of eng/userdebug builds.",
    y: "Cheap to check and hard to fake without a patched build.prop.",
    s: "you miss the check that fires before any of your hooks load."
  },
  "m3/baseline#4": {
    w: "RootBeer, a library that runs several root checks at once.",
    y: "Recognising it tells you the whole list at once instead of one check at a time.",
    s: "you chase individual checks that are already documented in one library."
  },
  "m3/baseline#5": {
    w: "Emulator properties such as goldfish or generic device names.",
    y: "Emulator detection changes behaviour silently - the app may look fine and disable features.",
    s: "you test on an emulator and draw conclusions that do not hold on a phone."
  },

  "m3/hook#0": {
    w: "Java.perform - the wrapper that gives you the app's Java runtime.",
    y: "Every Java hook must run inside it; outside, the class loader is not ready.",
    s: "your script throws and nothing after line one executes."
  },
  "m3/hook#1": {
    w: "Java.use('com.bug.hook.EmulatorCheckUtil') - obtaining the class handle.",
    y: "This is the class jadx showed you; the name must match exactly or the hook silently misses.",
    s: "you hook a class that does not exist in this build."
  },
  "m3/hook#2": {
    w: ".overload() - selecting the exact method signature.",
    y: "Overloads are how Frida resolves Java methods; guessing the wrong one attaches to a different method.",
    s: "the hook loads with no error and changes nothing."
  },
  "m3/hook#3": {
    w: "implementation = function () { return false; } - replacing the body.",
    y: "Returning a constant makes the check answer 'not an emulator' regardless of the device.",
    s: "you can observe the call but cannot change the outcome."
  },
  "m3/hook#4": {
    w: "The closing braces and the end of the script - where the agent is installed.",
    y: "Placement matters: hooks defined after the app's check has already run are useless.",
    s: "you write a correct hook that is simply too late."
  },

  "m3/inventory#0": {
    w: "isEmulator() - property and hardware checks.",
    y: "Quick to bypass once you know it runs before the first screen.",
    s: "you patch behaviour after the flag has already been set."
  },
  "m3/inventory#1": {
    w: "isRooted() - su paths and package checks.",
    y: "Root detection is what usually blocks file access, not the app's own logic.",
    s: "you blame your hook for a failure that is really a root check."
  },
  "m3/inventory#2": {
    w: "checkFrida() - port scan plus /proc maps.",
    y: "This is the check that specifically defeats the default frida-server setup.",
    s: "you cannot explain why the app exits the moment you attach."
  },
  "m3/inventory#3": {
    w: "Debug.isDebuggerConnected - the debugger check.",
    y: "A hooked process often reports a debugger; this check is cheap and catches careless instrumentation.",
    s: "your session dies with no error and no clue."
  },
  "m3/inventory#4": {
    w: "Signature verification against the expected certificate.",
    y: "This is what breaks after a re-sign in Module 05 - and why patching the check matters.",
    s: "the repackaged app refuses to start and you do not know which check refused."
  },
  "m3/inventory#5": {
    w: "The bundled RASP library (IsolatedService).",
    y: "Third-party protection runs its own checks, often in a separate process.",
    s: "you hook the app's Java and miss the checks running elsewhere."
  },

  "m3/digest#0": {
    w: "The app method that computes the value you cannot compute yourself.",
    y: "Hooking the producer is easier than reimplementing the algorithm or recovering the key.",
    s: "you waste an hour on crypto that Frida answers in one line."
  },
  "m3/digest#1": {
    w: "The overload that wraps that method.",
    y: "It gives you arguments before the call and the return value after it.",
    s: "you can see the call but not its result."
  },
  "m3/digest#2": {
    w: "console.log of args and retval - the observation.",
    y: "Printing both is what proves you captured the real input and the real output.",
    s: "you capture a hash with no idea what produced it."
  },
  "m3/digest#3": {
    w: "Your transcript - the evidence you paste into the report.",
    y: "Runtime observation has to be reproducible: the script and the output together.",
    s: "the finding cannot be re-run by anyone else."
  },

  "m3/stealth#0": {
    w: "Renaming frida-server so name-based scans miss it.",
    y: "It defeats the cheapest check, which is often the only one a lab app uses.",
    s: "the app quits on launch and you assume your hook is wrong."
  },
  "m3/stealth#1": {
    w: "Moving the port off 27042 with --listen.",
    y: "Port scans look for the default; a different port is invisible to them.",
    s: "the connection is refused or immediately detected."
  },
  "m3/stealth#2": {
    w: "Re-attaching over the new host and port.",
    y: "The client must be told where the server now listens - the rename alone does not connect.",
    s: "you renamed everything and can no longer attach at all."
  },
  "m3/stealth#3": {
    w: "The /proc maps scan, which still catches you.",
    y: "Knowing what still works is the honest end of this step: stealth is partial, not absolute.",
    s: "you claim full evasion in the report and the client's own test disproves it."
  },

  /* ================= Module 4 — traffic ================= */
  "m4/listener#0": {
    w: "The device, as a network client.",
    y: "Its traffic is the subject; nothing is intercepted until it is pointed at the proxy.",
    s: "you capture your laptop's traffic and analyse the wrong machine."
  },
  "m4/listener#1": {
    w: "Burp's listener on your host, port 8080.",
    y: "It terminates the connection, shows the request, and re-originates it to the real server.",
    s: "there is no proxy to point the device at."
  },
  "m4/listener#2": {
    w: "The real server on the internet.",
    y: "The proxy is a man in the middle by design - the server sees your proxy's connection, not the phone's.",
    s: "you cannot explain why certificates matter at all."
  },

  "m4/setproxy#0": {
    w: "settings put global http_proxy - the device-wide proxy setting.",
    y: "One command covers every app that respects the system proxy, which is most of them.",
    s: "you configure the proxy but see no traffic."
  },
  "m4/setproxy#1": {
    w: "adb reverse as the alternative: map a host port onto the device.",
    y: "It survives apps that ignore the system proxy, and needs no Wi-Fi routing.",
    s: "an app with a hardcoded connection bypasses your setup entirely."
  },
  "m4/setproxy#2": {
    w: "Burp seeing the request - the only proof that you are in the path.",
    y: "Without this confirmation every later finding is unverified.",
    s: "you analyse your own cached traffic and think it is the app's."
  },

  "m4/verify#0": {
    w: "One deliberate request: curl, or a single app action.",
    y: "A controlled request is easier to find in the proxy history than a flood of background traffic.",
    s: "you cannot tell whether the proxy saw anything at all."
  },
  "m4/verify#1": {
    w: "The proxy history, which must contain that request.",
    y: "Presence is the proof; absence means you are not intercepting, whatever the settings say.",
    s: "you spend the next hour testing an app you are not actually proxying."
  },
  "m4/verify#2": {
    w: "When it is absent: check the proxy setting and the CA, not the app.",
    y: "Most 'the app blocks the proxy' reports are a misconfigured device or an untrusted certificate.",
    s: "you misdiagnose a setup error as a security control."
  },

  "m4/forward#0": {
    w: "A port on your laptop.",
    y: "It is how you reach a service running inside the device from host tools.",
    s: "you cannot connect to frida or any device-local service."
  },
  "m4/forward#1": {
    w: "adb forward - a TCP relay, not a proxy.",
    y: "It moves bytes between ports; it does not decrypt, inspect or terminate TLS.",
    s: "you expect to see HTTP in Burp and conclude the app is not using HTTP."
  },
  "m4/forward#2": {
    w: "The port on the device, now reachable from the host.",
    y: "Useful for frida-server and for device-local APIs that bind to loopback.",
    s: "you assume a service is unreachable because it is bound to 127.0.0.1 on the phone."
  },

  "m4/capture#0": {
    w: "The device's network interface - every packet, encrypted or not.",
    y: "Packet capture answers questions TLS inspection cannot: is it TLS, to which host, how much.",
    s: "you cannot corroborate what the proxy claims."
  },
  "m4/capture#1": {
    w: "tcpdump or PCAPdroid writing a capture file.",
    y: "Capturing on the device avoids missing traffic that never reaches your host.",
    s: "you capture on the wrong interface and get an empty file."
  },
  "m4/capture#2": {
    w: "The pcap file - portable, offline evidence.",
    y: "It is what you hand over when someone disputes the proxy's view.",
    s: "your traffic claim is only as good as a screenshot."
  },
  "m4/capture#3": {
    w: "Wireshark reading it: hosts, ports, TLS versions, timing.",
    y: "It shows whether the app talks to unexpected third parties, which a proxy alone can hide.",
    s: "you miss the analytics endpoint nobody mentioned."
  },

  "m4/trustconfig#0": {
    w: "A trust problem: the handshake fails because the CA is not trusted.",
    y: "This is the common case in labs, and it is fixed by installing the CA - not by hooking anything.",
    s: "you build a pinning bypass for a certificate that was simply never trusted."
  },
  "m4/trustconfig#1": {
    w: "Real pinning: the CA is trusted and the connection still fails.",
    y: "The app compares the certificate or key to a value in its code, so no store can satisfy it.",
    s: "you install certificates forever and never get past the check."
  },

  "m4/m4-user-ca#0": {
    w: "The user-added trust store, where a CA installed from Settings lands.",
    y: "It needs no root and covers most apps - the default method for this course.",
    s: "you jump to system-level changes that the lab did not require."
  },
  "m4/m4-user-ca#1": {
    w: "The system store at /system/etc/security/cacerts.",
    y: "Apps that target modern APIs ignore the user store, so this is where a CA must go for them.",
    s: "you cannot intercept an app that only trusts system CAs."
  },
  "m4/m4-user-ca#2": {
    w: "network_security_config - a per-app, per-domain trust override.",
    y: "An app can trust only its own CA for its own domain, which is stricter than either store.",
    s: "you assume installing a CA changes the app's policy - it may not."
  },
  "m4/m4-user-ca#3": {
    w: "An application-level pin, evaluated in code.",
    y: "This is not a store at all, so no certificate installation can satisfy it.",
    s: "you keep adding certificates to fix something certificates cannot fix."
  },

  "m4/m4-system-ca#0": {
    w: "The Burp CA exported as a DER file.",
    y: "It is the certificate the proxy actually signs with - exporting the wrong one is a classic time sink.",
    s: "you install a CA that has nothing to do with the traffic you are seeing."
  },
  "m4/m4-system-ca#1": {
    w: "Renaming it to the subject_hash_old filename Android expects.",
    y: "The system store looks certificates up by hash filename, not by extension.",
    s: "the file is present but never used, and you conclude the phone is broken."
  },
  "m4/m4-system-ca#2": {
    w: "A Magisk module that overlays a writable copy of the system store.",
    y: "It makes the change survive reboots without remounting /system by hand.",
    s: "you remount /system manually, break safetynet-style checks, and lose the change on reboot."
  },
  "m4/m4-system-ca#3": {
    w: "The system store, now trusted by every app that uses it.",
    y: "This is the widest change in the course: it affects the whole device, not one app.",
    s: "you cannot intercept system-trust-only apps - but you also may destabilise the device."
  },

  /* ================= Module 5 — repackage, re-sign, reinstall ================= */
  "m5/find#0": {
    w: "The method that returns the string the screen shows.",
    y: "You start from the visible result and walk backwards: the producer is the smallest thing you can change.",
    s: "you patch a caller and leave the check that sets the value in place."
  },
  "m5/find#1": {
    w: "The return statement holding the literal you saw in the UI.",
    y: "One constant is one line to edit - the cheapest possible proof that the app can be changed.",
    s: "you rewrite logic when a single string would have done."
  },
  "m5/find#2": {
    w: "The comment marking the patch target.",
    y: "It records why this line and not a neighbour, so the change is defensible in the report.",
    s: "you cannot explain your edit to anyone re-testing it."
  },
  "m5/find#3": {
    w: "An empty line - nothing happens here.",
    y: "Included to show that the patch is local: the surrounding method stays untouched.",
    s: "you assume a rebuild is a rewrite and avoid the module."
  },
  "m5/find#4": {
    w: "The note that Frida proves it first, the smali patch proves it second.",
    y: "Hook first to confirm the value matters, then patch so the change survives without Frida attached.",
    s: "you spend an hour patching a string that was never the check."
  },

  "m5/patch#0": {
    w: "The method signature in smali - the unit you edit.",
    y: "Smali is line-oriented and verbose: one instruction per line, so the patch is a text replacement.",
    s: "you cannot locate the instruction that produces the value."
  },
  "m5/patch#1": {
    w: "The const-string instruction holding the original text.",
    y: "Changing the constant changes what the app displays, with no logic edit at all.",
    s: "you patch a branch, introduce a crash, and lose the simple win."
  },
  "m5/patch#2": {
    w: "return-object - hands the value back to the caller.",
    y: "It confirms which register holds the result, which is what makes the edit safe.",
    s: "you change a string that is not the one being returned."
  },
  "m5/patch#3": {
    w: ".end method - the end of the unit you touched.",
    y: "Nothing outside this method changes, which is why the patched app still behaves normally elsewhere.",
    s: "you edit beyond the method boundary and break the class."
  },

  "m5/build#0": {
    w: "apktool b rebuilds an APK from the decoded smali, resources and manifest.",
    y: "The decode in Module 01 produced a folder, not an installable file; this turns the folder back into an APK.",
    s: "you have an edited source tree that no device will install - the patch exists only as text."
  },
  "m5/build#1": {
    w: "zipalign rewrites the rebuilt archive so uncompressed entries start on 4-byte boundaries. It cannot do that before the APK exists, which is why the rebuild comes first.",
    y: "Android memory-maps resources straight out of the APK; aligned entries are read in place, misaligned ones force a copy and can be rejected. It must run after apktool and before apksigner, because signing rewrites the archive and invalidates any earlier alignment.",
    s: "the APK may install but resources misbehave, or the signature check fails - and the cause looks unrelated to alignment."
  },
  "m5/build#2": {
    w: "apksigner adds the v1/v2/v3 signature blocks that Android verifies at install time.",
    y: "The signature is the app's identity: without it the package manager rejects the file, and with a different key it is a different app rather than an update.",
    s: "installation fails outright, or succeeds under a new identity and cannot update the original."
  },
  "m5/build#3": {
    w: "The finished, installable APK - rebuilt, aligned and signed in that order.",
    y: "This is the artifact that carries your patch onto the device with no Frida attached.",
    s: "you have three tools and no file to install, or a file that fails at the last step."
  },

  "m5/sign#0": {
    w: "keytool creates a keystore with one key pair.",
    y: "One keystore per student: it is the identity your build will carry, and you will reuse it for every rebuild.",
    s: "you generate a new key each time and cannot tell builds apart."
  },
  "m5/sign#1": {
    w: "apksigner sign with the keystore, alias and password.",
    y: "This is what turns the aligned APK into an installable, verifiable package.",
    s: "the file stays unsigned and the install is refused."
  },
  "m5/sign#2": {
    w: "apksigner verify checks the signature blocks it just wrote.",
    y: "Verifying before installing is how you catch a bad password or a stale build without guessing.",
    s: "you debug the device when the problem is the file."
  },
  "m5/sign#3": {
    w: "The signer identity compared with the installed app's.",
    y: "Same signer means update; different signer means uninstall first. Android refuses to mix identities.",
    s: "INSTALL_FAILED_UPDATE_INCOMPATIBLE arrives unexplained and looks like a broken patch."
  },

  "m5/install#0": {
    w: "Installing the patched build over the original.",
    y: "Included to show the expected failure: the signatures differ, so the package manager refuses the update.",
    s: "you assume the patch is broken and rebuild it several times."
  },
  "m5/install#1": {
    w: "Uninstall, then install - accepting that app data is destroyed.",
    y: "This is the only correct sequence for a re-signed build, and the data loss is part of the honest report.",
    s: "you cannot install the patched app at all, or you silently wipe evidence you needed."
  },

  "m5/verify#0": {
    w: "Launch the same screen through the same intent as before.",
    y: "Same input, same path - the only variable is your patch.",
    s: "you cannot attribute the changed behaviour to your edit."
  },
  "m5/verify#1": {
    w: "The changed output, on a build with no Frida attached.",
    y: "This is the point of patching: the change persists on its own, unlike a runtime hook.",
    s: "you have a demo that only works while your tooling is running."
  },
  "m5/verify#2": {
    w: "What the patch does NOT fix - usually a server-side check.",
    y: "A patched client cannot change what the backend accepts; saying so keeps the finding honest.",
    s: "your report implies a client patch fixed a server-side control, which is false."
  },

  /* ================= Module 6 — automation and the report ================= */
  "m6/mobsf#0": {
    w: "The same APK you have been analysing by hand.",
    y: "The scanner reads the identical file - it is a second pass, not a different truth.",
    s: "you scan a different build and cannot reconcile its numbers with your notes."
  },
  "m6/mobsf#1": {
    w: "MobSF running its static analyzers: manifest, dex, strings, certificates.",
    y: "It does the tedious pass in a minute and produces a checklist you can work through.",
    s: "you spend the session on enumeration instead of reasoning."
  },
  "m6/mobsf#2": {
    w: "The report sections - manifest analysis, code analysis, secrets, trackers.",
    y: "Each section is a candidate list; the wording is the tool's, not yours.",
    s: "you paste sections into a report and inherit the tool's false positives."
  },
  "m6/mobsf#3": {
    w: "The security score out of 100.",
    y: "It is a sort order across apps, not a measure of exploitability - BugBazaar scores higher than hpAndro and is easier to attack.",
    s: "you quote the score as an impact and the client asks what it means."
  },

  "m6/verify-scan#0": {
    w: "debuggable=true - verified against the merged manifest.",
    y: "Keeping it means you opened the file and reproduced the claim rather than trusting the label.",
    s: "you cannot defend the finding when it is questioned."
  },
  "m6/verify-scan#1": {
    w: "Exported provider - verified with one content query.",
    y: "The query is the proof: rows came back from a caller holding no permission.",
    s: "the highest-impact finding in the app stays a scanner line."
  },
  "m6/verify-scan#2": {
    w: "Cleartext traffic - verified against the manifest flag and observed traffic.",
    y: "Two independent observations are what make a config finding credible.",
    s: "you report a flag that may not be used by any request."
  },
  "m6/verify-scan#3": {
    w: "minSdk 24 - rejected: true, but not a vulnerability in this app.",
    y: "This is the discard that proves you triaged instead of copying.",
    s: "your report carries noise and the real findings lose weight."
  },
  "m6/verify-scan#4": {
    w: "12 secrets, of which about two are real.",
    y: "Triage means naming the key and the API it opens, and saying why the other ten are noise.",
    s: "the client tests your 'secret' and finds a base64 icon."
  },
  "m6/verify-scan#5": {
    w: "Score 34/100 - a number, not a finding.",
    y: "It belongs in an appendix at most; impact belongs in the finding.",
    s: "you lead with a score and the report reads like a tool dump."
  },

  "m6/report#0": {
    w: "FINDING - one sentence naming the defect and the affected component.",
    y: "The title is what a triager reads first; it must be specific enough to act on.",
    s: "the finding is filed under 'misc' and never fixed."
  },
  "m6/report#1": {
    w: "EVIDENCE - the exact command and its output.",
    y: "Copy-pasteable evidence is what makes a finding reproducible by someone who was not there.",
    s: "the report cannot be re-tested and gets disputed."
  },
  "m6/report#2": {
    w: "IMPACT - who can do what, in the user's terms.",
    y: "This is the line the business reads and the standard for whether the finding is reportable at all.",
    s: "a real vulnerability is closed as informational."
  },
  "m6/report#3": {
    w: "FIX - the specific change, not the category.",
    y: "'Set android:exported=false and add a signature-level permission' is actionable; 'improve security' is not.",
    s: "the developer cannot implement the remediation."
  },
  "m6/report#4": {
    w: "LIMIT - what was not tested, on which build, with which blocker.",
    y: "Naming the gap is what makes the rest of the report trustworthy.",
    s: "the client assumes full coverage and finds the gap themselves."
  },

  "m6/limits#0": {
    w: "Dynamic analysis not run - no rooted, supported image.",
    y: "Static findings stand on their own, but runtime confirmation was out of reach this session.",
    s: "the report implies runtime testing happened."
  },
  "m6/limits#1": {
    w: "iOS - out of scope for this engagement.",
    y: "Scope is a contract, not a gap; it belongs in the report so nobody assumes coverage.",
    s: "the client asks why the iOS app was ignored."
  },
  "m6/limits#2": {
    w: "Server-side behaviour - not tested, only inferred from client behaviour.",
    y: "Client patches prove nothing about the backend, and the report must say so.",
    s: "a fixed client is presented as a fixed system."
  },
  "m6/limits#3": {
    w: "Frida hooks that failed on the Android 16 handset.",
    y: "A tooling limitation is a legitimate limit as long as it is named with the device and the error.",
    s: "the missing runtime evidence looks like an oversight instead of a documented constraint."
  },
  "m6/limits#4": {
    w: "Rate limits and load behaviour - not probed.",
    y: "Testing them was out of scope and would have been intrusive on a lab account.",
    s: "the report overstates coverage of availability issues."
  },
  "m6/limits#5": {
    w: "One device, one build - the whole report stands on that.",
    y: "Reproduction on a second build is what separates a finding from a coincidence.",
    s: "a device-specific quirk is reported as an app-wide vulnerability."
  },

  /* ================= home — the course map ================= */
  "home/map#0": {
    w: "Module 00: get a device, adb, and both APKs installed.",
    y: "Everything after this assumes a working device - it is the only module you must not skip.",
    s: "later modules fail for environment reasons that look like security problems."
  },
  "home/map#1": {
    w: "Module 01: read the APK without running it - manifest, code, secrets, storage.",
    y: "Static analysis is where the attack surface is defined, and it needs no root.",
    s: "you test behaviour blindly and miss the components that were never exercised."
  },
  "home/map#2": {
    w: "Module 02: reach the exported components and deep links.",
    y: "This is the first module where you exploit something rather than read it.",
    s: "you have findings with no proof of reachability."
  },
  "home/map#3": {
    w: "Module 03: change behaviour at runtime with Frida.",
    y: "Runtime hooks answer questions static analysis cannot: what is this value, right now.",
    s: "checks you cannot bypass block the later modules."
  },
  "home/map#4": {
    w: "Module 04: see and decrypt the traffic.",
    y: "Network findings need a working proxy, a trusted CA, and proof you are in the path.",
    s: "you never see what the app sends, and the most quotable findings stay hidden."
  },
  "home/map#5": {
    w: "Module 05: repackage, re-sign, reinstall - a change that survives.",
    y: "Patching is how a runtime finding becomes a permanent one, and where signing rules bite.",
    s: "your demonstration only works while your tooling is attached."
  },
  "home/map#6": {
    w: "Module 06: automated pass, then the written finding.",
    y: "The scanner is a second opinion; the report is the deliverable the client actually pays for.",
    s: "you finish with evidence and no report, which is the same as no finding."
  },
  "home/map#7": {
    w: "51 steps and 43 gates across the seven modules.",
    y: "The gates are where you type the decisive value; the steps are where the work happens.",
    s: "you skim the numbers instead of using them to track progress."
  }
};
