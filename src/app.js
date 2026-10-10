const { $, $$, h, esc, busy, toast, store, download } = Kit;
let P = store.get('palette.v1', null) || localPalette($('#prompt').value);
let library = store.get('library', []);
let scheme = 'light', exKind = 'css';
const g = (role, pal = P) => getColor(pal, role);
const savePal = () => store.set('palette.v1', P);

/* ================= generate ================= */
function render() {
  savePal();
  $('#rationale').textContent = P.rationale ? `${P.name}: ${P.rationale}` : '';
  const sw = $('#swatches');
  sw.innerHTML = '';
  P.colors.forEach((c) => {
    const fg = onColor(c.hex);
    const hexEl = h('span', { class: 'hex', title: 'Copy', onclick: (e) => { e.stopPropagation(); navigator.clipboard.writeText(c.hex); toast('Copied ' + c.hex); } }, c.hex.toUpperCase());
    const card = h('div', { class: 'sw', style: `background:${c.hex};color:${fg}` },
      h('input', { type: 'color', value: c.hex, 'aria-label': c.role + ' color', oninput: (e) => { c.hex = e.target.value; c.locked = true; hexEl.textContent = c.hex.toUpperCase(); card.style.background = c.hex; card.style.color = onColor(c.hex); renderRest(); } }),
      h('div', { class: 'top' }, h('span', { class: 'role' }, c.role), h('button', { class: 'lock', style: `color:${fg};position:relative;z-index:2`, title: c.locked ? 'Unlock' : 'Lock', 'aria-pressed': String(!!c.locked), onclick: (e) => { e.stopPropagation(); c.locked = !c.locked; render(); } }, c.locked ? 'Locked' : 'Lock')),
      h('div', {}, h('div', { class: 'nm' }, c.name || ''), hexEl, h('div', { class: 'small', style: 'opacity:.8' }, `OKLCH ${toOklch(c.hex).map((v, i) => v.toFixed(i === 2 ? 0 : 2)).join(' ')}`)));
    sw.append(card);
  });
  renderRest();
}
function renderRest() { renderPreview(); renderAudit(); renderScales(); renderCVD(); renderExport(); savePal(); }
function renderPreview() {
  const pal = scheme === 'dark' ? darkVariant(P) : P, c = (r) => g(r, pal);
  $('#preview').style.background = c('background');
  $('#preview').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;color:${c('text')}"><b style="font-size:18px">Nimbus</b><span style="color:${c('muted')};font-size:13px">Dashboard · Settings</span></div>
    <div class="pv-card" style="background:${c('surface')};color:${c('text')}">
      <div style="font-size:13px;color:${c('muted')}">Portfolio value</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-.02em">$12,480.22 <span style="font-size:14px;color:${c('secondary')};font-weight:700">+3.2%</span></div>
      <div class="pv-chart">${[40, 55, 48, 62, 70, 66, 82, 90].map((v, i) => `<i style="height:${v}%;background:${i === 7 ? c('accent') : c('primary')};opacity:${i === 7 ? 1 : 0.35 + i * 0.07}"></i>`).join('')}</div>
      <p style="margin:0;font-size:14px;color:${c('muted')}">Body copy in the muted color should still be easy to read for everyone.</p>
      <div class="pv-btns"><button class="pv-btn" style="background:${c('primary')};color:${onColor(c('primary'))}">Invest now</button><button class="pv-btn" style="background:${c('accent')};color:${onColor(c('accent'))}">New goal</button><button class="pv-btn" style="background:transparent;color:${c('primary')};box-shadow:inset 0 0 0 2px ${c('primary')}">Learn more</button></div>
    </div>`;
  $$('[data-scheme]').forEach((b) => b.classList.toggle('primary', b.dataset.scheme === scheme));
}
function renderAudit() {
  const rows = auditPalette(scheme === 'dark' ? darkVariant(P) : P), pal = scheme === 'dark' ? darkVariant(P) : P;
  $('#matrix').innerHTML = `<table><tr><th>Pair</th><th>Sample</th><th>WCAG</th><th>APCA Lc</th></tr>${rows.map((r) => {
    const fg = r.fg === 'label' ? onColor(g(r.bg, pal)) : g(r.fg, pal);
    return `<tr><td style="text-align:left">${r.fg === 'label' ? 'label' : r.fg} on ${r.bg}</td><td><div class="cell" style="background:${g(r.bg, pal)};color:${fg}">Aa text</div></td><td><b style="color:var(--${r.ok ? 'good' : 'bad'})">${r.ratio.toFixed(2)}</b> <span class="small muted">${wcagLevel(r.ratio)}</span></td><td class="mono">${Math.round(r.apca)} <span class="small muted">${apcaUse(r.apca)}</span></td></tr>`;
  }).join('')}</table>`;
}
function renderScales() {
  $('#scales').innerHTML = P.colors.filter((c) => BRAND.includes(c.role)).map((c) => `<div class="scale"><b class="small">${c.role}</b>${tonalScale(c.hex).map((hx, i) => `<div style="background:${hx};color:${onColor(hx)}" title="${c.role}-${STEPS[i]} ${hx}" data-copy="${hx}">${STEPS[i]}</div>`).join('')}</div>`).join('');
}
function renderCVD() {
  const key = P.colors.filter((c) => BRAND.includes(c.role));
  $('#cvd').innerHTML = ['Normal', 'Protanopia', 'Deuteranopia', 'Tritanopia', 'Achromatopsia'].map((k) => {
    const warn = k === 'Normal' ? '' : confusablePairs(key, k).map((p) => `<span class="tag bad">${p[0]} ≈ ${p[1]}</span>`).join(' ');
    return `<div class="cvd-row"><span>${k} ${warn}</span><div class="strip">${P.colors.map((c) => `<i style="background:${k === 'Normal' ? c.hex : simulateCVD(c.hex, k)}"></i>`).join('')}</div></div>`;
  }).join('');
}
const EXPORTS = { css: [exportCSS, 'palette.css', 'text/css'], scss: [exportSCSS, '_palette.scss', 'text/x-scss'], tailwind: [exportTailwind, 'tailwind.config.js', 'text/javascript'], json: [exportTokens, 'tokens.json', 'application/json'], svg: [exportSVG, 'palette.svg', 'image/svg+xml'] };
function renderExport() { $('#exOut').textContent = EXPORTS[exKind][0](P); }
async function generate(keepLocked) {
  const keep = keepLocked ? P.colors.filter((c) => c.locked) : [];
  const out = await AI.chat([
    { role: 'system', content: `You are a senior brand and UI color designer. Create a cohesive UI palette for the brief with exactly these roles: ${ROLES.join(', ')}. Background/surface should be light, text dark, muted mid-gray-ish, and primary must hold 4.5:1 contrast with white text. Give each color an evocative name. Return JSON {"name":"palette name","rationale":"one sentence on the choices","colors":[{"role":"","name":"","hex":"#rrggbb"}]}.` },
    { role: 'user', content: `Brief: ${$('#prompt').value}${keep.length ? `\nKeep these exactly and harmonize the rest with them: ${keep.map((k) => `${k.role}=${k.hex}`).join(', ')}` : ''}` },
  ], { json: true, temperature: 0.9, demo: () => localPalette($('#prompt').value) });
  const fallback = localPalette($('#prompt').value);
  P = { name: out.name || 'Palette', rationale: out.rationale || '', colors: ROLES.map((role) => {
    const locked = keep.find((k) => k.role === role);
    if (locked) return locked;
    const c = (out.colors || []).find((x) => x.role === role);
    return { role, name: c?.name || role, hex: normHex(c?.hex || '') || getColor(fallback, role) };
  }) };
  render();
}
$('#gen').onclick = (e) => busy(e.currentTarget, () => generate(false));
$('#regen').onclick = (e) => busy(e.currentTarget, () => generate(true));
$('#prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#gen').click(); });
$$('[data-scheme]').forEach((b) => (b.onclick = () => { scheme = b.dataset.scheme; renderPreview(); renderAudit(); }));
$('#fix').onclick = () => { const n = autoFix(P); render(); toast(n.length ? `Adjusted lightness of ${n.join(', ')} to pass AA` : 'Everything already passes AA'); };
$$('#exTabs button').forEach((b) => (b.onclick = () => { exKind = b.dataset.x; $$('#exTabs button').forEach((x) => x.classList.toggle('on', x === b)); renderExport(); }));
$('#copy').onclick = () => navigator.clipboard.writeText($('#exOut').textContent).then(() => toast('Copied'));
$('#dl').onclick = () => download(EXPORTS[exKind][1], $('#exOut').textContent, EXPORTS[exKind][2]);
$('#scales').addEventListener('click', (e) => { const hx = e.target.dataset.copy; if (hx) navigator.clipboard.writeText(hx).then(() => toast('Copied ' + hx)); });
$('#savePal').onclick = () => { library.unshift({ id: Date.now(), t: Date.now(), palette: JSON.parse(JSON.stringify(P)), prompt: $('#prompt').value }); store.set('library', library); toast('Saved to library'); };

/* ================= contrast checker ================= */
function renderContrast() {
  const fg = normHex($('#cFgHex').value) || '#777777', bg = normHex($('#cBgHex').value) || '#ffffff', r = contrast(fg, bg), lc = apca(fg, bg);
  $('#cPreview').style.background = bg;
  $('#cPreview').style.color = fg;
  $('#cPreview').innerHTML = '<div class="big">The quick brown fox</div><div style="font-size:18px">Large text at 18px and above</div><div style="font-size:14px">Body text at 14px: jumps over the lazy dog while staying readable.</div><div style="font-size:12px">Small print at 12px</div>';
  const row = (k, v) => `<div class="res-row"><span>${k}</span><b>${v}</b></div>`;
  const pass = (ok) => `<span style="color:var(--${ok ? 'good' : 'bad'})">${ok ? 'pass' : 'fail'}</span>`;
  let html = row('WCAG 2 ratio', `${r.toFixed(2)} : 1`) + row('Body text AA (4.5)', pass(r >= 4.5)) + row('Body text AAA (7)', pass(r >= 7)) + row('Large text / UI AA (3)', pass(r >= 3)) + row('APCA Lc', `${lc.toFixed(1)} · ${apcaUse(lc)}`);
  $('#cResults').innerHTML = '<h2 style="margin:0">Results</h2>' + html;
  [[4.5, 'AA'], [7, 'AAA']].forEach(([t, lbl]) => {
    if (r >= t) return;
    const fix = nearestPassing(fg, bg, t);
    if (!fix) return;
    $('#cResults').append(h('div', { class: 'res-row' }, h('span', {}, `Closest text color for ${lbl}: `, h('span', { class: 'mono' }, fix)), h('button', { class: 'btn sm', onclick: () => setPair(fix, bg) }, 'Use')));
  });
}
function setPair(fg, bg) { $('#cFg').value = $('#cFgHex').value = fg; $('#cBg').value = $('#cBgHex').value = bg; renderContrast(); }
[['#cFg', '#cFgHex'], ['#cBg', '#cBgHex']].forEach(([picker, text]) => {
  $(picker).oninput = () => { $(text).value = $(picker).value; renderContrast(); };
  $(text).oninput = () => { const n = normHex($(text).value); if (n) { $(picker).value = n; renderContrast(); } };
});
$('#cSwap').onclick = () => setPair($('#cBgHex').value, $('#cFgHex').value);

/* ================= from image ================= */
let extracted = [];
$('#imgK').oninput = () => { $('#imgKVal').textContent = $('#imgK').value; if (imgPixels) extract(); };
let imgPixels = null;
$('#imgFile').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const cv = $('#imgCanvas'), scale = Math.min(1, 640 / Math.max(img.width, img.height));
    cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    $('#imgEmpty').classList.add('hidden');
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data, step = Math.max(1, Math.floor((cv.width * cv.height) / 6000));
    imgPixels = [];
    for (let i = 0; i < data.length / 4; i += step) if (data[i * 4 + 3] > 200) imgPixels.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    URL.revokeObjectURL(img.src);
    extract();
  };
  img.src = URL.createObjectURL(f);
  e.target.value = '';
};
function extract() {
  extracted = kmeans(imgPixels, +$('#imgK').value, 11);
  $('#imgSwatches').innerHTML = '';
  extracted.forEach((s) => $('#imgSwatches').append(h('div', { class: 'ext' }, h('i', { style: `background:${s.hex}` }), h('span', { class: 'mono' }, s.hex), h('span', { class: 'small muted' }, Math.round(s.share * 100) + '%'))));
  $('#imgUse').disabled = !extracted.length;
}
$('#imgUse').onclick = () => { P = paletteFromSwatches(extracted); autoFix(P); render(); Router.go('generate'); toast('Palette built from the image and checked for contrast'); };

/* ================= harmony ================= */
function renderHarmony() {
  const base = $('#hBase').value, box = $('#harmonies');
  box.innerHTML = '';
  Object.keys(HARMONIES).forEach((k) => {
    const cols = harmony(base, k);
    box.append(h('div', { class: 'card harm' }, h('b', {}, k.replace(/-/g, ' ')),
      h('div', { class: 'strip' }, cols.map((hx) => h('div', { style: `background:${hx};color:${onColor(hx)}`, title: 'Copy ' + hx, onclick: () => navigator.clipboard.writeText(hx).then(() => toast('Copied ' + hx)) }, hx))),
      h('button', { class: 'btn sm', onclick: () => {
        const roles = ['primary', 'secondary', 'accent'];
        cols.slice(0, 3).forEach((hx, i) => { const c = P.colors.find((x) => x.role === roles[i]); if (c) { c.hex = hx; c.locked = true; } });
        autoFix(P); render(); Router.go('generate'); toast('Brand colors replaced and locked');
      } }, 'Apply')));
  });
}
$('#hBase').oninput = renderHarmony;

/* ================= library ================= */
function renderLibrary() {
  $('#libSummary').textContent = library.length ? `${library.length} saved` : 'Palettes you save from the Generate page appear here.';
  const box = $('#libList');
  box.innerHTML = '';
  library.forEach((e) => {
    const fails = auditPalette(e.palette).filter((r) => !r.ok).length;
    box.append(h('div', { class: 'card lib-card' },
      h('div', { class: 'strip' }, e.palette.colors.map((c) => h('i', { style: `background:${c.hex}`, title: `${c.role} ${c.hex}` }))),
      h('b', {}, e.palette.name), h('div', { class: 'small muted' }, e.prompt || ''),
      h('div', { class: 'small' }, fails ? h('span', { style: 'color:var(--bad)' }, `${fails} contrast issue${fails === 1 ? '' : 's'}`) : h('span', { style: 'color:var(--good)' }, 'Passes the contrast audit')),
      h('div', { class: 'row' }, h('button', { class: 'btn sm primary', onclick: () => { P = JSON.parse(JSON.stringify(e.palette)); if (e.prompt) $('#prompt').value = e.prompt; render(); Router.go('generate'); } }, 'Open'),
        h('button', { class: 'btn sm ghost', onclick: () => download(`${e.palette.name.replace(/\W+/g, '-')}.css`, exportCSS(e.palette), 'text/css') }, 'CSS'),
        h('button', { class: 'btn sm ghost danger', onclick: () => { library = library.filter((x) => x !== e); store.set('library', library); renderLibrary(); } }, 'Delete'))));
  });
}

/* ================= boot ================= */
Router.on('contrast', renderContrast);
Router.on('harmony', renderHarmony);
Router.on('library', renderLibrary);
render();
renderContrast();
renderHarmony();

/* ================= AI command box ================= */
const pickRole = (r) => { const c = P.colors.find((x) => x.role === String(r).toLowerCase()); if (!c) throw new Error(`No role "${r}". Roles: ${ROLES.join(', ')}`); return c; };
const fixReport = () => { const n = autoFix(P); render(); const fails = auditPalette(P).filter((r) => !r.ok).length; return (n.length ? `Adjusted ${n.join(', ')} to pass AA. ` : '') + (fails ? `${fails} pairs still fail.` : 'Every pair passes the audit.'); };
Copilot.register({
  context: () => `Palette "${P.name}" for brief "${$('#prompt').value}": ${P.colors.map((c) => `${c.role}=${c.hex}${c.locked ? ' (locked)' : ''}`).join(', ')}. Audit failures: ${auditPalette(P).filter((r) => !r.ok).map((r) => `${r.fg} on ${r.bg} ${r.ratio.toFixed(2)}`).join('; ') || 'none'}. Library has ${library.length} palettes.`,
  actions: [
    { name: 'generate_palette', description: 'Generate a new palette from a brief, then fix contrast. Locked colors are kept when keep_locked is true.', params: { brief: 'mood, brand or product description', keep_locked: 'true | false' },
      run: async ({ brief, keep_locked }) => { if (brief) $('#prompt').value = brief; Router.go('generate'); await generate(keep_locked === true || keep_locked === 'true'); return `Generated "${P.name}". ${fixReport()}`; } },
    { name: 'set_color', description: 'Set one role to an exact hex color and lock it', params: { role: ROLES.join(' | '), hex: '#rrggbb' },
      run: ({ role, hex }) => { const c = pickRole(role), n = normHex(hex); if (!n) throw new Error('Bad hex ' + hex); c.hex = n; c.locked = true; return `${c.role} is now ${n}. ${fixReport()}`; } },
    { name: 'adjust_color', description: 'Nudge a role in OKLCH: hue_shift in degrees (towards red/orange is warmer: negative for blues/greens, positive for purples), lightness and chroma deltas. Contrast is re-checked and fixed afterwards.', params: { role: ROLES.join(' | '), hue_shift: 'degrees, e.g. -20', lightness: 'delta 0-1 scale, e.g. -0.05', chroma: 'delta, e.g. 0.02' },
      run: ({ role, hue_shift, lightness, chroma }) => { const c = pickRole(role), [L, C, H] = toOklch(c.hex); c.hex = fromOklch(Math.max(0, Math.min(1, L + (+lightness || 0))), Math.max(0, C + (+chroma || 0)), (H + (+hue_shift || 0) + 360) % 360); c.locked = true; return `${c.role} is now ${c.hex}. ${fixReport()}`; } },
    { name: 'lock', description: 'Lock or unlock roles so regeneration keeps them', params: { roles: 'comma-separated roles', locked: 'true | false' }, run: ({ roles, locked }) => { String(roles).split(',').forEach((r) => (pickRole(r.trim()).locked = locked !== false && locked !== 'false')); render(); return 'Updated locks'; } },
    { name: 'fix_contrast', description: 'Adjust lightness so every text pair passes WCAG AA', params: {}, run: fixReport },
    { name: 'apply_harmony', description: 'Replace primary, secondary and accent with a color harmony from a base color', params: { base: '#rrggbb', kind: Object.keys(HARMONIES).join(' | ') },
      run: ({ base, kind }) => { const cols = harmony(normHex(base) || base, kind); ['primary', 'secondary', 'accent'].forEach((r, i) => { if (cols[i]) { const c = pickRole(r); c.hex = cols[i]; c.locked = true; } }); Router.go('generate'); return `Applied ${kind}. ${fixReport()}`; } },
    { name: 'show_export', description: 'Show the export code for the palette', params: { format: Object.keys(EXPORTS).join(' | ') },
      run: ({ format }) => { const k = String(format).toLowerCase(); if (!EXPORTS[k]) throw new Error('Formats: ' + Object.keys(EXPORTS).join(', ')); exKind = k; $$('#exTabs button').forEach((x) => x.classList.toggle('on', x.dataset.x === k)); Router.go('generate'); renderExport(); $('#exOut').scrollIntoView({ behavior: 'smooth', block: 'center' }); return `Showing ${k} export, ready to copy`; } },
    { name: 'preview_scheme', description: 'Preview the palette in light or dark mode', params: { scheme: 'light | dark' }, run: ({ scheme: s }) => { scheme = s === 'dark' ? 'dark' : 'light'; renderPreview(); renderAudit(); return `Previewing ${scheme} mode`; } },
    { name: 'check_contrast', description: 'Check two colors on the Contrast page', params: { text: '#rrggbb', background: '#rrggbb' }, run: ({ text, background }) => { setPair(normHex(text), normHex(background)); Router.go('contrast'); const r = contrast(normHex(text), normHex(background)); return `${r.toFixed(2)}:1, ${wcagLevel(r)}`; } },
    { name: 'save_palette', description: 'Save the current palette to the library', params: {}, run: () => { $('#savePal').click(); return 'Saved to the library'; } },
    { name: 'audit', query: true, description: 'Look up the full contrast audit and color-blindness conflicts', params: {}, run: () => JSON.stringify({ audit: auditPalette(P).map((r) => ({ pair: `${r.fg} on ${r.bg}`, ratio: +r.ratio.toFixed(2), apca: Math.round(r.apca), ok: r.ok })), cvd: ['Protanopia', 'Deuteranopia', 'Tritanopia'].map((k) => ({ k, confusable: confusablePairs(P.colors.filter((c) => BRAND.includes(c.role)), k) })) }) },
  ],
});
