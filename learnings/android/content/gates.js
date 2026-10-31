/* One blank per step: the value that decides it. Generated from the step's own command - the token is a
 * substring of that command, so the answer can never disagree with what the page tells you to run. */
window.GATES = {
 "m0/shell": {
  "q": "Which APK file is hpAndro?",
  "token": "hpAndro_1.3.apk",
  "hint": "Stores the hpAndro APK path in APK_H; the variable keeps later commands short and survives paths with spaces."
 },
 "m0/avd": {
  "q": "What is the AVD name you create?",
  "token": "lab34",
  "hint": "Creates an AVD: -n names it lab34, -k selects the installed system image, -d gives it a pixel_5 hardware profile."
 },
 "m0/props": {
  "q": "What goes where the serial goes?",
  "token": "<serial>",
  "hint": "Prints the Android release string, 14 here. -s <serial> targets one device when several are attached; shell runs the read on the device."
 },
 "m0/root": {
  "q": "What goes where the serial goes?",
  "token": "<serial>",
  "hint": "Asks adbd to restart as root; works on a google_apis image and is refused on production builds. The comment marks the emulator case."
 },
 "m1/decode": {
  "q": "Which jadx flag stops it decoding resources?",
  "token": "--no-res",
  "hint": "Decompiles to Java: -d sets the output directory, --no-res skips resources so jadx finishes faster. Sources land in sources/."
 },
 "m1/manifest-facts": {
  "q": "Which aapt2 subcommand prints package facts?",
  "token": "badging",
  "hint": "Dumps package identity, min and target SDK and the first permissions; head -6 keeps the start of the sheet readable."
 },
 "m1/exported": {
  "q": "Which attribute value are you grepping for?",
  "token": "exported(0x01010010)=true",
  "hint": ""
 },
 "m1/resolve": {
  "q": "Which resource id does readPermission point at?",
  "token": "0x7f13001c",
  "hint": "Looks the id up in the resource table; -A2 shows the resource type and the string value stored against it."
 },
 "m1/secrets": {
  "q": "Which hpAndro activity carries the hardcoded secret?",
  "token": "HardcodedSecretTaskActivity",
  "hint": ""
 },
 "m1/files": {
  "q": "Which tool shows you the AXML is binary?",
  "token": "xxd",
  "hint": "Shows the manifest is binary XML: -p streams one member to stdout, xxd hex-dumps it, head -2 keeps the 03 00 08 00 magic."
 },
 "m1/db": {
  "q": "Which directory holds BugBazaar's SQLite files?",
  "token": "databases",
  "hint": "Deliberate negative control: run-as drops to the app uid, but sepolicy refuses the context switch here, proving the shell user cannot read t"
 },
 "m1/providers-static": {
  "q": "What string finds provider tags in the decoded manifest?",
  "token": "provider android",
  "hint": "Lists every provider element with its authority, exported flag and permission; -n prints line numbers so you can open the same entry."
 },
 "m1/storage": {
  "q": "Which directory holds the XML preference files?",
  "token": "shared_prefs",
  "hint": "Lists the prefs directory through root; the -rw-rw---- modes show that only the app uid and its group can read these files."
 },
 "m1/logging": {
  "q": "Which class does a logging call go through in smali?",
  "token": "Landroid/util/Log;",
  "hint": "-r recurses, -h drops filenames, -o prints only the match, so uniq -c counts each Log level across the whole smali tree."
 },
 "m1/webview": {
  "q": "Which webview setting are you searching for?",
  "token": "setJavaScriptEnabled",
  "hint": "-r recurses, -l lists filenames only, and the smali* glob covers the extra dex directories, so 14 files enable JavaScript."
 },
 "m1/crypto": {
  "q": "Which cipher mode does hpAndro use for its DES key?",
  "token": "DES/ECB",
  "hint": "-E enables the alternation, -n gives line numbers, so key id, key spec and cipher mode appear together; head -6 keeps six hits."
 },
 "m1/jadx-gui": {
  "q": "Which package holds the anti-tampering code?",
  "token": "com/bug/hook/",
  "hint": "Searches that package only: -r recurses, -n prints file and line, and the hit is a dialog string, not the deciding logic."
 },
 "m1/jadx-to-frida": {
  "q": "Which script observes BugBazaar's checks?",
  "token": "f5_bugbazaar_detection.js",
  "hint": "Prints the header, which carries the identification chain: string on screen, class in jadx, method, caller, and why the first branch short-c"
 },
 "m2/inventory": {
  "q": "What line prefix marks a provider in an aapt2 dump?",
  "token": "E: provider",
  "hint": "Counts the provider elements. The count is the cross-check for the device listing below: declared and registered should agree, and a gap mea"
 },
 "m2/leak": {
  "q": "Which authority is unprotected?",
  "token": "com.bugbazaar.provider.addresses",
  "hint": "Runs a provider query as uid 2000, a foreign app; --uri names the authority and table. Rows returned mean no guard at all."
 },
 "m2/trap": {
  "q": "Which authority is 'protected' by a label?",
  "token": "com.BugBazaar.UserProfile",
  "hint": "Queries the second provider with the same unprivileged identity; an empty result means no rows, not that permission was granted."
 },
 "m2/deeplink": {
  "q": "Which deeplink is the auth callback?",
  "token": "bugbazaar://externalAuthentication",
  "hint": "-W waits for the launch result, -a sets the VIEW action, -d supplies the URI: the same intent a browser can send."
 },
 "m2/launch": {
  "q": "Which hpAndro activity do you launch?",
  "token": ".ui.activity.task.rootDetection.SuBinaryTaskActivity",
  "hint": "Uses -n (explicit component) rather than an intent filter: an explicit start skips resolution and goes straight to the exported check."
 },
 "m3/server": {
  "q": "Which Frida release ABI do you pull for a 64-bit handset?",
  "token": "android-arm64",
  "hint": "The release archive is per-architecture: arm64 for a handset, x86_64 for most emulator images."
 },
 "m3/baseline": {
  "q": "Which path do you create to trip root detection?",
  "token": "/data/local/su",
  "hint": "Plants a harmless fake su at a path detectors check; without the file the check has nothing to find and the test proves nothing."
 },
 "m3/hook": {
  "q": "Which script bypasses the root check?",
  "token": "h1_root_detection_bypass.js",
  "hint": ""
 },
 "m3/inventory": {
  "q": "Which class holds the root-check helpers?",
  "token": "RootDetectionUtils$Companion",
  "hint": ""
 },
 "m3/digest": {
  "q": "Which script observes the digest calls?",
  "token": "f4_observe_hashes.js",
  "hint": "-H uses the forwarded port instead of picking a device, -f spawns so the hooks exist before the app draws its first frame, -l loads the agen"
 },
 "m3/stealth": {
  "q": "What do you rename frida-server to?",
  "token": "fsvc",
  "hint": "Copies the server under a name that does not contain 'frida', which is what areFridaFilesPresent() and the find-based checks look for. su be"
 },
 "m4/listener": {
  "q": "Which port must Burp be listening on?",
  "token": "5555",
  "hint": "Lists processes holding a listening TCP socket on port 5555; -nP keeps ports and addresses numeric, -iTCP filters by protocol, -sTCP:LISTEN "
 },
 "m4/setproxy": {
  "q": "Which port goes into the device proxy setting?",
  "token": "5555",
  "hint": "Prints this Mac's Wi-Fi address, because the device can only reach the proxy by an IP it is configured with, and DHCP reassigns it."
 },
 "m4/verify": {
  "q": "Which command shows the device's proxy setting?",
  "token": "dumpsys wifi",
  "hint": "Dumps Wi-Fi state and prints the proxy line plus one line after it; -A1 surfaces the actual host:port, which is what counts, not what you se"
 },
 "m4/forward": {
  "q": "Which serial does the forward name?",
  "token": "emulator-5554",
  "hint": "Maps host port 27042 to the same port on emulator-5554; -s names the device, which removes the ambiguity of -U with two devices attached."
 },
 "m4/capture": {
  "q": "Where does tcpdump live on the device?",
  "token": "/system/bin/tcpdump",
  "hint": "Looks for the binary at its absolute path. It exists on this ROM, and calling it by bare name still fails - the adb shell PATH does not incl"
 },
 "m4/trustconfig": {
  "q": "Which file decides whether a user CA is trusted?",
  "token": "network_security_config.xml",
  "hint": "Shows the config in full: one domain block trusting system plus user CAs, one trusting system only, and that split decides which host accept"
 },
 "m4/m4-user-ca": {
  "q": "Which tool proves the handshake through the proxy?",
  "token": "openssl",
  "hint": "Asks the running proxy to present its chain for an arbitrary host - the certificate Burp forges depends on the CA it holds, so this is the a"
 },
 "m5/find": {
  "q": "Which method does the su-binary challenge call?",
  "token": "getSUBinaries",
  "hint": "Prints the matching line number plus eight lines of body from the decoded smali; -A8 shows the method, -n gives the line, head caps output."
 },
 "m5/build": {
  "q": "What is the rebuilt APK called?",
  "token": "hpandro-unsigned.apk",
  "hint": "Rebuilds the hp directory into an unsigned APK at the -o path, then lists it; -lh gives human-readable size, which is how a broken build sho"
 },
 "m5/sign": {
  "q": "Which keystore signs the rebuilt APK?",
  "token": "student.keystore",
  "hint": "Creates the key only when the file is missing, so a second run is a no-op instead of an error."
 },
 "m5/install": {
  "q": "Which file do you install?",
  "token": "hpandro-patched.apk",
  "hint": "Installs over the existing package; -r permits reinstall, and it is refused with UPDATE_INCOMPATIBLE because the signing key differs from st"
 },
 "m5/verify": {
  "q": "Which tool dumps the screen to prove the result?",
  "token": "uiautomator",
  "hint": "Dumps the current screen to XML, then prints every text attribute; grep -o extracts just the label values for comparison with the stock buil"
 },
 "m6/mobsf": {
  "q": "Which image runs MobSF?",
  "token": "opensecurity/mobile-security-framework-mobsf:latest",
  "hint": "Fetches ~2 GB once. Pulling before class is the difference between a 3-minute step and a dead slot on conference Wi-Fi."
 },
 "m6/verify-scan": {
  "q": "Which authority do you reproduce the scanner's claim against?",
  "token": "com.BugBazaar.UserProfile",
  "hint": "Queries the provider as the shell user with no app permission; returned rows are real exposure, an exception means a guard is enforced."
 }
};
