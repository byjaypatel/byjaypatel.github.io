/* Android pentest methodology - interactive renderer.
 *
 * window.renderMethod(root, data) builds the whole page under #method and returns { destroy }.
 * No dependencies, no fetch, no localStorage: the guide is opened from file:// and may be offline.
 */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function copyBtn(getText, label) {
    var b = el("button", "mv-copy", label || "copy");
    b.type = "button";
    b.addEventListener("click", function () {
      var t = getText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t);
      } else {
        var ta = el("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
      }
      b.textContent = "copied";
      setTimeout(function () { b.textContent = label || "copy"; }, 1200);
    });
    return b;
  }

  window.renderMethod = function (root, data) {
    if (!root || !data) return { destroy: function () {} };
    root.id = "method";
    root.innerHTML = "";

    var state = { phase: 0, preset: null, ladder: 0, filter: "all", checks: {} };

    /* ---------------------------------------------------------------- door rail */
    var rail = el("div", "mv-rail");
    var nodes = [];
    data.phases.forEach(function (p, i) {
      var b = el("button", "mv-node");
      b.type = "button";
      b.setAttribute("data-i", String(i));
      b.innerHTML = '<span class="mv-num">' + String(p.n).padStart(2, "0") + '</span>' +
                    '<span class="mv-nm">' + esc(p.name) + '</span>' +
                    '<span class="mv-ef">' + p.effort + " min</span>";
      b.addEventListener("click", function () { select(i); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % data.phases.length); nodes[(i + 1) % data.phases.length].focus(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); var j = (i - 1 + data.phases.length) % data.phases.length; select(j); nodes[j].focus(); }
      });
      rail.appendChild(b);
      nodes.push(b);
    });
    root.appendChild(rail);

    /* ---------------------------------------------------------------- preset strip */
    var presets = el("div", "mv-presets");
    var pBtns = [];
    var allBtn = el("button", "mv-pb is-on", "all eight");
    allBtn.type = "button";
    allBtn.addEventListener("click", function () { setPreset(null); });
    presets.appendChild(allBtn); pBtns.push([allBtn, null]);
    data.presets.forEach(function (pr) {
      var b = el("button", "mv-pb", pr.name);
      b.type = "button";
      b.addEventListener("click", function () { setPreset(pr); });
      presets.appendChild(b); pBtns.push([b, pr]);
    });
    var pNote = el("div", "mv-pnote", "");
    presets.appendChild(pNote);
    root.appendChild(presets);

    /* ---------------------------------------------------------------- detail panel */
    var detail = el("section", "mv-detail");
    root.appendChild(detail);

    function select(i) {
      state.phase = i;
      nodes.forEach(function (n, j) {
        n.classList.toggle("is-on", j === i);
        n.setAttribute("aria-pressed", j === i ? "true" : "false");
      });
      paintDetail();
    }

    function paintDetail() {
      var p = data.phases[state.phase];
      detail.innerHTML = "";
      var head = el("div", "mv-dhead");
      head.innerHTML = '<span class="mv-num lg">' + String(p.n).padStart(2, "0") + "</span>" +
                       '<span class="mv-dname">' + esc(p.name) + "</span>" +
                       '<span class="mv-kind k-' + esc(p.kind) + '">' + esc(p.kind) + "</span>" +
                       '<span class="mv-q">' + esc(p.question) + "</span>";
      detail.appendChild(head);

      var obj = el("p", "mv-obj", p.objective);
      detail.appendChild(obj);

      var grid = el("div", "mv-grid");
      var left = el("div", "mv-col");
      left.appendChild(el("div", "mv-lbl", "Actions - what you actually do"));
      var ol = el("ol", "mv-acts");
      p.actions.forEach(function (a) {
        var li = el("li", null, a);
        ol.appendChild(li);
      });
      left.appendChild(ol);

      left.appendChild(el("div", "mv-lbl", "Command"));
      var cmdWrap = el("div", "mv-cmd");
      var pre = el("pre", null, p.cmd);
      cmdWrap.appendChild(pre);
      cmdWrap.appendChild(copyBtn(function () { return p.cmd; }));
      left.appendChild(cmdWrap);

      var right = el("div", "mv-col");
      [["Evidence you must leave with", p.evidence, "mv-ev"],
       ["Done when", p.done, "mv-done"],
       ["The trap", p.trap, "mv-trap"]].forEach(function (kv) {
        var box = el("div", "mv-box " + kv[2]);
        box.appendChild(el("div", "mv-lbl", kv[0]));
        box.appendChild(el("p", "mv-p", kv[1]));
        right.appendChild(box);
      });
      if (p.module && p.module.route) {
        var ref = el("div", "mv-refs");
        var a = el("a", null, p.module.label + " \u2192");
        a.href = p.module.route;
        ref.appendChild(a);
        right.appendChild(ref);
      }
      grid.appendChild(left); grid.appendChild(right);
      detail.appendChild(grid);

      if (state.preset) {
        var inSet = state.preset.keep.indexOf(p.key) !== -1;
        detail.appendChild(el("p", "mv-scope " + (inSet ? "in" : "out"),
          inSet ? "In scope for " + state.preset.name + "." : "Out of scope for " + state.preset.name + " - name it as not tested."));
      }
    }

    function setPreset(pr) {
      state.preset = pr;
      pBtns.forEach(function (pair) {
        pair[0].classList.toggle("is-on", (pair[1] && pr && pair[1].key === pr.key) || (!pr && !pair[1]));
      });
      nodes.forEach(function (n, i) {
        var keep = !pr || pr.keep.indexOf(data.phases[i].key) !== -1;
        n.classList.toggle("is-cut", !keep);
        n.disabled = false;
      });
      pNote.textContent = pr ? pr.note : "";
      paintDetail();
      paintBudget();
    }

    /* ---------------------------------------------------------------- budget bar */
    var budget = el("div", "mv-budget");
    root.appendChild(budget);
    function paintBudget() {
      var keep = state.preset ? state.preset.keep : data.phases.map(function (p) { return p.key; });
      var rows = data.phases.filter(function (p) { return keep.indexOf(p.key) !== -1; });
      var total = rows.reduce(function (a, p) { return a + p.effort; }, 0);
      budget.innerHTML = '<div class="mv-lbl">time this actually takes</div>';
      var bar = el("div", "mv-bar");
      rows.forEach(function (p) {
        var seg = el("span", "mv-seg");
        seg.style.flex = String(p.effort);
        seg.title = p.name + " - " + p.effort + " min";
        bar.appendChild(seg);
      });
      budget.appendChild(bar);
      budget.appendChild(el("div", "mv-bsum", rows.length + " phases, about " + total + " minutes of hands-on work - before the writing."));
    }

    /* ---------------------------------------------------------------- ladder */
    var ladderSec = el("section", "mv-sec");
    ladderSec.innerHTML = '<h3 class="mv-h3">From observation to a finding nobody can argue with</h3>' +
      '<p class="mv-p">Pick one of the three observations from the lab apps. Each rung is a claim, and the evidence ' +
      'column is what you must hold to be allowed to make it.</p>';
    var tabs = el("div", "mv-tabs");
    var tabBtns = [];
    data.ladder.forEach(function (L, i) {
      var b = el("button", "mv-tab" + (i === 0 ? " is-on" : ""), L.observation);
      b.type = "button";
      b.addEventListener("click", function () {
        state.ladder = i;
        tabBtns.forEach(function (x, j) { x.classList.toggle("is-on", j === i); });
        paintLadder();
      });
      tabs.appendChild(b); tabBtns.push(b);
    });
    ladderSec.appendChild(tabs);
    var ladderBody = el("div", "mv-ladder");
    ladderSec.appendChild(ladderBody);
    root.appendChild(ladderSec);

    function paintLadder() {
      var L = data.ladder[state.ladder];
      ladderBody.innerHTML = "";
      L.rungs.forEach(function (r, i) {
        var row = el("div", "mv-rung");
        row.style.setProperty("--i", String(i));
        row.innerHTML = '<span class="mv-step">' + (i + 1) + "</span>" +
                        '<span class="mv-claim">' + esc(r[0]) + "</span>" +
                        '<span class="mv-need">' + esc(r[1]) + "</span>" +
                        '<span class="mv-proof">' + esc(r[2]) + "</span>";
        if (i === L.rungs.length - 1) row.classList.add("is-top");
        ladderBody.appendChild(row);
      });
      var stop = el("p", "mv-stop", L.stop);
      ladderBody.appendChild(stop);
    }

    /* ---------------------------------------------------------------- matrix */
    var mat = el("section", "mv-sec");
    mat.innerHTML = '<h3 class="mv-h3">The same eight doors as a table</h3>';
    var chips = el("div", "mv-chips");
    [["all", "all"], ["static", "static only"], ["dynamic", "dynamic only"], ["device", "needs a device"]].forEach(function (c, i) {
      var b = el("button", "mv-chip" + (i === 0 ? " is-on" : ""), c[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        state.filter = c[0];
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on");
        paintMatrix();
      });
      chips.appendChild(b);
    });
    mat.appendChild(chips);
    var table = el("table", "mv-table");
    mat.appendChild(table);
    root.appendChild(mat);

    function paintMatrix() {
      var rows = data.matrix.filter(function (r) {
        if (state.filter === "all") return true;
        if (state.filter === "device") return r.device;
        return r.kind === state.filter;
      });
      var h = "<thead><tr><th>door</th><th>kind</th><th>device</th><th>answers</th><th>artefact</th></tr></thead><tbody>";
      rows.forEach(function (r) {
        h += "<tr><td><b>" + esc(r.door) + "</b></td><td><span class=\"mv-kind k-" + esc(r.kind) + "\">" + esc(r.kind) +
             "</span></td><td>" + (r.device ? "yes" : "-") + "</td><td>" + esc(r.answers) + "</td><td><code>" + esc(r.artefact) + "</code></td></tr>";
      });
      h += "</tbody>";
      table.innerHTML = h;
    }

    /* ---------------------------------------------------------------- checklist */
    var chk = el("section", "mv-sec");
    chk.innerHTML = '<h3 class="mv-h3">The checklist you carry into an engagement</h3>' +
      '<p class="mv-p">Ticking is local to this page - nothing is saved, so it cannot mislead you later about what ' +
      'you did on a real target.</p>';
    var list = el("div", "mv-checks");
    data.checklist.forEach(function (item, i) {
      var lab = el("label", "mv-check");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.addEventListener("change", function () { state.checks[i] = box.checked; paintCount(); });
      lab.appendChild(box);
      lab.appendChild(el("span", null, item));
      list.appendChild(lab);
    });
    chk.appendChild(list);
    var ctl = el("div", "mv-ckctl");
    var count = el("span", "mv-count", "0 / " + data.checklist.length);
    ctl.appendChild(count);
    ctl.appendChild(copyBtn(function () {
      return data.checklist.map(function (c, i) { return (state.checks[i] ? "[x] " : "[ ] ") + c; }).join("\n");
    }, "copy as markdown"));
    chk.appendChild(ctl);
    root.appendChild(chk);

    function paintCount() {
      var n = Object.keys(state.checks).filter(function (k) { return state.checks[k]; }).length;
      count.textContent = n + " / " + data.checklist.length;
    }

    /* ---------------------------------------------------------------- next links */
    if (data.next && data.next.length) {
      var nx = el("p", "mv-next");
      data.next.forEach(function (n, i) {
        if (i) nx.appendChild(document.createTextNode(" \u00b7 "));
        var a = el("a", null, n.label);
        a.href = n.route;
        nx.appendChild(a);
      });
      root.appendChild(nx);
    }

    select(0);
    setPreset(null);
    paintLadder();
    paintMatrix();

    return {
      destroy: function () {
        if (root) root.innerHTML = "";
      }
    };
  };
})();
