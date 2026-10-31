/* Modules 0 and 1 - setup and static analysis */
window.MODULES = window.MODULES || [];

window.MODULES.push({
  id: "m0", tag: "MODULE 0", time: "45 min", title: "Setup: device, ADB, apps",
  goal: "Get a working device, install both lab apps, and prove each one is the build the rest of the guide assumes.",
  brief: {"from": "the engagement lead", "subject": "Monday: bring a phone that talks to your laptop", "body": "Both test apps ship on the workshop USB. The first hour is not 'install things' - it is proving your machine can see the device, pull both APKs off it, and push them back. If any of that fails on the day, you spend the week watching instead of doing.", "want": "Before Module 00 ends: two serials green in adb devices, both APKs installed, and the readiness script says you are ready."},
      intro: "Run these first. Every later step assumes <code>$APK_H</code>, <code>$APK_B</code> and the build-tools PATH are set, exactly as in the shell block below. If you have not read <a href=\"#/arch\">Android architecture</a> and the <a href=\"#/method\">methodology</a> page yet, read them first - it names the layer every later finding lives on.",
  steps: [
    {
      id: "shell", title: "Set up your shell once",
      why: "Bare <code>aapt2</code>, <code>apksigner</code> and <code>zipalign</code> are not on PATH after an SDK install, and the APKs live in <code>lab-apps/</code>. Set both here and every later command works as written.",
            concept: "Every tool in this course is a binary on your <code>PATH</code>. A shell that differs from the one in the notes is the most common reason a lab \"does not work\".",
      see: "Seven paths and no <code>command not found</code>. Note where <code>adb</code> lives on your machine - the SDK layout differs between macOS, Linux and Windows.",
cmd: `cd ~/Downloads/AndroidSecWorkshop
export APK_H=lab-apps/hpAndro_1.3.apk
export APK_B=lab-apps/BugBazaar_v1.2.1.apk
export ANDROID_HOME=$HOME/Library/Android/sdk
export BUILD_TOOLS=$ANDROID_HOME/build-tools/34.0.0
export PATH="$BUILD_TOOLS:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
command -v adb aapt2 apksigner zipalign apktool jadx frida

# if any of those is missing (macOS):
#   brew install --cask android-platform-tools android-commandlinetools
#   brew install apktool jadx
#   pipx install frida-tools        # or: python3 -m pip install --user frida-tools`,
      sim: `$ command -v adb aapt2 apksigner zipalign apktool jadx frida
/Users/jay/jp/tools/platform-tools/adb
/Users/jay/Library/Android/sdk/build-tools/34.0.0/aapt2
/Users/jay/Library/Android/sdk/build-tools/34.0.0/apksigner
/Users/jay/Library/Android/sdk/build-tools/34.0.0/zipalign
/opt/homebrew/bin/apktool
/opt/homebrew/bin/jadx
/opt/homebrew/bin/frida`,
      expect: `seven paths, no "command not found".`,
      expectNote: "apktool, jadx and frida-tools are not part of the Android SDK. Install them before class - a missing tool stops the whole day - and if a path is missing, fix the PATH export before continuing.",
      refs: [{ label: "Android SDK command-line tools", url: "https://developer.android.com/tools/sdkmanager" }]
    },
    {
      id: "devices", title: "Confirm the device is visible",
            concept: "<code>adb</code> addresses devices by serial. <code>device</code> means authorised, <code>unauthorized</code> means the RSA prompt was never accepted, <code>offline</code> means a stale connection.",
      see: "Look at the <i>serial</i>, not the count. <code>emulator-5554</code> is local; <code>IP:5555</code> is a phone on the network - and only one of them will give you <code>adb root</code>.",
cmd: `adb devices -l`,
      sim: `$ adb devices -l
List of devices attached
192.168.1.74:5555      device product:OnePlus7T model:HD1901 device:OnePlus7T transport_id:4
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1`,
      expect: `at least one line ending in "device".`,
      expectNote: '"unauthorized" means accept the RSA prompt on the device. "offline" means unplug/reconnect. Blank list means the platform-tools version or the cable.',
      refs: [{ label: "adb devices", url: "https://developer.android.com/tools/adb#devicestatus" },
             { label: "adb over Wi-Fi", url: "https://developer.android.com/tools/adb#wireless-android11-command-line" }]
    },
    {
      id: "avd", title: "Create the emulator if you do not have one",
      why: "Every Frida lab runs on an API 30-34 image. If <code>adb devices</code> shows nothing, build one now - this is the step people skip and then cannot start.",
            concept: "A <code>google_apis</code> image allows <code>adb root</code>; a <code>playstore</code> image does not, and half of this course needs it. The snapshot is your reset button.",
      see: "<code>sys.boot_completed</code> must print 1. A 0 here explains a dozen strange failures later, all of which look like tool bugs.",
cmd: `sdkmanager --install "platform-tools" "build-tools;34.0.0" \
  "platforms;android-34" "system-images;android-34;google_apis;arm64-v8a"
avdmanager create avd -n lab34 -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_5
$ANDROID_HOME/emulator/emulator -avd lab34 -no-snapshot-save &
adb wait-for-device
adb shell getprop sys.boot_completed`,
      sim: `$ avdmanager create avd -n lab34 -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_5
$ $ANDROID_HOME/emulator/emulator -avd lab34 -no-snapshot-save &
[emulator starts, window or headless]
$ adb wait-for-device
$ adb shell getprop sys.boot_completed
1`,
      expect: `"1" from the last command, and the AVD appears in adb devices.`,
      expectNote: "Use a google_apis image (not google_apis_playstore): only the former allows adb root, which the hpAndro labs need. Take a snapshot named clean once it boots - that is your reset button.",
      refs: [{ label: "Create and manage AVDs", url: "https://developer.android.com/studio/run/managing-avds" },
             { label: "Emulator command line", url: "https://developer.android.com/studio/run/emulator-commandline" }]
    },
    {
      id: "props", title: "Read the target's properties",
      why: "Version and ABI decide which frida-server you need and which API behaviours apply.",
            concept: "Before any test: package, versionCode, targetSdk. Those three decide which platform behaviours apply to everything below.",
      see: "<code>targetSdkVersion 30</code> on hpAndro means no API-31 export requirement; BugBazaar at 32 sits just above it, so it had to declare <code>exported</code> by hand.",
cmd: `adb -s <serial> shell getprop ro.build.version.release
adb -s <serial> shell getprop ro.build.version.sdk
adb -s <serial> shell getprop ro.product.cpu.abi
adb -s <serial> shell getprop ro.build.tags`,
      sim: `$ adb -s emulator-5554 shell getprop ro.build.version.release
14
$ adb -s emulator-5554 shell getprop ro.build.version.sdk
34
$ adb -s emulator-5554 shell getprop ro.product.cpu.abi
arm64-v8a
$ adb -s emulator-5554 shell getprop ro.build.tags
dev-keys`,
      expect: `sdk 34 on the emulator (Android 14) and abi arm64-v8a.`,
      expectNote: "A handset reporting sdk 36 is Android 16 - the Frida Java bridge does not work there. Keep Frida work on an API 30-34 image.",
      refs: [{ label: "Build class fields", url: "https://developer.android.com/reference/android/os/Build" }]
    },
    {
      id: "install", title: "Install both apps and verify the build",
      why: "Hashes pin the exact build, so a finding you write up can be reproduced months later.",
            concept: "Two third-party APKs and no backend. <code>-r -g</code> reinstalls and pre-grants runtime permissions - without <code>-g</code>, screens fail for reasons unrelated to security.",
      see: "Two <code>Success</code> lines. <code>INSTALL_FAILED_NO_MATCHING_ABIS</code> means an arm64 APK on an x86 image - check <code>ro.product.cpu.abi</code>.",
cmd: `adb install -r "$APK_H"
adb install -r "$APK_B"
shasum -a 256 "$APK_H" "$APK_B"
aapt2 dump badging "$APK_H" | head -1
aapt2 dump badging "$APK_B" | head -1`,
      sim: `$ adb install -r "$APK_H"
Performing Streamed Install
Success
$ adb install -r "$APK_B"
Performing Streamed Install
Success
$ shasum -a 256 "$APK_H" "$APK_B"
b014d694c58049e2e4bb1290f0cc37c4ffc5ad7e3efa554e3bf146ed1498d97a  lab-apps/hpAndro_1.3.apk
c307c7856b270da40357006eaa763c06bcdc2913d0d0b0bab7e0b2ed564f5f4c  lab-apps/BugBazaar_v1.2.1.apk
$ aapt2 dump badging "$APK_H" | head -1
package: name='hpandro.android.security' versionCode='26' versionName='1.3' platformBuildVersionName='11' platformBuildVersionCode='30' compileSdkVersion='30' compileSdkVersionCodename='11'
$ aapt2 dump badging "$APK_B" | head -1
package: name='com.BugBazaar' versionCode='1' versionName='1.0' platformBuildVersionName='14' platformBuildVersionCode='34' compileSdkVersion='34' compileSdkVersionCodename='14'`,
      expect: `two "Success" lines, two hashes, and hpAndro at versionName 1.3.`,
      note: "<b>The release filename is not the build identity.</b> <code>BugBazaar_v1.2.1.apk</code> declares <code>versionName='1.0'</code>. Quote what <code>aapt2 dump badging</code> says in your report, not the filename.",
      noteKind: "bad",
      refs: [{ label: "aapt2 dump badging", url: "https://developer.android.com/tools/aapt2" },
             { label: "adb install", url: "https://developer.android.com/tools/adb#movefiles" }]
    },
    {
      id: "root", title: "Know whether you have root",
      why: "hpAndro's challenge screens are not exported, so starting them from the shell needs privilege.",
            concept: "Root changes who you can be: <code>adbd</code> as root, a writable system store, <code>tcpdump</code>. It also changes what a result means - a root-only finding is not a production finding.",
      see: "<code>adbd is already running as root</code> or the production-builds refusal. Note which device gave you which answer.",
cmd: `adb -s <serial> root                 # emulator with Google APIs image
adb -s <serial> shell whoami
# physical device instead:
adb -s <serial> shell su -c id`,
      sim: `$ adb -s emulator-5554 root
restarting adbd as root
$ adb -s emulator-5554 shell whoami
root
$ adb -s <handset> shell su -c id
uid=0(root) gid=0(root) groups=0(root) context=u:r:ksu:s0`,
      expect: `whoami returns root, or su returns uid=0.`,
      expectNote: "Without this, launching an hpAndro activity gives SecurityException: Permission Denial ... not exported from uid 2000. That is the shell being unprivileged, not a security control you found.",
      refs: [{ label: "adb root", url: "https://developer.android.com/tools/adb#adbd" }]
    }
  ]
});

window.MODULES.push({
  id: "m1", tag: "MODULE 1", time: "75 min", title: "Static analysis and the manifest",
  goal: "Decompile both APKs, answer the manifest questions a report requires, and find the one exported component that matters.",
  brief: {"from": "Acme Retail, application security", "subject": "What did we actually ship?", "body": "BugBazaar was developed in a hurry and the manifest has never been reviewed by anyone outside the team. Our repo says one thing; the store APK may say another. We do not want your opinion about our source code - we want to know what is inside the artifact our customers downloaded.", "want": "Read the shipped manifests of both apps the way an attacker would: components, permissions, secrets, storage - and keep the line numbers."},
      intro: "Open the <a href=\"#/m1/manifest\">Manifest explorer</a> while you work: it holds the real <code>aapt2 xmltree</code> dump of BugBazaar with exported and permission lines marked, plus a checklist of what to look for. For hpAndro the command in each step is the only source - no manifest is published for it.",
  steps: [
    {
      id: "decode", title: "Decode the APKs",
      why: "apktool gives you smali plus decoded resources; jadx gives you readable Java. Both, always - they answer different questions.",
            concept: "<code>apktool</code> for smali and resources, <code>jadx</code> for readable Java, <code>aapt2</code> for what the package declares. Same APK, three different questions.",
      see: "<code>smali/</code> and <code>res/</code> in the apktool tree, <code>sources/</code> in the jadx tree. If aapt2 works but apktool fails, the APK is malformed or protected - worth noting on its own.",
cmd: `apktool d -f -o hp "$APK_H"
apktool d -f -o bb "$APK_B"
jadx -d jx-hp --no-res "$APK_H"
jadx -d jx-bb --no-res "$APK_B"`,
      sim: `$ apktool d -f -o hp "$APK_H"
I: Using Apktool 2.11.1 on hpAndro_1.3.apk
I: Loading resource table...
I: Decoding AndroidManifest.xml with resources...
I: Baksmaling classes.dex...
I: Baksmaling classes2.dex...
I: Baksmaling classes3.dex...
I: Copying lib...
I: Copying original files...
$ jadx -d jx-hp --no-res "$APK_H"
INFO  - loading ...
INFO  - processing ...
INFO  - done`,
      expect: `hp/ contains smali/, res/, lib/, AndroidManifest.xml; jx-hp/sources has ~1,700 .java files.`,
      expectNote: "Disk: the hpAndro smali tree is ~250 MB. Delete it after the module if space is tight - one apktool command regenerates it.",
      refs: [{ label: "apktool docs", url: "https://apktool.org/docs/install/" },
             { label: "jadx", url: "https://github.com/skylot/jadx" }]
    },
    {
      id: "manifest-facts", title: "Answer the manifest questions",
      why: "Package, counts, permissions, exported components, security flags. This is the sheet every Android report starts with.",
            concept: "Read in a fixed order: identity, SDK, application flags, components, permissions. Each answer re-frames the next question.",
      see: "Two different activity counts, both true: 106 in the manifest, 98 under <code>ui.activity.task.*</code>. The four permission lines are the first of 31.",
cmd: `aapt2 dump badging "$APK_H" | head -6
aapt2 dump permissions "$APK_B"
for t in activity service receiver provider; do
  echo -n "$t: "; aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -c "<$t"
done
grep -nE "allowBackup|usesCleartextTraffic|networkSecurityConfig|debuggable" hp/AndroidManifest.xml bb/AndroidManifest.xml`,
      sim: `$ aapt2 dump badging "$APK_H" | head -6
package: name='hpandro.android.security' versionCode='26' versionName='1.3' platformBuildVersionName='11' platformBuildVersionCode='30' compileSdkVersion='30' compileSdkVersionCodename='11'
sdkVersion:'16'
targetSdkVersion:'30'
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.ACCESS_NETWORK_STATE'
uses-permission: name='android.permission.ACCESS_WIFI_STATE'
$ aapt2 dump permissions "$APK_B" | head -8
package: com.BugBazaar
uses-permission: name='android.permission.READ_SETTINGS'
uses-permission: name='android.permission.MANAGE_EXTERNAL_STORAGE'
uses-permission: name='android.permission.READ_EXTERNAL_STORAGE'
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.READ_CONTACTS'
uses-permission: name='android.permission.READ_PHONE_STATE'
uses-permission: name='android.permission.SEND_SMS'
$ for t in activity service receiver provider; do echo -n "$t: "; aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -c "<$t"; done
activity: 25
service: 17
receiver: 16
provider: 6
$ grep -nE "allowBackup|usesCleartextTraffic|networkSecurityConfig|debuggable" hp/AndroidManifest.xml
45:    <application android:allowBackup="true" ... android:networkSecurityConfig="@xml/network_security_config" ... android:usesCleartextTraffic="true">
55:        <activity android:name="hpandro.android.security.ui.activity.task.contentprovider.FileSystemExposeTaskActivity" android:usesCleartextTraffic="true"/>`,
      expect: `hpAndro: versionName 1.3, targetSdk 30, 106 activities. BugBazaar: 25/17/16/6.`,
      expectNote: "Two counts, both true: the manifest declares 106 activities, and 98 of them are challenge screens under <code>ui.activity.task.*</code>. <code>grep -c 'E: activity'</code> gives 106; <code>grep -o 'ui\\.activity\\.task\\.[^\"]*Activity' | sort -u | wc -l</code> gives 98. The <code>sort -u</code> matters - every activity appears twice in xmltree output.",
      refs: [{ label: "App manifest overview", url: "https://developer.android.com/guide/topics/manifest/manifest-intro" },
             { label: "MASTG: Android app anatomy", url: "https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0001/" }]
    },
    {
      id: "exported", title: "Find what is exported - and what that means",
      why: 'exported="true" is not a finding by itself. It is a door. The finding is what is behind it and who can open it.',
            concept: "An export is a door, the permission is the lock. Count doors first, then inspect locks - never the other way round, or you will report SDK components as findings.",
      see: "<b>3</b> exported in hpAndro (one app activity, two SDK), <b>21</b> in BugBazaar of which 8 come from libraries. The number matters less than which ones are first-party.",
cmd: `# every exported component, with its permission if it has one
aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -B6 'exported(0x01010010)=true' | grep -E 'E: (activity|service|receiver|provider)|name\\(|permission|authorities|exported'`,
      sim: `E: provider (line=159)
  A: android:name(0x01010003)="com.BugBazaar.provider.UserProfileProvider"
  A: android:readPermission(0x01010007)=@0x7f13001c
  A: android:exported(0x01010010)=true
  A: android:authorities(0x01010018)="com.BugBazaar.UserProfile"
E: provider (line=170)
  A: android:name(0x01010003)="com.BugBazaar.ui.addresses.AddressContentProvider"
  A: android:exported(0x01010010)=true
  A: android:authorities(0x01010018)="com.bugbazaar.provider.addresses"
E: activity (line=102)
  A: android:name(0x01010003)="com.BugBazaar.ExternalAuthLogin"
  A: android:exported(0x01010010)=true`,
      expect: `at least one provider with exported=true and no android:permission.`,
      expectNote: "You will prove which of these actually answer you in Module 2. Do not write a finding from the manifest alone.",
      refs: [{ label: "android:exported", url: "https://developer.android.com/guide/topics/manifest/activity-element#exported" },
             { label: "OWASP MASTG: exported components", url: "https://mas.owasp.org/MASTG/tests/android/MASVS-PLATFORM/MASTG-TEST-0024/" }]
    },
    {
      id: "resolve", title: "Resolve a permission reference before judging it",
      why: "Attributes can point at resources. If you stop reading at <code>@0x7f13001c</code> you will report the wrong thing - this exact case is in the lab.",
            concept: "<code>@0x7f13001c</code> is a resource id, not a permission name. Resolve it before deciding whether it protects anything.",
      see: "It resolves to <code>@string/app_name</code> = <b>BugBazaar</b> - a string, not a permission. Nothing can be granted it, so the guard fails for an accident.",
cmd: `aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -A4 UserProfileProvider
aapt2 dump resources "$APK_B" | grep -A2 "0x7f13001c"`,
      sim: `$ aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -A4 UserProfileProvider
  A: android:name(0x01010003)="com.BugBazaar.provider.UserProfileProvider"
  A: android:readPermission(0x01010007)=@0x7f13001c
  A: android:enabled(0x0101000e)=true
  A: android:exported(0x01010010)=true
  A: android:authorities(0x01010018)="com.BugBazaar.UserProfile"
$ aapt2 dump resources "$APK_B" | grep -A2 "0x7f13001c"
resource 0x7f13001c string/app_name
    () "BugBazaar"`,
      expect: `the resource resolves to string/app_name = "BugBazaar".`,
      note: 'The developer wrote <code>android:readPermission="@string/app_name"</code> - a permission named "BugBazaar" that the app never declares. It is a copy-paste bug, not a control. Module 2 shows what that does at runtime.',
      noteKind: "bad",
      refs: [{ label: "aapt2 dump resources", url: "https://developer.android.com/tools/aapt2" }]
    },
    {
      id: "secrets", title: "Hunt for hardcoded secrets",
      why: "A secret is only a finding when you can show where it is used. Grep gives you candidates; the call site turns one into a finding.",
            concept: "Secrets sit in three places: resources, dex strings, native libraries. The <code>.so</code> is the one people forget, and BugBazaar hid its flag there.",
      see: "A flag-shaped literal in <code>libhardcodedsecret.so</code>, plus the activity's own text telling you to read the native file. The string is a candidate; the call site makes it a finding.",
cmd: `# 1. the app's own hint: this challenge hides the secret in a native library
grep -n "const-string" hp/smali/hpandro/android/security/ui/activity/task/binary/HardcodedSecretTaskActivity.smali | head -3
# 2. read the binary
strings hp/lib/arm64-v8a/libhardcodedsecret.so | grep -iE "hpandro\{|flag"
# 3. the generic sweeps, for the rest of the app
grep -rEn "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}" jx-hp/sources jx-bb/sources | head
grep -n "string name" hp/res/values/strings.xml | grep -iE "key|secret|pass" | head`,
      expect: `a flag-shaped string inside the .so, plus the activity text that tells you where it is.`,
      sim: `$ strings hp/lib/arm64-v8a/libhardcodedsecret.so | grep -iE "hpandro\{|flag"
Java_hpandro_android_security_ui_activity_task_binary_HardcodedSecretTaskActivity_hello
hpandro{BahutHard.i0BtSOXEXu4uDcdf38F5xTimVHNXz}
I am answering on behalf of hardcodedsecret.so file, Flag is hardcoded in library file.
$ grep -n "const-string" hp/smali/hpandro/android/security/ui/activity/task/binary/HardcodedSecretTaskActivity.smali | head -3
60:    const-string v0, "HARDCODED SECRET IN NATIVE JNI LIBRARY - This Activity Call hello() ..."
65:    const-string v0, "You need to reverse the .so file and find the hardcoded flag in native file. you can use Ghidra for RE ..."
70:    const-string v0, "Solution : https://youtu.be/2pn1fGj7zAU"`,
      expectNote: "For each hit, either paste the call site that uses it, or write why it is not exploitable. A secret with no use is an observation, not a finding.",
      refs: [{ label: "MASTG: hardcoded secrets", url: "https://mas.owasp.org/MASTG/tests/android/MASVS-STORAGE/MASTG-TEST-0001/" },
             { label: "OWASP Mobile Top 10: insecure storage", url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m9-insecure-data-storage" }]
    }
,
    {
      id: "tree",
      title: "Read the tree before you read the code",
      why: "Know which of the eight decoded directories can answer your question before you open a file - most of the time students lose is spent grepping the wrong one.",
      concept: "apktool splits the APK by kind: code into <code>smali*</code> (one directory per dex), resources into <code>res/</code>, native code into <code>lib/&lt;abi&gt;/</code>, shipped blobs into <code>assets/</code>, and anything it cannot classify into <code>unknown/</code>. <code>build/</code> and <code>dist/</code> are outputs, not inputs.",
      see: "Three <code>classes*.dex</code> in the archive, so three smali directories - 172 MB of the 189 MB total. <code>unknown/</code> holds 61 entries under <code>META-INF</code>, nearly all androidx <code>*.version</code> markers, plus 30 SDK <code>.properties</code> files: a dependency inventory you did not unpack by hand.",
      cmd: "unzip -l \"$APK_B\" | awk 'NR>3{print $4}' | grep / | cut -d/ -f1 | sort | uniq -c | sort -rn\ndu -sh bb/* | sort -hr\nls -d bb/build bb/dist\nls bb/unknown/META-INF | wc -l\nls bb/unknown/*.properties | sed \"s#.*/##\" | cut -d- -f1 | sort | uniq -c | sort -rn",
      sim: "$ unzip -l \"$APK_B\" | awk 'NR>3{print $4}' | grep / | cut -d/ -f1 | sort | uniq -c | sort -rn\n1034 res\n  65 META-INF\n  16 lib\n  10 google\n   7 kotlin\n   3 assets\n   1 okhttp3\n$ du -sh bb/* | sort -hr\n 73M\tbb/smali\n 60M\tbb/smali_classes2\n 39M\tbb/smali_classes3\n 16M\tbb/res\n528K\tbb/unknown\n116K\tbb/lib\n 36K\tbb/original\n 24K\tbb/AndroidManifest.xml\n 12K\tbb/assets\n4.0K\tbb/apktool.yml\n$ ls -d bb/build bb/dist\nls: bb/build: No such file or directory\nls: bb/dist: No such file or directory\n$ ls bb/unknown/META-INF | wc -l\n      61\n$ ls bb/unknown/*.properties | sed \"s#.*/##\" | cut -d- -f1 | sort | uniq -c | sort -rn\n  15 firebase\n  11 play\n   3 transport\n   1 protolite",
      expect: "eight directories, three of them smali*, and no build/ or dist/.",
      expectNote: "<code>build/</code> and <code>dist/</code> appear only after <code>apktool b bb</code> - if they are in someone's notes, they rebuilt the app. Nothing in this module needs a rebuild, and 189 MB of smali per APK is why you decode into a scratch directory instead of the workshop folder.",
      refs: [{"label": "apktool docs", "url": "https://apktool.org/docs/install/"}, {"label": "MASTG: Android app anatomy", "url": "https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0001/"}]
    },
    {
      id: "files",
      title: "Open the files that answer most questions",
      why: "Manifest, resource table, strings, the XML configs, the signature block and <code>assets/</code> - six places that settle most of what a report asks.",
      concept: "The manifest inside the APK is <b>binary</b> XML (it starts <code>03 00 08 00</code>), which is why grepping the APK finds nothing and <code>aapt2</code> exists. Everything apktool wrote next to it is plain text you can read directly.",
      see: "<code>resources.arsc</code> is the table that turns <code>@0x7f13001c</code> back into a string, 1.1 MB of it. <code>META-INF</code> holds zero <code>.RSA</code>/<code>.SF</code> files because this APK is v2-only signed - and hpAndro ships a 2048-bit RSA private key in <code>assets/</code>, read by name from RSAActivity.",
      cmd: "unzip -p \"$APK_B\" AndroidManifest.xml | xxd | head -2\nhead -2 bb/AndroidManifest.xml\nunzip -l \"$APK_B\" | grep -E \"resources\\.arsc|classes[0-9]*\\.dex\"\ngrep -nE \"google_api_key|google_storage_bucket\" bb/res/values/strings.xml\ncat hp/res/xml/network_security_config.xml\nunzip -l \"$APK_B\" | grep -cE \"META-INF/.*\\.(RSA|SF|MF)\"\napksigner verify --verbose --print-certs \"$APK_B\" | head -10\nls -l hp/assets\nopenssl pkey -inform DER -in hp/assets/private.der -noout -text | head -1\ngrep -n \"private.der\" hp/smali/hpandro/android/security/ui/activity/task/encryption/RSAActivity.smali",
      sim: "$ unzip -p \"$APK_B\" AndroidManifest.xml | xxd | head -2\n00000000: 0300 0800 7489 0000 0100 1c00 8041 0000  ....t........A..\n00000010: e800 0000 0000 0000 0000 0000 bc03 0000  ................\n$ head -2 bb/AndroidManifest.xml\n<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\" android:compileSdkVersion=\"34\" android:compileSdkVersionCodename=\"14\" package=\"com.BugBazaar\" platformBuildVersionCode=\"34\" platformBuildVersionName=\"14\">\n$ unzip -l \"$APK_B\" | grep -E \"resources\\.arsc|classes[0-9]*\\.dex\"\n  8196600  01-01-1981 01:01   classes.dex\n  7054788  01-01-1981 01:01   classes2.dex\n  4677672  01-01-1981 01:01   classes3.dex\n  1128612  01-01-1981 01:01   resources.arsc\n$ grep -nE \"google_api_key|google_storage_bucket\" bb/res/values/strings.xml\n81:    <string name=\"google_api_key\">AIzaSyDOx8mTREDACTED9AHk</string>\n84:    <string name=\"google_storage_bucket\">bugbazaar-cb1a1.appspot.com</string>\n$ cat hp/res/xml/network_security_config.xml\n<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<network-security-config>\n    <domain-config cleartextTrafficPermitted=\"true\">\n        <domain includeSubdomains=\"false\">hpandro.raviramesh.info</domain>\n        <domain includeSubdomains=\"true\">CTF.hpandro.raviramesh.info</domain>\n        <trust-anchors>\n            <certificates src=\"system\" />\n            <certificates src=\"user\" />\n        </trust-anchors>\n    </domain-config>\n    <domain-config cleartextTrafficPermitted=\"false\">\n        <domain includeSubdomains=\"false\">task.hpandro.raviramesh.info</domain>\n        <trust-anchors>\n            <certificates src=\"system\" />\n        </trust-anchors>\n    </domain-config>\n</network-security-config>\n$ unzip -l \"$APK_B\" | grep -cE \"META-INF/.*\\.(RSA|SF|MF)\"\n0\n$ apksigner verify --verbose --print-certs \"$APK_B\" | head -10\nVerifies\nVerified using v1 scheme (JAR signing): false\nVerified using v2 scheme (APK Signature Scheme v2): true\nVerified using v3 scheme (APK Signature Scheme v3): false\nVerified using v3.1 scheme (APK Signature Scheme v3.1): false\nVerified using v4 scheme (APK Signature Scheme v4): false\nVerified for SourceStamp: false\nNumber of signers: 1\nSigner #1 certificate DN: CN=Vedant, OU=Payatu, O=Payatu Consulting, L=Pune, ST=Pune, C=IN\nSigner #1 certificate SHA-256 digest: 502e36656fda1b24616d572ee2e5095298b7db502a6888d918614e45c9b1946e\n$ ls -l hp/assets\ntotal 24\n-rw-r--r--  1 jay  wheel  1217 Oct 28 11:09 private.der\n-rw-r--r--  1 jay  wheel   294 Oct 28 11:09 public.der\n-rw-r--r--  1 jay  wheel  1970 Oct 28 11:09 rri.crt\n$ openssl pkey -inform DER -in hp/assets/private.der -noout -text | head -1\nPrivate-Key: (2048 bit, 2 primes)\n$ grep -n \"private.der\" hp/smali/hpandro/android/security/ui/activity/task/encryption/RSAActivity.smali\n590:    const-string v0, \"private.der\"",
      expect: "0 for the META-INF signature grep, v1 false / v2 true from apksigner, and Private-Key: (2048 bit) out of assets/private.der.",
      expectNote: "An empty <code>META-INF</code> does not mean unsigned - run <code>apksigner</code> before writing either way. A private key in <code>assets/</code> is only a finding once you show the call site: here the app loads it to do RSA itself, so every install shares one key.",
      refs: [{"label": "apksigner", "url": "https://developer.android.com/tools/apksigner"}, {"label": "App resources overview", "url": "https://developer.android.com/guide/topics/resources/providing-resources"}]
    },
    {
      id: "db",
      title: "Pull a database and read it with sqlite3",
      why: "The clearest finding in Android is usually a SQLite file in the app's own directory with a column called password.",
      concept: "<code>run-as</code> drops you into the app's uid, so its 0700 data directory becomes readable - but only for a <b>debuggable</b> app, and only if the OEM sepolicy lets the shell switch context. When it does not, the same command runs through <code>su</code>.",
      see: "Four first-party databases plus three SDK ones. <code>user_profiles</code> is plain TEXT - name, email, mobile - and one row still holds the SQL injection payload that was typed at the app. The archive ships no <code>.db</code>, <code>.sqlite</code> or keystore at all: every one of these was created at runtime, so the device copy is the only copy.",
      cmd: "export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"\nadb -s \"$SERIAL\" shell run-as com.BugBazaar ls -l databases\nadb -s \"$SERIAL\" shell su -c \"run-as com.BugBazaar ls -l databases\"\nadb -s \"$SERIAL\" shell run-as hpandro.android.security ls\nadb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/AddressDB\" > AddressDB\nadb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/UserProfileDatabase\" > UserProfileDatabase\nfile AddressDB UserProfileDatabase\nsqlite3 AddressDB \".tables\"\nsqlite3 AddressDB \".schema addresses\"\nsqlite3 -header -column AddressDB \"select id,nickname,address from addresses limit 3;\"\nsqlite3 -header -column UserProfileDatabase \"select name,email,mobile from user_profiles;\"\nunzip -l \"$APK_B\" | grep -icE \"\\.db$|\\.sqlite$|\\.keystore|\\.bks\"",
      sim: "$ export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"\nebb1e62d\n$ adb -s \"$SERIAL\" shell run-as com.BugBazaar ls -l databases\nseapp_context_lookup_internal:  No match for app with uid 10398, seinfo default:targetSdkVersion=32:fromRunAs, name com.BugBazaar\nselinux_android_setcontext:  Error setting context for app with uid 10398, seinfo default:targetSdkVersion=32:fromRunAs: Permission denied\nrun-as: couldn't set SELinux security context 'default:targetSdkVersion=32:fromRunAs': Permission denied\n$ adb -s \"$SERIAL\" shell su -c \"run-as com.BugBazaar ls -l databases\"\ntotal 148\n-rw-rw---- 1 u0_a398 u0_a398 20480 2026-10-11 12:00 AddressDB\n-rw------- 1 u0_a398 u0_a398     0 2026-10-11 12:00 AddressDB-journal\n-rw-rw---- 1 u0_a398 u0_a398 16384 2026-10-10 15:50 OrderHistory.db\n-rw------- 1 u0_a398 u0_a398     0 2026-10-10 15:50 OrderHistory.db-journal\n-rw-rw---- 1 u0_a398 u0_a398 20480 2026-10-10 15:47 UserProfileDatabase\n-rw------- 1 u0_a398 u0_a398     0 2026-10-10 15:19 UserProfileDatabase-journal\n-rw-rw---- 1 u0_a398 u0_a398 20480 2026-10-10 15:51 cart.db\n-rw------- 1 u0_a398 u0_a398     0 2026-10-10 15:20 cart.db-journal\n-rw-rw---- 1 u0_a398 u0_a398 57344 2026-10-10 15:19 com.google.android.datatransport.events\n-rw------- 1 u0_a398 u0_a398     0 2026-10-10 15:19 com.google.android.datatransport.events-journal\n-rw-rw---- 1 u0_a398 u0_a398 16384 2026-10-28 07:59 evernote_jobs.db\n-rw------- 1 u0_a398 u0_a398     0 2026-10-28 07:59 evernote_jobs.db-journal\n$ adb -s \"$SERIAL\" shell run-as hpandro.android.security ls\nrun-as: package not debuggable: hpandro.android.security\n$ adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/AddressDB\" > AddressDB\n$ adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/databases/UserProfileDatabase\" > UserProfileDatabase\n$ file AddressDB UserProfileDatabase\nAddressDB:           SQLite 3.x database, user version 1, last written using SQLite version 3050006, file counter 3, database pages 5, cookie 0x2, schema 4, largest root page 5, UTF-8, version-valid-for 3\nUserProfileDatabase: SQLite 3.x database, user version 1, last written using SQLite version 3050006, file counter 6, database pages 5, cookie 0x2, schema 4, largest root page 5, UTF-8, version-valid-for 6\n$ sqlite3 AddressDB \".tables\"\naddresses         android_metadata\n$ sqlite3 AddressDB \".schema addresses\"\nCREATE TABLE addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, nickname TEXT, address TEXT);\n$ sqlite3 -header -column AddressDB \"select id,nickname,address from addresses limit 3;\"\nid  nickname                    address                                                                                     \n--  --------------------------  --------------------------------------------------------------------------------------------\n1   0xSuper_Secret0x Address-1  21 Jump Street, Camp road, Pune, Pin-411011, India                                          \n2   Home                        Dunder Mifflin,1725 Slough Avenue, Suite 200, Scranton, Pennsylvania                        \n3   Office                      Ved InfoSec Consulting, 5th floor, Business Bay Tower, Milky Way Galaxy, Observable Universe\n$ sqlite3 -header -column UserProfileDatabase \"select name,email,mobile from user_profiles;\"\nname             email              mobile        \n---------------  -----------------  --------------\nVedant Wayal'--  careers@payatu.io  +91-9988776655\n$ unzip -l \"$APK_B\" | grep -icE \"\\.db$|\\.sqlite$|\\.keystore|\\.bks\"\n0",
      expect: "sqlite3 prints the addresses schema and three real rows, and user_profiles returns careers@payatu.io with +91-9988776655.",
      expectNote: "hpAndro answers <code>run-as: package not debuggable</code>, and that is the whole answer for a release build - it is why <code>debuggable</code> is a finding and not a nuisance. Do not promise an <code>adb backup</code> fallback in the report; on this device the read paths are root, or a provider the app exports.",
      refs: [{"label": "SQLiteDatabase", "url": "https://developer.android.com/reference/android/database/sqlite/SQLiteDatabase"}, {"label": "MASTG: insecure data storage", "url": "https://mas.owasp.org/MASTG/tests/android/MASVS-STORAGE/MASTG-TEST-0001/"}]
    },
    {
      id: "providers-static",
      title: "Find the provider's class and read its SQL",
      why: "The manifest gives you an authority and a class name; the decoded tree gives you the method body that decides whether that authority is guarded.",
      concept: "A <code>ContentProvider</code> is four methods. Read <code>query()</code> first: whatever arrives as <code>selection</code> goes into the WHERE clause, and any real check has to appear in the method body - the manifest attribute is the only other place a guard can live.",
      see: "<code>str + \" AND nickname NOT LIKE '%0xSuper_Secret0x%'\"</code> - caller input concatenated into SQL, and a hidden-row filter that a trailing <code>--</code> deletes. Neither provider class contains a single permission call: 0 and 0.",
      cmd: "grep -n \"provider android\" bb/AndroidManifest.xml\nfind bb -name \"AddressContentProvider*\" -o -name \"UserProfileProvider*\"\njadx -d jx-prov --single-class com.BugBazaar.ui.addresses.AddressContentProvider \"$APK_B\" 2>&1 | tail -2\nsed -n \"/public Cursor query/,/^    }/p\" jx-prov/sources/com/BugBazaar/ui/addresses/AddressContentProvider.java\ngrep -cE \"enforceCallingOrSelfPermission|checkCallingPermission|checkSelfPermission\" bb/smali/com/BugBazaar/ui/addresses/AddressContentProvider.smali bb/smali/com/BugBazaar/provider/UserProfileProvider.smali",
      sim: "$ grep -n \"provider android\" bb/AndroidManifest.xml\n78:        <provider android:authorities=\"com.BugBazaar.UserProfile\" android:enabled=\"true\" android:exported=\"true\" android:name=\"com.BugBazaar.provider.UserProfileProvider\" android:readPermission=\"@string/app_name\"/>\n79:        <provider android:authorities=\"com.bugbazaar.mycontacts\" android:exported=\"true\" android:name=\"com.BugBazaar.provider.MyContactsProvider\" android:permission=\"com.BugBazaar.permission.contact\"/>\n80:        <provider android:authorities=\"com.bugbazaar.provider.addresses\" android:exported=\"true\" android:name=\"com.BugBazaar.ui.addresses.AddressContentProvider\"/>\n116:        <provider android:authorities=\"com.BugBazaar.androidx-startup\" android:exported=\"false\" android:name=\"androidx.startup.InitializationProvider\">\n187:        <provider android:authorities=\"com.BugBazaar.firebaseinitprovider\" android:directBootAware=\"true\" android:exported=\"false\" android:initOrder=\"100\" android:name=\"com.google.firebase.provider.FirebaseInitProvider\"/>\n204:        <provider android:authorities=\"com.BugBazaar.com.squareup.picasso\" android:exported=\"false\" android:name=\"com.squareup.picasso.PicassoProvider\"/>\n$ find bb -name \"AddressContentProvider*\" -o -name \"UserProfileProvider*\"\nbb/smali/com/BugBazaar/ui/addresses/AddressContentProvider.smali\nbb/smali/com/BugBazaar/provider/UserProfileProvider.smali\nbb/smali/com/BugBazaar/provider/UserProfileProvider$DatabaseHelper.smali\n$ jadx -d jx-prov --single-class com.BugBazaar.ui.addresses.AddressContentProvider \"$APK_B\" 2>&1 | tail -2\nINFO  - Saving class 'com.BugBazaar.ui.addresses.AddressContentProvider' to file '/private/tmp/staticwork/jx-prov/sources/com/BugBazaar/ui/addresses/AddressContentProvider.java'\nINFO  - done\n$ sed -n \"/public Cursor query/,/^    }/p\" jx-prov/sources/com/BugBazaar/ui/addresses/AddressContentProvider.java\n    public Cursor query(Uri uri, String[] strArr, String str, String[] strArr2, String str2) {\n        String str3;\n        SQLiteDatabase readableDatabase = this.dbHelper.getReadableDatabase();\n        if (str != null && !str.isEmpty()) {\n            str3 = str + \" AND nickname NOT LIKE '%0xSuper_Secret0x%'\";\n        } else {\n            str3 = \"nickname NOT LIKE '%0xSuper_Secret0x%'\";\n        }\n        Cursor cursorQuery = readableDatabase.query(AddressContract.AddressEntry.TABLE_NAME, strArr, str3, strArr2, null, null, str2);\n        cursorQuery.setNotificationUri(getContext().getContentResolver(), uri);\n        return cursorQuery;\n    }\n$ grep -cE \"enforceCallingOrSelfPermission|checkCallingPermission|checkSelfPermission\" bb/smali/com/BugBazaar/ui/addresses/AddressContentProvider.smali bb/smali/com/BugBazaar/provider/UserProfileProvider.smali\nbb/smali/com/BugBazaar/ui/addresses/AddressContentProvider.smali:0\nbb/smali/com/BugBazaar/provider/UserProfileProvider.smali:0",
      expect: "the jadx excerpt shows the concatenation, and grep counts 0 permission checks in both provider classes.",
      expectNote: "The <code>NOT LIKE</code> clause is a filter, not a control: it is appended after the caller's predicate, so <code>selection=\"1=1 --\"</code> comments it out of the query. That is what makes the <code>0xSuper_Secret0x</code> rows reachable in Module 2 - the manifest alone never proves a leak.",
      refs: [{"label": "ContentProvider", "url": "https://developer.android.com/reference/android/content/ContentProvider"}, {"label": "MASTG: exported components", "url": "https://mas.owasp.org/MASTG/tests/android/MASVS-PLATFORM/MASTG-TEST-0024/"}]
    },
    {
      id: "storage",
      title: "Read what the app writes, and where it can go",
      why: "SharedPreferences is where the login usually ends up, and MODE_PRIVATE protects it from other apps - not from a backup, a rooted device, or a reader of your report.",
      concept: "Three separate questions: what is in the file, who can read it, and does it leave the device. The file and its mode answer the first two; <code>allowBackup</code> and the backup-rules XML answer the third.",
      see: "<code>userCred.xml</code> holds admin / BugBazaarSeccool in clear text, written by a plain <code>putString</code> pair. Both apps set <code>allowBackup=\"true\"</code>, and BugBazaar's <code>backup_rules.xml</code> is an empty <code>&lt;full-backup-content /&gt;</code> - nothing is excluded.",
      cmd: "export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"\nadb -s \"$SERIAL\" shell su -c \"ls -l /data/data/com.BugBazaar/shared_prefs\"\nadb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/user_auth.xml\"\nadb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/userCred.xml\"\ngrep -n \"USER_PREFERENCES\\|USER_DATA\" bb/smali/com/BugBazaar/controller/UserAuthSave.smali | head -2\nsed -n \"244,262p\" bb/smali/com/BugBazaar/controller/UserAuthSave.smali\ngrep -Ho 'android:allowBackup=\"[^\"]*\"\\|android:fullBackupContent=\"[^\"]*\"\\|android:dataExtractionRules=\"[^\"]*\"' bb/AndroidManifest.xml hp/AndroidManifest.xml\ncat bb/res/xml/backup_rules.xml\ngrep -n \"getSharedPreferences\\|putString\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/SharedPreferencesTaskActivity.smali\ngrep -n \"getExternalFilesDir\\|FileOutputStream\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/ExternalStorageActivity.smali\ngrep -rl \"MODE_WORLD_READABLE\" hp/smali bb/smali | wc -l",
      sim: "$ export SERIAL=$(adb devices | awk '$2==\"device\"{print $1; exit}'); echo \"$SERIAL\"\nebb1e62d\n$ adb -s \"$SERIAL\" shell su -c \"ls -l /data/data/com.BugBazaar/shared_prefs\"\ntotal 40\n-rw-rw---- 1 u0_a398 u0_a398 611 2026-10-11 11:55 AwOriginVisitLoggerPrefs.xml\n-rw-rw---- 1 u0_a398 u0_a398 651 2026-10-28 09:36 FirebaseHeartBeatW0RFRkFVTFRd+MToxMzU3NzE5MjQ0NDg6YW5kcm9pZDo1N2VhYjM0YzM1YTMwODhmZGJhZDg1.xml\n-rw-rw---- 1 u0_a398 u0_a398 118 2026-10-10 15:19 MyAppPreferences.xml\n-rw-rw---- 1 u0_a398 u0_a398 277 2026-10-10 15:41 SessionStorage.xml\n-rw-rw---- 1 u0_a398 u0_a398 360 2026-10-11 16:57 WebViewChromiumPrefs.xml\n-rw-rw---- 1 u0_a398 u0_a398 364 2026-10-10 15:19 com.google.android.gms.appid.xml\n-rw-rw---- 1 u0_a398 u0_a398 169 2026-10-10 15:19 com.google.firebase.inappmessaging.xml\n-rw-rw---- 1 u0_a398 u0_a398 137 2026-10-10 15:19 com.google.firebase.messaging.xml\n-rw-rw---- 1 u0_a398 u0_a398 167 2026-10-10 15:41 userCred.xml\n-rw-rw---- 1 u0_a398 u0_a398 162 2026-10-10 15:41 user_auth.xml\n$ adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/user_auth.xml\"\n<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n    <boolean name=\"passcode_flag\" value=\"true\" />\n    <string name=\"passcode\">1234</string>\n</map>\n$ adb -s \"$SERIAL\" exec-out su -c \"cat /data/data/com.BugBazaar/shared_prefs/userCred.xml\"\n<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n    <string name=\"password\">BugBazaarSeccool</string>\n    <string name=\"username\">admin</string>\n</map>\n$ grep -n \"USER_PREFERENCES\\|USER_DATA\" bb/smali/com/BugBazaar/controller/UserAuthSave.smali | head -2\n13:.field private static final USER_DATA:Ljava/lang/String; = \"userCred\"\n15:.field private static final USER_PREFERENCES:Ljava/lang/String; = \"user_auth\"\n$ sed -n \"244,262p\" bb/smali/com/BugBazaar/controller/UserAuthSave.smali\n\n    .line 77\n    const-string p1, \"password\"\n\n    invoke-interface {v0, p1, p2}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;\n\n    .line 78\n    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V\n\n    return-void\n.end method\n$ grep -Ho 'android:allowBackup=\"[^\"]*\"\\|android:fullBackupContent=\"[^\"]*\"\\|android:dataExtractionRules=\"[^\"]*\"' bb/AndroidManifest.xml hp/AndroidManifest.xml\nbb/AndroidManifest.xml:android:allowBackup=\"true\"\nbb/AndroidManifest.xml:android:dataExtractionRules=\"@xml/data_extraction_rules\"\nbb/AndroidManifest.xml:android:fullBackupContent=\"@xml/backup_rules\"\nhp/AndroidManifest.xml:android:allowBackup=\"true\"\n$ cat bb/res/xml/backup_rules.xml\n<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<full-backup-content />\n$ grep -n \"getSharedPreferences\\|putString\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/SharedPreferencesTaskActivity.smali\n321:    invoke-virtual {v0, v1, v2}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;\n337:    invoke-interface {v0, v1, p1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;\n$ grep -n \"getExternalFilesDir\\|FileOutputStream\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/ExternalStorageActivity.smali\n380:    invoke-virtual {p0, v1}, Lhpandro/android/security/ui/activity/task/datastorage/ExternalStorageActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;\n393:    new-instance v1, Ljava/io/FileOutputStream;\n395:    invoke-direct {v1, v0}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V\n410:    invoke-virtual {v1, p1}, Ljava/io/FileOutputStream;->write([B)V\n413:    invoke-virtual {v1}, Ljava/io/FileOutputStream;->close()V\n$ grep -rl \"MODE_WORLD_READABLE\" hp/smali bb/smali | wc -l\n       0",
      expect: "two prefs files printing plaintext credentials, allowBackup=true on both, and backup rules that exclude nothing.",
      expectNote: "<code>MODE_WORLD_READABLE</code> returns 0 files in both APKs, and that is correct rather than reassuring: since API 24 it throws <code>SecurityException</code>, so its absence says nothing about storage. Judge the file's contents and <code>allowBackup</code> instead - and note hpAndro also writes its flag through <code>getExternalFilesDir()</code>, outside the sandbox.",
      refs: [{"label": "SharedPreferences", "url": "https://developer.android.com/training/data-storage/shared-preferences"}, {"label": "Auto Backup", "url": "https://developer.android.com/identity/data/autobackup"}]
    },
    {
      id: "logging",
      title: "Check what is logged and what is copied",
      why: "A token in logcat is readable over the cable and by anything holding READ_LOGS; the clipboard is readable by every app with no permission at all.",
      concept: "Count the calls to see the habit, then read the call site to see the data. The count is not the finding - the argument is.",
      see: "Only 6 of hpAndro's 151 <code>Log.d</code> calls are in its own package, and 11 of BugBazaar's 268 - the rest are Firebase and Play Services. hpAndro's own one passes <code>flag_ReverseFlag(...)</code> straight into <code>Log.d</code>, and UIBaseActivity copies arbitrary text to the clipboard.",
      cmd: "grep -rho \"Landroid/util/Log;->[a-z]*\" hp/smali | sort | uniq -c | sort -rn | head -4\nfor p in hp/smali/hpandro bb/smali/com/BugBazaar; do printf \"%s \" \"$p\"; grep -rho \"Landroid/util/Log;->d\" \"$p\" | wc -l; done\ngrep -n -B8 \"Log;->d\" hp/smali/hpandro/android/security/ui/activity/task/logs/LogsTaskActivity.smali | tail -9\nsed -n \"4755,4768p\" hp/smali/hpandro/android/security/utils/operation/UIBaseActivity.smali\ngrep -n \"getPrimaryClip\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/ClipBoardTaskActivity.smali",
      sim: "$ grep -rho \"Landroid/util/Log;->[a-z]*\" hp/smali | sort | uniq -c | sort -rn | head -4\n 378 Landroid/util/Log;->e\n 293 Landroid/util/Log;->w\n 159 Landroid/util/Log;->v\n 151 Landroid/util/Log;->d\n$ for p in hp/smali/hpandro bb/smali/com/BugBazaar; do printf \"%s \" \"$p\"; grep -rho \"Landroid/util/Log;->d\" \"$p\" | wc -l; done\nhp/smali/hpandro        6\nbb/smali/com/BugBazaar       11\n$ grep -n -B8 \"Log;->d\" hp/smali/hpandro/android/security/ui/activity/task/logs/LogsTaskActivity.smali | tail -9\n574-    goto :goto_1\n575-\n576-    .line 68\n577-    :cond_b\n578-    invoke-virtual {p0, p1}, Lhpandro/android/security/ui/activity/task/logs/LogsTaskActivity;->flag_ReverseFlag(Lcom/google/gson/JsonObject;)Ljava/lang/String;\n579-\n580-    move-result-object p1\n581-\n582:    invoke-static {v3, p1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I\n$ sed -n \"4755,4768p\" hp/smali/hpandro/android/security/utils/operation/UIBaseActivity.smali\n    const-string v0, \"Copied Text\"\n\n    .line 895\n    check-cast v0, Ljava/lang/CharSequence;\n\n    check-cast p2, Ljava/lang/CharSequence;\n\n    invoke-static {v0, p2}, Landroid/content/ClipData;->newPlainText(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Landroid/content/ClipData;\n\n    move-result-object p2\n\n    .line 896\n    invoke-virtual {p1, p2}, Landroid/content/ClipboardManager;->setPrimaryClip(Landroid/content/ClipData;)V\n$ grep -n \"getPrimaryClip\" hp/smali/hpandro/android/security/ui/activity/task/datastorage/ClipBoardTaskActivity.smali\n141:    invoke-virtual {p1}, Landroid/content/ClipboardManager;->getPrimaryClip()Landroid/content/ClipData;",
      expect: "a Log.d whose argument is a returned flag, plus the clipboard write and read sites.",
      expectNote: "This is the step where a raw count misleads: 268 against 151 looks like a verdict and is not. Filter to the app's own package first, then read the argument - and remember the clipboard direction runs both ways, since ClipBoardTaskActivity also reads what everyone else copied.",
      refs: [{"label": "android.util.Log", "url": "https://developer.android.com/reference/android/util/Log"}, {"label": "Copy and paste", "url": "https://developer.android.com/develop/ui/views/touch-and-input/copy-paste"}]
    },
    {
      id: "webview",
      title: "Read the WebView settings, not just the URL",
      why: "Six lines decide whether a WebView is a browser or a bridge into the app's files and Java objects.",
      concept: "Four things matter: <code>setJavaScriptEnabled</code>, <code>addJavascriptInterface</code>, the three file-access settings, and where <code>loadUrl</code>'s argument comes from. Three of those together are a remote path into the app.",
      see: "TermsAndConditionsActivity is exported, loads <code>getStringExtra(\"webViewUrl\")</code>, enables JavaScript and universal file access, and attaches a Java bridge named <code>Androidinterface</code>. The final <code>loadUrl</code> runs whatever the string is, on both branches of the host check.",
      cmd: "grep -rl \"setJavaScriptEnabled\" hp/smali bb/smali* | wc -l\njadx -d jx-tc --single-class com.BugBazaar.ui.TermsAndConditionsActivity \"$APK_B\" 2>&1 | tail -1\nsed -n \"46,62p\" jx-tc/sources/com/BugBazaar/ui/TermsAndConditionsActivity.java\nsed -n \"104,118p\" bb/smali/com/BugBazaar/ui/TermsAndConditionsActivity.smali\nsed -n \"363,372p\" hp/smali/hpandro/android/security/ui/activity/task/contentprovider/FileSystemExposeTaskActivity.smali\ngrep -n \"const/4 v1, 0x1\" hp/smali/hpandro/android/security/ui/activity/task/contentprovider/FileSystemExposeTaskActivity.smali | head -1",
      sim: "$ grep -rl \"setJavaScriptEnabled\" hp/smali bb/smali* | wc -l\n      14\n$ jadx -d jx-tc --single-class com.BugBazaar.ui.TermsAndConditionsActivity \"$APK_B\" 2>&1 | tail -1\nINFO  - done\n$ sed -n \"46,62p\" jx-tc/sources/com/BugBazaar/ui/TermsAndConditionsActivity.java\n\n    private void setupwebview(WebView webView) {\n        webView.setWebViewClient(new WebViewClient());\n        webView.setWebChromeClient(new WebChromeClient());\n        webView.getSettings().setJavaScriptEnabled(true);\n        webView.getSettings().setAllowUniversalAccessFromFileURLs(true);\n    }\n\n    private void startWebView(String str) {\n        if (str.startsWith(\"bugbazaar.com\")) {\n            this.webView.addJavascriptInterface(new JavaScriptInterface(), \"Androidinterface\");\n            this.webView.loadUrl(str);\n        } else if (str.endsWith(\".bugbazaar.com\")) {\n            CookieManager.getInstance().setCookie(str, getsessionid());\n        }\n        this.webView.loadUrl(str);\n    }\n$ sed -n \"104,118p\" bb/smali/com/BugBazaar/ui/TermsAndConditionsActivity.smali\n\n    new-instance v1, Lcom/BugBazaar/ui/TermsAndConditionsActivity$JavaScriptInterface;\n\n    const/4 v2, 0x0\n\n    invoke-direct {v1, p0, v2}, Lcom/BugBazaar/ui/TermsAndConditionsActivity$JavaScriptInterface;-><init>(Lcom/BugBazaar/ui/TermsAndConditionsActivity;Lcom/BugBazaar/ui/TermsAndConditionsActivity$1;)V\n\n    const-string v2, \"Androidinterface\"\n\n    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V\n\n    .line 69\n    iget-object v0, p0, Lcom/BugBazaar/ui/TermsAndConditionsActivity;->webView:Landroid/webkit/WebView;\n\n    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V\n$ sed -n \"363,372p\" hp/smali/hpandro/android/security/ui/activity/task/contentprovider/FileSystemExposeTaskActivity.smali\n\n    .line 104\n    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V\n\n    .line 105\n    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V\n\n    .line 106\n    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V\n$ grep -n \"const/4 v1, 0x1\" hp/smali/hpandro/android/security/ui/activity/task/contentprovider/FileSystemExposeTaskActivity.smali | head -1\n329:    const/4 v1, 0x1",
      expect: "the decompiled setupwebview/startWebView pair showing JS + universal file access + a named bridge, and hpAndro enabling all three file-access flags.",
      expectNote: "<code>startsWith(\"bugbazaar.com\")</code> is a prefix test, so <code>bugbazaar.com.evil.tld</code> passes it - and the unconditional <code>loadUrl</code> makes the test moot anyway. A host check that never parses the Uri is not a control; say which setting you are reporting and what it enables.",
      refs: [{"label": "WebSettings", "url": "https://developer.android.com/reference/android/webkit/WebSettings"}, {"label": "Security best practices", "url": "https://developer.android.com/privacy-and-security/security-tips"}]
    },
    {
      id: "crypto",
      title: "Name the algorithm, then follow the key",
      why: "ECB mode and a key shipped inside the APK are two separate findings, and both are provable from the decoded tree in a minute.",
      concept: "Read <code>Cipher.getInstance()</code> for the mode, then follow the <code>SecretKeySpec</code> argument back to where the bytes came from. If the trail ends at a resource id, resolve it with <code>aapt2</code> - the key is in the APK.",
      see: "<code>0x7f100091</code> resolves to <code>string/des_enc_pass</code> = <b>hpAndro1</b>, used as a DES key with <code>DES/ECB/ZeroBytePadding</code>. <code>0x7f100058</code> resolves to <code>string/aes_enc_pass</code> = <b>hpAndro</b>, loaded as <code>keyStr</code> for AES/CBC in the activity whose own text says <i>find 4 digit iv 0000 to 9999</i> - ten thousand candidates.",
      cmd: "aapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100091\"\ngrep -nE \"0x7f100091|DES/ECB|SecretKeySpec\" hp/smali/hpandro/android/security/ui/activity/task/encryption/DESTaskActivity.smali | head -6\naapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100058\"\ngrep -n -A6 \"0x7f100058\" hp/smali/hpandro/android/security/ui/activity/task/encryption/PredictableInitializationVectorActivity.smali | head -8\ngrep -nE \"0000 to 9999|AES/CBC/PKCS5Padding\" hp/smali/hpandro/android/security/ui/activity/task/encryption/PredictableInitializationVectorActivity.smali\ngrep -nE \"aes_enc_iv|aes_enc_pass|des_enc_pass\" hp/res/values/strings.xml\ngrep -rn \"0x7f100057\" hp/smali --include=*.smali | grep -v 'R$string' | wc -l\ngrep -rc \"AES/GCM\" hp/smali bb/smali* | grep -v \":0\" | head -3",
      sim: "$ aapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100091\"\n    resource 0x7f100091 string/des_enc_pass\n      () \"hpAndro1\"\n$ grep -nE \"0x7f100091|DES/ECB|SecretKeySpec\" hp/smali/hpandro/android/security/ui/activity/task/encryption/DESTaskActivity.smali | head -6\n437:    new-instance v2, Ljavax/crypto/spec/SecretKeySpec;\n443:    const v5, 0x7f100091\n463:    invoke-direct {v2, v3, v0}, Ljavax/crypto/spec/SecretKeySpec;-><init>([BLjava/lang/String;)V\n465:    const-string v0, \"DES/ECB/ZeroBytePadding\"\n472:    const-string v3, \"getInstance(\\\"DES/ECB/ZeroBytePadding\\\")\"\n604:    new-instance v2, Ljavax/crypto/spec/SecretKeySpec;\n$ aapt2 dump resources \"$APK_H\" | grep -A1 \"0x7f100058\"\n    resource 0x7f100058 string/aes_enc_pass\n      () \"hpAndro\"\n$ grep -n -A6 \"0x7f100058\" hp/smali/hpandro/android/security/ui/activity/task/encryption/PredictableInitializationVectorActivity.smali | head -8\n669:    const p1, 0x7f100058\n670-\n671-    .line 33\n672-    invoke-virtual {p0, p1}, Lhpandro/android/security/ui/activity/task/encryption/PredictableInitializationVectorActivity;->getString(I)Ljava/lang/String;\n673-\n674-    move-result-object p1\n675-\n$ grep -nE \"0000 to 9999|AES/CBC/PKCS5Padding\" hp/smali/hpandro/android/security/ui/activity/task/encryption/PredictableInitializationVectorActivity.smali\n94:    const-string v0, \"ivStr = find 4 digit iv 0000 to 9999\"\n338:    const-string p2, \"AES/CBC/PKCS5Padding\"\n533:    const-string p2, \"AES/CBC/PKCS5Padding\"\n540:    const-string v1, \"getInstance(\\\"AES/CBC/PKCS5Padding\\\")\"\n$ grep -nE \"aes_enc_iv|aes_enc_pass|des_enc_pass\" hp/res/values/strings.xml\n20:    <string name=\"_3des_enc_pass\">3hpAndro</string>\n90:    <string name=\"aes_enc_iv\">RaviRamesh</string>\n91:    <string name=\"aes_enc_pass\">hpAndro</string>\n148:    <string name=\"des_enc_pass\">hpAndro1</string>\n$ grep -rn \"0x7f100057\" hp/smali --include=*.smali | grep -v 'R$string' | wc -l\n       0\n$ grep -rc \"AES/GCM\" hp/smali bb/smali* | grep -v \":0\" | head -3\nhp/smali/hpandro/android/security/utils/keystore/KeystoreEncrypt.smali:2\nhp/smali/hpandro/android/security/utils/keystore/KeystoreDecrypt.smali:2\nbb/smali_classes2/com/razorpay/CryptLib.smali:1",
      expect: "both resource ids resolve to literal keys, and the cipher strings name ECB and a CBC IV you can brute-force.",
      expectNote: "<code>string/aes_enc_iv</code> exists but has 0 reads outside <code>R$string</code> - a leftover, not a finding, so do not write up a fixed IV from it. The same app's KeystoreEncrypt uses AES/GCM through the Android Keystore: quote the contrast, it shows the developers knew the right way.",
      refs: [{"label": "javax.crypto.Cipher", "url": "https://developer.android.com/reference/javax/crypto/Cipher"}, {"label": "Android Keystore", "url": "https://developer.android.com/training/articles/keystore"}]
    }
,
    {
      id: "jadx-gui",
      title: "Open the code in jadx-gui: search, do not scroll",
      why: "BugBazaar decompiles to over 8,600 Java files. You will not find the check by opening folders - you find it by searching for a string you already saw on screen, then walking the call graph.",
      concept: "jadx-gui gives you three things the command line does not: instant text search across every class, method and string constant; Find usages, which shows who calls a method and therefore whether it runs at startup; and Copy as frida snippet, which turns a selected class or method into a <code>Java.use(...)</code> starter block. That last one is the handoff from reading code to hooking it.",
      see: "The search hit lands on a dialog string, not on logic. Follow it up: the string is shown by <code>checkfrida()</code>, which ORs four static checks in another class. Find usages then tells you the whole chain runs from the splash screen, before you ever see a login form.",
      cmd: "# GUI - what you do with the mouse:\n#   jadx-gui lab-apps/BugBazaar_v1.2.1.apk\n#   Ctrl+Shift+F  ->  search for:  FRIDA\n#   open com.bug.hook.checkdetect -> checkfrida()\n#   right-click the method -> Find usages   (who calls it, and when)\n#   right-click the class / method -> Copy as frida snippet\n\n# the same evidence from the terminal, if you have no display:\njadx --no-res -d jx-bb \"$APK_B\" >/dev/null 2>&1\ngrep -rn \"FRIDA\" jx-bb/sources/com/bug/hook/\ngrep -n -A3 \"private boolean checkfrida\" jx-bb/sources/com/bug/hook/checkdetect.java\ngrep -rn \"new checkdetect()\" jx-bb/sources/com/",
      sim: "$ grep -rn \"FRIDA\" jx-bb/sources/com/bug/hook/\ncom/bug/hook/checkdetect.java:42:  this.alertDialogManager.showRootedDeviceAlert(context.getApplicationContext(), \"FRIDA\");\n\n$ grep -n -A3 \"private boolean checkfrida\" jx-bb/sources/com/bug/hook/checkdetect.java\n15:    private boolean checkfrida() {\n16-        return runtime.areFridaFilesPresent() || runtime.isFridaDetectedinmounts()\n17-            || runtime.isFridaServerRunning() || runtime.isFridaDetectedfile();\n18-    }\n\n$ grep -rn \"new checkdetect()\" jx-bb/sources/com/\ncom/BugBazaar/ui/SplashActivity.java:75:        new checkdetect().someMethod(this);",
      expect: "the string hit, the four-check method, and the splash-screen call site - in that order.",
      expectNote: "One search found a string; two clicks found the method that decides; Find usages proved it runs at startup. That order - string, method, caller - is how every detection is found, and it is the same for root, emulator and debugger checks.",
      refs: [{"label": "jadx (GUI and CLI)", "url": "https://github.com/skylot/jadx"}, {"label": "Frida JavaScript API", "url": "https://frida.re/docs/javascript-api/"}]
    },
    {
      id: "jadx-to-frida",
      title: "Turn what you found into the script Frida needs",
      why: "The inventory from the previous step is the deliverable; the hook is a consumer of it. This step converts class paths and method names into a script, and shows why the order of the hooks matters as much as their names.",
      concept: "A hook is three facts: the class, the method signature, and where the check is reached from. The first two come from jadx, the third from <b>Find usages</b>. Writing them down before touching Frida is what separates a script that fires from one that prints nothing and looks broken.",
      see: "The shipped script hooks ten places, not four: <code>someMethod()</code> short-circuits on <code>isEmulator() || AdbEnabled1(context)</code> before it ever calls <code>checkfrida()</code>, and <code>isEmulator</code> has two overloads. Hook only the four documented runtime checks and the app still blocks - correctly, and confusingly.",
      cmd: "# the class paths from jadx, written down before any hook exists:\n#   com.bug.hook.checkdetect.checkfrida()            private boolean, no args\n#   com.bug.hook.runtime.areFridaFilesPresent()     static boolean\n#   com.bug.hook.runtime.isFridaDetectedinmounts()  static boolean\n#   com.bug.hook.runtime.isFridaServerRunning()     static boolean\n#   com.bug.hook.runtime.isFridaDetectedfile()      static boolean\n#   com.bug.hook.emultorcheck.isEmulator()          static boolean  (plus a Context overload)\n#   com.bug.hook.AdbEnabled.AdbEnabled1(Context)    static boolean  <- reached FIRST\n\n# the finished script ships with the course; read it, then run it\nsed -n '1,40p' frida-scripts/offline/f5_bugbazaar_detection.js\n\n# run it in observe mode, then change MODE to \"bypass\" and run again\nfrida -H 127.0.0.1:27042 -f com.BugBazaar -l frida-scripts/offline/f5_bugbazaar_detection.js",
      sim: "$ sed -n '1,40p' frida-scripts/offline/f5_bugbazaar_detection.js\n/*\n * f5_bugbazaar_detection.js - read BugBazaar's four Frida checks, then switch them off\n * ...\n *   2. checkdetect.checkfrida() is a PRIVATE method that ORs four static calls:\n *          com.bug.hook.runtime.areFridaFilesPresent()\n *          com.bug.hook.runtime.isFridaDetectedinmounts()\n * ...\n\n$ frida -H 127.0.0.1:27042 -f com.BugBazaar -l frida-scripts/offline/f5_bugbazaar_detection.js\n[+] mode=observe, 10/10 hooks attached\n[obs] emultorcheck.isEmulator() real=false\n[obs] AdbEnabled.AdbEnabled1(Context) real=true",
      expect: "Ten hooks attached, and in observe mode the log stops after the two short-circuit checks - because <code>someMethod()</code> returns with a dialog there. In bypass mode the same run reaches all four <code>runtime</code> checks and <code>checkfrida()</code>, and the app reaches its dashboard.",
      expectNote: "Recorded on the API 34 image with switch2 enabled in App protection settings. Without that switch, <code>SplashActivity</code> goes straight to Signin and this script prints no check lines at all - the app has to be told to protect itself before there is anything to defeat.",
      refs: [{"label": "Frida: Java API", "url": "https://frida.re/docs/javascript-api/#java"}, {"label": "jadx", "url": "https://github.com/skylot/jadx"}]
    }
  ]
});
