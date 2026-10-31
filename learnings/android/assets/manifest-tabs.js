/* Manifest tabs: the other four sections of #/m1/manifest, rebuilt as things you do rather than read.
 *
 *   raw     - filter the 528 lines down to what matters, then hunt a named attribute
 *   src     - one button that shows the 8 exported components the build added behind the developer's back
 *   guide   - 11 rules as one line each, expandable, each with a jump into the raw dump
 *   example - 133 lines of deliberately broken manifest, unmarked: click the 18 critical ones
 *
 * app.js calls ManifestTabs.onTab(which) after it reveals a pane; each pane is built once per visit.
 */
(function () {
  "use strict";

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ------------------------------------------------------------------ raw: filter + hunt */
  var RAW_CHIPS = [
    { id: "hot", label: "what matters", test: function (t) { return /exported\(|permission|authorities|scheme|debuggable|allowBackup|cleartext|targetSdkVersion/.test(t); } },
    { id: "app", label: "com.BugBazaar only", test: function (t) { return /com\.BugBazaar|bugbazaar/.test(t); } },
    { id: "prov", label: "providers", test: function (t) { return /provider|authorities/.test(t); } },
    { id: "filt", label: "intent-filters", test: function (t) { return /intent-filter|category|scheme|host/.test(t); } },
    { id: "all", label: "everything", test: function () { return true; } }
  ];

  var RAW_HUNTS = [
    { q: "Click the line that makes UserProfileProvider reachable", test: /exported\(0x01010010\)=true/ },
    { q: "Click the line that says which permission MyContactsProvider requires", test: /permission\(0x01010006\)="com\.BugBazaar\.permission\.contact"/ },
    { q: "Click the line that declares the app debuggable", test: /debuggable\(0x0101000f\)=/ },
    { q: "Click the line that sets targetSdkVersion", test: /targetSdkVersion/ }
  ];

  function enhanceRaw(pane, state) {
    var pre = pane.querySelector("#fbody");
    if (!pre || pre.dataset.enh) return;
    pre.dataset.enh = "1";

    var bar = el("div", "mt-chips");
    var label = el("span", "mt-chips-k", "show");
    bar.appendChild(label);
    var active = "hot";
    RAW_CHIPS.forEach(function (c) {
      var b = el("button", "mt-chip" + (c.id === active ? " on" : ""), c.label);
      b.type = "button";
      b.dataset.id = c.id;
      b.onclick = function () {
        active = c.id;
        Array.prototype.forEach.call(bar.querySelectorAll(".mt-chip"), function (x) { x.classList.toggle("on", x.dataset.id === active); });
        apply();
      };
      bar.appendChild(b);
    });
    var shown = el("span", "mt-chips-n");
    bar.appendChild(shown);
    pane.insertBefore(bar, pane.firstChild);

    var hunt = el("div", "mt-hunt");
    pane.insertBefore(hunt, bar.nextSibling);

    function lines() { return Array.prototype.slice.call(pre.querySelectorAll(".ln")); }

    function apply() {
      var chip = RAW_CHIPS.filter(function (c) { return c.id === active; })[0] || RAW_CHIPS[0];
      var n = 0;
      lines().forEach(function (ln) {
        var t = ln.textContent || "";
        var keep = chip.test(t);
        ln.style.display = keep ? "" : "none";
        if (keep) n++;
      });
      shown.textContent = n + " of " + lines().length + " lines";
    }

    function startHunt(i) {
      var h = RAW_HUNTS[i % RAW_HUNTS.length];
      hunt.innerHTML = '<span class="mt-hunt-k">hunt</span><span class="mt-hunt-q">' + esc(h.q) + "</span>" +
        '<span class="mt-hunt-fb"></span>';
      hunt.dataset.i = String(i);
      var fb = hunt.querySelector(".mt-hunt-fb");
      lines().forEach(function (ln) {
        if (ln.dataset.huntWired) return;
        ln.dataset.huntWired = "1";
        ln.classList.add("mt-clickable");
        ln.addEventListener("click", function () {
          if (ln.classList.contains("mt-hit") || ln.classList.contains("mt-miss")) return;
          var cur = RAW_HUNTS[+hunt.dataset.i % RAW_HUNTS.length];
          var t = ln.textContent || "";
          if (cur.test.test(t)) {
            ln.classList.add("mt-hit");
            fb.className = "mt-hunt-fb ok";
            fb.textContent = "That is the one. +5 xp";
            if (window.Game && window.Game.onHuntHit) window.Game.onHuntHit("raw" + hunt.dataset.i);
            setTimeout(function () { startHunt(+hunt.dataset.i + 1); }, 900);
          } else {
            ln.classList.add("mt-miss");
            fb.className = "mt-hunt-fb no";
            fb.textContent = "Not this line.";
          }
        });
      });
    }

    apply();
    startHunt(0);
  }

  /* ------------------------------------------------------------------ source: what the build added */
  function parseSource(xml) {
    var comps = [], re = /<(activity|activity-alias|service|receiver|provider)\b([\s\S]*?)(\/>|>)/g, m;
    while ((m = re.exec(xml))) {
      var body = m[2];
      var name = /android:name="([^"]+)"/.exec(body);
      var n = name ? name[1] : "";
      /* the source writes relative names (".ui.SplashActivity"); the APK dump writes them resolved, and the
         namespace lives in build.gradle so there is no package= attribute to read it from */
      if (n.charAt(0) === ".") n = "com.BugBazaar" + n;
      comps.push({ type: m[1], name: n, exported: /android:exported="true"/.test(body) });
    }
    return comps;
  }

  function enhanceSource(pane) {
    var snote = pane.querySelector("#snote");
    var src = (window.SOURCE_MANIFESTS || {}).bugbazaar;
    if (!snote || !src || snote.dataset.enh) return;
    snote.dataset.enh = "1";

    var srcComps = parseSource(src.xml);
    var apk = window.FILES || {};
    var mt = window.ManifestLab;
    var apkComps = mt ? mt.parse("bugbazaar").comps : [];
    var srcExported = srcComps.filter(function (c) { return c.exported; }).map(function (c) { return c.name; });
    var apkExported = apkComps.filter(function (c) { return c.open; });
    var added = apkExported.filter(function (c) { return srcExported.indexOf(c.name) === -1; });

    var box = el("div", "mt-src");
    box.innerHTML =
      '<div class="mt-src-nums">' +
        '<span><b>' + srcComps.length + '</b> declared in source</span>' +
        '<span><b>' + srcExported.length + '</b> exported there</span>' +
        '<span class="hot"><b>' + apkExported.length + '</b> reachable in the APK</span>' +
      "</div>" +
      '<button class="mt-btn" type="button">show the ' + added.length + ' the build added</button>' +
      '<div class="mt-src-out" hidden></div>';
    var out = box.querySelector(".mt-src-out");
    box.querySelector(".mt-btn").onclick = function (e) {
      out.hidden = false;
      e.target.hidden = true;
      out.innerHTML = added.map(function (c) {
        return '<div class="mt-src-row"><span class="mt-t">' + c.type + "</span>" +
          '<span class="mt-n">' + esc(c.short || c.name) + "</span>" +
          '<span class="mt-why">merged in from a library</span></div>';
      }).join("") || '<div class="mt-src-row">none - the build added nothing reachable</div>';
    };
    snote.innerHTML = "";
    snote.appendChild(box);
  }

  /* ------------------------------------------------------------------ guide: 11 rules, one line each */
  function enhanceGuide(pane) {
    var host = pane.querySelector("#glist");
    if (!host || host.dataset.enh) return;
    host.dataset.enh = "1";
    var G = window.MANIFEST_GUIDE || [];
    host.innerHTML = "";

    var strip = el("p", "mt-guide-k", "Eleven rules. Each one is a click: open it when you need it, jump to the line when you do not believe it.");
    host.appendChild(strip);

    G.forEach(function (g, i) {
      var row = el("details", "mt-rule");
      var sum = document.createElement("summary");
      var looks = (g.look || []).map(function (l) { return '<code>' + esc(l) + "</code>"; }).join(" ");
      sum.innerHTML = '<span class="mt-rule-n">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="mt-rule-t">' + esc(g.title) + "</span>" +
        '<span class="mt-rule-look">' + looks + "</span>";
      row.appendChild(sum);

      var body = el("div", "mt-rule-body");
      if (g.body && g.body.length) body.innerHTML = g.body.map(function (p) { return "<p>" + p + "</p>"; }).join("");
      if (g.why) body.innerHTML += "<p>" + g.why + "</p>";
      if (g.cmd) body.innerHTML += '<pre class="mt-cmd">' + esc(g.cmd) + "</pre>";
      if (g.filter) {
        var jump = el("button", "mt-btn", "show me the line \u2192");
        jump.type = "button";
        jump.onclick = function () {
          var tab = document.querySelector('.tab[data-tab="raw"]');
          if (tab) tab.click();
          setTimeout(function () {
            var f = document.getElementById("fsearch");
            if (f) { f.value = g.filter; f.dispatchEvent(new Event("input")); }
            var first = document.querySelector("#fbody .ln:not([style*='display: none'])");
            if (first) { first.scrollIntoView({ block: "center" }); first.classList.add("flash"); }
          }, 120);
        };
        body.appendChild(jump);
      }
      if (g.refs && g.refs.length) {
        var refs = el("div", "mt-refs");
        refs.innerHTML = g.refs.map(function (r) {
          return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.label) + "</a>";
        }).join("");
        body.appendChild(refs);
      }
      row.appendChild(body);
      host.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------ example: click the critical lines */
  function enhanceExample(pane, state) {
    var A = window.MANIFEST_ANNOTATED;
    var xbody = pane.querySelector("#xbody");
    if (!A || !xbody || pane.dataset.enh) return;
    pane.dataset.enh = "1";

    var lines = A.xml.replace(/\n$/, "").split("\n");
    var byLine = {};
    A.issues.forEach(function (iss) {
      var want = iss.occurrence || 1, seen = 0, idx = -1;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf(iss.anchor) !== -1) { seen++; if (seen === want) { idx = i; break; } }
      }
      if (idx >= 0) (byLine[idx + 1] = byLine[idx + 1] || []).push(iss);
    });
    var critical = Object.keys(byLine).filter(function (n) {
      return byLine[n].some(function (i) { return i.sev === "high"; });
    });
    var found = {}, wrong = {}, revealed = false;

    /* the pane's own chrome is replaced: this is an exercise, not a viewer with a side panel */
    pane.innerHTML = "";
    var head = el("div", "mt-ex-head");
    head.innerHTML = '<div class="mt-ex-k">find the bugs</div>' +
      '<h3>' + critical.length + ' lines in this manifest are critical</h3>' +
      '<p>Click the lines that break it. Nothing is marked - the gutter numbers are the only clue.</p>' +
      '<div class="mt-ex-hud"><span class="mt-ex-found">0</span> / ' + critical.length + " found" +
      '<span class="mt-ex-wrong">0</span> wrong</div>';
    pane.appendChild(head);

    var panel = el("div", "mt-ex-panel");
    var cards = el("div", "mt-ex-cards");
    pane.appendChild(panel);
    /* an escape hatch: a live workshop cannot have an 18-click exercise with no exit */
    var giveUp = el("button", "mt-btn mt-giveup", "show me the answer key");
    giveUp.type = "button";
    giveUp.addEventListener("click", function () { giveUp.hidden = true; reveal(true); });
    pane.appendChild(giveUp);

    var viewer = el("div", "anxml mt-viewer");
    var pre = el("pre", "mt-pre");
    lines.forEach(function (line, i) {
      var n = i + 1;
      var d = el("div", "ln mt-ln");
      d.dataset.line = String(n);
      d.innerHTML = '<span class="g">' + n + '</span><span class="c">' + esc(line) + "</span>";
      d.addEventListener("click", function () { pick(n, d); });
      pre.appendChild(d);
    });
    viewer.appendChild(pre);
    panel.appendChild(viewer);
    panel.appendChild(cards);

    function pick(n, node) {
      if (node.classList.contains("hit") || node.classList.contains("miss")) return;
      var issues = byLine[n];
      var isCrit = issues && issues.some(function (i) { return i.sev === "high"; });
      if (isCrit) {
        found[n] = true;
        node.classList.add("hit");
        show(issues, "ok");
        if (window.Game && window.Game.onHuntHit) window.Game.onHuntHit("ex" + n);
      } else {
        wrong[n] = true;
        node.classList.add("miss");
        show(issues, "near");
      }
      hud();
      if (Object.keys(found).length === critical.length && !revealed) reveal();
    }

    function show(issues, kind) {
      cards.innerHTML = "";
      if (!issues) {
        var none = el("div", "mt-ex-card mt-none");
        none.innerHTML = "<b>Nothing here.</b><span>This line is not one of the " + A.issues.length + " problems in the file.</span>";
        cards.appendChild(none);
        return;
      }
      issues.forEach(function (iss) {
        var card = el("div", "mt-ex-card sev-" + iss.sev);
        card.innerHTML = '<div class="mt-ex-top"><span class="mt-ex-key">' + esc(iss.key) + '</span>' +
          '<span class="sev ' + iss.sev + '">' + iss.sev.toUpperCase() + "</span></div>" +
          "<b>" + esc(iss.title) + "</b>" +
          '<div class="mt-ex-why">' + iss.why + "</div>" +
          '<div class="mt-ex-fix">fix: ' + iss.fix + "</div>";
        cards.appendChild(card);
      });
      if (kind === "near") {
        var t = el("div", "mt-ex-note", "Real problem, not a critical one. Keep going.");
        cards.appendChild(t);
      }
    }

    function hud() {
      head.querySelector(".mt-ex-found").textContent = Object.keys(found).length;
      head.querySelector(".mt-ex-wrong").textContent = Object.keys(wrong).length;
    }

    function reveal(forced) {
      if (revealed) return;
      revealed = true;
      var done = el("div", "mt-ex-win");
      done.innerHTML = forced
        ? "<b>Answer key.</b> All " + A.issues.length + " problems in this file, in severity order."
        : "<b>All " + critical.length + " found.</b> Below is the full answer key - all " +
          A.issues.length + " problems, in severity order, with the fix for each.";
      pane.appendChild(done);
      var key = el("div", "mt-key");
      A.issues.slice().sort(function (a, b) { return ({ high: 0, med: 1, low: 2 })[a.sev] - ({ high: 0, med: 1, low: 2 })[b.sev]; })
        .forEach(function (iss) {
          var c = el("div", "mt-key-row sev-" + iss.sev);
          c.innerHTML = '<span class="mt-ex-key">' + esc(iss.key) + '</span><span class="sev ' + iss.sev + '">' +
            iss.sev.toUpperCase() + "</span><b>" + esc(iss.title) + "</b>";
          key.appendChild(c);
        });
      pane.appendChild(key);
      if (!forced && window.Game && window.Game.onHuntDone) window.Game.onHuntDone("manifest-ex");
      done.scrollIntoView({ block: "center" });
    }

    var start = el("div", "mt-ex-card mt-start");
    start.innerHTML = "<b>Click a line to check it.</b><span>A hit shows you the rule it broke; a miss costs nothing but tells you the answer.</span>";
    cards.appendChild(start);
  }

  window.ManifestTabs = {
    onTab: function (which) {
      var pane = document.getElementById("pane-" + (which === "example" ? "ex" : which));
      if (!pane) return;
      try {
        if (which === "raw") enhanceRaw(pane);
        else if (which === "src") enhanceSource(pane);
        else if (which === "guide") enhanceGuide(pane);
        else if (which === "example") enhanceExample(pane);
      } catch (e) { if (window.console) console.warn("manifest tab", which, e); }
    }
  };
})();
