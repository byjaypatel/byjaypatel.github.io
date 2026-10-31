/* Troubleshooting knowledge base.
 *
 * Every entry here is a failure that actually happened while building and running these labs on real
 * hardware (OnePlus 7T / Android 16 / crDroid / KernelSU, and an API 34 emulator), or a predictable
 * first-run failure of the commands the guide gives. Nothing speculative, nothing from a blog.
 *
 * shape: { phase, symptom, cause, fix[], why }
 */
window.FIXES = {
  intro: "Every entry below is a failure that happened while building this workshop, or one that a first run of these exact commands produces. Find the symptom, read the cause, run the fix. If your failure is not here, it is almost always one of three things: the wrong device selected, a stale process holding a port, or a path - check those first.",
  groups: [
    {
      name: "device and adb",
      entries: [
        {
          symptom: "adb devices shows a serial followed by unauthorized",
          cause: "The RSA key on the phone has not been accepted by this laptop.",
          why: "Every clean install of the OS, and every new laptop key, needs one confirmation.",
          fix: ["adb kill-server; adb start-server", "adb devices   # unlock the phone and tap Allow on the prompt"]
        },
        {
          symptom: "adb devices lists emulator-5554 offline, and no emulator is running",
          cause: "Something else is listening on TCP 5555 - in this workshop, usually Burp's proxy listener at *:5555. adb probes that port for emulators and gets a TLS proxy instead.",
          why: "adb's emulator ports start at 5555. A proxy bound to 0.0.0.0:5555 is indistinguishable from an emulator port until the handshake.",
          fix: ["lsof -nP -iTCP:5555 -sTCP:LISTEN", "adb kill-server; adb start-server", "# then bind Burp to 192.168.1.7:5555 instead of *:5555 - see Module 04"]
        },
        {
          symptom: "run-as com.BugBazaar says 'Package ... is not debuggable' or returns nothing",
          cause: "run-as only works for debuggable packages, and on some builds (this handset) seapp_contexts has no fromRunAs rule, so it fails even though the app is debuggable.",
          why: "BugBazaar has android:debuggable=\"true\". If run-as still fails, it is the build, not the app.",
          fix: ["adb shell su -c \"run-as com.BugBazaar ls /data/data/com.BugBazaar\"", "adb exec-out run-as com.BugBazaar cat files/x   # try this first, it works on most emulators"]
        },
        {
          symptom: "two devices listed and every command hits the wrong one",
          cause: "An emulator and the handset are both connected, and adb picks the first.",
          why: "Always pin the serial in a lab with more than one target.",
          fix: ["adb devices -l", "export ANDROID_SERIAL=ebb1e62d   # your serial", "adb shell getprop ro.product.model"]
        }
      ]
    },
    {
      name: "frida",
      entries: [
        {
          symptom: "Failed to spawn: unable to find process with name 'com.BugBazaar'",
          cause: "frida -f takes the package name, but frida -n takes the process name, and they are not always the same string.",
          why: "Spawn by package id; attach by process name as it appears in ps.",
          fix: ["adb shell ps -A | grep -i bugbazaar", "frida -H 127.0.0.1:27042 -f com.BugBazaar -l script.js"]
        },
        {
          symptom: "unable to communicate with remote frida-server / Failed to connect",
          cause: "The server is not running, the port forward is gone after a reconnect, or client and server versions differ.",
          why: "frida is strict about versions: a 16.x client will not talk to a 17.x server.",
          fix: ["adb shell \"ps -A | grep frida\"", "adb forward tcp:27042 tcp:27042", "frida --version; adb shell /data/local/tmp/frida-server --version"]
        },
        {
          symptom: "Script prints 'attached' but the app still detects Frida",
          cause: "The class was not loaded when you hooked it, or an earlier check short-circuits before yours runs.",
          why: "Java classes load lazily; and BugBazaar's someMethod() returns on isEmulator()/AdbEnabled1() before checkfrida() is ever called.",
          fix: ["# poll for the class instead of hooking once:", "Java.perform(function(){ var T=null; var iv=setInterval(function(){ try{T=Java.use('com.bug.hook.checkdetect'); clearInterval(iv);}catch(e){} },250); });", "# and read the caller - see #/m1/jadx-to-frida"]
        },
        {
          symptom: "Java hooks kill the session on the handset, but the same script works on the emulator",
          cause: "A limitation of that ROM/ART build on Android 16 - it reproduces against system apps too, so it is not the target app.",
          why: "Never report a failure of your tooling as anti-tampering in the app.",
          fix: ["# use native hooks (libc open, read) which work on both", "frida-scripts/offline/f6_native_open_trace.js", "# or record the Java-dependent runs on an API 34 emulator"]
        },
        {
          symptom: "frida-ps shows no such device / connection refused on 127.0.0.1:27042",
          cause: "frida-server was started as a different user, or the forward belongs to another device serial.",
          why: "Forwards are per-device and are lost on unplug.",
          fix: ["adb shell su -c \"/data/local/tmp/frida-server -l 0.0.0.0:27042\" &", "adb forward --list"]
        }
      ]
    },
    {
      name: "components, content and storage",
      entries: [
        {
          symptom: "content query returns nothing (empty cursor) for a provider you know is exported",
          cause: "Three candidates in order: the table is empty on a fresh install, the authority/path is wrong, or you are querying another user profile.",
          why: "An empty cursor proves nothing about access control - query a row you know exists, or seed one in the app.",
          fix: ["adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses --user 0", "adb shell dumpsys package com.BugBazaar | grep -i provider   # the registered authorities"]
        },
        {
          symptom: "content query: Permission Denial / SecurityException",
          cause: "The component is genuinely protected - the permission exists and you do not hold it.",
          why: "Exported is not the same as unprotected. This is the control working, not a failed test.",
          fix: ["# record it and move on - do NOT report it as a finding", "adb shell dumpsys package com.BugBazaar | grep -A3 'permission'"]
        },
        {
          symptom: "am start with a deep link opens the app but lands on the wrong screen",
          cause: "The path segment was dropped, or the intent filter needs a host you did not include.",
          why: "scheme, host and path sit on separate <data> lines; three entry points collapse into one if you drop the path.",
          fix: ["adb shell am start -W -a android.intent.action.VIEW -d 'bugbazaar://externalAuthentication' com.BugBazaar", "adb shell am start -W -a android.intent.action.VIEW -d 'bb://bugbazaar/web?url=file:///android_asset/index.html' com.BugBazaar", "# list every filter and its path: aapt2 dump xmltree --file AndroidManifest.xml app.apk | grep -A6 intent-filter"]
        },
        {
          symptom: "writing shared_prefs/SwitchStatePrefs.xml has no effect",
          cause: "The file is owned by the wrong uid, has the wrong mode, or carries the wrong SELinux label, so the app cannot read it.",
          why: "Copying a file into another app's data dir needs uid, mode and context - all three.",
          fix: ["adb push switch.xml /data/local/tmp/switch.xml", "adb shell su -c \"cp /data/local/tmp/switch.xml /data/data/com.BugBazaar/shared_prefs/SwitchStatePrefs.xml\"", "adb shell su -c \"chown \\$(stat -c %u:%g /data/data/com.BugBazaar) /data/data/com.BugBazaar/shared_prefs/SwitchStatePrefs.xml\"", "adb shell su -c \"chmod 660 /data/data/com.BugBazaar/shared_prefs/SwitchStatePrefs.xml; restorecon -v /data/data/com.BugBazaar/shared_prefs/SwitchStatePrefs.xml\""]
        }
      ]
    },
    {
      name: "traffic and certificates",
      entries: [
        {
          symptom: "the proxy shows nothing at all - no CONNECT, no plain requests",
          cause: "The device is not routing to the proxy: Wi-Fi proxy not set for the current network, proxy bound to the wrong interface, or the app uses raw sockets / QUIC.",
          why: "Order of diagnosis: routing first, then trust anchor, then pinning. Proving routing takes ten seconds with plain HTTP.",
          fix: ["adb shell settings get global http_proxy", "adb shell ping -c1 192.168.1.7   # does the device reach your laptop at all?", "lsof -nP -iTCP:5555 -sTCP:LISTEN   # is the listener actually up, on the right interface?", "# then open any app in the lab and watch Burp's HTTP history for the first CONNECT"]
        },
        {
          symptom: "CONNECT appears, then the TLS handshake dies on every HTTPS request",
          cause: "The app does not trust your CA - wrong store, DER instead of PEM, or a CA file shadowed by another certificate with the same subject hash.",
          why: "The Android system store reads PEM only, and a silent ignore looks exactly like pinning.",
          fix: ["# convert and name it by subject hash", "openssl x509 -inform DER -in burp.der -out 9a5ba575.0", "adb shell su -c \"cp /data/local/tmp/9a5ba575.0 /system/etc/security/cacerts/\"", "adb shell su -c \"chmod 644 /system/etc/security/cacerts/9a5ba575.0\""]
        },
        {
          symptom: "two CA files with the same name (9a5ba575.0) and one silently wins",
          cause: "The filename is the subject hash. Two different CAs with the same subject DN collide on the same filename.",
          why: "Compare serials, not subject lines - the subject is identical by construction.",
          fix: ["openssl x509 -in 9a5ba575.0 -noout -serial -subject", "openssl x509 -in /path/to/live.pem -noout -serial   # must match"]
        },
        {
          symptom: "user-installed CA is ignored by the app",
          cause: "targetSdk >= 24 means user CAs are not trusted unless the app's network security config says so.",
          why: "BugBazaar targets SDK 32, so this is the first thing to check - not pinning.",
          fix: ["aapt2 dump badging BugBazaar_v1.2.1.apk | grep -i sdkVersion", "jadx -d out BugBazaar_v1.2.1.apk --show-bad-code   # then read res/xml/network_security_config.xml"]
        }
      ]
    },
    {
      name: "build, sign, install",
      entries: [
        {
          symptom: "apktool b fails, or the rebuilt APK crashes on launch",
          cause: "Decoded with -r (resources not decoded) so res/ is missing, or the app verifies its own signature.",
          why: "A crash after repack is often a signature check, not a broken build - reproduce on the original first.",
          fix: ["apktool d -f app.apk -o app_dir   # without -r when you need resources", "apktool b app_dir -o app_patched.apk"]
        },
        {
          symptom: "INSTALL_FAILED_UPDATE_INCOMPATIBLE or signature mismatch",
          cause: "An older copy signed with a different key is still installed.",
          why: "Android refuses to replace a package with a different signer.",
          fix: ["adb uninstall com.hpandro.androidsecurity", "adb install -r app_patched_signed.apk"]
        },
        {
          symptom: "apksigner verify says DOES NOT VERIFY",
          cause: "Built but not signed, or signed with v1 only while the device requires v2 for the target SDK.",
          why: "apktool build output is unsigned; apksigner adds v1..v3.",
          fix: ["keytool -genkeypair -keystore student.keystore -alias student -keyalg RSA -keysize 2048 -validity 10000 -storepass test123 -keypass test123 -dname \"CN=Student-Lab\"", "apksigner sign --ks student.keystore --ks-pass pass:test123 --key-pass pass:test123 --out signed.apk app_patched.apk", "apksigner verify --print-certs signed.apk"]
        },
        {
          symptom: "keytool: alias <student> already exists",
          cause: "The keystore was created on an earlier run of the same lab.",
          why: "Keytool exits non-zero and stops the rest of a chained command.",
          fix: ["[ -f student.keystore ] || keytool -genkeypair -keystore student.keystore -alias student ..."]
        }
      ]
    },
    {
      name: "tools and environment",
      entries: [
        {
          symptom: "aapt2: command not found (or aapt)",
          cause: "aapt2 lives in the build-tools directory, which is not on PATH by default.",
          why: "The SDK ships many versions; pick the newest build-tools you have.",
          fix: ["ls $ANDROID_HOME/build-tools", "export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0", "aapt2 dump badging app.apk | head"]
        },
        {
          symptom: "jadx-gui will not start - no display, or it opens nothing over SSH",
          cause: "jadx-gui needs a display; on a headless box there is none.",
          why: "The CLI does the same decompilation and writes to disk.",
          fix: ["jadx -d out app.apk", "jadx --no-res -d out app.apk   # skip resources when you only want smali/java"]
        },
        {
          symptom: "emulator: AVD is already running, or the lock cannot be acquired",
          cause: "A previous run was killed and left *.lock files in the AVD directory.",
          why: "The emulator refuses to start over a stale lock.",
          fix: ["adb -s emulator-5554 emu kill", "rm -rf ~/.android/avd/<name>.avd/*.lock", "emulator -avd <name> -no-window -no-snapshot-save -gpu swiftshader_indirect &"]
        },
        {
          symptom: "the guide says Run but the output is a recording - my device shows different text",
          cause: "Expected. The terminal in the guide is a recording, not a live shell.",
          why: "Device names, timings and PIDs differ by design. Paths, versions and status lines should not.",
          fix: ["# paste your own output into 'compare with the recording' on the same step", "# it diffs line by line and tells you what actually differs"]
        }
      ]
    }
  ]
};
