/* Readiness check: grades the transcript that readiness.sh printed.
 *
 * The browser cannot talk to adb, so this page never pretends to probe the device - it parses what the student's
 * own machine reported. Every verdict is therefore about the paste, which is the honest thing to grade.
 */
(function () {
  "use strict";

  var SCRIPT = [
    "sh readiness.sh > my-setup.txt",
    "# then open my-setup.txt in any editor and paste it into the box below"
  ];

  /* one rule per key. level decides what the verdict means:
       fail - the module this belongs to cannot start
       warn - works, but it will cost you time later
       pass - nothing to do                                                             */
  var RULES = [
    { key: "adb", need: "m0", test: function (v) {
        var m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
        if (!m) return ["fail", "adb is not on your PATH. Install platform-tools and put it on PATH; every lab step starts with adb."];
        var n = +m[1] * 10000 + +m[2] * 100 + +m[3];
        if (n < 10040) return ["warn", "adb " + v + " is old. 1.0.40 or newer behaves with Android 12+; older versions fail on wireless debugging."];
        return ["pass", "adb " + v];
      } },
    { key: "apktool", need: "m5", test: function (v) {
        if (v === "missing" || !v) return ["fail", "apktool is missing. You need it in Module 05 to decode and rebuild the APK."];
        return ["pass", "apktool " + v];
      } },
    { key: "jadx", need: "m1", test: function (v) {
        if (v === "missing" || !v) return ["fail", "jadx is missing. Module 01 reads the app in Java before confirming names in smali."];
        return ["pass", "jadx " + v];
      } },
    { key: "apksigner", need: "m5", test: function (v) {
        if (v === "missing" || !v) return ["warn", "apksigner not found. It ships in build-tools, not platform-tools - add build-tools/<version> to PATH. Module 05 cannot sign without it."];
        return ["pass", "apksigner " + v];
      } },
    { key: "java", need: "m5", test: function (v) {
        if (v === "missing" || !v) return ["warn", "No java on PATH. apksigner and jadx both need a JRE 11 or newer."];
        var maj = parseInt(v.split(".")[0], 10);
        if (v.indexOf("1.") === 0) maj = parseInt(v.split(".")[1], 10);
        if (maj < 11) return ["warn", "Java " + v + " is older than 11. apksigner 0.9 and jadx 1.5 expect 11+."];
        return ["pass", "java " + v];
      } },
    { key: "devices", need: "m0", test: function (v, all) {
        var list = (v || "").split(";").map(function (s) { return s.trim(); }).filter(Boolean);
        if (!list.length) return ["fail", "No device. Plug the phone in with USB debugging on, or adb connect <ip>:5555 - nothing in this workshop runs without one."];
        var emu = list.filter(function (l) { return /^emulator-/.test(l); });
        var unauth = list.filter(function (l) { return /unauthorized/.test(l); });
        var off = list.filter(function (l) { return /offline/.test(l); });
        var ready = list.filter(function (l) { return /\sdevice$/.test(l); });
        if (unauth.length) return ["fail", "Device shows 'unauthorized'. Unlock the phone and accept the RSA fingerprint prompt; if it never appears, revoke USB debugging authorizations and replug."];
        if (off.length) return ["fail", "Device shows 'offline'. adb kill-server, replug, then adb devices again. A listener already holding the port (Burp on 5555) causes exactly this - see When it breaks."];
        var phys = ready.filter(function (l) { return !/^emulator-/.test(l); });
        if (emu.length && phys.length) return ["warn", "An emulator is attached next to " + phys.length + " physical device(s). Stop it unless you need it - two devices means every command needs -s, and a stale emulator entry is what makes adb answer the wrong one."];
        if (emu.length && !phys.length) return ["warn", "Only an emulator is attached. The labs were recorded on a physical device; emulator networking and the CA store differ. Use it if you must, but stop it when done."];
        if (!ready.length) return ["fail", "No device in 'device' state. adb devices must list one entry ending in 'device'."];
        if (ready.length > 1) return ["warn", ready.length + " devices attached. Every adb command now needs -s <serial> or you will address the wrong one."];
        return ["pass", ready[0]];
      } },
    { key: "sdk", need: "m0", test: function (v, all) {
        var n = parseInt(v, 10);
        if (!n) return ["fail", "Could not read the API level. Is the device still in 'device' state?"];
        if (n < 29) return ["warn", "API " + n + " is older than the workshop assumes (29+). Most labs still run; the Android 11+ storage paths differ."];
        if (n >= 35) return ["warn", "API " + n + " (Android 15/16). Native hooks work, but Frida's Java hooks die on this build - that is a tooling limit, not the app's anti-tampering. Module 03 says what to do."];
        return ["pass", "API " + n];
      } },
    { key: "apps", need: "m0", test: function (v) {
        var bz = /BugBazaar=(\d+)/.exec(v || ""), hp = /hpAndro=(\d+)/.exec(v || "");
        var b = bz ? +bz[1] : 0, h = hp ? +hp[1] : 0;
        if (b && h) return ["pass", "both lab apps installed"];
        if (!b && !h) return ["fail", "Neither lab app is installed. adb install lab-apps/BugBazaar_v1.2.1.apk and lab-apps/hpAndro_1.3.apk."];
        return ["fail", (b ? "hpAndro" : "BugBazaar") + " is missing. Install it from lab-apps/ before Module 00 step 4."];
      } },
    { key: "proxy", need: "m4", test: function (v) {
        if (!v || v === "none" || v === "null") return ["warn", "No HTTP proxy set on the device. Module 04 needs it: settings put global http_proxy <laptop-ip>:8080."];
        if (/^0\.0\.0\.0/.test(v)) return ["warn", "Proxy set to 0.0.0.0 - the device will talk to itself. Use your laptop's LAN address."];
        if (!/:\d+$/.test(v)) return ["warn", "Proxy value '" + v + "' has no port. It must be ip:port."];
        return ["pass", v];
      } },
    { key: "frida", need: "m3", test: function (v) {
        if (!v || v === "absent") return ["warn", "frida-server is not running. Module 03 needs it: push the server, chmod 755, start it as root, then adb forward tcp:27042 tcp:27042."];
        return ["pass", "frida-server running"];
      } },
    { key: "forward", need: "m3", test: function (v) {
        var s = v || "";
        if (s.indexOf("27042") === -1) return ["warn", "No tcp:27042 forward. adb forward tcp:27042 tcp:27042, or the client cannot reach the server."];
        if (s.indexOf("4455") !== -1) return ["warn", "A stale tcp:4455 forward is still there. adb forward --remove tcp:4455 - left behind it becomes a phantom emulator entry."];
        return ["pass", s.trim()];
      } }
  ];

  function parse(text) {
    var out = {};
    (text || "").split(/\r?\n/).forEach(function (line) {
      var m = /^\s*ASW\s+([a-z_]+):\s*(.*)$/i.exec(line);
      if (m) out[m[1].toLowerCase()] = m[2].trim();
    });
    return out;
  }

  function grade(text) {
    var got = parse(text);
    if (!Object.keys(got).length) return { ok: false, rows: [], why: "That does not look like a readiness transcript - no lines beginning with 'ASW '. Run sh readiness.sh and paste the whole file." };
    var rows = RULES.map(function (r) {
      var v = got[r.key];
      if (v === undefined) return { key: r.key, need: r.need, level: "warn", raw: "(not in the transcript)", msg: "Your script did not report " + r.key + ". Use the shipped readiness.sh - a hand-edited transcript cannot be graded." };
      var res = r.test(v, got);
      return { key: r.key, need: r.need, level: res[0], raw: v, msg: res[1] };
    });
    var fail = rows.filter(function (r) { return r.level === "fail"; }).length;
    var warn = rows.filter(function (r) { return r.level === "warn"; }).length;
    return { ok: true, rows: rows, fail: fail, warn: warn, stamp: got.generated || "", model: got.model || "", serial: got.serial || "" };
  }

  window.Readiness = { grade: grade, rules: RULES, script: SCRIPT };
})();
