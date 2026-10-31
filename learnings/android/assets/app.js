/* Android Security Workshop - interactive guide engine (vanilla, file:// safe) */
(function () {
  "use strict";

  var MODULES = window.MODULES || [];
  var FILES = window.FILES || {};
  var STORE = "asw-progress-v1";
  var state = { done: {} , route: null };

  try { state.done = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { state.done = {}; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state.done)); } catch (e) {} }

  /* ---------------------------------------------------------------- reading layer
   * Every step carries ~144 words of prose. Shown flat, a module is a wall of text nobody reads. The rule
   * here: the CLAIM stays visible, the REASONING folds. Splitting is done on sentence boundaries so the
   * HTML (code tags) survives, and anything without a clean split stays whole rather than being mangled.
   */

  /* Fold a rendered section: keep its first paragraph as the teaser, move the rest behind a summary.
     Used for the home page's "start here" wall and anything else that reads like a document. */
  function foldSection(sel, summaryText) {
    var sec = document.querySelector(sel);
    if (!sec) return;
    var firstP = sec.querySelector("p");
    var kids = Array.prototype.slice.call(sec.children);
    var holder = document.createElement("details");
    holder.className = "fold bigfold";
    var sm = document.createElement("summary");
    sm.textContent = summaryText;
    holder.appendChild(sm);
    var inner = document.createElement("div");
    inner.className = "foldin";
    kids.forEach(function (k) {
      if (k === firstP || (k.classList && k.classList.contains("lesson-head"))) return;
      inner.appendChild(k);
    });
    holder.appendChild(inner);
    sec.appendChild(holder);
  }

  function splitLead(html) {
    if (!html) return ["", ""];
    var t = String(html), m = t.match(/^([\s\S]*?[.!?])(\s+)(?=[A-Z<(])/);
    if (!m) return [t, ""];
    return [m[1], t.slice(m[0].length)];
  }

  function fold(summary, inner, cls) {
    if (!inner || !String(inner).replace(/<[^>]+>/g, "").trim()) return "";
    return '<details class="fold' + (cls ? " " + cls : "") + '"><summary>' + summary + '</summary>' +
           '<div class="foldin">' + inner + '</div></details>';
  }

  function sentences(html) {
    var parts = String(html || "").split(/(?<=[.!?])\s+(?=[A-Z<(])/);
    return parts.filter(function (x) { return x.trim(); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function el(id) { return document.getElementById(id); }
  function allSteps() { var a = []; MODULES.forEach(function (m) { (m.steps || []).forEach(function (s) { a.push({ m: m, s: s }); }); }); return a; }
  function stepKey(mid, sid) { return mid + "/" + sid; }
  function isDone(mid, sid) { return !!state.done[stepKey(mid, sid)]; }

  /* ---------------------------------------------------------------- progress */
  function refreshProgress() {
    var total = allSteps().length, d = 0;
    allSteps().forEach(function (x) { if (isDone(x.m.id, x.s.id)) d++; });
    var pct = total ? Math.round((d / total) * 100) : 0;
    var bar = document.querySelector(".bar i"); if (bar) bar.style.width = pct + "%";
    var m = el("pmeta"); if (m) m.textContent = d + " / " + total + " steps";
    var p = el("ppct"); if (p) p.textContent = pct + "%";
    if (typeof paintNavCounts === "function") paintNavCounts();
    if (typeof paintSpine === "function") paintSpine();
    if (typeof paintTopProg === "function") paintTopProg();
  }

  /* the seven-module spine: one glance tells you where you are in the course */
  function paintSpine() {
    var host = el("spine");
    if (!host) return;
    var firstOpen = null;
    MODULES.forEach(function (m) {
      if (firstOpen) return;
      var tot = (m.steps || []).length, dn = 0;
      (m.steps || []).forEach(function (s) { if (isDone(m.id, s.id)) dn++; });
      if (dn < tot) firstOpen = m.id;
    });
    host.innerHTML = MODULES.map(function (m, i) {
      var tot = (m.steps || []).length, dn = 0;
      (m.steps || []).forEach(function (s) { if (isDone(m.id, s.id)) dn++; });
      var cls = "sp" + (tot && dn === tot ? " done" : "") + (m.id === firstOpen ? " now" : "");
      return '<a class="' + cls + '" href="#/' + m.id + '" title="' + esc(m.title) + ' \u2014 ' + dn + "/" + tot + ' steps">' +
        '<i>' + String(i).padStart(2, "0") + '</i>' +
        '<b><s style="width:' + (tot ? Math.round(dn / tot * 100) : 0) + '%"></s></b></a>';
    }).join("");
  }

  /* the same number in the top bar, so it is visible while you are ticking boxes */
  function paintTopProg() {
    var total = allSteps().length, d = 0;
    allSteps().forEach(function (x) { if (isDone(x.m.id, x.s.id)) d++; });
    var n = el("tpnum"); if (n) n.textContent = d + " / " + total;
    var b = document.querySelector("#topprog .tp-bar i");
    if (b) b.style.width = (total ? Math.round(d / total * 100) : 0) + "%";
  }

  /* ---------------------------------------------------------------- sidebar */
  function renderNav() {
    var nav = el("nav");
    nav.innerHTML = "";

    function row(o) {
      var x = document.createElement("a");
      x.href = o.href;
      x.dataset.mod = o.mod;
      if (o.cls) x.className = o.cls;
      x.title = o.title || o.label;
      x.innerHTML = '<span class="ni">' + (o.num || o.icon || "") + "</span>" +
        '<span class="ni-lab">' + esc(o.label) + "</span>" +
        (o.count ? '<span class="ni-cnt" data-cnt="' + o.count + '"></span>' : "");
      return x;
    }

    function section(label, rows, note) {
      var g = document.createElement("div");
      g.className = "navsec";
      var hd = document.createElement("div");
      hd.className = "navsec-h";
      hd.innerHTML = "<span>" + esc(label) + "</span>" + (note ? '<span class="navsec-n">' + esc(note) + "</span>" : "");
      g.appendChild(hd);
      rows.forEach(function (r) { g.appendChild(r); });
      nav.appendChild(g);
    }

    /* 1. start here - orientation before content */
    section("Start here", [
      row({ href: "#/home", mod: "_home", icon: "\u2302", label: "Overview" }),
      row({ href: "#/method", mod: "_method", icon: "\u25b8", label: "Methodology", title: "The eight doors, in order" }),
      row({ href: "#/arch", mod: "_arch", icon: "\u25a4", label: "Architecture", title: "Five layers, zygote, binder, sandbox" }),
      row({ href: "#/check", mod: "_check", icon: "\u2713", label: "Readiness check", title: "Grade your machine before Module 00" })
    ]);

    /* 2. the course - numbered, with per-module counts */
    var course = MODULES.map(function (m, i) {
      return row({
        href: "#/" + m.id, mod: m.id, num: String(i).padStart(2, "0"),
        label: m.title, count: m.id,
        title: (m.tag || "") + " \u00b7 " + m.title
      });
    });
    course.splice(2, 0, row({
      href: "#/m1/manifest", mod: "_m1manifest", cls: "nested", num: "\u21b3",
      label: "Manifest explorer", title: "Raw dump, annotated source, checklist, findings"
    }));
    section("The course", course, "51 steps");

    /* 3. practice - the things you do rather than read */
    section("Practice", [
      row({ href: "#/spot", mod: "_spot", icon: "\u25ce", label: "Spot the flaw", title: "Click the line that matters" }),
      row({ href: "#/capstone", mod: "_capstone", icon: "\u2691", label: "Capstone: six flags", title: "One flag per module, hints cost xp" }),
      row({ href: "#/report", mod: "_report", icon: "\u25a7", label: "Report desk", title: "Triage 20 findings, export the report" }),
      row({ href: "#/practice", mod: "_practice", icon: "\u25c9", label: "Knowledge check", title: "Quiz and judgement calls" }),
      row({ href: "#/progress", mod: "_progress", icon: "\u25b0", label: "Your progress", title: "Rank, badges, export" })
    ]);

    /* 4. reference - looked up, not read in order */
    section("Reference", [
      row({ href: "#/where", mod: "_where", icon: "\u2318", label: "Where to look", title: "Question to artifact to command" }),
      row({ href: "#/top10", mod: "_top10", icon: "\u2691", label: "OWASP Top 10", title: "Risk taxonomy mapped to the steps" }),
      row({ href: "#/fixes", mod: "_fixes", icon: "\u26a0", label: "When it breaks", title: "25 real failures and their fixes" })
    ]);

    paintNavCounts();
  }

  /* counts live in their own function so a tick can refresh them without rebuilding the menu */
  function paintNavCounts() {
    MODULES.forEach(function (m) {
      var c = document.querySelector('nav .ni-cnt[data-cnt="' + m.id + '"]');
      if (!c) return;
      var tot = (m.steps || []).length, dn = 0;
      (m.steps || []).forEach(function (s) { if (isDone(m.id, s.id)) dn++; });
      c.textContent = dn ? dn + "/" + tot : "";
      c.classList.toggle("full", tot > 0 && dn === tot);
    });
  }


  /* ---------------------------------------------------------------- step gates
     A step arrives with one value blanked out - the value that decides it. The token is a substring of that
     step's own command, so the answer can never disagree with what the page tells you to run. Typing it is the
     interaction; "show me" always exists, because a workshop step must never be a dead end. */
  function cmdBoxHtml(cmd) {
    return '<div class="cmdbox"><pre>' + esc(cmd) + '</pre><div class="tools">' +
      '<button data-copy title="copies the command to your clipboard - nothing runs here">copy</button>' +
      '<button data-run title="replays the recording captured on the lab device - nothing is executed">replay \u25b8</button>' +
      '</div><div class="norun">this page never runs commands: copy them into your own terminal, or replay the recorded output</div></div>';
  }

  function gateBlank(cmd, token) {
    var lines = cmd.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      var at = lines[i].indexOf(token);
      if (at !== -1) {
        lines[i] = lines[i].slice(0, at) + '\u0001' + lines[i].slice(at + token.length);
        return lines.join("\n");
      }
    }
    return cmd;
  }

  /* one polite channel for everything that happens without a page change: a gate verdict,
     a tick, a copy, a rank-up. The visual toast is unchanged; this is the same sentence for
     a screen reader. */
  var announceT = null;
  function announce(msg) {
    var box = document.getElementById('announcer');
    if (!box || !msg) return;
    box.textContent = '';
    clearTimeout(announceT);
    announceT = setTimeout(function () { box.textContent = String(msg); }, 40);
  }
  window.Announce = announce;

  function gateHtml(key, g, cmd) {
    var blanked = gateBlank(cmd, g.token);
    var parts = blanked.split("\u0001");
    var marked = esc(parts[0]) + '<input class="gate-in" spellcheck="false" autocomplete="off" ' +
      'aria-label="the missing value" style="width:' + Math.min(34, Math.max(12, g.token.length + 2)) + 'ch">' + esc(parts[1] || "");
    return '<div class="gate" data-gate="' + esc(key) + '">' +
      '<div class="gate-k">build it</div>' +
      '<div class="gate-q">' + esc(g.q) + '</div>' +
      '<pre class="gate-cmd">' + marked + '</pre>' +
      '<div class="gate-bar">' +
        '<button data-gate-go>check</button>' +
        (g.hint ? '<button data-gate-hint>hint</button>' : '') +
        '<button data-gate-skip>show me \u25b8</button>' +
      '</div>' +
      '<div class="gate-fb"></div>' +
      (g.hint ? '<div class="gate-hintbox" hidden>' + esc(g.hint) + '</div>' : '') +
    '</div>';
  }

  function revealGate(sec, key, cmd) {
    var g = sec.querySelector(".gate");
    if (!g) return;
    var box = document.createElement("div");
    box.innerHTML = cmdBoxHtml(cmd);
    g.replaceWith(box.firstChild);
    var b = sec.querySelector(".cmdbox");
    if (b) wireCmd(sec, b);
    var nb = sec.querySelector("[data-run]");
    if (nb && sec.__runHandler) nb.onclick = sec.__runHandler;
  }

  function wireCmd(sec, box) {
    var copy = box.querySelector("[data-copy]");
    if (copy) copy.onclick = function () {
      var text = box.querySelector("pre").textContent;
      function fallback() {
        var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); copy.textContent = "copied"; announce("command copied"); }
        catch (e) { copy.textContent = "select+copy"; announce("the browser blocked the clipboard - select the command and copy it"); }
        document.body.removeChild(t);
        setTimeout(function () { copy.textContent = "copy"; }, 1400);
      }
      /* navigator.clipboard does not exist on an insecure origin (http on a LAN address), so a
         bare .writeText() call would throw and the button would look dead */
      if (!navigator.clipboard || !navigator.clipboard.writeText) { fallback(); return; }
      navigator.clipboard.writeText(text).then(function () {
        copy.textContent = "copied"; announce("command copied"); setTimeout(function () { copy.textContent = "copy"; }, 1200);
      }, fallback);
    };
    /* the replay handler belongs to the step (it knows the recorded text); wireSteps stashes it here */
    var nb = box.querySelector("[data-run]");
    if (nb && sec.__runHandler) nb.onclick = sec.__runHandler;
  }

  /* ---------------------------------------------------------------- sidebar chrome */
  function wireSidebar() {
    var ham = el("hamb"), close = el("sideclose"), layout = document.querySelector(".layout");
    function open(on) { if (layout) layout.classList.toggle("nav-open", on); }
    if (ham) ham.onclick = function () { open(!(layout && layout.classList.contains("nav-open"))); };
    if (close) close.onclick = function () { open(false); };
    var ts = el("tsearch");
    if (ts) ts.onclick = function () { if (window.Toolkit) window.Toolkit.openPalette(); };
    var mb = el("motionbtn");
    if (mb) {
      var paint = function () {
        var on = window.Motion ? window.Motion.on() : true;
        mb.textContent = on ? "motion on" : "motion off";
        mb.classList.toggle("off", !on);
      };
      mb.onclick = function () {
        if (window.Motion) window.Motion.toggle();
        paint();
        if (window.Game && window.Game.toast) {
          window.Game.toast(window.Motion.on() ? "Motion on" : "Motion off",
            window.Motion.on() ? "animations restored" : "everything is instant now");
        }
      };
      paint();
    }
    /* a click on any nav row closes the drawer on small screens */
    var nav = el("nav");
    if (nav) nav.addEventListener("click", function (e) { if (e.target.tagName === "A") open(false); });
  }

  /* ---------------------------------------------------------------- home */
  function viewHome() {
    var total = allSteps().length;
    var doneAll = 0;
    allSteps().forEach(function (x) { if (isDone(x.m.id, x.s.id)) doneAll++; });
    var firstOpen = null;
    MODULES.forEach(function (m) {
      if (firstOpen) return;
      var tot = (m.steps || []).length, dn = 0;
      (m.steps || []).forEach(function (s) { if (isDone(m.id, s.id)) dn++; });
      if (dn < tot) firstOpen = m;
    });
    var f = window.Figs ? window.Figs.get("home/map") : null;

    var html = '<div class="wrap homev3">' +

      /* ---------- one screen of orientation, nothing else ---------- */
      '<header class="hv-hero">' +
        '<div class="hv-k">seven modules \u00b7 two apps</div>' +
        '<h1>Android Security Workshop</h1>' +
        '<p class="hv-lead">Seven modules from a clean laptop to a written, defensible finding. ' +
          'Every command was run against the shipped builds of <b>hpAndro 1.3</b> and <b>BugBazaar 1.2.1</b> — ' +
          'what you read when you press <b>Run</b> is the real transcript.</p>' +
        '<div class="hv-stats"><span><b>7</b> modules</span><span><b>' + total + '</b> steps</span>' +
          '<span><b>43</b> gates</span><span><b>0</b> servers</span></div>' +
        '<div class="hv-cta">' +
          (firstOpen
            ? '<a class="btn primary" href="#/' + firstOpen.id + '">' +
              (doneAll ? 'Continue · ' : 'Start here · ') + esc(firstOpen.tag) + ' →</a>'
            : '<a class="btn primary" href="#/m0">Start at Module 00 →</a>') +
          '<a class="btn" href="#/check">Check my machine</a>' +
          '<a class="btn ghost" href="#/method">The method</a>' +
        '</div>' +
        '<div class="hv-prog"><span class="hv-pb"><i style="width:' + (total ? Math.round(doneAll / total * 100) : 0) + '%"></i></span>' +
          '<span class="hv-pn">' + doneAll + ' of ' + total + ' steps done' +
          (window.Game ? ' · ' + window.Game.stats().total + ' xp' : '') + '</span></div>' +
      '</header>' +

      /* ---------- the path: the only list on this page ---------- */
      '<section class="hv-path">' +
        '<div class="hv-h"><h2>The path</h2><span>in order — each module assumes the one before it</span></div>' +
        '<ol class="pmap">';

    MODULES.forEach(function (m, i) {
      var tot = (m.steps || []).length, dn = 0;
      (m.steps || []).forEach(function (s) { if (isDone(m.id, s.id)) dn++; });
      var st = (tot && dn === tot) ? "done" : (m === firstOpen ? "now" : "todo");
      var note = st === "done" ? "done" : (st === "now" ? (dn ? "continue" : "start here") : "");
      html += '<li class="prow ' + st + '"><a href="#/' + m.id + '">' +
        '<span class="pn">' + String(i).padStart(2, "0") + '</span>' +
        '<span class="pt"><b>' + esc(m.title) + '</b><em>' + esc(m.goal || "") + '</em></span>' +
        '<span class="pm"><span class="pc">' + dn + "/" + tot + ' steps</span><span class="px">' + esc(m.time || "") + '</span></span>' +
        (note ? '<span class="pnote">' + note + '</span>' : '') +
        '</a></li>';
    });

    html += '</ol></section>' +

      /* ---------- everything that is not the path, in two short lists ---------- */
      '<section class="hv-two">' +
        '<div class="hv-col"><h3>Before you start</h3>' +
          '<a href="#/check"><b>Readiness check</b><span>grade your machine against a real transcript</span></a>' +
          '<a href="#/method"><b>Methodology</b><span>the eight doors, in the order that pays</span></a>' +
          '<a href="#/arch"><b>Architecture</b><span>layers, zygote, Binder, the sandbox</span></a>' +
        '</div>' +
        '<div class="hv-col"><h3>Practice and wrap-up</h3>' +
          '<a href="#/spot"><b>Spot the flaw</b><span>eight real artifacts, click the line that matters</span></a>' +
          '<a href="#/report"><b>Report desk</b><span>twenty findings, decide what each is worth</span></a>' +
          '<a href="#/capstone"><b>Capstone</b><span>one flag per module</span></a>' +
          '<a href="#/practice"><b>Knowledge check</b><span>questions and judgement calls</span></a>' +
        '</div>' +
      '</section>' +

      /* ---------- the prose, folded: available, never in the way ---------- */
      '<details class="hv-fold"><summary>How to read this guide · what you need · the four layers</summary>' +
        '<div class="hv-foldbody">' +
          '<h4>Every page is built in four layers</h4><ul>' +
            '<li><b>Lesson</b> — the idea and the mental model, before any command. Read it once; it is what makes the commands make sense.</li>' +
            '<li><b>The idea</b> — one paragraph on what this particular step is testing.</li>' +
            '<li><b>The command</b> — copy it and run it yourself. The <b>Run</b> button replays the recorded output.</li>' +
            '<li><b>What you are looking at</b> and <b>what success looks like</b> — how to read the output, and the line that tells you it worked.</li>' +
          '</ul>' +
          '<h4>What you need</h4><p>A laptop with the Android SDK, an emulator (API 30\\u201334, <code>google_apis</code>) or a rooted test phone, ' +
            'and the two APKs in <code>lab-apps/</code>. Module 00 walks through all of it, including the PATH that makes the other modules work.</p>' +
          '<h4>Where the modules go</h4><ul>' +
            '<li><b>00 Setup</b> — device, ADB, root, install. Nothing else works until this does.</li>' +
            '<li><b>01 Static</b> — the APK as an artifact: manifest, code, secrets, smali.</li>' +
            '<li><b>02 Components</b> — the doors other apps can knock on, and the locks that are missing.</li>' +
            '<li><b>03 Frida</b> — the app at runtime: observe a check, then change its answer.</li>' +
            '<li><b>04 Traffic</b> — what leaves the device, and why your proxy sometimes sees nothing.</li>' +
            '<li><b>05 Repackage</b> — patch smali, rebuild, re-sign, reinstall, and prove the change.</li>' +
            '<li><b>06 Automation</b> — scan, verify the alerts, then write what you can defend.</li>' +
          '</ul>' +
          '<p class="hv-keys"><kbd>j</kbd>/<kbd>k</kbd> move between steps · <kbd>g</kbd> then <kbd>h</kbd> goes home · progress is saved in this browser</p>' +
          (f ? '<figure class="fig hero-fig" data-key="home/map"><div class="fig-frame">' + f.svg + '</div>' +
               '<figcaption>' + esc(f.caption) + '</figcaption>' +
               '<div class="fig-hint">click a box — what it does, why it is needed, what breaks without it</div>' +
               '<div class="fig-read" hidden></div></figure>' : '') +
        '</div></details>' +

      '</div>';

    el("main").innerHTML = html;
    wireFigures();
    if (window.Motion) window.Motion.routeIn(document.getElementById("main"));
  }

  /* ---------------------------------------------------------------- manifest explorer */
  function copyText(text, btn) {
    var back = btn.textContent;
    function ok() { btn.textContent = "copied"; setTimeout(function () { btn.textContent = back; }, 1200); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { btn.textContent = "select+copy"; }
      document.body.removeChild(ta);
    }
  }

  /* findings only exist at #/m1/manifest/answers - the student route never renders them */
  function viewFiles(showAnswers) {
    var SEV = { high: "High", med: "Medium", low: "Low", info: "Info" };
    var APP = "bugbazaar";                       /* the only manifest in the explorer */
    var tab = showAnswers ? "find" : "learn";
    var srcSet = window.SOURCE_MANIFESTS || {};
    var guide = window.MANIFEST_GUIDE || [];

    el("main").innerHTML = '<div class="wrap">' +
      '<h2 class="mod">Manifest explorer</h2>' +
      '<p class="modgoal">Six lessons, then the same six ideas as a game. <b>Learn</b> hands you the controls: ' +
      'flip <code>exported</code>, add a filter, attach a permission, build a <code>content://</code> URI, merge a ' +
      'library - and watch whether another app can still get in. <b>Practice</b> takes the explanations away. ' +
      '<b>Raw</b> is the <code>aapt2 dump</code> from the APK, the file the device actually reads; <b>Source</b> is ' +
      'what the developer wrote; <b>What to look for</b> is the eleven rules; <b>Annotated example</b> is a ' +
      'deliberately broken manifest to hunt through.' +
      (showAnswers ? ' <b>Findings</b> is the assessed version, with the line each claim came from.' : '') + '</p>' +
      '<div class="tabs">' +
        '<button class="tab" data-tab="learn">Learn <span class="pill">6</span></button>' +
        '<button class="tab" data-tab="doors">Practice: the doors <span class="pill">64</span></button>' +
        '<button class="tab" data-tab="raw">Raw manifest <span class="pill" id="n-lines"></span></button>' +
        '<button class="tab" data-tab="src">Source manifest <span class="pill" id="n-src"></span></button>' +
        '<button class="tab" data-tab="guide">What to look for <span class="pill" id="n-guide"></span></button>' +
        '<button class="tab" data-tab="example">Annotated example <span class="pill" id="n-ex"></span></button>' +
        (showAnswers ? '<button class="tab" data-tab="find">Findings <span class="pill" id="n-find"></span></button>' : '') +
      '</div>' +
      '<section id="pane-learn"><div id="learn-host"></div></section>' +
      '<section id="pane-doors" hidden><div id="doors-host"></div></section>' +
      '<section id="pane-raw" hidden>' +
        '<div class="viewer"><div class="viewer-head">' +
          '<span class="file" id="fname"></span><span class="spacer"></span>' +
          '<span class="count" id="fcount"></span>' +
          '<input id="fsearch" placeholder="filter: exported, provider, permission\u2026">' +
          '<button class="btn ghost" id="fcopy">copy manifest</button>' +
        '</div><pre id="fbody"></pre>' +
        '<div class="legend"><span><i style="background:rgba(209,107,107,.5)"></i>exported=true</span>' +
        '<span><i style="background:rgba(217,164,65,.5)"></i>permission / authority</span>' +
        '<span><i style="background:#3d4a5c"></i>other</span></div></div>' +
      '</section>' +
      '<section id="pane-src" hidden>' +
        '<div class="viewer"><div class="viewer-head">' +
          '<span class="file" id="sname"></span><span class="spacer"></span>' +
          '<a class="src-link" id="slink" target="_blank" rel="noopener">upstream \u2197</a>' +
          '<button class="btn ghost" id="scopy">copy source</button>' +
        '</div><pre id="sbody"></pre>' +
        '<div class="legend"><span id="snote"></span></div></div>' +
      '</section>' +
      '<section id="pane-guide" hidden><div id="glist"></div></section>' +
      '<section id="pane-ex" hidden>' +
        '<p class="modgoal" id="exintro"></p>' +
        '<div class="anwrap"><div class="anxml"><div class="viewer-head"><span class="file" id="exfile"></span>' +
        '<span class="spacer"></span><span class="count" id="excount"></span>' +
        '<button class="btn ghost" id="excopy">copy xml</button></div><pre id="xbody"></pre></div>' +
        '<div class="anlist" id="xlist"></div></div>' +
        '<div class="note" id="exnote"></div></section>' +
      (showAnswers ? '<section id="pane-find" hidden><div id="flist"></div></section>' : '') +
      '</div>';

    function rawOf(app) { return (FILES[app] || "").replace(/\n$/, ""); }

    function paintRaw() {
      var raw = rawOf(APP);
      var q = (el("fsearch").value || "").toLowerCase();
      el("fname").textContent = "BugBazaar_v1.2.1.apk \u2192 AndroidManifest.xml (compiled)";
      var out = [], matched = 0, total = 0;
      raw.split("\n").forEach(function (line, i) {
        total++;
        var cls = "";
        if (/exported\(0x01010010\)=true/.test(line)) cls = "flag";
        else if (/ermission|authorities/.test(line)) cls = "hit";
        if (q) {
          if (line.toLowerCase().indexOf(q) === -1) cls = (cls ? cls + " " : "") + "dim";
          else matched++;
        }
        out.push('<div class="ln ' + cls + '" data-line="' + (i + 1) + '"><span class="g">' + (i + 1) +
                 '</span><span class="c">' + esc(line) + '</span></div>');
      });
      el("fbody").innerHTML = out.join("");
      el("fcount").textContent = q ? (matched + " / " + total + " lines") : (total + " lines");
      el("n-lines").textContent = total;
    }

    function paintSrc() {
      var s = srcSet[APP];
      if (!s) {
        el("sname").textContent = "no source available";
        el("slink").style.display = "none"; el("scopy").style.display = "none";
        el("n-src").textContent = "\u2014";
        return;
      }
      el("sname").textContent = s.path + "  (source)";
      el("slink").style.display = ""; el("slink").href = s.url;
      el("scopy").style.display = "";
      var lines = s.xml.replace(/\n$/, "").split("\n"), out = [];
      lines.forEach(function (line, i) {
        var cls = "";
        if (/exported="true"/.test(line)) cls = "flag";
        else if (/tools:ignore|tools:replace/.test(line)) cls = "hit";
        out.push('<div class="ln ' + cls + '" data-line="' + (i + 1) + '"><span class="g">' + (i + 1) +
                 '</span><span class="c">' + esc(line) + '</span></div>');
      });
      el("sbody").innerHTML = out.join("");
      el("snote").textContent = s.note;
      el("n-src").textContent = lines.length;
    }


    function paintAnnotated() {
      var A = window.MANIFEST_ANNOTATED;
      if (!A) { el("xbody").innerHTML = '<div class="ln"><span class="c">no annotated manifest loaded</span></div>'; return; }
      var lines = A.xml.replace(/\n$/, "").split("\n");
      /* resolve anchors to line numbers, honouring `occurrence` for anchors that repeat */
      var byLine = {};
      A.issues.forEach(function (iss) {
        var want = iss.occurrence || 1, seen = 0, idx = -1;
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].indexOf(iss.anchor) !== -1) {
            seen++;
            if (seen === want) { idx = i; break; }
          }
        }
        iss._line = idx + 1;
        if (idx >= 0) (byLine[idx + 1] = byLine[idx + 1] || []).push(iss);
      });
      var out = [];
      lines.forEach(function (line, i) {
        var n = i + 1, marks = byLine[n];
        var cls = marks ? "hit" : "";
        out.push('<div class="ln ' + cls + '" data-xline="' + n + '">' +
                 '<span class="g">' + n + '</span>' +
                 '<span class="mk">' + (marks ? marks.map(function (m) { return m.key; }).join(" ") : "") + '</span>' +
                 '<span class="c">' + esc(line) + '</span></div>');
      });
      el("xbody").innerHTML = out.join("");
      el("exfile").textContent = A.file;
      el("excount").textContent = A.issues.length + " issues on " + Object.keys(byLine).length + " marked lines of " + lines.length;
      el("n-ex").textContent = A.issues.length;
      el("exintro").innerHTML = A.intro;
      el("exnote").innerHTML = "<b>" + esc(A.note || "") + "</b>";

      var SEVL = { high: "High", med: "Medium", low: "Low", info: "Info" };
      var order = { high: 0, med: 1, low: 2, info: 3 };
      var sorted = A.issues.slice().sort(function (a, b) {
        return (order[a.sev] - order[b.sev]) || (a._line - b._line);
      });
      el("xlist").innerHTML = sorted.map(function (iss) {
        var src = iss._line > 0 ? lines[iss._line - 1].trim() : "(anchor not found)";
        return '<div class="fcard sev-' + iss.sev + ' ancard" data-xkey="' + iss.key + '">' +
          '<div class="fhead"><span class="sev ' + iss.sev + '">' + SEVL[iss.sev] + '</span>' +
          '<span class="xkey">' + esc(iss.key) + '</span>' +
          '<span class="ftitle">' + esc(iss.title) + '</span><span class="spacer"></span>' +
          '<button class="mini" data-xgoto="' + iss._line + '">line ' + iss._line + ' \u2197</button></div>' +
          '<pre class="ev">' + esc(src) + '</pre>' +
          '<p class="fp"><b>Why this line is vulnerable.</b> ' + iss.why + '</p>' +
          '<div class="fverify"><span class="lbl">should read</span><code>' + esc(iss.fix) + '</code>' +
          '<button class="mini" data-xcopy="' + esc(iss.fix) + '">copy</button></div>' +
          '<div class="frefs"><a href="' + esc(iss.ref) + '" target="_blank" rel="noopener">Android docs \u2197</a></div>' +
          '</div>';
      }).join("");

      Array.prototype.forEach.call(document.querySelectorAll("[data-xgoto]"), function (b) {
        b.onclick = function () { jumpToX(parseInt(b.dataset.xgoto, 10), b.closest(".ancard").dataset.xkey); };
      });
      /* the whole card is the jump target - hunting for a small button inside 29 cards is friction */
      Array.prototype.forEach.call(document.querySelectorAll(".ancard"), function (card) {
        card.addEventListener("click", function (e) {
          if (e.target.closest("button") || e.target.closest("a")) return;
          var go = card.querySelector("[data-xgoto]");
          if (go) go.click();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-xcopy]"), function (b) {
        b.onclick = function () { copyText(b.dataset.xcopy, b); };
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-xline]"), function (ln) {
        ln.onclick = function () {
          var keys = (byLine[parseInt(ln.dataset.xline, 10)] || []).map(function (m) { return m.key; });
          if (keys.length) jumpToX(parseInt(ln.dataset.xline, 10), keys[0]);
        };
      });
    }
    function jumpToX(n, key) {
      var node = el("xbody").querySelector('.ln[data-xline="' + n + '"]');
      if (node) {
        node.scrollIntoView({ block: "center" });
        node.classList.add("flash");
        setTimeout(function () { node.classList.remove("flash"); }, 1600);
      }
      var card = el("xlist").querySelector('[data-xkey="' + key + '"]');
      if (card) {
        card.scrollIntoView({ block: "center" });
        card.classList.add("flash");
        setTimeout(function () { card.classList.remove("flash"); }, 1600);
      }
    }

    function paintGuide() {
      el("n-guide").textContent = guide.filter(function (g) { return g.kind !== "primer"; }).length;
      var h = [];
      guide.forEach(function (g) {
        if (g.kind === "primer") {
          h.push('<div class="fcard primer"><div class="fhead"><span class="sev info">Read me first</span>' +
                 '<span class="ftitle">' + esc(g.title) + '</span></div><ul class="gul">' +
                 g.body.map(function (b) { return "<li>" + b + "</li>"; }).join("") + '</ul></div>');
          return;
        }
        h.push('<div class="fcard">' +
          '<div class="fhead"><span class="sev gnum">' + esc(g.id.toUpperCase()) + '</span>' +
          '<span class="ftitle">' + esc(g.title) + '</span></div>' +
          '<div class="looks">' + g.look.map(function (l) { return '<code>' + esc(l) + '</code>'; }).join("") + '</div>' +
          '<p class="fp"><b>Why it matters.</b> ' + g.why + '</p>' +
          '<div class="fverify"><span class="lbl">check</span><code>' + esc(g.cmd) + '</code>' +
          '<button class="mini" data-copyg="' + esc(g.cmd) + '">copy</button>' +
          '<button class="mini" data-filter="' + esc(g.filter) + '">filter raw \u2192</button></div>' +
          '<div class="frefs">' + (g.refs || []).map(function (r) {
            return '<a href="' + r.url + '" target="_blank" rel="noopener">' + esc(r.label) + '</a>';
          }).join("") + '</div></div>');
      });
      h.push('<p class="modgoal">That is the list. Anything you cannot point at a line for is a guess, not a finding.</p>' +
        '<p class="modgoal"><button class="btn ghost" id="toex">see a manifest that breaks most of these \u2192</button></p>');
      el("glist").innerHTML = h.join("");
      Array.prototype.forEach.call(document.querySelectorAll("[data-copyg]"), function (b) {
        b.onclick = function () { copyText(b.dataset.copyg, b); };
      });
      if (el("toex")) el("toex").onclick = function () { showTab("example"); el("xbody").scrollIntoView({ block: "start" }); };
      Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (b) {
        b.onclick = function () {
          el("fsearch").value = b.dataset.filter;
          showTab("raw");
          paintRaw();
          el("fbody").parentElement.scrollIntoView({ block: "start" });
        };
      });
    }

    function paintFind() {
      if (!showAnswers) return;
      var set = (window.FINDINGS || {})[APP];
      if (!set) { el("flist").innerHTML = '<p class="modgoal">No findings data loaded.</p>'; return; }
      var order = { high: 0, med: 1, low: 2, info: 3 };
      var fs = set.findings.slice().sort(function (a, b) { return order[a.sev] - order[b.sev]; });
      el("n-find").textContent = fs.length;
      var h = ['<p class="modgoal">' + fs.length + ' entries for <b>' + esc(set.label) + '</b>. Each quotes the ' +
               'line it came from; <b>line N</b> jumps to it in the raw APK manifest, <b>src N</b> to the source file.' +
               (set.source ? ' Source: <a href="' + set.source + '" target="_blank" rel="noopener">upstream manifest</a>.' : '') +
               '</p>'];
      fs.forEach(function (f) {
        h.push('<div class="fcard sev-' + f.sev + '">' +
          '<div class="fhead"><span class="sev ' + f.sev + '">' + SEV[f.sev] + '</span>' +
          '<span class="ftitle">' + esc(f.title) + '</span><span class="spacer"></span>' +
          f.lines.slice(0, 2).map(function (n) {
            return '<button class="mini" data-goto="' + n + '">line ' + n + ' \u2197</button>';
          }).join(" ") +
          (f.srcLine ? ' <button class="mini" data-src="' + f.srcLine + '">src ' + f.srcLine + ' \u2197</button>' : '') +
          '</div>' +
          '<div class="fwhere">' + esc(f.where) + '</div>' +
          '<pre class="ev">' + esc(f.evidence) + '</pre>' +
          '<p class="fp"><b>Why it matters.</b> ' + f.why + '</p>' +
          '<p class="fp"><b>Impact.</b> ' + f.impact + '</p>' +
          '<div class="fverify"><span class="lbl">verify</span><code>' + esc(f.verify) + '</code>' +
          '<button class="mini" data-copyev="' + esc(f.verify) + '">copy</button></div>' +
          '<div class="frefs">' + (f.refs || []).map(function (r) {
            return '<a href="' + r.url + '" target="_blank" rel="noopener">' + esc(r.label) + '</a>';
          }).join("") + (f.sev === "info" ? '<span class="tag">not a vulnerability - read why</span>' : '') +
          '</div></div>');
      });
      el("flist").innerHTML = h.join("");
      Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (b) {
        b.onclick = function () { showTab("raw"); jumpTo("fbody", parseInt(b.dataset.goto, 10)); };
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-src]"), function (b) {
        b.onclick = function () { showTab("src"); jumpTo("sbody", parseInt(b.dataset.src, 10)); };
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-copyev]"), function (b) {
        b.onclick = function () { copyText(b.dataset.copyev, b); };
      });
    }

    function jumpTo(bodyId, n) {
      if (bodyId === "fbody" && el("fsearch").value) { el("fsearch").value = ""; paintRaw(); }
      var node = el(bodyId).querySelector('.ln[data-line="' + n + '"]');
      if (!node) return;
      node.scrollIntoView({ block: "center" });
      node.classList.add("flash");
      setTimeout(function () { node.classList.remove("flash"); }, 1800);
    }

    function showTab(which) {
      tab = which;
      Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
        t.classList.toggle("on", t.dataset.tab === which);
      });
      el("pane-learn").hidden = which !== "learn";
      if (which === "learn" && window.ManifestLearn) {
        var lh = el("learn-host");
        if (lh && !lh.dataset.mounted) { window.ManifestLearn.mount(lh); lh.dataset.mounted = "1"; }
      }
      el("pane-doors").hidden = which !== "doors";
      if (which === "doors" && window.ManifestLab) {
        var host = el("doors-host");
        if (host && !host.dataset.mounted) { if (window.ManifestLab.mount(host)) host.dataset.mounted = "1"; }
      }
      if (window.ManifestTabs) window.ManifestTabs.onTab(which);
      el("pane-raw").hidden = which !== "raw";
      el("pane-src").hidden = which !== "src";
      el("pane-guide").hidden = which !== "guide";
      el("pane-ex").hidden = which !== "example";
      if (el("pane-find")) el("pane-find").hidden = which !== "find";
    }

    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
      t.onclick = function () { showTab(t.dataset.tab); };
    });
    el("fsearch").oninput = paintRaw;
    el("fcopy").onclick = function () { copyText(rawOf(APP), el("fcopy")); };
    el("scopy").onclick = function () { var s = srcSet[APP]; if (s) copyText(s.xml, el("scopy")); };
    el("excopy").onclick = function () { if (window.MANIFEST_ANNOTATED) copyText(window.MANIFEST_ANNOTATED.xml, el("excopy")); };
    if (window.ManifestLab) {
      var dh = el("doors-host");
      if (dh && window.ManifestLab.mount(dh)) dh.dataset.mounted = "1";
    }
    paintRaw(); paintSrc(); paintGuide(); paintAnnotated(); paintFind();
    showTab(tab);
  }


  /* ---------------------------------------------------------------- where to look */
  function viewWhere() {
    var rows = window.WHERE || [];
    el("main").innerHTML = '<div class="wrap"><h2 class="mod">Where to look</h2>' +
      '<p class="modgoal">The question you are asking, the artifact that answers it, and the command that reaches it. ' +
      'When you are stuck, find the question here before you run anything else - most dead ends are a question ' +
      'aimed at the wrong artifact.</p>' +
      '<div class="viewer-head where-head"><input id="wsearch" placeholder="filter: pinned, provider, secret, smali\u2026">' +
      '<span class="count" id="wcount"></span></div>' +
      '<div id="wlist"></div></div>';
    if (window.__whereQ) { var wq = el("wsearch"); if (wq) wq.value = window.__whereQ; window.__whereQ = null; }
    function paint() {
      var q = (el("wsearch").value || "").toLowerCase();
      var out = [], n = 0;
      rows.forEach(function (r, i) {
        if (q && (r.q + " " + r.look + " " + r.cmd).toLowerCase().indexOf(q) === -1) return;
        n++;
        out.push('<div class="wrow"><div class="wq">' + esc(r.q) + '</div>' +
          '<div class="wlook">' + esc(r.look) + '</div>' +
          '<div class="wcmd"><code>' + esc(r.cmd) + '</code>' +
          '<button class="mini" data-copyw="' + i + '">copy</button>' +
          '<a class="wmod" href="#/' + r.mod + '">' + esc(r.mod.toUpperCase()) + '</a></div></div>');
      });
      el("wlist").innerHTML = out.join("") || '<p class="modgoal">nothing matches that filter.</p>';
      el("wcount").textContent = n + " / " + rows.length;
      Array.prototype.forEach.call(document.querySelectorAll("[data-copyw]"), function (b) {
        b.onclick = function () { copyText(rows[parseInt(b.dataset.copyw, 10)].cmd, b); };
      });
    }
    el("wsearch").oninput = paint;
    paint();
  }


  /* ---------------------------------------------------------------- OWASP Mobile Top 10 */
  function viewTop10() {
    var T = window.TOP10 || { risks: [] };
    var html = '<div class="wrap"><h2 class="mod">OWASP Mobile Top 10</h2>' +
      '<p class="modgoal">' + (T.intro || "") + '</p><div class="t10list">';
    T.risks.forEach(function (r) {
      html += '<div class="fcard t10"><div class="t10head"><span class="code">' + esc(r.code) + '</span>' +
              '<h3 class="ftitle">' + esc(r.title) + '</h3></div>' +
              '<p class="t10short">' + esc(r.short) + '</p><ul class="twhere">';
      (r.where || []).forEach(function (w) {
        var ref = w[0], txt = w[1], href = null;
        var mm = /^(m[0-9])\/(.+)$/.exec(ref);
        if (mm) href = "#/" + mm[1];
        html += '<li>' + (href ? '<a class="stepl" href="' + href + '">' + esc(ref) + '</a>'
                                : '<span class="flab">' + esc(ref) + '</span>') +
                '<span>' + esc(txt) + '</span></li>';
      });
      html += '</ul><a class="t10ref" href="' + esc(r.url) + '" target="_blank" rel="noopener">OWASP entry \u2197</a></div>';
    });
    html += '</div>';
    if (T.note) html += '<div class="note"><b>' + esc(T.note) + '.</b> ' + (T.noteBody || "") + '</div>';
    if (window.MATCH) html += '<div id="t10match" class="bm-root"></div>';
    html += '</div>';
    el("main").innerHTML = html;
    if (window.Top10Match && document.getElementById("t10match")) window.Top10Match.mount(document.getElementById("t10match"));
    Array.prototype.forEach.call(document.querySelectorAll(".t10"), function (c, i) {
      c.style.transitionDelay = (i * 18) + "ms"; c.classList.add("in");
    });
  }

  /* ---------------------------------------------------------------- module / step view */


  /* ---- Android architecture: the opening page, tied to the labs ---- */


  /* ---- practice and progress are rendered by the game engine, mounted in the same shell ---- */
  function viewReport(focusId) {
    var main = el("main");
    main.innerHTML = '<div class="wrap"><h2 class="mod">Report desk</h2>' +
      '<p class="modgoal">The twenty findings from these two apps, with their real evidence - and no severity. ' +
      'Decide how bad each one is and whether it belongs in the report, then take the document away.</p>' +
      '<div id="reportroot"></div></div>';
    if (window.ReportDesk) window.ReportDesk.view(el("reportroot"), focusId);
  }

  function viewSpot(focusId) {
    var main = el("main");
    main.innerHTML = '<div class="wrap"><h2 class="mod">Spot the flaw</h2>' +
      '<p class="modgoal">Real artifacts, one question each: click the line that carries the finding. ' +
      'Reading is the skill the rest of the course assumes - this is where you find out whether you have it.</p>' +
      '<div id="spotroot"></div></div>';
    if (window.Spot) window.Spot.view(el("spotroot"), focusId);
  }

  function viewPractice() {
    var main = el("main");
    main.innerHTML = '<div class="wrap"><h2 class="mod">Practice \u2014 <span class="archsub">knowledge check and judgement calls</span></h2>' +
      '<p class="modgoal">Twenty questions on facts the labs establish, and eight situations with four plausible answers each. ' +
      'XP is awarded for a correct first answer and for the answer a report can defend - not for clicking.</p>' +
      '<div id="gmpractice"></div></div>';
    if (window.Game) window.Game.viewPractice(el("gmpractice"));
  }

  function viewProgress() {
    var main = el("main");
    main.innerHTML = '<div class="wrap"><h2 class="mod">Your progress</h2>' +
      '<p class="modgoal">Everything here is computed from the steps you have ticked and the questions you have answered. ' +
      'Untick a step and the xp goes down - a score that only rises would not mean anything.</p>' +
      '<div id="gmprogress"></div></div>';
    if (window.Game) window.Game.viewProgress(el("gmprogress"));
  }

  /* ---- Android pentest methodology: eight doors, presets, ladder, checklist ---- */
  function viewMethod() {
    var M = window.METHODOLOGY;
    var main = el("main");
    if (!M) { main.innerHTML = '<div class="wrap"><p class="modgoal">No methodology data loaded.</p></div>'; return; }
    main.innerHTML = '<div class="wrap">' +
      '<h2 class="mod">' + esc(M.title) + ' \u2014 <span class="archsub">' + esc(M.subtitle) + '</span></h2>' +
      '<p class="modgoal">' + M.intro + '</p>' +
      '<div class="note">' + esc(M.note) + '</div>' +
      '<div id="method"></div></div>';
    if (typeof window.renderMethod === "function") {
      try { window.__methodVis = window.renderMethod(el("method"), M) || null; }
      catch (e) { console.warn("method visuals failed:", e); window.__methodVis = null; }
    }
  }

  function viewArch() {
    var A = window.ARCHITECTURE;
    var main = el("main");
    if (!A) { main.innerHTML = '<div class="wrap"><p class="modgoal">No architecture data loaded.</p></div>'; return; }
    var h = ['<div class="wrap">',
      '<h2 class="mod">' + esc(A.title) + ' \u2014 <span class="archsub">' + esc(A.subtitle) + '</span></h2>',
      '<p class="modgoal">' + A.intro + '</p>',
      '<div class="note">' + esc(A.note) + '</div>',
      '<div id="archvis"></div>'];

    /* the stack, drawn as a stack: one band per layer, in order */
    h.push('<div class="archstack">');
    A.layers.forEach(function (L, i) {
      h.push('<section class="archlayer" id="arch-' + i + '">' +
        '<div class="archhead"><span class="archnum">' + L.n + '</span>' +
        '<span class="archname">' + esc(L.name) + '</span>' +
        '<span class="archtag">' + esc(L.tagline) + '</span></div>' +
        '<p class="fp">' + esc(L.what) + '</p>' +
        '<div class="archgrid">' +
          '<div><div class="sblbl">prove it on the device</div>' +
            '<pre class="ev">' + esc(L.prove) + '\n\n' + esc(L.out) + '</pre></div>' +
          '<div><div class="sblbl">what it means for testing</div>' +
            '<p class="fp">' + L.risk + '</p>' +
            (L.lab.route ? '<div class="frefs"><a href="' + L.lab.route + '">' + esc(L.lab.label) + ' \u2192</a></div>'
                         : '<div class="frefs"><span class="tag">' + esc(L.lab.label) + '</span></div>') +
          '</div>' +
        '</div></section>');
    });
    h.push('</div>');

    /* the two processes and the bus */
    [A.zygote, A.binder, A.sandbox, A.root].forEach(function (B, i) {
      h.push('<section class="archbox"><h3 class="archh3">' + esc(B.title) + '</h3>' +
        '<p class="fp">' + B.text + '</p>' +
        '<pre class="ev">' + esc(B.cmd) + '\n\n' + esc(B.out) + '</pre>' +
        '<p class="fp"><b>Read it like this.</b> ' + B.read + '</p></section>');
    });

    /* the map */
    h.push('<h3 class="archh3">Where each layer lands in this course</h3>',
      '<table class="archmap"><thead><tr><th>Area</th><th>What you look at</th><th>Tools</th><th>Where</th></tr></thead><tbody>');
    A.map.forEach(function (r) {
      h.push('<tr><td>' + esc(r.area) + '</td><td>' + esc(r.look) + '</td><td><code>' + esc(r.tools) +
             '</code></td><td>' + (r.lab ? '<a href="' + r.lab + '">open \u2192</a>' : '<span class="dim">\u2014</span>') + '</td></tr>');
    });
    h.push('</tbody></table>');

    /* quiz */
    h.push('<section class="archbox"><h3 class="archh3">Check yourself</h3>' +
      '<p class="fp">' + esc(A.quiz.q) + '</p><div class="quizopts" id="quizopts">');
    A.quiz.options.forEach(function (o, i) {
      h.push('<button class="qopt" data-q="' + i + '">' + esc(o) + '</button>');
    });
    h.push('</div><div id="quizres" class="quizres"></div></section>');

    h.push('<p class="modgoal">How this page fits the assessment: <a href="#/method">Android pentest methodology</a> - ' +
      'the eight doors, in the order that pays.</p>');
    h.push('<p class="modgoal">Next: ' + A.next.map(function (n) {
      return '<a href="' + n.route + '">' + esc(n.label) + '</a>';
    }).join(' \u00b7 ') + '</p></div>');
    main.innerHTML = h.join("");

    /* the visual layer is optional: if assets/arch-vis.js is missing the page still reads fine */
    if (typeof window.renderArchVisuals === "function") {
      /* the visual stack supersedes the prose one - hide it rather than teaching the same thing twice */
      var oldStack = main.querySelector(".archstack");
      if (oldStack) oldStack.style.display = "none";
      try { window.__archVis = window.renderArchVisuals(el("archvis"), A) || null; }
      catch (e) { console.warn("arch visuals failed:", e); window.__archVis = null; }
      /* the prose blocks for binder/sandbox/root are superseded by the visuals, but they hold the
         commands, the full transcript and the "read it like this" note - fold them, do not delete.
         The zygote block stays open: the walkthrough draws the fork, it does not print the ps table. */
      Array.prototype.forEach.call(main.querySelectorAll(".archbox"), function (bx) {
        if (bx.querySelector("#quizopts")) return;
        var h3 = bx.querySelector(".archh3");
        if (!h3 || /two processes/i.test(h3.textContent)) return;
        var d = document.createElement("details");
        d.className = "archrec";
        var sm = document.createElement("summary");
        sm.textContent = h3.textContent + " - the command and the recording";
        bx.classList.remove("archbox");
        bx.classList.add("archrecbody");
        d.appendChild(sm);
        /* insert the details FIRST, then move the block inside it - appending to d detaches bx,
           and insertBefore(d, bx) would then throw NotFoundError and drop the block */
        bx.parentNode.insertBefore(d, bx);   /* the block lives inside .wrap, not directly in #main */
        bx.removeChild(h3);
        d.appendChild(bx);
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-q]"), function (b) {
      b.onclick = function () {
        var pick = parseInt(b.dataset.q, 10);
        var ok = pick === A.quiz.answer;
        Array.prototype.forEach.call(document.querySelectorAll(".qopt"), function (x) {
          x.classList.toggle("right", parseInt(x.dataset.q, 10) === A.quiz.answer);
          x.classList.toggle("wrong", x === b && !ok);
        });
        el("quizres").innerHTML = (ok ? "<b>Right.</b> " : "<b>Not this one.</b> ") + A.quiz.why;
        el("quizres").classList.add("show");
      };
    });
  }

  /* ---- Frida scripts: the code, how its target was identified, and the task ---- */
  function viewScripts() {
    var D = window.FRIDA_SCRIPTS;
    var main = el("main");
    if (!D) { main.innerHTML = '<div class="wrap"><p class="modgoal">No script data loaded.</p></div>'; return; }
    var h = ['<div class="wrap">',
      '<h2 class="mod">Frida scripts and tasks</h2>',
      '<p class="modgoal">' + D.intro + '</p>',
      '<div class="note">' + esc(D.note) + '</div>',
      '<div class="scardindex">'];
    D.scripts.forEach(function (s, i) {
      h.push('<button class="scardbtn" data-sc="' + i + '"><b>' + esc(s.file) + '</b><span>' + esc(s.title) + '</span></button>');
    });
    h.push('</div>');
    D.scripts.forEach(function (s, i) {
      h.push('<section class="scard" id="sc-' + i + '">' +
        '<div class="schead"><span class="xkey">' + (i + 1) + '</span>' +
        '<span class="ftitle">' + esc(s.file) + '</span><span class="spacer"></span>' +
        '<span class="count">' + s.lines + ' lines</span></div>' +
        '<p class="fp"><b>' + esc(s.title) + '.</b> ' + esc(s.task) + '</p>' +
        '<div class="sblk"><div class="sblbl">How the target was identified</div><ol class="ident">' +
        s.ident.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +
        '<div class="sblk"><div class="sblbl">What the script does</div><p class="fp">' + esc(s.logic) + '</p></div>' +
        '<div class="sblk"><div class="sblbl">Run it</div><div class="fverify"><code>' + esc(s.run.join("\n")) + '</code>' +
        '<button class="mini" data-copys="' + esc(s.run.join("\n")) + '">copy</button></div></div>' +
        '<div class="sblk"><details class="fold"><summary>recorded output \u2014 ' + (s.output.split("\n").length) + ' lines</summary>' +
        '<pre class="ev srun">' + esc(s.output) + '</pre>' +
        '<p class="sver">' + esc(s.verified) + '</p></details></div>' +
        '<div class="sblk"><details class="fold srcfold"><summary>the script \u2014 ' + s.lines + ' lines, full source</summary>' +
        '<div class="viewer"><div class="viewer-head"><span class="file">frida-scripts/offline/' + esc(s.file) + '</span>' +
        '<span class="spacer"></span><button class="btn ghost" data-copyc="' + i + '">copy script</button></div>' +
        '<pre class="scode" data-scode="' + i + '"></pre></div></details></div>' +
        '</section>');
    });
    h.push('<p class="modgoal">These six cover the whole module: observe, bypass, inventory, app-agnostic tracing, a '
      + 'second app, and the native layer. The one habit to keep is the order - identify, observe, then change.</p></div>');
    main.innerHTML = h.join("");

    D.scripts.forEach(function (s, i) {
      var lines = s.code.split("\n");
      el("sc-" + i).querySelector('[data-scode="' + i + '"]').innerHTML = lines.map(function (l, n) {
        return '<div class="ln"><span class="g">' + (n + 1) + '</span><span class="c">' + esc(l) + '</span></div>';
      }).join("");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-copyc]"), function (b) {
      b.onclick = function () { copyText(D.scripts[parseInt(b.dataset.copyc, 10)].code, b); };
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-copys]"), function (b) {
      b.onclick = function () { copyText(b.dataset.copys, b); };
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-sc]"), function (b) {
      b.onclick = function () {
        var n = el("sc-" + b.dataset.sc);
        n.scrollIntoView({ block: "start" });
        n.classList.add("flash");
        setTimeout(function () { n.classList.remove("flash"); }, 1400);
      };
    });
  }


  /* ---------------------------------------------------------------- module chrome */
  function paintModHead(m) {
    var tot = (m.steps || []).length, done = 0;
    (m.steps || []).forEach(function (x) { if (isDone(m.id, x.id)) done++; });
    var bar = el("modbar"), num = el("modnum");
    if (bar) bar.style.width = (tot ? Math.round(done / tot * 100) : 0) + "%";
    if (num) num.textContent = done + " / " + tot + " steps · " + (tot ? Math.round(done / tot * 100) : 0) + "%";
  }

  var trailObs = null;
  function buildTrail(m) {
    var old = document.querySelector(".steptrail");
    if (old) old.parentNode.removeChild(old);
    if (trailObs) { trailObs.disconnect(); trailObs = null; }
    if (!m.steps || m.steps.length < 3) return;
    var t = document.createElement("div");
    t.className = "steptrail";
    var lbl = document.createElement("div");
    lbl.className = "tlbl";
    lbl.textContent = String((m.steps || []).length) + " steps";
    t.appendChild(lbl);
    m.steps.forEach(function (x, i) {
      var a = document.createElement("a");
      a.href = "#/" + m.id;
      a.textContent = String(i + 1);
      a.title = x.title;
      if (isDone(m.id, x.id)) a.classList.add("done");
      a.dataset.sid = "step-" + m.id + "-" + x.id;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var target = document.getElementById("step-" + m.id + "-" + x.id);
        if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      t.appendChild(a);
    });
    document.body.appendChild(t);
    if ("IntersectionObserver" in window) {
      trailObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          Array.prototype.forEach.call(t.querySelectorAll("a"), function (a) {
            a.classList.toggle("on", a.dataset.sid === en.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      (m.steps || []).forEach(function (x) {
        var node = document.getElementById("step-" + m.id + "-" + x.id);
        if (node) trailObs.observe(node);
      });
    }
  }

  function clearTrail() {
    var old = document.querySelector(".steptrail");
    if (old) old.parentNode.removeChild(old);
    if (trailObs) { trailObs.disconnect(); trailObs = null; }
  }

  function viewModule(mid, focusSid) {
    var m = MODULES.filter(function (x) { return x.id === mid; })[0];
    if (!m) { viewHome(); return; }
    var html = '<div class="wrap"><div class="crumb" style="color:var(--dim);font-size:12px;font-family:var(--mono)">' +
      esc(m.tag || "") + ' \u00b7 ' + esc(m.time || "") + '</div>' +
      '<h2 class="mod">' + esc(m.title) + '</h2><p class="modgoal">' + esc(m.goal) + '</p>' +
      '<div class="modhead"><div class="modbar"><i id="modbar"></i></div><span class="modnum" id="modnum"></span></div>' +
      (function () {
        var sp = ((window.SPOT || {}).challenges || []).filter(function (c) { return c.mod === mid; });
        if (!sp.length) return "";
        return '<div class="modspot"><span class="lbl">artifact to read</span>' + sp.map(function (c) {
          return '<a href="#/spot/' + c.id + '">' + esc(c.title) + '</a>';
        }).join('<span class="sep">\u00b7</span>') + '</div>';
      })();
    if (m.brief) {
      var bf = m.brief;
      html += '<div class="brief"><div class="bf-head"><span class="bf-from">from ' + esc(bf.from) + '</span>' +
        '<span class="bf-subj">' + esc(bf.subject) + '</span></div>' +
        '<p class="bf-body">' + bf.body + '</p>' +
        '<div class="bf-want"><span class="lbl">what they want</span><span>' + bf.want + '</span></div></div>';
    }
    if (m.intro) html += '<div class="note">' + m.intro + '</div>';

    /* what this module's own commands need installed - derived from its steps, not a hand-written list */
    if (window.Prereqs) {
      var pstrip = window.Prereqs.moduleStrip(mid);
      if (pstrip) html += pstrip.outerHTML;
    }

    var L = (window.LESSONS || {})[m.id];
    if (L) {
      var firstStep = (m.steps && m.steps[0]) ? 'step-' + m.id + '-' + m.steps[0].id : '';
      html += '<section class="lesson"><div class="lesson-head"><span class="tagx">Lesson</span>' +
              '<h3>' + esc(L.title) + '</h3><span class="spacer"></span>' +
              (firstStep ? '<button class="skipl" data-skip="' + firstStep + '">skip to the steps \u2193</button>' : '') + '</div>';
      /* the lesson is the densest text on the page: show its opening claim, fold the rest behind a
         numbered outline so the section headings stay discoverable */
      var blocks = L.blocks || [];
      var firstP = "";
      for (var bi = 0; bi < blocks.length && !firstP; bi++) {
        if (blocks[bi].p && blocks[bi].p.length) firstP = blocks[bi].p[0];
      }
      if (firstP) html += '<p class="lead">' + firstP + '</p>';
      if ((window.LESSON_VIS || {})[m.id]) html += '<div class="lvhost" id="lv-' + m.id + '"></div>';
      var inner = "";
      blocks.forEach(function (b, bIdx) {
        if (bIdx === 0 && firstP && b.p && b.p[0] === firstP) {
          (b.p || []).slice(1).forEach(function (t) { inner += '<p>' + t + '</p>'; });
        } else {
          if (b.h) inner += '<h4>' + esc(b.h) + '</h4>';
          (b.p || []).forEach(function (t) { inner += '<p>' + t + '</p>'; });
        }
        if (b.list) inner += '<ul>' + b.list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
        if (b.note) {
          inner += '<div class="note">' + (b.note2 ? '<b>' + esc(b.note) + '.</b> ' + b.note2 : b.note) + '</div>';
        }
      });
      var outline = blocks.filter(function (b) { return b.h; }).map(function (b) { return esc(b.h); });
      html += fold("read the lesson \u2014 " + blocks.length + " sections" +
                   (outline.length ? " \u00b7 " + outline.slice(0, 3).join(" \u00b7 ") + (outline.length > 3 ? " \u2026" : "") : ""),
                   inner, "lesson");
      html += '</section>';
    }

    (m.steps || []).forEach(function (s, i) {
      var key = stepKey(m.id, s.id), done = isDone(m.id, s.id);
      var cn = (window.CMDNOTES || {})[key] || {};
      var fig = window.Figs ? window.Figs.get(key) : null;
      var deep = [], head = "";

      /* one visible sentence per step. The diagram carries the explanation; the prose that used to
         open every step is not deleted, it moves one click down into "the detail". */
      var leadText = s.why || s.concept || "";
      if (leadText) {
        var w = splitLead(leadText);
        if (w[0]) head = '<p class="lead">' + w[0] + '</p>';
        if (w[1]) deep.push(fold(s.why ? "why it matters" : "the reasoning", w[1], "why"));
      }
      if (cn.goal) deep.push('<div class="goal"><span class="lbl">Goal</span><span>' + esc(cn.goal) + '</span></div>');
      if (s.why && s.concept) deep.push(fold("why it works", '<div class="foldpad">' + s.concept + '</div>', "idea"));

      var doBlock = "";
      if (s.cmd) {
        var g = (window.GATES || {})[key];
        var passed = !g || (window.Game && window.Game.gateDone && window.Game.gateDone(key));
        doBlock += (g && !passed) ? gateHtml(key, g, s.cmd) : cmdBoxHtml(s.cmd);
        if (cn.notes && cn.notes.length) {
          deep.push(fold("line by line (" + cn.notes.length + ")",
            '<ul class="cmdnote">' + cn.notes.map(function (n) {
              return '<li><code>' + esc(n.part) + '</code><span>' + esc(n.does) + '</span></li>';
            }).join("") + "</ul>", "notes"));
        }
      }
      var term = "";
      if (s.out || s.sim) {
        term = '<div class="term"><div class="term-bar"><span class="dot r"></span><span class="dot y"></span>' +
               '<span class="dot g"></span><span>' + esc(s.term || "output") + '</span></div><pre></pre></div>';
      }
      var check = "";
      if (s.expect) {
        check = '<details class="expect"><summary>what success looks like</summary>' +
                '<div class="inner"><pre>' + esc(s.expect) + '</pre></div></details>';
        /* the "careful" callout is 20-50 words and was the last block of visible prose on the card */
        if (s.expectNote) deep.push('<div class="trap"><span class="lbl">careful</span><span>' + s.expectNote + '</span></div>');
      }
      if (s.see) deep.push(fold("what you are seeing", '<div class="foldpad">' + s.see + '</div>', "see"));
      if (s.note) deep.push(fold("CWE \u00b7 impact \u00b7 fix", '<div class="foldpad">' + s.note + '</div>', "note"));

      var refs = "";
      if (s.refs && s.refs.length) {
        refs = '<div class="refs">' + s.refs.map(function (r) {
          return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.label) + ' \u2197</a>';
        }).join("") + '</div>';
      }

      var figure = fig ? '<figure class="fig"><div class="fig-frame">' + fig.svg + '</div>' +
        (fig.caption ? '<figcaption>' + esc(fig.caption) + '</figcaption>' : '') +
        '<div class="fig-hint">click a box \u2014 what it does, why it is needed, what breaks without it</div>' +
        '<div class="fig-read" hidden></div></figure>' : '';

      html += '<section class="step' + (done ? " done" : "") + '" id="step-' + m.id + "-" + s.id + '" data-key="' + key + '">' +
        '<div class="step-head"><span class="idx">' + String(i + 1).padStart(2, "0") + '</span>' +
        '<h3>' + esc(s.title) + '</h3><button class="tick" type="button" aria-pressed="false" aria-label="mark this step done" title="mark this step done">\u2713</button></div>' +
        '<div class="step-body">' + figure + head + doBlock + term + check;

      if (deep.length) {
        html += '<details class="deep"><summary>the detail \u00b7 ' + deep.length + ' note' + (deep.length > 1 ? "s" : "") +
                '</summary><div class="deepin">' + deep.join("") + refs + '</div></details>';
      } else if (refs) {
        html += refs;
      }
      html += '</div></section>';
    });

    if (m.id === "m1") {
      html += '<a class="nextstep" href="#/m1/manifest"><span class="ns-k">Hands-on, part of this module</span>' +
              '<span class="ns-t">Manifest explorer \u2014 read the real manifest of the shipped APK</span>' +
              '<span class="ns-d">Raw dump, upstream source, the ten-point checklist, and the exact line behind every finding.</span>' +
              '<span class="ns-go">open \u2192</span></a>';
    }

    var idx = MODULES.indexOf(m);
    /* Module 06 ends with the scanner's own artifacts: the two report JSONs, the one PDF that exported,
       and eight claims to read. Unscored - the scored triage lives on #/report.
       It MUST sit before the prev/next row: dropping it inside that flex row shrank the "previous module"
       link to 99px wide and stretched it to the full height of the report. */
    if (m.id === "m6" && window.MOBSF_REPORT) html += '<div id="mobsf-explorer" class="msr-root"></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:26px">';
    html += idx > 0 ? '<a class="btn" href="#/' + MODULES[idx - 1].id + '">\u2190 ' + esc(MODULES[idx - 1].title) + '</a>' : '<span></span>';
    html += idx < MODULES.length - 1 ? '<a class="btn" href="#/' + MODULES[idx + 1].id + '">' + esc(MODULES[idx + 1].title) + ' \u2192</a>' : '<span></span>';
    html += '</div></div>';
    el("main").innerHTML = html;
    if (document.getElementById("mobsf-explorer") && window.MobsfReport) window.MobsfReport.mount(document.getElementById("mobsf-explorer"));
    wireFigures();
    Array.prototype.forEach.call(document.querySelectorAll(".skipl"), function (b) {
      b.onclick = function () {
        var t = document.getElementById(b.dataset.skip);
        if (t) t.scrollIntoView({ block: "start" });
      };
    });
    if (window.LessonVis) window.LessonVis.mount(el("lv-" + m.id), m.id);
    wireSteps(m);
    paintModHead(m);
    buildTrail(m);
    if (focusSid) {
      var target = el("step-" + mid + "-" + focusSid);
      if (target) target.scrollIntoView({ block: "start" });
    }
  }

  /* ---------------------------------------------------------------- step wiring */
  /* Time-based, not tick-based: a browser throttles timers in background tabs, and a
     per-tick counter then takes minutes. Deriving progress from elapsed time means the
     transcript finishes in the same wall-clock time however often the timer is allowed to fire. */
  function typeOut(pre, text, done) {
    var t0 = Date.now(), finished = false;
    var dur = Math.min(4200, Math.max(600, text.length * 4));
    var timer;
    function frame() {
      if (finished) { clearInterval(timer); return; }
      var k = Math.min(1, (Date.now() - t0) / dur);
      if (k >= 1) {
        finished = true; clearInterval(timer); pre.innerHTML = render(text); if (done) done(); return;
      }
      pre.innerHTML = render(text.slice(0, Math.floor(text.length * k))) + '<span class="prompt">\u2588</span>';
    }
    timer = setInterval(frame, 16);
    pre._skip = function () {
      if (finished) return;
      finished = true; clearInterval(timer); pre.innerHTML = render(text); if (done) done();
    };
    frame();
  }
  function render(t) {
    return esc(t)
      .replace(/^(\$ .*)$/gm, '<span class="prompt">$1</span>')
      /* \b matters: without it "device" lit up green inside `adb devices -l`, splitting the word the
         student is reading, and PASS/OK would fire inside PASSWORD/TOKEN */
      .replace(/\b(Success|PASS|OK|works|verified|true|connected)\b/g, '<span class="ok">$1</span>')
      .replace(/\b(Failure|FAIL|Error|Exception|denied|refused|failed|false)\b/g, '<span class="bad">$1</span>');
  }

  /* Every shape in a diagram is a question: "what is this, and why is it here?" Clicking one fills the
     panel under the figure with what the step does, why it exists and what breaks without it. Node text
     lives in content/fig-details.js, keyed "<module>/<step>#<index>". */
  function wireFigures() {
    Array.prototype.forEach.call(document.querySelectorAll(".fig"), function (figEl) {
      /* the hero diagram on #/home is not inside a .step - it carries its own data-key */
      var host = figEl.closest(".step");
      var key = host ? host.dataset.key : (figEl.dataset.key || "");
      if (!key) return;
      var panel = figEl.querySelector(".fig-read");
      var rects = figEl.querySelectorAll("[data-i]");
      if (!panel || !rects.length) return;

      function show(r) {
        var i = r.getAttribute("data-i");
        var label = (r.getAttribute("aria-label") || "").replace(/: open the explanation$/, "");
        var d = (window.FIGDETAIL || {})[key + "#" + i];
        if (!d) return;
        Array.prototype.forEach.call(rects, function (x) { x.classList.remove("sel"); });
        r.classList.add("sel");
        var html = '<div class="fr-head"><span class="fr-k">' + esc(label) + '</span>' +
          '<button class="fr-x" type="button" aria-label="close the explanation">\u00d7</button></div>' +
          '<p class="fr-w">' + esc(d.w) + '</p>' +
          '<p class="fr-y"><span class="lbl">why it is here</span>' + esc(d.y) + '</p>' +
          (d.s ? '<p class="fr-s"><span class="lbl">skip it and</span>' + esc(d.s) + '</p>' : '');
        panel.innerHTML = html;
        panel.hidden = false;
        panel.querySelector(".fr-x").onclick = function () {
          panel.hidden = true;
          Array.prototype.forEach.call(rects, function (x) { x.classList.remove("sel"); });
        };
      }

      Array.prototype.forEach.call(rects, function (r) {
        r.addEventListener("click", function () { show(r); });
        r.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(r); }
        });
      });
    });
  }

  function wireSteps(m) {
    Array.prototype.forEach.call(document.querySelectorAll(".step"), function (sec) {
      var key = sec.dataset.key;
      var sid = key.split("/")[1];

      var tick = sec.querySelector(".tick");
      tick.onclick = function () {
        var on = !isDone(m.id, sid);
        if (on) state.done[key] = 1; else delete state.done[key];
        save(); sec.classList.toggle("done", on); refreshProgress();
        tick.setAttribute("aria-pressed", on ? "true" : "false");
        tick.setAttribute("aria-label", on ? "mark this step not done" : "mark this step done");
        announce(on ? "step marked done, plus 10 xp" : "step marked not done, minus 10 xp");
        if (window.Game) window.Game.onStep(m.id, sid, on);
        /* show both directions: an untick that silently kept the old total would be a scoring bug */
        if (window.Motion) window.Motion.flyXP(tick, on ? "+10 xp" : "\u221210 xp");
        /* keep the module bar and the step rail honest without a re-render */
        paintModHead(m);
        paintNavCounts();
        var rail = document.querySelector('.steptrail a[data-sid="step-' + m.id + "-" + sid + '"]');
        if (rail) rail.classList.toggle("done", on);
      };

      var box = sec.querySelector(".cmdbox");
      if (box) wireCmd(sec, box);

      /* the gate: type the value, or ask to see it - never a dead end */
      var gate = sec.querySelector(".gate");
      if (gate) {
        var gkey = gate.dataset.gate;
        var gspec = (window.GATES || {})[gkey];
        var stepObj0 = (m.steps || []).filter(function (x) { return x.id === sid; })[0];
        var cmdText = stepObj0 ? stepObj0.cmd : "";
        var input = gate.querySelector(".gate-in");
        var fb = gate.querySelector(".gate-fb");
        function norm(x) { return String(x || "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ").toLowerCase(); }
        function pass(award) {
          if (award && window.Game && window.Game.onGate) window.Game.onGate(gkey);
          revealGate(sec, gkey, cmdText);
          if (award && window.Game && window.Game.toast) window.Game.toast("Command built", "+12 xp \u00b7 " + (gspec ? gspec.token : ""));
        }
        gate.querySelector("[data-gate-go]").onclick = function () {
          var want = gspec ? gspec.token : "";
          if (norm(input.value) === norm(want)) { pass(true); return; }
          fb.className = "gate-fb no";
          fb.textContent = input.value.trim() ? "Not it. Read the line again - the value is in the step above." : "Type the missing value first.";
          announce(fb.textContent);
          if (window.Motion && window.Motion.shake) window.Motion.shake(gate);
        };
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") gate.querySelector("[data-gate-go]").click(); });
        var hb = gate.querySelector("[data-gate-hint]");
        if (hb) hb.onclick = function () {
          var box2 = gate.querySelector(".gate-hintbox");
          if (box2) { box2.hidden = !box2.hidden; hb.textContent = box2.hidden ? "hint" : "hide hint"; }
        };
        gate.querySelector("[data-gate-skip]").onclick = function () { pass(false); };
      }

      var stepObj = (m.steps || []).filter(function (x) { return x.id === sid; })[0];
      if (stepObj && (stepObj.sim || stepObj.out) && window.Toolkit) {
        window.Toolkit.compareUI(sec, stepObj.sim || stepObj.out);
      }

      var run = sec.querySelector("[data-run]");
      sec.__runHandler = function () {
        var step = (m.steps || []).filter(function (s) { return s.id === sid; })[0];
        var term = sec.querySelector(".term"), pre = term.querySelector("pre");
        term.classList.add("show");
        /* mid-typing, a second press finishes the transcript at once; once it has finished, the flags
           are stale (running cleared, _skip still set), so compare the flag itself - otherwise replay
           could only ever be used once per step */
        if (pre._skip && term.dataset.running === "1") { pre._skip(); return; }
        term.dataset.running = "1";
        pre.innerHTML = "";
        var text = (step.sim || step.out || "").trim();
        typeOut(pre, text, function () { term.dataset.running = ""; });
      };
      /* wireCmd() ran earlier and found no handler to attach, so a step whose command box is printed
         straight into the page (no gate in front of it) shipped a replay button that did nothing.
         Gated steps were fine only because revealGate() re-wires after the handler exists. */
      if (run && !run.onclick) run.onclick = sec.__runHandler;
    });
  }

  /* ---------------------------------------------------------------- router */
  function route() {
    /* visuals on the architecture page own timers and observers - drop them when leaving */
    if (window.__archVis && typeof window.__archVis.destroy === "function") {
      try { window.__archVis.destroy(); } catch (e) {}
    }
    if (window.__methodVis && typeof window.__methodVis.destroy === "function") {
      try { window.__methodVis.destroy(); } catch (e) {}
    }
    window.__archVis = null;
    window.__methodVis = null;
    if (typeof clearTrail === "function") clearTrail();
    if (window.LessonVis) window.LessonVis.destroy();
    var h = (location.hash || "#/home").replace(/^#\/?/, "");
    var parts = h.split("/");

    /* The views live in <div id="main"> but the page actually scrolls in the <main> element around it,
       so resetting el("main") never moved anything and a next-page click left you at the bottom.
       Reset the real scroller here, BEFORE rendering: a link that targets one step still scrolls to it. */
    var pageScroller = document.querySelector("main");
    if (pageScroller) pageScroller.scrollTop = 0;
    try { window.scrollTo(0, 0); } catch (e) {}

    if (!h || h === "home") { viewHome(); setCrumb("Overview"); }
    else if (parts[0] === "where") { viewWhere(); setCrumb("Where to look"); }
    else if (parts[0] === "top10") { viewTop10(); setCrumb("OWASP Mobile Top 10"); }
    else if (parts[0] === "arch") { viewArch(); setCrumb("Android architecture"); }
    else if (parts[0] === "method") { viewMethod(); setCrumb("Android pentest methodology"); }
    else if (parts[0] === "practice") { viewPractice(); setCrumb("Practice \u00b7 knowledge check and judgement calls"); }
    else if (parts[0] === "progress") { viewProgress(); setCrumb("Your progress"); }
    else if (parts[0] === "check") { window.ReadinessPage.view(el("main")); setCrumb("Readiness check"); }
    else if (parts[0] === "capstone") { window.Capstone.view(el("main")); setCrumb("Capstone \u00b7 six flags"); }
    else if (parts[0] === "fixes") { window.Toolkit.viewFixes(); setCrumb("When it does not work"); }
    else if (parts[0] === "spot") { viewSpot(parts[1]); setCrumb("Spot the flaw \u00b7 click the line that matters"); }
    else if (parts[0] === "report") { viewReport(parts[1]); setCrumb("Report desk \u00b7 triage the findings"); }
    else if (parts[0] === "files") { location.replace("#/m1/manifest" + (parts[1] === "answers" ? "/answers" : "")); return; }
    else if (parts[0] === "scripts") { location.replace("#/m3/scripts"); return; }
    /* the Frida scripts page was module 02 before the swap; keep the old URL working */
    else if (parts[0] === "m2" && parts[1] === "scripts") { location.replace("#/m3/scripts"); return; }
    else if (parts[0] === "m3" && parts[1] === "scripts") { viewScripts(); setCrumb("03 Frida \u00b7 Scripts and tasks"); }
    else if (parts[0] === "m1" && parts[1] === "manifest") {
      var ans = parts[2] === "answers";
      viewFiles(ans);
      setCrumb("01 Static analysis \u00b7 Manifest explorer" + (ans ? " \u00b7 findings" : ""));
    }
    else {
      var m = MODULES.filter(function (x) { return x.id === parts[0]; })[0];
      if (!m) { location.replace("#/home"); return; }
      viewModule(parts[0], parts[1]);
      setCrumb((m.tag || "") + " \u00b7 " + m.title);
    }
    /* the active row: the deepest route wins, so #/m1/manifest lights the nested row, not module 01 */
    var activeKey = (h.indexOf("m1/manifest") === 0) ? "_m1manifest" : (parts[0] || "home");
    Array.prototype.forEach.call(document.querySelectorAll("nav a"), function (a) {
      var href = a.getAttribute("href") || "";
      var key = a.dataset.mod || "";
      a.classList.toggle("active", key === activeKey || href === "#/" + h);
    });
    /* the scroll reset happens before the render now - see the top of route() */
    /* the route swap replaces innerHTML, which drops focus to <body>; put it back on the new
       heading so a keyboard user lands where the page changed, and say the page name out loud */
    var head = document.querySelector('#main h2.mod, #main h1, #main h2');
    if (head) {
      head.setAttribute('tabindex', '-1');
      head.style.outline = 'none';
      try { head.focus({ preventScroll: true }); } catch (e) { head.focus(); }
    }
    announce((document.querySelector('#crumb') || {}).textContent || '');
    refreshProgress();
  }
  function setCrumb(t) { var c = el("crumb"); if (c) c.textContent = t; }

  /* ---------------------------------------------------------------- keys */
  var gPressed = false;
  document.addEventListener("keydown", function (e) {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    if (e.key === "g") { gPressed = true; setTimeout(function () { gPressed = false; }, 700); return; }
    if (gPressed && e.key === "h") { location.hash = "#/home"; return; }
    if (e.key === "j" || e.key === "k") {
      var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
      if (!steps.length) return;
      var y = window.scrollY + 120, cur = -1;
      steps.forEach(function (s, i) { if (s.offsetTop <= y) cur = i; });
      var next = e.key === "j" ? Math.min(steps.length - 1, cur + 1) : Math.max(0, cur - 1);
      steps[next].scrollIntoView({ block: "start", behavior: "smooth" });
    }
    if (e.key === "r") {
      var y2 = window.scrollY + 120, target = null;
      Array.prototype.forEach.call(document.querySelectorAll(".step"), function (s) { if (s.offsetTop <= y2) target = s; });
      if (target) { var b = target.querySelector("[data-run]"); if (b) b.click(); }
    }
  });

  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    wireSidebar();
    /* hash routing replaces the view in place; a browser "restore last scroll position" would drop the
       student at the bottom of the page they just opened, so we own the scroll position ourselves */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (window.Game) window.Game.bootstrap(function () { return Object.keys(state.done); }); route();
  });
})();
