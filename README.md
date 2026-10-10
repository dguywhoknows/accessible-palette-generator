# accessible-palette-generator

[![tests](https://github.com/dguywhoknows/accessible-palette-generator/actions/workflows/tests.yml/badge.svg)](https://github.com/dguywhoknows/accessible-palette-generator/actions/workflows/tests.yml)

AI color palettes from a mood or brand, checked with real color science: OKLCH tonal scales, a WCAG contrast matrix, auto-fix, color-blindness simulation and a live UI preview.

Live: https://dguywhoknows.github.io/accessible-palette-generator/

## Overview

Describe a brand or mood and the AI designs a 7-role UI palette (primary, secondary, accent, background, surface, text, muted). Everything after that is local color science. Colors are converted to OKLCH (Björn Ottosson's OKLab) to build perceptually even 50–950 tonal scales with gamut mapping. A WCAG 2.x contrast matrix grades every foreground/background pair, and auto-fix nudges OKLCH lightness until text passes AA. Machado-2009 color-blindness simulation flags key colors that become indistinguishable. A live preview shows the palette on a mock dashboard in light and a derived dark mode. You can lock colors and regenerate the rest, and export CSS variables, a Tailwind config or design tokens.

## Pages

- **Generate**
- **Contrast**
- **From image**
- **Harmony**
- **Library**
- **Settings**

## Features

- AI palette design for 7 semantic roles, with names and rationale
- Lock + regenerate: the AI harmonizes new colors around the ones you keep
- OKLCH conversion, chroma-curved tonal scales (50-950) with binary-search gamut mapping
- WCAG contrast matrix with AA/AAA/large badges; one-click auto-fix via lightness search
- Color-vision simulation (protan, deutan, tritan, achromat) with ΔE-OK confusion warnings
- Live product preview in light and auto-derived dark mode
- Exports: CSS custom properties (+ dark media query), Tailwind config, W3C design tokens
- APCA (WCAG 3 draft) lightness contrast shown next to the WCAG 2 ratio for every pairing, with usage guidance
- Contrast page: check any text/background pair with live samples at several sizes and get the closest passing text color for AA and AAA
- From image page: k-means clustering in OKLab on a downsampled image, with dominant colors mapped to UI roles and auto-fixed for contrast; the image stays in the browser
- Harmony page: complementary, analogous, triadic, split-complementary, tetradic and monochromatic sets built by rotating hue in OKLCH at constant lightness and chroma, applied to brand colors in one click
- Library page: saved palettes with a pass/fail contrast badge and CSS export
- SCSS and SVG swatch-sheet exports; the contrast audit now also covers the dark-mode variant

## How it works

LLM calls are used for:

- Brief → semantic palette (JSON), constrained for accessibility and harmony with locked colors

Everything else (all color math, contrast, scales, simulation, dark-mode derivation, exports) runs locally in the browser.

## Getting started

No build step and no dependencies. Serve the folder with any static server:

```bash
git clone https://github.com/dguywhoknows/accessible-palette-generator.git
cd accessible-palette-generator
python -m http.server 8000
```

Then open http://localhost:8000.

`index.html` is the public home page, `login.html` handles accounts and `app.html` is the app.

### Telling the app what to do

Every page has an **Ask AI** box (Ctrl/Cmd+K). Type a request in plain words and the model plans a sequence of
calls to the app's own functions, runs them and reports back. The **Instructions** tab stores standing
preferences that are added to every AI request the app makes.

### Configuration

`src/lib/config.js` is generated from the build settings: the Supabase project (accounts) and the AI proxy URL.
Signed-in users get the built-in AI through the proxy, which keeps the provider key as a server-side secret.
Without those settings the app runs for guests, in demo mode, or with a personal [Groq](https://console.groq.com/keys)
or [OpenRouter](https://openrouter.ai/keys) key entered under **Settings → Model provider** (stored only in this
browser and sent only to that provider).

## Testing

`src/core.js` holds the app's logic as pure functions and is covered by 9 unit tests.

```bash
node tests/run-node.js        # CI runs this on every push
```

Or open `tests/index.html` in a browser ([live](https://dguywhoknows.github.io/accessible-palette-generator/tests/)).

## Project structure

```
index.html           public home page (generated)
login.html           sign-in and sign-up (generated)
app.html             the app: markup for every page
src/app.js           UI, page wiring and event handlers
src/core.js          pure logic with no DOM access (unit-tested)
src/lib/ai.js        LLM client: Groq / OpenRouter, streaming, JSON mode, retries
src/lib/dom.js       DOM helpers, namespaced storage, markdown renderer
src/lib/router.js    hash router and the Settings page
src/lib/copilot.js   AI command box that drives the app's own functions
src/lib/auth.js      accounts (Supabase Auth) and the sign-in gate
styles/base.css      design tokens and shared components
styles/app.css       app-specific styles
tests/               unit tests (browser runner + Node runner for CI)
```

## Tech

- OKLab / OKLCH color space
- WCAG 2.x relative luminance
- Machado et al. (2009) CVD matrices
- Color science, contrast, simulation, k-means and exporters in src/core.js covered by unit tests run in the browser and in CI
- Vanilla JavaScript, no framework or bundler
- Deployed with GitHub Pages

## License

MIT
