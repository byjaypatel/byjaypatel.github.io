/* Renders the prerequisites: a checklist you tick, install commands for whatever you have not installed, and a
 * per-module strip derived from the tools that module's own commands invoke.
 *
 * Nothing here executes anything. Commands are text with a copy button; the only state stored is which tick boxes
 * you said you already have (localStorage, key `asw-have`).
 */
(function () {
  "use strict";
  var KEY = "asw-have";

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function have() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }
  function setHave(id, v) {
    var h = have(); h[id] = !!v;
    try { localStorage.setItem(KEY, JSON.stringify(h)); } catch (e) {}
  }

  function os() {
    var p = (navigator.platform || "") + " " + (navigator.userAgent || "");
    if (/Mac/i.test(p)) return "mac";
    if (/Win/i.test(p)) return "win";
    return "linux";
  }

  /* which tools a module's own commands actually need - read from MODULES, so it cannot fall behind */
  var TOKENS = {
    adb: ["adb"], apktool: ["apktool"], jadx: ["jadx", "jadx-gui"], buildtools: ["apksigner", "zipalign", "aapt2", "aapt"],
    java: ["java", "keytool"], frida: ["frida", "frida-ps"], "frida-server": ["frida-server"],
    openssl: ["openssl"], tcpdump: ["tcpdump"], sqlite: ["sqlite3"], docker: ["docker"], mobsf: ["mobsf"],
    burp: ["burp"], wireshark: ["tshark", "wireshark"], zap: ["zap"], emulator: ["emulator"], sdk: ["sdkmanager"]
  };

  function toolsForModule(mid) {
    var mod = (window.MODULES || []).filter(function (m) { return m.id === mid; })[0];
    if (!mod) return [];
    var text = (mod.steps || []).map(function (s) { return s.cmd || ""; }).join("\n")
      .split("\n").filter(function (l) { return l.trim().indexOf("#") !== 0; }).join("\n");
    var P = (window.PREREQS || {}).tools || [];
    var want = [];
    /* tools whose GUI never appears in a command (burp, zap) are placed by hand in their `mods` list;
       everything else is read out of the module's own commands so it cannot fall behind */
    P.forEach(function (t) { if ((t.mods || []).indexOf(mid) !== -1) want.push(t.id); });
    Object.keys(TOKENS).forEach(function (id) {
      if (want.indexOf(id) !== -1) return;
      for (var i = 0; i < TOKENS[id].length; i++) {
        var t = TOKENS[id][i];
        /* punctuation-tolerant: opensecurity/mobile-security-framework-mobsf:latest must match "mobsf" */
        if (new RegExp("(?<![\\w])" + t.replace(/-/g, "\\-") + "(?![\\w])").test(text)) { want.push(id); return; }
      }
    });
    return want.filter(function (id) { return P.some(function (p) { return p.id === id; }); });
  }

  function cmdBlock(lines, label) {
    var wrap = el("div", "pq-cmdwrap");
    wrap.innerHTML = '<div class="pq-cmds">' + lines.map(function (l) {
      return '<div class="pq-line"><code>' + esc(l) + "</code></div>";
    }).join("") + "</div>" +
      '<button class="pq-copy" type="button">copy ' + esc(label) + "</button>";
    wrap.querySelector(".pq-copy").onclick = function (e) {
      var text = lines.join("\n"), btn = e.target;
      function done(okay) {
        btn.textContent = okay ? "copied" : "select + copy";
        if (window.Announce) window.Announce(okay ? "command copied" : "the browser blocked the clipboard - select the command and copy it");
        setTimeout(function () { btn.textContent = "copy " + label; }, 1300);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    };
    return wrap;
  }

  function toolCard(t, defaultOS, forceOpen) {
    var h = have()[t.id];
    var card = el("div", "pq-card" + (h ? " have" : ""));
    var tab = defaultOS;
    card.innerHTML =
      '<div class="pq-top">' +
        '<button class="pq-tick' + (h ? " on" : "") + '" type="button" aria-label="I have this">' + (h ? "\u2713" : "") + "</button>" +
        '<div class="pq-id"><b>' + esc(t.name) + "</b>" +
          '<span class="pq-why">' + esc(t.why) + "</span></div>" +
        '<code class="pq-check">' + esc(t.check) + "</code>" +
      "</div>" +
      '<div class="pq-body"' + (h && !forceOpen ? " hidden" : "") + ">" +
        '<div class="pq-os"><button data-o="mac" type="button">macOS</button>' +
          '<button data-o="linux" type="button">Ubuntu / Debian</button>' +
          '<button data-o="win" type="button">Windows</button></div>' +
        '<div class="pq-slot"></div>' +
        '<div class="pq-ev">verified ' + esc((window.PREREQS || {}).verifiedOn || "") + " \u00b7 " + esc(t.ev) + "</div>" +
        (t.link ? '<a class="pq-link" href="' + esc(t.link.url) + '" target="_blank" rel="noopener">' + esc(t.link.label) + " \u2197</a>" : "") +
      "</div>";

    var body = card.querySelector(".pq-body"), slot = card.querySelector(".pq-slot");
    function paint() {
      Array.prototype.forEach.call(card.querySelectorAll("[data-o]"), function (b) { b.classList.toggle("on", b.dataset.o === tab); });
      slot.innerHTML = "";
      var lines = t[tab];
      if (!lines || !lines.length) { slot.innerHTML = '<div class="pq-ev">no path recorded for this platform</div>'; return; }
      slot.appendChild(cmdBlock(lines, tab === "linux" ? "linux" : tab));
    }
    Array.prototype.forEach.call(card.querySelectorAll("[data-o]"), function (b) {
      b.onclick = function () { tab = b.dataset.o; paint(); };
    });
    card.querySelector(".pq-tick").onclick = function (e) {
      var on = !e.target.classList.contains("on");
      setHave(t.id, on);
      e.target.classList.toggle("on", on);
      e.target.textContent = on ? "\u2713" : "";
      card.classList.toggle("have", on);
      body.hidden = on;
      if (window.Prereqs && window.Prereqs.sync) window.Prereqs.sync();
    };
    paint();
    return card;
  }

  /* the big checklist on #/check */
  function mountCheck(host) {
    var P = window.PREREQS || { tools: [] };
    var h = have();
    var missing = P.tools.filter(function (t) { return !h[t.id]; });
    host.innerHTML = "";

    var head = el("div", "pq-head");
    head.innerHTML =
      '<div class="pq-head-k">step 0</div>' +
      "<h3>Install what you are missing</h3>" +
      '<p>Tick what you already have. Everything unticked shows its install command for your OS. ' +
      'These are the only tools the 51 steps invoke - each command below was checked against ' +
      (os() === "mac" ? "Homebrew" : "the Ubuntu 24.04 repository") + " on " + esc(P.verifiedOn) + '.</p>' +
      '<div class="pq-count"><b>' + (P.tools.length - missing.length) + "</b> of " + P.tools.length + " installed</div>";
    host.appendChild(head);

    var list = el("div", "pq-list");
    P.tools.forEach(function (t) { list.appendChild(toolCard(t, os(), false)); });
    host.appendChild(list);

    var foot = el("div", "pq-foot");
    foot.innerHTML = "Nothing on this page runs anything. Commands are text you copy into your own terminal - " +
      "the guide has no network access and no way to execute them.";
    host.appendChild(foot);
  }

  /* the strip at the top of a module */
  function moduleStrip(mid) {
    var ids = toolsForModule(mid);
    if (!ids.length) return null;
    var P = (window.PREREQS || {}).tools;
    var h = have();
    var tools = ids.map(function (id) { return P.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean);
    var short = tools.filter(function (t) { return !h[t.id]; });

    var box = el("details", "pq-strip" + (short.length ? " needs" : ""));
    var sum = document.createElement("summary");
    sum.innerHTML = '<span class="pq-strip-k">before this module</span>' +
      '<span class="pq-strip-t">' + tools.map(function (t) {
        return '<code class="' + (h[t.id] ? "" : "miss") + '">' + esc(t.id) + "</code>";
      }).join("") + "</span>" +
      '<span class="pq-strip-n">' + (short.length ? short.length + " to install" : "all set") + "</span>";
    box.appendChild(sum);

    var body = el("div", "pq-strip-body");
    body.innerHTML = '<p class="pq-strip-p">Read from this module\u2019s own commands, so it cannot be out of date. ' +
      'Unticked items are the ones you have not marked as installed.</p>';
    tools.forEach(function (t) { body.appendChild(toolCard(t, os(), false)); });
    var go = el("a", "pq-golink", "the full checklist \u2192");
    go.href = "#/check";
    body.appendChild(go);
    box.appendChild(body);
    if (short.length) box.open = false;
    return box;
  }

  window.Prereqs = {
    mountCheck: mountCheck,
    moduleStrip: moduleStrip,
    toolsForModule: toolsForModule,
    count: function () { return ((window.PREREQS || {}).tools || []).length; },
    missing: function () {
      var h = have();
      return ((window.PREREQS || {}).tools || []).filter(function (t) { return !h[t.id]; }).map(function (t) { return t.id; });
    },
    sync: function () {
      var host = document.getElementById("pq-host");
      if (host && host.dataset.mounted) mountCheck(host);
    }
  };
})();
