/* Spot the flaw renderer: clickable artifact lines, check, explanation, XP. */
(function () {
  "use strict";

  var D = window.SPOT || { challenges: [] };
  var picked = {};   // id -> {sel:Set, done:bool, right:bool}

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function render(root) {
    D.challenges.forEach(function (ch) {
      var card = el("section", "spot");
      card.dataset.sid = ch.id;

      var head = el("div", "spot-head");
      head.innerHTML = '<span class="spot-file">' + esc(ch.file) + "</span>" +
        '<span class="spot-mod">' + esc((ch.mod || "").toUpperCase()) + "</span>";
      card.appendChild(head);
      card.appendChild(el("div", "spot-q", ch.title));
      card.appendChild(el("p", "spot-ctx", ch.context));

      var code = el("div", "spot-code");
      ch.lines.forEach(function (ln, i) {
        var n = i + 1;
        var row = el("button", "spot-line");
        row.type = "button";
        row.dataset.n = n;
        row.innerHTML = '<span class="spot-n">' + n + "</span><code>" + esc(ln) + "</code>";
        row.addEventListener("click", function () { pick(ch, n, card); });
        code.appendChild(row);
      });
      card.appendChild(code);

      var bar = el("div", "spot-bar");
      bar.innerHTML = '<button class="spot-check" type="button">check</button>' +
        '<span class="spot-count">0 lines selected</span>';
      card.appendChild(bar);
      card.appendChild(el("div", "spot-out"));
      root.appendChild(card);
    });

    /* restore what was already answered this session */
    Object.keys(picked).forEach(function (id) {
      var card = root.querySelector('.spot[data-sid="' + id + '"]');
      if (!card) return;
      card.querySelectorAll(".spot-line").forEach(function (r) {
        if (picked[id].sel[r.dataset.n]) r.classList.add("sel");
      });
      card.querySelector(".spot-count").textContent = size(picked[id].sel) + " lines selected";
      if (picked[id].done) grade(card, D.challenges.filter(function (c) { return c.id === id; })[0], true);
    });
  }

  function size(o) { return Object.keys(o).length; }

  function pick(ch, n, card) {
    var st = picked[ch.id] || (picked[ch.id] = { sel: {}, done: false, right: false });
    if (st.done) return;
    if (st.sel[n]) delete st.sel[n]; else st.sel[n] = 1;
    card.querySelector('.spot-line[data-n="' + n + '"]').classList.toggle("sel", !!st.sel[n]);
    card.querySelector(".spot-count").textContent = size(st.sel) + " lines selected";
  }

  function grade(card, ch, replay) {
    var st = picked[ch.id];
    if (!st) return;
    if (!st.done) {
      var want = ch.answer.map(function (a) { return a.n; });
      var got = Object.keys(st.sel).map(Number);
      var hit = want.filter(function (n) { return got.indexOf(n) !== -1; }).length;
      var extra = got.filter(function (n) { return want.indexOf(n) === -1; }).length;
      st.done = true;
      st.right = hit === want.length && extra === 0;
      st.score = { hit: hit, want: want.length, extra: extra };
      if (window.Game && window.Game.onSpot) window.Game.onSpot(ch.id, st.right);
    }
    var s = st.score || { hit: ch.answer.length, want: ch.answer.length, extra: 0 };
    card.classList.toggle("ok", s.hit === s.want && s.extra === 0);
    card.querySelectorAll(".spot-line").forEach(function (r) {
      var n = +r.dataset.n;
      if (ch.answer.some(function (a) { return a.n === n; })) r.classList.add("right");
      else if (st.sel[n]) r.classList.add("wrong");
      r.disabled = true;
    });
    var out = card.querySelector(".spot-out");
    out.innerHTML =
      '<div class="spot-verdict">' + (s.hit === s.want && s.extra === 0
        ? "<b>Found it.</b> " + s.want + "/" + s.want + " and no false positives."
        : "<b>" + s.hit + "/" + s.want + "</b> of the lines that matter" + (s.extra ? ", plus " + s.extra + " that do not" : "") + ".") +
      "</div>" +
      ch.answer.map(function (a) { return '<div class="spot-why"><span class="spot-n">' + a.n + "</span><span>" + esc(a.why) + "</span></div>"; }).join("") +
      '<div class="spot-lesson"><span class="lbl">what this teaches</span><span>' + esc(ch.lesson) + "</span></div>";
  }

  function wire(root) {
    Array.prototype.forEach.call(root.querySelectorAll(".spot"), function (card) {
      var ch = D.challenges.filter(function (c) { return c.id === card.dataset.sid; })[0];
      var b = card.querySelector(".spot-check");
      if (b) b.addEventListener("click", function () {
        if (picked[ch.id] && picked[ch.id].done) return;
        if (!picked[ch.id] || !size(picked[ch.id].sel)) {
          card.querySelector(".spot-count").textContent = "select at least one line first";
          return;
        }
        grade(card, ch);
        if (window.Game && window.Game.refresh) window.Game.refresh();
      });
    });
  }

  window.Spot = {
    view: function (root, focusId) {
      root.innerHTML = "";
      var head = el("p", "gm-p");
      head.textContent = D.intro;
      root.appendChild(head);
      render(root);
      wire(root);
      if (focusId) {
        var card = root.querySelector('.spot[data-sid="' + focusId + '"]');
        if (card) {
          card.classList.add("focus");
          card.scrollIntoView({ block: "center" });
        }
      }
      var done = Object.keys(picked).filter(function (k) { return picked[k].done; }).length;
      var sum = el("p", "gm-p gm-dim");
      sum.textContent = done + " of " + D.challenges.length + " challenges attempted this session.";
      root.appendChild(sum);
    }
  };
})();
