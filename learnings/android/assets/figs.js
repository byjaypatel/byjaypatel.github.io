/* Figure kit v2 - every label is measured before it is placed.
   RULE: never draw a string at a coordinate and hope it fits. Text is sized with an advance-width
   estimate (monospace ~0.61em), fitted or wrapped to the box it lives in, and notes on the right of
   a row reserve their own space first. New diagram types must use fit()/wrap() too - an unfitted
   label is a bug that only shows up on someone else's screen.
   Types: flow · layers · tree · matrix · compare · lines.
   Returns { svg, caption }. */
(function () {
  "use strict";
  var W = 680;
  var FS = 12, FS_SUB = 10.5, FS_EDGE = 9.5;
  var CW = 0.61;                                  // monospace advance, in em

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function tw(s, fs) { return String(s).length * fs * CW; }

  /* longest prefix that fits, with an ellipsis */
  function fit(s, maxPx, fs) {
    s = String(s == null ? "" : s);
    if (tw(s, fs) <= maxPx) return s;
    var maxChars = Math.max(3, Math.floor(maxPx / (fs * CW)) - 1);
    if (maxChars >= s.length) return s;
    return s.slice(0, maxChars).replace(/[\s,;:]$/, "") + "\u2026";
  }

  /* greedy word wrap, hard-capped at maxLines; the last line is fitted with an ellipsis */
  function wrap(s, maxPx, fs, maxLines) {
    s = String(s == null ? "" : s);
    if (tw(s, fs) <= maxPx) return [s];
    var maxChars = Math.max(4, Math.floor(maxPx / (fs * CW)));
    var words = s.split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var cand = cur ? cur + " " + words[i] : words[i];
      if (cand.length <= maxChars) { cur = cand; continue; }
      if (cur) { lines.push(cur); cur = words[i]; }
      else { lines.push(words[i].slice(0, maxChars)); cur = words[i].slice(maxChars); }
      if (lines.length === maxLines) { cur = ""; break; }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (!lines.length) lines = [s];
    var truncated = lines.join(" ").length < s.length;
    if (truncated) lines[lines.length - 1] = fit(lines[lines.length - 1] + "\u2026", maxPx, fs);
    return lines;
  }

  function T(x, y, txt, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="fig-t' + (cls ? " " + cls : "") +
      '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + '>' + esc(txt) + "</text>";
  }

  /* label (+ optional sub) centred in a box, wrapped only as far as the box allows */
  function hit(i, label) {
    return ' data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(label) + ': open the explanation"';
  }

  function box(x, y, w, h, label, sub, cls, maxLines, i) {
    var pad = 12, inner = w - pad * 2;
    var lines = wrap(label, inner, FS, maxLines || 2);
    var subs = sub ? [fit(sub, inner, FS_SUB)] : [];
    var lh = 15, lhSub = 13;
    var totalH = lines.length * lh + (subs.length ? subs.length * lhSub + 1 : 0);
    var top = y + h / 2 - totalH / 2;
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" class="fig-box' +
      (cls ? " " + cls : "") + '"' + (i == null ? "" : hit(i, label)) + '/>';
    var baseline = top + 11;
    lines.forEach(function (ln) { s += T(x + w / 2, baseline, ln, "fig-lbl", "middle"); baseline += lh; });
    if (subs.length) {
      baseline = top + lines.length * lh + 11;
      subs.forEach(function (sb) { s += T(x + w / 2, baseline, sb, "fig-sub", "middle"); baseline += lhSub; });
    }
    return s;
  }

  function arrow(x1, y1, x2, y2, dashed) {
    var id = "ah" + Math.round(x1 + y1 + x2 + y2);
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" class="fig-head"/></marker></defs>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="fig-edge' + (dashed ? " dash" : "") +
      '" marker-end="url(#' + id + ')"/>';
  }

  function wrapSvg(inner, h, title, caption) {
    return {
      svg: '<svg class="fig-svg" viewBox="0 0 ' + W + " " + h + '" role="img" aria-label="' + esc(title) +
        '" preserveAspectRatio="xMidYMid meet"><title>' + esc(title) + "</title>" + inner + "</svg>",
      caption: caption || ""
    };
  }

  /* ---------------- flow ---------------- */
  function flow(spec) {
    var n = spec.nodes.length, gap = spec.gap || 30, pad = 12;
    var bw = Math.min(200, (W - pad * 2 - gap * (n - 1)) / n);
    var total = bw * n + gap * (n - 1);
    var x = (W - total) / 2, y = spec.y || 38, bh = spec.bh || 62;
    var out = "", centers = [];
    spec.nodes.forEach(function (nd, i) {
      out += box(x, y, bw, bh, nd.t, nd.s, nd.weak ? "weak" : (nd.hot ? "hot" : ""), 2, i);
      centers.push(x + bw / 2);
      if (i < n - 1) out += arrow(x + bw + 3, y + bh / 2, x + bw + gap - 3, y + bh / 2, nd.dashed);
      x += bw + gap;
    });
    /* edge labels go BELOW the row: in the gap they collided with both node labels */
    spec.nodes.forEach(function (nd, i) {
      if (i >= n - 1 || !nd.edge) return;
      var mid = (centers[i] + centers[i + 1]) / 2;
      out += T(mid, y + bh + 16, fit(nd.edge, bw + gap - 8, FS_EDGE), "fig-edge-t", "middle");
    });
    var h = y + bh + (spec.nodes.some(function (d) { return d.edge; }) ? 26 : 14);
    if (spec.note) out += T(W / 2, h - 2, fit(spec.note, W - 40, FS_EDGE), "fig-note", "middle");
    return wrapSvg(out, Math.max(h, spec.h || 0), spec.title, spec.caption);
  }

  /* ---------------- layers ---------------- */
  function layers(spec) {
    var lh = spec.lh || 32, gap = 6, n = spec.items.length, out = "";
    var x = spec.x || 60, w = spec.w || 460, y = 16;
    spec.items.forEach(function (it, i) {
      var ind = i * 7, noteW = it.note ? tw(it.note, FS_SUB) + 18 : 0;
      var labelMax = w - noteW - 26;
      out += '<rect x="' + (x + ind) + '" y="' + y + '" width="' + w + '" height="' + lh + '" rx="6" class="fig-box' +
        (it.hot ? " hot" : (it.weak ? " weak" : "")) + '"' + hit(i, it.t) + '/>';
      out += T(x + ind + 14, y + lh / 2 + 4, fit(it.t, labelMax, FS), "fig-lbl");
      if (it.note) out += T(x + ind + w - 12, y + lh / 2 + 4, fit(it.note, noteW - 10, FS_SUB), "fig-sub", "end");
      y += lh + gap;
    });
    return wrapSvg(out, y + 8, spec.title, spec.caption);
  }

  /* ---------------- tree ---------------- */
  function tree(spec) {
    var rows = spec.rows, lh = 26, out = "", y = 14;
    rows.forEach(function (r) {
      var x = 18 + (r.d || 0) * 24, w = W - x - 18;
      var noteW = r.note ? tw(r.note, FS_SUB) + 16 : 0;
      var labelMax = w - noteW - 24;
      out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (lh - 6) + '" rx="5" class="fig-box tiny' +
        (r.hot ? " hot" : (r.weak ? " weak" : "")) + '"' + hit(rows.indexOf(r), r.t) + '/>';
      out += T(x + 10, y + 14, fit(r.t, labelMax, FS), "fig-lbl");
      if (r.note) out += T(x + w - 10, y + 14, fit(r.note, noteW - 8, FS_SUB), "fig-sub", "end");
      y += lh;
    });
    return wrapSvg(out, y + 8, spec.title, spec.caption);
  }

  /* ---------------- matrix ---------------- */
  function matrix(spec) {
    var cells = spec.cells;
    /* pick the column count from the longest label instead of a fixed grid - 6 columns squeezed
       "ro.build.version.sdk" straight through the cell wall */
    var need = Math.max.apply(null, cells.map(function (c) { return tw(c.t, FS); })) + 22;
    var maxCols = Math.max(2, Math.floor((W - 32) / need));
    var cols = Math.min(spec.cols || 4, maxCols);
    var cw = (W - 32) / cols, ch = 46;
    var rowsN = Math.ceil(cells.length / cols), out = "";
    cells.forEach(function (c, i) {
      var cx = 16 + (i % cols) * cw, cy = 14 + Math.floor(i / cols) * (ch + 8);
      out += '<rect x="' + cx + '" y="' + cy + '" width="' + (cw - 8) + '" height="' + ch + '" rx="6" class="fig-box tiny' +
        (c.hot ? " hot" : (c.weak ? " weak" : "")) + '"' + hit(i, c.t) + '/>';
      out += T(cx + (cw - 8) / 2, cy + 21, fit(c.t, cw - 22, FS), "fig-lbl", "middle");
      if (c.s) out += T(cx + (cw - 8) / 2, cy + 35, fit(c.s, cw - 22, FS_SUB), "fig-sub", "middle");
    });
    return wrapSvg(out, rowsN * (ch + 8) + 18, spec.title, spec.caption);
  }

  /* ---------------- compare ---------------- */
  function compare(spec) {
    var half = (W - 56) / 2, out = "", maxLines = 0;
    [spec.left, spec.right].forEach(function (p, i) {
      maxLines = Math.max(maxLines, (p.lines || []).length);
    });
    var h = 42 + maxLines * 19 + 18;
    [spec.left, spec.right].forEach(function (p, i) {
      var x = 18 + i * (half + 20);
      out += '<rect x="' + x + '" y="14" width="' + half + '" height="' + (h - 28) + '" rx="9" class="fig-box panel' +
        (p.hot ? " hot" : "") + '"' + hit(i, p.title) + '/>';
      out += T(x + 14, 36, fit(p.title, half - 28, FS), "fig-lbl");
      (p.lines || []).forEach(function (l, j) {
        out += T(x + 14, 58 + j * 19, fit(l, half - 28, FS_SUB), "fig-sub");
      });
    });
    if (spec.vs) out += T(W / 2, h / 2, "vs", "fig-vs", "middle");
    return wrapSvg(out, h, spec.title, spec.caption);
  }

  /* ---------------- lines ---------------- */
  function lines(spec) {
    var lh = 21, out = "", y = 16;
    spec.lines.forEach(function (l, i) {
      var hot = i === spec.hot;
      var markW = (hot && spec.mark) ? tw(spec.mark, FS_EDGE) + 20 : 0;
      out += '<rect x="16" y="' + y + '" width="' + (W - 32) + '" height="' + (lh - 3) + '" rx="3" class="fig-codeline' + (hot ? " hot" : "") + '"' + hit(i, l) + '/>';
      out += T(26, y + 14, String(i + 1).padStart(2, "0"), "fig-ln");
      out += T(54, y + 14, fit(l, W - 54 - 20 - markW, FS), "fig-code");
      if (markW) out += T(W - 26, y + 14, spec.mark, "fig-mark", "end");
      y += lh;
    });
    return wrapSvg(out, y + 12, spec.title, spec.caption);
  }

  var BUILD = { flow: flow, layers: layers, tree: tree, matrix: matrix, compare: compare, lines: lines };

  function get(key) {
    var spec = (window.FIGMAP || {})[key];
    if (!spec || !BUILD[spec.type]) return null;
    var out = BUILD[spec.type](spec);
    out.key = key;
    return out;
  }

  window.Figs = { get: get, types: Object.keys(BUILD), _fit: fit, _wrap: wrap, _tw: tw };
})();
