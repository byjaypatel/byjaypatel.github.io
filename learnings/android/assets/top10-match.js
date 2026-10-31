/* Top-10 matcher - the #/top10 page's interactive half.
   Mechanic: click a risk on the left, click the evidence line on the right that proves it.
   Everything is derived at mount time: risk text from TOP10, evidence text from FINDINGS
   (or, for M10, from the m1/crypto step's recorded output). No asserted pairs. */
(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }

  /* evidence for a pair, resolved from real data - returns null if the source is gone */
  function resolve(src) {
    var F = window.FINDINGS || {}, TOP = window.TOP10 || { risks: [] };
    if (src.indexOf("module:") === 0) {
      var ref = src.slice(7).split("/"), mod = ref[0], sid = ref[1], sim = null;
      (window.MODULES || []).forEach(function (m) {
        if (m.id !== mod) return;
        (m.steps || []).forEach(function (s) { if (s.id === sid) sim = s.sim || ""; });
      });
      if (!sim) return null;
      var line = null;
      sim.split("\n").forEach(function (l) {
        if (!line && (l.indexOf("des_enc_pass") >= 0 || l.indexOf("DES/ECB") >= 0)) line = l.trim();
      });
      if (!line) return null;
      return { ev: line, label: "hpAndro 1.3 - recorded output", app: "hpandro" };
    }
    var parts = src.split("/"), app = parts[0], fid = parts[1];
    var a = F[app];
    if (!a) return null;
    var f = null;
    (a.findings || []).forEach(function (x) { if (x.id === fid) f = x; });
    if (!f) return null;
    var first = (f.evidence || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var ev = first.slice(0, 2).join("  ");
    if (ev.length > 130) ev = ev.slice(0, 130) + "\\u2026";
    return { ev: ev, label: a.label, app: app, title: f.title };
  }

  function mount(host) {
    var M = window.MATCH || { pairs: [] }, TOP = window.TOP10 || { risks: [] };
    host.innerHTML = "";
    var head = el("h3", "bm-h", "Match the risk to its evidence");
    host.appendChild(head);
    host.appendChild(el("p", "bm-p", M.intro || ""));
    var pairs = [];
    (M.pairs || []).forEach(function (p) {
      var r = null;
      (TOP.risks || []).forEach(function (x) { if (x.code === p.risk) r = x; });
      var ev = resolve(p.src);
      if (r && ev) pairs.push({ risk: r, ev: ev, src: p.src });
    });
    if (pairs.length < (M.pairs || []).length) {
      host.appendChild(el("p", "bm-miss", (M.pairs.length - pairs.length) + " pair(s) could not be resolved from the recorded data and were skipped - the board never asserts a pair it cannot source."));
    }
    var bar = el("div", "bm-bar");
    var count = el("span", "bm-count");
    bar.appendChild(count); host.appendChild(bar);

    var board = el("div", "bm-board");
    var left = el("div", "bm-col bm-risks"), right = el("div", "bm-col bm-evs");
    board.appendChild(left); board.appendChild(right); host.appendChild(board);
    var fb = el("div", "bm-fb"); host.appendChild(fb);

    var armed = null;                       /* the risk chip currently selected */
    var rightCards = {};
    var done = function (rid) { return window.Game && window.Game.matchDone(rid); };
    /* shuffle once, then keep the order - a list that reshuffles on every click is a list you
       cannot read (and a motion-rule violation: lists never re-animate on re-render) */
    var order = pairs.slice().sort(function () { return Math.random() - 0.5; });

    function paint() {
      left.innerHTML = ""; right.innerHTML = "";
      var n = 0, total = pairs.length;
      pairs.forEach(function (p) {
        var solved = done(p.risk.code);
        if (solved) n++;
        var chip = el("button", "bm-risk" + (solved ? " done" : "") + (armed === p.risk.code ? " on" : ""),
          p.risk.code + " \\u00b7 " + p.risk.title);
        chip.type = "button";
        chip.addEventListener("click", function () {
          armed = armed === p.risk.code ? null : p.risk.code;
          fb.textContent = armed ? "Now click the line that proves " + p.risk.code + "." : "";
          paint();
        });
        left.appendChild(chip);
      });
      count.textContent = n + " of " + total + " named";
      order.forEach(function (p) {
        var solved = done(p.risk.code);
        var card = el("button", "bm-ev" + (solved ? " done" : ""));
        card.type = "button";
        card.innerHTML = '<span class="bm-app">' + esc(p.ev.label) + "</span>" +
          '<span class="bm-line">' + esc(p.ev.ev) + "</span>";
        card.addEventListener("click", function () {
          if (solved) return;
          if (!armed) { fb.textContent = "Pick a risk on the left first - claim, then evidence."; return; }
          var want = pairs.filter(function (x) { return x.risk.code === armed; })[0];
          if (want && want.src === p.src) {
            var gain = window.Game ? window.Game.onMatch(armed) : 0;
            fb.className = "bm-fb ok";
            fb.textContent = "That is the one. " + p.risk.code + " is " + p.risk.title.toLowerCase() + " \\u00b7 +" + gain + " xp";
            armed = null; paint();
          } else {
            fb.className = "bm-fb no";
            fb.textContent = "Not this line. " + armed + " is about " + (want ? want.risk.short.toLowerCase() : "that risk") + " - read the other lines again.";
          }
        });
        right.appendChild(card);
      });
    }
    paint();
  }

  window.Top10Match = { mount: mount };
})();