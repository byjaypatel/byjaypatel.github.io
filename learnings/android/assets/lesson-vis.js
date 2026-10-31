/* Mechanism player for the lesson sections.
 *
 * Renders one sequence: all nodes in flow order, dimmed; each frame lights the nodes that matter and prints a
 * caption. Play/pause, prev/next, dots. Auto-advance stops when the tab is hidden, when motion is off, or when
 * the student takes manual control. destroy() clears the timer - it runs on route change.
 */
(function () {
  "use strict";

  var state = null;   // { seq, i, timer, root, paused }

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }

  function build(seq, root) {
    root.innerHTML = "";
    var wrap = el("div", "lv");
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "animated mechanism: " + seq.title);
    var head = el("div", "lv-head");
    head.innerHTML = '<span class="lv-k">watch it once</span><span class="lv-title"></span>';
    head.querySelector(".lv-title").textContent = seq.title;
    wrap.appendChild(head);

    var stage = el("div", "lv-stage");
    seq.nodes.forEach(function (n, i) {
      var node = el("div", "lv-node");
      node.dataset.nid = n.id;
      node.innerHTML = '<span class="lv-dot">' + (i + 1) + "</span>" +
        '<span class="lv-lab">' + esc(n.label) + "</span>" +
        (n.sub ? '<span class="lv-sub">' + esc(n.sub) + "</span>" : "");
      stage.appendChild(node);
    });
    wrap.appendChild(stage);

    var cap = el("div", "lv-cap");
    cap.innerHTML = '<span class="lv-cnum"></span><span class="lv-ctext"></span>';
    wrap.appendChild(cap);

    var bar = el("div", "lv-bar");
    var prev = el("button", "lv-btn", "\u2190");
    var play = el("button", "lv-btn lv-play", "play");
    var next = el("button", "lv-btn", "\u2192");
    prev.type = play.type = next.type = "button";
    var dots = el("div", "lv-dots");
    seq.frames.forEach(function (f, i) {
      var d = el("button", "lv-dot-btn");
      d.type = "button";
      d.dataset.i = i;
      d.setAttribute("aria-label", "frame " + (i + 1) + " of " + seq.frames.length + (f.title ? ": " + f.title : ""));
      d.addEventListener("click", function () { stop(); paint(seq, i, root); });
      dots.appendChild(d);
    });
    bar.appendChild(prev); bar.appendChild(play); bar.appendChild(next);
    bar.appendChild(dots);
    var meta = el("span", "lv-meta");
    bar.appendChild(meta);
    wrap.appendChild(bar);
    root.appendChild(wrap);

    prev.addEventListener("click", function () { stop(); paint(seq, Math.max(0, state.i - 1), root); });
    next.addEventListener("click", function () { stop(); paint(seq, Math.min(seq.frames.length - 1, state.i + 1), root); });
    play.addEventListener("click", function () { running() ? stop() : autoplay(seq, root); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); paint(seq, Math.min(seq.frames.length - 1, state.i + 1), root); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stop(); paint(seq, Math.max(0, state.i - 1), root); }
      if (e.key === " ") { e.preventDefault(); running() ? stop() : autoplay(seq, root); }
    });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function paint(seq, i, root) {
    if (!state) return;
    state.i = Math.max(0, Math.min(seq.frames.length - 1, i));
    var f = seq.frames[state.i];
    Array.prototype.forEach.call(root.querySelectorAll(".lv-node"), function (n) {
      var on = f.focus.indexOf(n.dataset.nid) !== -1;
      n.classList.toggle("on", on);
      n.classList.toggle("dim", !on);
      if (on) { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; }
    });
    root.querySelector(".lv-ctext").textContent = f.caption;
    root.querySelector(".lv-cnum").textContent = (state.i + 1) + "/" + seq.frames.length;
    Array.prototype.forEach.call(root.querySelectorAll(".lv-dot-btn"), function (d, di) {
      d.classList.toggle("on", di === state.i);
      d.classList.toggle("past", di < state.i);
      if (di === state.i) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
    });
    root.querySelector(".lv-meta").textContent = state.timer ? "playing" : "paused";
    offerAsk(seq, state.i, root);
  }


  /* ---- predict the next step: the player stops being a video ----
     A question is offered the first time a frame with one is reached, however the student got there. Once answered
     it never comes back, because re-asking a question you have already seen teaches nothing. */
  function offerAsk(seq, i, root) {
    if (!state || !seq.asks) return;
    var ask = null;
    for (var k = 0; k < seq.asks.length; k++) if (seq.asks[k].at === i) { ask = seq.asks[k]; break; }
    if (!ask) return;
    var key = state.mid + ":" + i;
    if (state.asked[key]) return;
    if (window.Game && window.Game.askDone && window.Game.askDone(state.mid, i)) return;
    if (root.querySelector(".lv-ask")) return;
    stop();

    var box = el("div", "lv-ask");
    box.innerHTML = '<div class="lv-ask-k">before you go on</div><div class="lv-ask-q">' + esc(ask.q) + "</div>";
    var opts = el("div", "lv-ask-opts");
    var fb = el("div", "lv-ask-fb");
    ask.opts.forEach(function (text, idx) {
      var b = el("button", "lv-ask-opt", text);
      b.type = "button";
      b.addEventListener("click", function () {
        if (box.dataset.answered) return;
        box.dataset.answered = "1";
        var right = idx === ask.a;
        Array.prototype.forEach.call(opts.querySelectorAll("button"), function (x, xi) {
          x.disabled = true;
          if (xi === ask.a) x.classList.add("right");
          else if (xi === idx) x.classList.add("wrong");
        });
        fb.className = "lv-ask-fb " + (right ? "ok" : "no");
        fb.textContent = (right ? "Right. " : "Not quite. ") + ask.why;
        state.asked[key] = true;
        if (window.Game && window.Game.onAsk) window.Game.onAsk(state.mid, i, right);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
    box.appendChild(fb);
    var go = el("button", "lv-ask-go", "carry on \u2192");
    go.type = "button";
    go.addEventListener("click", function () {
      box.remove();
      if (window.Motion && window.Motion.on() && !state.timer) autoplay(state.seq, state.root);
    });
    box.appendChild(go);
    root.querySelector(".lv").appendChild(box);
  }

  function running() { return !!(state && state.timer); }

  function autoplay(seq, root) {
    stop();
    if (window.Motion && !window.Motion.on()) { paint(seq, state.i, root); return; }
    state.timer = setInterval(function () {
      if (document.hidden) return;
      if (root.querySelector(".lv-ask")) { stop(); return; }
      if (state.i >= seq.frames.length - 1) { stop(); paint(seq, state.i, root); return; }
      paint(seq, state.i + 1, root);
    }, 2400);
    paint(seq, state.i, root);
  }

  function stop() {
    if (state && state.timer) { clearInterval(state.timer); state.timer = null; }
    if (state && state.root) {
      var m = state.root.querySelector(".lv-meta");
      if (m) m.textContent = "paused";
      var p = state.root.querySelector(".lv-play");
      if (p) p.textContent = "play";
    }
  }

  window.LessonVis = {
    mount: function (root, mid) {
      var seq = (window.LESSON_VIS || {})[mid];
      if (!root || !seq) return false;
      this.destroy();
      state = { seq: seq, i: 0, timer: null, root: root, mid: mid, asked: {} };
      build(seq, root);
      paint(seq, 0, root);
      /* play by itself once, unless motion is off - the label promises "watch it once" */
      if (window.Motion && window.Motion.on()) {
        setTimeout(function () { if (state && state.seq === seq && !state.timer) autoplay(seq, root); }, 420);
      }
      return true;
    },
    play: function (root, mid) {
      var seq = (window.LESSON_VIS || {})[mid];
      if (seq && state) autoplay(seq, state.root);
    },
    destroy: function () { stop(); state = null; }
  };
})();
