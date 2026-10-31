# Interactive guide (static HTML)

A self-contained, offline follow-along guide for the workshop. No server, no build step, no
dependencies — open `index.html` in a browser.

Open it:

```bash
open html-guide/index.html          # macOS
xdg-open html-guide/index.html      # Linux
# or drag the file into any browser
```

## What a student gets

- **`#/report` - report desk (capstone)** - the twenty real findings from both apps, with their evidence and
  no severity. Assign a severity and decide whether each belongs in a report, then export the document as markdown.
  Graded honestly: exact severity scores, one band away scores half, and `info` vs "context only" are different
  answers. State survives reload; 8 xp per finding triaged correctly, badge at fifteen.
- **`#/spot` - spot the flaw** - eight real artifacts (BugBazaar's manifest and `<application>` block, `checkdetect.smali`,
  `shared_prefs/userCred.xml`, a deep-link filter, an `apktool` log, a `content query` result, an f5 run): click the line
  that carries the finding, get scored on hit rate and false positives, and read why each marked line matters.
  Each module header links the artifacts that belong to it; 20 xp per correct read, badge at five.
- **Prerequisites, verified** - `#/check` opens with 18 tools; tick what you have and the rest show install
  commands per OS (macOS / Ubuntu / Windows), each with the evidence line recording how it was checked
  (brew 7.0.11, Ubuntu 24.04 apt, live sdkmanager, PyPI, Docker Hub, GitHub releases) and a docs link. Every module
  carries a folded strip derived from *its own commands*, so a module cannot need a tool it never mentions. Same
  table ships as Appendix F of the print handbook, generated from `content/prereqs.js`.
- **Nothing is executed** - the guide makes zero network requests: no `fetch`, no XHR, no WebSocket. `copy` puts
  text on the clipboard, `replay` types out the transcript recorded on the lab device, and both say so in a note
  under every command box. Verified by instrumenting the page and clicking every interactive surface: 0 attempts.
- **Step gates - "build it"** - 43 of the 51 steps now arrive with the one value that decides them blanked out of the
  command: an authority, a package, a port, the AVD name, `DES/ECB`, `--no-res`. Type it (case and quotes forgiven)
  and the command unlocks with copy/replay, +12 xp. `hint` shows the step's own command note, `show me` reveals it
  for free - a workshop step must never be a dead end. Each step now shows a title, one goal sentence, one sentence
  of why, and the gate; the idea, the line-by-line notes, what-you-see, the CWE paragraph and the success criteria
  are all folded behind short labels.
- **Top-10 matcher - name the risk** - the Top 10 used to be a poster: 743 words, nothing to click. It now ends
  with a board of ten risk chips and ten evidence lines, and the evidence is pulled from the findings at runtime
  (one pair resolves from the recorded `m1/crypto` output). Claim, then proof: pick a risk, pick the line that
  proves it, +10 xp. A wrong pick tells you what that risk category is actually about instead of just buzzing.
- **Patch-the-line** - the fixes page opens with the twenty findings as cards: the real evidence line folded in,
  then three things a developer might plausibly do. One closes the finding; the two others are genuine hardening
  advice that belongs to a *different* bug, and the card says which - choosing the wrong one is the lesson.
  +8 xp per finding, filters by app, severity and "triage only". The same content is Appendix G of the handbook.
- **Recall drill** - active recall, the one mechanic the quiz could not do: 29 flip cards (the 20 findings plus
  nine lab facts), no options, self-graded. `again` sends the card to the back of the queue, `got it` banks it,
  +4 xp the first time only. Bank the deck and the Total recall badge falls.
- **Diagrams, one per step.** `assets/figs.js` is a small SVG kit (flow / layers / tree / matrix /
  compare / lines) and `content/figs-map.js` maps every one of the 51 steps to a figure plus a caption;
  `#/home` gets the course map. All inline SVG, themed from CSS variables, ~66KB for 52 diagrams, zero
  external files. Every label is measured (`fit`/`wrap` against a 0.61em advance) before it is placed -
  verified at **0 text overlaps and 0 text-outside-its-box across all 51**, and the check is re-run after
  any figure change.
- **Every diagram box is clickable.** 218 hotspots across 52 figures; clicking (or focusing and pressing
  Enter) opens a panel under the figure with *what this does*, *why the step is here* and *what breaks if
  you skip it* - e.g. zipalign explains that it must run after `apktool b` and before `apksigner` because
  signing rewrites the archive. Content lives in `content/fig-details.js`, one entry per hotspot, verified
  **218/218 open with a matching note**.
- **Mission cards.** Each step is now: number + title, the diagram, one sentence, the gate/command, the
  terminal, the "what success looks like" check. Everything else (goal, the long reasoning, line-by-line
  notes, the careful callout, CWE/impact/fix, refs) sits in a single `the detail · N notes` disclosure -
  nothing deleted, just not in the way. On m1 that is **1,557 -> 702 words of visible prose (-55%)**.
- **Replay is a recording, never an execution.** Every `replay ▸` types out a transcript captured
  beforehand on the lab device; the page cannot run anything (audited: zero fetch/XHR/WebSocket/exec
  attempts across all 51 steps - see `observations/guide/REPLAY_AUDIT_2026-10-31.txt`). The command
  box says so, and the copy button exists precisely so students run it themselves. Verified 51/51:
  button wired, transcript shows, text identical to its source string, no step left mid-type.
- **Client briefings** - each module now opens with the email that would have started it: from, subject, three
  sentences of context, and "what they want" - the same line the module's steps deliver. Seven of them, and they
  are the only place the guide names a client, so a step reads as an obligation rather than an exercise.
- **The scanner's report, read properly** (`#/m6`, bottom of the module) - the real MobSF run from 2026-10-31, shipped as
  artifacts plus a reading exercise: two score cards (hpAndro 29/100, BugBazaar 34/100), links to both report **JSONs**
  and the **PDF** that exported, then **eight claims lifted verbatim from the reports** - open one and it says what the line
  actually lets an attacker do, with a REAL / TRIAGE / NOISE verdict and the step that proves it. A closing section lists
  **four findings no line in either report calls out** (the permission typo, the `@string/app_name` "permission", the eight
  merged components, the SQL concatenation). BugBazaar's PDF export fails inside MobSF (`xhtml2pdf` layout error on page 36)
  and the page says so - the JSON is complete, the pretty export is not.

- **`#/m1/manifest` - teach, then test** - the page opens on **Learn**, six lessons where the student changes the
  manifest and watches the verdict move: the four component kinds and the command that reaches each; `exported`
  true/false/unset; a filter with no attribute at targetSdk 30 (open, like hpAndro's 114) vs 32 (will not build);
  three guards on one provider (none / declared / `@string/app_name`); a `content://` URI builder whose command
  writes itself; and a library-merge slider that takes the APK from the source's 30 components / 13 reachable to
  64 / 21. Nothing is scored - the doors game is what scoring is for, and it is one click away.
- **`#/m1/manifest` - all five sections are interactive** - *The doors* is the 3-round game; *Raw* filters 528 lines
  down to the 122 that matter (chips: what matters / com.BugBazaar only / providers / intent-filters / everything) and
  asks you to click the line that makes a named component reachable; *Source* diffs the developer's 30 declarations
  against the built 64 and shows the **8 exported components the build added** (androidx.work, firebase, razorpay,
  gms, evernote); *What to look for* is 11 rules at one line each, expandable, with a jump into the filtered dump;
  *Annotated example* is 133 unmarked lines where you click the 18 high-severity ones, scored, with an answer-key
  escape hatch that costs the xp.
- **`#/m1/manifest` - crack the doors** - the explorer opens on a game, not the file: three rounds of six doors
  (BugBazaar's explicit attributes, hpAndro's 114 attribute-less components, then the `@string/app_name` trap).
  Each tile shows only `exported` / `permission` / `filter`; click the ones another app can open. Open tiles stay
  green with the one clause that explains them, locked ones shake and cost you a wrong. The full 64-component list
  with the command for each is folded underneath, and the counts come from parsing the dump, not from a summary.
- **`#/check` - readiness check** - the browser cannot see adb, so the page grades the transcript *your* machine
  produced: `sh lab-offline/readiness.sh > my-setup.txt`, paste the file, and eleven rules come back pass/warn/fail
  with the exact fix (no device, unauthorized, old adb, missing apktool, no proxy, stale `tcp:4455` forward, API 35+
  where Frida's Java hooks die). All-pass is worth 40 xp once; nothing here writes to the device.
- **`#/capstone` - six flags** - one per module: the lying versionName, an MD5 you produced, the provider with no
  permission, the targetSdk that explains your proxy, the deeplink into the webview, and the exported-component
  count. Answers are checked as sha256 of the normalised reply, so the page does not print them; hints cost 5/10/15
  xp off that flag's 25, and the award is derived rather than accumulated.
- **Predict the next step** - two questions inside every mechanism player (14 total). They fire the first time you
  reach the frame, whichever way you got there, mark the right option when you miss, explain why, and never ask
  twice. Correct first time is +10 xp.
- **Navigation** - four labelled groups in the sidebar (Start here / The course / Practice / Reference) instead of
  eighteen flat rows, with per-module `n/N` counts, one compact status block (steps, xp, rank), and a footer holding
  the two APK downloads, reset and the motion switch. The top bar keeps only the breadcrumb, a `⌘K` search button and
  three shortcuts; under 900 px the sidebar becomes a drawer behind a hamburger.
- **Animated mechanisms in every lesson** - each module opens with a five-frame player (seven sequences: uid/sandbox,
  APK-to-code, the Binder query path, the Frida agent channel, the TLS trust decision, the build/sign pipeline,
  scanner-to-finding). One node lights per frame with a caption, autoplays once, arrows/space/click to drive it,
  and it stops dead when motion is off or the tab is hidden.
- **Motion, with an off switch** - ticks land and the xp flies to the HUD, folds animate their height, wrong answers
  shake once and right ones pop, the report desk does not re-animate on every grade. `m` toggles all of it (and
  `prefers-reduced-motion` is honoured on load); durations stay in the 120-220 ms range so nothing reads as lag.
- **Search everything** - `Cmd/Ctrl+K` opens a palette over all 51 steps, every command, the 25 troubleshooting
  entries and the reference pages. `?` lists the keys (j/k step, r replay, / filter).
- **Compare your run** - every step with a recorded transcript has a "compare with the recording" panel: paste your
  terminal output and it diffs line by line, so "my output looks different" becomes a specific answer.
- **`#/fixes` - when it does not work** - 25 real failures from building these labs (unauthorized adb, the phantom
  `emulator-5554` that is really Burp on 5555, PEM vs DER, the shadowed CA filename, `run-as` failing on this
  handset), each with symptom, cause and the exact command. Filterable and copyable.
- **Resume** - the home page opens with the first step you have not ticked; `#/progress` exports a markdown lab log
  (modules, steps, status, rank, badges) for the Module 06 write-up.
- **Progressive disclosure on every page** - each step shows its claim, its command and its result, with the
  reasoning, the per-line command notes and the long explanations folded behind a summary; module pages carry a
  sticky step rail and a live progress bar. Print CSS re-expands everything, so a PDF keeps the whole text.
- **A gamified layer** - `#/practice` (20 quiz questions + 8 judgement calls) and `#/progress`
  (ranks, 25 badges, per-module bars). XP is derived from ticked steps and correct answers, so unticking a step
  lowers it; state lives in `asw-game-v1` beside the step progress.
- **7 modules, 51 steps**, opening with `#/method` (the eight doors of an APK assessment: actions,
  commands, evidence, traps, a time-box planner and a triage ladder) and `#/arch` (Android architecture: five layers, zygote, binder,
  the sandbox - every claim paired with a command run on the device; rendered by
  `assets/arch-vis.js` as an interactive stack, an animated request walk-through, a Binder hub and a
  sandbox/root figure - the prose blocks it supersedes are folded into `<details>`), plus `#/m3/scripts` (six Frida scripts with the identification logic,
  recorded output and a task each), in the order the labs run: setup → static/manifest → Frida →
  components/deep links → traffic & pinning → repackaging → automated pass & reporting.
- Each step has the exact command (with **copy**), a **Run** button that types out the real
  recorded output, a collapsible **"what success looks like"** panel, and official reference
  links (Android docs, Frida, OWASP MASTG, PortSwigger, Wireshark, MobSF).
- A **progress bar** with per-module counts, saved in the browser via `localStorage`.
- A **manifest explorer** for BugBazaar only, reachable under Module 01 (`#/m1/manifest`) - it is part of
  static analysis, not a separate product - one app, four views, one of them instructor-only:
  - **Raw manifest** - the real `aapt2 dump xmltree` taken from `BugBazaar_v1.2.1.apk` (528 lines),
    line-numbered, filterable (`N / total lines`), `copy manifest`, `exported=true` in red,
    permission/authority in amber.
  - **Annotated example** - a deliberately broken teaching manifest (29 issues, 133 lines), not
    BugBazaar's: two panes, the XML on the left with an issue key in the gutter, the explanation on
    the right (what the line lets an attacker do, and the line that should have been written).
    Clicking a key jumps to the line and vice versa. Also shipped as
    `labs-offline/annotated-AndroidManifest.xml` for students who work without a browser.
  - **Source manifest** - the upstream `app/src/main/AndroidManifest.xml` from
    `github.com/payatu/BugBazaar` (205 lines), `exported="true"` and `tools:ignore` highlighted.
    Source declares 30 components (13 exported); the built APK ships 64 (21 exported).
  - **What to look for** - ten checks that turn those two files into findings: SDK levels,
    `debuggable`, backup rules, cleartext/network-security-config, exported components, permission
    guards, providers, intent filters, manifest merging, and what is *not* a finding. Each card has
    the attribute names to hunt for, why it matters, a copyable command, and a `filter raw ->`
    button that jumps to the raw view with the search box pre-filled.
  - **Findings** - hidden. Only at `#/m1/manifest/answers`, never rendered at `#/m1/manifest`. 10 entries for
    BugBazaar, each quoting its manifest line, with `line N` jumping into the raw APK manifest and
    `src N` into the source file.

  hpAndro was removed from this explorer: its source is not published, so the source-vs-APK
  comparison - the point of the whole view - cannot be made for it. Its compiled manifest is still
  used by Module 1.
- Every module opens with a **Lesson** - the mental model before the commands: how Android runs an app,
  what an APK contains, how Frida reaches Java vs native, how TLS decides whether your proxy is trusted,
  what a smali patch must satisfy. Seven lessons, roughly 5-8 minutes of reading each.
- Every step carries, in this order: a **Goal** (what you will have at the end), a **The idea** note
  (what the step is testing), the **command**, a **per-command table** explaining what each command and
  flag does, the recorded output, **what you are looking at** (how to read that output), and
  **what success looks like** (the line that proves it worked). 51 goals and 258 command explanations.
- A **Where to look** page (`#/where`) - the methodology map: 17 rows of *question -> artifact -> command*,
  filterable. Use it when stuck; most dead ends are a question aimed at the wrong artifact.
- All external reference links were re-verified with real HTTP requests on 2026-10-28: 70 unique URLs,
  every one now resolves. `frida.re` resets TLS intermittently - a 000 from curl there is the host, not a
  dead page.
- Keyboard: `j`/`k` move between steps, `g` then `h` goes home, `r` runs the step in view.

### Module 01 is longer than the others on purpose

Static analysis is where a student either learns to read an app or learns to run tools. It now runs
15 steps: decode, manifest questions, exported surface, permission resolution, hardcoded secrets,
archive tree, the files that answer most questions, a database pulled with `run-as` and opened with
`sqlite3`, a provider's own SQL, storage and backup, logging and clipboard, WebView settings, crypto,
and then **jadx-gui** - search for a string, walk the callers, and copy the class path into a Frida
hook. The last two steps are the bridge from reading code to hooking it, and they live here rather
than in the Frida module because that is the order the work happens in.


### Two reference pages beside the modules

- **Where to look** (`#/where`) - the question, the artifact that answers it, and the command that
  reaches it. 17 rows, filterable.
- **Mobile Top 10** (`#/top10`) - the OWASP Mobile Top 10 (2024 final release), one card per risk,
  each mapped to the step in this guide where a student meets that category. The closing note is
  deliberate: the 2024 project lists six risks that did not make the list, and three of this
  workshop's strongest findings (an exported provider, an exported activity, a deeplink into a login
  screen) live there. Report behaviour, then name the category.

## Honesty rules baked into the content

- Every simulated output is transcribed from a run on the shipped builds - including the MobSF step,
  which was pulled and run here on 2026-10-31 (image 2.48GB, both APKs scanned statically). Its
  `expect` line was also corrected in that pass: MobSF answers **302** on `/` because it redirects to
  `/login/`, not the 200 the step used to claim.
- Where a claim is platform-dependent it says so: `UserProfileProvider` returns *no rows* on
  API 34 and a `SecurityException` on Android 16, and the step teaches both instead of picking one.
- Where a control is accidental (the `@string/app_name` permission), the step says so rather than
  calling it a protection.

## Files

```
index.html                  shell: sidebar, top bar, script order
assets/style.css            all styling (dark, no frameworks)
assets/app.js               router, step renderer, terminal simulator, manifest viewer
content/files-manifests.js  real xmltree dumps, embedded as strings (no fetch -> works on file://)
content/modules-a.js        M0 setup, M1 static analysis
content/modules-b.js        M2 Frida, M3 components
content/modules-c.js        M4 traffic/pinning, M5 repackaging
content/modules-d.js        M6 MobSF + reporting
```

`file://` pages cannot `fetch()` local files, which is why the manifests are embedded as JS
strings. Keep that property — do not switch to `fetch` or ES modules, or the guide breaks the
moment a student opens it without a server.

## Adding or editing a step

Append to a module's `steps` array in the relevant `content/*.js`:

```js
{
  id: "short-slug",                 // unique within the module
  title: "What the student does",
  why: "One sentence of motivation (HTML allowed).",
  cmd: `adb shell ...`,             // backticks; shown with a copy button
  sim: `$ adb shell ...\noutput`,   // what Run types out - must be real output
  expect: `the line that proves it worked`,
  expectNote: "How to tell a real failure from a platform difference.",
  note: "Optional callout.", noteKind: "bad" | "ok",
  refs: [{ label: "Source name", url: "https://..." }]
}
```

Rules that keep it useful: one action per step, `sim` must be a transcript you actually produced,
`expect` must be checkable by eye, and never paste a screen name you have not verified in the APK.

## Verified

Checked in Chrome via CDP against the shipped files: 7 modules / 51 steps render, every step has a
command, a terminal and a success panel, 57 reference links resolve to `https://`, the manifest
viewer reports 574/528 lines with 3 `exported=true` hits in hpAndro, filtering works
(`exported(0x01010010)=true` → 3 matches; `UserProfileProvider` → 1 match in BugBazaar), copy
works, ticks persist across reload, and there are no console errors.
