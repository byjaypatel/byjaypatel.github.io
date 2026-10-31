/* What to look for in AndroidManifest.xml - the checklist behind the explorer.
   `filter` values are literal strings the Raw search box understands. */
window.MANIFEST_GUIDE = [
  {
    id: "howto",
    kind: "primer",
    title: "How to read an aapt2 dump",
    body: [
      "<b>E:</b> is an element - a component or a tag. <b>A:</b> is an attribute of the element above it.",
      "<code>(0x01010010)</code> is the resource id of the attribute. <code>exported</code> is " +
        "<code>0x01010010</code>, <code>permission</code> <code>0x01010006</code>, " +
        "<code>readPermission</code> <code>0x01010007</code>, <code>authorities</code> <code>0x01010018</code>.",
      "Every value appears twice - once plain, once as <code>(Raw: ...)</code>. That is why counting lines " +
        "without <code>sort -u</code> doubles every number.",
      "Absent is not the same as false. If <code>android:exported</code> is missing, the default depends on " +
        "the component type and whether it has an intent filter - and since API 31 the build fails without it."
    ]
  },
  {
    id: "sdk",
    title: "SDK levels - which protections even apply",
    look: ["targetSdkVersion", "compileSdkVersion", "minSdkVersion"],
    why: "targetSdkVersion decides which platform behaviours protect this app. Below 31 there are no export " +
         "requirements, below 33 no runtime receiver flags, below 34 no per-app broadcast registration.",
    cmd: "aapt2 dump badging \"$APK_B\" | head -4",
    filter: "targetSdkVersion",
    refs: [{ label: "Behavior changes by targetSdk", url: "https://developer.android.com/google/play/requirements/target-sdk" }]
  },
  {
    id: "debug",
    title: "debuggable - the one-line sandbox bypass",
    look: ["android:debuggable"],
    why: "A debuggable build lets <code>adb shell run-as</code> read the app's private storage as the app's own " +
         "uid. It is the fastest way to prove impact on a real device, and the most frequently shipped mistake " +
         "because debug builds and release builds share one manifest.",
    cmd: "aapt2 dump badging \"$APK_B\" | grep -i debuggable",
    filter: "debuggable",
    refs: [{ label: "android:debuggable", url: "https://developer.android.com/guide/topics/manifest/application-element#debug" }]
  },
  {
    id: "backup",
    title: "Backup - allowBackup, fullBackupContent, dataExtractionRules",
    look: ["allowBackup", "fullBackupContent", "dataExtractionRules"],
    why: "Backup rules decide whether app-private data leaves the device. <code>allowBackup=true</code> with no " +
         "rules includes everything. <code>adb backup</code> itself was removed in API 31+, so state the platform " +
         "you tested before calling this exploitable.",
    cmd: "grep -nE 'allowBackup|fullBackupContent|dataExtractionRules' AndroidManifest.xml",
    filter: "allowBackup",
    refs: [{ label: "Back up user data", url: "https://developer.android.com/identity/data/autobackup" }]
  },
  {
    id: "transport",
    title: "Transport - cleartext and the network security config",
    look: ["usesCleartextTraffic", "networkSecurityConfig"],
    why: "Cleartext allowed means HTTP is readable on the wire with no proxy and no certificate. The network " +
         "security config is where trust anchors are declared - <code>&lt;certificates src=&quot;user&quot;/&gt;</code> " +
         "means any CA the user installs is trusted, which is what makes a Burp CA work.",
    cmd: "grep -nE 'usesCleartextTraffic|networkSecurityConfig' AndroidManifest.xml",
    filter: "usesCleartextTraffic",
    refs: [{ label: "Network security config", url: "https://developer.android.com/privacy-and-security/security-config" }]
  },
  {
    id: "exported",
    title: "Exported components - the real attack surface",
    look: ["android:exported=\"true\"", "intent-filter"],
    why: "An exported component can be reached by any app on the device. Count them, then ask for each one: who " +
         "can call it, what does it do with the input, and is there a permission in front of it? An exported " +
         "provider with no permission is a data leak; an exported activity with a browsable filter is a deep link.",
    cmd: "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -c 'exported(0x01010010)=true'",
    filter: "exported(0x01010010)=true",
    refs: [{ label: "Exported components", url: "https://developer.android.com/privacy-and-security/risks/access-control-to-exported-components" }]
  },
  {
    id: "guards",
    title: "Permission guards - permission, readPermission, writePermission",
    look: ["android:permission", "android:readPermission", "android:writePermission"],
    why: "An export is only as good as its guard. <code>android:permission</code> covers the whole component; " +
         "providers can be split with <code>readPermission</code> and <code>writePermission</code>. Then check the " +
         "guard actually exists - a permission name that no <code>&lt;permission&gt;</code> element declares " +
         "cannot be granted to anyone, which fails closed but for the wrong reason.",
    cmd: "grep -nE 'permission|protectionLevel' AndroidManifest.xml",
    filter: "ermission",
    refs: [{ label: "Component permissions", url: "https://developer.android.com/guide/topics/manifest/provider-element#gprmsn" }]
  },
  {
    id: "providers",
    title: "Providers - authorities, path permissions, grantUriPermissions",
    look: ["authorities", "grantUriPermissions", "path-permission"],
    why: "The authority is the URI an attacker types. <code>grantUriPermissions</code> lets the app hand out " +
         "temporary access to one URI; <code>path-permission</code> narrows the guard to a path. A provider with " +
         "an authority and no guard is queryable by <code>adb shell content query</code> from uid 2000.",
    cmd: "adb shell content query --uri content://<authority>/<table>",
    filter: "authorities",
    refs: [{ label: "Provider element", url: "https://developer.android.com/guide/topics/manifest/provider-element" }]
  },
  {
    id: "deeplinks",
    title: "Intent filters - deep links and browsable URIs",
    look: ["scheme", "host", "category.BROWSABLE", "autoVerify"],
    why: "A scheme plus host plus BROWSABLE is a URI anyone can fire from a browser or another app. " +
         "<code>autoVerify</code> is what turns it into a verified App Link; without it, any app can claim the " +
         "same scheme.",
    cmd: "adb shell am start -a android.intent.action.VIEW -d \"bugbazaar://externalAuthentication\"",
    filter: "scheme",
    refs: [{ label: "Deep links", url: "https://developer.android.com/training/app-links/deep-linking" }]
  },
  {
    id: "merger",
    title: "What the build adds behind your back",
    look: ["tools:node", "tools:replace", "merged library manifests"],
    why: "The manifest you read on GitHub is not the manifest in the APK. Library manifests are merged in, so " +
         "components appear that nobody wrote in the app's own file. Always count exports in the APK, and compare " +
         "against the source when you have it.",
    cmd: "aapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -c 'E: activity'",
    filter: "E: ",
    refs: [{ label: "Merge multiple manifests", url: "https://developer.android.com/build/manage-manifests" }]
  },
  {
    id: "notfinding",
    title: "What is not a finding",
    look: ["expanded by system permissions", "signature-level custom permissions"],
    why: "An exported component guarded by <code>BIND_JOB_SERVICE</code> or <code>c2dm.permission.SEND</code> " +
         "cannot be reached by a third-party app - those permissions are signature-level. Reporting them is how a " +
         "report fills with noise. Same for an export whose guard is a permission nobody can hold.",
    cmd: "# check the guard before you rate the export\naapt2 dump xmltree --file AndroidManifest.xml \"$APK_B\" | grep -B3 'exported(0x01010010)=true' | grep permission",
    filter: "BIND_",
    refs: [{ label: "Protection levels", url: "https://developer.android.com/guide/topics/manifest/permission-element#protectionLevel" }]
  }
];
