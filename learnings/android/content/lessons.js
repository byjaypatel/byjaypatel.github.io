/* Teaching layer: one lesson per module, plus the "where to look" map.
   Rendered above the steps. HTML allowed: <code>, <b>, <i>. */
window.LESSONS = {

m0: {
  title: "How Android runs an app - and why every tool below exists",
  blocks: [
    { h: "Five layers, one of which you can see", p: [
      "Android is a Linux kernel with a runtime bolted on top. From the bottom: the <b>kernel</b> (drivers, SELinux, filesystem permissions), the <b>HAL</b> (C bindings to hardware), " +
      "<b>ART</b> (executes DEX bytecode, ahead of time or just in time), the <b>framework</b> (<code>system_server</code>, Binder, PackageManager, ActivityManager) and the <b>apps</b>. " +
      "Every security question in this workshop reduces to one of those layers: who owns the process, what may it read, and who can call into it." ] },
    { h: "The sandbox is a uid, not a policy engine", p: [
      "Each app gets a Linux uid (<code>u0_a194</code> for BugBazaar here) and a private directory at <code>/data/data/&lt;pkg&gt;</code> owned by that uid with mode 0700. " +
      "SELinux then clamps the process to a domain such as <code>untrusted_app</code>. Nothing clever happens at runtime: another app is simply <i>another uid</i> and the kernel says no." ] },
    { h: "Where you stand decides what you can see", p: [
      "ADB connects to <code>adbd</code>, which normally runs as the <b>shell</b> user, uid 2000. Shell is not root and does not own app data. Three consequences you will meet constantly:" ],
      list: [
        "<code>am start</code> from shell is refused on a non-exported activity - the exported check is evaluated against the calling uid, and uid 2000 is not the app.",
        "<code>run-as &lt;pkg&gt;</code> only works if the app is <b>debuggable</b>; it drops you into that app's uid. That is why <code>debuggable</code> in a release build is a finding, not a nuisance.",
        "<code>adb root</code> restarts <code>adbd</code> as root, but only on a debuggable image (emulators, engineering builds). On a retail phone it prints <code>adbd cannot run as root in production builds</code>."
      ] },
    { h: "Emulator, or the phone in your pocket", p: [
      "The emulator gives you <code>adb root</code>, snapshots and a disposable device - use it for anything that modifies the system. A real device gives you the ART and vendor behaviour students will actually meet, " +
      "and it is the only place some things show up: hpAndro's root check fires on KernelSU but not on the emulator, and the Frida Java bridge is broken on Android 16 with the current server build. " +
      "Use both, and say which one a result came from." ] },
    { h: "Four tools, four questions", p: [
      "Students lose days because they treat these as interchangeable. They are not:" ],
      list: [
        "<code>aapt2</code> - what does the <b>package declare</b>? Manifest, permissions, resources, labels. Reads the binary XML inside the APK, no decompilation.",
        "<code>apktool</code> - decode to <b>smali</b> plus readable resources. This is the code that actually executes, one instruction per line.",
        "<code>jadx</code> - decompile to <b>Java-ish</b> source. Fastest to read, but it is a reconstruction and can be wrong on obfuscated or heavily optimised code.",
        "<code>frida</code> - what is the app doing <b>right now</b>? Runtime only; nothing on disk changes."
      ] },
    { h: "The habit to build here", p: [
      "Before running anything, say what question you are answering and which artifact can answer it. That single habit separates an assessment from a list of commands - and it is what the " +
      "<b>Where to look</b> page in this guide is for." ], note: "two-numbers trap",
      note2: "hpAndro's manifest declares 106 activities; only 98 are challenge screens under <code>ui.activity.task.*</code>. If a doc and your count disagree, check what each one counts before assuming the doc is wrong." }
  ]
},

m1: {
  title: "An APK is an archive, and a manifest is a list of doors",
  blocks: [
    { h: "What is actually inside the file", p: [
      "Rename it to .zip and open it. What you find explains every tool in this module:" ],
      list: [
        "<code>classes.dex</code> (sometimes several) - the bytecode ART executes.",
        "<code>AndroidManifest.xml</code> - <b>binary</b> XML, not text. You cannot grep it as a string; that is why <code>aapt2</code> exists.",
        "<code>resources.arsc</code> - the resource table that turns <code>@0x7f13001c</code> back into a string.",
        "<code>lib/&lt;abi&gt;/*.so</code> - native code. Secrets and checks hide here because most people stop at the dex.",
        "<code>META-INF/</code> - signatures. Change one byte and they stop matching."
      ] },
    { h: "DEX, smali, Java - three views of the same code", p: [
      "The dex is a compressed instruction set; smali is its one-line-per-instruction disassembly; Java is a guess at the original source. " +
      "When jadx shows something odd, drop to smali: a decompiler reconstructs control flow and gets it wrong on obfuscated code, a disassembler never invents anything. " +
      "For this course: read in jadx, confirm in smali, quote the smali in the report." ] },
    { h: "How to read the manifest like an assessor", p: [
      "Do not read it top to bottom - read it in this order, because each answer changes what the next one means:" ],
      list: [
        "<b>Identity and SDK</b> - package, versionName, targetSdkVersion. The target decides which platform protections apply at all.",
        "<b>Application flags</b> - debuggable, allowBackup, usesCleartextTraffic, networkSecurityConfig, requestLegacyExternalStorage.",
        "<b>Components</b> - every activity, service, receiver, provider, with three questions each: is it exported, what guards it, what can reach it.",
        "<b>Permissions</b> - what it asks for and what it declares. A declared custom permission with no matching use, or a use with no declaration, is a bug either way.",
        "<b>Intent filters</b> - scheme/host/BROWSABLE pairs are the URIs an attacker can type."
      ] },
    { h: "The four traps this material is built around", list: [
      "<b>Exported with no guard</b> - reachable by any app. Real finding.",
      "<b>Exported but guarded by a system permission</b> (<code>BIND_JOB_SERVICE</code>, <code>c2dm.permission.SEND</code>) - nobody outside the platform can hold it. Not a finding, and the most common false positive.",
      "<b>Guarded by a permission that does not exist</b> - e.g. <code>@string/app_name</code> as a readPermission, or a name that differs by one letter from the declared one. It fails closed, but for an accident. Report the misconfiguration, not a leak.",
      "<b>Source is not the APK</b> - library manifests merge in at build time. BugBazaar's source declares 30 components, 13 exported; the shipped APK has 64 and 21."
    ] },
    { h: "Hunting hardcoded secrets without guessing", p: [
      "Work from cheap to expensive, and stop when one works:" ],
      list: [
        "Resource strings: <code>strings.xml</code> after apktool decode.",
        "Dex strings: <code>strings classes*.dex | grep -Ei 'key|secret|token'</code>, or a targeted grep in jadx output.",
        "Native libraries: <code>strings lib/arm64-v8a/*.so</code>. BugBazaar's hardcoded secret is a literal in the .so, not in Java.",
        "Build config: <code>BuildConfig</code> fields, often still present after minification."
      ],
      note: "A string is a candidate. A <i>call site</i> - where it is passed to a request, a URL, a signature - is the finding. Quote both." },
    { h: "Reading smali, in one page", p: [
      "You need maybe eight constructs. Everything else is noise until you do." ],
      list: [
        "<code>.method public final getSUBinaries()Ljava/lang/String;</code> - signature. The part after the parentheses is the <b>return type</b>; the rest are parameter types.",
        "<code>.locals 4</code> - how many local registers the method uses. <code>p0</code> is <code>this</code> on an instance method, <code>p1</code> the first argument.",
        "<code>const-string v0, \"/data/local/su\"</code> - a literal, and where you set a breakpoint in your head.",
        "<code>invoke-virtual {v1}, L...;-&gt;isDeviceRooted()Z</code> - a call. The trailing <code>Z</code> is boolean, <code>V</code> void, <code>Ljava/lang/String;</code> an object.",
        "<code>move-result v0</code> - the return value just landed in v0, immediately after an invoke.",
        "<code>if-eqz v0, :cond_0</code> - branch if the value equals zero (false). This is what a bypass flips.",
        "<code>return-object v0</code> / <code>return v0</code> - the exit. Read it first: it tells you the type you must return.",
        "<code>.end method</code> - the boundary your patch must not cross."
      ],
      note: "A method that answers a detection question is small: build the list, loop, return a boolean or the first match. If yours is 50 lines, you are probably in the wrong method." },
      {
        h: "The decoded tree is a map, not a dump",
        p: ["apktool produces eleven entries and you need four of them. Knowing which is which is the difference between a ten-minute answer and an hour of grepping the wrong directory.", "189 MB decoded from an 18 MB APK is normal: smali is one text line per bytecode instruction, and it accounts for 172 of those 189 MB. Nothing is wrong with your decode."],
        list: ["<code>smali/</code>, <code>smali_classes2/</code>, <code>smali_classes3/</code> - one per <code>classes*.dex</code>. All three matter; grep all three or you will miss the class you want.", "<code>res/</code> - decoded resources: <code>values/strings.xml</code>, the <code>xml/</code> configs, layouts. This is where keys and network policy live.", "<code>lib/&lt;abi&gt;/</code> - native code in four ABIs. Read <code>arm64-v8a</code>; the rest are the same source compiled again.", "<code>assets/</code> - whatever the developer put there: HTML, certificates, private keys, prebuilt databases.", "<code>original/</code> - files apktool copied unchanged, including <code>META-INF/</code>. Look here to see what the APK shipped verbatim.", "<code>unknown/</code> - what the tool could not classify, in practice <code>META-INF/*.version</code> and SDK <code>.properties</code>. It doubles as a dependency list.", "<code>AndroidManifest.xml</code> and <code>apktool.yml</code> - the first is now text, the second records the SDK levels the tool decoded against.", "<code>build/</code> and <code>dist/</code> - do not exist until you run <code>apktool b</code>. Outputs, never evidence."],
        note: "four useful of eleven",
        note2: "If a directory you expect is missing - <code>lib/</code>, or <code>smali_classes2/</code> - that is information rather than an error: the app has no native code, or only one dex."
      },
      {
        h: "Data you can read without exploiting anything",
        p: ["The first findings in a real assessment rarely come from a vulnerability. They come from files the app wrote for itself and cannot protect from a backup, a rooted device, or its own exported interface.", "Two directories hold almost all of it, both mode 0700, both plain by default: <code>databases/</code> and <code>shared_prefs/</code>."],
        list: ["<code>databases/</code> - SQLite. Open it with <code>sqlite3 file .schema</code>, not with a hex viewer: the schema names the columns and the columns name the risk.", "<code>shared_prefs/</code> - one XML per <code>getSharedPreferences()</code> name. Credentials, flags and session ids sit in clear text unless the developer encrypted them by hand.", "<code>files/</code> and <code>cache/</code> - logs, downloaded PDFs, cached API responses. Worth an <code>ls -R</code> and nothing more until something looks odd.", "<code>allowBackup=\"true\"</code> plus an empty backup-rules file means all of the above leaves the device with <code>adb backup</code> or Google's auto-backup.", "<code>getExternalFilesDir()</code> writes outside the sandbox entirely - readable by anything that can mount the volume."],
        note: "plaintext by default",
        note2: "SQLite does not encrypt, SharedPreferences does not encrypt, and external storage is not yours. Encryption is a decision the developer has to make, and the default answer is no - which is why this class of finding is so common."
      },
      {
        h: "The checklist that follows the manifest",
        p: ["Once identity, components and permissions are done, the remaining questions are fixed. Run them as a list, in the same order every time, so the report can say you did."],
        list: ["<b>Storage</b> - prefs contents, <code>allowBackup</code>, the backup-rules XML, external storage writes.", "<b>Logging</b> - the arguments of <code>Log.d</code>/<code>Log.e</code>. Filter to the app's own package first, or 250 library calls will drown the one that matters.", "<b>WebView</b> - JavaScript, the Java bridge, the three file-access settings, and where the URL comes from.", "<b>Crypto</b> - the mode from <code>Cipher.getInstance()</code>, and the key from wherever the bytes came from: resource, asset, string literal, or <code>.so</code>.", "<b>Clipboard</b> - <code>setPrimaryClip</code> of anything sensitive, and <code>getPrimaryClip</code> reading what everyone else left there.", "<b>Third-party SDKs</b> - <code>unknown/*.properties</code> and <code>unknown/META-INF/*.version</code> name every library and version without opening a dex; cross-check the tracker list against who the app says it shares data with."],
        note: "count the calls, read the argument",
        note2: "A grep count is a lead, never a finding. hpAndro has 151 <code>Log.d</code> calls and 6 in its own code; BugBazaar has 268 and 11. Report the 6 and the 11, with the argument each one logs."
      },
      {
        h: "What static analysis can and cannot prove",
        p: ["Every step in this module produces a candidate, not an exploit. The whole value of the distinction is that a report which blurs it is wrong even when the finding is real."],
        list: ["You can prove from the tree: the attribute, the string, the cipher mode, the missing call, the file's contents, the permission that does not exist.", "You cannot prove from the tree alone: that the component answers you, that the provider returns rows, that the key is the one in use at runtime.", "The bridge between the two is Module 2 - <code>content query</code>, <code>am start</code>, logcat, Frida.", "A static finding written up without that confirmation is a hypothesis. Label it as one and it is still useful; state it as fact and the first person who tests it takes the report apart."],
        note: "hypothesis versus finding",
        note2: "The AddressContentProvider filter is the example to keep in mind: the code shows the <code>NOT LIKE</code> clause can be commented out with <code>--</code>, and only a query from a foreign uid shows that it is."
      },
      {
        h: "Reading code in a GUI, and handing the result to Frida",
        p: ["The command line is fine for grepping a tree you already understand. When you do not yet know where the logic lives - which is always the first ten minutes on a new app - a GUI that indexes every class and keeps a call graph is faster.", "The workflow repeats on every engagement: find a <b>string</b> you saw on screen (a dialog, a toast, an error), follow it to the <b>method</b> that uses it, use <b>Find usages</b> to learn when that method runs, then <b>Copy as frida snippet</b> to get a class path you can paste into a hook. String, method, caller - three steps, not a search through folders."],
        list: ["jadx-gui indexes the dex; <code>Ctrl+Shift+F</code> is global text search, and clicking a symbol jumps to its definition.", "Right-click a method: <b>Find usages</b> lists the callers - the equivalent of an IDE's cross-reference view.", "Right-click a class or method: <b>Copy as frida snippet</b> gives a <code>Java.use(...)</code> block. Verified present in jadx-gui 1.5.6 (menu id <code>popup.frida</code>).", "A private method is still hookable. Visibility is a compiler rule, not a runtime one - Frida replaces the implementation wherever it lives."],
        note: "the habit worth keeping",
        note2: "write the class/method inventory down before you write the hook. A hook built from guessed names fails silently: the app behaves exactly as before and you conclude the check is native.",
      }
  ]
},

m3: {
  title: "Frida: what a runtime hook can and cannot see",
  blocks: [
    { h: "Two processes and a channel", p: [
      "<code>frida-server</code> runs on the device as root. The client on your laptop talks to it over USB or TCP and injects a small agent into the target process. " +
      "The agent runs JavaScript inside that process, with the same privileges as the app - which is why the server needs root: injecting into another uid is exactly what the sandbox forbids." ] },
    { h: "The Java bridge is not magic, and it is not universal", p: [
      "<code>Java.perform()</code> asks ART for the class loader and gives you <code>Java.use(&quot;com.x.Y&quot;)</code>. That only reaches <b>Java and Kotlin</b> code. " +
      "A check implemented in C inside a <code>.so</code> is invisible to it - you need <code>Interceptor.attach</code> on the exported symbol, which is why hpAndro ships a " +
      "<code>RootBeerNative</code> class and a detector that calls into it." ],
      list: [
        "<code>Java.perform</code> fails with <code>Java is not defined</code> when you spawn before ART is up - wait for the bridge, do not retry blindly.",
        "Overloads: <code>Java.use(\"X\").m.overload('java.lang.String')</code>; without it Frida calls the first match and you silently hook the wrong one.",
        "<code>.implementation = function (a) { ... }</code> replaces the body; call <code>this.m(a)</code> to keep the original behaviour.",
        "<code>this.context</code> inside a hook is the Android <code>Context</code> - enough to start activities, read prefs, or prove a code path ran."
      ] },
    { h: "What hooking is for", p: [
      "Three legitimate uses, and they are the three steps in this module:" ],
      list: [
        "<b>Observe</b> - print the arguments and return of a method you cannot otherwise see. This is how you learn what a check does before you change it.",
        "<b>Prove</b> - flip one boolean and show the app's behaviour change. That is the evidence that the control was client-side.",
        "<b>Enumerate</b> - list every method with a promising name, so you are not guessing at the single one you found in the docs."
      ] },
    { h: "Detection, and the honest limit", p: [
      "Anti-Frida checks look for the server's process, its TCP port, thread names, or strings in <code>/proc/self/maps</code>. Beating them is a different workshop. " +
      "What matters here: a hook that works is proof the check is client-side; a hook that fails is <b>not</b> proof the app is hardened - check your tooling first. " +
      "On Android 16 with frida-server 17.24 the Java bridge dies on some targets while native hooks keep working. That is a tooling limit, and must never be written up as anti-tampering." ],
      note: "Write down the version of everything you used: frida client, frida-server, Android build, app versionCode. Without those the result is not reproducible." },
      {
        h: "The method, from the workshop this module is modelled on",
        p: ["The Frida workshop by Jaimin Gohel states the loop in five lines, and it is the loop worth memorising: <b>define the objective</b> (bypass root detection, bypass pinning, read an encrypted value), <b>identify the class and function with jadx-gui</b>, <b>hook that function</b>, <b>dump its parameters</b>, then <b>change its behaviour</b> until the objective is met.", "Two habits come with it. First, prove the function is called at all before you try to change it - a hook that never fires tells you nothing about the app. Second, once you are inside, you are not limited to reading: you can replace a return value, edit an argument on the way in, or find a live object with <code>Java.choose</code> and act on it."],
        list: ["<code>Java.perform</code> gets you onto a Java thread; everything Java-side happens inside it.", "Prove the hook fires: <code>MyClass.method.implementation = function () { console.log('called'); }</code> - no return yet.", "Call through when you want the real value: <code>var r = this.method(); console.log(r); return r;</code>", "Change an argument on the way in by rewriting the parameter in the same <code>implementation</code> before calling through.", "<code>Java.choose('android.webkit.WebView', {onMatch: ..., onComplete: ...})</code> walks live instances - the standard trick is calling <code>setWebContentsDebuggingEnabled(true)</code> on a WebView the app already created."],
        note: "read the check before you defeat it",
        note2: "every detection is a fact about the environment - a file, a mount, a port, a property - and every fact can be made false. Students who start with a generic bypass script learn nothing and cannot explain their result in a report.",
      }
  ]
},

m2: {
  title: "Components are doors; exported is whether the door faces the street",
  blocks: [
    { h: "Android's IPC in one paragraph", p: [
      "An <b>Intent</b> is a message. <b>Explicit</b> intents name a component; <b>implicit</b> ones name an action and data, and the system resolves them. " +
      "Activities show UI, services run in the background, receivers take broadcasts, providers expose structured data over a URI. " +
      "Each can be <code>exported=\"true\"</code>, which means any uid on the device may address it - and since API 31 the attribute is mandatory, so any manifest that omits it will not build." ] },
    { h: "Providers are the richest target", p: [
      "A provider answers <code>content://&lt;authority&gt;/&lt;path&gt;</code>. Four operations, four guards: <code>android:permission</code> covers all of them, " +
      "<code>readPermission</code> and <code>writePermission</code> split read from write, <code>path-permission</code> narrows by path, and <code>grantUriPermissions</code> " +
      "lets the app hand out one-shot access to a single URI." ],
      list: [
        "Query it like an app would: <code>adb shell content query --uri content://&lt;authority&gt;/&lt;table&gt;</code> - the shell is uid 2000, a foreign app.",
        "If that returns rows, the guard is missing. If it throws <code>SecurityException</code>, read which permission it named - it may be one nobody can hold.",
        "<code>No result found.</code> with nothing in logcat is the third case: the query was allowed and the table is empty. Do not confuse the three."
      ] },
    { h: "Deep links: the URI is the invite", p: [
      "An intent filter with <code>scheme</code>, <code>host</code> and <code>category.BROWSABLE</code> makes the activity reachable from a browser: " +
      "<code>adb shell am start -a android.intent.action.VIEW -d &quot;scheme://host&quot;</code>. " +
      "Without <code>autoVerify</code> and a hosted asset-links file, any app can claim the same scheme - so the link is not proof of origin." ] },
    { h: "The method, in order", list: [
      "Enumerate: <code>aapt2 dump xmltree</code>, then count components and exports. Do not trust your own first pass - count with a command.",
      "Separate <b>first-party</b> from <b>SDK</b> components. Half of BugBazaar's 21 exports come from Firebase, Razorpay, androidx and Evernote.",
      "For each first-party export: what is the input, what is the guard, what does the code do with the input.",
      "Test reachability from uid 2000, and record the exact error when it is refused - the wording tells you whether the guard is a permission, an export flag, or a crash.",
      "Rate: a leak needs data, a denial of service needs a crash you can trigger, an intent redirection needs the forwarded intent to reach something sensitive."
    ] }
  ]
},

m4: {
  title: "Two different questions: what is on the wire, and what the app will accept",
  blocks: [
    { h: "Capture and proxy answer different questions", p: [
      "<b>tcpdump/Wireshark</b> shows every packet, including traffic the app refuses to hand to anyone - it is the ground truth of what left the device. " +
      "<b>A proxy</b> (Burp, ZAP) shows readable and editable HTTP if and only if the app accepts the proxy's certificate. " +
      "One is evidence of exposure; the other is evidence of what the server will accept. Students conflate them constantly." ] },
    { h: "How TLS actually decides", p: [
      "The server presents a certificate chain. The client checks the chain against <b>trust anchors</b> - the system store, plus the user store when the app's network security config allows it. " +
      "A proxy is an interceptor, so its CA must be trusted, or the handshake fails before any HTTP exists." ],
      list: [
        "<b>First choice, no root:</b> install the proxy CA as a <b>user</b> certificate through the Android UI (Settings, then Security, then Encryption and credential, then Install a certificate). This is what a consultant does on a client's phone, and it is enough whenever the app's config trusts user CAs.",
        "It is trusted only where the config says <code>&lt;certificates src=&quot;user&quot;/&gt;</code>. Android 14+ ignores user CAs for apps targeting API 24+ unless the app opts in - so the same certificate can work for one app and fail for the next on the same device. That difference is a finding, not a bug.",
        "<b>Second choice, rooted device only:</b> put the CA in the system store. Needed when the app trusts system anchors only. On Android 14+ the store lives in <code>/apex/com.android.conscrypt/cacerts</code> and <code>adb remount</code> usually fails - a KernelSU/Magisk module is the practical route. Treat this as the exception you justify in the report, never the default."
      ] },
    { h: "Pinning, and how to tell whether it is there", p: [
      "Pinning means trusting one key instead of a store. Four places it can live: a <code>&lt;pin-set&gt;</code> in the network security config, OkHttp's <code>CertificatePinner</code>, a custom " +
      "<code>X509TrustManager</code>, or native code. Before writing 'pinning implemented', prove one of them exists:" ],
      list: [
        "<code>grep -rn 'pin-set\\|sha256/' res/ smali/</code> - no output means no pin.",
        "<code>grep -rl CertificatePinner smali/</code> - hits under <code>smali/okhttp3</code> are the library, not a call site.",
        "Read the config: a domain that trusts only system CAs will reject your proxy CA - that is a narrow trust anchor, not a pin, and the difference matters in the report."
      ],
      note: "hpAndro is the worked example: two screens named 'public key pinning', zero pins. One host trusts user CAs, the other does not. The lesson is that the screen title is not evidence.",
      note2: "A proxy that is not in the path cannot be defeated or bypassed. Verify the proxy first (dumpsys, curl -x, a TLS handshake through it), then talk about pinning." }
  ]
},

m5: {
  title: "Changing code you did not write",
  blocks: [
    { h: "The pipeline, and why the order is fixed", p: [
      "decode -> find the method -> patch smali -> build -> align -> sign -> install. Each step exists because the next one breaks without it:" ],
      list: [
        "<b>apktool b</b> rebuilds an unsigned APK from the decoded tree.",
        "<b>zipalign -p -f 4</b> aligns uncompressed entries. Sign <i>after</i> aligning, never before: signing writes over the alignment.",
        "<b>apksigner sign</b> writes the v2/v3 signature block. Modify one byte afterwards and verification fails.",
        "<b>adb install</b> compares the signing certificate with the installed copy. Different key, same package, and you get <code>INSTALL_FAILED_UPDATE_INCOMPATIBLE</code> - uninstall first, and know you just deleted the app's data."
      ] },
    { h: "What a smali patch has to get right", list: [
      "Match the <b>whole</b> signature line, including the return type, or the file no longer assembles.",
      "Set <code>.locals</code> to what your body actually uses - too few is a verification error at install time.",
      "Return the right type: <code>return-object</code> for an object or String, <code>return</code> for void, <code>const/4 v0, 0x1</code> then <code>return v0</code> for boolean.",
      "Keep <code>.end method</code>. Everything after it belongs to the next method.",
      "If the app carries <b>two copies</b> of the same check in different classes, patch both or prove which one the screen calls - hpAndro does exactly this, with a copy of the su-list inside the activity."
    ] },
    { h: "The honest verification", p: [
      "A successful build proves the file is valid smali, not that the behaviour changed. Verify by running the screen and reading the output, then by checking that the change survives a restart " +
      "(it will - you changed the APK, not the process). If the screen still behaves the same, you patched a copy nobody calls." ] },
    { h: "What re-signing costs you in a report", p: [
      "Re-signing changes the app's identity and its signature-protected permissions, so a repackaged build is not the shipped app. Say it: 'patched build, signed with a test key, behaviour verified on the patched build only'. " +
      "That sentence is the difference between an assessment and a claim about production." ] }
  ]
},

m6: {
  title: "Automation first, judgement second",
  blocks: [
    { h: "What a scanner actually does", p: [
      "MobSF unpacks the APK, parses the manifest, greps strings and API calls, flags trackers, and scores what it found. It is fast and it is repetitive - exactly the parts a human should not spend attention on. " +
      "What it cannot do: understand what a method is <i>for</i>, decide whether an export matters, or know that a permission is unholdable." ] },
    { h: "The verification rule", p: [
      "Every automated alert gets one of three outcomes before it enters the report: <b>verified</b> (you reproduced it), <b>rejected</b> (you proved the guard works), or <b>unverified</b> (you could not test it, and you say so). " +
      "A scanner that reports 40 issues and a report that repeats them is worth less than one verified finding." ] },
    { h: "The one-page finding", list: [
      "<b>Title</b> - what is wrong, in the component's own vocabulary.",
      "<b>Severity and why</b> - not a colour, a sentence about what an attacker gains.",
      "<b>Evidence</b> - the exact line, the exact command, the exact output.",
      "<b>Impact</b> - what the attacker does next, and what stops them.",
      "<b>Fix</b> - the specific attribute or API change.",
      "<b>Scope</b> - device, Android version, app versionCode, build identity."
    ] },
    { h: "Close with what you did not do", p: [
      "Every assessment has a boundary: no live backend, no fuzzing of third-party endpoints, no MobSF dynamic run without a rooted image, one device. " +
      "Writing that down is not a weakness in the report - it is what makes the rest of it credible." ] }
  ]
}

};

/* question -> where to look -> the command that answers it */
window.WHERE = [
  { q: "What version is this, really?", look: "Manifest identity - filename lies", cmd: "aapt2 dump badging app.apk | head -1", mod: "m0" },
  { q: "Which platform protections apply?", look: "targetSdkVersion / minSdkVersion", cmd: "aapt2 dump badging app.apk | grep -E 'sdkVersion'", mod: "m1" },
  { q: "Can I read the app's private data?", look: "android:debuggable", cmd: "run-as com.pkg id", mod: "m1" },
  { q: "What can another app reach?", look: "exported=\"true\" components", cmd: "aapt2 dump xmltree --file AndroidManifest.xml app.apk | grep -c 'exported(0x01010010)=true'", mod: "m2" },
  { q: "Is that export actually protected?", look: "permission / readPermission + a matching <permission>", cmd: "grep -nE 'permission|protectionLevel' AndroidManifest.xml", mod: "m2" },
  { q: "Can I read the database without root?", look: "content provider authority", cmd: "adb shell content query --uri content://authority/table", mod: "m2" },
  { q: "What URI starts this activity?", look: "intent-filter scheme + host + BROWSABLE", cmd: "adb shell am start -a android.intent.action.VIEW -d 'scheme://host'", mod: "m2" },
  { q: "Where is the login check?", look: "jadx search on the screen name, then smali", cmd: "grep -rn 'class .*Login' jadx_out/sources/com/pkg | head", mod: "m1" },
  { q: "Where is the secret?", look: "resources, dex strings, native libs", cmd: "strings lib/arm64-v8a/*.so | grep -Ei 'key|secret|hpandro\\{'", mod: "m1" },
  { q: "What does this method return?", look: "smali signature + return instruction", cmd: "grep -n -A15 '\\.method.*getSUBinaries' hp/smali/**/*.smali", mod: "m5" },
  { q: "Is the check Java or native?", look: "Java.perform hooks vs .so exports", cmd: "grep -rn 'native ' jadx_out/sources | head", mod: "m3" },
  { q: "What is the app doing right now?", look: "Frida hook on the method", cmd: "frida -H 127.0.0.1:27042 -n 'App' -l hook.js", mod: "m3" },
  { q: "What is leaving the device?", look: "packets, not the proxy", cmd: "adb shell su -c 'tcpdump -i any -s0 -w /data/local/tmp/cap.pcap tcp port 443'", mod: "m4" },
  { q: "Why does Burp show nothing?", look: "proxy in the path? trust anchors?", cmd: "dumpsys wifi | grep -i proxy ; openssl s_client -proxy IP:PORT -connect host:443", mod: "m4" },
  { q: "Is it pinned, or just narrow?", look: "pin-set / CertificatePinner / trust-anchors", cmd: "grep -rn 'pin-set\\|sha256/' res/ smali/ ; cat res/xml/network_security_config.xml", mod: "m4" },
  { q: "Did my patch take effect?", look: "rebuild + reinstall + re-run the screen", cmd: "apktool b hp -o out.apk && zipalign -p -f 4 out.apk a.apk && apksigner sign --ks k.jks a.apk", mod: "m5" },
  { q: "Is this alert real?", look: "the guard, then the code path", cmd: "aapt2 dump xmltree ... | grep -B3 exported", mod: "m6" }
];
