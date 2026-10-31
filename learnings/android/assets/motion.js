/* Motion layer.
 *
 * Rules this file sticks to:
 *  - every animation reports something (a tick landed, a fold opened, a grade was wrong). Nothing moves to
 *    decorate an idle screen.
 *  - durations 120-220ms. Anything slower reads as lag on a projector and fights the student's scrolling.
 *  - one switch: prefers-reduced-motion OR the in-page toggle sets html.no-motion, and this file then does
 *    nothing at all - not "shortens", does nothing.
 */
(function () {
  "use strict";

  var KEY = "asw-motion";
  var pref = null;
  try { pref = localStorage.getItem(KEY); } catch (e) {}

  function osReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function enabled() {
    if (pref === "off") return false;
    if (pref === "on") return true;
    return !osReduced();
  }
  function apply() {
    document.documentElement.classList.toggle("no-motion", !enabled());
  }
  apply();

  function dur(ms) { return enabled() ? ms : 0; }

  /* ---------------------------------------------------------------- folds
     Native <details> pops open. Animate the content height so the eye follows it and the page does not jump
     out from under the cursor. Falls back to instant when motion is off or WAAPI is missing. */
  function foldClick(e) {
    var sum = e.target.closest ? e.target.closest("details > summary") : null;
    if (!sum) return;
    var d = sum.parentElement;
    if (!d || !(d.classList.contains("fold") || d.classList.contains("expect"))) return;
    var inner = d.querySelector(".foldin, .inner");
    if (!inner || !inner.animate) return;
    if (!enabled()) return;
    e.preventDefault();
    inner.style.overflow = "hidden";
    if (d.open) {
      var h = inner.offsetHeight;
      var a = inner.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 140, easing: "cubic-bezier(.4,0,1,1)" });
      a.onfinish = function () { d.open = false; inner.style.overflow = ""; inner.style.height = ""; };
    } else {
      d.open = true;
      var h2 = inner.offsetHeight;
      var b = inner.animate([{ height: "0px", opacity: 0 }, { height: h2 + "px", opacity: 1 }],
        { duration: 180, easing: "cubic-bezier(0,0,.2,1)" });
      b.onfinish = function () { inner.style.overflow = ""; inner.style.height = ""; };
    }
  }
  document.addEventListener("click", foldClick, true);

  /* ---------------------------------------------------------------- xp fly-up
     A tick that silently turns green is easy to miss; the number travelling to the HUD closes the loop. */
  function flyXP(fromEl, text) {
    if (!enabled() || !fromEl || !fromEl.getBoundingClientRect) return;
    var hud = document.getElementById("gmhud");
    if (!hud) return;
    var a = fromEl.getBoundingClientRect(), b = hud.getBoundingClientRect();
    var n = document.createElement("span");
    n.className = "xp-fly";
    n.textContent = text || "+10 xp";
    n.style.left = (a.left + a.width / 2 - 18) + "px";
    n.style.top = (a.top - 6) + "px";
    document.body.appendChild(n);
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    var dy = (b.top + 14) - (a.top - 6);
    n.animate([
      { transform: "translate(0,0) scale(.9)", opacity: 0 },
      { transform: "translate(0,-8px) scale(1)", opacity: 1, offset: .25 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.85)", opacity: 0 }
    ], { duration: 620, easing: "cubic-bezier(.3,0,.4,1)" }).onfinish = function () { n.remove(); };
  }

  /* ---------------------------------------------------------------- number count-up */
  function countUp(node, to, suffix) {
    if (!node) return;
    var from = parseInt(String(node.textContent).replace(/[^0-9-]/g, ""), 10);
    if (!enabled() || isNaN(from) || from === to || !node.animate) { node.textContent = to + (suffix || ""); return; }
    var t0 = performance.now(), d = 420;
    function step(t) {
      var k = Math.min(1, (t - t0) / d);
      var e = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(from + (to - from) * e) + (suffix || "");
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------- route fade
     A 130ms fade on the content column only. The sidebar and rail stay put, so the page reads as changing
     rather than reloading. */
  function routeIn(main) {
    if (!main || !main.animate || !enabled()) return;
    main.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }],
      { duration: 150, easing: "cubic-bezier(0,0,.2,1)" });
  }

  /* ---------------------------------------------------------------- toggle */
  function toggle() {
    pref = enabled() ? "off" : "on";
    try { localStorage.setItem(KEY, pref); } catch (e) {}
    apply();
    return enabled();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "")) return;
    if (e.key === "m" || e.key === "M") {
      var on = toggle();
      if (window.Game && window.Game.toast) window.Game.toast("Motion " + (on ? "on" : "off"), on ? "animations restored" : "everything is instant now");
    }
  });

  function replay(node, name, ms) {
    if (!on() || !node) return;
    node.classList.remove(name);
    void node.offsetWidth;
    node.classList.add(name);
    setTimeout(function () { node.classList.remove(name); }, ms || 400);
  }

  window.Motion = {
    /* reusable one-shot feedback for pages that build their own cards */
    pop: function (node) { replay(node, "popOk", 420); },
    shake: function (node) { replay(node, "shake", 420); },
    on: enabled,
    toggle: toggle,
    flyXP: flyXP,
    countUp: countUp,
    routeIn: routeIn,
    apply: apply
  };
})();
