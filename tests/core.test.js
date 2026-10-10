const pal = () => localPalette('calm fintech app, trustworthy but warm');

test('hex parsing and OKLCH round trips', () => {
  assert.eq(normHex('#ABC'), '#aabbcc'); assert.eq(normHex('12ab34'), '#12ab34'); assert.eq(normHex('xyz'), null);
  ['#3366cc', '#e11d48', '#0f9b6c', '#777777'].forEach((hx) => { const o = toOklch(hx); assert.eq(fromOklch(o[0], o[1], o[2]), hx); });
  const out = fromOklch(0.7, 0.4, 145);
  assert.ok(inGamut(hexToRgb(out)), 'out-of-gamut chroma is reduced');
  assert.near(toOklch(out)[2], 145, 3, 'hue is preserved while mapping into gamut');
});

test('WCAG contrast and levels', () => {
  assert.eq(contrast('#000000', '#ffffff'), 21);
  assert.near(contrast('#777777', '#ffffff'), 4.48, 0.01);
  assert.eq(wcagLevel(4.48), 'AA large'); assert.eq(wcagLevel(7.2), 'AAA'); assert.eq(wcagLevel(2), 'fail');
  assert.eq(onColor('#ffff00'), '#111111'); assert.eq(onColor('#000080'), '#ffffff');
});

test('APCA lightness contrast matches reference values', () => {
  assert.near(apca('#000000', '#ffffff'), 106.04, 0.1);
  assert.near(apca('#ffffff', '#000000'), -107.88, 0.1);
  const mid = apca('#888888', '#ffffff');
  assert.ok(mid > 60 && mid < 66, String(mid));
  assert.eq(apca('#777777', '#777777'), 0);
  assert.eq(apcaUse(80), 'body text'); assert.eq(apcaUse(-62), 'large text, labels');
});

test('nearestPassing finds the smallest lightness change that passes', () => {
  const fixed = nearestPassing('#999999', '#ffffff', 4.5);
  assert.ok(contrast(fixed, '#ffffff') >= 4.5);
  assert.ok(contrast(fixed, '#ffffff') < 4.8, 'stops close to the threshold');
  assert.eq(nearestPassing('#000000', '#ffffff', 4.5), '#000000');
  assert.ok(contrast(nearestPassing('#555555', '#222222', 4.5), '#222222') >= 4.5, 'lightens on dark backgrounds');
});

test('tonal scales and harmonies', () => {
  const s = tonalScale('#3366cc');
  assert.eq(s.length, 11);
  assert.ok(s.every((hx, i) => !i || toOklch(s[i - 1])[0] > toOklch(hx)[0]), 'lightness decreases');
  const t = harmony('#ff0000', 'triadic');
  assert.eq(t.length, 3);
  assert.ok(deltaE(t[0], '#ff0000') < 0.01);
  const dh = (toOklch(t[1])[2] - toOklch(t[0])[2] + 360) % 360;
  assert.near(dh, 120, 4);
  assert.eq(harmony('#3366cc', 'monochromatic').length, 3);
});

test('color-vision simulation', () => {
  const g = simulateCVD('#e41a1c', 'Achromatopsia');
  assert.ok(g.slice(1, 3) === g.slice(3, 5) && g.slice(3, 5) === g.slice(5, 7), 'grey');
  const before = deltaE('#e41a1c', '#4daf4a'), after = deltaE(simulateCVD('#e41a1c', 'Deuteranopia'), simulateCVD('#4daf4a', 'Deuteranopia'));
  assert.ok(after < before / 2, 'red and green move closer for deuteranopes');
  assert.deepEq(confusablePairs([{ role: 'a', hex: '#e41a1c' }, { role: 'b', hex: '#3366cc' }], 'Deuteranopia'), []);
  assert.eq(simulateCVD('#abcdef', 'Nope'), '#abcdef');
});

test('palette audit, auto-fix and dark variant', () => {
  const p = pal();
  p.colors.find((c) => c.role === 'muted').hex = '#b0b0b0';
  assert.ok(auditPalette(p).some((r) => r.fg === 'muted' && !r.ok));
  const changed = autoFix(p);
  assert.ok(changed.includes('muted'));
  assert.ok(auditPalette(p).filter((r) => r.fg === 'muted').every((r) => r.ok));
  const d = darkVariant(p);
  assert.near(toOklch(getColor(d, 'background'))[0], 0.17, 0.01);
  assert.ok(contrast(getColor(d, 'text'), getColor(d, 'background')) >= 7);
});

test('k-means extracts dominant image colors', () => {
  const px = [];
  for (let i = 0; i < 60; i++) px.push([255, 0, 0]);
  for (let i = 0; i < 40; i++) px.push([0, 0, 255]);
  const r = kmeans(px, 2, 3);
  assert.eq(r.length, 2);
  assert.ok(deltaE(r[0].hex, '#ff0000') < 0.01); assert.near(r[0].share, 0.6, 1e-9);
  assert.ok(deltaE(r[1].hex, '#0000ff') < 0.01);
  assert.eq(kmeans([], 3).length, 0);
  const p = paletteFromSwatches([{ hex: '#f4efe6' }, { hex: '#2a2420' }, { hex: '#c0392b' }, { hex: '#2e86c1' }]);
  assert.ok(toOklch(getColor(p, 'background'))[0] >= 0.96);
  assert.ok(toOklch(getColor(p, 'text'))[0] <= 0.25);
  assert.eq(p.colors.length, 7);
});

test('exports', () => {
  const p = pal();
  const css = exportCSS(p);
  assert.ok(css.includes('--color-primary: ') && css.includes('--primary-500: ') && css.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(exportSCSS(p).startsWith('$primary: #'));
  assert.ok(exportTailwind(p).includes('"500": "#'));
  assert.eq(JSON.parse(exportTokens(p)).color.text.$type, 'color');
  const svg = exportSVG(p);
  assert.ok(svg.startsWith('<svg'));
  assert.eq((svg.match(/<rect /g) || []).length, 7);
});
