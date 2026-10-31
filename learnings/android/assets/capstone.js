/* Capstone page + readiness page renderers. Both are self-contained views called from app.js. */
(function () {
  "use strict";

  function el(t, c, txt) { var n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function norm(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/^["'`\s]+|["'`\s]+$/g, "").replace(/\/+$/, "");
  }
  function sha256(s) {
    if (window.crypto && window.crypto.subtle && window.isSecureContext !== false) {
      return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      }).catch(function () { return fallback(s); });
    }
    return Promise.resolve(fallback(s));
  }
  /* file:// pages are not a secure context in some builds, so keep a pure-JS SHA-256 for them */
  function fallback(msg) {
    function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
    var K = [], H = [], i, j;
    var primes = [], n = 2;
    while (primes.length < 64) { var p = true; for (var d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; } if (p) primes.push(n); n++; }
    for (i = 0; i < 64; i++) K[i] = (Math.pow(primes[i], 1 / 3) % 1 * 0x100000000) | 0;
    for (i = 0; i < 8; i++) H[i] = (Math.pow(primes[i], 1 / 2) % 1 * 0x100000000) | 0;
    var bytes = new TextEncoder().encode(msg);
    var l = bytes.length, withOne = l + 1, pad = (56 - (withOne % 64) + 64) % 64;
    var buf = new Uint8Array(withOne + pad + 8);
    buf.set(bytes); buf[l] = 0x80;
    var bits = l * 8, dv = new DataView(buf.buffer);
    dv.setUint32(buf.length - 4, bits >>> 0); dv.setUint32(buf.length - 8, Math.floor(bits / 4294967296));
    var w = new Int32Array(64);
    for (i = 0; i < buf.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = dv.getInt32(i + j * 4);
      for (j = 16; j < 64; j++) {
        var s0 = ror(w[j - 15], 7) ^ ror(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = ror(w[j - 2], 17) ^ ror(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d2 = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d2 + t1) | 0; d2 = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d2) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return (x >>> 0).toString(16).padStart(8, "0"); }).join("");
  }

  /* ------------------------------------------------------------------ capstone */
  function viewCapstone(root) {
    var C = window.CAPSTONE || { flags: [] };
    var st = (window.Game && window.Game.capState) ? window.Game.capState() : { solved: {}, hints: {} };
    root.innerHTML = "";

    var h = el("div", "cap-hero");
    var solvedN = C.flags.filter(function (f) { return st.solved[f.id]; }).length;
    h.innerHTML =
      '<div class="cap-k">capstone</div>' +
      '<h2>Six flags</h2>' +
      '<p class="cap-intro">' + esc(C.intro) + "</p>" +
      '<div class="cap-score"><b>' + solvedN + "</b> / " + C.flags.length + " found" +
      (solvedN === C.flags.length ? '<span class="cap-win">' + esc(C.done) + "</span>" : "") + "</div>";
    root.appendChild(h);

    var list = el("div", "cap-list");
    C.flags.forEach(function (f, i) {
      var solved = !!st.solved[f.id];
      var hintsUsed = st.hints[f.id] || 0;
      var card = el("div", "cap-card" + (solved ? " solved" : ""));
      card.dataset.cap = f.id;
      card.innerHTML =
        '<div class="cap-head"><span class="cap-n">' + (i + 1) + "</span>" +
        '<span class="cap-lab">' + esc(f.label) + "</span>" +
        '<span class="cap-mod">' + esc((f.mod || "").toUpperCase()) + "</span>" +
        (solved ? '<span class="cap-ok">found +25 xp</span>' : "") + "</div>" +
        '<div class="cap-ask">' + esc(f.ask) + "</div>";
      if (!solved) {
        var form = el("div", "cap-form");
        var inp = el("input", "cap-in");
        inp.dataset.cap = f.id;
        inp.type = "text";
        inp.placeholder = "your answer";
        inp.setAttribute("autocomplete", "off");
        inp.spellcheck = false;
        var btn = el("button", "cap-go", "submit");
        btn.dataset.cap = f.id;
        btn.type = "button";
        var fb = el("div", "cap-fb");
        var hintBox = el("div", "cap-hints");
        var hintBtn = el("button", "cap-hint", hintsUsed ? "another hint (-" + [5, 10, 15][Math.min(hintsUsed, 2)] + " xp)" : "hint (-5 xp)");
        hintBtn.type = "button";
        hintBtn.disabled = hintsUsed >= 3;

        function submit() {
          var v = norm(inp.value);
          if (!v) { inp.focus(); return; }
          sha256(v).then(function (digest) {
            if (digest === f.hash) {
              window.Game.capSolve(f.id, solvedN);
              fb.className = "cap-fb ok";
              fb.textContent = "Correct. " + f.why;
              inp.disabled = true; btn.disabled = true; hintBtn.disabled = true;
              card.classList.add("solved");
              /* live counter - a re-render would throw away whatever is typed in the other five boxes */
              var sc = root.querySelector(".cap-score b");
              var now = sc ? (+sc.textContent || 0) + 1 : 0;
              if (sc) sc.textContent = String(now);
              if (now === C.flags.length) {
                var win = el("span", "cap-win", C.done);
                root.querySelector(".cap-score").appendChild(win);
              }
              if (window.Motion && window.Motion.on() && window.Motion.pop) window.Motion.pop(card);
            } else {
              fb.className = "cap-fb no";
              fb.textContent = "Not it. Check the exact string - no extra words, no quotes, no units.";
              if (window.Motion && window.Motion.on() && window.Motion.shake) window.Motion.shake(card);
            }
          });
        }
        btn.addEventListener("click", submit);
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });

        hintBtn.addEventListener("click", function () {
          var n = window.Game.capHint(f.id);
          hintBox.innerHTML = "";
          f.hints.slice(0, n).forEach(function (ht, k) {
            var d = el("div", "cap-hint-line");
            d.innerHTML = '<span class="cap-hint-n">hint ' + (k + 1) + "</span>" + esc(ht);
            hintBox.appendChild(d);
          });
          if (n >= 3) hintBtn.disabled = true;
          else hintBtn.textContent = "another hint (-" + [5, 10, 15][n] + " xp)";
        });

        form.appendChild(inp); form.appendChild(btn);
        card.appendChild(form);
        card.appendChild(fb);
        card.appendChild(hintBox);
        var foot = el("div", "cap-foot");
        foot.innerHTML = '<span class="cap-where">' + esc(f.where) + "</span>";
        foot.appendChild(hintBtn);
        card.appendChild(foot);
      } else {
        var doneBox = el("div", "cap-fb ok");
        doneBox.textContent = f.why;
        card.appendChild(doneBox);
        if (hintsUsed) {
          var hb = el("div", "cap-hints");
          f.hints.slice(0, hintsUsed).forEach(function (ht, k) {
            var d = el("div", "cap-hint-line");
            d.innerHTML = '<span class="cap-hint-n">hint ' + (k + 1) + "</span>" + esc(ht);
            hb.appendChild(d);
          });
          card.appendChild(hb);
        }
      }
      list.appendChild(card);
    });
    root.appendChild(list);
  }

  /* ------------------------------------------------------------------ readiness */
  function viewReadiness(root) {
    root.innerHTML = "";
    var head = el("div", "rd-hero");
    head.innerHTML =
      '<div class="cap-k">before you start</div>' +
      "<h2>Is your machine ready?</h2>" +
      '<p class="cap-intro">This page cannot see your device - a web page has no access to adb. So it grades the ' +
      "transcript your own machine produced, which means every verdict here is about your real output, not a guess. " +
      "Run the script, paste the file, and fix whatever comes back red.</p>";
    root.appendChild(head);

    /* the install checklist goes first: a transcript grader is useless to someone who has not installed adb yet */
    if (window.Prereqs) {
      var pq = el("div", "pq-host");
      pq.id = "pq-host";
      root.appendChild(pq);
      window.Prereqs.mountCheck(pq);
      pq.dataset.mounted = "1";
      var more = el("div", "rd-hero rd-second");
      more.innerHTML = '<div class="cap-k">then</div><h2>Grade what your machine prints</h2>' +
        '<p class="cap-intro">Install what was missing above, run <code>labs-offline/readiness.sh</code>, ' +
        'and paste its output. Every verdict below is about your real output - this page can never see your device.</p>';
      root.appendChild(more);
    }

    var steps = el("div", "rd-steps");
    steps.innerHTML =
      '<div class="rd-step"><span class="rd-n">1</span><div><b>Run the script</b>' +
      '<pre class="rd-pre">sh readiness.sh &gt; my-setup.txt</pre>' +
      "<span class=\"rd-dim\">It is in labs-offline/ next to this guide. It only reads: adb version, devices, getprop, pm list, settings get, ps, forward --list. No installs, no writes.</span></div></div>" +
      '<div class="rd-step"><span class="rd-n">2</span><div><b>Paste my-setup.txt below</b>' +
      '<span class="rd-dim">Every line starts with ASW, so the parser is strict on purpose - a hand-edited transcript is not evidence.</span></div></div>' +
      '<div class="rd-step"><span class="rd-n">3</span><div><b>Fix the red, ignore the green</b>' +
      '<span class="rd-dim">Amber is "it will cost you time later", red is "the module cannot start".</span></div></div>';
    root.appendChild(steps);

    var box = el("div", "rd-box");
    var ta = el("textarea", "rd-ta");
    ta.placeholder = "ASW generated: 2026-10-30 09:12\nASW adb: 1.0.41\nASW devices: ebb1e62d device\n...";
    ta.rows = 9;
    ta.spellcheck = false;
    var bar = el("div", "rd-bar");
    var go = el("button", "cap-go", "check my setup");
    go.type = "button";
    var clear = el("button", "cap-hint", "clear");
    clear.type = "button";
    var sum = el("span", "rd-sum");
    bar.appendChild(go); bar.appendChild(clear); bar.appendChild(sum);
    box.appendChild(ta); box.appendChild(bar);
    var out = el("div", "rd-out");
    box.appendChild(out);
    root.appendChild(box);

    /* a real recording, graded by the same parser - "what does a good one look like" is the
       question every student asks, and a described example answers nothing */
    var S = (window.CAPSTONE || {}).readinessSample;
    if (S && S.text) {
      var wrap = el("details", "rd-sample");
      var sumEl = el("summary", null, S.label);
      var inner = el("div", "rd-sample-body");
      var pre = el("pre", "rd-pre", S.text);
      var btn = el("button", "cap-hint", "grade this example");
      btn.type = "button";
      btn.addEventListener("click", function () {
        ta.value = S.text;
        ta.dispatchEvent(new Event("input"));
        run();
      });
      inner.appendChild(pre);
      inner.appendChild(el("p", "rd-dim", S.note));
      inner.appendChild(btn);
      wrap.appendChild(sumEl); wrap.appendChild(inner);
      root.appendChild(wrap);
    }

    function run() {
      var res = window.Readiness.grade(ta.value);
      out.innerHTML = "";
      if (!res.ok) {
        var e = el("div", "rd-bad", res.why);
        out.appendChild(e);
        sum.textContent = "";
        return;
      }
      var passN = res.rows.filter(function (r) { return r.level === "pass"; }).length;
      sum.textContent = passN + " pass · " + res.warn + " warn · " + res.fail + " fail";
      sum.className = "rd-sum" + (res.fail ? " bad" : res.warn ? " mid" : " good");
      var table = el("div", "rd-rows");
      res.rows.forEach(function (r) {
        var row = el("div", "rd-row lv-" + r.level);
        row.innerHTML =
          '<span class="rd-lv">' + (r.level === "pass" ? "ok" : r.level === "warn" ? "warn" : "fail") + "</span>" +
          '<span class="rd-key">' + esc(r.key) + "</span>" +
          '<span class="rd-msg">' + esc(r.msg) + "</span>" +
          '<span class="rd-need">' + esc(r.need) + "</span>";
        table.appendChild(row);
      });
      out.appendChild(table);

      var meta = el("div", "rd-meta");
      meta.textContent = "graded from: " + (res.serial && res.serial !== "none" ? res.serial : "no device") +
        (res.model && res.model !== "none" ? " (" + res.model + ")" : "") +
        (res.stamp ? " · script run " + res.stamp : "");
      out.appendChild(meta);

      if (!res.fail) {
        var xp = window.Game && window.Game.readyPass ? window.Game.readyPass() : 0;
        var good = el("div", "rd-good");
        good.textContent = "Nothing blocks you. Start Module 00." + (xp ? " +" + xp + " xp" : " (already awarded)");
        out.appendChild(good);
      }
    }
    go.addEventListener("click", run);
    clear.addEventListener("click", function () { ta.value = ""; out.innerHTML = ""; sum.textContent = ""; });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); });
  }

  window.Capstone = { view: viewCapstone, sha256: sha256, norm: norm };
  window.ReadinessPage = { view: viewReadiness };
})();
