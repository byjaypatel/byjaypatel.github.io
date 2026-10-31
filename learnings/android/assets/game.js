/* Gamification engine - XP, levels, badges, quiz runner, judgement calls.
 *
 * XP is DERIVED, never accumulated: every recompute rebuilds the total from the steps the guide says are
 * done, plus the quiz/scenario answers stored here. Untick a step and the XP goes down, which is the
 * honest behaviour - a score that only ever rises teaches nothing.
 *
 * window.Game contract:
 *   Game.bootstrap(fnDoneKeys)  fnDoneKeys() returns an array like ["m1/decode", ...]
 *   Game.onStep(mid, sid, on)   called by the guide's tick handler
 *   Game.viewPractice(root)     renders the quiz + judgement calls
 *   Game.viewProgress(root)     renders level, badges, stats
 *   Game.refresh()              re-render whatever is on screen
 */
(function () {
  "use strict";

  var G = window.GAMIFY || { levels: [{ xp: 0, name: "Apprentice", note: "" }], badges: [], quiz: [], scenarios: [] };
  var KEY = "asw-game-v1";
  var XP_STEP = 10, XP_QUIZ = 15, XP_SCEN = 25, XP_SPOT = 20, XP_REPORT = 8, XP_BADGE = 30,
    XP_FLAG = 25, XP_HINT = [5, 10, 15], XP_READY = 40, XP_ASK = 10, XP_DOOR = 15, XP_GATE = 12,
    XP_MATCH = 10, XP_PATCH = 8, XP_RECALL = 4;

  var st = { quiz: {}, scen: {}, spot: {}, report: {}, seen: {}, cap: {}, hints: {}, ready: 0, ask: {}, doors: {}, round: {}, gate: {}, hunt: {}, match: {}, patch: {}, recall: {} };   // quiz[qIndex]=true when answered correctly first time
  var doneKeys = [];
  var getter = null;

  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    st.quiz = raw.quiz || {}; st.scen = raw.scen || {}; st.spot = raw.spot || {}; st.report = raw.report || {}; st.seen = raw.seen || {};
    st.cap = raw.cap || {}; st.hints = raw.hints || {}; st.ready = raw.ready || 0; st.ask = raw.ask || {}; st.doors = raw.doors || {}; st.round = raw.round || {}; st.gate = raw.gate || {}; st.hunt = raw.hunt || {};
    st.match = raw.match || {}; st.patch = raw.patch || {}; st.recall = raw.recall || {};
  } catch (e) { /* first run or blocked storage */ }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }

  /* ------------------------------------------------------------------ maths */
  function counts() {
    /* always re-derive from the live guide state: a tick, an untick, a reset or an import must never
       leave the score showing a number the steps no longer add up to */
    if (getter) doneKeys = getter() || [];
    var d = doneKeys.filter(function (k) { return k.indexOf("/") > 0; });
    return {
      steps: d.length,
      quiz: Object.keys(st.quiz).filter(function (k) { return st.quiz[k]; }).length,
      scen: Object.keys(st.scen).filter(function (k) { return st.scen[k]; }).length,
      spot: Object.keys(st.spot).filter(function (k) { return st.spot[k]; }).length,
      report: Object.keys(st.report).filter(function (k) { return st.report[k]; }).length,
      cap: Object.keys(st.cap).filter(function (k) { return st.cap[k]; }).length,
      ask: Object.keys(st.ask).filter(function (k) { return st.ask[k]; }).length,
      doors: Object.keys(st.doors).filter(function (k) { return st.doors[k]; }).length,
      gate: Object.keys(st.gate).filter(function (k) { return st.gate[k]; }).length,
      hunt: Object.keys(st.hunt).filter(function (k) { return k.indexOf("hit:") === 0 && st.hunt[k]; }).length,
      match: Object.keys(st.match).filter(function (k) { return st.match[k]; }).length,
      patch: Object.keys(st.patch).filter(function (k) { return st.patch[k]; }).length,
      recall: Object.keys(st.recall).filter(function (k) { return st.recall[k]; }).length
    };
  }

  function badgesEarned(c) {
    return G.badges.filter(function (b) {
      var n = b.need;
      if (n.steps) return n.steps.every(function (k) { return doneKeys.indexOf(k) !== -1; });
      if (n.module) {
        var want = 0, have = 0;
        (window.MODULES || []).forEach(function (m) {
          if (m.id !== n.module) return;
          (m.steps || []).forEach(function (s) {
            want++; if (doneKeys.indexOf(m.id + "/" + s.id) !== -1) have++;
          });
        });
        return want > 0 && have === want;
      }
      if (n.quiz) return c.quiz >= n.quiz;
      if (n.scenarios) return c.scen >= n.scenarios;
      if (n.spot) return c.spot >= n.spot;
      if (n.report) return c.report >= n.report;
      if (n.cap) return c.cap >= n.cap;
      if (n.ready) return !!st.ready;
      if (n.gate) return c.gate >= n.gate;
      if (n.match) return c.match >= n.match;
      if (n.patch) return c.patch >= n.patch;
      if (n.recall) return c.recall >= (window.Recall && window.Recall.size ? window.Recall.size() : n.recall);
      if (n.doors) return Object.keys(st.doors).filter(function (k) { return st.doors[k]; }).length >= n.doors;
      return false;
    });
  }

  function flagXp() {
    /* derived, never accumulated: take a hint and this flag's value drops, including after you solved it */
    var total = 0;
    (window.CAPSTONE ? window.CAPSTONE.flags : []).forEach(function (f) {
      if (!st.cap[f.id]) return;
      var used = st.hints[f.id] || 0, cost = 0;
      for (var i = 0; i < used && i < 3; i++) cost += XP_HINT[i];
      total += Math.max(5, XP_FLAG - cost);
    });
    return total;
  }
  function xpOf(c) { return c.steps * XP_STEP + c.quiz * XP_QUIZ + c.scen * XP_SCEN + c.spot * XP_SPOT + c.report * XP_REPORT + flagXp() + (st.ready ? XP_READY : 0) + c.ask * XP_ASK + c.doors * XP_DOOR + c.gate * XP_GATE + c.hunt * 5 + c.match * XP_MATCH + c.patch * XP_PATCH + c.recall * XP_RECALL; }

  function levelOf(xp) {
    var L = G.levels, cur = L[0], next = null;
    for (var i = 0; i < L.length; i++) {
      if (xp >= L[i].xp) { cur = L[i]; next = L[i + 1] || null; }
    }
    return { cur: cur, next: next };
  }

  function stats() {
    var c = counts(), base = xpOf(c), b = badgesEarned(c);
    /* the rank must be derived from the same number the HUD prints, or "xp to next" goes negative */
    var total = base + b.length * XP_BADGE;
    return { c: c, xp: base, lv: levelOf(total), badges: b, badgeXp: b.length * XP_BADGE, total: total };
  }

  /* ------------------------------------------------------------------ toast */
  var toastBox = null;
  function toast(title, sub) {
    if (!toastBox) {
      toastBox = document.createElement("div");
      toastBox.className = "gm-toasts";
      document.body.appendChild(toastBox);
    }
    var t = document.createElement("div");
    t.className = "gm-toast";
    t.innerHTML = '<b>' + (title || "") + "</b>" + (sub ? "<span>" + sub + "</span>" : "");
    toastBox.appendChild(t);
    if (window.Announce) window.Announce((title || "") + (sub ? ". " + String(sub).replace(/<[^>]+>/g, "") : ""));
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  }

  /* ------------------------------------------------------------------ HUD */
  function renderHUD(prev) {
    var s = stats();
    var host = document.getElementById("gmhud");
    if (!host) return;
    var pct = 0;
    if (s.lv.next) {
      var span = s.lv.next.xp - s.lv.cur.xp;
      pct = Math.min(100, Math.round(((s.total - s.lv.cur.xp) / span) * 100));
    } else { pct = 100; }
    host.innerHTML =
      '<div class="gm-line">' +
        '<span class="gm-hudlvl">' + s.lv.cur.name + "</span>" +
        '<span class="gm-hudxp">' + s.total + " xp</span>" +
        '<span class="gm-hudbd">' + s.badges.length + "/" + G.badges.length + "</span>" +
      "</div>" +
      '<div class="gm-hudsub">' + (s.lv.next ? Math.max(0, s.lv.next.xp - s.total) + " xp to " + s.lv.next.name : "top rank") + "</div>";

    if (prev) {
      if (s.lv.cur.name !== prev.lv.cur.name) toast("Level up: " + s.lv.cur.name, "next: " + ((s.lv.next && s.lv.next.name) || "-"));
      s.badges.forEach(function (b) {
        if (!prev.badges.some(function (x) { return x.id === b.id; })) toast("Badge: " + b.name, b.why);
      });
    }
  }

  function refresh() {
    var prev = lastSnapshot;
    lastSnapshot = stats();
    renderHUD(prev);
    if (location.hash.indexOf("#/progress") === 0 && window.__gmHost) viewProgress(window.__gmHost);
    if (location.hash.indexOf("#/practice") === 0 && window.__gmHost) viewPractice(window.__gmHost);
  }

  var lastSnapshot = null;

  /* ------------------------------------------------------------------ practice */
  var qState = { i: 0, picked: -1 };
  var sState = { picked: {} };

  function viewPractice(root) {
    window.__gmHost = root;
    var s = stats();
    root.innerHTML = "";
    var sum = el("div", "gm-sum");
    sum.innerHTML = "Level <b>" + esc(s.lv.cur.name) + "</b> \u00b7 " + s.total + " xp \u00b7 quiz " +
      s.c.quiz + "/" + G.quiz.length + " \u00b7 judgement calls " + s.c.scen + "/" + G.scenarios.length +
      (s.lv.next ? " \u00b7 " + Math.max(0, s.lv.next.xp - s.total) + " xp to " + esc(s.lv.next.name) : "");
    root.appendChild(sum);

    /* ---- quiz runner ---- */
    var qSec = el("section", "gm-sec");
    qSec.appendChild(el("h3", "gm-h3", "Knowledge check"));
    qSec.appendChild(el("p", "gm-p", "One question at a time, no timer. A correct first answer is worth " + XP_QUIZ +
      " xp; a wrong one still explains itself and can be retried."));
    var quiz = G.quiz[qState.i % G.quiz.length];
    var qCard = el("div", "gm-q");
    qCard.appendChild(el("div", "gm-qmeta", "Question " + (qState.i + 1) + " of " + G.quiz.length + " \u00b7 module " + quiz.mod.toUpperCase()));
    qCard.appendChild(el("div", "gm-qtext", quiz.q));
    var opts = el("div", "gm-opts");
    quiz.options.forEach(function (o, oi) {
      var b = el("button", "gm-opt", o);
      b.type = "button";
      if (qState.picked >= 0) {
        if (oi === quiz.a) b.classList.add("right");
        else if (oi === qState.picked) b.classList.add("wrong");
        b.disabled = true;
      }
      b.addEventListener("click", function () {
        if (qState.picked >= 0) return;
        qState.picked = oi;
        var qi = qState.i % G.quiz.length;
        if (oi === quiz.a && !st.seen[qi]) { st.quiz[qi] = true; }
        st.seen[qi] = true;
        persist();
        refresh();
        viewPractice(root);
      });
      opts.appendChild(b);
    });
    qCard.appendChild(opts);
    if (qState.picked >= 0) {
      var ok = qState.picked === quiz.a;
      var fb = el("div", "gm-fb " + (ok ? "ok" : "no"));
      fb.innerHTML = "<b>" + (ok ? "Correct." : "Not this one.") + "</b> " + esc(quiz.why) +
        (st.quiz[qState.i % G.quiz.length] ? ' <span class="gm-gain">+' + XP_QUIZ + " xp</span>" : "");
      qCard.appendChild(fb);
      var nb = el("button", "gm-next", "next question \u2192");
      nb.type = "button";
      nb.addEventListener("click", function () { qState.i = (qState.i + 1) % G.quiz.length; qState.picked = -1; viewPractice(root); });
      qCard.appendChild(nb);
    }
    qSec.appendChild(qCard);
    root.appendChild(qSec);

    /* ---- judgement calls ---- */
    var sSec = el("section", "gm-sec");
    sSec.appendChild(el("h3", "gm-h3", "Judgement calls"));
    sSec.appendChild(el("p", "gm-p", "A situation, four plausible answers, one that survives review. " + XP_SCEN +
      " xp for the answer a report can defend."));
    G.scenarios.forEach(function (sc, si) {
      var card = el("div", "gm-scen");
      card.appendChild(el("div", "gm-qmeta", "Scenario " + (si + 1) + " of " + G.scenarios.length));
      card.appendChild(el("div", "gm-qtext", sc.title));
      card.appendChild(el("p", "gm-setup", sc.setup));
      var list = el("div", "gm-opts");
      var picked = sState.picked[si];
      sc.options.forEach(function (o, oi) {
        var b = el("button", "gm-opt gm-opt-s", o.t);
        b.type = "button";
        if (picked != null) {
          if (o.ok) b.classList.add("right");
          else if (oi === picked) b.classList.add("wrong");
          b.disabled = true;
        }
        b.addEventListener("click", function () {
          if (sState.picked[si] != null) return;
          sState.picked[si] = oi;
          if (o.ok) st.scen[si] = true;
          persist(); refresh(); viewPractice(root);
        });
        list.appendChild(b);
      });
      card.appendChild(list);
      if (picked != null) {
        var chosen = sc.options[picked];
        var f = el("div", "gm-fb " + (chosen.ok ? "ok" : "no"));
        f.innerHTML = "<b>" + (chosen.ok ? "That is the defensible answer." : "This one gets marked down.") + "</b> " +
          esc(chosen.why) + (chosen.ok ? ' <span class="gm-gain">+' + XP_SCEN + " xp</span>" : "");
        card.appendChild(f);
      }
      sSec.appendChild(card);
    });
    sSec.appendChild(el("p", "gm-p gm-dim", "Answers are stored in this browser only. Clearing site data or the " +
      "reset-progress button starts you over."));
    root.appendChild(sSec);

    /* ---- recall drill: flip cards, self-graded ---- */
    if (window.Recall) {
      var rSec = el("section", "gm-sec");
      var rHost = el("div", "rc-root");
      rSec.appendChild(rHost);
      root.appendChild(rSec);
      window.Recall.mount(rHost);
    }
  }

  /* ------------------------------------------------------------------ progress */
  function viewProgress(root) {
    window.__gmHost = root;
    var s = stats();
    root.innerHTML = "";

    var head = el("section", "gm-sec gm-hero");
    head.innerHTML = '<div class="gm-rank">' + s.lv.cur.name + "</div>" +
      '<div class="gm-ranknote">' + esc(s.lv.cur.note || "") + "</div>" +
      '<div class="gm-bigxp">' + s.total + " xp</div>" +
      '<div class="gm-hudsub">' + (s.lv.next ? Math.max(0, s.lv.next.xp - s.total) + " xp to " + s.lv.next.name : "top rank reached") + "</div>";
    root.appendChild(head);

    /* level ladder */
    var lad = el("section", "gm-sec");
    lad.appendChild(el("h3", "gm-h3", "Ranks"));
    var row = el("div", "gm-ranks");
    G.levels.forEach(function (L, i) {
      var d = el("div", "gm-rankbar" + (s.total >= L.xp ? " on" : ""));
      d.innerHTML = "<b>" + esc(L.name) + "</b><span>" + L.xp + " xp</span><i>" + esc(L.note) + "</i>";
      row.appendChild(d);
    });
    lad.appendChild(row);
    root.appendChild(lad);

    /* badges */
    var bSec = el("section", "gm-sec");
    bSec.appendChild(el("h3", "gm-h3", "Badges " + s.badges.length + " / " + G.badges.length));
    var grid = el("div", "gm-badges");
    G.badges.forEach(function (b) {
      var got = s.badges.some(function (x) { return x.id === b.id; });
      var d = el("div", "gm-badge" + (got ? " got" : ""));
      d.innerHTML = '<span class="gm-bmark">' + (got ? "\\u2713" : "\\u00b7") + "</span><b>" + esc(b.name) +
        "</b><span>" + esc(got ? b.why : "locked") + "</span>";
      grid.appendChild(d);
    });
    bSec.appendChild(grid);
    root.appendChild(bSec);

    /* per-module bars + what pays */
    var mSec = el("section", "gm-sec");
    mSec.appendChild(el("h3", "gm-h3", "Where the xp comes from"));
    var tbl = el("div", "gm-mods");
    (window.MODULES || []).forEach(function (m) {
      var tot = (m.steps || []).length, have = 0;
      (m.steps || []).forEach(function (x) { if (doneKeys.indexOf(m.id + "/" + x.id) !== -1) have++; });
      var d = el("div", "gm-mod");
      d.innerHTML = '<span class="gm-mname">' + esc(m.title) + "</span>" +
        '<span class="gm-mbar"><i style="width:' + (tot ? Math.round(have / tot * 100) : 0) + '%"></i></span>' +
        '<span class="gm-mnum">' + have + "/" + tot + " \u00b7 " + have * XP_STEP + " xp</span>";
      tbl.appendChild(d);
    });
    mSec.appendChild(tbl);
    mSec.appendChild(el("p", "gm-p gm-dim",
      "Steps " + s.c.steps * XP_STEP + " xp \u00b7 quiz " + s.c.quiz * XP_QUIZ + " xp \u00b7 judgement " +
      s.c.scen * XP_SCEN + " xp \u00b7 artifacts " + s.c.spot * XP_SPOT + " xp \u00b7 triage " +
      s.c.report * XP_REPORT + " xp \u00b7 gates " + s.c.gate * XP_GATE + " xp \u00b7 doors " +
      s.c.doors * XP_DOOR + " xp \u00b7 matcher " + s.c.match * XP_MATCH + " xp \u00b7 patches " +
      s.c.patch * XP_PATCH + " xp \u00b7 recall " + s.c.recall * XP_RECALL + " xp \u00b7 badges " +
      s.badgeXp + " xp (awards only, not counted twice in the bars)."));
    mSec.appendChild(el("p", "gm-p gm-dim",
      "Interlude scores \u00b7 Top-10 matcher " + s.c.match + "/10 \u00b7 patch-the-line " + s.c.patch +
      "/" + (window.PATCHES ? Object.keys(window.PATCHES.cards).length : 20) + " \u00b7 recall " +
      s.c.recall + "/" + (window.Recall && window.Recall.size ? window.Recall.size() : "-") + " banked."));
    root.appendChild(mSec);

    var links = el("p", "gm-next2");
    links.innerHTML = '<a href="#/practice">Open the practice page \u2192</a>';
    root.appendChild(links);

    /* the record a student actually needs for Module 06: what they completed, as markdown */
    var exp = el("div", "gm-sec");
    exp.innerHTML = '<h3 class="gm-h3">Take the record with you</h3>' +
      '<p class="gm-p">A markdown file listing every module and step with its status, plus your rank, badges and ' +
      'quiz score. It is the evidence half of the report you write in Module 06 - it records what you ticked, and ' +
      'says nothing you did not do.</p>';
    var b = el("button", "gm-next", "download lab log (.md)");
    b.type = "button";
    b.addEventListener("click", function () {
      var ok = window.Toolkit && window.Toolkit.exportLog();
      b.textContent = ok ? "downloaded" : "blocked by the browser - allow downloads";
      setTimeout(function () { b.textContent = "download lab log (.md)"; }, 2200);
    });
    exp.appendChild(b);
    root.appendChild(exp);
  }

  /* ------------------------------------------------------------------ helpers */
  function el(t, c, txt) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ------------------------------------------------------------------ public */
  window.Game = {
    bootstrap: function (fn) {
      getter = fn;
      doneKeys = (fn && fn()) || [];
      lastSnapshot = stats();
      renderHUD(null);
      var host = document.getElementById("gmhud");
      if (host) host.addEventListener("click", function (e) {
        if (e.target.tagName === "A") { /* navigation handled by the hash route */ }
      });
    },
    onReport: function (id, full) {
      if (full) st.report[id] = true;
      persist();
      refresh();
    },
    capState: function () { return { solved: st.cap, hints: st.hints }; },
    askDone: function (mid, i) { return !!st.ask[mid + ":" + i]; },
    gateDone: function (key) { return !!st.gate[key]; },
    onHuntHit: function (id) {
      if (st.hunt["hit:" + id]) return 0;
      st.hunt["hit:" + id] = true;
      persist(); refresh();
      return 5;
    },
    onHuntDone: function (id) {
      if (st.hunt["done:" + id]) return 0;
      st.hunt["done:" + id] = true;
      persist(); refresh();
      toast("Manifest hunted", "every critical line found \u00b7 +20 xp");
      return 20;
    },
    onGate: function (key) {
      if (st.gate[key]) return 0;
      st.gate[key] = true;
      persist(); refresh();
      return XP_GATE;
    },
    /* ---- the three interlude surfaces: matcher, patch, recall. Same contract as onGate:
       record once, award once, return the xp (0 if this one was already banked). */
    matchDone: function (rid) { return !!st.match[rid]; },
    onMatch: function (rid) {
      if (st.match[rid]) return 0;
      st.match[rid] = true;
      persist(); refresh();
      return XP_MATCH;
    },
    patchDone: function (fid) { return !!st.patch[fid]; },
    onPatch: function (fid) {
      if (st.patch[fid]) return 0;
      st.patch[fid] = true;
      persist(); refresh();
      return XP_PATCH;
    },
    recallDone: function (cid) { return !!st.recall[cid]; },
    onRecall: function (cid) {
      if (st.recall[cid]) return 0;
      st.recall[cid] = true;
      persist(); refresh();
      return XP_RECALL;
    },
    onDoor: function (round) { st.round[round] = (st.round[round] || 0) + 1; persist(); },
    onDoorRound: function (id, cleared) {
      if (st.doors[id]) return false;
      st.doors[id] = true;
      persist();
      refresh();
      toast("Round cleared", (cleared === 3 ? "all three - the door set is yours" : cleared + " of 3 rounds") + " \u00b7 +" + XP_DOOR + " xp");
      return true;
    },
    onAsk: function (mid, i, right) {
      if (!right) return false;
      st.ask[mid + ":" + i] = true;
      persist();
      refresh();
      toast("Predicted correctly", "+" + XP_ASK + " xp \u00b7 the frame after this one was the answer");
      return true;
    },
    capSolve: function (id) {
      var before = st.cap[id];
      st.cap[id] = true;
      persist();
      var lvBefore = stats().lv.cur.name;
      refresh();
      var after = stats();
      if (after.lv.cur.name !== lvBefore) toast("Level up: " + after.lv.cur.name, "capstone flag " + id);
      else toast("Flag captured", (before ? "already yours" : "one of six") + " \u00b7 " + after.c.cap + "/6");
      return true;
    },
    capHint: function (id) {
      st.hints[id] = Math.min(3, (st.hints[id] || 0) + 1);
      persist();
      refresh();
      return st.hints[id];
    },
    readyPass: function () {
      if (st.ready) return 0;
      st.ready = 1;
      persist();
      refresh();
      toast("Environment ready", "+" + XP_READY + " xp - nothing blocks Module 00");
      return XP_READY;
    },
    onSpot: function (id, right) {
      if (right) st.spot[id] = true;
      persist();
      refresh();
    },
    onStep: function () {
      doneKeys = (getter && getter()) || doneKeys;
      refresh();
    },
    viewPractice: function (root) { qState = { i: 0, picked: -1 }; sState = { picked: {} }; viewPractice(root); },
    viewProgress: function (root) { viewProgress(root); },
    refresh: refresh,
    toast: toast,
    stats: stats
  };
})();
