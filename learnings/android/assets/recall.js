/* Recall drill - the third practice section. Active recall, not multiple choice:
   front of the card is the claim, back is the root cause and the patch. Finding cards are
   generated from FINDINGS + PATCHES at runtime; the nine lab-fact cards come from RECALL_EXTRA.
   Self-rating ("again" / "got it") is the mechanic - xp lands once per card, on the first "got it". */
(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }

  function deck() {
    var cards = [], P = (window.PATCHES || { cards: {} }).cards, X = (window.RECALL_EXTRA || { facts: [] }).facts;
    Object.keys(window.FINDINGS || {}).forEach(function (app) {
      var a = window.FINDINGS[app];
      (a.findings || []).forEach(function (f) {
        var p = P[f.id];
        cards.push({
          id: "f/" + f.id,
          front: (a.label || app) + " \\u00b7 " + f.title,
          back: "<b>why</b> " + (f.why || "") +
                (p ? "<br><b>patch</b> " + esc(p.fix.t) : "") +
                (f.impact ? "<br><b>impact</b> " + f.impact : "")
        });
      });
    });
    (X || []).forEach(function (x) { cards.push({ id: "x/" + x.id, front: x.front, back: esc(x.back) }); });
    return cards;
  }

  var Q = null;   /* current run order - survives re-mounts within the session */
  var pos = 0, flipped = false;

  function mount(host) {
    var cards = deck();
    if (!Q || !Q.length) { Q = cards.slice().sort(function () { return Math.random() - 0.5; }); pos = 0; flipped = false; }
    host.innerHTML = "";
    host.appendChild(el("h3", "rc-h", "Recall drill \\u2014 flip and self-grade"));
    host.appendChild(el("p", "rc-p", "No options this time. Read the front, say the answer out loud, flip, then grade yourself the way flashcards work: " +
      "'again' sends the card to the back of the queue, 'got it' banks it. XP lands once per card, first 'got it' only."));
    var stage = el("div", "rc-stage"); host.appendChild(stage);
    var bar = el("div", "rc-bar"); host.appendChild(bar);

    function got(id) { return window.Game && window.Game.recallDone(id); }
    function banked() { return cards.filter(function (c) { return got(c.id); }).length; }

    function paint() {
      var cur = Q[pos % Q.length];
      var done = got(cur.id);
      stage.innerHTML = "";
      var card = el("div", "rc-card" + (flipped ? " flip" : "") + (done ? " done" : ""));
      var inner = el("div", "rc-inner");
      var face = el("div", "rc-face"), back = el("div", "rc-face rc-back");
      face.innerHTML = "<span class='rc-kind'>" + (cur.id.charAt(0) === "f" ? "finding" : "lab fact") + "</span>" +
        "<span class='rc-text'>" + esc(cur.front) + "</span>" +
        "<span class='rc-hint'>click to flip</span>";
      back.innerHTML = "<span class='rc-kind'>answer</span><span class='rc-text'>" + cur.back + "</span>";
      inner.appendChild(face); inner.appendChild(back);
      card.appendChild(inner);
      card.addEventListener("click", function () { flipped = !flipped; paint(); });
      stage.appendChild(card);

      bar.innerHTML = "";
      var count = el("span", "rc-count", banked() + " of " + cards.length + " banked \\u00b7 card " + ((pos % Q.length) + 1) + " of " + Q.length);
      bar.appendChild(count);
      var again = el("button", "rc-btn", "again \\u2192"); again.type = "button";
      var gotBtn = el("button", "rc-btn go", done ? "got it \\u00b7 banked" : "got it \\u2713"); gotBtn.type = "button";
      again.addEventListener("click", function () {
        Q.push(Q.splice(pos % Q.length, 1)[0]);   /* to the back of the queue */
        /* splice+push at the last position is a no-op on ORDER - without advancing, "again"
           on the final card would loop that one card forever */
        pos++; flipped = false; paint();
      });
      gotBtn.addEventListener("click", function () {
        var gain = window.Game ? window.Game.onRecall(cur.id) : 0;
        flipped = false; pos++; paint();
        if (gain > 0) { var t = el("span", "rc-gain", "+" + gain + " xp"); bar.appendChild(t); }
      });
      if (!flipped) { again.disabled = true; gotBtn.disabled = true; }
      bar.appendChild(again); bar.appendChild(gotBtn);
    }
    paint();
  }

  window.Recall = { mount: mount, size: function () { return deck().length; } };
})();