/* Toolkit: command palette, output diff, lab-log export, shortcut help, fixes renderer.
 * No network, no dependencies; works from file://
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ 1. palette */
  var index = null, palRoot = null, palSel = 0, palHits = [];

  function buildIndex() {
    if (index) return index;
    index = [];
    (window.MODULES || []).forEach(function (m) {
      (m.steps || []).forEach(function (s, i) {
        var num = String(i + 1).padStart(2, "0");
        index.push({
          kind: "step",
          label: num + "  " + s.title,
          sub: m.tag + " \u00b7 " + m.title,
          href: "#/" + m.id + "/" + s.id,
          hay: (s.title + " " + s.id + " " + m.title + " " + (s.cmd || "")).toLowerCase()
        });
        if (s.cmd) {
          var first = String(s.cmd).split("\\n")[0];
          index.push({
            kind: "cmd",
            label: first.length > 80 ? first.slice(0, 80) + "\u2026" : first,
            sub: m.id.toUpperCase() + " " + num + " \u00b7 " + s.title,
            href: "#/" + m.id + "/" + s.id,
            hay: (String(s.cmd) + " " + s.title).toLowerCase()
          });
        }
      });
    });
    (window.WHERE || []).forEach(function (r) {
      index.push({ kind: "where", label: r.q, sub: r.cmd, href: "#/where", hay: (r.q + " " + r.look + " " + r.cmd).toLowerCase() });
    });
    ((window.FIXES || {}).groups || []).forEach(function (g) {
      (g.entries || []).forEach(function (e) {
        index.push({ kind: "fix", label: e.symptom, sub: g.name, href: "#/fixes", hay: (e.symptom + " " + e.cause + " " + (e.fix || []).join(" ")).toLowerCase() });
      });
    });
    ((window.SPOT || {}).challenges || []).forEach(function (c) {
      index.push({
        kind: "spot",
        label: c.title,
        sub: "artifact \u00b7 " + c.file,
        href: "#/spot",
        hay: (c.title + " " + c.file + " " + c.context + " " + (c.lines || []).join(" ")).toLowerCase()
      });
    });
    (window.FRIDA_SCRIPTS ? window.FRIDA_SCRIPTS.scripts : []).forEach(function (s, i) {
      index.push({ kind: "script", label: s.file, sub: s.title, href: "#/m3/scripts", hay: (s.file + " " + s.title + " " + s.task).toLowerCase() });
    });
    [["#/arch", "Android architecture", "five layers, zygote, binder, sandbox"],
     ["#/method", "Android pentest methodology", "eight doors"],
     ["#/report", "Report desk", "triage the twenty findings, export the report"],
     ["#/practice", "Practice", "knowledge check and judgement calls"],
     ["#/progress", "Your progress", "rank, badges, xp"],
     ["#/top10", "OWASP Mobile Top 10", "risk taxonomy"],
     ["#/m1/manifest", "Manifest explorer", "raw, annotated, checklist"]].forEach(function (p) {
      index.push({ kind: "page", label: p[1], sub: p[2], href: p[0], hay: (p[1] + " " + p[2]).toLowerCase() });
    });
    return index;
  }

  /* Matching: every whitespace token must appear as a substring (AND). Only when that finds nothing do we
     fall back to a tight subsequence, because a loose subsequence matches almost every string - "unauthorized"
     scattered letter by letter across the index returned 24 "hits", which is the same as no search at all. */
  function subseqScore(hay, q) {
    var last = -1, gaps = 0;
    for (var k = 0; k < q.length; k++) {
      var at = hay.indexOf(q[k], last + 1);
      if (at === -1) return 0;
      if (last >= 0 && at > last + 1) gaps++;
      last = at;
    }
    return gaps <= 4 ? Math.max(1, 12 - gaps) : 0;
  }

  function hitScore(hay, q) {
    if (!q) return 1;
    var toks = q.split(/\s+/).filter(Boolean), best = 1e9, startAt = -1;
    for (var i = 0; i < toks.length; i++) {
      var at = hay.indexOf(toks[i]);
      if (at === -1) return 0;
      best = Math.min(best, at);
      if (startAt === -1) startAt = at;
    }
    if (hay.indexOf(q) === 0) return 100;
    if (hay.indexOf(q) > 0) return 80 - Math.min(40, hay.indexOf(q));
    return 50 - Math.min(40, startAt);
  }

  function search(q) {
    var idx = buildIndex(), ql = (q || "").toLowerCase().trim();
    var out = [], usedFallback = false;
    idx.forEach(function (it) {
      var sc = hitScore(it.hay, ql);
      if (sc > 0) out.push({ it: it, sc: sc });
    });
    if (!out.length && ql.length >= 2) {
      usedFallback = true;
      idx.forEach(function (it) {
        var sc = subseqScore(it.hay, ql);
        if (sc > 0) out.push({ it: it, sc: sc });
      });
    }
    out.sort(function (a, b) { return b.sc - a.sc; });
    var res = out.slice(0, 24).map(function (x) { return x.it; });
    res.fallback = usedFallback;
    return res;
  }

  function mountPalette() {
    if (palRoot) return palRoot;
    palRoot = document.createElement("div");
    palRoot.className = "pal-wrap";
    palRoot.hidden = true;
    palRoot.innerHTML =
      '<div class="pal-box" role="dialog" aria-label="Search the guide">' +
      '<input id="palq" type="text" placeholder="search steps, commands, fixes, pages\u2026" autocomplete="off" spellcheck="false">' +
      '<div class="pal-res" id="palres"></div>' +
      '<div class="pal-foot"><span><kbd>\u2191</kbd><kbd>\u2193</kbd> move</span><span><kbd>enter</kbd> open</span>' +
      '<span><kbd>esc</kbd> close</span><span class="pal-n" id="paln"></span></div></div>';
    document.body.appendChild(palRoot);
    palRoot.addEventListener("click", function (e) { if (e.target === palRoot) closePalette(); });
    var input = palRoot.querySelector("#palq");
    input.addEventListener("input", function () { palSel = 0; paintPalette(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palHits.length - 1, palSel + 1); paintPalette(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); paintPalette(); }
      else if (e.key === "Enter") { e.preventDefault(); goPalette(); }
      else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    });
    return palRoot;
  }

  function paintPalette() {
    var q = palRoot.querySelector("#palq").value;
    palHits = search(q);
    var body = palRoot.querySelector("#palres");
    body.innerHTML = palHits.length ? palHits.map(function (h, i) {
      return '<button class="pal-hit' + (i === palSel ? " on" : "") + '" data-i="' + i + '">' +
        '<span class="pal-kind k-' + h.kind + '">' + h.kind + "</span>" +
        '<span class="pal-lab">' + esc(h.label) + "</span>" +
        '<span class="pal-sub">' + esc(h.sub || "") + "</span></button>";
    }).join("") : '<div class="pal-empty">nothing matches. try "provider", "pinning", "jadx", "adb unauthorized".</div>';
    palRoot.querySelector("#paln").textContent = palHits.length + " results";
    Array.prototype.forEach.call(body.querySelectorAll(".pal-hit"), function (b) {
      b.addEventListener("click", function () { palSel = +b.dataset.i; goPalette(); });
      b.addEventListener("mousemove", function () {
        if (palSel !== +b.dataset.i) { palSel = +b.dataset.i; paintPalette(); }
      });
    });
    var on = body.querySelector(".pal-hit.on");
    if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" });
  }

  function goPalette() {
    var h = palHits[palSel];
    if (!h) return;
    closePalette();
    if (h.kind === "where") window.__whereQ = h.label;
    location.hash = h.href;
  }

  var palReturn = null;
  function openPalette() {
    /* remember where the user was so closing returns them there instead of to <body> */
    palReturn = document.activeElement;
    var p = mountPalette();
    p.hidden = false;
    var i = p.querySelector("#palq");
    i.value = "";
    palSel = 0;
    paintPalette();
    setTimeout(function () { i.focus(); }, 10);
  }

  function closePalette() {
    if (palRoot) palRoot.hidden = true;
    var back = palReturn;
    palReturn = null;
    if (back && back.focus && document.contains(back)) { try { back.focus(); } catch (e) {} }
  }

  /* ------------------------------------------------------------------ 2. output diff */
  function lcs(a, b) {
    var n = a.length, m = b.length, dp = [], i, j;
    for (i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push(["=", a[i]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(["-", a[i]]); i++; }
      else { out.push(["+", b[j]]); j++; }
    }
    while (i < n) { out.push(["-", a[i]]); i++; }
    while (j < m) { out.push(["+", b[j]]); j++; }
    return out;
  }

  function compareUI(sec, recorded) {
    var wrap = document.createElement("div");
    wrap.className = "cmp";
    wrap.innerHTML =
      '<button class="cmp-open" type="button">compare with the recording</button>' +
      '<div class="cmp-panel" hidden>' +
      '<p class="cmp-hint">Paste what your terminal actually printed. Device names, PIDs and timings differ legitimately; ' +
      'paths, versions and status lines should not.</p>' +
      '<textarea class="cmp-in" placeholder="paste your output here\u2026" spellcheck="false"></textarea>' +
      '<div class="cmp-actions"><button class="cmp-run" type="button">diff it</button>' +
      '<button class="cmp-clear" type="button">clear</button></div>' +
      '<div class="cmp-out"></div></div>';
    var btn = wrap.querySelector(".cmp-open");
    var panel = wrap.querySelector(".cmp-panel");
    btn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      btn.textContent = panel.hidden ? "compare with the recording" : "hide the comparison";
      if (!panel.hidden) panel.querySelector(".cmp-in").focus();
    });
    wrap.querySelector(".cmp-run").addEventListener("click", function () {
      var got = wrap.querySelector(".cmp-in").value.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim() !== ""; });
      var want = String(recorded || "").replace(/\r/g, "").split("\n").filter(function (l) { return l.trim() !== ""; });
      var ops = lcs(want, got);
      var same = 0, miss = 0, extra = 0;
      ops.forEach(function (o) { if (o[0] === "=") same++; else if (o[0] === "-") miss++; else extra++; });
      var out = wrap.querySelector(".cmp-out");
      var pct = want.length ? Math.round(same / want.length * 100) : 0;
      var verdict = extra === 0 && miss === 0
        ? "identical to the recording - same lines, same order."
        : miss === 0 ? "every recorded line is present; you have " + extra + " extra line(s). Usually fine - your device prints more."
        : pct + "% of the recorded lines matched. Read the - lines below: those are the ones the lab expects.";
      out.innerHTML = '<div class="cmp-sum"><b>' + same + "</b> matching \u00b7 <b class=\"miss\">" + miss +
        "</b> missing \u00b7 <b class=\"extra\">" + extra + "</b> extra \u00b7 " + pct + "%</div>" +
        '<p class="cmp-verdict">' + verdict + "</p>" +
        '<pre class="cmp-diff">' + ops.map(function (o) {
          var cls = o[0] === "=" ? "eq" : o[0] === "-" ? "del" : "ins";
          var sign = o[0] === "=" ? " " : o[0];
          return '<span class="d-' + cls + '">' + sign + " " + esc(o[1]) + "</span>";
        }).join("\n") + "</pre>";
    });
    wrap.querySelector(".cmp-clear").addEventListener("click", function () {
      wrap.querySelector(".cmp-in").value = "";
      wrap.querySelector(".cmp-out").innerHTML = "";
    });
    sec.querySelector(".step-body").appendChild(wrap);
    return wrap;
  }

  /* ------------------------------------------------------------------ 3. lab log export */
  function exportLog() {
    var prog = {};
    try { prog = JSON.parse(localStorage.getItem("asw-progress-v1") || "{}"); } catch (e) {}
    var g = (window.Game && window.Game.stats) ? window.Game.stats() : null;
    var L = [];
    L.push("# Android Security Workshop - lab log");
    L.push("");
    L.push("Generated from the interactive guide at " + new Date().toISOString().slice(0, 16).replace("T", " ") + " local.");
    L.push("");
    if (g) {
      L.push("- rank: **" + g.lv.cur.name + "** (" + g.total + " xp)");
      L.push("- badges: " + (g.badges.length ? g.badges.map(function (b) { return b.name; }).join(", ") : "none yet"));
      L.push("- knowledge check: " + g.c.quiz + "/" + (window.GAMIFY ? window.GAMIFY.quiz.length : "?") +
             " \u00b7 judgement calls: " + g.c.scen + "/" + (window.GAMIFY ? window.GAMIFY.scenarios.length : "?"));
      L.push("");
    }
    (window.MODULES || []).forEach(function (m) {
      var done = 0;
      var rows = (m.steps || []).map(function (s, i) {
        var on = !!prog[m.id + "/" + s.id];
        if (on) done++;
        return "| " + String(i + 1).padStart(2, "0") + " | " + s.title + " | " + (on ? "done" : "\u2014") + " |";
      });
      L.push("## " + m.tag + " \u00b7 " + m.title + "  (" + done + "/" + (m.steps || []).length + ")");
      L.push("");
      L.push("| # | step | status |");
      L.push("|---|---|---|");
      L.push.apply(L, rows);
      L.push("");
    });
    L.push("---");
    L.push("");
    L.push("Steps marked done are the ones ticked in the guide on this browser. Nothing else is inferred.");
    var text = L.join("\n");
    try {
      var blob = new Blob([text], { type: "text/markdown" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lab-log-" + new Date().toISOString().slice(0, 10) + ".md";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ 4. fixes page */
  function viewFixes() {
    var F = window.FIXES || { groups: [] };
    var main = document.getElementById("main");
    var h = ['<div class="wrap"><h2 class="mod">When it does not work</h2>',
      '<p class="modgoal">' + esc(F.intro) + "</p>",
      '<div class="pc-root"></div>',
      '<h3 class="fx-own">when the problem is the app, not the machine \u2014 the troubleshooting index</h3>',
      '<div class="viewer-head fx-head"><input id="fxsearch" placeholder="filter: unauthorized, 5555, pem, pinning, apksigner\u2026">',
      '<span class="count" id="fxcount"></span></div>', '<div id="fxlist"></div></div>'];
    main.innerHTML = h.join("");
    if (window.PatchGame) window.PatchGame.mount(document.querySelector(".pc-root"));
    function paint() {
      var q = (document.getElementById("fxsearch").value || "").toLowerCase();
      var total = 0, out = "";
      F.groups.forEach(function (g) {
        var rows = "";
        g.entries.forEach(function (e, i) {
          var hay = (e.symptom + " " + e.cause + " " + (e.fix || []).join(" ") + " " + (e.why || "")).toLowerCase();
          if (q && hay.indexOf(q) === -1) return;
          total++;
          rows += '<div class="fx"><div class="fx-sym">' + esc(e.symptom) + "</div>" +
            '<div class="fx-cause"><span class="lbl">cause</span><span>' + esc(e.cause) + "</span></div>" +
            (e.why ? '<p class="fx-why">' + esc(e.why) + "</p>" : "") +
            '<div class="fx-fix"><span class="lbl">fix</span><div>' + (e.fix || []).map(function (c) {
              return '<div class="fx-cmd"><code>' + esc(c) + '</code><button class="mini" data-fxcopy="' + esc(c) + '">copy</button></div>';
            }).join("") + "</div></div></div>";
        });
        if (rows) out += '<section class="fx-group"><h3 class="gm-h3">' + esc(g.name) + "</h3>" + rows + "</section>";
      });
      document.getElementById("fxlist").innerHTML = out || '<p class="modgoal">nothing matches that filter.</p>';
      document.getElementById("fxcount").textContent = total + " entries";
      Array.prototype.forEach.call(document.querySelectorAll("[data-fxcopy]"), function (b) {
        b.addEventListener("click", function () {
          var t = b.dataset.fxcopy;
          navigator.clipboard.writeText(t).then(function () {
            b.textContent = "copied"; setTimeout(function () { b.textContent = "copy"; }, 1200);
          }, function () { b.textContent = "select"; });
        });
      });
    }
    document.getElementById("fxsearch").addEventListener("input", paint);
    paint();
  }

  /* ------------------------------------------------------------------ 5. help overlay */
  function helpOverlay() {
    var o = document.getElementById("helpov");
    if (!o) {
      o = document.createElement("div");
      o.id = "helpov";
      o.className = "helpov";
      o.hidden = true;
      o.innerHTML = '<div class="helpbox"><h3>Keys</h3><table>' +
        [["\u2318K / ctrl K", "search everything - steps, commands, fixes"],
         ["j / k", "next / previous step"],
         ["r", "replay the output of the step you are looking at"],
         ["?", "this panel"],
         ["esc", "close anything"],
         ["/", "jump to the filter on this page"],
         ["m", "motion on / off - everything becomes instant"]].map(function (r) {
          return "<tr><td><kbd>" + r[0] + "</kbd></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</table><p class=\"helpnote\">Nothing here needs a network. Your progress lives in this browser.</p></div>";
      document.body.appendChild(o);
      o.addEventListener("click", function (e) { if (e.target === o) o.hidden = true; });
    }
    o.hidden = !o.hidden;
  }

  /* ------------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }

  /* ------------------------------------------------------------------ init */
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "");
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); return; }
    if (e.key === "Escape") { closePalette(); var o = document.getElementById("helpov"); if (o) o.hidden = true; return; }
    if (typing) return;
    if (e.key === "?" || (e.key === "/" && e.shiftKey)) { e.preventDefault(); helpOverlay(); return; }
    if (e.key === "/") {
      var f = document.getElementById("wsearch") || document.getElementById("fxsearch");
      if (f) { e.preventDefault(); f.focus(); }
    }
  });

  window.Toolkit = {
    openPalette: openPalette,
    compareUI: compareUI,
    exportLog: exportLog,
    viewFixes: viewFixes,
    search: search,
    help: helpOverlay
  };
})();
