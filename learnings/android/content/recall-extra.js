/* Recall deck, extra cards. The finding cards are generated at runtime from FINDINGS + PATCHES
   (front = the finding, back = root cause and the patch); these nine are the lab facts a student
   should be able to recite at the door. Every fact is something the guide itself established. */
window.RECALL_EXTRA = {
  facts: [
    { id: "f-bb-count", front: "BugBazaar's shipped manifest: how many components, and how many can another app reach?",
      back: "64 parsed entries, 21 reachable (exported=true or an intent-filter). The source declares 30 - the rest arrive from library manifests at build time." },
    { id: "f-hp-exported", front: "hpAndro ships 114 components with which attribute missing - and why does nobody have to declare it?",
      back: "No android:exported attribute at all. The forced-declaration rule arrived with API 31 targets; hpAndro targets 30, so the platform never made them say it." },
    { id: "f-user-ca", front: "Since which API do apps stop trusting user-installed CAs by default - and how does each lab app behave?",
      back: "API 28. hpAndro re-enables user CAs through network_security_config (that is the h-ca finding); BugBazaar targets 32 and does not, so plain proxying fails until you change the config." },
    { id: "f-deeplinks", front: "Name BugBazaar's URI entry points - the ones any app or web page can fire.",
      back: "bugbazaar://externalAuthentication, bb://bugbazaar/cart/add, bb://bugbazaar/offers, bb://bugbazaar/web - all through exported screens." },
    { id: "f-merger8", front: "Eight components in BugBazaar's APK were written by libraries, not the app's developers. Name three of the sources.",
      back: "androidx.work (SystemJobService), com.google.firebase.iid.FirebaseInstanceIdReceiver, com.razorpay.CheckoutActivity - plus profileinstaller and evernote's job library. The merger writes manifest lines you never wrote." },
    { id: "f-runas", front: "On the lab handset plain `run-as com.BugBazaar` fails. What is the working path, and why?",
      back: "KernelSU's seapp_contexts has no fromRunAs rule, so run-as cannot relabel. Working path: su -c \"run-as com.BugBazaar ...\" - root first, then run-as keeps the app UID." },
    { id: "f-frida16", front: "What do Frida Java hooks do on the Android 16 handset - and where were the Java transcripts really recorded?",
      back: "The native agent loads, but attaching a Java hook kills the session: a tooling limitation, not anti-tampering. The Java-dependent transcripts come from the API 34 emulator." },
    { id: "f-backup-honest", front: "allowBackup=true on hpAndro: what is the honest scope of that risk?",
      back: "adb backup was removed in API 31+, so on the API 34 emulator you cannot pull data that way. On older devices, or through cloud backup, the flag still counts - moderate, not high." },
    { id: "f-md5-known", front: "Why does the guide's MD5 demo quote a published digest instead of a fresh one?",
      back: "md5(\"test\") = 098f6bcd4621d373cade4e832627b4f6 is a known test vector: a published constant proves the chain input->digest without asking you to trust a one-off recording." }
  ]
};