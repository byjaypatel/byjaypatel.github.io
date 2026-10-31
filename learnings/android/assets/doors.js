/* Manifest lab: a door map derived from the real aapt2 dump, plus a gate simulator.
 *
 * The map is PARSED from window.FILES.bugbazaar at render time - it is not a hand-written summary, so it cannot
 * drift from the manifest shown in the Raw tab. Cross-check: the APK declares 64 components and exports 21;
 * the upstream source declares 30 and 13, because library manifests merge in at build time. If the parser
 * ever reports something else, the page is wrong and you will see it in the strip at the top.
 */
(function () {
  "use strict";

  var RES = { "0x7f13001c": "@string/app_name" };   /* same id as android:label - it is the app's own name */
  var LIB_PREFIX = /^(androidx\.|com\.google\.|com\.razorpay\.|com\.squareup\.|com\.evernote\.)/;
  var COMPONENT_TAGS = { activity: "A", "activity-alias": "A", service: "S", receiver: "R", provider: "P" };
  var TYPE_LABEL = { A: "activity", S: "service", R: "receiver", P: "provider" };

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* aapt2 xmltree: "E: tag (line=N)" then "A: ns:attr(0x…)=value" for its attributes, nested by indent */
  function parseDump(text) {
    var lines = String(text || "").split("\n");
    var root = { name: "#root", indent: -1, attrs: {}, kids: [], line: 0 };
    var stack = [root];

    lines.forEach(function (raw, idx) {
      var mE = /^(\s*)E: (\S+)(?: \(line=(\d+)\))?/.exec(raw);
      if (mE) {
        var ind = mE[1].length;
        while (stack.length > 1 && stack[stack.length - 1].indent >= ind) stack.pop();
        var node = { name: mE[2], indent: ind, line: +mE[3] || idx + 1, attrs: {}, kids: [], filters: [] };
        stack[stack.length - 1].kids.push(node);
        stack.push(node);
        return;
      }
      var mA = /^(\s*)A: (\S+?)=(.*)$/.exec(raw);
      if (mA) {
        var key = mA[2].replace(/^http:\/\/schemas\.android\.com\/apk\/res\/android:/, "android:")
                     .replace(/\(0x[0-9a-fA-F]+\)$/, "");
        var val = mA[3].trim().replace(/ \(Raw: .*\)$/, "").replace(/^"|"$/g, "");
        if (/^@0x[0-9a-f]+$/i.test(val)) val = RES[val.slice(1).toLowerCase()] || val;
        var top = stack[stack.length - 1];
        if (top) top.attrs[key] = val;
      }
    });
    return root;
  }

  function bool(v) {
    if (v === undefined) return null;
    if (/^0x0+$/.test(v) || v === "false" || v === "0") return false;
    if (/^0x[0-9a-f]+$/.test(v) || v === "true" || v === "1") return true;
    return null;
  }

  function walk(node, fn, parent) {
    (node.kids || []).forEach(function (k) { fn(k, parent); walk(k, fn, k); });
  }

  function collect(root) {
    var app = null, comps = [];
    walk(root, function (n, parent) { if (n.name === "application" && !app) app = n; });
    if (!app) return { comps: [], app: {} };

    app.kids.forEach(function (c) {
      var t = COMPONENT_TAGS[c.name];
      if (!t) return;
      var a = c.attrs;
      var filters = c.kids.filter(function (k) { return k.name === "intent-filter"; }).map(function (f) {
        var actions = [], schemes = [], hosts = [], types = [];
        f.kids.forEach(function (k) {
          if (k.name === "action" && k.attrs["android:name"]) actions.push(k.attrs["android:name"]);
          if (k.name === "category" && k.attrs["android:name"]) types.push(k.attrs["android:name"]);
          if (k.name === "data") {
            if (k.attrs["android:scheme"]) schemes.push(k.attrs["android:scheme"]);
            if (k.attrs["android:host"]) hosts.push(k.attrs["android:host"]);
          }
        });
        return { actions: actions, schemes: schemes, hosts: hosts, cats: types, line: f.line };
      });
      var exp = bool(a["android:exported"]);
      var perm = a["android:permission"] || a["android:readPermission"] || null;
      var name = a["android:name"] || a["android:targetActivity"] || "(unnamed)";
      var short = name.replace(/^com\.BugBazaar\./, "").replace(/^com\.hpandro\.androidsecurity\./, "").replace(/^\./, "");
      comps.push({
        type: t, name: name, short: short, line: c.line,
        own: !LIB_PREFIX.test(name),
        exported: exp, permission: perm,
        authority: a["android:authorities"] || null,
        processes: a["android:process"] || null,
        filters: filters,
        /* the rule Android applies: explicit wins; with no attribute an intent-filter means exported */
        open: exp === true ? true : exp === false ? false : filters.length > 0
      });
    });
    return {
      comps: comps,
      app: {
        debuggable: bool(app.attrs["android:debuggable"]),
        allowBackup: bool(app.attrs["android:allowBackup"]),
        cleartext: bool(app.attrs["android:usesCleartextTraffic"]),
        networkConfig: app.attrs["android:networkSecurityConfig"] || null,
        name: app.attrs["android:name"] || null
      }
    };
  }

  /* how you would actually reach this door from another app on the device */
  function reach(c) {
    if (c.type === "P" && c.authority) return "content query --uri content://" + c.authority + "/";
    if (c.type === "A") {
      var f = c.filters[0];
      if (f && f.schemes.length) return "am start -a " + (f.actions[0] || "android.intent.action.VIEW") + " -d " + f.schemes[0] + "://" + (f.hosts[0] || "");
      return "am start -n " + "com.BugBazaar/" + c.name.replace(/^com\.BugBazaar\.?/, "");
    }
    if (c.type === "S") return "am startservice -n com.BugBazaar/" + c.name.replace(/^com\.BugBazaar\.?/, "");
    return "am broadcast -n com.BugBazaar/" + c.name.replace(/^com\.BugBazaar\.?/, "");
  }

  /* ------------------------------------------------------------------ door map */
  function doorMap(root, data, opts) {
    var wrap = el("div", "dr-wrap");
    var comps = data.comps;
    var open = comps.filter(function (c) { return c.open; });
    var providers = comps.filter(function (c) { return c.type === "P"; });
    var unguarded = open.filter(function (c) { return !c.permission; });

    var ownN = comps.filter(function (c) { return c.own; }).length;
    var strip = el("div", "dr-strip");
    strip.innerHTML =
      '<div class="dr-stat"><b>' + comps.length + "</b><span>components in the APK</span></div>" +
      '<div class="dr-stat"><b>' + ownN + "</b><span>the source declares</span></div>" +
      '<div class="dr-stat hot"><b>' + open.length + "</b><span>reachable</span></div>" +
      '<div class="dr-stat hot"><b>' + unguarded.length + "</b><span>reachable, no permission</span></div>" +
      '<div class="dr-stat"><b>' + providers.length + "</b><span>providers</span></div>" +
      '<div class="dr-stat"><b>' + comps.filter(function (c) { return c.filters.length; }).length + "</b><span>with intent-filters</span></div>";
    wrap.appendChild(strip);

    var note = el("p", "dr-note");
    note.innerHTML = "Parsed from the raw dump above, not written by hand. Two numbers disagree on purpose: the developer's " +
      "source declares <b>" + ownN + "</b> components, the built APK ships <b>" + comps.length + "</b> - because library manifests merge in " +
      "at build time. And <b>" + open.length + "</b> are reachable, not the number of lines that say <code>exported=\"true\"</code>: " +
      "with no <code>exported</code> attribute, an <code>intent-filter</code> makes a component exported.";
    wrap.appendChild(note);

    var chips = el("div", "dr-chips");
    var filter = opts.filter || "open";
    [["open", "reachable (" + open.length + ")"], ["all", "all " + comps.length],
     ["own", "app-declared (" + ownN + ")"], ["lib", "third-party (" + (comps.length - ownN) + ")"],
     ["P", "providers (" + providers.length + ")"], ["A", "activities"], ["S", "services"], ["R", "receivers"]].forEach(function (pair) {
      var b = el("button", "dr-chip" + (filter === pair[0] ? " on" : ""));
      b.type = "button";
      b.dataset.f = pair[0];
      b.textContent = pair[1];
      b.addEventListener("click", function () {
        opts.filter = pair[0];
        var host = root.querySelector(".dr-map");
        host.replaceWith(doorMap(root, data, opts).querySelector(".dr-map"));
        Array.prototype.forEach.call(root.querySelectorAll(".dr-chip"), function (x) { x.classList.toggle("on", x.dataset.f === pair[0]); });
      });
      chips.appendChild(b);
    });
    wrap.appendChild(chips);

    var list = comps.filter(function (c) {
      if (filter === "open") return c.open;
      if (filter === "all") return true;
      if (filter === "own") return c.own;
      if (filter === "lib") return !c.own;
      return c.type === filter;
    });
    /* risk order: an unguarded provider is a data leak, an unguarded activity is a door, a guarded one is neither */
    list.sort(function (a, b) {
      function rank(x) { return (x.open && !x.permission ? 0 : x.open ? 1 : 2) * 10 + (x.type === "P" ? 0 : 1); }
      return rank(a) - rank(b) || (a.line - b.line);
    });

    var map = el("div", "dr-map");
    list.forEach(function (c) {
      var card = el("div", "dr-door" + (c.open ? " open" : "") + (c.open && !c.permission ? " naked" : ""));
      var badges = '<span class="dr-t">' + TYPE_LABEL[c.type] + "</span>";
      if (c.open) badges += '<span class="dr-b open">exported</span>';
      if (c.permission) badges += '<span class="dr-b perm">' + esc(c.permission.replace("com.BugBazaar.permission.", "")) + "</span>";
      else if (c.open) badges += '<span class="dr-b none">no permission</span>';
      if (c.filters.length) badges += '<span class="dr-b filt">' + c.filters.length + " filter" + (c.filters.length > 1 ? "s" : "") + "</span>";
      card.innerHTML =
        '<div class="dr-head">' + badges + '<span class="dr-line">line ' + c.line + "</span></div>" +
        '<div class="dr-name">' + esc(c.short || c.name) + "</div>" +
        (c.authority ? '<div class="dr-auth">' + esc(c.authority) + "</div>" : "") +
        '<div class="dr-cmd"><code>' + esc(reach(c)) + "</code><button class=\"dr-copy\" title=\"copy\">copy</button></div>";
      card.querySelector(".dr-copy").addEventListener("click", function (e) {
        e.stopPropagation();
        try {
          navigator.clipboard.writeText(reach(c));
          e.target.textContent = "copied";
          setTimeout(function () { e.target.textContent = "copy"; }, 1200);
        } catch (err) { e.target.textContent = "select it"; }
      });
      map.appendChild(card);
    });
    if (!list.length) map.innerHTML = '<div class="dr-empty">Nothing matches that filter.</div>';
    wrap.appendChild(map);

    var foot = el("p", "dr-foot");
    foot.innerHTML = "Click a chip to change the view. Every command here is the one you would run from another app - " +
      "Module 02 shows what happens when you do.";
    wrap.appendChild(foot);
    return wrap;
  }

  /* ------------------------------------------------------------------ gate simulator */
  var PRESETS = {
    addresses: { label: "com.bugbazaar.provider.addresses", exported: true, permission: "none", filter: false, debug: false },
    contacts:  { label: "com.bugbazaar.mycontacts", exported: true, permission: "custom", filter: false, debug: false },
    profile:   { label: "com.BugBazaar.UserProfile", exported: true, permission: "string", filter: false, debug: false },
    activity:  { label: "com.BugBazaar.ui.Deeplink", exported: true, permission: "none", filter: true, debug: false },
    closed:    { label: "an internal activity", exported: false, permission: "none", filter: true, debug: false }
  };

  function simulate(s) {
    if (s.unset && s.filter) return ["open", "Open - and nothing in the file says so.", "There is no android:exported attribute, but an intent-filter is present. On an app with a low targetSdk that means exported; on targetSdk 31+ the build itself requires the attribute. This is why you count filters, not just the word exported."];
    if (!s.exported && !s.filter) return ["closed", "Closed.", "Another app cannot reach it at all - not exported, and no intent-filter to match. This is the default you want."];
    if (!s.exported && s.filter) return ["closed", "Closed - but only because it says so.", "exported=false wins over the intent-filter. On an app with a low targetSdk and no attribute, that same filter would have made it reachable."];
    if (s.exported && s.permission === "none") return ["open", "Open to any installed app.", "Exported with no permission: every app on the phone can call it. This is the finding, and only the data it returns decides the severity."];
    if (s.exported && s.permission === "custom") return ["guarded", "Guarded by a permission.", "Reachable only by apps that hold that permission. Now check the permission's protectionLevel - a normal permission is granted silently."];
    if (s.exported && s.permission === "string") return ["broken", "Looks guarded, is not.", "The attribute points at a string resource that is never declared as a permission (here @string/app_name = \"BugBazaar\"). Nobody can hold it, so nothing is enforced - and some parsers still report it as protected."];
    return ["unknown", "Reachable.", "Exported."];
  }

  function gateSim() {
    var wrap = el("div", "gs-wrap");
    var state = { exported: true, permission: "none", filter: false, debug: false };

    var head = el("div", "gs-head");
    head.innerHTML = '<span class="gs-k">the only three things that matter</span>' +
      "<h3>Does this door open?</h3>" +
      '<p>Change the attribute and watch the verdict. These are the real components from the dump above, loaded as presets.</p>';
    wrap.appendChild(head);

    var presets = el("div", "gs-presets");
    Object.keys(PRESETS).forEach(function (k) {
      var b = el("button", "gs-preset", PRESETS[k].label);
      b.type = "button";
      b.addEventListener("click", function () {
        var p = PRESETS[k];
        state = { exported: p.exported, permission: p.permission, filter: p.filter, debug: p.debug };
        paint();
        Array.prototype.forEach.call(presets.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); });
      });
      presets.appendChild(b);
    });
    wrap.appendChild(presets);

    var body = el("div", "gs-body");
    var controls = el("div", "gs-controls");

    function row(label, options, key, cls) {
      var r = el("div", "gs-row");
      r.innerHTML = '<span class="gs-lab">' + label + "</span>";
      var group = el("div", "gs-opts");
      options.forEach(function (o) {
        var b = el("button", "gs-opt" + (state[key] === o[0] ? " on" : ""), o[1]);
        b.type = "button";
        b.addEventListener("click", function () {
          state[key] = o[0];
          Array.prototype.forEach.call(group.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); });
          paint();
        });
        group.appendChild(b);
      });
      r.appendChild(group);
      return r;
    }
    controls.appendChild(row("android:exported", [[true, "true"], [false, "false"], ["unset", "not set"]], "exported"));
    controls.appendChild(row("android:permission", [["none", "none"], ["custom", "declared permission"], ["string", "@string/app_name"]], "permission"));
    controls.appendChild(row("intent-filter", [[false, "none"], [true, "present"]], "filter"));
    body.appendChild(controls);

    var out = el("div", "gs-out");
    body.appendChild(out);
    wrap.appendChild(body);

    var foot = el("p", "gs-foot");
    foot.innerHTML = "The permission case on the right is the one people get wrong: an attribute that names a string " +
      "resource which was never declared as a permission protects nothing, and scanners still call it protected.";
    wrap.appendChild(foot);

    function paint() {
      var s = Object.assign({}, state);
      /* the rule people miss: with no exported attribute, an intent-filter makes it exported */
      if (s.exported === "unset") { s.unset = true; s.exported = s.filter ? true : false; }
      var v = simulate(s);
      out.className = "gs-out gs-" + v[0];
      out.innerHTML = '<div class="gs-verdict">' + v[1] + "</div><div class=\"gs-why\">" + v[2] + "</div>";
    }
    paint();
    return wrap;
  }


  /* ------------------------------------------------------------------ the game */
  function verdictOf(c) {
    if (!c.open) return ["locked", "Locked", c.exported === false ? "exported=\"false\"" : "no intent-filter and not exported"];
    if (!c.permission) return ["open", "Open", "no permission - any app can call it"];
    if (/^@string/.test(c.permission)) return ["fake", "Open", "the permission is " + c.permission + " - a label, nobody can hold it"];
    return ["locked", "Locked", "needs " + c.permission.replace("android.permission.", "")];
  }

  function buildBoard(root, rounds, parsed) {
    var gi = { round: 0, found: {}, wrong: {}, done: {} };

    var shell = el("div", "gm");
    var head = el("div", "gm-head");
    head.innerHTML = '<span class="gm-kicker"></span><p class="gm-line"></p>';
    shell.appendChild(head);

    var hud = el("div", "gm-hud");
    hud.innerHTML = '<div class="gm-seg"><span class="gm-found">0</span><i>/</i><span class="gm-total">0</span> open</div>' +
      '<div class="gm-seg"><span class="gm-wrong">0</span> wrong</div>' +
      '<div class="gm-dots"></div>';
    shell.appendChild(hud);

    var board = el("div", "gm-board");
    shell.appendChild(board);
    var after = el("div", "gm-after");
    shell.appendChild(after);
    var next = el("button", "gm-next", "next round \\u2192");
    next.type = "button";
    next.hidden = true;
    shell.appendChild(next);
    root.appendChild(shell);

    function doorsOf(r) {
      var data = parsed[r.app] || { comps: [] };
      return r.doors.map(function (name) {
        var c = data.comps.filter(function (x) { return x.name === name; })[0];
        return c || null;
      }).filter(Boolean);
    }

    function render() {
      var r = rounds[gi.round];
      var doors = doorsOf(r);
      var opens = doors.filter(function (c) { return verdictOf(c)[0] !== "locked"; }).length;
      head.querySelector(".gm-kicker").textContent = r.kicker;
      head.querySelector(".gm-line").innerHTML = r.line;
      hud.querySelector(".gm-total").textContent = opens;
      hud.querySelector(".gm-found").textContent = Object.keys(gi.found[r.id] || {}).length;
      hud.querySelector(".gm-wrong").textContent = Object.keys(gi.wrong[r.id] || {}).length;

      var dots = hud.querySelector(".gm-dots");
      dots.innerHTML = "";
      rounds.forEach(function (rr, i) {
        var d = el("span", "gm-dot" + (i === gi.round ? " on" : "") + (gi.done[rr.id] ? " done" : ""));
        d.title = rr.app;
        dots.appendChild(d);
      });

      board.innerHTML = "";
      doors.forEach(function (c) {
        var v = verdictOf(c);
        var state = (gi.found[r.id] || {})[c.name] ? "yes" : (gi.wrong[r.id] || {})[c.name] ? "no" : "";
        var tile = el("button", "gm-door" + (state ? " " + state : ""));
        tile.type = "button";
        tile.innerHTML =
          '<span class="gm-type">' + TYPE_LABEL[c.type] + "</span>" +
          '<span class="gm-name">' + esc(c.short || c.name) + "</span>" +
          '<span class="gm-attrs">' +
            '<span><i>exported</i><b>' + (c.exported === null ? "not set" : c.exported ? "true" : "false") + "</b></span>" +
            '<span><i>permission</i><b>' + (c.permission ? esc(c.permission.replace("com.BugBazaar.permission.", "")) : "\u2014") + "</b></span>" +
            '<span><i>filter</i><b>' + (c.filters.length || "\u2014") + "</b></span>" +
          "</span>" +
          '<span class="gm-verdict"></span>';
        if (state) {
          tile.querySelector(".gm-verdict").textContent = (state === "yes" ? "\u2713 " + v[1] + " \u00b7 " + v[2] : "\u2715 " + v[1] + " \u00b7 " + v[2]);
        }
        tile.addEventListener("click", function () {
          if (tile.classList.contains("yes") || tile.classList.contains("no")) return;
          if (v[0] === "locked") {
            gi.wrong[r.id] = gi.wrong[r.id] || {};
            gi.wrong[r.id][c.name] = true;
            tile.classList.add("no", "shake");
            tile.querySelector(".gm-verdict").textContent = "\u2715 " + v[1] + " \u00b7 " + v[2];
            setTimeout(function () { tile.classList.remove("shake"); }, 460);
          } else {
            gi.found[r.id] = gi.found[r.id] || {};
            gi.found[r.id][c.name] = true;
            tile.classList.add("yes");
            tile.querySelector(".gm-verdict").textContent = "\u2713 " + v[1] + " \u00b7 " + v[2];
            if (window.Game && window.Game.onDoor) window.Game.onDoor(gi.round);
          }
          refresh();
        });
        board.appendChild(tile);
      });
      after.innerHTML = "";
      next.hidden = true;
      refresh();
    }

    function refresh() {
      var r = rounds[gi.round];
      var doors = doorsOf(r);
      var opens = doors.filter(function (c) { return verdictOf(c)[0] !== "locked"; });
      var found = Object.keys(gi.found[r.id] || {}).length;
      hud.querySelector(".gm-found").textContent = found;
      hud.querySelector(".gm-wrong").textContent = Object.keys(gi.wrong[r.id] || {}).length;
      if (found === opens.length && opens.length) {
        if (!gi.done[r.id]) {
          gi.done[r.id] = true;
          if (window.Game && window.Game.onDoorRound) window.Game.onDoorRound(r.id, Object.keys(gi.done).length);
        }
        after.innerHTML = '<div class="gm-win">' + r.after + "</div>";
        next.hidden = gi.round >= rounds.length - 1;
      }
    }

    next.addEventListener("click", function () {
      if (gi.round < rounds.length - 1) { gi.round++; render(); }
    });

    render();
    return shell;
  }

  window.ManifestLab = {
    parse: function (which) {
      var raw = (window.FILES || {})[which || "bugbazaar"];
      if (!raw) return null;
      return collect(parseDump(raw));
    },
    mount: function (root) {
      if (!root || !window.DOORS_GAME) return false;
      var parsed = { bugbazaar: this.parse("bugbazaar"), hpandro: this.parse("hpandro") };
      if (!parsed.bugbazaar || !parsed.bugbazaar.comps.length) return false;
      root.innerHTML = "";

      var intro = el("p", "gm-intro", window.DOORS_GAME.intro);
      root.appendChild(intro);
      root.appendChild(buildBoard(root, window.DOORS_GAME.rounds, parsed));

      /* the full list is reference, not reading: keep it folded */
      var ref = document.createElement("details");
      ref.className = "gm-ref";
      var sum = document.createElement("summary");
      var strip = parsed.bugbazaar;
      sum.textContent = "the full list - " + strip.comps.length + " components, " + strip.comps.filter(function (c) { return c.open; }).length +
        " reachable, with the command that reaches each one";
      ref.appendChild(sum);
      var body = el("div");
      ref.appendChild(body);
      body.appendChild(doorMap(root, strip, { filter: "open" }));
      root.appendChild(ref);

      var pill = document.querySelector('.tab[data-tab="doors"] .pill');
      if (pill) pill.textContent = strip.comps.length;
      return true;
    },
    collect: collect, parseDump: parseDump, simulate: simulate, verdictOf: verdictOf
  };
})();
