/* Step id -> figure spec. Keys are "<module>/<step>". Anything missing simply renders without a
   diagram, so this file can grow module by module without breaking the page. */
window.FIGMAP = {

  /* ---------------- Module 1: static analysis ---------------- */
  "m1/decode": {
    type: "layers", title: "What is actually inside an APK",
    caption: "A ZIP with a fixed layout. Four of these seven entries answer almost every static question - and the manifest is the only one the OS reads before any code runs.",
    items: [
      { t: "AndroidManifest.xml", note: "binary XML - what the OS reads first", hot: true },
      { t: "classes*.dex", note: "the code, as Dalvik bytecode" },
      { t: "resources.arsc", note: "compiled resources, string table" },
      { t: "res/  assets/", note: "drawables, layouts, raw files" },
      { t: "lib/<abi>/*.so", note: "native code, per architecture" },
      { t: "META-INF/", note: "signatures - who built it" }
    ]
  },

  "m1/manifest-facts": {
    type: "tree", title: "The manifest is the attack surface map",
    caption: "Every component the app exposes is declared here. A component with android:exported=true and no permission is a door any installed app can open.",
    rows: [
      { t: "<manifest package=\"com.BugBazaar\">", d: 0 },
      { t: "<application android:debuggable=\"true\">", d: 1, hot: true, note: "debuggable - M1 finding" },
      { t: "<activity android:name=\".Signin\"", d: 2, note: "exported=true" },
      { t: "android:exported=\"true\">", d: 3, hot: true, note: "no permission" },
      { t: "<provider android:name=\".UserProfileProvider\"", d: 2, note: "exported=true" },
      { t: "android:readPermission=\"@string/app_name\">", d: 3, hot: true, note: "resolves to a label" },
      { t: "<service android:exported=\"false\">", d: 2, weak: true, note: "not reachable" }
    ]
  },

  "m1/exported": {
    type: "flow", title: "An exported component is a door in the app's wall",
    caption: "The attacker never needs your code. The OS will start the component for any app that asks, and hand it the intent the attacker wrote.",
    nodes: [
      { t: "Attacker app", s: "no permissions", hot: true },
      { t: "am start -n ...", s: "one intent", edge: "binder" },
      { t: "Exported activity", s: "runs as the victim", hot: true },
      { t: "Victim's data", s: "files, prefs, db" }
    ]
  },

  "m1/resolve": {
    type: "tree", title: "A permission name can resolve to a string resource",
    caption: "readPermission is not required to be a literal. Here it points at @string/app_name, so the \"permission\" becomes the app's own label - a value no other app can ever hold.",
    rows: [
      { t: "android:readPermission=\"@string/app_name\"", d: 0, hot: true },
      { t: "resources.arsc", d: 1, note: "resolved at build time" },
      { t: "<string name=\"app_name\">BugBazaar</string>", d: 2, hot: true },
      { t: "=> permission \"BugBazaar\" - held by nobody", d: 1, note: "guard is decorative" }
    ]
  },

  "m1/secrets": {
    type: "compare", title: "A secrets list is a starting point, not a finding",
    caption: "The scanner counts what looks random. Your job is the second column: which of these is a real key, and what does holding it let someone do?",
    left: { title: "what the scanner reports (12)", lines: ["AIza... google_api_key", "AIza... crash_reporting", "8,980-char base64 blob", "2,300-char base64 blob", "SHA-1 fingerprints", "session-looking hex"], hot: false },
    right: { title: "what survives triage (2-3)", lines: ["real key, restricted?", "what API does it open?", "base64 = an SVG asset", "hash of a public file", "not a secret - say so"], hot: true },
    vs: true
  },

  "m1/tree": {
    type: "tree", title: "jadx gives you the app's own names back",
    caption: "Obfuscation renames classes, it does not remove them. Read the tree top-down: what the app does is in the package names that survived.",
    rows: [
      { t: "com.BugBazaar", d: 0 },
      { t: "ui/  Signin, MyProfile, Deeplink", d: 1, note: "entry points" },
      { t: "provider/  UserProfileProvider", d: 1, hot: true, note: "SQL, exported" },
      { t: "Models/  CredentialsLoader", d: 1, note: "where secrets live" },
      { t: "controller/  ProfileDataHandler", d: 1 },
      { t: "com.darvin.security  IsolatedService", d: 1, weak: true, note: "RASP" }
    ]
  },

  "m1/files": {
    type: "matrix", title: "Where an app keeps what it knows",
    caption: "Every one of these paths is readable on a rooted device, and several are readable without root if the app marks them world-readable or backs them up.",
    cells: [
      { t: "shared_prefs/", s: "xml, plain text", hot: true },
      { t: "databases/", s: "sqlite", hot: true },
      { t: "files/", s: "app-private" },
      { t: "cache/", s: "often world-readable" },
      { t: "no_backup/", s: "excluded from backup" },
      { t: "lib/", s: "native .so" }
    ]
  },

  "m1/db": {
    type: "flow", title: "From file to rows",
    caption: "A database is a file until you open it. Pull it, open it read-only, and the schema tells you what the app considered worth storing.",
    nodes: [
      { t: "/data/data/<pkg>/databases", s: "file on disk" },
      { t: "adb pull", s: "one file", edge: "copy out" },
      { t: "sqlite3 db", s: "read-only shell", hot: true },
      { t: ".tables / SELECT", s: "schema + rows" }
    ]
  },

  "m1/providers-static": {
    type: "flow", title: "A content provider is a SQL window with a URI",
    caption: "The provider is the only component that speaks SQL for other apps. Export it without a permission and the URI is the whole attack.",
    nodes: [
      { t: "any app", s: "content://…", hot: true },
      { t: "content resolver", s: "binder", edge: "query()" },
      { t: "Provider", s: "your code" },
      { t: "sqlite", s: "the rows" }
    ]
  },

  "m1/storage": {
    type: "matrix", title: "Storage is a permission decision, not a location",
    caption: "Where a file sits matters less than who can read the directory. Internal = your UID only; external = everyone with the storage permission.",
    cells: [
      { t: "/data/data", s: "private, per-UID", hot: true },
      { t: "/sdcard", s: "world-readable", hot: true },
      { t: "/sdcard/Android/data", s: "scoped" },
      { t: "MediaStore", s: "shared, indexed" },
      { t: "cacheDir", s: "cleanable" },
      { t: "getExternalFilesDir", s: "app-scoped" }
    ]
  },

  "m1/logging": {
    type: "lines", title: "Logs are a broadcast with no audience control",
    caption: "On older Android any app with READ_LOGS - or adb - reads this stream. The highlighted line is the one that costs something.",
    hot: 3, mark: "credential",
    lines: [
      "D/BugBazaar: onCreate",
      "D/BugBazaar: loading profile",
      "I/BugBazaar: user=vedant@example.com",
      "I/BugBazaar: password=Sup3rS3cret!",
      "D/BugBazaar: request complete"
    ]
  },

  "m1/webview": {
    type: "flow", title: "A WebView is a browser inside your app's permissions",
    caption: "Content in the WebView is untrusted by definition. If it can reach a JavaScript bridge, it is executing with the app's authority.",
    nodes: [
      { t: "remote content", s: "attacker HTML", hot: true },
      { t: "WebView", s: "loadUrl / loadData", edge: "renders" },
      { t: "JS bridge", s: "native methods", hot: true },
      { t: "native code", s: "app's permissions" }
    ]
  },

  "m1/crypto": {
    type: "flow", title: "Crypto in an APK is obfuscation with extra steps",
    caption: "The key has to be somewhere the app can reach it, so it ships inside the APK. Once you have both halves, the ciphertext is just data.",
    nodes: [
      { t: "ciphertext", s: "in assets/" },
      { t: "the key", s: "in the APK too", hot: true, edge: "+" },
      { t: "Cipher.doFinal", s: "AES/DES mode", edge: "same code" },
      { t: "plaintext", s: "what you wanted" }
    ]
  },

  "m1/jadx-gui": {
    type: "compare", title: "Two views of the same method",
    caption: "Smali is the truth, Java is the story. Read the Java to understand intent, then drop to smali when you need the exact instruction to patch.",
    left: { title: "Java (jadx)", lines: ["if (checkRoot()) {", "  showDialog();", "  return;", "}", "loadDashboard();"], hot: false },
    right: { title: "smali (the truth)", lines: ["invoke-static {}, LRoot;->check()Z", "move-result v0", "if-eqz v0, :cond_1", "", ":cond_1  load dashboard"], hot: true },
    vs: true
  },

  "m1/jadx-to-frida": {
    type: "flow", title: "From a decompiled method to a live hook",
    caption: "Everything you need for the hook is in the signature you just read: class, method, argument types. Frida needs nothing else.",
    nodes: [
      { t: "jadx: class + method", s: "Lcom/x/Y;->z(...)", hot: true },
      { t: "frida -U -f pkg", s: "attach", edge: "spawn" },
      { t: "Java.use('...')", s: "overload match", edge: "hook" },
      { t: "args / return", s: "read or change" }
    ]
  },

  /* ---------------- Module 0: setup ---------------- */
  "m0/shell": {
    type: "flow", title: "One shell, three variables, one tool",
    caption: "Everything in this course is adb plus an APK path. Set the variables once and every later command is copy-paste.",
    nodes: [
      { t: "your terminal", s: "zsh / bash" },
      { t: "ADB=$HOME/…/adb", s: "$APK_H · $APK_B", edge: "export" },
      { t: "android device", s: "usb or wifi", hot: true }
    ]
  },
  "m0/devices": {
    type: "flow", title: "Serial is the address; state is the permission",
    caption: "device means you may talk to it. unauthorized means the RSA key on the phone has not been accepted - a physical tap, not a command.",
    nodes: [
      { t: "adb server", s: "host side" },
      { t: "USB / TCP 5555", s: "transport", edge: "serial" },
      { t: "the phone", s: "device | unauthorized", hot: true }
    ]
  },
  "m0/avd": {
    type: "flow", title: "An emulator is a system image plus a config",
    caption: "sdkmanager fetches the image, avdmanager writes the config, the emulator boots it. Three artefacts you can delete independently.",
    nodes: [
      { t: "sdkmanager", s: "system-image" },
      { t: "avdmanager", s: "create avd", edge: "writes" },
      { t: "emulator -avd", s: "qemu boot" },
      { t: "adb sees it", s: "emulator-5554" }
    ]
  },
  "m0/props": {
    type: "matrix", title: "Four properties that decide what is possible",
    caption: "Read these before you plan an attack: they tell you the API level, the CPU architecture, and whether the build will fight you.",
    cells: [
      { t: "ro.build.version.sdk", s: "API level", hot: true },
      { t: "ro.product.cpu.abi", s: "arm64 / x86_64" },
      { t: "ro.debuggable", s: "0 or 1", hot: true },
      { t: "ro.secure", s: "adbd root?" },
      { t: "ro.build.type", s: "user / eng" },
      { t: "ro.product.model", s: "which device" }
    ]
  },
  "m0/install": {
    type: "flow", title: "Install is a copy plus a package-manager entry",
    caption: "The APK lands under /data/app and the package manager records it. Installing the lab builds is the last setup step.",
    nodes: [
      { t: "host .apk", s: "17 MB" },
      { t: "adb install -r", s: "push + pm", edge: "streams" },
      { t: "PackageManager", s: "parses manifest" },
      { t: "/data/app", s: "installed", hot: true }
    ]
  },
  "m0/root": {
    type: "compare", title: "Root changes which files exist for you",
    caption: "Without root you are the shell user: you can start components but not read app-private data. With root, /data/data stops being private.",
    left: { title: "stock build", lines: ["uid 2000 (shell)", "adb shell works", "/data/data: permission denied", "frida: needs a server"], hot: false },
    right: { title: "rooted build", lines: ["uid 0 via su", "adb root on emulator", "/data/data readable", "frida-server runs"], hot: true },
    vs: true
  },

  /* ---------------- Module 2: exported components ---------------- */
  "m2/inventory": {
    type: "matrix", title: "The attack surface, counted",
    caption: "This is the inventory you build yourself from the manifest. The number that matters is not the total - it is how many of these are reachable without a permission.",
    cells: [
      { t: "25 activities", s: "8 exported", hot: true },
      { t: "17 services", s: "1 exported" },
      { t: "16 receivers", s: "1 exported" },
      { t: "6 providers", s: "3 exported", hot: true },
      { t: "2 deep links", s: "bugbazaar:// · bb://" },
      { t: "0 permissions", s: "on the leaky one" }
    ]
  },
  "m2/deeplinks": {
    type: "flow", title: "A deep link is an intent anyone can write",
    caption: "The scheme is public by design. Everything after it - host, path, extras - arrives from whoever tapped the link.",
    nodes: [
      { t: "link tapped", s: "bugbazaar://…", hot: true },
      { t: "OS resolver", s: "intent-filter", edge: "routes" },
      { t: "exported activity", s: "no permission" },
      { t: "extras / params", s: "attacker data" }
    ]
  },
  "m2/leak": {
    type: "flow", title: "The provider that answers anyone",
    caption: "No permission on the provider means any app - or adb - can query it. The URI is the entire access control.",
    nodes: [
      { t: "adb / any app", s: "content query" },
      { t: "content://…addresses", s: "the URI", hot: true, edge: "query()" },
      { t: "AddressProvider", s: "no permission" },
      { t: "sqlite rows", s: "saved addresses" }
    ]
  },
  "m2/trap": {
    type: "compare", title: "The provider that only looks protected",
    caption: "The manifest defines permission.contacts; the provider requires permission.contact. One letter. The guard can never be held, so it never applies.",
    left: { title: "what the manifest promises", lines: ["<permission", "  android:name=\".permission.contacts\"/>", "", "<provider", "  android:readPermission=", "   \".permission.contact\"/>"], hot: false },
    right: { title: "what that means", lines: ["two different names", "nobody can hold .contact", "readPermission unsatisfiable", "=> effectively unprotected", "=> same leak as m2/leak"], hot: true },
    vs: true
  },
  "m2/deeplink": {
    type: "flow", title: "Walking the auth flow from outside",
    caption: "am start is the same intent the browser would send. The interesting part is what the activity does with the extras it was handed.",
    nodes: [
      { t: "adb am start", s: "-a VIEW -d …", hot: true },
      { t: "Deeplink activity", s: "exported" },
      { t: "auth handler", s: "reads extras", edge: "trusts" },
      { t: "session / redirect", s: "the impact" }
    ]
  },
  "m2/launch": {
    type: "compare", title: "Exported vs not - the error message is the proof",
    caption: "A permission denial is not a failure, it is the control working. Recording both outcomes is what makes the finding defensible.",
    left: { title: "exported component", lines: ["am start -n pkg/.Signin", "Starting: Intent { … }", "app opens", "=> reachable by any app"], hot: true },
    right: { title: "not exported", lines: ["am start -n pkg/.Wallet", "SecurityException:", "  Permission Denial", "=> the OS refused"], hot: false },
    vs: true
  },

  /* ---------------- Module 3: Frida ---------------- */
  "m3/server": {
    type: "flow", title: "Frida is two halves that must meet",
    caption: "The CLI on your host talks to frida-server on the device over a port. No server, no hooks - and the server is exactly what the app is looking for.",
    nodes: [
      { t: "frida (host)", s: "python / cli" },
      { t: "usb or tcp:27042", s: "the channel", edge: "spawn / attach" },
      { t: "frida-server", s: "root on device", hot: true },
      { t: "target process", s: "hooks run here" }
    ]
  },
  "m3/baseline": {
    type: "matrix", title: "What the app checks, before you touch anything",
    caption: "Each cell is a detection you will have to pass. Baseline the behaviour first, so you can tell a failed hook from a failed evasion.",
    cells: [
      { t: "/data/local/su", s: "root file", hot: true },
      { t: "27042 open", s: "default frida port", hot: true },
      { t: "frida in /proc", s: "maps scan" },
      { t: "test-keys", s: "build tags" },
      { t: "RootBeer", s: "library checks" },
      { t: "emulator props", s: "goldfish" }
    ]
  },
  "m3/hook": {
    type: "lines", title: "The hook is four lines of JavaScript",
    caption: "Java.use gives you the class; the overload is the exact signature from jadx. Whatever the method returns, you now decide.",
    hot: 3, mark: "the hook",
    lines: [
      "Java.perform(function () {",
      "  var C = Java.use('com.bug.hook.EmulatorCheckUtil');",
      "  var m = C.isEmulator.overload();",
      "  m.implementation = function () { return false; };",
      "});"
    ]
  },
  "m3/inventory": {
    type: "matrix", title: "Every check you found in the code",
    caption: "This is your evasion to-do list, built from the decompiled source rather than from guesswork.",
    cells: [
      { t: "isEmulator()", s: "build props" },
      { t: "isRooted()", s: "su paths" },
      { t: "checkFrida()", s: "port + maps", hot: true },
      { t: "debugger", s: "isDebuggerConnected" },
      { t: "signature", s: "integrity" },
      { t: "RASP", s: "IsolatedService" }
    ]
  },
  "m3/digest": {
    type: "flow", title: "Observe a value you could not compute",
    caption: "Hook the method that produces the digest and print its arguments and return value. You never need the algorithm or the key.",
    nodes: [
      { t: "app method", s: "computeDigest()", hot: true },
      { t: "frida overload", s: "implementation", edge: "wraps" },
      { t: "console.log", s: "args + retval" },
      { t: "your transcript", s: "the evidence" }
    ]
  },
  "m3/stealth": {
    type: "flow", title: "Hide the tool, not the hook",
    caption: "Renaming frida-server and moving the port defeats name and port checks. It does not defeat a /proc maps scan - know which one you fixed.",
    nodes: [
      { t: "rename binary", s: "not 'frida'", hot: true },
      { t: "change port", s: "--listen :4444", edge: "then" },
      { t: "re-attach", s: "frida -H host:4444" },
      { t: "maps scan", s: "still wins", hot: true }
    ]
  },

  /* ---------------- Module 4: traffic ---------------- */
  "m4/listener": {
    type: "flow", title: "A proxy is a listener you point the device at",
    caption: "Burp binds a port and waits. Nothing is intercepted until the device is told to send traffic there.",
    nodes: [
      { t: "device", s: "wifi client" },
      { t: "your host:8080", s: "Burp listener", hot: true, edge: "proxy" },
      { t: "the internet", s: "real server" }
    ]
  },
  "m4/setproxy": {
    type: "flow", title: "Two ways to be in the path",
    caption: "A device proxy setting is global and easy; adb reverse survives apps that ignore the system proxy. Pick per app, not per habit.",
    nodes: [
      { t: "settings put global", s: "http_proxy", hot: true },
      { t: "or adb reverse", s: "tcp:8080", edge: "alternative" },
      { t: "Burp", s: "sees the request" }
    ]
  },
  "m4/verify": {
    type: "flow", title: "Prove it, do not assume it",
    caption: "If the request does not appear in the proxy history, you are not in the path - and every finding after this point would be fiction.",
    nodes: [
      { t: "curl / app", s: "one request" },
      { t: "proxy history", s: "must show it", hot: true, edge: "if absent" },
      { t: "check proxy + CA", s: "not the app" }
    ]
  },
  "m4/forward": {
    type: "flow", title: "Forwarding is not proxying",
    caption: "adb forward moves a TCP port, it does not decrypt anything. It is how you reach a service on the device from your host.",
    nodes: [
      { t: "host :27042", s: "your laptop" },
      { t: "adb forward", s: "tcp relay", edge: "tunnel" },
      { t: "device :27042", s: "frida / http", hot: true }
    ]
  },
  "m4/capture": {
    type: "flow", title: "When TLS hides the payload, capture the packets",
    caption: "A pcap answers different questions: is it TLS at all, which host, how much, and does it match what the proxy claimed.",
    nodes: [
      { t: "device nic", s: "all traffic" },
      { t: "tcpdump / pcapdroid", s: "capture", edge: "writes" },
      { t: "pcap file", s: "offline" },
      { t: "Wireshark", s: "read it" }
    ]
  },
  "m4/trustconfig": {
    type: "compare", title: "Is it pinning, or just a missing CA?",
    caption: "Most 'pinning' in labs is a trust failure. Prove which one before you spend an hour on a bypass.",
    left: { title: "trust problem", lines: ["handshake fails", "no CA in the store", "fix: install the CA", "traffic flows again"], hot: false },
    right: { title: "real pinning", lines: ["CA installed, still fails", "cert hash checked in code", "fix: hook the check", "or patch the pin"], hot: true },
    vs: true
  },
  "m4/m4-user-ca": {
    type: "layers", title: "Android has more than one trust store",
    caption: "A user certificate is enough for most apps - and it is the method that needs no root. Apps that target API 24+ ignore it unless they opt in.",
    items: [
      { t: "user-added store", note: "Settings > CA certificate", hot: true },
      { t: "system store", note: "/system/etc/security/cacerts" },
      { t: "network_security_config", note: "per-domain override" },
      { t: "app pin", note: "code-level, not a store" }
    ]
  },
  "m4/m4-system-ca": {
    type: "flow", title: "Only when the user store is not enough",
    caption: "A module that mounts a writable overlay over both stores. It changes the device, so it is the last resort, not the default.",
    nodes: [
      { t: "Burp CA", s: "exported .der" },
      { t: "hashed filename", s: "subject_hash_old", edge: "rename" },
      { t: "magisk module", s: "overlay mount", hot: true },
      { t: "system store", s: "trusted by apps" }
    ]
  },

  /* ---------------- Module 5: repackage ---------------- */
  "m5/find": {
    type: "lines", title: "Find the method that produces the thing you want",
    caption: "Search for the string you see on screen, then walk up to the method that returns it. That method is your patch target.",
    hot: 2, mark: "patch target",
    lines: [
      "public String getFlag() {",
      "  return \"ACCESS DENIED\";",
      "}",
      "",
      "// frida proof first, smali patch second"
    ]
  },
  "m5/patch": {
    type: "lines", title: "One const-string is the whole patch",
    caption: "Smali is line-oriented: replace the string constant and rebuild. If the method is more complex, patch the branch instead of the string.",
    hot: 1, mark: "changed",
    lines: [
      ".method public getFlag()Ljava/lang/String;",
      "  const-string v0, \"ACCESS GRANTED\"",
      "  return-object v0",
      ".end method"
    ]
  },
  "m5/build": {
    type: "flow", title: "Rebuild, align, sign - in that order",
    caption: "apktool gives you an unsigned APK. Android will not install it until it is aligned and signed, and the order matters.",
    nodes: [
      { t: "apktool b", s: "unsigned apk" },
      { t: "zipalign", s: "4-byte aligned", edge: "then" },
      { t: "apksigner", s: "v1+v2 signature" },
      { t: "installable", s: "or it fails", hot: true }
    ]
  },
  "m5/sign": {
    type: "flow", title: "A signature is an identity, not a permission",
    caption: "Your keystore signs the build. That is also why the patched app cannot update the original - different signer, so uninstall first.",
    nodes: [
      { t: "keytool", s: "one keystore" },
      { t: "apksigner sign", s: "--ks … --ks-pass", edge: "signs" },
      { t: "apksigner verify", s: "proves it" },
      { t: "same signer?", s: "install or clash", hot: true }
    ]
  },
  "m5/install": {
    type: "compare", title: "The wall you should hit on purpose",
    caption: "INSTALL_FAILED_UPDATE_INCOMPATIBLE is not a mistake - it is the OS telling you the signer changed. Uninstall, then install.",
    left: { title: "install over the original", lines: ["adb install -r patched.apk", "Failure", "INSTALL_FAILED_UPDATE_", "  INCOMPATIBLE", "signatures do not match"], hot: false },
    right: { title: "the correct sequence", lines: ["adb uninstall <pkg>", "adb install patched.apk", "Success", "app runs, patched", "data is gone - say so"], hot: true },
    vs: true
  },
  "m5/verify": {
    type: "flow", title: "Prove the patch, then state its limit",
    caption: "Launch the screen and show the changed behaviour. Then say what the patch does not fix - a patched client is not a fixed server.",
    nodes: [
      { t: "am start", s: "same screen", hot: true },
      { t: "patched output", s: "the evidence" },
      { t: "what it does NOT fix", s: "server-side check", hot: true }
    ]
  },

  /* ---------------- Module 6: automation + report ---------------- */
  "m6/mobsf": {
    type: "flow", title: "Static analysis is one pass over the same APK",
    caption: "The scanner reads what you read - manifest, dex, strings - and sorts it. It does not decide what matters.",
    nodes: [
      { t: "your .apk", s: "same file" },
      { t: "MobSF", s: "static analyzer", edge: "parse" },
      { t: "sections", s: "manifest · secrets" },
      { t: "score /100", s: "a sort order", hot: true }
    ]
  },
  "m6/verify-scan": {
    type: "matrix", title: "Three alerts you keep, one you throw away",
    caption: "Every alert gets the same treatment: open the cited file and line, reproduce it, then decide. A scanner's severity is a hint, not a verdict.",
    cells: [
      { t: "debuggable=true", s: "verified", hot: true },
      { t: "exported provider", s: "verified", hot: true },
      { t: "cleartext traffic", s: "verified", hot: true },
      { t: "minSdk 24", s: "rejected: not a bug" },
      { t: "12 secrets", s: "2 real, 10 noise" },
      { t: "score 34/100", s: "not a finding" }
    ]
  },
  "m6/report": {
    type: "lines", title: "One finding, five fields, no adjectives",
    caption: "If a field is empty the finding is not ready. The chain is: what I did, what happened, what it lets someone do, how to fix it, how I know.",
    hot: 3, mark: "the impact",
    lines: [
      "FINDING: exported provider returns other users' addresses",
      "EVIDENCE: content query --uri … => 4 rows (screenshot)",
      "IMPACT: any installed app reads every saved address",
      "FIX: android:exported=false + signature permission",
      "LIMIT: verified on BugBazaar 1.0, targetSdk 32"
    ]
  },
  "m6/limits": {
    type: "matrix", title: "What the report must admit",
    caption: "A report that claims everything was tested is worthless. Name the gaps - blocked, out of scope, not reproducible - in the same document.",
    cells: [
      { t: "dynamic analysis", s: "no rooted image" },
      { t: "iOS", s: "out of scope" },
      { t: "server-side", s: "not tested" },
      { t: "frida on A16", s: "hook failed" },
      { t: "rate limits", s: "not probed" },
      { t: "one device", s: "single build" }
    ]
  },

  /* ---------------- home: the course as a map ---------------- */
  "home/map": {
    type: "matrix", title: "The course as an attack path",
    caption: "Read it left to right: you learn what the app exposes, then how to watch it, then how to change it - and the last module is the report that proves you did.",
    cols: 4,
    cells: [
      { t: "00 Setup", s: "device, adb, apps" },
      { t: "01 Static", s: "manifest, secrets" },
      { t: "02 Exported", s: "surface you can reach", hot: true },
      { t: "03 Frida", s: "runtime hooks" },
      { t: "04 Traffic", s: "proxy, TLS, pinning", hot: true },
      { t: "05 Repack", s: "patch and re-sign" },
      { t: "06 Report", s: "scanner + write-up", hot: true },
      { t: "51 steps", s: "43 gates" }
    ]
  }
};
