/* Renders the real MobSF run: two score cards, the artifact table, the claims you have to read
   line by line, and what the scanner never said. Mounted at the bottom of Module 06.
   Unscored on purpose - it is the reading exercise that makes the scored triage on #/report mean something. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }

  var VERDICT = {
    real:   ["REAL", "a finding you can defend"],
    triage: ["TRIAGE", "true, but it needs a human reading"],
    noise:  ["NOISE", "true and irrelevant - say so in one line"]
  };

  function mount(host) {
    var R = window.MOBSF_REPORT;
    if (!R) return;
    host.innerHTML = "";

    var head = el("div", "msr-head");
    head.innerHTML = "<h2 class='mod'>" + esc(R.title) + "</h2>" +
      "<p class='modgoal'>" + esc(R.intro) + "</p>" +
      "<p class='msr-meta'>recorded " + esc(R.recorded) + " · " + esc(R.image) + " · " + esc(R.host) + "</p>";
    host.appendChild(head);

    /* ---- the two scans ---- */
    var grid = el("div", "msr-scans");
    R.scans.forEach(function (s) {
      var card = el("div", "msr-card");
      var bars = ["high", "warning", "info", "secure"].map(function (k) {
        return "<span class='msr-sev " + k + "'>" + esc(k) + " <b>" + s.sev[k] + "</b></span>";
      }).join("");
      card.innerHTML =
        "<div class='msr-app'><b>" + esc(s.app) + "</b><span>" + esc(s.pkg) + " · v" + esc(s.ver) + "</span></div>" +
        "<div class='msr-score'><b>" + s.score + "</b><span>/100</span></div>" +
        "<div class='msr-sevs'>" + bars + "</div>" +
        "<dl class='msr-facts'>" +
          "<dt>targetSdk</dt><dd>" + esc(s.target) + " (min " + esc(s.min) + ")</dd>" +
          "<dt>components</dt><dd>" + s.comps.activities + " act · " + s.comps.exported_activities + " exported · " +
            s.comps.services + " svc · " + s.comps.receivers + " rcv · " + s.comps.providers + " prov</dd>" +
          "<dt>secrets</dt><dd>" + s.secrets + "</dd>" +
          "<dt>permissions</dt><dd>" + s.perms + "</dd>" +
          "<dt>trackers</dt><dd>" + s.trackers + "</dd>" +
        "</dl>";
      grid.appendChild(card);
    });
    host.appendChild(grid);

    /* ---- artifacts ---- */
    var arts = el("section", "msr-arts");
    arts.appendChild(el("h3", "gm-h3", "The artifacts, as recorded"));
    var rows = R.scans.map(function (s) {
      var pdf = s.pdf
        ? "<a class='msr-dl' href='labs/reports/" + esc(s.pdf) + "' target='_blank' rel='noopener'>open the PDF ↗</a>"
        : "<span class='msr-dl off'>PDF export failed - see note</span>";
      return "<div class='msr-row'><b>" + esc(s.app) + "</b>" +
        "<a class='msr-dl' href='labs/reports/" + esc(s.file) + "' target='_blank' rel='noopener'>report JSON ↗</a>" + pdf + "</div>";
    }).join("");
    arts.innerHTML = rows + "<p class='msr-note'>" + esc(R.pdfNote) + "</p>";
    host.appendChild(arts);

    /* ---- claims: read the line, then say what it lets someone do ---- */
    var sec = el("section", "msr-claims");
    sec.appendChild(el("h3", "gm-h3", "Read the scanner's lines like an analyst"));
    sec.appendChild(el("p", "msr-p", "Eight lines straight out of the two reports. Open one and decide: does this line describe " +
      "something an attacker can do, something true that needs judgement, or something true that means nothing here?"));
    var bar = el("div", "msr-bar");
    var tally = el("span", "msr-tally", "0 of " + R.claims.length + " read");
    bar.appendChild(tally); sec.appendChild(bar);

    var read = {};
    R.claims.forEach(function (c, i) {
      var card = el("div", "msr-claim");
      var appLabel = (R.scans.filter(function (s) { return s.id === c.app; })[0] || {}).app || c.app;
      var q = el("button", "msr-q");
      q.type = "button";
      q.innerHTML = "<span class='msr-from'>" + esc(appLabel) + "</span><span class='msr-quote'>" + esc(c.text) + "</span>" +
        "<span class='msr-open'>read it ▸</span>";
      var body = el("div", "msr-body");
      body.innerHTML = "<p>" + esc(c.means) + "</p>" +
        "<div class='msr-verdictline'>" +
          "<span class='msr-v " + esc(c.verdict) + "'>" + esc(VERDICT[c.verdict][0]) + "</span>" +
          "<span class='msr-vwhy'>" + esc(VERDICT[c.verdict][1]) + "</span>" +
          "<span class='msr-w'>" + esc(c.weight) + "</span>" +
        "</div>" +
        "<a class='msr-proof' href='#/" + esc(String(c.proof).split("/")[0]) + "'>prove it in " + esc(c.proof) + "</a>";
      body.hidden = true;
      q.addEventListener("click", function () {
        body.hidden = !body.hidden;
        card.classList.toggle("open", !body.hidden);
        if (!body.hidden && !read[i]) {
          read[i] = true;
          var n = Object.keys(read).length;
          tally.textContent = n + " of " + R.claims.length + " read";
        }
      });
      card.appendChild(q); card.appendChild(body);
      sec.appendChild(card);
    });
    host.appendChild(sec);

    /* ---- what the scanner did not say ---- */
    var miss = el("section", "msr-miss");
    miss.appendChild(el("h3", "gm-h3", "What the scanner did not say"));
    miss.appendChild(el("p", "msr-p", "Four findings from your own work that no line in either report calls out. " +
      "This is the reason the write-up is yours."));
    R.missed.forEach(function (m) {
      var d = el("div", "msr-m");
      d.innerHTML = "<b>" + esc(m.what) + "</b><p>" + esc(m.detail) + "</p>" +
        "<a class='msr-proof' href='#/" + esc(String(m.proof).split("/")[0]) + "'>" + esc(m.proof) + "</a>";
      miss.appendChild(d);
    });
    host.appendChild(miss);

    var tk = el("p", "msr-takeaway", R.takeaway);
    host.appendChild(tk);
  }

  window.MobsfReport = { mount: mount };
})();