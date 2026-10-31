/* Module 6 - automated analysis + reporting */
window.MODULES = window.MODULES || [];

window.MODULES.push({
  id: "m6", tag: "MODULE 6", time: "45 min", title: "Automated pass, then the write-up",
  goal: "Run a scanner to prioritise, verify by hand, and turn notes into a report someone can act on.",
  brief: {"from": "Acme Retail, board", "subject": "A scanner says we are 100% insecure", "body": "Procurement ran an automated scanner on BugBazaar and it produced ninety pages. The board asks: is our app safe? We do not know what the scanner's words mean and we cannot tell signal from noise.", "want": "Run the automated pass yourself, read what it actually found, and come back with the three findings that matter - in language a non-technical board can repeat."},
      intro: "A scanner triages; it does not conclude. Everything in this module is about the gap between what a tool prints and what you can defend.",
  steps: [
    {
      id: "mobsf",
      title: "MobSF: static analysis of both APKs",
      why: "An automated pass over the same two APKs is the control for your manual work: it finds categories you missed and raises false positives you now know how to reject.",
      concept: "MobSF runs as a container and needs docker to be running before anything else. The image is ~2 GB on first pull, so pull it before class rather than in front of a room. Nothing is uploaded anywhere - the container is local, and the APKs never leave the laptop.",
      see: "Upload, wait for the scan, then read the <b>Manifest Analysis</b> section first: it repeats your work and disagrees with it in specific places, which is exactly what the next step grades.",
      cmd: "docker info >/dev/null 2>&1 && echo \"docker up\" || echo \"start Docker Desktop first\"\ndocker pull opensecurity/mobile-security-framework-mobsf:latest\n\ndocker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest\n# open http://127.0.0.1:8000 in a browser, upload both APKs\ncurl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8000/      # 302: the server answers, logging in is a redirect\ncurl -sL -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8000/     # 200: follow the /login/ redirect",
      sim: "$ docker info >/dev/null 2>&1 && echo \"docker up\" || echo \"start Docker Desktop first\"\ndocker up\n$ docker pull opensecurity/mobile-security-framework-mobsf:latest\nlatest: Pulling from opensecurity/mobile-security-framework-mobsf\nStatus: Downloaded newer image for opensecurity/mobile-security-framework-mobsf:latest\n$ docker images opensecurity/mobile-security-framework-mobsf\nREPOSITORY                                    TAG      IMAGE ID       SIZE\nopensecurity/mobile-security-framework-mobsf  latest   <id>           2.48GB\n$ docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest\n<container id>\n$ curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8000/\n302\n$ curl -sL -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:8000/\n200\n# 302 is not a failure: MobSF redirects / to /login/. Follow it and the page is up.",
      expect: "Port 8000 answering (302 on / because it redirects to /login/, 200 once followed), both APKs upload, and a report you can read against your own notes.",
      expectNote: "Recorded 2026-10-31 on this machine (image 2.48GB, both APKs scanned statically - the reports are in <code>labs/reports/</code> and the page below reads them line by line). hpAndro: <b>29/100</b>, 10 high / 25 warning / 5 info / 5 secure, 3 trackers, 119 exported activities, 100 secrets. BugBazaar: <b>34/100</b>, 4 high / 30 warning / 2 info / 4 secure, 8 exported activities, 12 secrets. Two things to carry into the write-up: the two counts of exported components disagree because they count different things (MobSF: activities only), and a score out of 100 is not a finding - the scanner triages, you conclude. Dynamic analysis is still out of scope: it needs a rooted, supported image.",
      refs: [{"label": "MobSF docs", "url": "https://mobsf.github.io/docs/"}]
    },
    {
      id: "verify-scan", title: "Verify three alerts, reject one",
      why: "The point of the exercise is the rejection. A report that only repeats scanner output has no analyst in it.",
            concept: "Three outcomes per alert: verified, rejected, unverified. Rejecting one with evidence is a result, not a failure.",
      see: "One alert rejected because its guard is a signature-level permission. That paragraph is often the most valuable in the report.",
cmd: `# for each alert: open the file and line the scanner cites, then reproduce it
aapt2 dump xmltree --file AndroidManifest.xml "$APK_B" | grep -A4 UserProfileProvider
adb shell content query --uri content://com.BugBazaar.UserProfile/userprofile`,
      sim: `Scanner says:   exported provider without permission  (BugBazaar UserProfileProvider)
Your check:     readPermission=@string/app_name  ->  undefined permission "BugBazaar"
Runtime:        API 34  -> "No result found."      Android 16 -> SecurityException
Verdict:        REJECTED as a leak - latent exposure + manifest defect, not data exposure`,
      expect: `at least one alert you can prove wrong, with the command that proves it.`,
      expectNote: "Three verified, one rejected is the deliverable. All four need the evidence inline, not a link to the scanner.",
      refs: [{ label: "OWASP MASTG: false positives", url: "https://mas.owasp.org/MASTG/" }]
    },
    {
      id: "report", title: "The one-page finding format",
      why: "Every finding you write today should survive being read by someone who was not in the room.",
            concept: "A finding is a claim someone else can reproduce: line, command, output, impact, fix, scope.",
      see: "One page per finding with evidence quoted verbatim - not paraphrased, not screenshotted into unreadability.",
cmd: `# template - fill every field or delete the finding
FINDING: <one sentence, no adjectives>
WHERE:   <app, version, component/file:line>
EVIDENCE: <command>  ->  <output, trimmed to the proof>
IMPACT:  <who can do what, to whose data, without which permission>
FIX:     <specific attribute, setting, or code change>
LIMITS:  <what you did not test, and why it matters>`,
      sim: `FINDING: BugBazaar exports a content provider that returns other users' saved addresses.
WHERE:   com.BugBazaar 1.0 (file BugBazaar_v1.2.1.apk), ui.addresses.AddressContentProvider
EVIDENCE: adb shell content query --uri content://com.bugbazaar.provider.addresses/addresses
          -> Row: 0 id=2, nickname=Home, address=Dunder Mifflin,1725 Slough Avenue...
IMPACT:  Any installed app, and the ADB shell (uid 2000), can read every saved address with no
         permission and no user interaction.
FIX:     android:exported="false" on the provider, or gate it with a signature-level permission.
LIMITS:  Tested on Android 14 (API 34) and Android 16; not tested on Android 10 or below.`,
      expect: `every field populated, no sentence that a tool produced on its own.`,
      refs: [{ label: "OWASP: writing a finding", url: "https://owasp.org/www-community/vulnerabilities/" },
             { label: "MASTG: reporting", url: "https://mas.owasp.org/MASTG/" }]
    },
    {
      id: "limits", title: "Close the report with what you did not do",
      why: "Scope honesty is graded here, and it is the difference between a pentest and a sales document.",
            concept: "Every assessment has an edge: no backend, no fuzzing of third-party endpoints, one device, static-only MobX-style automation.",
      see: "A scope paragraph a reviewer can trust. Written badly it undermines everything above it.",
cmd: `# list what was out of scope or blocked, with the reason
# e.g. pinning not bypassed -> proxy not in path; MobSF dynamic -> no rooted image`,
      sim: `NOT TESTED / BLOCKED
- hpAndro pinning bypass: proxy not in the path at test time (stale Wi-Fi proxy), so the
  before/after pair could not be produced. Method documented, not claimed.
- MobSF dynamic analysis: requires a rooted, supported image; not available.
- Native library analysis: RootBeer .so inspected with strings only, not disassembled.`,
      expect: `a short, specific list - not "time constraints".`,
      refs: [{ label: "OWASP WSTG: reporting", url: "https://owasp.org/www-project-web-security-testing-guide/" }]
    }
  ]
});
