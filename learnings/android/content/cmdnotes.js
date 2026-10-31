/* Goal + per-command explanation for every step. Key: "<module>/<step id>".
   Every `part` is a verbatim slice of that step's cmd, so the table lines up with the command shown. */
window.CMDNOTES = {
 "m0/shell": {
  "goal": "Set the shell variables and confirm all seven Android tools resolve on your PATH.",
  "notes": [
   {
    "part": "cd ~/Downloads/AndroidSecWorkshop",
    "does": "Moves into the workshop folder so the relative lab-apps/ APK paths below resolve; every later step assumes this is the working directory."
   },
   {
    "part": "export APK_H=lab-apps/hpAndro_1.3.apk",
    "does": "Stores the hpAndro APK path in APK_H; the variable keeps later commands short and survives paths with spaces."
   },
   {
    "part": "export APK_B=lab-apps/BugBazaar_v1.2.1.apk",
    "does": "Stores the BugBazaar APK path in APK_B. The filename says 1.2.1, but its manifest declares versionName 1.0."
   },
   {
    "part": "export ANDROID_HOME=$HOME/Library/Android/sdk",
    "does": "Points at the macOS SDK root using $HOME, so it works for any username. Use the Linux or Windows SDK path on those hosts."
   },
   {
    "part": "export BUILD_TOOLS=$ANDROID_HOME/build-tools/34.0.0",
    "does": "Names the 34.0.0 build-tools directory that holds aapt2, apksigner and zipalign; these are not on PATH after an SDK install."
   },
   {
    "part": "export PATH=\"$BUILD_TOOLS:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH\"",
    "does": "Prepends build-tools, platform-tools and emulator to PATH so the bare tool names resolve; $PATH stays last so nothing existing is lost."
   },
   {
    "part": "command -v adb aapt2 apksigner zipalign apktool jadx frida",
    "does": "Prints the resolved path of each name and nothing for a missing one; a blank line in the output is the tool you must install."
   }
  ]
 },
 "m0/devices": {
  "goal": "Read the serial and connection state of each attached device before running anything else.",
  "notes": [
   {
    "part": "adb devices -l",
    "does": "Lists devices; -l adds product, model, device and transport_id columns. Only a line ending in device is usable."
   }
  ]
 },
 "m0/avd": {
  "goal": "Create an API 34 emulator with a Google APIs image and confirm it finished booting.",
  "notes": [
   {
    "part": "sdkmanager --install \"platform-tools\" \"build-tools;34.0.0\"",
    "does": "Installs platform-tools, build-tools 34.0.0, the android-34 platform and the arm64 system image; the semicolon is sdkmanager's package-path syntax. The continued line carries the last two packages."
   },
   {
    "part": "avdmanager create avd -n lab34 -k \"system-images;android-34;google_apis;arm64-v8a\" -d pixe...",
    "does": "Creates an AVD: -n names it lab34, -k selects the installed system image, -d gives it a pixel_5 hardware profile."
   },
   {
    "part": "$ANDROID_HOME/emulator/emulator -avd lab34 -no-snapshot-save &",
    "does": "Boots the AVD by name; -no-snapshot-save discards emulator state on exit, and the trailing & leaves your shell usable."
   },
   {
    "part": "adb wait-for-device",
    "does": "Blocks until adbd reports a device, so the property read below does not run before the boot begins."
   },
   {
    "part": "adb shell getprop sys.boot_completed",
    "does": "Reads the boot-complete property on the device; 1 means the framework is up, 0 or empty means wait and repeat."
   }
  ]
 },
 "m0/props": {
  "goal": "Record the target's Android release, API level, CPU ABI and build tag.",
  "notes": [
   {
    "part": "adb -s <serial> shell getprop ro.build.version.release",
    "does": "Prints the Android release string, 14 here. -s <serial> targets one device when several are attached; shell runs the read on the device."
   },
   {
    "part": "adb -s <serial> shell getprop ro.build.version.sdk",
    "does": "Prints the API level. It decides which platform behaviors apply and which frida-server build you need."
   },
   {
    "part": "adb -s <serial> shell getprop ro.product.cpu.abi",
    "does": "Prints the device ABI, so you push the arm64 server and spot an x86 image that cannot install an arm64 APK."
   },
   {
    "part": "adb -s <serial> shell getprop ro.build.tags",
    "does": "Prints the build tag; dev-keys marks a userdebug image, which is usually the one that allows adb root."
   }
  ]
 },
 "m0/install": {
  "goal": "Install both lab apps and record a hash plus the declared package identity of each APK.",
  "notes": [
   {
    "part": "adb install -r \"$APK_H\"",
    "does": "Installs hpAndro; -r reinstalls over an existing copy and keeps its data, where a plain install would fail with ALREADY_EXISTS."
   },
   {
    "part": "adb install -r \"$APK_B\"",
    "does": "Same for BugBazaar. Runtime permissions are not pre-granted here, so accept the dialogs on first launch."
   },
   {
    "part": "shasum -a 256 \"$APK_H\" \"$APK_B\"",
    "does": "Hashes both files with SHA-256; -a 256 picks the algorithm. Paste both digests into your report to pin the build."
   },
   {
    "part": "aapt2 dump badging \"$APK_H\" | head -1",
    "does": "Reads only the package line: name, versionCode and versionName. head -1 drops the rest of the badging dump."
   },
   {
    "part": "aapt2 dump badging \"$APK_B\" | head -1",
    "does": "Same for BugBazaar, which reports versionName 1.0 despite the 1.2.1 filename; quote this line, not the filename."
   }
  ]
 },
 "m0/root": {
  "goal": "Determine whether adbd or su can give you uid 0 on each device.",
  "notes": [
   {
    "part": "adb -s <serial> root                 # emulator with Google APIs image",
    "does": "Asks adbd to restart as root; works on a google_apis image and is refused on production builds. The comment marks the emulator case."
   },
   {
    "part": "adb -s <serial> shell whoami",
    "does": "Prints the account name the shell runs as; root here confirms the adbd restart took effect."
   },
   {
    "part": "adb -s <serial> shell su -c id",
    "does": "Runs id through su, the physical-device route; uid=0(root) means root, permission denied means you do not have it."
   }
  ]
 },
 "m1/decode": {
  "goal": "Produce smali, resources and readable Java for both APKs so later steps can be grepped.",
  "notes": [
   {
    "part": "apktool d -f -o hp \"$APK_H\"",
    "does": "Decodes hpAndro: -d decodes, -f overwrites an existing hp directory, -o names it. Yields smali/, res/ and the manifest."
   },
   {
    "part": "apktool d -f -o bb \"$APK_B\"",
    "does": "Same decode into bb/, so both trees sit side by side and later greps can name hp/ or bb/ explicitly."
   },
   {
    "part": "jadx -d jx-hp --no-res \"$APK_H\"",
    "does": "Decompiles to Java: -d sets the output directory, --no-res skips resources so jadx finishes faster. Sources land in sources/."
   },
   {
    "part": "jadx -d jx-bb --no-res \"$APK_B\"",
    "does": "Same for BugBazaar into jx-bb/. Use this tree for logic and the apktool tree for exact string constants and resources."
   }
  ]
 },
 "m1/manifest-facts": {
  "goal": "Answer the standard manifest questions: identity, SDK levels, component counts, permissions and risky flags.",
  "notes": [
   {
    "part": "aapt2 dump badging \"$APK_H\" | head -6",
    "does": "Dumps package identity, min and target SDK and the first permissions; head -6 keeps the start of the sheet readable."
   },
   {
    "part": "aapt2 dump permissions \"$APK_B\"",
    "does": "Lists the declared uses-permission entries only, without the rest of the badging output, so you can compare them to the features."
   },
   {
    "part": "for t in activity service receiver provider; do",
    "does": "Loops over the four component types; echo -n labels each line and grep -c on the xmltree dump counts matching opening tags."
   },
   {
    "part": "grep -nE \"allowBackup|usesCleartextTraffic|networkSecurityConfig|debuggable\"",
    "does": "Searches both decoded manifests for four risky application attributes; -n prints line numbers, -E enables the alternation."
   }
  ]
 },
 "m1/exported": {
  "goal": "Extract every exported component with its name, permission and authority into one list.",
  "notes": [
   {
    "part": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\"",
    "does": "Dumps the binary manifest as a tree; -B6 prints six lines before each exported=true hit so its parent element and attributes appear, and the second grep keeps only identifying lines."
   }
  ]
 },
 "m1/resolve": {
  "goal": "Resolve the resource id used as a permission and decide whether it protects anything.",
  "notes": [
   {
    "part": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -A4 UserProfileProvider",
    "does": "-A4 prints four lines after the match, enough to see name, readPermission, enabled, exported and authorities in one block."
   },
   {
    "part": "aapt2 dump resources \"$APK_B\" | grep -A2 \"0x7f13001c\"",
    "does": "Looks the id up in the resource table; -A2 shows the resource type and the string value stored against it."
   }
  ]
 },
 "m1/secrets": {
  "goal": "Locate hardcoded secrets in native code, dex strings and resources, with the code that uses each.",
  "notes": [
   {
    "part": "grep -n \"const-string\" hp/smali/hpandro/android/security/ui/activity/task/binary/Hardcoded...",
    "does": "Shows the activity's own hint constants in smali; -n gives line numbers and head -3 keeps the three that name the native library."
   },
   {
    "part": "strings hp/lib/arm64-v8a/libhardcodedsecret.so | grep -iE \"hpandro{|flag\"",
    "does": "Extracts printable strings from the arm64 shared object, ignoring ELF structure, then filters for flag-shaped text."
   },
   {
    "part": "grep -rEn \"AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}\" jx-hp/sources jx-bb/sources | head",
    "does": "Recursive, extended-regex sweep of both Java trees for AWS and Google API key shapes; head caps the candidate list."
   },
   {
    "part": "grep -n \"string name\" hp/res/values/strings.xml | grep -iE \"key|secret|pass\" | head",
    "does": "Finds resource entries whose names suggest credentials; the second grep is case-insensitive and head limits the output."
   }
  ]
 },
 "m3/server": {
  "goal": "A running frida-server whose version equals your local frida, reachable on 27042.",
  "notes": [
   {
    "part": "frida --version                                   # your client - the server must match it",
    "does": "Prints the client version. This is the number the whole step keys on; a server from a different release fails as a generic connection error."
   },
   {
    "part": "FRIDA_VER=$(frida --version)",
    "does": "Captures it in a variable so the download URL cannot be typed wrong - the page deliberately does not hardcode a version."
   },
   {
    "part": "ARCH=android-arm64                                # x86_64 for an emulator",
    "does": "The release archive is per-architecture: arm64 for a handset, x86_64 for most emulator images."
   },
   {
    "part": "curl -LO \"https://github.com/frida/frida/releases/download/$FRIDA_VER/frida-server-$FRIDA_VER-$ARCH.xz\"",
    "does": "-L follows the redirect to the asset host, -O keeps the release filename, so unxz finds it without a rename."
   },
   {
    "part": "unxz -f \"frida-server-$FRIDA_VER-$ARCH.xz\"",
    "does": "-f overwrites a leftover from an earlier attempt instead of stopping to ask."
   },
   {
    "part": "adb push \"frida-server-$FRIDA_VER-$ARCH\" /data/local/tmp/frida-server",
    "does": "Pushes to /data/local/tmp - executable, outside the app sandbox, and wiped only by a factory reset."
   },
   {
    "part": "adb shell chmod 755 /data/local/tmp/frida-server",
    "does": "Push does not preserve the executable bit; without this, running it fails with \"permission denied\"."
   },
   {
    "part": "# handset: adb root fails, use su.  emulator: adb root works and is simpler",
    "does": "Names the fork in the road before it happens, because adb root on a retail build answers \"adbd cannot run as root in production builds\" and students read that as broken adb."
   },
   {
    "part": "adb shell su -c \"nohup /data/local/tmp/frida-server >/dev/null 2>&1 &\"",
    "does": "Starts the server as root, detached, with output discarded so the adb shell returns instead of hanging on a foreground process."
   },
   {
    "part": "adb shell ps -A | grep frida-server",
    "does": "Proves it is alive. A server that started and immediately died looks identical to one that never started until you check here."
   },
   {
    "part": "# prove the two ends agree",
    "does": "The version pair is only proven by a client actually talking to the server."
   },
   {
    "part": "adb forward tcp:27042 tcp:27042",
    "does": "Maps the device port to the laptop, which is what lets the CLI use 127.0.0.1 and avoids picking the wrong device when two are attached."
   },
   {
    "part": "frida-ps -H 127.0.0.1:27042 | head -5",
    "does": "Asks the server for its process list. A list of PIDs is the proof; an empty list or a timeout means version or privilege, not the target app."
   }
  ]
 },
 "m3/baseline": {
  "goal": "Record the unmodified root-detection verdict so a bypass has a before-picture to compare against.",
  "notes": [
   {
    "part": "adb shell \"echo x > /data/local/su; chmod 755 /data/local/su\"",
    "does": "Plants a harmless fake su at a path detectors check; without the file the check has nothing to find and the test proves nothing."
   },
   {
    "part": "adb root",
    "does": "Restarts adbd as root, so the commands that follow run as uid 0 rather than the shell user."
   },
   {
    "part": "adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTas...",
    "does": "Starts the challenge screen; -n names package and activity. The root shell may open it because this activity is not exported."
   },
   {
    "part": "adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text=...",
    "does": "Dumps the view hierarchy, then grep -o prints each text attribute on its own line, so the screen is readable without a screenshot."
   }
  ]
 },
 "m3/hook": {
  "goal": "Hook the detection methods, watch them return false, and see the reported path disappear.",
  "notes": [
   {
    "part": "frida -U -n \"Android Security Testing\" -l frida-scripts/offline/h1_root_detection_bypass.j...",
    "does": "Attaches to the running app: -U selects the USB device, -n matches the process by name, -l loads the script. Open the screen first."
   }
  ]
 },
 "m3/inventory": {
  "goal": "Enumerate every detection method in the root-detection helper class before choosing what to hook.",
  "notes": [
   {
    "part": "grep -E \"^\\.method public final\"",
    "does": "Lists method declarations; -E enables the regex and the escaped caret anchors at line start, so call sites do not match. Quote the path to keep $Companion literal."
   }
  ]
 },
 "m3/digest": {
  "goal": "Know exactly what the app hashes, without reading its hashing code.",
  "notes": [
   {
    "part": "# the script ships with the course - do not retype it",
    "does": "Points at the shipped file: a hand-typed script is where transcription errors come from, and the file is the same one the guide prints in full on the scripts page."
   },
   {
    "part": "frida -H 127.0.0.1:27042 -f hpandro.android.security -l frida-scripts/offline/f4_observe_hashes.js",
    "does": "-H uses the forwarded port instead of picking a device, -f spawns so the hooks exist before the app draws its first frame, -l loads the agent."
   },
   {
    "part": "# then open the MD5 task and press CHECK MD5 HASH",
    "does": "The instrumentation is passive: nothing is printed until the app actually hashes something."
   },
   {
    "part": "adb shell am start -n hpandro.android.security/.ui.activity.task.hash.MD5HashActivity",
    "does": "Opens the challenge screen directly, which is faster than navigating 18 categories and works on an emulator with no launcher interaction."
   }
  ]
 },
 "m2/leak": {
  "goal": "Read another app's stored addresses through the exported provider as the shell user.",
  "notes": [
   {
    "part": "adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses",
    "does": "Runs a provider query as uid 2000, a foreign app; --uri names the authority and table. Rows returned mean no guard at all."
   }
  ]
 },
 "m2/trap": {
  "goal": "Compare how a provider guarded by an undefined permission refuses the shell on two Android versions.",
  "notes": [
   {
    "part": "adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile",
    "does": "Queries the second provider with the same unprivileged identity; an empty result means no rows, not that permission was granted."
   },
   {
    "part": "adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile 2>&1 | head ...",
    "does": "Reruns it with 2>&1 merging stderr into stdout, so the SecurityException text is captured; head -3 keeps the message short."
   }
  ]
 },
 "m2/deeplink": {
  "goal": "Fire the app's custom scheme from the shell and capture what the exported activity does with it.",
  "notes": [
   {
    "part": "adb shell am start -W -a android.intent.action.VIEW -d \"bugbazaar://externalAuthentication...",
    "does": "-W waits for the launch result, -a sets the VIEW action, -d supplies the URI: the same intent a browser can send."
   },
   {
    "part": "adb logcat -d | grep -A6 \"FATAL EXCEPTION\"",
    "does": "-d dumps the existing log buffer instead of following it, so the command returns; grep -A6 prints six lines after the crash header."
   }
  ]
 },
 "m2/launch": {
  "goal": "See the exported=false refusal with your own eyes, then open the screen as root.",
  "notes": [
   {
    "part": "# as the shell user: refused, and the refusal is the finding",
    "does": "The unprivileged attempt is the deliverable - the exception text is the evidence that the attribute is enforced."
   },
   {
    "part": "adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity",
    "does": "Uses -n (explicit component) rather than an intent filter: an explicit start skips resolution and goes straight to the exported check."
   },
   {
    "part": "adb logcat -d | grep -A3 \"SecurityException\" | tail -6",
    "does": "-d dumps the buffer without clearing it, and the tail keeps the exception near the end where the uid and package appear."
   },
   {
    "part": "# as root: opens, because root is exempt from the exported check",
    "does": "The same command through a different uid, which is the whole difference."
   },
   {
    "part": "adb shell su -c \"am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity\"",
    "does": "Runs am as uid 0. On an emulator with a userdebug image, adb root once and the plain command is equivalent - never teach remount when su answers."
   }
  ]
 },
 "m4/listener": {
  "goal": "Confirm the Burp proxy listener is bound to all interfaces before touching the device.",
  "notes": [
   {
    "part": "lsof -nP -iTCP:5555 -sTCP:LISTEN",
    "does": "Lists processes holding a listening TCP socket on port 5555; -nP keeps ports and addresses numeric, -iTCP filters by protocol, -sTCP:LISTEN shows only listeners."
   }
  ]
 },
 "m4/setproxy": {
  "goal": "Route device traffic to the proxy using the emulator flag, the Wi-Fi setting, or the global setting.",
  "notes": [
   {
    "part": "HOST=$(ipconfig getifaddr en0); echo \"proxy address: $HOST:5555\"",
    "does": "Prints this Mac's Wi-Fi address, because the device can only reach the proxy by an IP it is configured with, and DHCP reassigns it."
   },
   {
    "part": "lsof -nP -iTCP:5555 -sTCP:LISTEN",
    "does": "Shows who holds the port and on which interface; *:5555 is reachable from the phone, 127.0.0.1:5555 is not."
   },
   {
    "part": "emulator -avd lab34 -http-proxy http://192.168.1.5:5555",
    "does": "Boots the lab34 virtual device with its HTTP traffic sent to that proxy; the flag applies at start only, never to an already running emulator."
   },
   {
    "part": "adb shell settings put global http_proxy 192.168.1.5:5555",
    "does": "Writes the global proxy value host:port on the device; many images ignore it, and a per-network Wi-Fi proxy silently overrides it."
   },
   {
    "part": "adb shell settings get global http_proxy",
    "does": "Reads the stored global proxy back; this proves the value was written, not that traffic uses it."
   }
  ]
 },
 "m4/verify": {
  "goal": "Prove with two independent checks that device traffic really passes through the proxy.",
  "notes": [
   {
    "part": "HOST=$(ipconfig getifaddr en0); echo \"$HOST\"",
    "does": "Prints the host address to compare against the one the device reports, which is where an IP change shows up as 'no traffic'."
   },
   {
    "part": "adb shell dumpsys wifi | grep -i -A1 \"Proxy settings\"",
    "does": "Dumps Wi-Fi state and prints the proxy line plus one line after it; -A1 surfaces the actual host:port, which is what counts, not what you set."
   },
   {
    "part": "curl -s -m 10 -x http://192.168.1.5:5555 -o /dev/null -w ...",
    "does": "Fetches http://example.com/ through the proxy; -x names the proxy, -m 10 caps the wait, -s plus -o discards the body, -w prints only the status."
   },
   {
    "part": "echo | openssl s_client -proxy 192.168.1.5:5555 -connect example.com:443 \\...",
    "does": "Handshakes TLS to example.com through the proxy and prints only the issuer; -proxy forces that path, -noout -issuer trims to one field."
   }
  ]
 },
 "m4/forward": {
  "goal": "Map a host port to a device port so frida reaches one named device explicitly.",
  "notes": [
   {
    "part": "adb -s emulator-5554 forward tcp:27042 tcp:27042",
    "does": "Maps host port 27042 to the same port on emulator-5554; -s names the device, which removes the ambiguity of -U with two devices attached."
   },
   {
    "part": "adb forward --list",
    "does": "Lists active forwards as serial, local spec, remote spec; the entry surviving here means the mapping lives in the adb server, not your shell."
   },
   {
    "part": "frida-ps -H 127.0.0.1:27042 | head -4",
    "does": "Asks the device frida-server for its process list over the forwarded port; -H points at host and port instead of USB, head trims output."
   },
   {
    "part": "adb forward --remove tcp:27042",
    "does": "Deletes the forward and frees the host port; a leftover mapping makes the next session connect to a device that is no longer there."
   }
  ]
 },
 "m4/capture": {
  "goal": "A pcap of the proxy port that tells you whether the client accepted or rejected Burp's certificate.",
  "notes": [
   {
    "part": "# is it there, and is it usable? both checks, because PATH lies",
    "does": "Two checks, because presence and executability fail separately on Android."
   },
   {
    "part": "adb shell su -c \"ls -l /system/bin/tcpdump\"",
    "does": "Looks for the binary at its absolute path. It exists on this ROM, and calling it by bare name still fails - the adb shell PATH does not include /system/bin for a root shell in this configuration."
   },
   {
    "part": "adb shell su -c \"timeout 5 /system/bin/tcpdump -i any -c 2 -w /dev/null\"",
    "does": "Runs it for two packets to /dev/null, under a 5-second timeout so the step cannot hang on an idle phone. Proves execute permission and SELinux allow the domain, and leaves no file behind."
   },
   {
    "part": "# capture only what goes to Burp",
    "does": "The filter is the whole trick: an unfiltered capture on a busy phone is hundreds of megabytes and unreadable."
   },
   {
    "part": "adb shell su -c \"/system/bin/tcpdump -i any -s 0 -w /data/local/tmp/cap.pcap 'tcp port 5555'\"",
    "does": "-i any sees every interface including the one the proxy uses; -s 0 keeps full packets so the TLS records are intact; -w writes pcap for Wireshark."
   },
   {
    "part": "# ... generate traffic: open the app, tap through the flow ...",
    "does": "The capture records nothing until something sends - this line is the reminder, not a command."
   },
   {
    "part": "adb shell su -c \"pkill tcpdump\"",
    "does": "Stops the capture by name. Forgetting it leaves a root process writing to flash until the buffer fills."
   },
   {
    "part": "adb pull /data/local/tmp/cap.pcap cap.pcap",
    "does": "Brings it to the laptop, where tcpdump and Wireshark actually are."
   },
   {
    "part": "# read the shape, not the bytes",
    "does": "The reading discipline: packet sizes and the order of events answer the question; the payload is encrypted."
   },
   {
    "part": "tcpdump -nr cap.pcap -q | head -20",
    "does": "-n keeps addresses numeric (no DNS lookups mid-class), -r reads a file, -q prints one line per packet. A 30-byte outbound packet right after the certificate is the rejection signature."
   },
   {
    "part": "tcpdump -nr cap.pcap -A 2>/dev/null | strings | grep -oE 'CONNECT [^ ]+' | sort -u",
    "does": "-A prints payload as text, strings drops the binary, and the grep pulls the CONNECT targets - readable even though the bytes after it are TLS."
   }
  ]
 },
 "m4/trustconfig": {
  "goal": "Decide from the manifest and the config whether this app pins or only narrows trust anchors.",
  "notes": [
   {
    "part": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_H\" | grep -c \"publicKeyPinning...",
    "does": "Prints the binary manifest as XML and counts activities matching the pinning name pattern; -c returns only the count, so 2 means those screens exist."
   },
   {
    "part": "cat hp/res/xml/network_security_config.xml",
    "does": "Shows the config in full: one domain block trusting system plus user CAs, one trusting system only, and that split decides which host accepts your CA."
   },
   {
    "part": "grep -rn 'pin-set|sha256/' hp/res hp/smali/hpandro | head",
    "does": "Searches decoded resources and smali recursively for pin declarations; -r recurses, -n prints line numbers, empty output is the finding."
   }
  ]
 },
 "m5/find": {
  "goal": "Locate the smali method that builds the su-path string and note its return type.",
  "notes": [
   {
    "part": "grep -n -A8 \"getSUBinaries\" 'hp/smali/hpandro/android/security/ui/...",
    "does": "Prints the matching line number plus eight lines of body from the decoded smali; -A8 shows the method, -n gives the line, head caps output."
   }
  ]
 },
 "m5/patch": {
  "goal": "Replace the method body with an empty string that still satisfies its declared return type.",
  "notes": [
   {
    "part": "python3 - <<'EOF'",
    "does": "Runs the heredoc as stdin; the script rewrites every getSUBinaries body to .locals 1, an empty string in v0 and return-object v0, keeping the String signature intact."
   }
  ]
 },
 "m5/build": {
  "goal": "Rebuild the decoded tree into an unsigned APK and confirm the smali assembled.",
  "notes": [
   {
    "part": "apktool b hp -o hpandro-unsigned.apk && ls -lh hpandro-unsigned.apk",
    "does": "Rebuilds the hp directory into an unsigned APK at the -o path, then lists it; -lh gives human-readable size, which is how a broken build shows."
   }
  ]
 },
 "m5/sign": {
  "goal": "A keystore you own and an APK carrying your certificate, in the order that installs.",
  "notes": [
   {
    "part": "# one keystore per student, created once - the guard makes the command re-runnable",
    "does": "States the idempotence up front, because keytool aborts with \"alias already exists\" and that error stops a class."
   },
   {
    "part": "[ -f student.keystore ] || keytool -genkeypair -v \\",
    "does": "Creates the key only when the file is missing, so a second run is a no-op instead of an error."
   },
   {
    "part": "-keyalg RSA -keysize 2048 -validity 10000 \\",
    "does": "RSA 2048 is what apksigner expects by default; -validity 10000 is about 27 years, long past any classroom."
   },
   {
    "part": "-storepass student123 -keypass student123 -dname \"CN=Student-Lab\"",
    "does": "-dname removes the interactive prompt and puts your identity in the certificate, which is how apksigner verify can prove the APK is yours."
   },
   {
    "part": "keytool -list -keystore student.keystore -storepass student123 | tail -2",
    "does": "Prints the alias and its fingerprint - the reference to compare against apksigner's output later."
   },
   {
    "part": "# then align, sign, verify - this order, every time",
    "does": "The order is the rule: signing after zipalign, verifying last."
   },
   {
    "part": "zipalign -p -f 4 hpandro-unsigned.apk hpandro-aligned.apk",
    "does": "-p page-aligns uncompressed .so files, -f overwrites the output, 4 is the 4-byte boundary. This must run before apksigner."
   },
   {
    "part": "apksigner sign --ks student.keystore --ks-pass pass:student123 \\",
    "does": "Signs with the key just created; --ks-pass pass: passes the password non-interactively so the command is scriptable."
   },
   {
    "part": "--key-pass pass:student123 --out hpandro-patched.apk hpandro-aligned.apk",
    "does": "Names the output and the input; without --out apksigner would overwrite the aligned file in place."
   },
   {
    "part": "apksigner verify --print-certs hpandro-patched.apk",
    "does": "Reads the signature back out of the finished APK and prints the certificate DN - the only proof that the file is signed with your key and not the publisher's."
   }
  ]
 },
 "m5/install": {
  "goal": "Reproduce the signature-mismatch refusal, then install the patched build cleanly.",
  "notes": [
   {
    "part": "adb install -r hpandro-patched.apk",
    "does": "Installs over the existing package; -r permits reinstall, and it is refused with UPDATE_INCOMPATIBLE because the signing key differs from stock."
   },
   {
    "part": "adb uninstall hpandro.android.security",
    "does": "Removes the stock package so the new signature can take its place; this also deletes the app's stored data and settings."
   },
   {
    "part": "adb install hpandro-patched.apk",
    "does": "Installs with no -r, so no signature comparison happens; Success here is the clean-install half of the evidence."
   }
  ]
 },
 "m5/verify": {
  "goal": "Show the patched screen text and name the second copy of the check that survives.",
  "notes": [
   {
    "part": "adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection...",
    "does": "Launches the patched activity directly by component; -n takes the package plus activity class, starting at the dot, bypassing app navigation."
   },
   {
    "part": "adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o ...",
    "does": "Dumps the current screen to XML, then prints every text attribute; grep -o extracts just the label values for comparison with the stock build."
   }
  ]
 },
 "m6/mobsf": {
  "goal": "MobSF answering on 8000 with both APKs scanned, so the automated pass can be graded against your manual one.",
  "notes": [
   {
    "part": "docker info >/dev/null 2>&1 && echo \"docker up\" || echo \"start Docker Desktop first\"",
    "does": "Tests the daemon rather than the client. The client is installed on most laptops; the daemon is the part that is not running, and its absence produces a confusing \"cannot connect to the Docker daemon\"."
   },
   {
    "part": "docker pull opensecurity/mobile-security-framework-mobsf:latest",
    "does": "Fetches ~2 GB once. Pulling before class is the difference between a 3-minute step and a dead slot on conference Wi-Fi."
   },
   {
    "part": "docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest",
    "does": "-p publishes the container's 8000 to the laptop, -it keeps it attached so you see the log, --rm removes it when you stop it - scan results live in the UI, not in the container."
   },
   {
    "part": "# open http://127.0.0.1:8000 in a browser, upload both APKs",
    "does": "The upload path; there is no supported CLI for the free build, so the UI is the interface."
   },
   {
    "part": "curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8000/",
    "does": "-s hides the progress meter, -o /dev/null discards the body, -w prints just the status. 200 means the container is serving."
   }
  ]
 },
 "m6/verify-scan": {
  "goal": "Test scanner alerts against the running app and reject at least one with evidence.",
  "notes": [
   {
    "part": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -A4 UserProfileProvider",
    "does": "Prints the manifest XML and four lines after the provider entry; exported, readPermission and grantUriPermissions there decide whether the alert holds."
   },
   {
    "part": "adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile",
    "does": "Queries the provider as the shell user with no app permission; returned rows are real exposure, an exception means a guard is enforced."
   }
  ]
 },
 "m6/report": {
  "goal": "Write one finding in the fixed field format with quoted evidence and a specific fix.",
  "notes": [
   {
    "part": "FINDING: <one sentence, no adjectives>",
    "does": "The claim itself: component and effect in one sentence; adjectives add nothing a reviewer can check, and each finding gets exactly one."
   },
   {
    "part": "WHERE:   <app, version, component/file:line>",
    "does": "Pins app, version, and the exact component or file with line number, so a reviewer opens the same code you did."
   },
   {
    "part": "EVIDENCE: <command>  ->  <output, trimmed to the proof>",
    "does": "Records the command and the output that proves it, trimmed to decisive lines; a screenshot or scanner link does not substitute for this."
   },
   {
    "part": "IMPACT:  <who can do what, to whose data, without which permission>",
    "does": "Names attacker, action, data, and the permission not required; this sentence sets severity, so it must follow from the evidence above."
   },
   {
    "part": "FIX:     <specific attribute, setting, or code change>",
    "does": "States the change that closes it, such as exported=false or a signature-level permission; improve security is not a fix anyone can apply."
   },
   {
    "part": "LIMITS:  <what you did not test, and why it matters>",
    "does": "Declares the edge of the claim, so the finding is not read as broader than what you actually ran."
   }
  ]
 },
 "m6/limits": {
  "goal": "Write a specific scope and blocked-items section that a reviewer can rely on.",
  "notes": []
 },
 "m1/tree": {
  "goal": "Read the decoded directory layout so you know which tree answers a given question.",
  "notes": [
   {
    "part": "unzip -l \"$APK_B\" | awk 'NR>3{print $4}' | grep / | cut -d/ -f1 | sort | uniq -c | sort...",
    "does": "Summarises archive paths: -l lists entries, awk NR>3 drops the three header lines, cut -d/ -f1 keeps the top folder, uniq -c counts repeats."
   },
   {
    "part": "du -sh bb/* | sort -hr",
    "does": "Prints the human-readable size of each top-level directory in bb/; -s totals each argument, -h scales units, sort -hr orders biggest first."
   },
   {
    "part": "ls -d bb/build bb/dist",
    "does": "Deliberate negative control: these directories exist only after apktool b, so no such file proves you read a decoded tree, not a rebuild."
   },
   {
    "part": "ls bb/unknown/META-INF | wc -l",
    "does": "Counts entries apktool could not classify; wc -l counts output lines, 61 here, mostly androidx .version markers - a dependency inventory you did not build by hand."
   },
   {
    "part": "ls bb/unknown/*.properties | sed \"s#.*/##\" | cut -d- -f1 | sort | uniq -c | sort -rn",
    "does": "Strips directories with sed s#.*/##, keeps the text before the first dash via cut -d- -f1, then counts and ranks each SDK by file count."
   }
  ]
 },
 "m1/files": {
  "goal": "Open the manifest, resource table, strings, configs, signature block and assets that answer most report questions.",
  "notes": [
   {
    "part": "unzip -p \"$APK_B\" AndroidManifest.xml | xxd | head -2",
    "does": "Shows the manifest is binary XML: -p streams one member to stdout, xxd hex-dumps it, head -2 keeps the 03 00 08 00 magic."
   },
   {
    "part": "head -2 bb/AndroidManifest.xml",
    "does": "Prints the first two lines of the apktool-decoded manifest, the same file as plain XML you can read and grep directly."
   },
   {
    "part": "unzip -l \"$APK_B\" | grep -E \"resources\\.arsc|classes[0-9]*\\.dex\"",
    "does": "Lists the resource table and every classesN.dex with sizes; -l lists the archive without extracting it, -E enables the alternation."
   },
   {
    "part": "grep -nE \"google_api_key|google_storage_bucket\" bb/res/values/strings.xml",
    "does": "Finds Firebase credentials in the decoded string table; -n prints line numbers and -E enables the alternation of the two names."
   },
   {
    "part": "cat hp/res/xml/network_security_config.xml",
    "does": "Prints the trust configuration in full; the per-domain trust-anchors blocks decide which hosts accept a user-installed CA."
   },
   {
    "part": "unzip -l \"$APK_B\" | grep -cE \"META-INF/.*\\.(RSA|SF|MF)\"",
    "does": "Counts v1 signature files; -c prints only the count, so 0 means no JAR signing block, not that the APK is unsigned."
   },
   {
    "part": "apksigner verify --verbose --print-certs \"$APK_B\" | head -10",
    "does": "Verifies the signature and names the scheme; --verbose lists v1/v2/v3 results, --print-certs shows the signer, head -10 trims the rest."
   },
   {
    "part": "ls -l hp/assets",
    "does": "Lists hpAndro's shipped assets with permissions and sizes, where private.der sits: a 2048-bit RSA private key inside the APK."
   },
   {
    "part": "openssl pkey -inform DER -in hp/assets/private.der -noout -text | head -1",
    "does": "Parses the DER private key and prints its type and size; -inform DER says binary input, -noout drops the encoded output, -text dumps the structure."
   },
   {
    "part": "grep -n \"private.der\" hp/smali/hpandro/android/security/ui/activity/task/encryption/RSA...",
    "does": "Finds the call site that loads that key by filename, which is what turns an embedded key from an observation into a finding."
   }
  ]
 },
 "m1/db": {
  "goal": "Pull the app's SQLite files and read real rows with sqlite3 to prove stored data exposure.",
  "notes": [
   {
    "part": "export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"",
    "does": "Picks the first device whose state is device and stores its serial; awk $2 matches the state column and exit stops after one hit."
   },
   {
    "part": "adb -s \"$SERIAL\" shell run-as com.BugBazaar ls -l databases",
    "does": "Deliberate negative control: run-as drops to the app uid, but sepolicy refuses the context switch here, proving the shell user cannot read that directory."
   },
   {
    "part": "adb -s \"$SERIAL\" shell su -c \"run-as com.BugBazaar ls -l databases\"",
    "does": "Runs the same listing through su, so the database directory becomes readable; -c passes the entire command string to root's shell."
   },
   {
    "part": "adb -s \"$SERIAL\" shell run-as hpandro.android.security ls",
    "does": "Same probe against hpAndro; it answers package not debuggable, the expected answer for a release build and itself a finding."
   },
   {
    "part": "adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/AddressDB\" > Ad...",
    "does": "Streams the database to a local file; exec-out passes the raw byte stream where a plain shell would mangle it through a pty."
   },
   {
    "part": "adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/UserProfileData...",
    "does": "Same pull for the profile database; the shell redirect writes it locally so sqlite3 can open it as an ordinary file."
   },
   {
    "part": "file AddressDB UserProfileDatabase",
    "does": "Confirms both downloads are real SQLite 3.x databases rather than truncated or text-mangled files, before you trust any row."
   },
   {
    "part": "sqlite3 AddressDB \".tables\"",
    "does": "Lists every table in the pulled database; the leading dot marks a sqlite3 shell command, not a SQL statement."
   },
   {
    "part": "sqlite3 AddressDB \".schema addresses\"",
    "does": "Prints the CREATE TABLE statement for addresses, which names the columns you can select and the types they hold."
   },
   {
    "part": "sqlite3 -header -column AddressDB \"select id,nickname,address from addresses limit 3;\"",
    "does": "-header prints the column names, -column aligns rows into a table, and limit 3 keeps the sample short enough to quote."
   },
   {
    "part": "sqlite3 -header -column UserProfileDatabase \"select name,email,mobile from user_profiles;\"",
    "does": "Dumps every profile row with email and mobile; the same two flags make the plaintext personal data obvious in your terminal."
   },
   {
    "part": "unzip -l \"$APK_B\" | grep -icE \"\\.db$|\\.sqlite$|\\.keystore|\\.bks\"",
    "does": "Counts database or keystore files shipped inside the APK; -i ignores case, -c counts, so 0 proves every database was created at runtime."
   }
  ]
 },
 "m1/providers-static": {
  "goal": "Read the provider's query method in decompiled Java and confirm no permission check guards it.",
  "notes": [
   {
    "part": "grep -n \"provider android\" bb/AndroidManifest.xml",
    "does": "Lists every provider element with its authority, exported flag and permission; -n prints line numbers so you can open the same entry."
   },
   {
    "part": "find bb -name \"AddressContentProvider*\" -o -name \"UserProfileProvider*\"",
    "does": "Locates the smali for both providers plus their inner classes; -o is a logical OR between the two -name patterns."
   },
   {
    "part": "jadx -d jx-prov --single-class com.BugBazaar.ui.addresses.AddressContentProvider \"$APK_...",
    "does": "Decompiles one class only into jx-prov; --single-class limits the work, 2>&1 merges the log so tail -2 shows the final save line."
   },
   {
    "part": "sed -n \"/public Cursor query/,/^    }/p\" jx-prov/sources/com/BugBazaar/ui/addresses/Add...",
    "does": "Prints the query method: -n suppresses default output and the two addresses select from the signature to the first closing brace."
   },
   {
    "part": "grep -cE \"enforceCallingOrSelfPermission|checkCallingPermission|checkSelfPermission\" bb...",
    "does": "Counts permission-call sites per file; -c gives one number each, so 0 and 0 mean neither provider class checks the caller at all."
   }
  ]
 },
 "m1/storage": {
  "goal": "Judge what the app writes to SharedPreferences and whether backups can carry it off the device.",
  "notes": [
   {
    "part": "export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"",
    "does": "Resolves one attached serial into SERIAL; awk matches the state in column 2 and exits at the first device, so every later call names it."
   },
   {
    "part": "adb -s \"$SERIAL\" shell su -c \"ls -l /data/data/com.BugBazaar/shared_prefs\"",
    "does": "Lists the prefs directory through root; the -rw-rw---- modes show that only the app uid and its group can read these files."
   },
   {
    "part": "adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/user_auth.xml\"",
    "does": "Dumps the passcode prefs, which hold passcode 1234 in clear text; exec-out avoids the shell newline translation that would corrupt XML."
   },
   {
    "part": "adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/userCred.xml\"",
    "does": "Dumps the credential prefs: username admin and password BugBazaarSeccool stored as plain strings, not hashed or encrypted."
   },
   {
    "part": "grep -n \"USER_PREFERENCES\\|USER_DATA\" bb/smali/com/BugBazaar/controller/UserAuthSave.sm...",
    "does": "Shows the two pref file names the app uses; the escaped pipe is an alternation in the basic regex, and head -2 keeps both constants."
   },
   {
    "part": "sed -n \"244,262p\" bb/smali/com/BugBazaar/controller/UserAuthSave.smali",
    "does": "Prints exactly that line range of smali, the putString pair that writes the username and password into the prefs file."
   },
   {
    "part": "grep -Ho 'android:allowBackup=\"[^\"]*\"\\|android:fullBackupContent=\"[^\"]*\"\\|android:dataE...",
    "does": "Prints file:match for allowBackup, fullBackupContent and dataExtractionRules in both manifests; -H forces the filename, -o prints only the match."
   },
   {
    "part": "cat bb/res/xml/backup_rules.xml",
    "does": "Shows the backup rules: an empty full-backup-content element, so nothing at all is excluded from an automatic backup."
   },
   {
    "part": "grep -n \"getSharedPreferences\\|putString\" hp/smali/hpandro/android/security/ui/activity...",
    "does": "Finds where hpAndro writes its own secret to prefs; MODE_PRIVATE hides it from other apps, not from root or from a backup."
   },
   {
    "part": "grep -n \"getExternalFilesDir\\|FileOutputStream\" hp/smali/hpandro/android/security/ui/ac...",
    "does": "Finds the external-storage write, showing the app leaves its sandbox for a shared volume that other apps can read."
   },
   {
    "part": "grep -rl \"MODE_WORLD_READABLE\" hp/smali bb/smali | wc -l",
    "does": "Counts files using the deprecated world-readable mode; -l prints names only so wc -l counts them, and 0 is expected rather than reassuring."
   }
  ]
 },
 "m1/logging": {
  "goal": "Count log calls per package, then read the call sites that print a flag or copy text to the clipboard.",
  "notes": [
   {
    "part": "grep -rho \"Landroid/util/Log;->[a-z]*\" hp/smali | sort | uniq -c | sort -rn | head -4",
    "does": "-r recurses, -h drops filenames, -o prints only the match, so uniq -c counts each Log level across the whole smali tree."
   },
   {
    "part": "for p in hp/smali/hpandro bb/smali/com/BugBazaar; do printf \"%s \" \"$p\"; grep -rho \"Land...",
    "does": "Loops over both app packages: printf labels the line without a newline, grep -rho counts Log.d in that package only, wc -l totals it."
   },
   {
    "part": "grep -n -B8 \"Log;->d\" hp/smali/hpandro/android/security/ui/activity/task/logs/LogsTaskA...",
    "does": "-B8 shows eight lines before the hit, the invoke that produced the argument; tail -9 keeps the call plus its setup."
   },
   {
    "part": "sed -n \"4755,4768p\" hp/smali/hpandro/android/security/utils/operation/UIBaseActivity.smali",
    "does": "Prints that line range: the newPlainText plus setPrimaryClip pair that copies arbitrary text to the shared clipboard."
   },
   {
    "part": "grep -n \"getPrimaryClip\" hp/smali/hpandro/android/security/ui/activity/task/datastorage...",
    "does": "Finds the clipboard read side, which shows the flow runs both ways: this screen also reads whatever another app copied."
   }
  ]
 },
 "m1/webview": {
  "goal": "Judge a WebView by its settings and its loadUrl source, not by the URL it displays.",
  "notes": [
   {
    "part": "grep -rl \"setJavaScriptEnabled\" hp/smali bb/smali* | wc -l",
    "does": "-r recurses, -l lists filenames only, and the smali* glob covers the extra dex directories, so 14 files enable JavaScript."
   },
   {
    "part": "jadx -d jx-tc --single-class com.BugBazaar.ui.TermsAndConditionsActivity \"$APK_B\" 2>&1 ...",
    "does": "Decompiles just that activity; --single-class keeps the output small and tail -1 shows only the final done line."
   },
   {
    "part": "sed -n \"46,62p\" jx-tc/sources/com/BugBazaar/ui/TermsAndConditionsActivity.java",
    "does": "Prints setupwebview and startWebView: JavaScript on, universal file access on, bridge attached on one branch, loadUrl after both."
   },
   {
    "part": "sed -n \"104,118p\" bb/smali/com/BugBazaar/ui/TermsAndConditionsActivity.smali",
    "does": "Prints the same logic in smali, where the const-string Androidinterface and the unconditional loadUrl are visible."
   },
   {
    "part": "sed -n \"363,372p\" hp/smali/hpandro/android/security/ui/activity/task/contentprovider/Fi...",
    "does": "Prints hpAndro's WebSettings block, which turns on the three file-access flags that let a loaded page read local files."
   },
   {
    "part": "grep -n \"const/4 v1, 0x1\" hp/smali/hpandro/android/security/ui/activity/task/contentpro...",
    "does": "Finds the first register set to 1 in that method, the true handed to a setter; head -1 keeps the earliest hit."
   }
  ]
 },
 "m1/crypto": {
  "goal": "Resolve the key resource ids and name the cipher mode before deciding whether the crypto is broken.",
  "notes": [
   {
    "part": "aapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100091\"",
    "does": "Resolves the resource id to string/des_enc_pass and its value; -A1 prints the line after the id, which holds the literal key."
   },
   {
    "part": "grep -nE \"0x7f100091|DES/ECB|SecretKeySpec\" hp/smali/hpandro/android/security/ui/activi...",
    "does": "-E enables the alternation, -n gives line numbers, so key id, key spec and cipher mode appear together; head -6 keeps six hits."
   },
   {
    "part": "aapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100058\"",
    "does": "Same lookup for the AES key: it resolves to string/aes_enc_pass with its literal value, so the key ships inside the APK."
   },
   {
    "part": "grep -n -A6 \"0x7f100058\" hp/smali/hpandro/android/security/ui/activity/task/encryption/...",
    "does": "-A6 shows six lines after the id, the getString call that turns the resource into a key string for the cipher."
   },
   {
    "part": "grep -nE \"0000 to 9999|AES/CBC/PKCS5Padding\" hp/smali/hpandro/android/security/ui/activ...",
    "does": "Finds the activity's own hint about a four-digit IV and the cipher mode string, which together make that IV brute-forceable."
   },
   {
    "part": "grep -nE \"aes_enc_iv|aes_enc_pass|des_enc_pass\" hp/res/values/strings.xml",
    "does": "Lists the key and IV string resources with line numbers, so you can quote both the resource name and its literal value."
   },
   {
    "part": "grep -rn \"0x7f100057\" hp/smali --include=*.smali | grep -v 'R$string' | wc -l",
    "does": "Negative control: --include restricts the walk to smali files and grep -v drops the R class, so 0 means the IV resource is never read."
   },
   {
    "part": "grep -rc \"AES/GCM\" hp/smali bb/smali* | grep -v \":0\" | head -3",
    "does": "Counts AES/GCM per file; -rc gives file:count pairs, grep -v :0 hides the zero counts, so only real uses remain as the contrast."
   }
  ]
 },
 "m1/jadx-gui": {
  "goal": "Search the decompiled tree for a string, then walk callers to prove when a check runs.",
  "notes": [
   {
    "part": "jadx --no-res -d jx-bb \"$APK_B\" >/dev/null 2>&1",
    "does": "Decompiles without resources into jx-bb; --no-res skips resources and both streams go to /dev/null when only the tree matters."
   },
   {
    "part": "grep -rn \"FRIDA\" jx-bb/sources/com/bug/hook/",
    "does": "Searches that package only: -r recurses, -n prints file and line, and the hit is a dialog string, not the deciding logic."
   },
   {
    "part": "grep -n -A3 \"private boolean checkfrida\" jx-bb/sources/com/bug/hook/checkdetect.java",
    "does": "-A3 prints three lines after the signature, enough to see the method OR four static checks together in one return."
   },
   {
    "part": "grep -rn \"new checkdetect()\" jx-bb/sources/com/",
    "does": "Finds the caller, the CLI equivalent of Find usages; it lands in SplashActivity, proving the whole chain runs at startup."
   }
  ]
 },
 "m1/jadx-to-frida": {
  "goal": "Convert a jadx class path into a hook that actually fires, and know why the hook order matters.",
  "notes": [
   {
    "part": "# the class paths from jadx, written down before any hook exists:",
    "does": "The inventory is the deliverable of the static pass; every line below came from reading the class, not from guessing."
   },
   {
    "part": "#   com.bug.hook.checkdetect.checkfrida()            private boolean, no args",
    "does": "Private is a compile-time rule, so this is hookable. It is the OR of the four checks below."
   },
   {
    "part": "#   com.bug.hook.runtime.areFridaFilesPresent()     static boolean",
    "does": "Static means no instance: the hook calls the original through the wrapper, not through this."
   },
   {
    "part": "#   com.bug.hook.AdbEnabled.AdbEnabled1(Context)    static boolean  <- reached FIRST",
    "does": "The important annotation: someMethod() tests this before checkfrida(), so leaving it live makes every other hook look broken."
   },
   {
    "part": "# the finished script ships with the course; read it, then run it",
    "does": "Students read a working script rather than typing one from a slide - the failure mode of transcription is a hook that never attaches."
   },
   {
    "part": "sed -n '1,40p' frida-scripts/offline/f5_bugbazaar_detection.js",
    "does": "Prints the header, which carries the identification chain: string on screen, class in jadx, method, caller, and why the first branch short-circuits."
   },
   {
    "part": "# run it in observe mode, then change MODE to \"bypass\" and run again",
    "does": "Two runs are required: one proves the checks execute and what they return, the second proves the change is yours."
   },
   {
    "part": "frida -H 127.0.0.1:27042 -f com.BugBazaar -l frida-scripts/offline/f5_bugbazaar_detection.js",
    "does": "-f spawns BugBazaar so the hooks are installed before SplashActivity's 2-second Handler fires the detection chain."
   }
  ]
 },
 "m4/m4-user-ca": {
  "goal": "Install the Burp CA into the user trust store through the Settings UI and verify it landed.",
  "notes": [
   {
    "part": "# 0. export the CA the proxy is actually using - a file left over from an earlier",
    "does": "Section 0 exists because the CA file is the one artefact students arrive with and never re-check; a stale one installs cleanly and changes nothing."
   },
   {
    "part": "echo | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 \\",
    "does": "Asks the running proxy to present its chain for an arbitrary host - the certificate Burp forges depends on the CA it holds, so this is the authoritative source."
   },
   {
    "part": "-servername example.com -showcerts 2>/dev/null \\",
    "does": "-servername sends SNI so Burp generates a certificate for that host; -showcerts prints the whole chain, not only the leaf."
   },
   {
    "part": "| awk '/-----BEGIN CERTIFICATE-----/{b=\"\"} {b=b $0 \"\\n\"}",
    "does": "Accumulates one certificate at a time, resetting the buffer at each BEGIN so only one survives at the end."
   },
   {
    "part": "/-----END CERTIFICATE-----/{last=b} END{printf \"%s\", last}' \\",
    "does": "Keeps the last complete certificate - the root - because that is the one a trust store needs."
   },
   {
    "part": "> portswigger-ca.pem",
    "does": "Writes the PEM the next two commands convert from; without it the DER below has no source, which is the gap this section closes."
   },
   {
    "part": "openssl x509 -in portswigger-ca.pem -outform der -out portswigger-ca.der",
    "does": "Converts to DER, the format the Android certificate installer accepts from a file picker."
   },
   {
    "part": "openssl x509 -inform der -in portswigger-ca.der -noout -subject -serial",
    "does": "Prints subject and serial. The serial is how you tell this CA from another with the same name - the trap in the system-store step."
   },
   {
    "part": "ADB=~/jp/tools/platform-tools/adb",
    "does": "Stores the adb path in ADB once, so every command below uses the platform-tools build that actually reaches this handset."
   },
   {
    "part": "$ADB -s ebb1e62d push portswigger-ca.der /sdcard/Download/",
    "does": "Copies the DER exported from Burp onto the phone's Download folder; -s names the single device, and no MTP or file-transfer mode is needed."
   },
   {
    "part": "$ADB -s ebb1e62d shell ls -l /sdcard/Download/portswigger-ca.der",
    "does": "Confirms the file arrived with its size and mode; -l gives the long listing, and 986 bytes is the DER you are about to install."
   },
   {
    "part": "openssl x509 -inform der -in portswigger-ca.der -noout -subject -fingerprint -sha256",
    "does": "Reads the certificate: -inform der says the input is binary, -noout suppresses the PEM dump, -subject names it, -fingerprint -sha256 fixes its identity."
   },
   {
    "part": "openssl x509 -inform der -in portswigger-ca.der -noout -subject_hash_old",
    "does": "Prints the MD5 subject hash the store names the file after; -subject_hash_old selects the legacy algorithm Android actually uses."
   },
   {
    "part": "$ADB -s ebb1e62d shell 'su -c \"ls -l /data/misc/user/0/cacerts-added/\"'",
    "does": "Lists the user CA store through root; the 8-hex .0 filenames are subject hashes, and without root the Settings tab is your only check."
   },
   {
    "part": "$ADB -s ebb1e62d exec-out su -c 'cat /data/misc/user/0/cacerts-added/9a5ba575.0' > /tmp...",
    "does": "Pulls the stored certificate back byte for byte; exec-out avoids pty newline translation, so the DER survives for comparison."
   },
   {
    "part": "openssl x509 -inform der -in /tmp/back.der -noout -subject -fingerprint -sha256",
    "does": "Re-reads the copy the device kept; an identical SHA-256 fingerprint proves the installer stored your bytes rather than converting them."
   },
   {
    "part": "$ADB -s ebb1e62d shell dumpsys wifi | grep -i 'Proxy settings'",
    "does": "Sanity-checks the path: a per-network Wi-Fi proxy overrides the global key, so read this before blaming the certificate."
   }
  ]
 },
 "m4/m4-system-ca": {
  "goal": "Install the proxy CA into the system trust store by mounting a complete store, and prove it with a 200.",
  "notes": [
   {
    "part": "| awk '/-----BEGIN CERTIFICATE-----/{b=\"\"} {b=b $0 \"\\n\"}",
    "does": "Collects the chain one certificate at a time so the root can be kept on its own."
   },
   {
    "part": "/-----END CERTIFICATE-----/{last=b} END{printf \"%s\", last}' \\",
    "does": "Holds the last certificate, which is the root CA the store needs."
   },
   {
    "part": "> burp_ca_live.pem",
    "does": "Saves it to the file the build section converts and renames; every later command in this step reads it."
   },
   {
    "part": "openssl x509 -in burp_ca_live.pem -noout -subject -serial",
    "does": "Reads the saved file back and prints the serial, so the value used to build the module is provably the value the proxy serves."
   },
   {
    "part": "# 1. which CA is Burp actually signing with? Ask the running instance, not an old file.",
    "does": "Asks the live proxy for its certificate and prints the serial; the serial, not the name, identifies which CA is really in use."
   },
   {
    "part": "echo | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 \\\n  -servername example.com -showcerts 2>/dev/null | openssl x509 -noout -subject -serial",
    "does": "Connects through Burp to an HTTPS host, asks for the whole chain with -showcerts, and prints the subject and serial of the first certificate."
   },
   {
    "part": "#    CN=PortSwigger CA   serial=1CB7B377     <- this is the one to install\n#    an older export of the same name carried serial=5A702819 and was silently ignored",
    "does": "The trap in two lines: same subject name, different serial. The filename is derived from the name, so a stale export overwrites the live CA and looks installed."
   },
   {
    "part": "adb root && adb remount                      # Not running as root",
    "does": "The 2020 recipe, shown failing on purpose: adbd cannot become root on a retail kernel, so remount never gets permission."
   },
   {
    "part": "adb shell 'su -c \"test -w /apex/com.android.conscrypt/cacerts && echo WRITABLE || echo NOT-WRITABLE\"'",
    "does": "Proves the modern store is read-only even as root: -w tests writability, and the answer here is NOT-WRITABLE."
   },
   {
    "part": "openssl x509 -in burp_ca_live.pem -outform pem -out 9a5ba575.0     # name = subject_hash_old",
    "does": "Writes the CA as PEM. The store on this ROM is PEM only - a .der copied in is ignored without any error."
   },
   {
    "part": "openssl x509 -in 9a5ba575.0 -noout -subject_hash_old               # confirms 9a5ba575",
    "does": "Prints the MD5 of the subject, which is the filename the store expects. Two CAs with one name collide here."
   },
   {
    "part": "adb shell 'su -c \"cp -a /apex/com.android.conscrypt/cacerts/. /sdcard/cacerts-stock/; ls /sdcard/cacerts-stock | wc -l\"'",
    "does": "Copies the whole stock store out - 143 files - because the module must mount all of them plus ours; mounting only ours replaces the store and breaks TLS everywhere."
   },
   {
    "part": "adb pull /sdcard/cacerts-stock ./stock                             # 143 files - all of them go in",
    "does": "Brings the stock CAs to the build host so they can be packaged with the module."
   },
   {
    "part": "mkdir -p mod/system/etc/security/cacerts && cp stock/* mod/system/etc/security/cacerts/",
    "does": "Creates the payload directory and seeds it with every stock CA."
   },
   {
    "part": "cp 9a5ba575.0 mod/system/etc/security/cacerts/",
    "does": "Adds our CA alongside them. The result is a complete, valid store rather than a single-cert replacement."
   },
   {
    "part": "cat > mod/post-fs-data.sh <<'EOF'",
    "does": "Writes the boot script that performs the bind mounts before the system finishes starting."
   },
   {
    "part": "mount --bind \"$SRC\" /apex/com.android.conscrypt/cacerts",
    "does": "Replaces the Java/Conscrypt store at boot; this is what apps actually read."
   },
   {
    "part": "mount --bind \"$SRC\" /system/etc/security/cacerts",
    "does": "Replaces the native/BoringSSL store as well; without this line curl and some SDKs still see the old 143."
   },
   {
    "part": "cd mod && zip -qr ../burp-ca.zip . && cd ..",
    "does": "Packs the module with module.prop at the archive root, which is what the installer expects."
   },
   {
    "part": "adb shell su -c \"ksud module install /sdcard/Download/burp-ca.zip\"",
    "does": "Installs into /data/adb/modules_update; the module only takes effect on the next boot."
   },
   {
    "part": "adb reboot",
    "does": "Needed because post-fs-data.sh runs during boot. This is the part students must not skip."
   },
   {
    "part": "adb shell su -c \"ls /apex/com.android.conscrypt/cacerts | wc -l\"    # 144, was 143",
    "does": "Counts the Java store: 144 means the mount worked and the stock CAs are still there."
   },
   {
    "part": "adb shell su -c \"ls /system/etc/security/cacerts | wc -l\"           # 144, was 143",
    "does": "Counts the native store. Both numbers must match or half the traffic will still fail."
   },
   {
    "part": "adb shell curl -sS -x http://HOST:5555 -o /dev/null -w '%{http_code}\\n' https://example.com/   # 200",
    "does": "The end-to-end proof: 200 means the chain validated against our CA through the proxy. Error 60 means it did not."
   },
   {
    "part": "# 6. rollback: disable the module in KernelSU and reboot",
    "does": "The undo path: disable the module, reboot, and the original stores come back untouched."
   }
  ]
 },
 "m3/stealth": {
  "goal": "Rename the server binary and move it off port 27042 so the app's own file and port checks come back false.",
  "notes": [
   {
    "part": "# 1. what the app looks for (from the code you read in Module 01)",
    "does": "The four checks you decompiled in Module 01, restated so the next three commands have a reason. Nothing runs here."
   },
   {
    "part": "adb shell su -c \"cp /data/local/tmp/frida-server-1724 /data/local/tmp/fsvc\"",
    "does": "Copies the server under a name that does not contain 'frida', which is what areFridaFilesPresent() and the find-based checks look for. su because the directory is root-owned."
   },
   {
    "part": "adb shell su -c \"chmod 755 /data/local/tmp/fsvc\"",
    "does": "Makes the copy executable. Without it the next line fails with Permission denied."
   },
   {
    "part": "adb shell su -c \"/data/local/tmp/fsvc -l 0.0.0.0:4444 -D\"",
    "does": "Starts the server: -l binds it to every interface on port 4444 instead of the default 127.0.0.1:27042, -D daemonises it so the shell returns."
   },
   {
    "part": "adb forward tcp:4444 tcp:4444",
    "does": "Maps the host's 4444 to the device's 4444 so frida-ps and frida can reach it over the cable instead of adb's own transport."
   },
   {
    "part": "frida-ps -H 127.0.0.1:4444 | head -3",
    "does": "-H connects to a remote server instead of a USB device; the output proves the renamed listener answers and enumerates processes."
   },
   {
    "part": "adb shell su -c \"mv /data/local/tmp/frida-server-1724 /data/local/tmp/svc.bin\"",
    "does": "Moves the original binary aside. A renamed server is pointless while a file called frida-server is still on disk for the filesystem check to find."
   },
   {
    "part": "adb shell su -c \"ls /data/local/tmp | grep -i frida\"",
    "does": "The negative control: anything still matching 'frida' here is a fact the app can read, so this list should come back empty before you claim the bypass works."
   }
  ]
 },
 "m2/inventory": {
  "goal": "Produce your own component inventory - declared and registered - instead of using names copied from a write-up.",
  "notes": [
   {
    "part": "# 1. what the APK declares - one greppable line per component",
    "does": "Section 1 works from the APK: the file the device installs, with any component that library manifests merged in."
   },
   {
    "part": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" > /tmp/mb.txt",
    "does": "Dumps the compiled manifest as an indented tree, one attribute per line - the form that survives grep. Saved to a file so the next steps can re-read it."
   },
   {
    "part": "grep -c 'E: provider' /tmp/mb.txt",
    "does": "Counts the provider elements. The count is the cross-check for the device listing below: declared and registered should agree, and a gap means a component was removed at install time."
   },
   {
    "part": "# 2. what the device registered: authorities, which is the real endpoint",
    "does": "Section 2 asks the package manager, which reports the authority strings an attacker addresses."
   },
   {
    "part": "adb shell dumpsys package com.BugBazaar | sed -n '/Providers:/,/Receivers:/p'",
    "does": "Prints the package manager's provider tables: registered classes, then a second list keyed by authority. The authority is what goes into a content:// URI; the class name is not."
   },
   {
    "part": "# 3. the other two component types, same shape",
    "does": "Section 3 repeats the idea for receivers and services, whose tables are named differently in dumpsys."
   },
   {
    "part": "| sed -n '/Receiver Resolver Table/,/Service Resolver Table/p' \\",
    "does": "Selects the receiver table only - dumpsys prints every resolver table back to back, so an unbounded grep mixes three component types together."
   },
   {
    "part": "grep -E 'com.BugBazaar/|Action:'",
    "does": "Keeps the owning package and the actions it answers, which is the pair that tells you whether a receiver is reachable by any app or only by the system."
   },
   {
    "part": "adb shell dumpsys package com.BugBazaar | sed -n '/Service Resolver Table/,/User 0/p' | head -12",
    "does": "Same for services, bounded by the next section header and cut to the first entries. Note the permission field that appears on one service and not the others - that is the next comparison."
   }
  ]
 },
 "m2/deeplinks": {
  "goal": "Name every activity another app can open, with the complete URI it answers, paths included.",
  "notes": [
   {
    "part": "# decode once (Module 01 did this; re-run if bb/ is missing)",
    "does": "The awk reads the decoded XML, because in the compiled manifest scheme, host and path are separate attribute lines with hex ids."
   },
   {
    "part": "[ -d bb ] || apktool d -f -o bb \"$APK_B\"",
    "does": "Decodes only when the directory is absent, so a second run costs nothing."
   },
   {
    "part": "# every activity another app can open, with the URI it answers",
    "does": "States the output contract: activity, arrow, complete URI."
   },
   {
    "part": "awk '/<activity/{a=$0}",
    "does": "Remembers the activity element, because its name sits above the data element that matters."
   },
   {
    "part": "/android:scheme=/{s=$0; p=\"\"}",
    "does": "Remembers the scheme and clears any path left over from the previous filter, so paths cannot leak between activities."
   },
   {
    "part": "/android:path=/{p=$0}",
    "does": "Remembers the path. This is the line that turns bb://bugbazaar into three distinct links instead of one."
   },
   {
    "part": "/android:host=/{h=$0",
    "does": "On the host line both scheme and host are known, so this is the only place a complete URI can be printed."
   },
   {
    "part": "match(a, /android:name=\"[^\"]*\"/);   n=substr(a,RSTART+14,RLENGTH-15)",
    "does": "Extracts the activity name: RSTART+14 skips android:name=\" and RLENGTH-15 drops the closing quote. Both offsets are length arithmetic on the literal, not guesses."
   },
   {
    "part": "match(s, /android:scheme=\"[^\"]*\"/); sc=substr(s,RSTART+16,RLENGTH-17)",
    "does": "Same for the scheme - android:scheme=\" is one character longer than android:name=\", so the offsets differ by one."
   },
   {
    "part": "match(h, /android:host=\"[^\"]*\"/);   ho=substr(h,RSTART+14,RLENGTH-15)",
    "does": "And the host. An off-by-one here yields ugbazaar://, which is how this row was found: the first run printed it."
   },
   {
    "part": "if (p!=\"\") { match(p, /android:path=\"[^\"]*\"/); pp=substr(p,RSTART+14,RLENGTH-15) }",
    "does": "Appends the path when the filter has one, and leaves it empty when it does not - a link without a path is still a link."
   },
   {
    "part": "print n\" -> \"sc\"://\"ho pp; s=\"\"",
    "does": "Emits one line per link and clears the scheme so the next activity does not inherit it."
   },
   {
    "part": "' bb/AndroidManifest.xml | sort -u",
    "does": "sort -u collapses filters that repeat the same URI; here nothing collapses, because the three paths differ - which is the point."
   },
   {
    "part": "# the same thing by eye, when you only need one",
    "does": "The fallback for reading a single filter with its context."
   },
   {
    "part": "grep -n -B3 -A3 'android:host=' bb/AndroidManifest.xml",
    "does": "Shows each host with its neighbours, which is how you check by hand that the awk did not invent or drop anything."
   }
  ]
 }
};
