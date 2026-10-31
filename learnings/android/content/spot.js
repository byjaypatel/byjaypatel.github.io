/* "Spot the flaw" - click the line that matters.
 *
 * Every artifact here is verbatim: three come from the real APKs decoded on this machine (BugBazaar
 * AndroidManifest.xml, res/xml, com/bug/hook/checkdetect.smali), one from a real device file
 * (shared_prefs/userCred.xml, credential masked), and three from transcripts recorded by running the
 * lab commands. Nothing is illustrative - if a line is here, it was on a real device.
 *
 * shape: { id, file, mod, title, context, lines[], answer[{n, why}], lesson }
 *   lines[] is 1-based; answer[].n is the line number a student should click.
 */
window.SPOT = {
  intro: "Reading an artifact is the skill the rest of the course assumes. Each card is a real file or a real transcript from these labs - click the line that carries the finding, then check. One click tells you whether you would have caught it in an assessment.",
  challenges: [
    {
      id: "provider",
      file: "AndroidManifest.xml  (com.BugBazaar, decoded)",
      mod: "m2",
      title: "Which provider can any app on the device query?",
      context: "All four of these are exported. Only one is exported and unprotected - the others either carry a permission or belong to a library.",
      lines: [
        '<provider android:authorities="com.BugBazaar.UserProfile" android:exported="true" android:name="com.BugBazaar.provider.UserProfileProvider" android:readPermission="@string/app_name"/>',
        '<provider android:authorities="com.bugbazaar.mycontacts" android:exported="true" android:name="com.BugBazaar.provider.MyContactsProvider" android:permission="com.BugBazaar.permission.contact"/>',
        '<provider android:authorities="com.bugbazaar.provider.addresses" android:exported="true" android:name="com.BugBazaar.ui.addresses.AddressContentProvider"/>',
        '<provider android:authorities="com.BugBazaar.androidx-startup" android:exported="false" android:name="androidx.startup.InitializationProvider">'
      ],
      answer: [{ n: 3, why: "exported=\"true\" and no android:permission, android:readPermission or android:writePermission at all. Nothing gates an outside caller." }],
      lesson: "Line 1 looks protected but its readPermission resolves to @string/app_name = \"BugBazaar\", and no permission by that name is ever declared - a decorative guard. Line 2 is exported and does carry a real permission. Line 4 is not exported."
    },
    {
      id: "debuggable",
      file: "<application>  (com.BugBazaar, decoded)",
      mod: "m1",
      title: "Which attribute turns the whole app into a shell you can walk into?",
      context: "One attribute here means any process with adb access can attach, and run-as works against the app's private directory.",
      lines: [
        'android:allowBackup="true"',
        'android:debuggable="true"',
        'android:extractNativeLibs="false"',
        'android:fullBackupContent="@xml/backup_rules"',
        'android:dataExtractionRules="@xml/data_extraction_rules"'
      ],
      answer: [{ n: 2, why: "debuggable=true keeps the JDWP port open and lets run-as (or a debugger) read /data/data/com.BugBazaar. In a release build this is a High-severity configuration finding." }],
      lesson: "allowBackup=true matters too, but on its own it still needs an authorised backup path. debuggable=true is direct access. The two together are why the storage lab works at all."
    },
    {
      id: "shortcircuit",
      file: "smali/com/bug/hook/checkdetect.smali  (someMethod, decoded)",
      mod: "m3",
      title: "Which line means the Frida check can never run on an emulator?",
      context: "This is the method that decides whether to show the detection dialog. Read the control flow, not the intent.",
      lines: [
        '.method public someMethod(Landroid/content/Context;)V',
        '    invoke-static {}, Lcom/bug/hook/emultorcheck;->isEmulator()Z',
        '    move-result v0',
        '    if-nez v0, :cond_2',
        '    invoke-static {p1}, Lcom/bug/hook/AdbEnabled;->AdbEnabled1(Landroid/content/Context;)Z',
        '    move-result v0',
        '    if-eqz v0, :cond_0',
        '    goto :goto_0',
        '    :cond_0',
        '    invoke-direct {p0}, Lcom/bug/hook/checkdetect;->checkfrida()Z'
      ],
      answer: [
        { n: 4, why: "if-nez v0, :cond_2 - when isEmulator() returns false the code jumps past everything; when it returns true it falls through to the next test. The Frida check at :cond_0 is only reached after BOTH guard branches are false." },
        { n: 7, why: "if-eqz v0, :cond_0 with the goto after it: if AdbEnabled1() is true, the code takes :goto_0 and never reaches checkfrida(). Two short-circuits in front of the interesting check." }
      ],
      lesson: "This is why a script that hooks only checkfrida() reports zero calls: on an emulator, or with adb enabled, checkdetect.someMethod never reaches it. Hook the guards, or spawn and force them false."
    },
    {
      id: "prefs",
      file: "shared_prefs/userCred.xml  (pulled from the device)",
      mod: "m1",
      title: "Which line is the finding?",
      context: "Pulled with su -c \"run-as com.BugBazaar cat shared_prefs/userCred.xml\". The credential value is masked here; on the device it is in clear.",
      lines: [
        "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>",
        "<map>",
        '    <string name="username">admin</string>',
        '    <string name="password">[plain text]</string>',
        "</map>"
      ],
      answer: [{ n: 4, why: "A password written to SharedPreferences in clear. SharedPreferences is not encrypted, so anything that can read the file - debug build, backup, rooted device, an exported provider - reads the credential." }],
      lesson: "Note what is NOT the finding: reading it as root. The finding needs a route that works without root - here, debuggable=true in the same APK."
    },
    {
      id: "deeplink",
      file: "AndroidManifest.xml  (com.BugBazaar.ui.Deeplink, decoded)",
      mod: "m2",
      title: "What makes bb://bugbazaar/web reachable from a browser or another app?",
      context: "The intent filter is only half of it. One attribute on the activity decides whether anything outside the app can reach it.",
      lines: [
        '<activity android:exported="true" android:name="com.BugBazaar.ui.Deeplink">',
        '    <intent-filter>',
        '        <action android:name="android.intent.action.VIEW"/>',
        '        <category android:name="android.intent.category.BROWSABLE"/>',
        '        <category android:name="android.intent.category.DEFAULT"/>',
        '        <data android:scheme="bb" android:host="bugbazaar" android:path="/web"/>',
        '    </intent-filter>',
        '</activity>'
      ],
      answer: [
        { n: 1, why: "android:exported=\"true\" on the activity. Without it the filter is inert: no other app can start the component, so the deep link cannot reach it." },
        { n: 6, why: "The <data> line is what makes it a link at all - scheme, host and path. Drop any one and the URI no longer matches." }
      ],
      lesson: "BROWSABLE is what lets a browser hand the URI over; exported is what lets the app accept it. Both, plus the data triple, are the minimum for the entry point to exist."
    },
    {
      id: "apktool",
      file: "terminal  (apktool d, recorded)",
      mod: "m1",
      title: "Which line tells you the resources were decoded, not skipped?",
      context: "You need res/xml and the manifest in XML form for the rest of Module 01. apktool tells you which mode it ran in.",
      lines: [
        '$ apktool d -f -o hp "$APK_H"',
        'I: Using Apktool 2.11.1 on hpAndro_1.3.apk',
        'I: Loading resource table...',
        'I: Decoding AndroidManifest.xml with resources...',
        'I: Baksmaling classes.dex...',
        'I: Baksmaling classes2.dex...',
        'I: Baksmaling classes3.dex...',
        'I: Copying lib...',
        'I: Copying original files...'
      ],
      answer: [{ n: 4, why: "\"with resources\" - run apktool with -r and this line reads \"Decoding AndroidManifest.xml with resources... skipping\" style output and res/ is left as a binary blob, which breaks every later step that reads res/xml." }],
      lesson: "The three Baksmaling lines are the code being decoded per dex. If you only wanted smali, -r is fine - but not when you need the manifest in readable XML."
    },
    {
      id: "leak",
      file: "terminal  (content query, recorded on device)",
      mod: "m2",
      title: "Which line is proof, as opposed to a hypothesis?",
      context: "You already know the provider is exported from the manifest. This is what turns that into a finding.",
      lines: [
        '$ adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses',
        'Row: 0 id=2, nickname=Home, address=Dunder Mifflin,1725 Slough Avenue, Suite 200, Scranton, Pennsylvania',
        'Row: 1 id=3, nickname=Work, address=Stark Tower,200 Park Avenue, New York, NY'
      ],
      answer: [{ n: 2, why: "Rows returned to a caller that holds no permission. That is the finding: data crossed the boundary. The command on line 1 is only the attempt." }],
      lesson: "An exported provider with an empty table proves nothing - you would be reporting a missing control with no impact. Always get a row back before you write it up."
    },
    {
      id: "frida",
      file: "terminal  (f5_bugbazaar_detection.js, recorded on device)",
      mod: "m3",
      title: "Which line shows the check being skipped, and which shows it being changed?",
      context: "First block is observe mode, second is bypass. Same script, one variable.",
      lines: [
        '[+] mode=observe, 10/10 hooks attached',
        '[obs] emultorcheck.isEmulator() real=false',
        '[obs] AdbEnabled.AdbEnabled1(Context) real=true      <-- returns here, never reaches Frida checks',
        '[+] mode=bypass, 10/10 hooks attached',
        '[+] AdbEnabled.AdbEnabled1(Context) real=true -> false',
        '[+] checkdetect.checkfrida() real=false -> false'
      ],
      answer: [
        { n: 3, why: "Observe mode: AdbEnabled1 returned true and the comment marks the exit. This is the short-circuit seen in the smali card, caught at runtime." },
        { n: 5, why: "Bypass mode: the value is changed at the boundary - real=true becomes false, so the guard no longer fires. Observation plus modification is the pair that counts." }
      ],
      lesson: "10/10 attached in both modes means the agent was live in both. The difference is what the script did with the return value, not whether it hooked."
    }
  ]
};
