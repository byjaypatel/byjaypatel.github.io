/* An annotated, deliberately broken manifest.
 *
 * This is a COMPILED-EXAMPLE teaching file: it is not BugBazaar's manifest and not any real app's.
 * It exists because BugBazaar only exhibits six of the misconfigurations a manifest can carry, and a
 * student who has only read one real manifest does not know what else to look for.
 *
 * Every issue carries an `anchor` - a substring that occurs on exactly one line of `xml`. The view
 * resolves anchors to line numbers at render time, so the numbering can never drift from the text.
 * `fix` is the line as it should read, not advice about the line.
 */
window.MANIFEST_ANNOTATED = {
  title: "AndroidManifest.xml - annotated example",
  file: "AndroidManifest.xml  (teaching example, not BugBazaar)",
  intro: "A manifest written the way a real app gets written by a team in a hurry. Every marked line is a " +
         "misconfiguration, and each one is quoted back with what it lets an attacker do and the line that " +
         "should have been written instead. Read this one for the categories, then read BugBazaar's real " +
         "manifest for the same habits in the wild.",
  note: "Nine of these compile without a warning, install normally, and pass a code review. The only way " +
        "to find them is to read the file attribute by attribute - which is the exercise.",
  xml: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.northwind.bank"
    android:sharedUserId="com.northwind.shared"
    android:versionCode="41"
    android:versionName="4.1.0">

    <!-- 1. an old target means old defaults for everything below it -->
    <uses-sdk android:minSdkVersion="16" android:targetSdkVersion="22" />

    <!-- 2. permissions requested because a library asked, never trimmed -->
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE"
        tools:ignore="ScopedStorage" />

    <!-- 3. a permission this app defines - and hands out to anyone -->
    <permission android:name="com.northwind.bank.permission.READ_STATEMENTS"
        android:protectionLevel="normal"
        android:label="Read statements" />
    <permission android:name="com.northwind.bank.permission.ADMIN"
        android:protectionLevel="signatureOrSystem" />

    <!-- 4. redefining a platform permission: the system ignores it, other apps believe it -->
    <permission android:name="android.permission.READ_SMS"
        android:protectionLevel="normal" />

    <application
        android:name=".NorthwindApp"
        android:debuggable="true"
        android:allowBackup="true"
        android:hasFragileUserData="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:requestLegacyExternalStorage="true"
        android:allowTaskReparenting="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">

        <meta-data android:name="android.webkit.WebView.EnableSafeBrowsing"
            android:value="false" />

        <!-- 5. the launcher activity: exported, no permission, takes a URL from anyone -->
        <activity
            android:name=".ui.LoginActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:taskAffinity="">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="northwindbank" android:host="open" android:pathPrefix="/" />
            </intent-filter>
        </activity>

        <!-- 6. a web view activity with no permission and a bridge inside it -->
        <activity
            android:name=".ui.WebViewActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize" />

        <!-- 7. exported=false but with an intent filter: on target 22 exported is still implicit -->
        <activity android:name=".ui.ResetPasswordActivity">
            <intent-filter>
                <action android:name="com.northwind.bank.RESET" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity>

        <!-- 8. app links without autoVerify: any app can claim this host -->
        <activity android:name=".ui.StatementActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="www.northwind.bank" />
            </intent-filter>
        </activity>

        <activity android:name=".ui.SettingsActivity" android:exported="false" />

        <!-- 9. a service any app can start, doing work on behalf of the caller -->
        <service
            android:name=".sync.SyncService"
            android:exported="true"
            android:permission="com.northwind.bank.permission.READ_STATEMENTS" />

        <service android:name=".push.PushService" android:exported="false" />

        <!-- 10. a receiver that trusts the action name and the extras with it -->
        <receiver
            android:name=".receivers.SmsReceiver"
            android:exported="true"
            android:permission="android.permission.SEND_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
                <action android:name="com.northwind.bank.SYNC_NOW" />
            </intent-filter>
        </receiver>

        <!-- 11. a provider with no permission at all, plus grants -->
        <provider
            android:name=".data.StatementProvider"
            android:authorities="com.northwind.bank.statements"
            android:exported="true"
            android:grantUriPermissions="true"
            android:readPermission="com.northwind.bank.permission.READ_STATEMENTS"
            android:writePermission="com.northwind.bank.permission.READ_STATEMENTS" />

        <!-- 12. a file provider granted over the whole filesystem -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="com.northwind.bank.files"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

        <!-- 13. backup rules that exclude nothing, on an app that allows backup -->
        <activity android:name=".ui.AboutActivity" android:exported="false" />
    </application>
</manifest>`,
  issues: [
    { sev: "high", key: "A01",
      anchor: 'android:targetSdkVersion="22"',
      title: "targetSdkVersion 22 - every modern default is disabled",
      why: "Below API 23 the app gets no runtime permission model, below 24 user-installed CAs are trusted, below 29 legacy external storage still works, and below 31 <code>android:exported</code> defaults to true for any component with an intent filter. One number switches off four protections at once.",
      fix: 'android:targetSdkVersion="34"  ->  runtime permissions, scoped storage, exported=false by default, user CAs ignored unless opted in',
      ref: "https://developer.android.com/google/play/requirements/target-sdk" },

    { sev: "med", key: "A02",
      anchor: 'android:minSdkVersion="16"',
      title: "minSdkVersion 16 - the app installs on devices without modern TLS",
      why: "A 2012 device cannot be patched and still reaches your backend. minSdk also sets the floor for which devices run code paths you never test.",
      fix: 'android:minSdkVersion="26"  ->  API 26+ has a modern TLS stack and mandatory runtime permissions',
      ref: "https://developer.android.com/guide/topics/manifest/uses-sdk-element" },

    { sev: "high", key: "A03",
      anchor: 'android:name="android.permission.SEND_SMS" />',
      title: "SEND_SMS: the app can send premium-rate messages",
      why: "A permission granted for one feature is granted for every line of code, including any SDK that ships in the app. SMS is the most abused permission on the platform because it bills the user.",
      fix: "remove it; use the SMS Retriever API for OTP, or an intent that hands the message to the user",
      ref: "https://developer.android.com/guide/topics/permissions/overview" },

    { sev: "med", key: "A04",
      anchor: 'android:name="android.permission.READ_CONTACTS"',
      title: "READ_CONTACTS and READ_PHONE_STATE with no feature that needs them",
      why: "Contact and device-identifier access is what turns a data breach into a privacy incident. Both are also what an analytics SDK asks for and should not get.",
      fix: "delete the permission, or gate the feature behind a runtime request that explains itself",
      ref: "https://developer.android.com/training/permissions/requesting" },

    { sev: "high", key: "A05",
      anchor: 'android:name="android.permission.SYSTEM_ALERT_WINDOW"',
      title: "SYSTEM_ALERT_WINDOW: draw over other apps",
      why: "An overlay attacker covers the real login screen with a convincing copy and harvests credentials. On many builds this permission is granted outside the permission dialog, so users do not know they gave it.",
      fix: "remove it; if a floating control is a product requirement, restrict it to a single foreground service type",
      ref: "https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW" },

    { sev: "med", key: "A06",
      anchor: 'android:name="android.permission.REQUEST_INSTALL_PACKAGES"',
      title: "REQUEST_INSTALL_PACKAGES: the app can install APKs",
      why: "A banking app that can install a package is a delivery vehicle for a dropper. If the update mechanism is a downloaded APK, this is also how a compromised CDN becomes a compromised phone.",
      fix: "use the Play Store in-app update API; if sideloading is unavoidable, verify the APK signature against a pinned key before prompting",
      ref: "https://developer.android.com/reference/android/Manifest.permission#REQUEST_INSTALL_PACKAGES" },

    { sev: "med", key: "A07",
      anchor: 'android:name="android.permission.MANAGE_EXTERNAL_STORAGE"',
      title: "MANAGE_EXTERNAL_STORAGE, with the lint warning suppressed",
      why: "This grants read/write over every file on shared storage - other apps' downloads, photos, documents. The <code>tools:ignore</code> beside it is the developer telling the linter to be quiet, which is a finding of its own.",
      fix: "use scoped storage (<code>MediaStore</code>, <code>SAF</code>) and delete both the permission and the suppression",
      ref: "https://developer.android.com/training/data-storage/manage-all-files" },

    { sev: "high", key: "A08", occurrence: 1,
      anchor: 'android:protectionLevel="normal"',
      title: "A permission defined with protectionLevel=normal",
      why: "Any app that declares it in its manifest receives it at install time, silently. A normal-level permission is a comment, not a control - yet the code that checks it looks correct and reviews clean.",
      fix: 'android:protectionLevel="signature"  ->  only apps signed with your key obtain it',
      ref: "https://developer.android.com/guide/topics/manifest/permission-element" },

    { sev: "high", key: "A09",
      anchor: 'android:protectionLevel="signatureOrSystem"',
      title: "signatureOrSystem is deprecated, and its behaviour is now ambiguous",
      why: "It was meant to allow platform-signed apps; on modern Android it is deprecated and its treatment varies. A guard that behaves differently per OEM is a guard you cannot reason about.",
      fix: 'android:protectionLevel="signature"',
      ref: "https://developer.android.com/reference/android/R.attr#protectionLevel" },

    { sev: "high", key: "A10",
      anchor: 'android:name="android.permission.READ_SMS"',
      title: "Redefining a platform permission",
      why: "You cannot grant yourself <code>android.permission.READ_SMS</code>, but declaring it makes other apps' checks against that name resolve to your definition. It is permission spoofing: the system ignores your version, the next app along believes it.",
      fix: "never declare a permission in the android.* namespace; define your own with a signature level",
      ref: "https://developer.android.com/guide/topics/manifest/permission-element" },

    { sev: "high", key: "A11",
      anchor: 'android:debuggable="true"',
      title: "debuggable=true in a release build",
      why: "<code>adb shell run-as</code> and <code>adb backup</code> both work, memory can be dumped, and the debugger can attach. Everything the app stores becomes readable to anyone with a cable and 30 seconds.",
      fix: "delete the attribute; set <code>debuggable false|true</code> per build type in Gradle so a release can never inherit it",
      ref: "https://developer.android.com/privacy-and-security/security-tips" },

    { sev: "high", key: "A12",
      anchor: 'android:allowBackup="true"',
      title: "allowBackup=true with no exclusion rules",
      why: "Everything under the app's private directory - databases, prefs, tokens in files - goes into the backup archive, on API 30 and below to <code>adb backup</code>, above that to cloud backup with no device PIN required.",
      fix: 'android:allowBackup="false"  (or keep true and add fullBackupContent/dataExtractionRules that exclude secret stores)',
      ref: "https://developer.android.com/identity/data/autobackup" },

    { sev: "med", key: "A13",
      anchor: 'android:hasFragileUserData="true"',
      title: "hasFragileUserData - data survives uninstall",
      why: "The user uninstalls the app believing their data is gone; the PIN-protected data directory is kept. That is a privacy expectation broken by a single attribute.",
      fix: "remove it, or keep it only if the product genuinely needs to restore on reinstall and the data is encrypted at rest",
      ref: "https://developer.android.com/reference/android/R.attr#hasFragileUserData" },

    { sev: "high", key: "A14",
      anchor: 'android:usesCleartextTraffic="true"',
      title: "Cleartext permitted app-wide",
      why: "Every <code>http://</code> URL in the app, in a WebView, and in any bundled SDK is allowed. On a hostile network the response can be rewritten in transit - including a login redirect.",
      fix: 'android:usesCleartextTraffic="false", and allow specific hosts in a network security config if a legacy endpoint cannot move yet',
      ref: "https://developer.android.com/privacy-and-security/security-config" },

    { sev: "high", key: "A15",
      anchor: 'android:requestLegacyExternalStorage="true"',
      title: "requestLegacyExternalStorage - the scoped-storage opt-out",
      why: "The app keeps writing to shared storage by absolute path, where any other app with storage permission can read it. On API 30+ the flag is ignored, so behaviour also differs by device.",
      fix: "remove it and move to scoped storage; keep files in <code>getFilesDir()</code> unless they must be shared",
      ref: "https://developer.android.com/about/versions/11/privacy/storage" },

    { sev: "med", key: "A16",
      anchor: 'android:allowTaskReparenting="true"',
      title: "allowTaskReparenting across the whole application",
      why: "Activities can move into another app's task and back, which is one of the ingredients for task hijacking: the user thinks they are in your app and is in someone else's copy of it.",
      fix: "remove it; set it per activity only if a specific flow needs it",
      ref: "https://developer.android.com/reference/android/R.attr#allowTaskReparenting" },

    { sev: "med", key: "A17",
      anchor: 'android:sharedUserId="com.northwind.shared"',
      title: "sharedUserId - one uid shared with another app",
      why: "Two apps with the same sharedUserId run as one Linux user: they can read each other's files and, if signed with the same key, call each other's non-exported components. A vulnerability in the weaker app is a vulnerability in the bank.",
      fix: "remove sharedUserId; pass data through a signature-protected ContentProvider or a bound service",
      ref: "https://developer.android.com/reference/android/R.attr#sharedUserId" },

    { sev: "med", key: "A18",
      anchor: 'android:value="false" />',
      title: "WebView Safe Browsing disabled",
      why: "The one platform feature standing between a user and a phishing page inside your WebView is switched off, usually to make a redirect faster.",
      fix: 'android:value="true"  (or delete the meta-data - true is the default)',
      ref: "https://developer.android.com/reference/android/webkit/WebView" },

    { sev: "high", key: "A19",
      anchor: 'android:taskAffinity=""',
      title: "Launcher activity exported, singleTask, with an empty task affinity",
      why: "This is the StrandHogg/task-hijack shape. Another app declares the same affinity, the task is re-parented, and the user sees their banking task with an attacker's activity on top of it. Combined with the deeplink below, it is also a one-click entry point.",
      fix: 'give the activity a private affinity (<code>android:taskAffinity="com.northwind.bank.login"</code>), drop <code>singleTask</code>, and keep <code>exported="true"</code> only on the launcher filter',
      ref: "https://developer.android.com/privacy-and-security/risks/strandhogg" },

    { sev: "high", key: "A20",
      anchor: 'android:scheme="northwindbank"',
      title: "Custom-scheme deeplink with pathPrefix=\"/\"",
      why: "Any app can register <code>northwindbank://</code> too - Android does not verify custom schemes. Whatever this handler does with the incoming URI (load a URL, fetch a statement, forward a token) can be driven by any app on the device.",
      fix: "use an https App Link with <code>autoVerify=\"true\"</code> and a published assetlinks.json, and validate the host and path inside the handler",
      ref: "https://developer.android.com/training/app-links" },

    { sev: "high", key: "A21",
      anchor: 'android:name=".ui.WebViewActivity"',
      title: "Exported WebView activity with no permission",
      why: "Any app can start it with an extra of its choosing. If the activity loads that extra into a WebView with JavaScript enabled, and a <code>JavascriptInterface</code> is attached anywhere in the app, this is remote code execution inside your process.",
      fix: 'android:exported="false"; if it must be reachable, require a signature permission and whitelist the host before <code>loadUrl</code>',
      ref: "https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges" },

    { sev: "high", key: "A22",
      anchor: 'android:name=".ui.ResetPasswordActivity"',
      title: "No exported attribute, with an intent filter - and targetSdk 22",
      why: "From API 31 a component with an intent filter must declare <code>android:exported</code> or the build fails. Below that it is exported by default. Here the omission means exported, and the action <code>RESET</code> is a public API that resets a password.",
      fix: 'android:exported="false" and require a token in the intent that the server issued to the account owner',
      ref: "https://developer.android.com/about/versions/12/behavior-changes-12#exported" },

    { sev: "med", key: "A23",
      anchor: 'android:host="www.northwind.bank"',
      title: "App link without autoVerify",
      why: "Without <code>autoVerify=\"true\"</code> the link is not verified against the domain, so another app can declare the same host and win the intent. Users tap your link and land in someone else's app.",
      fix: 'add <code>android:autoVerify="true"</code> on the intent filter and host <code>/.well-known/assetlinks.json</code>',
      ref: "https://developer.android.com/training/app-links/verify-android-applinks" },

    { sev: "med", key: "A24",
      anchor: 'android:name=".sync.SyncService"',
      title: "Exported service protected by a normal-level custom permission",
      why: "The permission is the one defined above as <code>normal</code>, so any app gets it at install. The service accepts work from any caller, and the check compiles and reads correctly.",
      fix: 'android:exported="false"; if other apps must call it, require a signature-level permission and validate every argument',
      ref: "https://developer.android.com/guide/topics/manifest/service-element" },

    { sev: "high", key: "A25",
      anchor: 'android:name=".receivers.SmsReceiver"',
      title: "Exported receiver with a priority of 999",
      why: "Any app can send <code>com.northwind.bank.SYNC_NOW</code> with arbitrary extras, and any app can also claim the SMS action first. A high priority means this receiver sees messages before the system UI - the standard shape of an OTP-interception bug.",
      fix: 'android:exported="false" for the custom action; never process <code>SMS_RECEIVED</code> for OTPs - use the SMS Retriever API',
      ref: "https://developer.android.com/guide/topics/manifest/receiver-element" },

    { sev: "high", key: "A26",
      anchor: 'android:authorities="com.northwind.bank.statements"',
      title: "ContentProvider exported, with grants, guarded only by a normal permission",
      why: "Exported plus <code>grantUriPermissions</code> means the provider hands out per-URI access, and the read permission is the <code>normal</code> one from above. Any app reads any statement row.",
      fix: 'android:exported="false"; if another app genuinely needs the data, use a signature permission and <code>android:pathPrefix</code> to limit what a grant can reach',
      ref: "https://developer.android.com/guide/topics/providers/content-provider-creating#Permissions" },

    { sev: "high", key: "A27",
      anchor: 'android:authorities="com.northwind.bank.files"',
      title: "FileProvider with a paths file that starts at the root",
      why: "The provider itself is not exported, which looks safe - but any app holding a URI grant can read whatever the paths file exposes. A <code>root-path</code> with <code>path=\"/\"</code> exposes the whole filesystem, including other apps' data on shared storage.",
      fix: 'restrict <code>@xml/file_paths</code> to one cache subdirectory, e.g. <code>&lt;cache-path name=\"exports\" path=\"exports/\" /&gt;</code>',
      ref: "https://developer.android.com/reference/androidx/core/content/FileProvider" },

    { sev: "high", key: "A29",
      anchor: 'android:networkSecurityConfig="@xml/network_security_config"',
      title: "The network security config is where the trust decision is really made",
      why: "This attribute points at a file that can silently undo <code>usesCleartextTraffic</code>: a <code>&lt;debug-overrides&gt;</code> block that trusts user certificates in a release build turns every proxy into a man-in-the-middle, and a <code>base-config</code> with <code>cleartextTrafficPermitted=\"true\"</code> re-enables plaintext per host. The manifest looks strict; the file is not.",
      fix: "open res/xml/network_security_config.xml; keep <code>&lt;certificates src=\"system\"/&gt;</code> only, put trust overrides inside <code>debug-overrides</code> guarded by a debug build, and pin the hosts that matter",
      ref: "https://developer.android.com/privacy-and-security/security-config" },
    { sev: "low", key: "A28",
      anchor: 'android:name="android.support.FILE_PROVIDER_PATHS"',
      title: "The paths resource is where the real decision is",
      why: "The manifest line only points at a file. The finding lives in <code>res/xml/file_paths.xml</code>, which a manifest-only review never opens - the same pattern as <code>networkSecurityConfig</code> and <code>backup_rules</code>. Follow every <code>@xml/</code> reference.",
      fix: "open every @xml/* referenced here and check what it exposes; do not stop at the manifest",
      ref: "https://developer.android.com/training/data-storage/shared/documents-files" }
  ]
};
