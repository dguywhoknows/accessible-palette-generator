/* core.js — OKLab/OKLCH conversions with gamut mapping, WCAG 2 and APCA contrast, color-vision simulation, scales, harmonies, k-means image palettes and exporters (pure, unit-tested). */

var ROLES = ['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'muted'];
var BRAND = ['primary', 'secondary', 'accent'];
function clamp01(x) { return Math.min(1, Math.max(0, x)); }
function normHex(hx) { var s = String(hx).trim().replace(/^#/, '').toLowerCase(); if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map(function (c) { return c + c; }).join(''); return /^[0-9a-f]{6}$/.test(s) ? '#' + s : null; }
function hexToRgb(hx) { return normHex(hx).slice(1).match(/.{2}/g).map(function (x) { return parseInt(x, 16) / 255; }); }
function rgbToHex(rgb) { return '#' + rgb.map(function (c) { return Math.round(clamp01(c) * 255).toString(16).padStart(2, '0'); }).join(''); }
function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function delin(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
function linToOklab(v) {
  var l = Math.cbrt(0.4122214708 * v[0] + 0.5363325363 * v[1] + 0.0514459929 * v[2]), m = Math.cbrt(0.2119034982 * v[0] + 0.6806995451 * v[1] + 0.1073969566 * v[2]), s = Math.cbrt(0.0883024619 * v[0] + 0.2817188376 * v[1] + 0.6299787005 * v[2]);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToLin(v) {
  var l = Math.pow(v[0] + 0.3963377774 * v[1] + 0.2158037573 * v[2], 3), m = Math.pow(v[0] - 0.1055613458 * v[1] - 0.0638541728 * v[2], 3), s = Math.pow(v[0] - 0.0894841775 * v[1] - 1.291485548 * v[2], 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function toOklab(hx) { return linToOklab(hexToRgb(hx).map(lin)); }
function toOklch(hx) { var o = toOklab(hx); return [o[0], Math.hypot(o[1], o[2]), ((Math.atan2(o[2], o[1]) * 180) / Math.PI + 360) % 360]; }
function inGamut(rgb) { return rgb.every(function (c) { return c >= -1e-4 && c <= 1 + 1e-4; }); }
/* OKLCH -> hex, reducing chroma (binary search) until the color fits in sRGB so hue and lightness are preserved. */
function fromOklch(L, C, H) {
  var conv = function (c) { return oklabToLin([L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)]); };
  var rgb = conv(C);
  if (!inGamut(rgb)) { var lo = 0, hi = C; for (var i = 0; i < 24; i++) { var mid = (lo + hi) / 2; if (inGamut(conv(mid))) lo = mid; else hi = mid; } rgb = conv(lo); }
  return rgbToHex(rgb.map(function (c) { return delin(clamp01(c)); }));
}
function deltaE(a, b) { var x = toOklab(a), y = toOklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }

/* ---------- contrast ---------- */
function luminance(hx) { var c = hexToRgb(hx).map(lin); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function contrast(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function wcagLevel(r) { return r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'fail'; }
/* APCA 0.0.98G-4g lightness contrast (Lc). Positive: dark text on light; negative: light text on dark. */
function apca(text, bg) {
  var Y = function (hx) { var c = hexToRgb(hx); var y = 0.2126729 * Math.pow(c[0], 2.4) + 0.7151522 * Math.pow(c[1], 2.4) + 0.072175 * Math.pow(c[2], 2.4); return y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414); };
  var yt = Y(text), yb = Y(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  var out;
  if (yb > yt) { var sapc = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14; out = sapc < 0.1 ? 0 : sapc - 0.027; }
  else { var s2 = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14; out = s2 > -0.1 ? 0 : s2 + 0.027; }
  return out * 100;
}
/* Rough APCA guidance: Lc 90 preferred body text, 75 minimum body, 60 large/medium text, 45 headlines, 30 non-text. */
function apcaUse(lc) { var a = Math.abs(lc); return a >= 90 ? 'body text (preferred)' : a >= 75 ? 'body text' : a >= 60 ? 'large text, labels' : a >= 45 ? 'headlines, icons' : a >= 30 ? 'non-text, disabled' : 'too low'; }
function onColor(bg) { return contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111'; }
/* Smallest OKLCH lightness change to fg (moving away from bg) that reaches the target ratio; null if impossible. */
function nearestPassing(fg, bg, target) {
  if (contrast(fg, bg) >= target) return fg;
  var o = toOklch(fg), dir = toOklch(bg)[0] > 0.5 ? -1 : 1;
  for (var L = o[0]; L >= 0 && L <= 1; L += dir * 0.005) { var c = fromOklch(L, o[1], o[2]); if (contrast(c, bg) >= target) return c; }
  return null;
}

/* ---------- scales, harmonies, color vision ---------- */
var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
var STEP_L = [0.975, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.45, 0.37, 0.29, 0.22];
function tonalScale(hx) { var o = toOklch(hx); return STEP_L.map(function (L, i) { return fromOklch(L, o[1] * (0.35 + 0.65 * Math.sin((Math.PI * (i + 0.6)) / 11.6)), o[2]); }); }
var HARMONIES = { complementary: [0, 180], analogous: [-30, 0, 30], triadic: [0, 120, 240], 'split-complementary': [0, 150, 210], tetradic: [0, 90, 180, 270], monochromatic: [0, 0, 0] };
function harmony(hx, kind) {
  var o = toOklch(hx);
  return (HARMONIES[kind] || HARMONIES.complementary).map(function (d, i) { return kind === 'monochromatic' ? fromOklch(Math.min(0.95, Math.max(0.25, o[0] + (i - 1) * 0.18)), o[1], o[2]) : fromOklch(o[0], o[1], (o[2] + d + 360) % 360); });
}
var CVD = {
  Protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  Deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  Tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
/* Machado et al. 2009 (severity 1.0) in linear RGB; achromatopsia uses luminance only. */
function simulateCVD(hx, kind) {
  var rgb = hexToRgb(hx).map(lin);
  if (kind === 'Achromatopsia') { var y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; return rgbToHex([y, y, y].map(delin)); }
  var M = CVD[kind];
  if (!M) return normHex(hx);
  return rgbToHex(M.map(function (row) { return delin(clamp01(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])); }));
}
/* Pairs of brand colors that become hard to tell apart for a given vision type. */
function confusablePairs(colors, kind, threshold) {
  var sims = colors.map(function (c) { return simulateCVD(c.hex, kind); }), out = [];
  for (var i = 0; i < colors.length; i++) for (var j = i + 1; j < colors.length; j++) if (deltaE(sims[i], sims[j]) < (threshold || 0.06)) out.push([colors[i].role, colors[j].role]);
  return out;
}

/* ---------- palettes ---------- */
function getColor(pal, role) { var c = pal.colors.find(function (x) { return x.role === role; }); return c ? c.hex : '#888888'; }
function localPalette(prompt) {
  var t = String(prompt).toLowerCase(), hue = 0, n = 0;
  [[/calm|trust|bank|fin|ocean|sea|corporate|health|clean/, 215], [/nature|eco|green|garden|fresh|organic/, 145], [/warm|cozy|coffee|autumn|earth|bakery/, 45], [/energ|sport|bold|fire|passion|food/, 25], [/luxury|elegant|royal|premium|night/, 290], [/playful|kids|candy|fun|pop/, 330], [/tech|ai|future|cyber|neon/, 265]].forEach(function (x) { if (x[0].test(t)) { hue += x[1]; n++; } });
  hue = n ? hue / n : t.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % 360;
  var warm = /warm|friendly|human/.test(t);
  return {
    name: String(prompt).split(/[ ,]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') + ' palette',
    rationale: 'Built from a ' + Math.round(hue) + '° base hue with analogous and ' + (warm ? 'warm' : 'complementary') + ' accents in OKLCH.',
    colors: [
      { role: 'primary', name: 'Signal', hex: fromOklch(0.52, 0.14, hue) },
      { role: 'secondary', name: 'Harmony', hex: fromOklch(0.6, 0.12, (hue + 40) % 360) },
      { role: 'accent', name: 'Spark', hex: fromOklch(0.68, 0.16, warm ? 55 : (hue + 180) % 360) },
      { role: 'background', name: 'Paper', hex: fromOklch(0.985, 0.008, hue) },
      { role: 'surface', name: 'Card', hex: fromOklch(0.955, 0.014, hue) },
      { role: 'text', name: 'Ink', hex: fromOklch(0.24, 0.025, hue) },
      { role: 'muted', name: 'Slate', hex: fromOklch(0.52, 0.02, hue) },
    ],
  };
}
function darkVariant(pal) {
  var out = JSON.parse(JSON.stringify(pal)), g = function (r) { return getColor(pal, r); };
  var set = function (role, hx) { var c = out.colors.find(function (x) { return x.role === role; }); if (c) c.hex = hx; };
  var bg = toOklch(g('background')), bgC = Math.min(0.03, bg[1]);
  set('background', fromOklch(0.17, bgC, bg[2])); set('surface', fromOklch(0.23, bgC + 0.005, bg[2]));
  set('text', fromOklch(0.95, 0.01, toOklch(g('text'))[2])); set('muted', fromOklch(0.72, 0.02, toOklch(g('muted'))[2]));
  BRAND.forEach(function (r) { var o = toOklch(g(r)); if (o[0] < 0.62) set(r, fromOklch(0.7, o[1], o[2])); });
  return out;
}
/* Every palette check that matters for UI: text/muted on background and surface, and white/black labels on brand colors. */
function auditPalette(pal) {
  var g = function (r) { return getColor(pal, r); }, rows = [];
  [['text', 'background', 4.5], ['text', 'surface', 4.5], ['muted', 'background', 4.5], ['muted', 'surface', 4.5], ['primary', 'background', 3]].forEach(function (x) { var r = contrast(g(x[0]), g(x[1])); rows.push({ fg: x[0], bg: x[1], ratio: r, need: x[2], ok: r >= x[2], apca: apca(g(x[0]), g(x[1])) }); });
  BRAND.forEach(function (role) { var lbl = onColor(g(role)), r = contrast(lbl, g(role)); rows.push({ fg: 'label', bg: role, ratio: r, need: 4.5, ok: r >= 4.5, apca: apca(lbl, g(role)) }); });
  return rows;
}
/* Adjust only lightness, so hue and chroma (the "feel") stay. Returns the roles that changed. */
function autoFix(pal) {
  var changed = [], g = function (r) { return getColor(pal, r); };
  [['text', 4.5 * 1.15], ['muted', 4.5]].forEach(function (x) {
    var c = pal.colors.find(function (y) { return y.role === x[0]; });
    if (!c) return;
    var worst = function () { return Math.min(contrast(c.hex, g('background')), contrast(c.hex, g('surface'))); };
    if (worst() >= x[1]) return;
    var o = toOklch(c.hex), dir = toOklch(g('background'))[0] > 0.5 ? -1 : 1, L = o[0];
    for (var i = 0; i < 100 && worst() < x[1]; i++) { L = clamp01(L + dir * 0.01); c.hex = fromOklch(L, o[1], o[2]); }
    changed.push(x[0]);
  });
  ['primary', 'accent'].forEach(function (role) {
    var c = pal.colors.find(function (y) { return y.role === role; });
    if (!c || contrast(c.hex, onColor(c.hex)) >= 4.5) return;
    var o = toOklch(c.hex), L = o[0];
    for (var i = 0; i < 60 && contrast(c.hex, onColor(c.hex)) < 4.5; i++) { L = clamp01(L - 0.01); c.hex = fromOklch(L, o[1], o[2]); }
    changed.push(role);
  });
  return changed;
}

/* ---------- image palettes ---------- */
function seededRandom(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
/* k-means in OKLab (perceptual) with k-means++ seeding. pixels: [[r,g,b] 0-255]. Returns [{hex, share}] largest first. */
function kmeans(pixels, k, seed, iters) {
  var pts = pixels.map(function (p) { return linToOklab(p.map(function (c) { return lin(c / 255); })); }), r = seededRandom(seed || 7), d2 = function (a, b) { return Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2); };
  if (!pts.length) return [];
  k = Math.min(k, pts.length);
  var centers = [pts[Math.floor(r() * pts.length)]];
  while (centers.length < k) {
    var dist = pts.map(function (p) { return Math.min.apply(null, centers.map(function (c) { return d2(p, c); })); }), sum = dist.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) break;
    var t = r() * sum, idx = 0;
    while (t > dist[idx] && idx < dist.length - 1) { t -= dist[idx]; idx++; }
    centers.push(pts[idx]);
  }
  var assign = new Array(pts.length);
  for (var it = 0; it < (iters || 12); it++) {
    pts.forEach(function (p, i) { var best = 0; centers.forEach(function (c, j) { if (d2(p, c) < d2(p, centers[best])) best = j; }); assign[i] = best; });
    centers = centers.map(function (c, j) { var acc = [0, 0, 0], n = 0; pts.forEach(function (p, i) { if (assign[i] === j) { acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n++; } }); return n ? acc.map(function (v) { return v / n; }) : c; });
  }
  var counts = centers.map(function (_, j) { return assign.filter(function (a) { return a === j; }).length; });
  return centers.map(function (c, j) { return { hex: rgbToHex(oklabToLin(c).map(function (v) { return delin(clamp01(v)); })), share: counts[j] / pts.length }; }).filter(function (x) { return x.share > 0; }).sort(function (a, b) { return b.share - a.share; });
}
/* Map extracted colors onto UI roles: lightest low-chroma -> background, darkest -> text, most chromatic -> primary/accent. */
function paletteFromSwatches(swatches) {
  var info = swatches.map(function (s) { var o = toOklch(s.hex); return { hex: s.hex, L: o[0], C: o[1], H: o[2] }; });
  var byC = info.slice().sort(function (a, b) { return b.C - a.C; }), lightest = info.slice().sort(function (a, b) { return b.L - a.L; })[0], darkest = info.slice().sort(function (a, b) { return a.L - b.L; })[0];
  var p = byC[0] || lightest, s = byC[1] || p, a = byC[2] || s, hue = lightest.H;
  return { name: 'Image palette', rationale: 'Extracted with k-means in OKLab and assigned to roles by lightness and chroma.', colors: [
    { role: 'primary', name: 'Dominant', hex: fromOklch(Math.min(0.55, p.L), p.C, p.H) },
    { role: 'secondary', name: 'Support', hex: fromOklch(Math.min(0.62, Math.max(0.45, s.L)), s.C, s.H) },
    { role: 'accent', name: 'Highlight', hex: fromOklch(Math.max(0.6, Math.min(0.72, a.L)), Math.max(a.C, 0.08), a.H) },
    { role: 'background', name: 'Ground', hex: fromOklch(Math.max(0.97, lightest.L), Math.min(0.015, lightest.C), hue) },
    { role: 'surface', name: 'Layer', hex: fromOklch(0.93, Math.min(0.02, lightest.C), hue) },
    { role: 'text', name: 'Ink', hex: fromOklch(Math.min(0.25, darkest.L), Math.min(0.03, darkest.C), darkest.H) },
    { role: 'muted', name: 'Haze', hex: fromOklch(0.5, Math.min(0.025, darkest.C), darkest.H) },
  ] };
}

/* ---------- exports ---------- */
function exportCSS(pal) {
  var dark = darkVariant(pal);
  return ':root {\n' + pal.colors.map(function (c) { return '  --color-' + c.role + ': ' + c.hex + ';'; }).join('\n') + '\n' +
    pal.colors.filter(function (c) { return BRAND.indexOf(c.role) >= 0; }).map(function (c) { return tonalScale(c.hex).map(function (hx, i) { return '  --' + c.role + '-' + STEPS[i] + ': ' + hx + ';'; }).join('\n'); }).join('\n') +
    '\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n' + dark.colors.map(function (c) { return '    --color-' + c.role + ': ' + c.hex + ';'; }).join('\n') + '\n  }\n}\n';
}
function exportSCSS(pal) { return pal.colors.map(function (c) { return '$' + c.role + ': ' + c.hex + ';'; }).join('\n') + '\n\n$palette: (\n' + pal.colors.map(function (c) { return '  "' + c.role + '": $' + c.role; }).join(',\n') + '\n);\n'; }
function exportTailwind(pal) {
  var obj = {};
  pal.colors.forEach(function (c) { if (BRAND.indexOf(c.role) >= 0) { var o = {}; tonalScale(c.hex).forEach(function (hx, i) { o[STEPS[i]] = hx; }); o.DEFAULT = c.hex; obj[c.role] = o; } else obj[c.role] = c.hex; });
  return '// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ' + JSON.stringify(obj, null, 2).replace(/\n/g, '\n      ') + ',\n    },\n  },\n};\n';
}
function exportTokens(pal) { var col = {}; pal.colors.forEach(function (c) { col[c.role] = { $type: 'color', $value: c.hex, $description: c.name || '' }; }); return JSON.stringify({ name: pal.name, color: col }, null, 2); }
function exportSVG(pal) {
  var w = 140, esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * pal.colors.length + '" height="180" font-family="Inter, Arial, sans-serif">' + pal.colors.map(function (c, i) {
    var fg = onColor(c.hex);
    return '<rect x="' + i * w + '" y="0" width="' + w + '" height="180" fill="' + c.hex + '"/><text x="' + (i * w + 12) + '" y="26" font-size="11" font-weight="700" fill="' + fg + '">' + esc(c.role.toUpperCase()) + '</text><text x="' + (i * w + 12) + '" y="150" font-size="14" font-weight="700" fill="' + fg + '">' + esc(c.name || '') + '</text><text x="' + (i * w + 12) + '" y="168" font-size="12" fill="' + fg + '">' + c.hex.toUpperCase() + '</text>';
  }).join('') + '</svg>';
}
