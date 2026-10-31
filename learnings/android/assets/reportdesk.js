/* Report desk: triage the 20 real findings, then take the report away.
 *
 * The findings come from content/findings.js - the same data the manifest explorer quotes. This page does not
 * introduce new claims; it asks the student to decide how bad each one is and whether it belongs in a report,
 * which is the judgement the final module is about. Grading is graded honestly: exact severity scores, one band
 * away scores half, and "context only" is a different answer from "informational".
 */
(function () {
  "use strict";

  var KEY = "asw-report-v1";
  var BANDS = ["info", "low", "medium", "high", "critical"];
  var LABEL = { info: "info", low: "low", medium: "medium", high: "high", critical: "critical" };
  var ALIAS = { med: "medium" };           // the source data says "med"
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { st = {}; }

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function band(s) { return ALIAS[s] || s; }

  function all() {
    var out = [];
    var F = window.FINDINGS || {};
    ["hpandro", "bugbazaar"].forEach(function (k) {
      var g = F[k];
      if (!g) return;
      (g.findings || []).forEach(function (f) {
        out.push({
          id: f.id, sev: band(f.sev), title: f.title, where: f.where, evidence: f.evidence,
          why: f.why, impact: f.impact, verify: f.verify, label: g.label, refs: f.refs || []
        });
      });
    });
    return out;
  }

  function dist(a, b) { return Math.abs(BANDS.indexOf(a) - BANDS.indexOf(b)); }
  function isReport(sv) { return sv !== "info"; }

  function grade(f, rec) {
    var d = dist(rec.sev, f.sev);
    var sevOk = d === 0, sevNear = d === 1;
    var incOk = rec.include === isReport(f.sev);
    return {
      sevOk: sevOk, sevNear: sevNear, incOk: incOk,
      full: sevOk && incOk,
      score: (sevOk ? 1 : sevNear ? 0.5 : 0) * (incOk ? 1 : 0.5)
    };
  }

  var renderedOnce = false;
  function view(root, focusId) {
    if (renderedOnce) root.classList.add("rp-re");   /* no entrance animation on re-render */
    renderedOnce = true;
    var items = all(), done = 0, full = 0;
    items.forEach(function (f) { var r = st[f.id]; if (r && r.graded) { done++; if (r.full) full++; } });

    root.innerHTML = "";
    var head = el("div", "rp-head");
    head.innerHTML = '<div class="rp-num"><b>' + full + '</b> / ' + items.length + ' triaged correctly' +
      '<span>· ' + done + ' graded</span></div>' +
      '<button class="rp-export" type="button">download the report (.md)</button>';
    root.appendChild(head);
    head.querySelector(".rp-export").addEventListener("click", function () { exportReport(items); });

    var hint = el("p", "gm-p gm-dim");
    hint.textContent = "Severity is a judgement, not a lookup: an informational note is not a finding, and two of these " +
      "are explicitly here because they look worse than they are. Grade each card, then take the report away.";
    root.appendChild(hint);

    items.forEach(function (f) {
      var rec = st[f.id] || (st[f.id] = { sev: null, include: null, graded: false });
      var card = el("section", "rp-card");
      card.dataset.fid = f.id;
      card.appendChild(el("div", "rp-meta", f.label + "  ·  " + (f.where || "")));

      var t = el("div", "rp-title");
      t.textContent = f.title;
      card.appendChild(t);

      if (f.evidence) {
        var ev = el("pre", "rp-ev");
        ev.textContent = f.evidence;
        card.appendChild(ev);
      }
      var why = el("div", "rp-why");
      why.innerHTML = f.why || "";
      card.appendChild(why);

      var ctl = el("div", "rp-ctl");
      var chips = el("div", "rp-chips");
      BANDS.forEach(function (b) {
        var c = el("button", "rp-chip" + (rec.sev === b ? " on" : ""), LABEL[b]);
        c.type = "button";
        c.addEventListener("click", function () {
          if (rec.graded) return;
          rec.sev = b; save(); view(root);
        });
        chips.appendChild(c);
      });
      ctl.appendChild(chips);

      var inc = el("div", "rp-inc");
      [["yes", "in the report"], ["no", "context only"]].forEach(function (o) {
        var b = el("button", "rp-chip" + (rec.include === (o[0] === "yes") ? " on" : ""), o[1]);
        b.type = "button";
        b.addEventListener("click", function () {
          if (rec.graded) return;
          rec.include = o[0] === "yes"; save(); view(root);
        });
        inc.appendChild(b);
      });
      ctl.appendChild(inc);
      card.appendChild(ctl);

      var go = el("button", "rp-go", rec.graded ? "graded" : "grade this one");
      go.type = "button";
      go.disabled = !!rec.graded;
      if (!rec.graded) {
        go.addEventListener("click", function () {
          if (!rec.sev || rec.include === null) {
            var w = card.querySelector(".rp-res");
            w.className = "rp-res warn";
            w.textContent = "pick a severity and whether it belongs in the report";
            return;
          }
          var g = grade(f, rec);
          rec.graded = true; rec.full = g.full; rec.score = g.score; rec.answer = f.sev;
          save();
          if (window.Game && window.Game.onReport) window.Game.onReport(f.id, g.full);
          view(root, f.id);
        });
      }
      ctl.appendChild(go);
      card.appendChild(ctl);

      var res = el("div", "rp-res");
      if (rec.graded) {
        var g2 = grade(f, rec);
        res.className = "rp-res " + (g2.full ? "ok" : "half");
        var saidInc = rec.include ? "in the report" : "context only";
        var trueInc = isReport(f.sev) ? "in the report" : "context only";
        res.innerHTML = "<b>" + (g2.full ? "Correct." : g2.score >= 0.5 ? "Partly right." : "Not this time.") + "</b> " +
          "You said <b>" + esc(rec.sev || "-") + ", " + saidInc + "</b>. Reference: <b>" + f.sev + ", " + trueInc + "</b>. " +
          esc(stripTags(f.impact || ""));
      }
      card.appendChild(res);
      if (focusId && focusId === f.id) card.classList.add("focus");
      root.appendChild(card);
    });
  }

  function stripTags(h) { return String(h || "").replace(/<[^>]+>/g, ""); }

  function exportReport(items) {
    var L = ["# Assessment findings", "",
      "Generated from the workshop report desk at " + new Date().toISOString().slice(0, 16).replace("T", " ") + ".", ""];
    var inc = items.filter(function (f) { var r = st[f.id]; return r && r.include; });
    var ctx = items.filter(function (f) { var r = st[f.id]; return r && r.include === false; });
    L.push("Included: " + inc.length + " · context only: " + ctx.length + " · untriaged: " +
      (items.length - inc.length - ctx.length), "");
    BANDS.slice().reverse().forEach(function (b) {
      var group = inc.filter(function (f) { return (st[f.id].sev || "info") === b; });
      if (!group.length) return;
      L.push("## " + b.toUpperCase(), "");
      group.forEach(function (f, i) {
        var r = st[f.id];
        L.push("### " + b[0].toUpperCase() + b.slice(1) + " " + (i + 1) + " - " + f.title, "");
        L.push("- **Where:** " + (f.where || "-"));
        L.push("- **Severity assigned:** " + (r.sev || "untriaged") + (r.graded ? " (reference: " + f.sev + ")" : ""));
        if (f.evidence) L.push("- **Evidence:**", "", "```", String(f.evidence).trim(), "```", "");
        if (f.impact) L.push("- **Impact:** " + stripTags(f.impact));
        if (f.verify) L.push("- **Verify:** `" + stripTags(f.verify) + "`");
        L.push("");
      });
    });
    if (ctx.length) {
      L.push("## Context - observed, not reported as findings", "");
      ctx.forEach(function (f) {
        L.push("- **" + f.title + "** (" + f.where + ") - " + stripTags(f.impact || f.why || ""));
      });
      L.push("");
    }
    var text = L.join("\n");
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
      a.download = "findings-" + new Date().toISOString().slice(0, 10) + ".md";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  }

  window.ReportDesk = { view: view, exportReport: function () { return exportReport(all()); } };
})();
