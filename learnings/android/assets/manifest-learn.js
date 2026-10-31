/* The Learn layer for #/m1/manifest: six lessons, each a live sandbox.
 *
 * Each lesson makes one claim, then hands the student the controls that change it. Nothing here is scored - the
 * score lives in the doors game, which only works once the model is understood. Every fact is read from the parsed
 * manifest at runtime, so the lesson cannot drift from what the APK actually declares.
 */
(function () {
  "use strict";
  var KEY = "asw-learn-mf";

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function parsed() { try { return window.ManifestLab.parse("bugbazaar"); } catch (e) { return { comps: [] }; } }

  /* ------------------------------------------------------------------ the rule, in one place */
  var PERMS = {
    none: { kind: "none", label: "no permission" },
    declared: { kind: "declared", label: "com.BugBazaar.permission.contact", note: "declared with protectionLevel=signature" },
    label: { kind: "label", label: "@string/app_name", note: "resolves to the string \"BugBazaar\" - a label, not a permission" }
  };

  function judge(o) {
    if (o.exported === "false")
      return { state: "closed", why: "android:exported=\"false\" - only this app can start it.", cmd: null };
    if (o.exported === "unset") {
      if (!o.filter) return { state: "closed", why: "No attribute and no filter: the default is false (API 17+).", cmd: null };
      if (o.targetSdk >= 31)
        return { state: "build", why: "No attribute but a filter, at targetSdk " + o.targetSdk + ": the build refuses to compile this. It cannot ship - which is why BugBazaar, at 32, declares every one.", cmd: null };
      return { state: "legacy", why: "No attribute but a filter, built before targetSdk 31: open by default. hpAndro has 114 components like this.", cmd: o.cmd };
    }
    if (o.perm === "declared")
      return { state: "locked", why: "Exported, but gated by " + PERMS.declared.label + " - declared, signature level. Only apps signed with the same key can hold it.", cmd: null };
    if (o.perm === "label")
      return { state: "fake", why: "Exported, and \"protected\" by " + PERMS.label.label + " - which resolves to the app's own label, \"BugBazaar\". No app can be granted a string. The door is open.", cmd: o.cmd };
    return { state: "open", why: "Exported, no permission: any app on the device can call it.", cmd: o.cmd };
  }

  var STATE_LABEL = {
    open: "open", legacy: "open by default", fake: "looks locked - is not",
    locked: "locked", closed: "closed", build: "will not build"
  };

  function cmdFor(type, name) {
    var n = name || "com.BugBazaar/.ui.Signin";
    if (type === "P") return 'adb shell content query --uri content://' + (n.authority || "authority") + "/addresses";
    if (type === "S") return 'adb shell am startservice -n ' + n;
    if (type === "R") return 'adb shell am broadcast -n ' + n + " -a android.intent.action.BOOT_COMPLETED";
    return 'adb shell am start -n ' + n;
  }

  /* ------------------------------------------------------------------ lesson widgets */
  var W = {};

  W.l1 = function () {
    var p = parsed();
    var types = [
      { id: "A", name: "activity", say: "a screen the user sees", pick: p.comps.filter(function (c) { return c.type === "A" && c.open; })[0] },
      { id: "S", name: "service", say: "a worker with no screen", pick: p.comps.filter(function (c) { return c.type === "S" && c.open; })[0] },
      { id: "R", name: "receiver", say: "listens for a broadcast", pick: p.comps.filter(function (c) { return c.type === "R" && c.open; })[0] },
      { id: "P", name: "provider", say: "answers content:// URIs", pick: p.comps.filter(function (c) { return c.type === "P" && c.authority; })[0] }
    ];
    var cur = 0;
    return {
      html: '<div class="lz-chips">' + types.map(function (t, i) {
        return '<button class="lz-chip' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' + t.name + "</button>";
      }).join("") + "</div>" +
        '<div class="lz-out"><div class="lz-line"><span class="lz-k">what it is</span><span class="lz-say"></span></div>' +
        '<div class="lz-line"><span class="lz-k">this one, in BugBazaar</span><code class="lz-name"></code></div>' +
        '<div class="lz-line"><span class="lz-k">how you knock</span><pre class="lz-cmd"></pre></div></div>',
      wire: function (root, verdict) {
        var say = root.querySelector(".lz-say"), name = root.querySelector(".lz-name"), cmd = root.querySelector(".lz-cmd");
        function paint() {
          var t = types[cur], c = t.pick;
          say.textContent = t.say;
          name.textContent = c ? (c.name || "") : "none exported";
          var nm = c ? c.name : null;
          if (t.id === "P") nm = c ? { authority: c.authority } : null;
          cmd.textContent = c ? cmdFor(t.id, t.id === "P" ? nm : nm) : "nothing to knock on";
          verdict("Four kinds, four ways in. The name is always the key.", "info");
        }
        Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (b) {
          b.onclick = function () {
            cur = +b.dataset.i;
            Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        paint();
      }
    };
  };

  W.l2 = function () {
    var state = { exported: "true", filter: false, targetSdk: 32, type: "A" };
    var target = parsed().comps.filter(function (c) { return c.type === "A" && c.own; })[0];
    var nm = target ? target.name : "com.BugBazaar.ui.Signin";
    return {
      html: '<div class="lz-ctl"><span class="lz-k">android:exported</span>' +
        '<div class="lz-chips" data-g="exp">' +
        ["true", "false", "unset"].map(function (v) { return '<button class="lz-chip' + (v === state.exported ? " on" : "") + '" data-v="' + v + '">' + v + "</button>"; }).join("") +
        "</div></div>" +
        '<pre class="lz-snippet"></pre>',
      wire: function (root, verdict) {
        var snip = root.querySelector(".lz-snippet");
        function paint() {
          var attr = state.exported === "unset" ? "" : '\n    android:exported="' + state.exported + '"';
          snip.textContent = '<activity\n    android:name="' + nm + '"' + attr + ' />';
          var j = judge({ exported: state.exported, filter: false, targetSdk: state.targetSdk, perm: "none", cmd: cmdFor(state.type, nm) });
          verdict(j.why, j.state, j.cmd);
        }
        Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (b) {
          b.onclick = function () {
            state.exported = b.dataset.v;
            Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        paint();
      }
    };
  };

  W.l3 = function () {
    var state = { filter: false, targetSdk: 30 };
    var nm = (parsed().comps.filter(function (c) { return c.type === "A" && c.own && c.filters && c.filters.length; })[0] || {}).name || "com.BugBazaar.ui.Deeplink";
    return {
      html: '<div class="lz-ctl"><span class="lz-k">intent-filter</span><button class="lz-chip on" data-t="filter">none</button>' +
        '<button class="lz-chip" data-t="filter">BROWSABLE deeplink</button></div>' +
        '<div class="lz-ctl"><span class="lz-k">built at</span><div class="lz-chips" data-g="sdk">' +
        '<button class="lz-chip on" data-v="30">targetSdk 30 (hpAndro)</button>' +
        '<button class="lz-chip" data-v="32">targetSdk 32 (BugBazaar)</button></div></div>' +
        '<pre class="lz-snippet"></pre>',
      wire: function (root, verdict) {
        var snip = root.querySelector(".lz-snippet");
        function paint() {
          snip.textContent = '<activity\n    android:name="' + nm + '">' + (state.filter
            ? '\n    <intent-filter>\n        <action android:name="android.intent.action.VIEW" />\n        <category android:name="android.intent.category.BROWSABLE" />\n        <data android:scheme="bugbazaar" />\n    </intent-filter>' : "") + "\n</activity>";
          var j = judge({ exported: "unset", filter: state.filter, targetSdk: state.targetSdk, perm: "none", cmd: cmdFor("A", nm) });
          verdict(j.why, j.state, j.cmd);
        }
        var fbtns = root.querySelectorAll('[data-t="filter"]');
        Array.prototype.forEach.call(fbtns, function (b, i) {
          b.onclick = function () {
            state.filter = i === 1;
            Array.prototype.forEach.call(fbtns, function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-g="sdk"] .lz-chip'), function (b) {
          b.onclick = function () {
            state.targetSdk = +b.dataset.v;
            Array.prototype.forEach.call(root.querySelectorAll('[data-g="sdk"] .lz-chip'), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        paint();
      }
    };
  };

  W.l4 = function () {
    var state = { perm: "none" };
    var p = parsed();
    var prov = p.comps.filter(function (c) { return c.type === "P" && c.authority && c.own; })[0] || { name: "com.BugBazaar.provider.UserProfileProvider", authority: "com.BugBazaar.UserProfile" };
    return {
      html: '<div class="lz-ctl"><span class="lz-k">guarded by</span><div class="lz-chips">' +
        ["none", "declared", "label"].map(function (k) {
          return '<button class="lz-chip' + (k === "none" ? " on" : "") + '" data-v="' + k + '">' + PERMS[k].label + "</button>";
        }).join("") + "</div></div>" +
        '<pre class="lz-snippet"></pre><div class="lz-note"></div>',
      wire: function (root, verdict) {
        var snip = root.querySelector(".lz-snippet"), note = root.querySelector(".lz-note");
        function paint() {
          var attr = state.perm === "none" ? "" : '\n    android:readPermission="' + PERMS[state.perm].label + '"';
          snip.textContent = '<provider\n    android:name="' + prov.name + '"\n    android:authorities="' + (prov.authority || "") + '"\n    android:exported="true"' + attr + " />";
          note.textContent = PERMS[state.perm].note || "";
          var j = judge({ exported: "true", filter: false, targetSdk: 32, perm: state.perm, cmd: cmdFor("P", { authority: prov.authority }) });
          verdict(j.why, j.state, j.cmd);
        }
        Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (b) {
          b.onclick = function () {
            state.perm = b.dataset.v;
            Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        paint();
      }
    };
  };

  W.l5 = function () {
    var auths = parsed().comps.filter(function (c) { return c.type === "P" && c.authority && c.own; }).slice(0, 3);
    if (!auths.length) auths = [{ name: "com.BugBazaar.provider.UserProfileProvider", authority: "com.BugBazaar.UserProfile", permission: "@string/app_name", open: true }];
    var paths = ["/addresses", "/contacts", "/profile"];
    var state = { a: 0, p: 0 };
    return {
      html: '<div class="lz-ctl"><span class="lz-k">authority</span><div class="lz-chips">' +
        auths.map(function (a, i) { return '<button class="lz-chip' + (i === 0 ? " on" : "") + '" data-a="' + i + '">' + esc(a.authority) + "</button>"; }).join("") +
        "</div></div>" +
        '<div class="lz-ctl"><span class="lz-k">path</span><div class="lz-chips">' +
        paths.map(function (p, i) { return '<button class="lz-chip' + (i === 0 ? " on" : "") + '" data-p="' + i + '">' + p + "</button>"; }).join("") +
        "</div></div>" +
        '<div class="lz-uri"></div><div class="lz-note">the path is whatever the provider implements - /addresses is the one this lab verified on the device</div>',
      wire: function (root, verdict) {
        var uri = root.querySelector(".lz-uri");
        function paint() {
          var a = auths[state.a], u = "content://" + a.authority + paths[state.p];
          uri.innerHTML = '<code>' + esc(u) + "</code>";
          var perm = a.permission === "@string/app_name" ? "label" : (a.permission ? "declared" : "none");
          var j = judge({ exported: "true", filter: false, targetSdk: 32, perm: perm, cmd: 'adb shell content query --uri ' + u });
          if (j.state === "locked") j.why = "Gated by " + a.permission + " - another app needs that permission granted to it.";
          if (j.state === "fake") j.why = "readPermission resolves to \"BugBazaar\", the app's own label. Nothing to be granted - the provider answers anyone.";
          verdict(j.why, j.state, j.cmd);
        }
        Array.prototype.forEach.call(root.querySelectorAll("[data-a]"), function (b) {
          b.onclick = function () {
            state.a = +b.dataset.a;
            Array.prototype.forEach.call(root.querySelectorAll("[data-a]"), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        Array.prototype.forEach.call(root.querySelectorAll("[data-p]"), function (b) {
          b.onclick = function () {
            state.p = +b.dataset.p;
            Array.prototype.forEach.call(root.querySelectorAll("[data-p]"), function (x) { x.classList.toggle("on", x === b); });
            paint();
          };
        });
        paint();
      }
    };
  };

  W.l6 = function () {
    var p = parsed();
    var libs = {};
    p.comps.forEach(function (c) {
      if (c.own) return;
      var k = c.name.indexOf("androidx.") === 0 ? "androidx" : c.name.indexOf("com.google.") === 0 ? "com.google" :
        c.name.indexOf("com.razorpay") === 0 ? "com.razorpay" : c.name.indexOf("com.evernote") === 0 ? "com.evernote" : "other";
      libs[k] = libs[k] || { n: 0, open: 0 };
      libs[k].n++; if (c.open) libs[k].open++;
    });
    var ownN = p.comps.filter(function (c) { return c.own; }).length;
    var ownOpen = p.comps.filter(function (c) { return c.own && c.open; }).length;
    var on = {};
    Object.keys(libs).forEach(function (k) { on[k] = false; });
    return {
      html: '<div class="lz-chips">' + Object.keys(libs).map(function (k) {
        return '<button class="lz-chip" data-l="' + k + '">+ ' + k + " (" + libs[k].n + ")</button>";
      }).join("") + "</div>" +
        '<div class="lz-counts"><span><b class="c-total">' + ownN + "</b>components</span>" +
        '<span><b class="c-open">' + ownOpen + "</b>reachable</span></div>",
      wire: function (root, verdict) {
        function paint() {
          var tot = ownN, op = ownOpen;
          Object.keys(libs).forEach(function (k) { if (on[k]) { tot += libs[k].n; op += libs[k].open; } });
          root.querySelector(".c-total").textContent = tot;
          root.querySelector(".c-open").textContent = op;
          verdict("Source declares " + ownN + "; the APK ships " + tot + " with " + op + " reachable. The difference is code you never wrote.", "info");
        }
        Array.prototype.forEach.call(root.querySelectorAll(".lz-chip"), function (b) {
          b.onclick = function () {
            on[b.dataset.l] = !on[b.dataset.l];
            b.classList.toggle("on", on[b.dataset.l]);
            paint();
          };
        });
        paint();
      }
    };
  };

  /* ------------------------------------------------------------------ shell */
  var idx = 0;

  function load() {
    try { var v = parseInt(localStorage.getItem(KEY) || "0", 10); return isNaN(v) ? 0 : Math.max(0, Math.min(5, v)); } catch (e) { return 0; }
  }
  function save() { try { localStorage.setItem(KEY, String(idx)); } catch (e) {} }

  function mount(pane) {
    var L = window.MANIFEST_LEARN || [];
    if (!L.length) return;
    pane.dataset.enh = "1";
    idx = load();
    pane.innerHTML = '<div class="lz-head"><span class="lz-k2">learn</span><div class="lz-dots">' +
      L.map(function (_, i) { return '<button class="lz-dot" data-i="' + i + '" aria-label="lesson ' + (i + 1) + '"></button>'; }).join("") +
      '</div><span class="lz-progress"></span></div><div class="lz-body"></div>';

    var body = pane.querySelector(".lz-body");
    var dots = pane.querySelectorAll(".lz-dot");
    var prog = pane.querySelector(".lz-progress");

    function verdict(msg, state, cmd) {
      var box = body.querySelector(".lz-verdict");
      if (!box) return;
      box.className = "lz-verdict st-" + state;
      box.innerHTML = '<div class="lz-state">' + esc(STATE_LABEL[state] || state) + "</div>" +
        '<div class="lz-why">' + esc(msg) + "</div>" +
        (state === "info" ? "" : (cmd ? '<pre class="lz-reach">' + esc(cmd) + "</pre>" : '<div class="lz-reach-none">no command reaches this</div>'));
    }

    function render() {
      var L2 = L[idx], w = W[L2.id] ? W[L2.id]() : { html: "", wire: function () {} };
      body.innerHTML =
        '<div class="lz-card">' +
          '<div class="lz-step">lesson ' + (idx + 1) + " of " + L.length + "</div>" +
          "<h2>" + esc(L2.title) + "</h2>" +
          '<p class="lz-idea">' + esc(L2.idea) + "</p>" +
          '<div class="lz-try"><span class="lz-k">your turn</span>' + esc(L2.try) + "</div>" +
          '<div class="lz-sandbox">' + w.html + "</div>" +
          '<div class="lz-verdict"></div>' +
          '<p class="lz-teach">' + esc(L2.teach) + "</p>" +
        "</div>" +
        '<div class="lz-nav">' +
          (idx > 0 ? '<button class="lz-btn" data-go="-1">back</button>' : "<span></span>") +
          (idx < L.length - 1
            ? '<button class="lz-btn go" data-go="1">next lesson \u2192</button>'
            : '<button class="lz-btn go" data-go="99">that is the model \u00b7 play the doors \u2192</button>') +
        "</div>";

      Array.prototype.forEach.call(dots, function (d, i) {
        d.classList.toggle("on", i === idx);
        d.classList.toggle("seen", i < idx);
      });
      prog.textContent = (idx + 1) + " / " + L.length;

      w.wire(body.querySelector(".lz-sandbox"), verdict);

      Array.prototype.forEach.call(body.querySelectorAll("[data-go]"), function (b) {
        b.onclick = function () {
          var d = +b.dataset.go;
          if (d === 99) {
            var t = document.querySelector('.tab[data-tab="doors"]');
            if (t) t.click();
            return;
          }
          idx = Math.max(0, Math.min(L.length - 1, idx + d));
          save(); render();
          pane.scrollIntoView({ block: "start", behavior: "smooth" });
        };
      });
    }

    Array.prototype.forEach.call(dots, function (d) {
      d.onclick = function () { idx = +d.dataset.i; save(); render(); };
    });

    render();
  }

  window.ManifestLearn = { mount: mount, reset: function () { idx = 0; save(); } };
})();
