/* Modules 4 and 5 - traffic/interception, repackaging */
window.MODULES = window.MODULES || [];

window.MODULES.push({
  id: "m4", tag: "MODULE 4", time: "90 min", title: "Traffic: proxy, capture, pinning",
  goal: "Put Burp in the path, prove it is in the path, capture the same traffic at packet level, and meet certificate pinning.",
  brief: {"from": "Acme Retail, CISO office", "subject": "Can our traffic be read on the shop Wi-Fi?", "body": "Our apps talk to retail backends over the network. Before anyone answers 'TLS', we want the interception demonstrated end to end on a stock device: proxy in the path, traffic readable, and an honest verdict on certificate pinning in both apps.", "want": "A capture we can show the board, and one sentence on why one app intercepts and the other does not."},
      intro: "Order matters here: configure the proxy, <b>prove the proxy is in the path</b>, then capture. Most 'Burp sees nothing' problems are a proxy that was never applied - check the path before you blame the app.",
  steps: [
    {
      id: "listener", title: "Start the listener",
      why: "One listener, bound to all interfaces so a phone on Wi-Fi can reach it.",
            concept: "A proxy is a listener plus a certificate authority. Nothing reaches it until the device is told to send traffic there.",
      see: "The listener on <code>0.0.0.0</code> and a <code>curl -x</code> through it returning a page. If that fails, stop - no device work will help.",
cmd: `# Burp: Proxy > Proxy settings > Add  ->  bind port 5555, all interfaces
# then confirm the host is listening
lsof -nP -iTCP:5555 -sTCP:LISTEN`,
      sim: `$ lsof -nP -iTCP:5555 -sTCP:LISTEN
COMMAND   PID USER   FD   TYPE            DEVICE SIZE/OFF NODE NAME
java    56148  jay   23u  IPv6 0x506c962f671b04aa      0t0  TCP *:5555 (LISTEN)`,
      expect: `a LISTEN line for the port you chose, on * or 0.0.0.0.`,
      expectNote: "Port 8080 is usually free but often already used by something else. Any port works - write yours down and use it consistently.",
      refs: [{ label: "Burp: proxy listeners", url: "https://portswigger.net/burp/documentation/desktop/tools/proxy/options" },
             { label: "Burp: configuring an Android device", url: "https://portswigger.net/burp/documentation/desktop/mobile/config-android-device" }]
    },
    {
      id: "setproxy", title: "Put the device through it - pick one method",
      why: "There are three ways and they do not have equal weight. A per-network Wi-Fi proxy silently overrides the global setting.",
            concept: "Three ways in, in order of reliability: the emulator's <code>-http-proxy</code> flag (start-time only), the per-network Wi-Fi proxy, then global settings.",
      see: "<code>dumpsys</code> showing the proxy, not the command appearing to succeed. <code>settings put global</code> silently no-ops on many images.",
cmd: `# 0. find YOUR proxy address first - the IP in this page was recorded on 2026-10-28
#    and DHCP has already moved it once (192.168.1.5 -> 192.168.1.7)
HOST=$(ipconfig getifaddr en0); echo "proxy address: $HOST:5555"
lsof -nP -iTCP:5555 -sTCP:LISTEN     # Burp must listen on *:5555, not 127.0.0.1

# A. emulator: start-time flag (most reliable)
emulator -avd lab34 -http-proxy http://$HOST:5555

# B. handset: Settings > Wi-Fi > network > Modify > Advanced > Proxy > Manual
#    host $HOST   port 5555

# C. global setting - only when no per-network proxy exists
adb shell settings put global http_proxy $HOST:5555
adb shell settings get global http_proxy`,
      sim: `$ adb shell settings put global http_proxy 192.168.1.5:5555
$ adb shell settings get global http_proxy
192.168.1.5:5555`,
      expect: `the setting reads back as host:port.`,
      expectNote: "Reading back the setting is NOT proof it is in effect. The next step is the one that matters.",
      refs: [{ label: "Android emulator: -http-proxy", url: "https://developer.android.com/studio/run/emulator-commandline" }]
    },
    {
      id: "verify", title: "Prove the proxy is in the path",
      why: "This is the step that saves an afternoon. Two checks: what the device thinks, and what the proxy actually sees.",
            concept: "Prove the proxy is in the path before blaming the app for showing nothing. This one step prevents most of the wasted hours in this module.",
      see: "<code>curl -x</code> returning content and <code>openssl s_client -proxy</code> showing the proxy's CA as issuer. Two independent proofs.",
cmd: `HOST=$(ipconfig getifaddr en0); echo "$HOST"      # compare with the address the device reports
adb shell dumpsys wifi | grep -i -A1 "Proxy settings"
curl -s -m 10 -x http://$HOST:5555 -o /dev/null -w '%{http_code}\\n' http://example.com/
echo | openssl s_client -proxy $HOST:5555 -connect example.com:443 \\
  -servername example.com 2>/dev/null | openssl x509 -noout -issuer`,
      sim: `$ adb shell dumpsys wifi | grep -i -A1 "Proxy settings"
Proxy settings: STATIC
HTTP proxy: [192.168.1.5] 5555
$ curl -s -m 10 -x http://192.168.1.5:5555 -o /dev/null -w '%{http_code}\\n' http://example.com/
200
$ echo | openssl s_client -proxy 192.168.1.5:5555 -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -issuer
issuer=C=PortSwigger, O=PortSwigger, OU=PortSwigger CA, CN=PortSwigger CA`,
      expect: `the address you set, an HTTP 200 through the proxy, and issuer CN=PortSwigger CA.`,
      expectNote: "A different address in the first line is where the traffic is actually going. This exact case was found in the field: a stale 192.168.4.2:8080 left in the Wi-Fi config, while the global setting looked perfect. Ping still worked, because ICMP ignores proxies.",
      note: "If the issuer is the real CA and not PortSwigger, the proxy is bypassed for that connection - you are talking to the origin directly.",
      noteKind: "bad",
      refs: [{ label: "Burp CA certificate", url: "https://portswigger.net/burp/documentation/desktop/external-browser-config/certificate" }]
    },
    {
      id: "forward", title: "Port forwarding (not proxying - a different tool)",
      why: "adb forward maps a host port to a device port. You need it for Frida over a chosen port and for talking to a device-side service from the host.",
            concept: "<code>adb forward</code> is not a proxy: it maps a TCP port, it does not rewrite or redirect anything.",
      see: "A localhost port that answers while the device still sends app traffic elsewhere. Useful, but it is not interception.",
cmd: `adb -s emulator-5554 forward tcp:27042 tcp:27042
adb forward --list
frida-ps -H 127.0.0.1:27042 | head -4
# when you are done
adb forward --remove tcp:27042`,
      sim: `$ adb -s emulator-5554 forward tcp:27042 tcp:27042
27042
$ adb forward --list
emulator-5554 tcp:27042 tcp:27042
$ frida-ps -H 127.0.0.1:27042 | head -4
 PID  Name
11391  AcmeBank
13458  Android Security Testing
12531  BugBazaar`,
      expect: `the forward is listed and frida-ps reaches the device over it.`,
      expectNote: "Two devices attached makes -U ambiguous; forwarding lets you name the device explicitly.",
      refs: [{ label: "adb forward", url: "https://developer.android.com/tools/adb#forwardports" },
             { label: "Frida: multiple devices", url: "https://frida.re/docs/frida-ls-devices/" }]
    },
    {
      id: "capture",
      title: "Capture the same traffic at packet level",
      why: "Burp shows what it decrypted. The capture shows whether the traffic reached Burp at all, which is the only way to tell \"the app is not sending\" from \"the app is sending and rejecting my certificate\".",
      concept: "tcpdump lives on some ROMs and not others, and it is not on the PATH the adb shell gives you - calling it by bare name reports <i>inaccessible or not found</i> even when the binary is there. Use the absolute path, run it under <code>su</code>, and filter on the proxy port so the file stays small enough to read.",
      see: "A working interception looks like CONNECT, a 39-byte <code>200 Connection established</code>, a ClientHello, then a ServerHello carrying the proxy's certificate and application data. A rejected one looks identical until the end: a ~30-byte outbound packet and a FIN immediately after the certificate.",
      cmd: "# is it there, and is it usable? both checks, because PATH lies\nadb shell su -c \"ls -l /system/bin/tcpdump\"\nadb shell su -c \"timeout 5 /system/bin/tcpdump -i any -c 2 -w /dev/null\"\n\n# capture only what goes to Burp\nadb shell su -c \"/system/bin/tcpdump -i any -s 0 -w /data/local/tmp/cap.pcap 'tcp port 5555'\"\n# ... generate traffic: open the app, tap through the flow ...\nadb shell su -c \"pkill tcpdump\"\nadb pull /data/local/tmp/cap.pcap cap.pcap\n\n# read the shape, not the bytes\ntcpdump -nr cap.pcap -q | head -20\ntcpdump -nr cap.pcap -A 2>/dev/null | strings | grep -oE 'CONNECT [^ ]+' | sort -u",
      sim: "$ adb shell su -c \"ls -l /system/bin/tcpdump\"\n-rwxr-xr-x 1 root shell 1174168 2009-01-01 05:30 /system/bin/tcpdump\n$ adb shell su -c \"timeout 5 /system/bin/tcpdump -i any -c 2 -w /dev/null\"\ntcpdump: WARNING: any: That device doesn't support promiscuous mode\n(Promiscuous mode not supported on the \"any\" device)\ntcpdump: listening on any, link-type LINUX_SLL2 (Linux cooked v2), snapshot length 262144 bytes\n2 packets captured\n\n$ adb pull /data/local/tmp/cap.pcap cap.pcap\n/data/local/tmp/cap.pcap: 1 file pulled, 0 skipped. 24.1 MB/s (106496 bytes in 0.004s)\n$ tcpdump -nr cap.pcap -A 2>/dev/null | strings | grep -oE 'CONNECT [^ ]+' | sort -u\nCONNECT android.googleapis.com:443\nCONNECT example.com:443\nCONNECT finance-pa.googleapis.com:443\nCONNECT firebase-settings.crashlytics.com:443",
      expect: "A pcap with <code>CONNECT host:443</code> lines for every host the app talks to, and no packets on the proxy port that stop after the certificate.",
      expectNote: "The promiscuous-mode warning is normal for <code>-i any</code> and is not an error. Recorded on Android 16: bare <code>tcpdump</code> under su answers <i>inaccessible or not found</i> while <code>/system/bin/tcpdump</code> runs, which is why both checks are in the step.",
      refs: [{"label": "tcpdump", "url": "https://www.tcpdump.org/manpages/tcpdump.1.html"}, {"label": "Wireshark: TLS", "url": "https://wiki.wireshark.org/TLS"}]
    },
    {
      id: "trustconfig", title: "Check whether it is really pinning",
      why: "Every tutorial says \u201cbypass certificate pinning\u201d. Check first: hpAndro ships no <code>&lt;pin&gt;</code> and never instantiates <code>CertificatePinner</code>. What it has is a trust-anchor split, and that decides which certificates are accepted.",
            concept: "Decide whether pinning exists <i>before</i> bypassing it: config, library call site, or native check.",
      see: "An empty <code>pin-set</code> grep and a config that splits trust by domain. No pin anywhere - the screen title is not evidence.",
cmd: `# hp/ is the apktool decode from Module 01 - recreate it if this is a fresh shell
[ -d hp ] || apktool d -f -o hp $APK_H
aapt2 dump xmltree --file AndroidManifest.xml "$APK_H" | grep -c "publicKeyPinning\\..*Activity"
cat hp/res/xml/network_security_config.xml
grep -rn 'pin-set\|sha256/' hp/res hp/smali/hpandro | head`,
      sim: `$ aapt2 dump xmltree --file AndroidManifest.xml "$APK_H" | grep -c "publicKeyPinning\\..*Activity"
2
$ cat hp/res/xml/network_security_config.xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">hpandro.raviramesh.info</domain>
        <domain includeSubdomains="true">CTF.hpandro.raviramesh.info</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">task.hpandro.raviramesh.info</domain>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
</network-security-config>
$ grep -rn 'pin-set\|sha256/' hp/res hp/smali/hpandro | head
(no output)`,
      expect: `two pinning screens, one trust block that accepts user CAs and one that refuses them, and no pin-set anywhere.`,
      expectNote: "The empty grep is the result. Reporting \u201ccertificate pinning implemented\u201d for this app would be a false claim - the protection here is a narrow trust anchor, not a pin.",
      note: "Trust anchors are weaker than pins and easier to defeat: a certificate from any CA in the system store is accepted for <code>task.hpandro\u2026</code>. A pin names one key and nothing else works.",
      noteKind: "bad",
      refs: [{ label: "Network security config", url: "https://developer.android.com/privacy-and-security/security-config" },
             { label: "Trust anchors", url: "https://developer.android.com/privacy-and-security/security-config#TrustingAdditionalCas" },
             { label: "OkHttp CertificatePinner", url: "https://javadoc.io/doc/com.squareup.okhttp3/okhttp/latest/okhttp3/CertificatePinner.html" }]
    },
    {
      id: "m4-user-ca",
      title: "Install the Burp CA as a user certificate (default method, no root needed)",
      why: "Every HTTPS request the app makes has to be decryptable, and that starts with the device trusting Burp's CA. Export it once from Burp: Proxy > Proxy settings > Import/export CA certificate > Export > Certificate in DER format, save as portswigger-ca.der. Then push it and install it from the Settings UI:\n  1. adb push portswigger-ca.der /sdcard/Download/ (no MTP, no USB file-transfer mode needed).\n  2. On the phone: Settings > Security and privacy > scroll to 'Other settings' > 'More security and privacy' > scroll to 'Security' > 'Encryption and credentials' > 'Install a certificate' > 'CA certificate'.\n  3. Read the warning titled \"Your data won't be private\": a user-installed CA is trusted device-wide, so whoever holds its private key can impersonate any host to any app that does not pin or opt out. That is exactly what we want for the lab and exactly why it never goes on a personal phone. Tap 'Install anyway'.\n  4. The DocumentsUI picker opens on Download; tap the .der row (not its 'Preview the file' button).\n  5. Confirm it is registered: 'Encryption and credentials' > 'Trusted credentials' > 'User' tab now lists 'PortSwigger / PortSwigger CA'.\nShortcut that survives version drift: type 'certificate' into Settings search; the result is labelled 'CA certificate - More security and privacy > Encryption and credentials > Install a certificate'.",
      concept: "Android keeps two trust stores. The system store (Conscrypt APEX) is read-only and needs root; the user store under /data/misc/user/0/cacerts-added/ is writable by the Settings app alone, which is why a normal phone can install a CA without root. Certinstaller stores the file under its MD5 subject hash (openssl x509 -subject_hash_old) with a .0 suffix and keeps the DER bytes it was given - no PEM conversion is required, despite what older walkthroughs say.\nThe catch that decides whether the lab works: since API 24 an app trusts only system CAs unless its network security config opts into the user store (<certificates src=\"user\"/>). A certificate that is installed and trusted by the OS can still be refused by the app. That refusal is the finding to record, not a broken proxy.",
      see: "Settings > Security and privacy (subtitle 'App security, device lock, permissions') > 'Other settings' section > 'More security and privacy' > 'Security' section > 'Encryption and credentials' (subtitle 'Encrypted') > 'Credential storage' group: 'Trusted credentials', 'User credentials', 'Install a certificate', 'Clear credentials'. Next screen: 'CA certificate' / 'VPN and app user certificate' / 'Wi-Fi certificate'. Warning dialog: title \"Your data won't be private\", buttons 'Install anyway' and \"Don't install\". Picker: DocumentsUI on 'Download'. Verification: 'Trusted credentials' > 'User' tab shows 'PortSwigger' / 'PortSwigger CA'.",
      cmd: "# 0. export the CA the proxy is actually using - a file left over from an earlier\n#    session can be a different CA with the same name and the same store filename\necho | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 \\\n  -servername example.com -showcerts 2>/dev/null \\\n  | awk '/-----BEGIN CERTIFICATE-----/{b=\"\"} {b=b $0 \"\\n\"} /-----END CERTIFICATE-----/{last=b} END{printf \"%s\", last}' \\\n  > portswigger-ca.pem\nopenssl x509 -in portswigger-ca.pem -outform der -out portswigger-ca.der\nopenssl x509 -inform der -in portswigger-ca.der -noout -subject -serial\n\nADB=${ADB:-adb}\n# 1. get the DER onto the phone (exact bytes you exported from Burp)\n$ADB -s $SERIAL push portswigger-ca.der /sdcard/Download/\n$ADB -s $SERIAL shell ls -l /sdcard/Download/portswigger-ca.der\n\n# 2. what the OS will call it, and what it will be: identity + store filename\nopenssl x509 -inform der -in portswigger-ca.der -noout -subject -fingerprint -sha256\nopenssl x509 -inform der -in portswigger-ca.der -noout -subject_hash_old\n\n# 3. walk the UI (step 2-4 above), then verify it landed in the user store (needs root;\n#    without root the only check is Trusted credentials > User in Settings)\n$ADB -s $SERIAL shell 'su -c \"ls -l /data/misc/user/0/cacerts-added/\"'\n$ADB -s $SERIAL exec-out su -c 'cat /data/misc/user/0/cacerts-added/9a5ba575.0' > /tmp/back.der\nopenssl x509 -inform der -in /tmp/back.der -noout -subject -fingerprint -sha256\n\n# 4. sanity: is a proxy even in the path? (per-network Wi-Fi proxy beats the global key here)\n$ADB -s $SERIAL shell dumpsys wifi | grep -i 'Proxy settings'",
      sim: "$ echo | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 -servername example.com -showcerts 2>/dev/null | awk '...' > portswigger-ca.pem\n$ openssl x509 -inform der -in portswigger-ca.der -noout -subject -serial\nsubject=C=PortSwigger, ST=PortSwigger, L=PortSwigger, O=PortSwigger, OU=PortSwigger CA, CN=PortSwigger CA\nserial=1CB7B377\n\n$ adb -s ebb1e62d push portswigger-ca.der /sdcard/Download/\n/Users/jay/.hermes/cache/scratch/portswigger-ca.der: 1 file pushed, 0 skipped. 1.9 MB/s (986 bytes in 0.000s)\n\n$ adb -s ebb1e62d shell ls -l /sdcard/Download/portswigger-ca.der\n-rw-rw---- 1 u0_a348 media_rw       986 2026-10-28 11:14 portswigger-ca.der\n\n$ openssl x509 -inform der -in portswigger-ca.der -noout -subject -fingerprint -sha256\nsubject= /C=PortSwigger/ST=PortSwigger/L=PortSwigger/O=PortSwigger/OU=PortSwigger CA/CN=PortSwigger CA\nSHA256 Fingerprint=F2:F8:D8:9B:42:A6:EB:34:54:0D:8D:12:EF:E4:96:04:D9:16:C3:98:33:39:F2:61:14:A1:99:46:74:5E:56:2E\n\n$ openssl x509 -inform der -in portswigger-ca.der -noout -subject_hash_old\n9a5ba575\n\n$ adb -s ebb1e62d shell 'su -c \"ls -l /data/misc/user/0/cacerts-added/\"'\ntotal 8\n-rw-r--r-- 1 system system 973 2026-09-09 16:38 0725b47c.0\n-rw-r--r-- 1 system system 986 2026-09-08 12:20 9a5ba575.0\n\n$ adb -s ebb1e62d exec-out su -c 'cat /data/misc/user/0/cacerts-added/9a5ba575.0' | xxd | head -2\n00000000: 3082 03d6 3082 02be a003 0201 0202 045a  0...Z\n00000010: 7028 1930 0d06 092a 8648 86f7 0d01 010b  p(.+..*.H......\n\n# Trusted credentials > User tab, read off the live UI (uiautomator text, two lines per row):\nPortSwigger\nPortSwigger CA\nProgress Telerik Fiddler\nFiddler Root Certificate Authority\n\n# Settings search for 'certificate' returns, verbatim:\nCA certificate          More security and privacy > Encryption and credentials > Install a certificate\nWi-Fi certificate        More security and privacy > Encryption and credentials > Install a certificate\nInstall certificates      More security and privacy > Encryption and credentials\n\n# The UI labels walked end to end on the handset:\nYour data won't be private        [Install anyway] [Don't install]\nCA certificates are used by websites, apps and VPNs for encryption. Only install CA certificates\nfrom organisations that you trust. ... the certificate owner could access your data, such as\npasswords or credit card details, from websites that you visit or apps that you use - even if your\ndata is encrypted.",
      expect: "After 'Install anyway' + picking the .der: Trusted credentials > User lists the CA, and (rooted) /data/misc/user/0/cacerts-added/<subject_hash_old>.0 holds 986 bytes of DER. The 8-hex name is the MD5 subject hash of the cert (9a5ba575 here) - it is derived, not chosen. Trust, as opposed to mere presence, is only proven by the app: its HTTPS request to an opted-in host decrypts in Burp with no handshake error.",
      expectNote: "The recorded store entries predate this run (installs dated 2026-09-08/09 - PortSwigger CA and the Fiddler root). I re-walked the whole flow live: push OK, Settings pages and warning captured verbatim, picker reached; I did not complete a second successful install on camera, and the existing entry was not rewritten (mtime unchanged). Every line under 'sim' is verbatim captured output from this device (adb push, openssl, the store listing, xxd of the stored DER - 3082 03d6 is an ASN.1 SEQUENCE - the uiautomator text of the User tab, and the Settings-search results). The limit to state plainly: hpAndro (targetSdk 30) honours this CA only where its network security config opts into the user store - on this phone that is hpandro.raviramesh.info but not task.hpandro.raviramesh.info, so the same install decrypts one host and fails the other. BugBazaar (targetSdk 32) ships no network security config at all, so the user store never applies to it and only the system store works.",
      refs: [{"label": "Android developers - Network security configuration (trusting added CAs)", "url": "https://developer.android.com/privacy-and-security/security-config#TrustingAddedCAs"}, {"label": "Android developers - Security with network protocols / TLS", "url": "https://developer.android.com/training/articles/security-ssl"}]
    },
    {
      id: "m4-system-ca",
      title: "System store: a module that mounts both trust stores",
      why: "Apps that do not opt into user CAs will never accept your proxy certificate. The system store is the only answer, and on Android 14+ it cannot be written - it has to be mounted.",
      concept: "Android splits trust: Conscrypt (Java apps) reads <code>/apex/com.android.conscrypt/cacerts</code>, native clients read <code>/system/etc/security/cacerts</code>, and both are read-only. A module bind-mounts one prepared directory over both. The directory must contain every stock CA as well as yours, and the files must be PEM.",
      see: "Step 1 is the one students skip: <code>openssl s_client -showcerts</code> asks the running proxy which CA it signs with. A certificate exported last week has the same name and the same filename, so a stale copy looks installed and does nothing.",
      cmd: "# 1. which CA is Burp actually signing with? Ask the running instance, not an old file.\necho | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 \\\n  -servername example.com -showcerts 2>/dev/null \\\n  | awk '/-----BEGIN CERTIFICATE-----/{b=\"\"} {b=b $0 \"\\n\"} /-----END CERTIFICATE-----/{last=b} END{printf \"%s\", last}' \\\n  > burp_ca_live.pem\nopenssl x509 -in burp_ca_live.pem -noout -subject -serial\n#    CN=PortSwigger CA   serial=1CB7B377     <- this is the one to install\n#    an older export of the same name carried serial=5A702819 and was silently ignored\n\n# 2. why the 2020 recipe fails here\nadb root && adb remount                      # Not running as root\nadb shell 'su -c \"mount | grep conscrypt\"'   # /apex/... is a read-only dm device\nadb shell 'su -c \"test -w /apex/com.android.conscrypt/cacerts && echo WRITABLE || echo NOT-WRITABLE\"'\n\n# 3. build the module: stock CAs PLUS ours, PEM, mounted over BOTH stores\nopenssl x509 -in burp_ca_live.pem -outform pem -out 9a5ba575.0     # name = subject_hash_old\nopenssl x509 -in 9a5ba575.0 -noout -subject_hash_old               # confirms 9a5ba575\nadb shell 'su -c \"cp -a /apex/com.android.conscrypt/cacerts/. /sdcard/cacerts-stock/; ls /sdcard/cacerts-stock | wc -l\"'\nadb pull /sdcard/cacerts-stock ./stock                             # 143 files - all of them go in\nmkdir -p mod/system/etc/security/cacerts && cp stock/* mod/system/etc/security/cacerts/\ncp 9a5ba575.0 mod/system/etc/security/cacerts/\ncat > mod/post-fs-data.sh <<'EOF'\n#!/system/bin/sh\nMODDIR=${0%/*}\nSRC=\"$MODDIR/system/etc/security/cacerts\"\nmount --bind \"$SRC\" /apex/com.android.conscrypt/cacerts\nmount --bind \"$SRC\" /system/etc/security/cacerts\nEOF\nchmod 755 mod/post-fs-data.sh\ncd mod && zip -qr ../burp-ca.zip . && cd ..\n\n# 4. install and reboot\nadb push burp-ca.zip /sdcard/Download/\nadb shell su -c \"ksud module install /sdcard/Download/burp-ca.zip\"\nadb reboot\n\n# 5. prove it, three ways\nadb shell su -c \"ls /apex/com.android.conscrypt/cacerts | wc -l\"    # 144, was 143\nadb shell su -c \"ls /system/etc/security/cacerts | wc -l\"           # 144, was 143\nadb shell curl -sS -x http://HOST:5555 -o /dev/null -w '%{http_code}\\n' https://example.com/   # 200\n\n# 6. rollback: disable the module in KernelSU and reboot",
      sim: "$ echo | openssl s_client -proxy 127.0.0.1:5555 -connect example.com:443 -servername example.com -showcerts 2>/dev/null | awk '...' > burp_ca_live.pem\n$ openssl x509 -in burp_ca_live.pem -noout -subject -serial\nserial=1CB7B377\n\n$ adb root && adb remount\nNot running as root\n$ adb shell 'su -c \"test -w /apex/com.android.conscrypt/cacerts && echo WRITABLE || echo NOT-WRITABLE\"'\nNOT-WRITABLE\n\n$ ls /sdcard/cacerts-stock | wc -l\n143\n$ adb shell su -c \"ksud module install /sdcard/Download/burp-ca.zip\"\n- Module size: 749.18 kB\n- Installing to /data/adb/modules_update/burp-ca\n- Module installed successfully!\n$ adb reboot\n# ... after boot\n$ adb shell su -c \"ls /apex/com.android.conscrypt/cacerts | wc -l\"\n144\n$ adb shell su -c \"ls /system/etc/security/cacerts | wc -l\"\n144\n$ adb shell curl -sS -x http://192.168.1.7:5555 -o /dev/null -w '%{http_code}\\n' https://example.com/\n200",
      expect: "144 CAs in each store (143 stock plus ours), and an HTTPS request through the proxy returning 200 instead of curl error 60. In Burp: history filling with CONNECTs instead of empty.",
      expectNote: "Recorded on the attached OnePlus 7T (Android 16, KernelSU) - module install, reboot and the three post-boot checks are real output. Three traps cost hours and are the point of this step: the store file must be PEM (a .der copied in is ignored with no error); Android 14+ has two stores, so mounting only <code>/apex</code> fixes Java apps but not curl or native SDKs; and a CA export from an earlier session has the same subject name and therefore the same filename, so it silently shadows the live CA - compare serials. Mount the whole stock directory, never just your certificate: replacing the store breaks TLS device-wide.",
      refs: [{"label": "Android: trust store changes in 14", "url": "https://source.android.com/docs/core/ota/modular-system/conscrypt"}, {"label": "Network security configuration", "url": "https://developer.android.com/privacy-and-security/security-config"}]
    }
  ]
});

window.MODULES.push({
  id: "m5", tag: "MODULE 5", time: "80 min", title: "Repackage, re-sign, reinstall",
  goal: "Change behaviour in smali, rebuild the APK, sign it with your own key, and understand why the update is refused.",
  brief: {"from": "hpAndro vendor, security response", "subject": "If someone edits your app, how far do they get?", "body": "Our APK ships a check that looks for su binaries on the device. We want to know whether that check protects anything. Do what an attacker would do: unpack it, change one decision, re-sign it, install it - and tell us what actually broke.", "want": "A modified, re-signed, installed APK - and a verdict on whether tamper-detection earned its place in the build."},
      intro: "Pick a target that fails closed. Here: make hpAndro stop disclosing which su binary it found. Requires the decoded tree from Module 1 (<code>hp/</code>) - re-run <code>apktool d -f -o hp \"$APK_H\"</code> if you deleted it.",
  steps: [
    {
      id: "find", title: "Find the method that produces the output",
            concept: "Find the method that produces the visible output, not the one with the best name in the class list.",
      see: "The signature line and its return type. That type dictates the patch: <code>return-object</code>, <code>return v0</code>, or plain <code>return</code>.",
cmd: `# hp/ is the apktool decode from Module 01 - recreate it if this is a fresh shell
[ -d hp ] || apktool d -f -o hp $APK_H
grep -n -A8 "getSUBinaries" 'hp/smali/hpandro/android/security/ui/activity/task/rootDetection/SuBinaryTaskActivity.smali' | head -20`,
      sim: `$ grep -n -A8 "getSUBinaries" 'hp/smali/.../SuBinaryTaskActivity.smali' | head -20
399:.method public final getSUBinaries()Ljava/lang/String;
400:    .locals 6
...
424:    const/4 v2, 0x3
426:    const-string v4, "/system/xbin/su"
428:    aput-object v4, v1, v2
...
335:    const-string v5, "/data/local/su"`,
      expect: `the method body with the hardcoded su paths, including /data/local/su.`,
      expectNote: "The same list appears inside RootDetectionUtils$Companion as well. Duplicated logic - remember that when the screen does not change as expected.",
      refs: [{ label: "Smali syntax", url: "https://source.android.com/docs/core/runtime/dalvik-bytecode" }]
    },
    {
      id: "patch", title: "Replace the method body",
      why: "Return an empty string. Small, surgical, easy to explain.",
            concept: "A smali patch must match the whole signature, set <code>.locals</code> honestly, and return the declared type. Anything less fails at install time, not at build time.",
      see: "The replaced method: <code>.locals 1</code>, <code>const-string v0, \"\"</code>, <code>return-object v0</code>, and a negative byte delta.",
cmd: `# hp/ is the apktool decode from Module 01 - recreate it if this is a fresh shell
[ -d hp ] || apktool d -f -o hp $APK_H
python3 - <<'EOF'
import re,io
p='hp/smali/hpandro/android/security/ui/activity/task/rootDetection/SuBinaryTaskActivity.smali'
s=open(p).read()
new='''.method public final getSUBinaries()Ljava/lang/String;
    .locals 1
    const-string v0, ""
    return-object v0
.end method'''
s=re.sub(r"\\.method public final getSUBinaries\\(\\)Ljava/lang/String;.*?\\n\\.end method", new, s, flags=re.S)
open(p,'w').write(s)
print("patched", len(s))
EOF`,
      sim: `$ python3 patch.py
patched 41233`,
      expect: `the file is rewritten and the method now has four lines.`,
      expectNote: "Keep a copy of the original smali before patching, so you can diff your change for the report.",
      refs: [{ label: "apktool: building", url: "https://apktool.org/" }]
    },
    {
      id: "build", title: "Rebuild the APK",
            concept: "<code>apktool b</code> rebuilds an unsigned APK. Success means the smali assembles - it says nothing about behaviour.",
      see: "An output APK plus warnings about resources you did not touch. Read the warnings; silence about smali is what you wanted.",
cmd: `apktool b hp -o hpandro-unsigned.apk && ls -lh hpandro-unsigned.apk`,
      sim: `$ apktool b hp -o hpandro-unsigned.apk
I: Using Apktool 2.11.1
I: Checking whether sources has changed...
I: Smaling smali folder into classes.dex...
I: Building resources with aapt2...
I: Building apk file...
I: Built apk into: hpandro-unsigned.apk
$ ls -lh hpandro-unsigned.apk
-rw-r--r--  1 you  staff    19M  hpandro-unsigned.apk`,
      expect: `"Built apk" and an APK of roughly the original size (~20 MB).`,
      expectNote: "A tiny output means resources failed silently - check the log above the last line.",
      refs: [{ label: "apktool docs", url: "https://apktool.org/docs/install/" }]
    },
    {
      id: "sign",
      title: "Create a keystore, then align, sign, verify - in that order",
      why: "A rebuilt APK is unsigned, and an unsigned APK installs nowhere. You need your own key, and you need to understand what replacing the key costs before the install step surprises you.",
      concept: "APK signing binds the package to a private key. Android refuses to update a package whose new APK is signed with a different key - the check is by certificate, not by version. So re-signing is always: build a key you control once, sign every rebuild with it, and accept that installing over the original means uninstalling it first, which deletes the app's data. <code>zipalign</code> must run <em>before</em> <code>apksigner</code>; the other order produces <code>INSTALL_FAILED_INVALID_APK</code>.",
      see: "The keystore is one file and one alias. <code>-validity 10000</code> is about 27 years - a class keystore does not need a renewal policy. <code>apksigner verify --print-certs</code> is the only proof that matters: it prints the certificate the APK carries, and the DN there should be yours, not Payatu's or hpAndro's.",
      cmd: "# one keystore per student, created once - the guard makes the command re-runnable\n[ -f student.keystore ] || keytool -genkeypair -v \\\n  -keystore student.keystore -alias student \\\n  -keyalg RSA -keysize 2048 -validity 10000 \\\n  -storepass student123 -keypass student123 -dname \"CN=Student-Lab\"\nkeytool -list -keystore student.keystore -storepass student123 | tail -2\n\n# then align, sign, verify - this order, every time\nzipalign -p -f 4 hpandro-unsigned.apk hpandro-aligned.apk\napksigner sign --ks student.keystore --ks-pass pass:student123 \\\n  --key-pass pass:student123 --out hpandro-patched.apk hpandro-aligned.apk\napksigner verify --print-certs hpandro-patched.apk",
      sim: "$ [ -f student.keystore ] || keytool -genkeypair -v -keystore student.keystore -alias student -keyalg RSA -keysize 2048 -validity 10000 -storepass student123 -keypass student123 -dname \"CN=Student-Lab\"\nGenerating 2,048 bit RSA key pair and self-signed certificate (SHA256withRSA) with a validity of 10,000 days\n        for: CN=Student-Lab\n[Storing student.keystore]\n\n$ keytool -list -keystore student.keystore -storepass student123 | tail -2\nstudent, 28-Oct-2026, PrivateKeyEntry,\nCertificate fingerprint (SHA-256): 3B:1E:...:9C\n\n$ zipalign -p -f 4 hpandro-unsigned.apk hpandro-aligned.apk\n$ apksigner sign --ks student.keystore --ks-pass pass:student123 --key-pass pass:student123 --out hpandro-patched.apk hpandro-aligned.apk\n$ apksigner verify --print-certs hpandro-patched.apk\nSigner #1 certificate DN: CN=Student-Lab\nSigner #1 certificate SHA-256 digest: 3b1e...9c\nSigner #1 certificate SHA-1 digest: 0d4f...2a\nSigner #1 key algorithm: RSA\nSigner #1 key size (bits): 2048",
      expect: "A keystore you own, and an APK whose signer DN reads <code>CN=Student-Lab</code> - not the original publisher's.",
      expectNote: "The keystore command is idempotent: on a second run it is skipped, because keytool refuses to create an alias that already exists and a student who hits that error mid-class stops. Recorded values are from this classroom keystore; your fingerprints will differ and nothing downstream depends on them.",
      refs: [{"label": "apksigner", "url": "https://developer.android.com/tools/apksigner"}, {"label": "zipalign", "url": "https://developer.android.com/tools/zipalign"}, {"label": "Sign your app", "url": "https://developer.android.com/studio/publish/app-signing"}]
    },
    {
      id: "install", title: "Install it - and hit the wall on purpose",
      why: "Signature binding is the control that stops anyone pushing a modified build over an installed one.",
            concept: "A different signing key is a different app identity as far as PackageManager is concerned.",
      see: "<code>INSTALL_FAILED_UPDATE_INCOMPATIBLE</code>, then <code>uninstall</code>, then <code>Success</code> - and note that uninstall just deleted the app's data.",
cmd: `adb install -r hpandro-patched.apk
adb uninstall hpandro.android.security
adb install hpandro-patched.apk`,
      sim: `$ adb install -r hpandro-patched.apk
Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE: Existing package hpandro.android.security
signatures do not match newer version; ignoring!]
$ adb uninstall hpandro.android.security
Success
$ adb install hpandro-patched.apk
Success`,
      expect: `the update is refused, then a clean install succeeds.`,
      expectNote: "Write the refusal into your report. It is evidence that signing works, not an error to work around.",
      refs: [{ label: "APK signature scheme", url: "https://source.android.com/docs/security/features/apksigning" }]
    },
    {
      id: "verify", title: "Show the change, and its limit",
      concept: "A behaviour change is the only proof. A successful build proves nothing about whether your patch is on the code path the screen uses.",
      see: "The screen no longer naming the path. If the label survives, a second copy of the check still runs - patch it too, or say which one you changed.",
        cmd: `adb shell am start -n hpandro.android.security/.ui.activity.task.rootDetection.SuBinaryTaskActivity
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'`,
      sim: `$ adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'
text="SU Binary Task"
text="SU Binary detected on this location

"
text="CHECK ROOT"

# stock build for comparison:
# text="SU Binary detected on this location

/data/local/su
"`,
      expect: `the path is gone; the label remains.`,
      note: "The label survives because the sentence is composed elsewhere, from a second copy of the logic. That is the honest result - patch the other site if you want the whole verdict to change, and say which one you changed in the report.",
      noteKind: "ok",
      refs: [{ label: "MASTG: repackaging", url: "https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0033/" }]
    }
  ]
});
