/* The real MobSF run - numbers copied from the two report JSONs in labs/reports/, not retyped by hand.
   Recorded 2026-10-31 on this machine; static analysis only (dynamic needs a rooted supported image).
   The page's job is not to repeat the scanner - it is to show what a scanner's words mean, where it
   disagrees with the manual parse the student did, and what it does not call out at all. */
window.MOBSF_REPORT = {
  title: "The scanner's report, read properly",
  recorded: "2026-10-31",
  image: "opensecurity/mobile-security-framework-mobsf:latest · 2.48 GB",
  host: "arm64 macOS · colima · static analysis only",
  intro:
    "These are the two reports from the run this module describes - the same JSON the MobSF web UI renders, " +
    "kept in labs/reports/ next to this page. Read them against your own notes: every claim below is a line " +
    "from the report, and the question is never 'is the scanner right' but 'what does this line actually let " +
    "an attacker do'. Click a claim to see the reading.",

  scans: [
    {
      id: "hpandro", file: "hpAndro_1.3-mobsf.json", pdf: "hpAndro_1.3-mobsf.pdf",
      app: "Android Security Testing", pkg: "hpandro.android.security", ver: "1.3",
      score: 29, sev: { high: 10, warning: 25, info: 5, secure: 5 },
      trackers: 3, target: 30, min: 16,
      comps: { activities: 106, exported_activities: 119, services: 19, receivers: 14, providers: 4 },
      secrets: 100, perms: 31
    },
    {
      id: "bugbazaar", file: "BugBazaar_v1.2.1-mobsf.json", pdf: null,
      app: "BugBazaar", pkg: "com.BugBazaar", ver: "1.0",
      score: 34, sev: { high: 4, warning: 30, info: 2, secure: 4 },
      trackers: 0, target: 32, min: 24,
      comps: { activities: 25, exported_activities: 8, services: 17, receivers: 16, providers: 6 },
      secrets: 12, perms: 15
    }
  ],

  /* why the PDF row is empty for one app - a real tool failure, shown rather than hidden */
  pdfNote:
    "MobSF's PDF export works for hpAndro (5 pages, exported cleanly) and fails for BugBazaar with an " +
    "xhtml2pdf layout error while splitting a table on page 36. That is the tool's bug, not the report's - " +
    "the JSON is complete. Real engagements meet this: when the pretty export dies, the data is still there.",

  claims: [
    {
      app: "hpandro", text: "119 exported activities",
      means: "MobSF counts every activity it can reach from outside, library ones included - OneSignal and Firebase ship " +
        "activities here. Your own parse of this APK found 114 components carrying no android:exported attribute at all. " +
        "Both numbers describe the same app and answer different questions: MobSF asks 'how many are reachable', you asked " +
        "'how many were left undeclared'.",
      verdict: "triage", proof: "m1/manifest-facts", weight: "drives the score"
    },
    {
      app: "hpandro", text: "100 secrets found",
      means: "Counted, not triaged. Some are the real thing - the DES key the crypto task extracts (hpAndro1) and its 3DES " +
        "variant sit in that list. Most are entropy hits: UUIDs, cache keys and hashes that mean nothing. This is why the " +
        "secrets panel is a place to start reading, not a finding you paste.",
      verdict: "real", proof: "m1/secrets", weight: "1 of 100 matters"
    },
    {
      app: "hpandro", text: "App can be installed on a vulnerable unpatched Android version 4.1, [minSdk=16]",
      means: "True, and not a vulnerability in the app. It is a distribution decision: supporting API 16 means supporting a " +
        "platform with unpatched holes. Worth a line in the report, never the top one.",
      verdict: "noise", proof: "m1/target", weight: "context, not impact"
    },
    {
      app: "hpandro", text: "Broadcast Receiver (com.onesignal.BootUpReceiver) is not Protected",
      means: "Not hpAndro's code. It arrives from OneSignal's manifest through the merger - the same mechanism that added " +
        "eight components to BugBazaar. The exposure is real, the owner is the dependency: raise it as a supply-chain item " +
        "and say whose code it is.",
      verdict: "triage", proof: "m1/manifest-facts", weight: "third-party surface"
    },
    {
      app: "bugbazaar", text: "Debug Enabled For App [android:debuggable=true]",
      means: "High, correct, and already in your notes - with one detail the scanner cannot know: the lint rule that would " +
        "have failed the build was suppressed by name in the manifest (tools:ignore=\"HardcodedDebugMode\"). A scanner reports " +
        "the flag; you report the decision that shipped it.",
      verdict: "real", proof: "m1/debuggable", weight: "matches your finding"
    },
    {
      app: "bugbazaar", text: "8 exported activities",
      means: "Your count said 21 reachable components. Not a contradiction: MobSF's number is activities only, while yours " +
        "counted every component kind that is exported or carries an intent-filter. When two counts disagree, say what each " +
        "one counted before anyone 'fixes' the smaller number.",
      verdict: "triage", proof: "m1/manifest-facts", weight: "counted different things"
    },
    {
      app: "bugbazaar", text: "12 secrets found, including a Google API key (AIzaSy…)",
      means: "Real. Keys in an APK are extractable by definition; the only questions are what the key can do and whether it " +
        "is restricted to this package and this API set. Report the key, its restrictions, and what an attacker does with it - " +
        "not the word 'hardcoded'.",
      verdict: "real", proof: "m1/secrets", weight: "real, scope it"
    },
    {
      app: "bugbazaar", text: "Clear text traffic is Enabled For App [android:usesCleartextTraffic=true]",
      means: "High and correctly flagged. It also stacks with requestLegacyExternalStorage and the suppressed storage " +
        "warning - three config decisions in one app, which is what makes the module's 'misconfiguration' point land.",
      verdict: "real", proof: "m1/files", weight: "matches your finding"
    }
  ],

  /* what the scanner did NOT say - the reason a human is in the loop */
  missed: [
    { app: "bugbazaar", what: "The permission typo", detail:
      "The manifest declares com.BugBazaar.permission.contacts and the provider requires ...permission.contact. MobSF " +
      "reports the provider as 'Protected by a permission' (a warning) - it never notices the two names differ, so the " +
      "guard can never be held by anyone. You found it by reading both lines aloud.", proof: "m2/trap" },
    { app: "bugbazaar", what: "readPermission pointing at a display label", detail:
      "UserProfileProvider asks for @string/app_name - the build resolves it to the literal 'BugBazaar'. MobSF calls the " +
      "provider unprotected; it does not explain that the 'permission' is a string resource, which is the actual defect.", proof: "m2/trap" },
    { app: "bugbazaar", what: "The eight components the build added", detail:
      "MobSF sees the merged manifest, so the extra components are just there. It cannot tell you which lines no developer " +
      "ever wrote - that needed a diff against the source manifest, and it is the strongest supply-chain evidence in the app.", proof: "m1/manifest" },
    { app: "bugbazaar", what: "SQL concatenated from the caller's selection", detail:
      "A provider flagged as unprotected is one finding; a provider that pastes the caller's string into a query is a " +
      "different one with a different fix. The scanner lists the exposure, not the injection.", proof: "m2/leak" }
  ],

  takeaway:
    "A score out of 100 is a sort order, not a finding. The two apps score 29 and 34 - and the app with the lower score " +
    "is not the one with the easier attack. Read what the line lets someone do, prove it with a command, and keep the " +
    "scanner's words for the section of the report where clients expect to see them."
};