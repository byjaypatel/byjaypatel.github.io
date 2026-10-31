/* OWASP Mobile Top 10 (2024 final release) - the ten risks, in the project's own order,
   each mapped onto the step or finding in THIS workshop where a student meets it.
   Titles and slugs verified against owasp.org/www-project-mobile-top-10/2023-risks/. */
window.TOP10 = {
  intro: "The OWASP Mobile Top 10 is a taxonomy of risk categories, not a checklist of bugs. " +
         "Use it to name what you found in language a client already recognises, then point at the " +
         "line of code. Every card below says where in this workshop you touch that category - " +
         "and, where the link is weak, says so.",
  risks: [
    { code: "M1", title: "Improper Credential Usage",
      short: "Keys, passwords and tokens baked into the app, or stored and transmitted without protection.",
      where: [
        ["m1/secrets", "hpAndro ships strings and a native library with secrets in them; the .so is the interesting one"],
        ["creds-plaintext", "BugBazaar writes the account password into SharedPreferences in clear"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m1-improper-credential-usage" },

    { code: "M2", title: "Inadequate Supply Chain Security",
      short: "Risk arriving through dependencies, SDKs, the build pipeline or the signing and distribution process.",
      where: [
        ["m1/manifest-facts", "the shipped APK has 21 exported components; the source declares 13 - eight arrive from library manifests"],
        ["8 merged exports", "androidx.work, Firebase, Razorpay, GMS and Evernote components you never wrote and never reviewed"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m2-inadequate-supply-chain-security" },

    { code: "M3", title: "Insecure Authentication/Authorization",
      short: "Checks that can be skipped - on the server, or in the client where the UI is the only guard.",
      where: [
        ["m1/exported", "which components any app on the device may start, and with what permission"],
        ["m2/trap", "UserProfileProvider asks for a permission that does not exist, so the guard is not a guard"],
        ["m2/deeplink", "bugbazaar://externalAuthentication reaches a login screen from uid 2000"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m3-insecure-authentication-authorization" },

    { code: "M4", title: "Insufficient Input/Output Validation",
      short: "Data crossing a trust boundary is used before it is validated: SQL, URLs, HTML, intents.",
      where: [
        ["m1/providers-static", "AddressContentProvider concatenates the caller's selection straight into SQL"],
        ["m1/webview", "JavaScript, universal file access and a Java bridge on an exported screen"],
        ["m1/db", "a stored SQL injection payload found in the app's own database"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m4-insufficient-input-output-validation" },

    { code: "M5", title: "Insecure Communication",
      short: "Traffic that can be read or altered: cleartext, weak TLS validation, trust anchors the app should not accept.",
      where: [
        ["m4/listener", "get the proxy in the path before you judge the app"],
        ["m4/verify", "prove interception with the certificate issuer, not with a hopeful screenshot"],
        ["m4/trustconfig", "why two screens named \"public key pinning\" do not pin anything"],
        ["m4-user-ca", "user certificate first; system store only when it is genuinely necessary"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m5-insecure-communication" },

    { code: "M6", title: "Inadequate Privacy Controls",
      short: "PII collected, logged, cached or shared beyond what the feature needs.",
      where: [
        ["m1/db", "customer names, emails and phone numbers in a database any debuggable build exposes"],
        ["m1/logging", "what reaches logcat, and what reaches the clipboard"],
        ["m1/storage", "shared_prefs, external files, and a backup rule that allows all of it"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m6-inadequate-privacy-controls" },

    { code: "M7", title: "Insufficient Binary Protections",
      short: "Nothing stops an attacker reading or changing the binary, and the detection that exists is easy to switch off.",
      where: [
        ["m5/find", "find the check, then read what it actually tests"],
        ["m5/patch", "one method body replaced; the app no longer knows what a su binary is"],
        ["m3/hook", "the same edit at runtime, without touching the file"],
        ["jadx-to-frida", "the class path you copied out of jadx-gui is the hook target"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m7-insufficient-binary-protection" },

    { code: "M8", title: "Security Misconfiguration",
      short: "Settings left unsafe: debuggable builds, backups allowed, exported components, cleartext permitted.",
      where: [
        ["debuggable release", "BugBazaar ships debuggable=true, and the lint rule that flags it was suppressed by name"],
        ["m1/manifest-facts", "cleartext, legacy storage and a suppressed ScopedStorage warning in the same file"],
        ["m1/exported", "the exported surface, counted from the APK rather than the source"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m8-security-misconfiguration" },

    { code: "M9", title: "Insecure Data Storage",
      short: "Sensitive data written where another app, a backup, or a stolen device can read it.",
      where: [
        ["m1/db", "AddressDB and UserProfileDatabase pulled with run-as and opened with sqlite3"],
        ["creds-plaintext", "username and password as plain XML in the app's private directory"],
        ["m1/storage", "allowBackup=true with no usable exclusion rule"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m9-insecure-data-storage" },

    { code: "M10", title: "Insufficient Cryptography",
      short: "Weak algorithms, hardcoded keys, predictable IVs - or encryption whose key travels with the ciphertext.",
      where: [
        ["m1/crypto", "DES/ECB and a four-digit IV, both named in the app's own string resources"],
        ["m1/files", "a 2048-bit private key shipped inside assets/ and used by RSAActivity"]
      ],
      url: "https://owasp.org/www-project-mobile-top-10/2023-risks/m10-insufficient-cryptography" }
  ],
  note: "What the list does not cover",
  noteBody: "The 2024 project lists six risks that were considered and did not make the Top 10: data leakage, " +
            "hardcoded secrets, insecure access control, path traversal, unprotected endpoints (deeplinks, activities, " +
            "services) and unsafe sharing. Note that three of the strongest findings in this workshop - an exported " +
            "provider, an exported activity and a deeplink that reaches a login screen - live in that second list. " +
            "A taxonomy is a language for reporting, not a definition of what matters: report the behaviour and the " +
            "line of code, then name the category it best fits."
};
