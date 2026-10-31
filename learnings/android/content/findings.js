/* Findings for the manifest explorer. `lines` point at the aapt2 dump in files-manifests.js,
   `srcLine` at the upstream source in manifest-source.js. Both are real files, not sketches. */
window.FINDINGS = {
  "hpandro": {
    "label": "hpAndro 1.3",
    "pkg": "hpandro.android.security",
    "source": null,
    "findings": [
      {
        "id": "h-allowbackup",
        "sev": "med",
        "title": "allowBackup leaves app data exportable",
        "where": "<application>",
        "lines": [
          94
        ],
        "evidence": "  94  A: http://schemas.android.com/apk/res/android:allowBackup(0x01010280)=true",
        "why": "With backup allowed and no <code>fullBackupContent</code> rule, app-private data is in scope for backup.",
        "impact": "Honest scope: <code>adb backup</code> was removed in API 31+, so on the API 34 lab emulator you cannot pull data this way. On older devices, or through cloud backup, the flag is real.",
        "verify": "adb backup -f /tmp/hp.ab com.hpandro... (expect: not supported on API 31+)",
        "refs": [
          {
            "label": "allowBackup",
            "url": "https://developer.android.com/guide/topics/manifest/application-element#allowBackup"
          }
        ]
      },
      {
        "id": "h-cleartext",
        "sev": "high",
        "title": "Cleartext HTTP allowed, including in a task screen",
        "where": "<application> and FileSystemExposeTaskActivity",
        "lines": [
          98,
          122
        ],
        "evidence": "  98  A: http://schemas.android.com/apk/res/android:usesCleartextTraffic(0x010104ec)=true\n 122  A: http://schemas.android.com/apk/res/android:usesCleartextTraffic(0x010104ec)=true",
        "why": "<code>usesCleartextTraffic=true</code> at application level, and again on one activity - the per-activity copy is the signal that someone needed HTTP somewhere specific.",
        "impact": "Any HTTP request is readable and modifiable on the network without a proxy certificate.",
        "verify": "grep -n usesCleartextTraffic hp/AndroidManifest.xml",
        "refs": [
          {
            "label": "Network security config",
            "url": "https://developer.android.com/privacy-and-security/security-config"
          }
        ]
      },
      {
        "id": "h-ca",
        "sev": "high",
        "title": "Production host trusts user-installed CAs",
        "where": "res/xml/network_security_config.xml (apk L99)",
        "lines": [
          99
        ],
        "evidence": "  99  A: http://schemas.android.com/apk/res/android:networkSecurityConfig(0x01010527)=@0x7f130000\n\nres/xml/network_security_config.xml:\n  <domain-config cleartextTrafficPermitted=\"true\">\n    <domain includeSubdomains=\"false\">hpandro.raviramesh.info</domain>\n    <trust-anchors>\n      <certificates src=\"system\" />\n      <certificates src=\"user\" />      <-- any app can add a CA here\n    </trust-anchors>\n  </domain-config>",
        "why": "<code>&lt;certificates src=&quot;user&quot; /&gt;</code> means a CA installed by the user is trusted for that host.",
        "impact": "That is why a Burp CA added as a user certificate intercepts <code>hpandro.raviramesh.info</code> without any bypass, while <code>task.hpandro.raviramesh.info</code> - system anchors only - refuses it.",
        "verify": "cat hp/res/xml/network_security_config.xml",
        "refs": [
          {
            "label": "Trust anchors",
            "url": "https://developer.android.com/privacy-and-security/security-config#TrustingAdditionalCas"
          }
        ]
      },
      {
        "id": "h-hidden",
        "sev": "med",
        "title": "Exported activity with no permission",
        "where": "datastorage.HiddenActivity",
        "lines": [
          249
        ],
        "evidence": " 249  E: activity (line=160)\n 250  A: android:name(0x01010003)=\"hpandro.android.security.ui.activity.task.datastorage.HiddenActivity\" (Raw: \"hpandro.android.security.ui.activity.task.datastorage.HiddenActivity\")\n 251  A: android:exported(0x01010010)=true",
        "why": "One of the app's own activities is exported with no permission. Most of its challenge screens are not.",
        "impact": "Any installed app can start it directly, bypassing the intended entry path.",
        "verify": "adb shell am start -n hpandro.android.security/.ui.activity.task.datastorage.HiddenActivity",
        "refs": [
          {
            "label": "Exported activities",
            "url": "https://developer.android.com/privacy-and-security/risks/access-control-to-exported-components"
          }
        ]
      },
      {
        "id": "h-fp",
        "sev": "info",
        "title": "Two exports that look worse than they are",
        "where": "SystemJobService, FirebaseInstanceIdReceiver",
        "lines": [
          381,
          527
        ],
        "evidence": " 381  E: service (line=276)\n 382  A: android:name(0x01010003)=\"androidx.work.impl.background.systemjob.SystemJobService\" (Raw: \"androidx.work.impl.background.systemjob.SystemJobService\")\n 383  A: android:permission(0x01010006)=\"android.permission.BIND_JOB_SERVICE\" (Raw: \"android.permission.BIND_JOB_SERVICE\")\n 385  A: android:exported(0x01010010)=true\n 527  E: receiver (line=439)\n 528  A: android:name(0x01010003)=\"com.google.firebase.iid.FirebaseInstanceIdReceiver\" (Raw: \"com.google.firebase.iid.FirebaseInstanceIdReceiver\")\n 529  A: android:permission(0x01010006)=\"com.google.android.c2dm.permission.SEND\" (Raw: \"com.google.android.c2dm.permission.SEND\")\n 530  A: android:exported(0x01010010)=true",
        "why": "Both exported, both guarded by a signature-level system permission (<code>BIND_JOB_SERVICE</code>, <code>c2dm.permission.SEND</code>).",
        "impact": "A third-party app cannot obtain either permission, so these are not findings.",
        "verify": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_H\" | grep -B2 BIND_JOB_SERVICE",
        "refs": [
          {
            "label": "Permission levels",
            "url": "https://developer.android.com/guide/topics/manifest/permission-element#protectionLevel"
          }
        ]
      },
      {
        "id": "h-priv",
        "sev": "info",
        "title": "A permission a sideloaded app can never hold",
        "where": "<uses-permission> block",
        "lines": [
          19
        ],
        "evidence": "  19  E: uses-permission (line=14)",
        "why": "<code>READ_PRIVILEGED_PHONE_STATE</code> is signature|privileged - only preinstalled apps get it.",
        "impact": "The request always fails; dead weight, not a data path.",
        "verify": "aapt2 dump permissions \"$APK_H\" | grep PRIVILEGED",
        "refs": [
          {
            "label": "Permission levels",
            "url": "https://developer.android.com/guide/topics/permissions/overview"
          }
        ]
      },
      {
        "id": "h-target",
        "sev": "info",
        "title": "targetSdkVersion 30 - no platform defaults helping it",
        "where": "<manifest>",
        "lines": [
          12
        ],
        "evidence": "  12  A: http://schemas.android.com/apk/res/android:targetSdkVersion(0x01010270)=30",
        "why": "Under target 31+ the platform applies stricter defaults (exported requirements, package visibility, storage).",
        "impact": "Every hardening decision was left to the developer, and some were made the wrong way.",
        "verify": "aapt2 dump badging \"$APK_H\" | head -4",
        "refs": [
          {
            "label": "Behavior changes",
            "url": "https://developer.android.com/about/versions/12/behavior-changes-12"
          }
        ]
      }
    ]
  },
  "bugbazaar": {
    "label": "BugBazaar v1.2.1",
    "pkg": "com.BugBazaar",
    "source": "https://github.com/payatu/BugBazaar/blob/master/app/src/main/AndroidManifest.xml",
    "findings": [
      {
        "id": "debuggable",
        "sev": "high",
        "title": "Debuggable release - and the lint warning was suppressed",
        "where": "<application> (source L36, apk L96)",
        "lines": [
          96
        ],
        "srcLine": 36,
        "evidence": "source L36\n  36  android:debuggable=\"true\"\nsource L46  (same <application> tag)\n  46  tools:ignore=\"CustomPermissionTypo,HardcodedDebugMode\"\napk L96\n  96  A: http://schemas.android.com/apk/res/android:debuggable(0x0101000f)=true",
        "why": "A debuggable build lets anyone with ADB run code as the app. The developer knew: <code>tools:ignore=&quot;HardcodedDebugMode&quot;</code> silences exactly the lint check for this.",
        "impact": "Verified: <code>adb shell run-as com.BugBazaar id</code> returns <code>uid=10194(u0_a194)</code>, and <code>run-as com.BugBazaar ls databases</code> lists <code>AddressDB</code> and <code>UserProfileDatabase</code>. hpAndro answers <code>run-as: package not debuggable</code>. No root, no exploit.",
        "verify": "adb shell run-as com.BugBazaar ls -l databases shared_prefs",
        "refs": [
          {
            "label": "android:debuggable",
            "url": "https://developer.android.com/guide/topics/manifest/application-element#debug"
          }
        ]
      },
      {
        "id": "permtypo",
        "sev": "high",
        "title": "Custom permission typo: declared \"contacts\", required \"contact\"",
        "where": "<permission> L17 vs MyContactsProvider L116 (apk L29 vs L172)",
        "lines": [
          29,
          172
        ],
        "srcLine": 17,
        "evidence": "source L17-19  declared:\n  17  android:name=\"com.BugBazaar.permission.contacts\"\n  18  android:protectionLevel=\"signature\" />\n  19  \nsource L116  required by the provider:\n 116  android:permission=\"com.BugBazaar.permission.contact\" />\nsource L46  suppressed lint:\n  46  tools:ignore=\"CustomPermissionTypo,HardcodedDebugMode\"\napk L29 / L172  the same mismatch survives the build:\n  29  E: permission (line=20)\n 172  A: http://schemas.android.com/apk/res/android:permission(0x01010006)=\"com.BugBazaar.permission.contact\" (Raw: \"com.BugBazaar.permission.contact\")",
        "why": "The app declares <b>com.BugBazaar.permission.contacts</b> and the provider asks for <b>com.BugBazaar.permission.contact</b>. Two different strings. A permission that is required but never declared cannot be granted to anyone.",
        "impact": "<code>MyContactsProvider</code> is not protected by its signature permission - it is blocked only because the required permission does not exist. The declared signature permission protects nothing, and the two bugs cancel out untidily: any future rename in one place silently opens or breaks the provider. <code>tools:ignore=&quot;CustomPermissionTypo&quot;</code> is the lint rule that would have caught it.",
        "verify": "grep -n 'permission.contact' AndroidManifest.xml   # expect both spellings",
        "refs": [
          {
            "label": "Custom permissions",
            "url": "https://developer.android.com/guide/topics/manifest/permission-element"
          }
        ]
      },
      {
        "id": "addressprovider",
        "sev": "high",
        "title": "Content provider readable by every app",
        "where": "AddressContentProvider (apk L175)",
        "lines": [
          175
        ],
        "evidence": " 175  E: provider (line=170)\n 176  A: android:name(0x01010003)=\"com.BugBazaar.ui.addresses.AddressContentProvider\" (Raw: \"com.BugBazaar.ui.addresses.AddressContentProvider\")\n 177  A: android:exported(0x01010010)=true\n 178  A: android:authorities(0x01010018)=\"com.bugbazaar.provider.addresses\" (Raw: \"com.bugbazaar.provider.addresses\")",
        "why": "Exported with no <code>android:permission</code>, so any installed app can query it.",
        "impact": "Verified: <code>content query --uri content://com.bugbazaar.provider.addresses/addresses</code> returns the stored rows as uid 2000 (shell). No permission, no user interaction.",
        "verify": "adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses",
        "refs": [
          {
            "label": "Exported components",
            "url": "https://developer.android.com/privacy-and-security/risks/access-control-to-exported-components"
          }
        ]
      },
      {
        "id": "userprofile",
        "sev": "high",
        "title": "readPermission points at a string, not a permission",
        "where": "UserProfileProvider (source L111, apk L164)",
        "lines": [
          164,
          166
        ],
        "srcLine": 111,
        "evidence": "source L111  the literal, before the build resolves it:\n 111  android:readPermission=\"@string/app_name\" />\napk L164-169\n 164  E: provider (line=159)\n 165  A: android:name(0x01010003)=\"com.BugBazaar.provider.UserProfileProvider\" (Raw: \"com.BugBazaar.provider.UserProfileProvider\")\n 166  A: android:readPermission(0x01010007)=@0x7f13001c\n 168  A: android:exported(0x01010010)=true\n 169  A: android:authorities(0x01010018)=\"com.BugBazaar.UserProfile\" (Raw: \"com.BugBazaar.UserProfile\")",
        "why": "The source asks for <code>@string/app_name</code>, which resolves to the app's own label, <b>BugBazaar</b>. No such permission is declared, so nothing can be granted it.",
        "impact": "API 34: <code>content query --uri content://com.BugBazaar.UserProfile/userprofile</code> returns \"No result found.\" with nothing in logcat. Android 16: <code>SecurityException: ... requires BugBazaar, or grantUriPermission()</code>. Both fail - report the undefined permission, not a leak, and say which platform you tested.",
        "verify": "aapt2 dump resources \"$APK_B\" | grep -A3 0x7f13001c",
        "refs": [
          {
            "label": "Permission element",
            "url": "https://developer.android.com/guide/topics/manifest/permission-element"
          }
        ]
      },
      {
        "id": "deeplink",
        "sev": "med",
        "title": "Exported activity reachable from a URI",
        "where": "ExternalAuthLogin (source L50, apk L108)",
        "lines": [
          108,
          110,
          114,
          116
        ],
        "srcLine": 50,
        "evidence": "source L50-53\n  50  android:name=\".ExternalAuthLogin\"\n  51  android:exported=\"true\"\n  52  android:launchMode=\"singleTask\">\napk L108-116\n 108  E: activity (line=102)\n 109  A: android:name(0x01010003)=\"com.BugBazaar.ExternalAuthLogin\" (Raw: \"com.BugBazaar.ExternalAuthLogin\")\n 110  A: android:exported(0x01010010)=true\n 111  A: android:launchMode(0x0101001d)=2",
        "why": "Exported activity with a browsable intent filter: reachable from a web page or any app.",
        "impact": "Verified: <code>am start -a android.intent.action.VIEW -d &quot;bugbazaar://externalAuthentication&quot;</code> launches it from <code>uid 2000</code>. On the emulator it then crashes forwarding the intent - an observation, not impact.",
        "verify": "adb shell am start -a android.intent.action.VIEW -d \"bugbazaar://externalAuthentication\"",
        "refs": [
          {
            "label": "Deep links",
            "url": "https://developer.android.com/training/app-links/deep-linking"
          }
        ]
      },
      {
        "id": "cleartext",
        "sev": "med",
        "title": "Cleartext, legacy storage, and a suppressed storage warning",
        "where": "<application> (source L40/L45, apk L103/L106)",
        "lines": [
          103,
          106
        ],
        "srcLine": 40,
        "evidence": "source L8  (on MANAGE_EXTERNAL_STORAGE)\n   8  tools:ignore=\"ScopedStorage\" />\nsource L40 / L45\n  40  android:requestLegacyExternalStorage=\"true\"\n  45  android:usesCleartextTraffic=\"true\"\napk L103 / L106\n 103  A: http://schemas.android.com/apk/res/android:usesCleartextTraffic(0x010104ec)=true\n 106  A: http://schemas.android.com/apk/res/android:requestLegacyExternalStorage(0x01010603)=true",
        "why": "<code>usesCleartextTraffic=true</code> permits HTTP; <code>requestLegacyExternalStorage</code> keeps the pre-scoped-storage view of /sdcard; <code>tools:ignore=&quot;ScopedStorage&quot;</code> silences the lint that flags it.",
        "impact": "HTTP endpoints are readable on the wire without a proxy, and files in shared storage stay visible to every app holding storage permission.",
        "verify": "grep -nE 'usesCleartextTraffic|requestLegacyExternalStorage|ScopedStorage' AndroidManifest.xml",
        "refs": [
          {
            "label": "usesCleartextTraffic",
            "url": "https://developer.android.com/guide/topics/manifest/application-element#usesCleartextTraffic"
          }
        ]
      },
      {
        "id": "perms",
        "sev": "med",
        "title": "Over-permissioned: SMS, contacts, all-files",
        "where": "<uses-permission> block (source L5-15)",
        "lines": [
          15,
          21,
          23,
          25,
          27
        ],
        "srcLine": 5,
        "evidence": "  15    15  E: uses-permission (line=12)\n  21    21  E: uses-permission (line=15)\n  23    23  E: uses-permission (line=16)\n  25    25  E: uses-permission (line=17)\n  27    27  E: uses-permission (line=18)",
        "why": "<code>MANAGE_EXTERNAL_STORAGE</code> is manually reviewed by Play; <code>SEND_SMS</code> and <code>READ_CONTACTS</code> are the classic premium-SMS exfiltration set.",
        "impact": "Contacts to exfiltrate, SMS to send or read, every file on shared storage to read - all one compromise away from mattering.",
        "verify": "aapt2 dump permissions \"$APK_B\"",
        "refs": [
          {
            "label": "MANAGE_EXTERNAL_STORAGE",
            "url": "https://developer.android.com/training/data-storage/manage-all-files"
          }
        ]
      },
      {
        "id": "exportedservices",
        "sev": "med",
        "title": "Exported receiver and service with no permission",
        "where": "CustomBR, SMSService (apk L226, L240)",
        "lines": [
          226,
          240
        ],
        "evidence": " 226  E: receiver (line=224)\n 227  A: android:name(0x01010003)=\"com.BugBazaar.ui.components.CustomBR\" (Raw: \"com.BugBazaar.ui.components.CustomBR\")\n 229  A: android:exported(0x01010010)=true\n 240  E: service (line=241)\n 241  A: android:name(0x01010003)=\"com.BugBazaar.ui.components.SMSService\" (Raw: \"com.BugBazaar.ui.components.SMSService\")\n 243  A: android:exported(0x01010010)=true",
        "why": "An exported receiver accepts broadcasts from any app; an exported service can be started the same way.",
        "impact": "Foreign apps can drive logic that was written assuming only this app's UI reaches it. Exploitability depends on how the inputs are used - read the code before rating it.",
        "verify": "adb shell am broadcast -n com.BugBazaar/.ui.components.CustomBR -a <action>",
        "refs": [
          {
            "label": "Exported components",
            "url": "https://developer.android.com/privacy-and-security/risks/access-control-to-exported-components"
          }
        ]
      },
      {
        "id": "merger",
        "sev": "info",
        "title": "13 exports in source, 21 in the shipped APK",
        "where": "manifest merger",
        "lines": [
          390,
          417,
          455
        ],
        "srcLine": 30,
        "evidence": "source: 30 <activity/service/receiver/provider> entries, 13 with exported=true\napk   : 64 entries, 21 with exported=true\n\nadded by library manifests:\n  androidx.work.impl.background.systemjob.SystemJobService\n  androidx.work.impl.diagnostics.DiagnosticsReceiver\n  com.google.firebase.iid.FirebaseInstanceIdReceiver\n  com.razorpay.RzpTokenReceiver / CheckoutActivity\n  com.google.android.gms.auth.api.signin.RevocationBoundService\n  androidx.profileinstaller.ProfileInstallReceiver\n  com.evernote.android.job.gcm.PlatformGcmService",
        "why": "The GitHub manifest is not the attack surface. The build merges library manifests into it; eight exported components exist that appear nowhere in the source file.",
        "impact": "Auditing <code>app/src/main/AndroidManifest.xml</code> alone undercounts the exported surface by 8. Always read the manifest inside the APK - which is what the Raw section shows.",
        "verify": "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -c 'exported(0x01010010)=true'",
        "refs": [
          {
            "label": "Manifest merger",
            "url": "https://developer.android.com/build/manage-manifests"
          }
        ]
      },
      {
        "id": "target",
        "sev": "info",
        "title": "targetSdkVersion 32, tools:targetApi=\"31\"",
        "where": "<manifest> (apk L12, source L48)",
        "lines": [
          12
        ],
        "srcLine": 48,
        "evidence": "  12  A: http://schemas.android.com/apk/res/android:targetSdkVersion(0x01010270)=32\nsource L48\n  48  tools:targetApi=\"31\">",
        "why": "Below 33 the app predates several export and storage defaults; below 34 there are no per-app runtime receiver flags.",
        "impact": "Not a vulnerability on its own. It tells you which platform behaviours no longer protect this app, and why the developer had to hand-set <code>exported</code> on every component.",
        "verify": "aapt2 dump badging \"$APK_B\" | head -4",
        "refs": [
          {
            "label": "Behavior changes by targetSdk",
            "url": "https://developer.android.com/about/versions/12/behavior-changes-12"
          }
        ]
      },
      {
        "id": "creds-plaintext",
        "sev": "high",
        "title": "Account credentials stored in plaintext, and the app is debuggable",
        "where": "/data/data/com.BugBazaar/shared_prefs/userCred.xml (apk L99 allowBackup, L96 debuggable)",
        "lines": [
          96,
          99
        ],
        "srcLine": 33,
        "evidence": "adb shell su -c \"cat /data/data/com.BugBazaar/shared_prefs/userCred.xml\"\n<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n    <string name=\"password\">BugBazaarSeccool</string>\n    <string name=\"username\">admin</string>\n</map>\n\nadb shell su -c \"cat .../shared_prefs/user_auth.xml\"\n<boolean name=\"passcode_flag\" value=\"true\" />\n<string name=\"passcode\">1234</string>\n\nsmali/com/BugBazaar/controller/UserAuthSave.smali:13  USER_DATA = \"userCred\"\nsmali/com/BugBazaar/controller/UserAuthSave.smali:15  USER_PREFERENCES = \"user_auth\"\n\napk L96  android:debuggable=true\napk L99  android:allowBackup=true   (no usable fullBackupContent rule)",
        "why": "The password and the PIN are written to SharedPreferences with no encryption. On its own that is bad practice; combined with <code>debuggable=true</code> it is a one-command read for anything that can run <code>run-as</code>.",
        "impact": "Verified on the lab device: <code>adb shell run-as com.BugBazaar cat shared_prefs/userCred.xml</code> returns the username and password in clear, no root and no exploit. On a non-debuggable build the same file is reachable with root, or through backup on older platforms. Credential reuse then turns a training app into a real account compromise.",
        "verify": "adb shell run-as com.BugBazaar cat shared_prefs/userCred.xml",
        "refs": [
          {
            "label": "Insecure data storage",
            "url": "https://developer.android.com/training/articles/security-tips"
          }
        ]
      },
      {
        "id": "provider-sqli",
        "sev": "high",
        "title": "Content provider concatenates the caller's SQL",
        "where": "AddressContentProvider.query() (apk L175)",
        "lines": [
          175
        ],
        "evidence": "public Cursor query(Uri uri, String[] strArr, String str, String[] strArr2, String str2) {\n    SQLiteDatabase readableDatabase = this.dbHelper.getReadableDatabase();\n    if (str != null && !str.isEmpty()) {\n        str3 = str + \" AND nickname NOT LIKE '%0xSuper_Secret0x%'\";   <-- caller text, straight into SQL\n    } else { ... }\n    Cursor cursorQuery = readableDatabase.query(TABLE_NAME, strArr, str3, strArr2, null, null, str2);\n\n$ grep -c 'enforceCallingOrSelfPermission|checkCallingPermission|checkSelfPermission' \\\n    smali/com/BugBazaar/ui/addresses/AddressContentProvider.smali \\\n    smali/com/BugBazaar/provider/UserProfileProvider.smali\n...:0\n...:0",
        "why": "The provider takes the caller-supplied <code>selection</code> and appends its own filter by string concatenation, then hands the result to <code>SQLiteDatabase.query()</code>. No permission check runs in either provider class.",
        "impact": "Any installed app can pass its own SQL to an exported provider that performs no permission check: the hidden-row filter (<code>0xSuper_Secret0x</code>) can be commented out of the statement, and the query surface is whatever SQLite accepts. Proved from the decompiled code; the runtime injection was not executed in this lab, so describe it as a code-level finding with a <code>content query</code> payload to confirm.",
        "verify": "adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses --where \"nickname LIKE '%0xSuper_Secret0x%'--\"",
        "refs": [
          {
            "label": "SQL injection in content providers",
            "url": "https://developer.android.com/privacy-and-security/risks/sql-injection"
          }
        ]
      },
      {
        "id": "webview-bridge",
        "sev": "med",
        "title": "WebView: JavaScript, file access and a Java bridge on an exported screen",
        "where": "com.BugBazaar.ui.TermsAndConditionsActivity (exported, apk L191)",
        "lines": [
          191
        ],
        "evidence": "private void setupwebview(WebView webView) {\n    webView.setWebViewClient(new WebViewClient());\n    webView.getSettings().setJavaScriptEnabled(true);\n    webView.getSettings().setAllowUniversalAccessFromFileURLs(true);\n}\nprivate void startWebView(String str) {\n    if (str.startsWith(\"bugbazaar.com\")) {\n        this.webView.addJavascriptInterface(new JavaScriptInterface(), \"Androidinterface\");\n        this.webView.loadUrl(str);\n    } else if (str.endsWith(\".bugbazaar.com\")) { ... }\n    this.webView.loadUrl(str);        <-- unconditional\n}\nsmali L104-118: addJavascriptInterface(..., \"Androidinterface\"); loadUrl(p1)",
        "why": "JavaScript enabled, universal access from file URLs, and a Java bridge are configured on an activity that any app can start. The host check is a <code>String.startsWith</code> prefix test, and the final <code>loadUrl</code> runs regardless of the branch.",
        "impact": "If the URL is attacker-influenced, page JavaScript can call the <code>Androidinterface</code> methods and, with universal file access, read local files. Prefix matching also accepts <code>bugbazaar.com.attacker.tld</code>. Rate it from what the bridge exposes - read <code>JavaScriptInterface</code> before assigning severity.",
        "verify": "adb shell am start -n com.BugBazaar/.ui.TermsAndConditionsActivity -d \"https://bugbazaar.com.attacker.tld/\"",
        "refs": [
          {
            "label": "WebView security",
            "url": "https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges"
          }
        ]
      }
    ]
  }
};
