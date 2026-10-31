/* Android architecture - the opening page of the course.
 *
 * Outline follows the introduction deck the instructor supplied (five layers, the request walk-through,
 * the pentester's mapping, sandbox / APK / Binder, and what root changes). Every claim here is paired
 * with a command that proves it on the attached device, and every layer points at the module where the
 * student meets it - an architecture page that is not tied to the labs is a Wikipedia article.
 *
 * Output under `out:` keys was captured from the OnePlus 7T (Android 16, API 36, KernelSU) on
 * 2026-10-28. Do not edit those by hand; re-run the command if the material moves.
 */
window.ARCHITECTURE = {
  title: "Android architecture",
  subtitle: "What you are actually attacking, layer by layer",
  intro: "Android is five layers, two processes you never see, and one IPC bus that everything crosses. " +
         "You do not need the whole picture to test an app, but you do need to know which layer a finding " +
         "lives on - because that decides whether it is a bug in the app, a bug in the framework, or a bug " +
         "in the phone, and those are three different reports.",
  note: "Simplified deliberately. Google's official stack diagram splits ART and the native libraries into " +
        "separate columns beside the framework; the order below is the one that matches how a request " +
        "travels, which is what matters when you are tracing one.",
  source: { label: "Outline source: introduction deck (five layers, request walk-through, mapping table)", url: "" },

  layers: [
    {
      n: 1,
      name: "Applications",
      tagline: "Where you spend most of your testing time",
      what: "Everything with a launcher icon and everything installed as an APK: system apps, the settings " +
            "app, the banking app you were hired to test. Each one is a package with a manifest that declares " +
            "activities, services, broadcast receivers and content providers.",
      prove: "adb shell pm list packages | grep -Ei 'bugbazaar|hpandro'"
            + "\nadb shell pm path com.BugBazaar",
      out: "package:hpandro.android.security\npackage:com.BugBazaar\npackage:/data/app/~~iG1jHIfcpLcUmxv4OR7nZA==/com.BugBazaar-xSdup0iSO6XIvvvqqoBOHQ==/base.apk",
      lab: { label: "Module 01 - read the manifest, enumerate components", route: "#/m1/manifest" },
      risk: "Almost every finding in this course lives here: exported components, data in the private " +
            "directory, a WebView that loads whatever it is given, a token in SharedPreferences."
    },
    {
      n: 2,
      name: "Java API framework",
      tagline: "The libraries your app calls, which call the system for you",
      what: "ActivityManager, PackageManager, ContentProviders, NotificationManager, LocationManager, " +
            "WindowManager, ResourceManager. Your code calls a framework API; the framework turns it into a " +
            "Binder call to a system service running in <code>system_server</code>.",
      prove: "adb shell dumpsys package com.BugBazaar | sed -n '/Providers:/,/Receivers:/p' | head -8",
      out: "Registered ContentProviders:\n  com.BugBazaar/.provider.MyContactsProvider:\n    Provider{618fbf5 com.BugBazaar/.provider.MyContactsProvider}\n  com.BugBazaar/.ui.addresses.AddressContentProvider:\n    Provider{ca6271 com.BugBazaar/.ui.addresses.AddressContentProvider}",
      lab: { label: "Module 02 - exported providers, services and receivers", route: "#/m2" },
      risk: "This is the boundary the framework enforces - <code>android:exported</code>, permissions, " +
            "<code>grantUriPermissions</code>. A component marked exported is an API published to every app " +
            "on the phone, whether the developer meant it or not."
    },
    {
      n: 3,
      name: "Android Runtime (ART) + native libraries",
      tagline: "Where the code actually executes",
      what: "ART runs DEX bytecode: Java and Kotlin compiled to <code>.dex</code>, AOT-compiled by " +
            "<code>dex2oat</code> at install and JIT-compiled at run time, with its own garbage collector. " +
            "Beside it sit the native libraries - SQLite, BoringSSL, Skia, media codecs - reached through JNI " +
            "or through the framework.",
      prove: "unzip -l \"$APK_B\" | grep -E 'classes.*dex|\\.so$' | head -6",
      out: "8196600  01-01-1981 01:01   classes.dex\n  7054788  01-01-1981 01:01   classes2.dex\n  4677672  01-01-1981 01:01   classes3.dex\n     5048  01-01-1981 01:01   lib/arm64-v8a/libBugBazaar.so\n     9992  01-01-1981 01:01   lib/arm64-v8a/libnative-lib.so\n     5296  01-01-1981 01:01   lib/arm64-v8a/libtoolChecker.so",
      lab: { label: "Module 03 - hooks at the ART layer with Frida", route: "#/m3/scripts" },
      risk: "Every runtime hook in this course happens here: <code>Java.use</code> replaces a method on an " +
            "ART class, and <code>Interceptor</code> patches machine code inside a <code>.so</code>. A secret " +
            "compiled into native code is not protected by obfuscation - it is protected by nobody looking " +
            "in the right layer."
    },
    {
      n: 4,
      name: "Hardware abstraction layer (HAL)",
      tagline: "The vendor boundary",
      what: "Standard interfaces - camera, audio, sensors, Bluetooth - that system services call and that " +
            "each manufacturer implements. It exists so the framework does not need to know how one phone's " +
            "camera works.",
      prove: "adb shell service list | grep -E 'camera|sensor|audio' | head -5",
      out: "12\tandroid.frameworks.cameraservice.service.ICameraService/default: [...]\n15\tandroid.frameworks.sensorservice.ISensorManager/default: [...]\n54\taudio: [android.media.IAudioService]\n153\tmedia.aaudio: [aaudio.IAAudioService]\n154\tmedia.audio_flinger: [android.media.IAudioFlingerService]",
      lab: { label: "not tested in this course - platform research, not app assessment", route: "" },
      risk: "HAL and vendor code are where phone-level bugs live (a camera service that trusts its caller). " +
            "Out of scope here, but say so in a report rather than implying you looked."
    },
    {
      n: 5,
      name: "Linux kernel",
      tagline: "Isolation, enforced below everything above",
      what: "Process and memory management, drivers, networking, and the security primitives Android is " +
            "built on: one Linux UID per app, SELinux mandatory access control, and the binder driver that " +
            "carries all IPC.",
      prove: "adb shell su -c \"ls -Zd /data/data/com.BugBazaar\" ; adb shell getenforce",
      out: "u:object_r:app_data_file:s0:c142,c257,c512,c768 /data/data/com.BugBazaar\nEnforcing",
      lab: { label: "Modules 03 and 05 - root detection, and why root is not a licence", route: "#/m3" },
      risk: "SELinux is the reason <code>root</code> does not mean \"read everything\": an app's private " +
            "directory carries MLS categories (<code>c142,c257,...</code>) that a root shell still has to be " +
            "allowed to cross. Kernel bugs are privilege escalation; app bugs are not."
    }
  ],

  zygote: {
    title: "The two processes the diagram never shows",
    text: "Every app on the phone is a fork of <b>zygote</b>. <code>init</code> starts zygote at boot; zygote " +
          "preloads the framework classes and opens both ART and the system's shared memory; when you tap an " +
          "icon, <code>system_server</code> asks zygote to fork, and the child becomes your app with a warm " +
          "runtime. That is why an app starts in milliseconds rather than seconds, and it is why " +
          "<code>frida -f</code> (spawn) can hook <code>onCreate</code> - it stops the app between fork and " +
          "the first instruction and installs the agent there.",
    cmd: "adb shell ps -A -o PID,PPID,USER,NAME | grep -E 'zygote|system_server|BugBazaar'",
    out: "1145     1 root         zygote64\n1147     1 root         zygote\n2014  1145 system       system_server\n10381  1145 u0_a398      com.BugBazaar",
    read: "Read the PPID column: <code>system_server</code> and the app are both children of <code>1145</code>. " +
          "The app is not a service the system starts - it is a copy of a process that was already running."
  },

  binder: {
    title: "Binder: the bus every finding crosses",
    text: "Binder is not a library your app decides to use; it is how the app talks to everything else. Each " +
          "service registers a name with <code>servicemanager</code>; a client asks for that name and gets a " +
          "handle; every call from then on is a Binder transaction carrying a UID the receiver can check. When " +
          "another app starts your exported activity or queries your exported provider, that is a Binder " +
          "transaction into your process - which is exactly why <code>exported</code>, permissions and " +
          "<code>checkCallingPermission()</code> exist, and exactly why a missing check is a finding.",
    cmd: "adb shell ls -l /dev/binder ; adb shell service list | wc -l",
    out: "lrwxrwxrwx 1 root root 20 /dev/binder -> /dev/binderfs/binder\n305",
    read: "<code>305</code> registered services on this handset. Your app can address any of them that its " +
          "permissions allow - and, in the other direction, any app on the phone can address the components " +
          "your manifest publishes."
  },

  sandbox: {
    title: "The sandbox, in one UID and one label",
    text: "Three things keep apps apart, and all three are enforced below the framework: a distinct Linux " +
          "UID per package, a private directory that only that UID can traverse, and an SELinux label that " +
          "carries the app's own categories. The framework's permission checks are the fourth wall, and it is " +
          "the only one an app can get wrong.",
    cmd: "adb shell su -c \"ls -ldZ /data/data/com.BugBazaar\"",
    out: "drwx------ 9 u0_a398 u0_a398 u:object_r:app_data_file:s0:c142,c257,c512,c768 /data/data/com.BugBazaar",
    read: "<code>u0_a398</code> is the UID, <code>700</code> the mode, and the <code>c142,c257,...</code> " +
          "categories are what stop app B from opening a file it guessed the path of. Reading this directory " +
          "without root, or with root and no SELinux allow rule, is a different failure each time."
  },

  root: {
    title: "What root actually changes",
    text: "This course runs on a rooted handset (KernelSU). Root gives you a shell that can read app data, " +
          "push a Frida server, and restart system services. It does <b>not</b> switch SELinux off, unlock " +
          "hardware-backed keystore keys, or bypass an app's own server-side checks. Two consequences keep " +
          "coming up: a lab that only works as root is not evidence that a real attacker can do it, and an app " +
          "that detects root is doing something a normal phone never needs to do - which is why detection " +
          "itself is worth reporting.",
    cmd: "adb shell getenforce ; adb shell which su ; adb shell uname -r",
    out: "Enforcing\n/system/bin/su\n4.14.357-perf-gcd3073fb68f1",
    read: "<code>Enforcing</code> with <code>su</code> present is the normal state of a rooted test device: " +
          "the policy is still on, and the su binary is what asks the policy for a new domain."
  },

  map: [
    { area: "Application layer", look: "auth logic, API calls, business rules, WebView", tools: "Burp, MobSF, jadx", lab: "#/m1" },
    { area: "Framework components", look: "exported activities/services/receivers/providers, permissions, deep links", tools: "aapt2, dumpsys, content query, am start", lab: "#/m2" },
    { area: "Runtime (ART)", look: "method calls, root/emulator/debug checks, hashing, crypto", tools: "Frida, jadx-gui", lab: "#/m3/scripts" },
    { area: "Native libraries", look: "JNI, embedded secrets, custom crypto, packers", tools: "Frida Interceptor, readelf, Ghidra", lab: "#/m3/scripts" },
    { area: "Transport", look: "cleartext, pinning, trust anchors, proxy bypass", tools: "Burp, tcpdump, openssl s_client", lab: "#/m4" },
    { area: "Storage", look: "private files, databases, backups, external storage", tools: "run-as, su, sqlite3", lab: "#/m1" },
    { area: "HAL / kernel", look: "vendor services, privilege escalation, SELinux gaps", tools: "out of scope here - say so", lab: "" }
  ],

  quiz: {
    q: "Which component executes the managed (Java/Kotlin) code of your app?",
    options: ["Hardware Abstraction Layer", "Android Runtime (ART)", "Linux kernel", "PackageManager"],
    answer: 1,
    why: "ART executes DEX. The kernel schedules the threads and the package manager decides what may be " +
         "installed and which permissions are granted, but neither of them runs your bytecode."
  },

  next: [
    { label: "Module 00 - device, ADB, apps", route: "#/m0" },
    { label: "Module 01 - static analysis and the manifest", route: "#/m1" }
  ]
};
