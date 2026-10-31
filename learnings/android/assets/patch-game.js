/* Patch-the-line - mounted at the top of the "When it does not work" page.
   The finding card comes from FINDINGS; the three options come from PATCHES. One is the real
   fix, two are genuine hardening advice that belongs to a different finding - and choosing them
   is how the difference gets taught. Options shuffle once per card, never on re-render. */
(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }

  function shuffled(arr) { return arr.slice().sort(function () { return Math.random() - 0.5; }); }

  function mount(host) {
    var P = window.PATCHES || { cards: {} }, F = window.FINDINGS || {};
    host.innerHTML = "";
    host.appendChild(el("h3", "pc-h", "Patch the finding"));
    host.appendChild(el("p", "pc-p", P.intro || ""));
    var bar = el("div", "pc-bar");
    var chips = el("div", "pc-chips");
    var count = el("span", "pc-count");
    bar.appendChild(chips); bar.appendChild(count);
    host.appendChild(bar);
    var list = el("div", "pc-list"); host.appendChild(list);
    var fb = el("div", "pc-fb"); host.appendChild(fb);

    /* collect cards from the findings themselves - a PATCHES entry with no finding is skipped,
       a finding with no PATCHES entry is skipped loudly: content must be authored, not faked */
    var cards = [], missing = [];
    Object.keys(F).forEach(function (app) {
      (F[app].findings || []).forEach(function (f) {
        var p = P.cards[f.id];
        if (!p) { missing.push(app + "/" + f.id); return; }
        cards.push({ app: app, label: F[app].label, f: f, p: p, opts: null });
      });
    });
    Object.keys(P.cards || {}).forEach(function (id) {
      var found = Object.keys(F).some(function (app) {
        return (F[app].findings || []).some(function (f) { return f.id === id; });
      });
      if (!found) missing.push("orphan patch card: " + id);
    });
    if (missing.length) host.appendChild(el("p", "pc-miss", "skipped (no matching content on both sides): " + missing.join(", ")));

    cards.forEach(function (c) {
      c.opts = shuffled([c.p.fix].concat(c.p.wrong.map(function (w, i) { return Object.assign({}, w, { wrong: true, i: i }); })));
      c.state = { tried: [], why: "" };   /* survives re-renders, unlike DOM marks */
    });

    var filter = "all";
    var chipDefs = [["all", "all"], ["hpandro", "hpAndro"], ["bugbazaar", "BugBazaar"], ["high", "high sev"], ["med", "med sev"], ["triage", "triage only"]];
    chipDefs.forEach(function (d) {
      var b = el("button", "pc-chip", d[1]); b.type = "button";
      b.dataset.f = d[0];
      b.addEventListener("click", function () { filter = d[0]; paint(); });
      chips.appendChild(b);
    });

    function matches(c) {
      if (filter === "all") return true;
      if (filter === "hpandro" || filter === "bugbazaar") return c.app === filter;
      if (filter === "high") return c.f.sev === "high";
      if (filter === "med") return c.f.sev === "med";
      if (filter === "triage") return c.p.fix.tag === "triage";
      return true;
    }
    function patched(c) { return window.Game && window.Game.patchDone(c.f.id); }

    function paint() {
      list.innerHTML = "";
      Array.prototype.forEach.call(chips.children, function (b) { b.classList.toggle("on", b.dataset.f === filter); });
      var visible = cards.filter(matches), n = 0;
      cards.forEach(function (c) { if (patched(c)) n++; });
      count.textContent = n + " of " + cards.length + " patched";
      visible.forEach(function (c) {
        var done = patched(c);
        var card = el("div", "pc-card" + (done ? " done" : ""));
        card.appendChild(el("span", "pc-sev " + c.f.sev, c.f.sev));
        var head = el("div", "pc-title"); head.textContent = c.f.title;
        card.appendChild(el("div", "pc-where", c.label + " \\u00b7 " + (c.f.where || "")));
        card.appendChild(head);
        var ev = (c.f.evidence || "").split("\n").slice(0, 3).join("\n");
        var evbox = el("details", "pc-ev");
        evbox.innerHTML = "<summary>the line you are fixing</summary><pre>" + esc(ev) + "</pre>";
        card.appendChild(evbox);
        var why = el("details", "pc-why");
        why.innerHTML = "<summary>why it is a finding</summary><div>" + (c.f.why || "") + "</div>";
        card.appendChild(why);
        var opts = el("div", "pc-opts");
        var wline = el("div", "pc-wline");   /* the why-wrong explanation lives inside the card */
        c.opts.forEach(function (o) {
          var b = el("button", "pc-opt"); b.type = "button";
          b.innerHTML = esc(o.t);            /* no tags on options: a label would leak the answer */
          if (c.state.tried.indexOf(o.t) >= 0) b.classList.add("no");
          b.addEventListener("click", function () {
            if (patched(c)) return;
            if (o.wrong) {
              c.state.tried.push(o.t);
              c.state.why = o.why;
              paint();
              /* a wrong pick does not end the card - the explanation is the lesson */
            } else {
              var gain = window.Game ? window.Game.onPatch(c.f.id) : 0;
              fb.className = "pc-fb ok";
              fb.textContent = "Patched \\u00b7 +" + gain + " xp \\u00b7 " + c.f.id + " \\u00b7 " + c.p.fix.tag;
              paint();
            }
          });
          if (done) { b.disabled = true; if (!o.wrong) b.classList.add("yes"); }
          opts.appendChild(b);
        });
        card.appendChild(opts);
        if (c.state.why && !done) wline.innerHTML = "<b>why it fails here</b> " + esc(c.state.why);
        card.appendChild(wline);
        if (done) {
          var note = el("div", "pc-fixed");
          note.innerHTML = "<b>your patch (" + esc(c.p.fix.tag) + ")</b> " + esc(c.p.fix.t);
          card.appendChild(note);
        }
        list.appendChild(card);
      });
    }
    paint();
  }

  window.PatchGame = { mount: mount };
})();