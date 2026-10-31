/* The teaching layer for #/m1/manifest.
 *
 * Six lessons. Each one is a claim you cannot read your way to - you change one thing in a manifest and watch
 * what changes downstream: whether another app can call it, and the exact command that would.
 *
 * Facts used here all come from the two lab APKs:
 *   BugBazaar  targetSdk 32, 64 components (30 declared, 34 merged), 21 reachable, 6 providers
 *   hpAndro    compileSdk 30, 114 components with no android:exported attribute at all
 */
window.MANIFEST_LEARN = [
  {
    id: "l1",
    n: 1,
    title: "An app is not a program, it is a set of doors",
    idea: "Nothing launches an app as a whole. Android starts one component at a time, and any other app on the device can start one too - if the manifest lets it. There are four kinds, and each is knocked on differently.",
    teach: "Component names are the only thing an attacker needs. Everything else - what it does, what it can reach - follows from the name.",
    try: "Pick each of the four kinds and read the command that reaches it."
  },
  {
    id: "l2",
    n: 2,
    title: "android:exported is the whole question",
    idea: "One attribute decides whether an app that is not this app can call a component. If it says false, nothing else in the manifest matters. If it says true, the door exists whether the developer meant it or not.",
    teach: "The default for a component with no intent-filter is false (since API 17). So on a modern app, almost every open door was written down on purpose - or inherited from a library.",
    try: "Flip exported to true and watch the reach command appear."
  },
  {
    id: "l3",
    n: 3,
    title: "The intent-filter that answers for you",
    idea: "A component with an intent-filter and no exported attribute used to be open by default. That single rule is why hpAndro - 114 components, not one of them carrying the attribute - reads like a door map.",
    teach: "targetSdk 31 closed this: the build now refuses to compile a filter without an explicit exported. BugBazaar is targetSdk 32, so every door in it was declared. hpAndro is compileSdk 30, so none were.",
    try: "Add a filter with exported not set, then raise the targetSdk."
  },
  {
    id: "l4",
    n: 4,
    title: "A lock only counts if someone can hold the key",
    idea: "A permission protects a component only when other apps can actually be granted it. A permission that is never declared can never be granted - and @string/app_name is not a permission at all, it is the app's own label, resolved to the word \"BugBazaar\".",
    teach: "BugBazaar's UserProfileProvider is guarded by readPermission=@string/app_name. That reads like a lock in a report. It is a label on a door.",
    try: "Guard the provider three ways and see which ones actually stop another app."
  },
  {
    id: "l5",
    n: 5,
    title: "Providers answer in URIs",
    idea: "Every other component is started by name. A provider is the only one you talk to with a URI, and if the authority answers, the data is yours to read.",
    teach: "The three authorities in BugBazaar are guarded three different ways: one by nothing, one by a declared permission, one by a label. Same app, three different answers.",
    try: "Build a URI and watch the command write itself."
  },
  {
    id: "l6",
    n: 6,
    title: "The build writes lines you never wrote",
    idea: "BugBazaar's source declares 30 components. The APK ships 64. The other 34 were merged in from libraries - firebase, razorpay, androidx.work, the profiler - and 8 of the merged ones are reachable by any app.",
    teach: "This is why the APK is the artefact you assess. The developer read a 30-line file; the device runs a 64-component app.",
    try: "Switch libraries on and off and watch the reachable count move."
  }
];
