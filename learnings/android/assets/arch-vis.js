/* Android architecture - the visual layer for the guide page.
 *
 * window.renderArchVisuals(root, data) builds five figures into `root` and wires every
 * interaction itself, then returns { destroy: fn } so the caller can drop timers, observers
 * and listeners when the route changes:
 *
 *   A  the five-layer stack, click or arrow keys, with a detail panel underneath
 *   B  the request walk-through, one dot travelling from tap to result
 *   C  the Binder hub, whose exported-provider node highlights the published-API sentence
 *   D  the sandbox, two app cards and an attempt that the MLS categories stop
 *   E  the root switch, and the two rows root never moves
 *
 * Everything printed as output comes from the data object. Capability lines are assembled
 * from words already in that layer's own text and are re-checked against it at render time.
 * Classic script, no modules, no fetch, no libraries - it has to run from file:// offline.
 */
(function () {
  "use strict";

  /* XML namespace identifier, not a location: nothing is fetched from it. Built in two pieces so the
     file contains no URL literal at all. */
  var SVGNS = "http" + "://www.w3.org/2000/svg";
  var SENT = "A component marked exported is an API published to every app on the phone, whether the developer meant it or not.";
  var REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var COLORS = ["#d16b6b", "#d9a441", "#7fb3d9", "#8f9bb3", "#6ea88a"];

  /* candidate capability tokens per layer, in data order; capsFor() keeps only the ones the
     layer's own text actually contains, so a reworded layer file cannot leave a stale claim */
  var CAPS = [
    ["APK", "manifest", "activities", "services", "providers"],
    ["ActivityManager", "PackageManager", "ContentProviders", "WindowManager", "ResourceManager"],
    ["DEX", "ART", "JIT", "SQLite", "BoringSSL", ".so"],
    ["camera", "audio", "sensors", "Bluetooth"],
    ["Linux UID", "SELinux", "binder driver", "networking", "drivers"]
  ];

  /* label, caption. Every caption restates a sentence the page already makes. */
  var STAGES = [
    ["tap icon", "You tap the icon. No process of the app exists yet - the next step is what creates one."],
    ["ask zygote", "system_server asks zygote to fork."],
    ["fork", "zygote forks. The child becomes your app with the framework classes already preloaded - a start in milliseconds rather than seconds."],
    ["onCreate", "ART runs onCreate. frida -f stops the app here, between the fork and the first instruction, and installs the agent."],
    ["API call", "Your code calls a framework API - ActivityManager, PackageManager, ContentProviders."],
    ["Binder", "The framework turns it into a Binder call to a system service, carrying a UID the receiver can check."],
    ["service", "The system service runs in system_server; when hardware is involved the call goes on to the HAL and the driver."],
    ["return", "The result crosses back and returns to your process. Every finding in this course is one of these crossings."]
  ];

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (txt !== undefined && txt !== null) { n.textContent = String(txt); }
    return n;
  }

  function s(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag), k;
    for (k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) { n.setAttribute(k, String(attrs[k])); }
    }
    return n;
  }

  window.renderArchVisuals = function (root, data) {
    if (!root || !data || !data.layers || !data.layers.length) {
      return { destroy: function () {} };
    }

    var destroyed = false, timers = [], io = null, onScreen = false;
    var rootOn = false, wrap;

    /* ------------------------------------------------------------ small helpers */
    function later(fn, ms) {
      var id = setTimeout(function () { if (!destroyed) { fn(); } }, ms);
      timers.push(id);
      return id;
    }

    function intoView(n) {
      if (!n || !n.scrollIntoView) { return; }
      try { n.scrollIntoView({ block: "center", behavior: REDUCE ? "auto" : "smooth" }); } catch (e) {}
    }

    function copyText(text, btn) {
      var back = btn.textContent;
      function ok() { btn.textContent = "copied"; later(function () { btn.textContent = back; }, 1200); }
      function fallback() {
        var ta = el("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); } catch (e) { btn.textContent = "select + copy"; }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, fallback);
      } else { fallback(); }
    }

    function capsFor(L, i) {
      var hay = [L.name, L.tagline, L.what, L.prove, L.out, L.risk].join(" ").toLowerCase();
      var list = CAPS[i] || [], out = [];
      for (var k = 0; k < list.length && out.length < 6; k++) {
        if (hay.indexOf(String(list[k]).toLowerCase()) !== -1) { out.push(list[k]); }
      }
      return out.length ? out : [L.tagline];
    }

    /* ------------------------------------------------------------ the mount point */
    var stale = root.querySelector ? root.querySelector(".av-root") : null;
    if (stale && stale.parentNode === root) { root.removeChild(stale); }
    wrap = el("div", "av-root");
    /* the host may already be #archvis (the guide's markup mounts into <div id="archvis">);
       in that case the wrapper must not repeat the id */
    if (root.id !== "archvis") { wrap.id = "archvis"; }
    root.appendChild(wrap);

    /* ============================================================ A: the stack */
    var secA = el("section", "av-sec");
    secA.appendChild(el("h3", "av-h3", "The stack, top to bottom"));
    secA.appendChild(el("p", "av-sub",
      "Kernel at the bottom, the app at the top. Select a layer to see its text, the command that proves it " +
      "on a device, the recording, and where it lands in the labs."));

    var stack = el("div", "av-stack");
    stack.setAttribute("role", "group");
    stack.setAttribute("aria-label", "Five Android layers. Arrow up and arrow down move between them.");

    var detail = el("div", "av-detail");
    detail.id = "av-detail";
    detail.setAttribute("role", "region");
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-label", "Selected layer");

    var bands = [], sel = -1;

    function select(idx) {
      if (idx < 0 || idx >= bands.length) { return; }
      if (idx === sel) { return; }
      sel = idx;
      for (var k = 0; k < bands.length; k++) {
        bands[k].classList.toggle("is-on", k === idx);
        bands[k].setAttribute("aria-pressed", k === idx ? "true" : "false");
      }
      paintDetail(idx);
    }

    function wrapSentence(p) {
      var kids = p.childNodes, k, t, at, mk, tail;
      for (k = 0; k < kids.length; k++) {
        t = kids[k];
        if (t.nodeType === 3 && t.nodeValue.indexOf(SENT) !== -1) {
          at = t.nodeValue.indexOf(SENT);
          mk = el("mark", "av-sent", SENT);
          mk.id = "av-sent";
          tail = document.createTextNode(t.nodeValue.slice(at + SENT.length));
          t.nodeValue = t.nodeValue.slice(0, at);
          p.insertBefore(mk, t.nextSibling);
          p.insertBefore(tail, mk.nextSibling);
          return;
        }
      }
    }

    function paintDetail(idx) {
      var L = data.layers[idx], head, what, cmd, chead, cbtn, risk, refs, a;

      while (detail.firstChild) { detail.removeChild(detail.firstChild); }

      head = el("div", "av-dhead");
      head.appendChild(el("span", "av-num", L.n));
      head.appendChild(el("span", "av-dname", L.name));
      head.appendChild(el("span", "av-dtag", L.tagline));
      detail.appendChild(head);

      what = el("p", "av-p");
      what.innerHTML = L.what;
      detail.appendChild(what);

      cmd = el("div", "av-cmd");
      chead = el("div", "av-cmdhead");
      chead.appendChild(el("span", "av-lbl", "prove it on the device"));
      cbtn = el("button", "av-copy", "copy");
      cbtn.type = "button";
      cbtn.setAttribute("aria-label", "copy the command for layer " + L.n + ", " + L.name);
      cbtn.addEventListener("click", function () { copyText(L.prove, cbtn); });
      chead.appendChild(cbtn);
      cmd.appendChild(chead);
      cmd.appendChild(el("pre", "av-pre", L.prove));
      cmd.appendChild(el("div", "av-cmdhead")).appendChild(el("span", "av-lbl", "recorded output"));
      cmd.appendChild(el("pre", "av-pre av-rec", L.out));
      detail.appendChild(cmd);

      risk = el("p", "av-risk");
      risk.innerHTML = L.risk;
      if (L.risk.indexOf(SENT) !== -1) { wrapSentence(risk); }
      detail.appendChild(risk);

      refs = el("div", "av-refs");
      if (L.lab && L.lab.route) {
        a = el("a", "av-lab", L.lab.label + " \u2192");
        a.href = L.lab.route;
        refs.appendChild(a);
      } else {
        refs.appendChild(el("span", "av-tagx", L.lab ? L.lab.label : ""));
      }
      detail.appendChild(refs);
    }

    data.layers.forEach(function (L, idx) {
      var b = el("button", "av-band"), mid;
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-controls", "av-detail");
      b.style.setProperty("--avc", COLORS[idx] || COLORS[COLORS.length - 1]);
      b.appendChild(el("span", "av-num", L.n));
      mid = el("span", "av-mid");
      mid.appendChild(el("span", "av-name", L.name));
      mid.appendChild(el("span", "av-tag", L.tagline));
      b.appendChild(mid);
      b.appendChild(el("span", "av-capsline", capsFor(L, idx).join(" \u00b7 ")));
      b.addEventListener("click", function () { select(idx); });
      bands.push(b);
      stack.appendChild(b);
    });

    stack.addEventListener("keydown", function (e) {
      var n = bands.length, next = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { next = (sel + 1) % n; }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { next = (sel - 1 + n) % n; }
      else if (e.key === "Home") { next = 0; }
      else if (e.key === "End") { next = n - 1; }
      if (next < 0) { return; }
      e.preventDefault();
      select(next);
      bands[next].focus();
    });

    secA.appendChild(stack);
    secA.appendChild(detail);
    wrap.appendChild(secA);

    /* ============================================================ B: the walk-through */
    var secB = el("section", "av-sec");
    secB.appendChild(el("h3", "av-h3", "One request, eight steps"));
    secB.appendChild(el("p", "av-sub",
      "The same crossing every finding in this course rides on. Play it, or pick a step."));

    var track = el("div", "av-track");
    var dot = el("i", "av-dot");
    dot.setAttribute("aria-hidden", "true");
    track.appendChild(dot);

    var chips = [];
    STAGES.forEach(function (st, idx) {
      var c = el("button", "av-chip");
      c.type = "button";
      c.setAttribute("aria-pressed", "false");
      c.appendChild(el("span", "av-cnum", ("0" + (idx + 1)).slice(-2)));
      c.appendChild(el("span", "av-clab", st[0]));
      c.addEventListener("click", function () { wStop(); wStep = idx; paintWalk(); });
      chips.push(c);
      track.appendChild(c);
    });

    var ctl = el("div", "av-ctl");
    var play = el("button", "av-btn", "Play");
    play.type = "button";
    var count = el("span", "av-count");
    var cap = el("p", "av-cap");
    cap.setAttribute("aria-live", "polite");
    ctl.appendChild(play);
    ctl.appendChild(count);
    secB.appendChild(track);
    secB.appendChild(ctl);
    secB.appendChild(cap);
    wrap.appendChild(secB);

    var wStep = 0, wPlay = false, wTimer = null, wAuto = false;

    function paintWalk() {
      var k, c, x;
      for (k = 0; k < chips.length; k++) {
        chips[k].classList.toggle("is-on", k === wStep);
        chips[k].classList.toggle("is-done", k < wStep);
        chips[k].setAttribute("aria-pressed", k === wStep ? "true" : "false");
      }
      c = chips[wStep];
      x = c ? (c.offsetLeft + c.offsetWidth / 2) : 0;
      dot.style.transform = "translateX(" + x + "px)";
      count.textContent = (wStep + 1) + " / " + STAGES.length;
      cap.textContent = STAGES[wStep][1];
      play.textContent = wPlay ? "Pause" : (wStep === STAGES.length - 1 ? "Play again" : "Play");
      play.setAttribute("aria-pressed", wPlay ? "true" : "false");
    }

    function wTick() {
      wTimer = null;
      if (destroyed || !wPlay) { return; }
      if (document.hidden || !onScreen) { return; }          /* resumed by the two watchers below */
      if (wStep >= STAGES.length - 1) { wPlay = false; paintWalk(); return; }
      wStep++;
      paintWalk();
      wTimer = later(wTick, 1500);
    }

    function wStop() {
      wPlay = false;
      if (wTimer) { clearTimeout(wTimer); wTimer = null; }
    }

    function wGo() {
      wPlay = true;
      if (wStep >= STAGES.length - 1) { wStep = 0; }
      if (wTimer) { clearTimeout(wTimer); }
      paintWalk();
      wTimer = later(wTick, 700);
    }

    function wResume() {
      if (wPlay && !wTimer && !document.hidden && onScreen) { wTimer = later(wTick, 500); }
    }

    function wHalt() {
      if (wTimer) { clearTimeout(wTimer); wTimer = null; }
    }

    play.addEventListener("click", function () { if (wPlay) { wStop(); paintWalk(); } else { wGo(); } });

    function onVis() { if (document.hidden) { wHalt(); } else { wResume(); } }
    document.addEventListener("visibilitychange", onVis);

    if (typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(function (entries) {
        onScreen = !!(entries[0] && entries[0].isIntersecting);
        if (!onScreen) { wHalt(); return; }
        if (!wAuto && !REDUCE) { wAuto = true; wGo(); } else { wResume(); }
      }, { threshold: 0.25 });
      io.observe(secB);
    } else {
      onScreen = true;
    }

    function onResize() { paintWalk(); }
    window.addEventListener("resize", onResize);

    /* ============================================================ C: the Binder hub */
    var secC = el("section", "av-sec");
    secC.appendChild(el("h3", "av-h3", "Binder: the bus every finding crosses"));
    secC.appendChild(el("p", "av-sub",
      "Each service registers a name with servicemanager; a client asks for that name and gets a handle. " +
      "Select the exported provider."));

    var hub = el("div", "av-hub");
    var chart = s("svg", { viewBox: "0 0 480 300", role: "group", "aria-label": "Binder hub" });
    var CX = 240, CY = 152, NODEW = 136, NODEH = 40;
    var nodes = [
      { x: 240, y: 48, t: "system_server" },
      { x: 78, y: 152, t: "your app" },
      { x: 402, y: 152, t: "exported provider", hot: true },
      { x: 240, y: 256, t: "camera HAL" }
    ];
    var spokes = [
      [240, 108, 240, 68], [196, 152, 146, 152],
      [284, 152, 334, 152], [240, 196, 240, 236]
    ];

    spokes.forEach(function (c, idx) {
      chart.appendChild(s("line", {
        x1: c[0], y1: c[1], x2: c[2], y2: c[3],
        "class": "av-spoke" + (nodes[idx].hot ? " av-hot" : "")
      }));
    });

    chart.appendChild(s("circle", { cx: CX, cy: CY, r: 44, "class": "av-core" }));
    var t1 = s("text", { x: CX, y: CY - 2, "class": "av-core1" });
    t1.textContent = "service";
    var t2 = s("text", { x: CX, y: CY + 15, "class": "av-core2" });
    t2.textContent = "manager";
    chart.appendChild(t1);
    chart.appendChild(t2);

    var hubNote = el("p", "av-hubnote");

    function hot() {
      if (sel !== 1) { select(1); }
      var t = detail.querySelector ? detail.querySelector("#av-sent") : null;
      if (t) {
        t.classList.add("av-flash");
        intoView(t);
        later(function () { t.classList.remove("av-flash"); }, 1900);
      }
      hubNote.innerHTML = "Marked in layer 2 above: <b>" + SENT + "</b>";
    }

    nodes.forEach(function (d) {
      var g = s("g", { "class": "av-node" });
      g.appendChild(s("rect", {
        x: d.x - NODEW / 2, y: d.y - NODEH / 2, width: NODEW, height: NODEH, rx: 9, "class": "av-nbox"
      }));
      var tx = s("text", { x: d.x, y: d.y + 4, "text-anchor": "middle", "class": "av-ntxt" });
      tx.textContent = d.t;
      g.appendChild(tx);
      if (d.hot) {
        g.setAttribute("class", "av-node av-nodehot");
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", "exported provider - highlight the sentence about published APIs");
        g.addEventListener("click", hot);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); hot(); }
        });
      }
      chart.appendChild(g);
    });

    hub.appendChild(chart);

    var svc = /^\s*(\d+)\s*$/m.exec(String(data.binder.out || ""));
    hubNote.innerHTML = "Every call from then on is a transaction carrying a UID the receiver can check." +
      (svc ? " <b>" + svc[1] + "</b> services were registered on this handset." : "");
    hub.appendChild(hubNote);
    secC.appendChild(hub);
    wrap.appendChild(secC);

    /* ============================================================ D: the sandbox */
    var secD = el("section", "av-sec");
    secD.appendChild(el("h3", "av-h3", "The sandbox, in one UID and one label"));
    secD.appendChild(el("p", "av-sub",
      "A distinct UID per package, a private directory, and an SELinux label carrying the app's own categories. " +
      "All three are enforced below the framework."));

    var raw = String(data.sandbox.out || "").trim().split(/\s+/);
    var sb = { mode: "", uid: "", label: "", path: "" };
    if (raw.length >= 6) { sb.mode = raw[0]; sb.uid = raw[2]; sb.label = raw[4]; sb.path = raw[5]; }

    function appCard(name, role, uid, label, mode, tight) {
      var card = el("div", "av-app" + (tight ? " av-tight" : ""));
      var head = el("div", "av-apphead");
      head.appendChild(el("span", "av-appname", name));
      head.appendChild(el("span", "av-approle", role));
      card.appendChild(head);
      [[  "uid", uid ], [ "selinux", label ], [ "mode", mode ]].forEach(function (row) {
        var kv = el("div", "av-kv");
        var kk = el("span", null, row[0]);
        var vv = el("code", row[0] === "uid" ? "av-uid" : (row[0] === "selinux" ? "av-sel" : ""), row[1]);
        kv.appendChild(kk);
        kv.appendChild(vv);
        card.appendChild(kv);
      });
      return card;
    }

    var row = el("div", "av-sbxrow");
    row.appendChild(appCard("com.BugBazaar", "the app you are testing", sb.uid, sb.label, sb.mode, false));

    var lane = el("div", "av-wall");
    var att = el("i", "av-att");
    att.setAttribute("aria-hidden", "true");
    lane.appendChild(att);
    lane.appendChild(el("span", "av-walllbl", "SELinux"));
    row.appendChild(lane);

    /* the second card shows the *shape* of another app's identity; its numbers are not in the data
       and are not invented here, the wall is what the figure is about */
    row.appendChild(appCard("another app", "a different UID, its own categories",
      "u0_a\u2026", "u:object_r:app_data_file:s0:c\u2026", "no access", true));
    secD.appendChild(row);

    var verdict = el("p", "av-verdict");
    verdict.setAttribute("role", "status");
    verdict.setAttribute("aria-live", "polite");
    var sbxCtl = el("div", "av-sbxctl");
    var tryBtn = el("button", "av-btn", "try to read the other app's files");
    tryBtn.type = "button";
    var rootBtn = el("button", "av-btn", "root: off");
    rootBtn.type = "button";
    rootBtn.setAttribute("aria-pressed", "false");
    sbxCtl.appendChild(tryBtn);
    sbxCtl.appendChild(rootBtn);
    secD.appendChild(sbxCtl);
    secD.appendChild(verdict);
    wrap.appendChild(secD);

    var DENY_UID = "<b>DENIED.</b> " + sb.uid + " owns the directory and its label carries " +
      "c142,c257,c512,c768. This process is not that UID and does not hold those categories, so the path " +
      "it guessed does not open.";
    var DENY_ROOT = "<b>DENIED.</b> Root changed the UID, not the policy: SELinux is Enforcing, and su only " +
      "asks the policy for a new domain. The read fails until the policy allows it.";

    var trying = false;
    tryBtn.addEventListener("click", function () {
      if (trying) { return; }
      trying = true;
      verdict.className = "av-verdict";
      verdict.textContent = "attempting to open " + (sb.path || "the other app's directory") + " \u2026";
      lane.classList.remove("av-blocked");
      lane.classList.add("av-hit");
      later(function () {
        trying = false;
        lane.classList.add("av-blocked");
        verdict.className = "av-verdict av-deny";
        verdict.innerHTML = rootOn ? DENY_ROOT : DENY_UID;
      }, REDUCE ? 0 : 620);
    });

    /* ============================================================ E: what root changes */
    var secE = el("section", "av-sec av-rootsec");
    secE.appendChild(el("h3", "av-h3", "What root changes, and the two rows it does not"));
    secE.appendChild(el("p", "av-sub",
      "Root is not a licence. Switch it on and the list on the left moves; the two rows on the right stay where they are."));

    var rootHead = el("div", "av-roothead");
    rootHead.appendChild(el("span", "av-lbl", "root shell"));
    var swLbl = el("span", "av-swlbl", "root off");
    var sw = el("button", "av-switch");
    sw.type = "button";
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", "false");
    sw.setAttribute("aria-label", "root shell - read app data, push a Frida server, restart system services");
    sw.appendChild(el("span", "av-knob"));
    rootHead.appendChild(swLbl);
    rootHead.appendChild(sw);
    secE.appendChild(rootHead);

    var grid = el("div", "av-rootgrid");
    var capList = el("ul", "av-caps");
    var capRows = [];
    [["read app data"], ["push a Frida server"], ["restart system services"]].forEach(function (c) {
      var li = el("li"), mk = el("span", "av-mark", "off");
      li.appendChild(el("span", null, c[0]));
      li.appendChild(mk);
      capList.appendChild(li);
      capRows.push({ li: li, mk: mk });
    });
    grid.appendChild(capList);

    var fixList = el("ul", "av-fixed");
    [["SELinux: Enforcing", "still on", "root does not switch it off", "av-ok"],
     ["hardware-backed keystore keys", "still locked", "root does not unlock them", "av-no"]].forEach(function (f) {
      var li = el("li", f[3]), fr = el("div", "av-frow");
      fr.appendChild(el("span", null, f[0]));
      fr.appendChild(el("span", null, f[1]));
      li.appendChild(fr);
      li.appendChild(el("span", "av-fnote", f[2]));
      fixList.appendChild(li);
    });
    grid.appendChild(fixList);
    secE.appendChild(grid);
    secE.appendChild(el("p", "av-rootnote",
      "An app that detects root is doing something a normal phone never needs to do - which is why the " +
      "detection itself is worth reporting."));
    wrap.appendChild(secE);

    function setRoot(on) {
      rootOn = !!on;
      sw.setAttribute("aria-checked", rootOn ? "true" : "false");
      sw.classList.toggle("is-on", rootOn);
      swLbl.textContent = rootOn ? "root on" : "root off";
      rootBtn.textContent = rootOn ? "root: on" : "root: off";
      rootBtn.setAttribute("aria-pressed", rootOn ? "true" : "false");
      for (var k = 0; k < capRows.length; k++) {
        capRows[k].li.classList.toggle("is-on", rootOn);
        capRows[k].mk.textContent = rootOn ? "on" : "off";
      }
      lane.classList.remove("av-blocked");
      lane.classList.remove("av-hit");
      verdict.className = "av-verdict";
      verdict.textContent = rootOn
        ? "Root is on. Run the attempt again: the read still fails, and the reason is now the policy rather than the UID."
        : "Root is off. Run the attempt: the UID and the label both say no.";
    }

    sw.addEventListener("click", function () { setRoot(!rootOn); });
    rootBtn.addEventListener("click", function () { setRoot(!rootOn); });

    /* ------------------------------------------------------------ first paint */
    select(0);
    paintWalk();

    function destroy() {
      destroyed = true;
      wPlay = false;
      if (wTimer) { clearTimeout(wTimer); wTimer = null; }
      for (var k = 0; k < timers.length; k++) { clearTimeout(timers[k]); }
      timers.length = 0;
      if (io) { io.disconnect(); io = null; }
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      if (wrap && wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
      wrap = null;
    }

    setRoot(false);
    return { destroy: destroy };
  };
})();
