const fs = require('fs');
const path = require('path');
const Typograf = require('typograf');
const MarkdownIt = require('markdown-it');
const mdContainer = require('markdown-it-container');
const matter = require('gray-matter');


// ─── Golden Ratio Constants ───
const phi = 1.618033988749895;
const sqrtPhi = Math.sqrt(phi);    // 1.272
const r = (n) => Math.round(n * 1000) / 1000; // round to 3 decimals — Heisenberg is fine with this

const P   = r(phi);              // 1.618 — h2, subtitle, button
const P2  = r(phi * phi);        // 2.618 — h1/hero
const P3  = r(phi * phi * phi);  // 4.236
const SP  = r(sqrtPhi);          // 1.272 — h3
const iP  = r(1 / phi);          // 0.618 — captions, slider values
const iP2 = r(1 / phi / phi);    // 0.382 — dots, micro text
const iSP = r(1 / sqrtPhi);      // 0.786 — small body, milestones, labels
const iP3 = r(1 / phi / phi / phi); // 0.236

const DESC = "We build products that make trust cheaper and fraud more expensive. A community driven by the understanding that win-win isn't idealism — it's a superior strategy.";
const OG_TITLE = 'n1.community — Weekly fixes for humanity';

// ─── DRY Functions ───

function dots(from, to, milestones = {}, leadFadeYears = 0) {
  const lines = [];
  // Reversed gradient: before the first milestone the years fade in from the
  // dark — the past keeps going back past where we can see it. Mirror of the
  // future timeline's fade-out. Nearest `from` is full; the deep past dissolves.
  for (let d = leadFadeYears; d >= 1; d--) {
    const year = from - d;
    const t = leadFadeYears > 1 ? (d - 1) / (leadFadeYears - 1) : 0; // 0 nearest -> 1 deepest
    const mult = (1 - t) * (1 - t);                                  // ease-out into the dark
    lines.push(`<p class="dot" style="opacity:${mult.toFixed(3)}">· <span class="dot-year">${year}</span></p>`);
  }
  for (let year = from; year <= to; year++) {
    if (milestones[year]) {
      lines.push(`<p class="milestone">· ${year} — ${milestones[year]}</p>`);
    } else {
      lines.push(`<p class="dot">· <span class="dot-year">${year}</span></p>`);
    }
  }
  return lines.join('\n');
}

function section(id, title, content) {
  return `
  <section id="${id}">
    ${title ? `<h2>${title}</h2>` : ''}
    ${content}
  </section>`;
}

function plane2D(id, xLabel, yLabel, initialX, initialY) {
  return `
  <div id="${id}" class="plane-2d">
    <div class="plane-y-label" aria-hidden="true">${yLabel} — <span class="plane-pct" id="${id}-pct-y">${initialY}%</span></div>
    <div class="plane-canvas-wrap">
      <div class="plane-canvas" role="application" tabindex="0"
           aria-label="${xLabel} and ${yLabel} interactive plane. Use arrow keys: left/right for ${xLabel}, up/down for ${yLabel}.">
        <div class="plane-line-h" style="bottom:${initialY}%" aria-hidden="true"></div>
        <div class="plane-line-v" style="left:${initialX}%" aria-hidden="true"></div>
        <div class="plane-point" style="left:${initialX}%;bottom:${initialY}%" aria-hidden="true"></div>
        <p class="plane-hint" aria-hidden="true">Drag responsibly</p>
        <div id="${id}-announce" class="sr-only" aria-live="polite" aria-atomic="true"></div>
      </div>
      <div class="plane-x-label" aria-hidden="true">${xLabel} — <span class="plane-pct" id="${id}-pct-x">${initialX}%</span></div>
    </div>
  </div>`;
}

function ctaBox(message, linkText, href) {
  return `
  <div class="cta-box">
    <p class="mb-phi">${message}</p>
    <a href="${href}" class="btn-scroll">${linkText}</a>
  </div>`;
}

function card(id, title, body) {
  return `<div id="${id}" class="card">
    <p class="card-title">${title}</p>
    ${body}
  </div>`;
}

function fig(src, alt, caption) {
  return `<figure class="fig">
          <img src="${src}" alt="${alt}" loading="lazy" />
          <figcaption>${caption}</figcaption>
        </figure>`;
}

function figGrid(figures) {
  return `<div class="fig-grid">\n        ${figures.join('\n        ')}\n      </div>`;
}

function meta(key, val) {
  const attr = key.startsWith('og:') ? 'property' : 'name';
  return `<meta ${attr}="${key}" content="${val}">`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      ensureDir(destPath);
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function items(arr, cls = 'mb-micro') {
  return arr.map((t, i) =>
    `<p${i < arr.length - 1 ? ` class="${cls}"` : ''}>${t}</p>`
  ).join('\n      ');
}

function logotype(className = 'hero-logotype') {
  const outerCount = 24;
  const innerCount = 6;
  const outerR = 44;
  const innerR = 15.4;
  const period = P3;
  const outerDots = [];
  const innerDots = [];

  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * 2 * Math.PI - Math.PI / 2;
    const x = r(50 + outerR * Math.cos(angle));
    const y = r(50 + outerR * Math.sin(angle));
    const delay = r(i / outerCount * period);
    outerDots.push(`<span class="logo-dot" style="left:${x}%;top:${y}%;animation-delay:${delay}s"></span>`);
  }

  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * 2 * Math.PI - Math.PI / 2;
    const x = r(50 + innerR * Math.cos(angle));
    const y = r(50 + innerR * Math.sin(angle));
    const delay = r(i / innerCount * period);
    innerDots.push(`<span class="logo-dot" style="left:${x}%;top:${y}%;animation-delay:${delay}s"></span>`);
  }

  return `<div class="${className}">
      <div class="logo-top">
        <span class="logo-n1">n1.</span>
        <div class="logo-circle">
          <div class="logo-ring logo-ring-outer">
            ${outerDots.join('\n            ')}
          </div>
          <div class="logo-ring logo-ring-inner">
            ${innerDots.join('\n            ')}
          </div>
        </div>
      </div>
      <span class="logo-community">community</span>
    </div>`;
}


// ─── Typography ───

const tp = new Typograf({locale: ['en-US']});
// Only enable nbsp rules — no quote/dash/other changes
Typograf.getRules().forEach(r => tp.disableRule(r.name));
Typograf.getRules()
  .filter(r => r.name.startsWith('common/nbsp/'))
  .forEach(r => tp.enableRule(r.name));

const NBSP = '&' + 'nbsp;';

function typographNbsp(html) {
  const parts = html.split(/(<script[\s\S]*?<\/script>)/gi);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // script block — leave untouched

    let result = tp.execute(part);
    return result.replace(/\u00a0/g, NBSP);
  }).join('');
}

// ─── Milestones Data ───

const pastMilestones = {
  1543: 'Heliocentric Model ☀️',
  1712: 'Atmospheric Steam Engine 🔥',
  1776: 'Declaration of Independence 📜',
  1876: 'Telephone 📞',
  1914: 'World War I ⚔️',
  1939: 'World War II ⚔️',
  1945: 'Nuclear Fission Weapon ☢️',
  1953: 'Double Helix Structure of DNA 🧬',
  1957: 'Sputnik 1 Launch 🛰️',
  1961: 'First Human in Space 🧑‍🚀',
  1965: 'First Spacewalk 🧑‍🚀',
  1969: 'First Human on the Moon 🌕',
  1973: 'Recombinant DNA Technology 🔬',
  1978: 'First IVF Baby 👶',
  1981: 'Inflationary Universe Theory 🌌',
  1983: 'GNU Project 💿', // also WarGames: "The only winning move is not to play." We disagree.
  1987: 'Black Monday Crash 📉',
  1989: 'World Wide Web 🌐',
  1991: 'Linux Kernel Released 🐧',
  1995: 'First Exoplanet Around a Sun-like Star 🪐',
  1997: 'Deep Blue vs. Kasparov ♟️',
  2001: 'Human Genome Sequence 🧪',
  2004: 'Mars Rovers Land 🤖',
  2007: 'iPhone 📱',
  2009: 'Bitcoin 🪙',
  2010: 'First Synthetic Cell Created 🧫',
  2012: 'CRISPR/Cas9 ✂️',
  2013: 'NSA Revelations 👀',
  2015: 'SpaceX Falcon 9 Landing 🚀',
  2016: 'AlphaGo vs. Lee Sedol 🎲',
  2017: 'Transformer Architecture 🤖',
  2018: 'CRISPR Human Embryo Editing 🧬',
  2019: 'COVID-19 🦠',
  2020: 'AlphaFold 🧪',
  2021: 'James Webb Space Telescope 🔭',
  2022: 'ChatGPT 💬',
  2023: 'Repeated Fusion Ignition ☀️',
  2024: 'First Complex Brain Connectome 🪰',
  2025: 'Humanoid Robots at Scale 🦿',
};

// ─── Markdown → HTML ───
//
// Content lives in content/*.md (one file per section, ordered by filename).
// build.js owns the shell, the CSS, the runtime JS, and the interactive
// component generators above; Markdown owns the words. The renderer below wires
// the two together through a custom tooltip inline rule and a set of container
// shortcodes that call straight back into the component functions.

const md = new MarkdownIt({ html: true, typographer: false });

// Inline tooltip:  ^[visible text](tip text)  ->  <span class="tooltip" data-tip="…">visible text</span>
// `^` is a markdown terminator char, so the text rule yields before it and lets
// this rule fire ahead of the link rule (which would otherwise eat `[…](…)`).
md.inline.ruler.before('link', 'tooltip', (state, silent) => {
  const src = state.src, start = state.pos;
  if (src.charCodeAt(start) !== 0x5E /* ^ */ || src.charCodeAt(start + 1) !== 0x5B /* [ */) return false;
  const labelEnd = src.indexOf(']', start + 2);
  if (labelEnd < 0 || src.charCodeAt(labelEnd + 1) !== 0x28 /* ( */) return false;
  const tipEnd = src.indexOf(')', labelEnd + 2);
  if (tipEnd < 0) return false;
  if (!silent) {
    let t = state.push('html_inline', '', 0);
    t.content = `<span class="tooltip" data-tip="${md.utils.escapeHtml(src.slice(labelEnd + 2, tipEnd))}">`;
    t = state.push('text', '', 0);
    t.content = src.slice(start + 2, labelEnd);
    t = state.push('html_inline', '', 0);
    t.content = '</span>';
  }
  state.pos = tipEnd + 1;
  return true;
});

// Plain wrapper containers — :::callout … ::: and :::small … :::
function wrapContainer(name, open, close) {
  md.use(mdContainer, name, {
    render: (tokens, idx) => tokens[idx].nesting === 1 ? open : close,
  });
}
wrapContainer('callout', '<div class="callout">\n', '</div>\n');
wrapContainer('small', '<div class="text-sm">\n', '</div>\n');

// Self-closing component shortcodes — the opening token renders the component,
// the body is empty. `info` carries any argument after the name (e.g. `section`).
function shortcode(name, fn) {
  md.use(mdContainer, name, {
    validate: params => params.trim().split(' ', 2)[0] === name,
    render: (tokens, idx) =>
      tokens[idx].nesting === 1 ? fn(tokens[idx].info.trim().slice(name.length).trim()) : '',
  });
}
shortcode('logotype', (arg) => arg === 'section' ? logotype('section-logotype') : logotype());
shortcode('timeline', () =>
  dots(1543, 2025, pastMilestones, 12) +
  `\n<p class="milestone">· 2026 — <span class='tooltip' data-tip='The universe is 13.8 billion years old and you got here just in time.'>What will you do?</span></p>`
);
shortcode('plane', () => `
  ${plane2D('plane', 'Easy to cooperate', 'Costs of deception', 30, 15)}

  <div id="future-timeline" class="mt-lg"></div>

  <div class="two-col mt-lg">
    ${card('card-wisdom', 'Gods with wisdom ✨', `<p>We build, we grow, we transcend.</p>`)}
    ${card('card-death', 'Humanity is gone 💀', `<p>Destruction outpaced cooperation.</p>`)}
  </div>

  <div class="box mt-lg">
    <p id="system-message" class="mb-phi"></p>
    <a href="#future" class="btn-scroll" onclick="this.blur()">Go back to the plane</a>
  </div>`);

// Layout containers for text-bearing cards (the "Who this is for" grid).
// Outer grid uses four colons so the three-colon cards nest inside it.
md.use(mdContainer, 'two-col', {
  render: (tokens, idx) => tokens[idx].nesting === 1 ? '<div class="two-col">\n' : '</div>\n',
});
md.use(mdContainer, 'card', {
  validate: params => params.trim().split(' ', 2)[0] === 'card',
  render: (tokens, idx) => {
    if (tokens[idx].nesting !== 1) return '</div>\n';
    const info = tokens[idx].info;
    const title = (info.match(/title="([^"]*)"/) || [, ''])[1];
    const id = (info.match(/id="([^"]*)"/) || [, ''])[1];
    return `<div${id ? ` id="${id}"` : ''} class="card">\n<p class="card-title">${title}</p>\n`;
  },
});

// ─── Content → pages ───
//
// Structure: content/<slug>/ is one page. Its .md files (sorted by name) are the
// page body — each wrapped per its `tag` frontmatter (section | header | raw |
// cta; default section). A `_page.md` (underscore = not rendered) carries
// page-level metadata (title/description/og…); everything it omits falls back to
// the site defaults below. Output + canonical URL derive from the slug, with the
// `home` page mapping to the site root.

const SITE = 'https://n1.community';

// Render every body file in a page dir (sorted; `_`-prefixed files are partials).
function renderBody(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map(file => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      const tag = data.tag || 'section';
      if (tag === 'cta') return ctaBox(data.message, data.linkText, data.href);
      const body = md.render(content);
      if (tag === 'header') return `<header>\n${body}</header>`;
      if (tag === 'raw') return body;
      return section(data.id, data.title, body);
    })
    .join('\n');
}

// Discover every page (each subdir of content/) and resolve its shell inputs.
function discoverPages() {
  const root = path.join(__dirname, 'content');
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
    .map(slug => {
      const dir = path.join(root, slug);
      const metaFile = path.join(dir, '_page.md');
      const m = fs.existsSync(metaFile) ? matter(fs.readFileSync(metaFile, 'utf8')).data : {};
      const isHome = slug === 'home';
      const url = m.canonical || (isHome ? SITE + '/' : `${SITE}/${slug}/`);
      return {
        out: isHome ? 'index.html' : `${slug}/index.html`,
        article: renderBody(dir),
        title: m.title || OG_TITLE,
        description: m.description || DESC,
        canonical: url,
        ogTitle: m.ogTitle || m.title || OG_TITLE,
        ogUrl: m.ogUrl || url,
        ogType: isHome ? 'website' : 'article',
        isHome,
      };
    });
}

// ─── Build HTML ───
//
// One shell, many pages. Everything below is byte-identical across pages — the
// CSS, the living-planet background, every script — and is shared verbatim. The
// only per-page inputs are the rendered `article` body and the head metadata
// (title/description/canonical/og), so a "page" is just that pair.

function pageShell({ title, description, canonical, ogTitle, ogUrl, ogType, isHome, article }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${meta('description', description)}
  ${meta('keywords', 'n1, community, cooperation, win-win, coordination, humanity, mission-driven')}
  ${meta('author', 'n1.community')}
  ${meta('robots', 'index, follow, max-image-preview:large')}
  <link rel="canonical" href="${canonical}">

  <!-- Open Graph -->
  ${meta('og:type', ogType)}
  ${meta('og:url', ogUrl)}
  ${meta('og:title', ogTitle)}
  ${meta('og:description', description)}
  ${meta('og:image', 'https://n1.community/web-app-manifest-512x512.png')}
  ${meta('og:site_name', 'n1.community')}
  ${meta('og:locale', 'en_US')}

  <!-- Twitter Card -->
  ${meta('twitter:card', 'summary')}
  ${meta('twitter:title', ogTitle)}
  ${meta('twitter:description', description)}
  ${meta('twitter:image', 'https://n1.community/web-app-manifest-512x512.png')}

  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="n1" />
  <meta name="theme-color" content="#04060c">
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="stylesheet" href="/static/style.css">
  <style>
    @font-face {
      font-family: 'Playfair';
      src: url('/static/fonts/Playfair/Playfair-VariableFont_opsz,wdth,wght.ttf') format('truetype');
      font-weight: 300 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Playfair';
      src: url('/static/fonts/Playfair/Playfair-Italic-VariableFont_opsz,wdth,wght.ttf') format('truetype');
      font-weight: 300 900;
      font-style: italic;
      font-display: swap;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url('/static/fonts/Playfair_Display/PlayfairDisplay-VariableFont_wght.ttf') format('truetype');
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url('/static/fonts/Playfair_Display/PlayfairDisplay-Italic-VariableFont_wght.ttf') format('truetype');
      font-weight: 400 900;
      font-style: italic;
      font-display: swap;
    }
    @font-face {
      font-family: 'Space Grotesk';
      src: url('/static/fonts/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf') format('truetype');
      font-weight: 300 700;
      font-style: normal;
      font-display: swap;
    }

    /* ─── Theme: a journey from deep space to heaven ─── */
    /* One scalar — --lp (light progress, 0..1) — drives the whole palette. It
       starts at 0 (the original deep-space dark) and is eased to 1 by scroll
       once the "future" section is behind you, turning the world into a
       luminous white heaven. Every token is the SAME perceptual (oklab) mix
       between its dark endpoint and its light endpoint, so there is exactly one
       source of truth and the transition stays even across hue and lightness. */
    @property --lp {
      syntax: '<number>';
      inherits: true;
      initial-value: 0;
    }
    :root {
      --lp: 0;                         /* set by JS on scroll (smoothed in rAF) */
      --m: calc(var(--lp) * 100%);     /* the mix amount, reused everywhere */

      --bg:          color-mix(in oklab, #04060c,             #ffffff             var(--m));
      --fg:          color-mix(in oklab, #eef1f8,             #0a0e1a             var(--m));
      --muted:       color-mix(in oklab, rgba(238,241,248,0.62), rgba(10,14,26,0.60) var(--m));
      --panel:       color-mix(in oklab, rgba(10,14,26,0.52),  rgba(245,247,252,0.72) var(--m));
      --panel-solid: color-mix(in oklab, #0c1018,             #f2f4f9             var(--m));
      --line:        color-mix(in oklab, rgba(238,241,248,0.22), rgba(10,14,26,0.20) var(--m));
      --line-strong: color-mix(in oklab, rgba(238,241,248,0.55), rgba(10,14,26,0.45) var(--m));
      --outline:     color-mix(in oklab, #ffffff,             #0a0e1a             var(--m));
      --accent:      color-mix(in oklab, #eef1f8,             #0a0e1a             var(--m));
      --glow:        color-mix(in oklab, rgba(238,241,248,0.45), rgba(10,14,26,0.40) var(--m));
      color-scheme: light dark;
    }

    /* ─── Reset ─── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ::selection { background: var(--fg); color: var(--bg); text-shadow: none; }

    /* ─── Fixed, always-interactive planet background ─── */
    /* Static deep-space gradient: the fallback if WebGL is unavailable; the
       canvas paints over it when the shader runs. */
    html {
      font-size: 24px;
      scroll-behavior: smooth;
      overscroll-behavior: none;
      background:
        radial-gradient(120% 90% at 50% 8%,
          color-mix(in oklab, #0a1430, #ffffff var(--m)) 0%,
          color-mix(in oklab, #060a18, #eef3fc var(--m)) 38%,
          color-mix(in oklab, #04060c, #e3ebf7 var(--m)) 70%,
          color-mix(in oklab, #020306, #dae4f4 var(--m)) 100%);
    }
    /* Clip container. CSS height is the largest stable viewport (lvh) as the
       fallback when JS/visualViewport is unavailable. On mobile, pinSky() (see
       JS) makes the wrap slightly oversized at the BOTTOM so a stale vv.height
       mid-scroll (Chrome-Android bar hiding) can never leave a gap. That is safe
       and adds NO scrollable area: position:fixed never contributes to
       scrollHeight, overflow:hidden clips the overscan so it can't be panned
       into view, and overscroll-behavior:none kills rubber-band reveal (the old
       bug, when the canvas itself was oversized + fixed). */
    #sky-wrap {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      height: 100lvh;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }
    /* Canvas overscans INSIDE the clip — fills the edges with margin so there is
       never a gap during a bar transition, but the overflow is clipped, not
       scrollable. */
    #sky-bg {
      position: absolute;
      top: -10%;
      left: 0;
      width: 100%;
      height: 120%;
      display: block;
      border: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      #sky-wrap { display: none; }
    }

    /* ─── Base ─── */
    body {
      font-family: 'Playfair', serif;
      color: var(--fg);
      background: transparent;
      line-height: ${P};
      overflow-wrap: break-word;
      /* dark text needs a light halo; light text a dark one — transition both */
      text-shadow:
        0 1px 3px color-mix(in srgb, rgba(0,0,0,0.55), rgba(255,255,255,0.85) var(--m)),
        0 0 18px color-mix(in srgb, rgba(0,0,0,0.25), rgba(255,255,255,0.55) var(--m));
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: "liga" 1, "kern" 1;
    }

    /* ─── Typography ─── */
    h1, h2, h3, h4, h5, h6, .subtitle, .callout, .card-title {
      font-family: 'Playfair Display', serif;
      line-height: 1.2;
      text-wrap: balance;
      text-rendering: optimizeLegibility;
    }
    h1 {
      font-size: ${P2}rem;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: ${P}rem;
    }
    h2 {
      font-size: ${P}rem;
      margin-bottom: ${P}rem;
    }
    h3 {
      font-size: ${SP}rem;
      margin-top: ${P2}rem;
      margin-bottom: ${iP}rem;
    }
    h4 {
      margin-top: ${iP}rem;
      margin-bottom: ${iP2}rem;
    }
    .subtitle {
      font-size: ${P}rem;
      margin-bottom: ${P}rem;
    }
    .callout {
      font-size: ${SP}rem;
      margin-bottom: ${P}rem;
    }
    .text-sm {
      font-size: ${iSP}rem;
    }
    .tooltip {
      position: relative;
      cursor: help;
      border-bottom: 1px dotted currentColor;
      display: inline-block;
    }
    .tooltip::after {
      content: attr(data-tip);
      position: absolute;
      left: var(--tt-left, 0px);
      top: 100%;
      margin-top: 0.4em;
      background: var(--panel-solid);
      color: var(--fg);
      border: 1px solid var(--line);
      font-size: ${iP}rem;
      line-height: 1.4;
      padding: 0.4em 0.7em;
      border-radius: 0.25em;
      width: max-content;
      max-width: 200px;
      white-space: normal;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10;
    }
    .tooltip:hover::after,
    .tooltip:focus::after {
      opacity: 1;
    }

    /* ─── Links ─── */
    article a:not(.btn-scroll) {
      color: var(--fg);
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 0.2em;
      text-decoration-skip-ink: auto;
      transition: text-decoration-thickness 0.2s ease, text-underline-offset 0.2s ease;
    }
    article a:not(.btn-scroll):hover {
      opacity: 0.7;
    }
    article a:not(.btn-scroll):focus-visible {
      outline: 1px solid var(--fg);
      outline-offset: 0.15em;
    }

    /* ─── Layout ─── */
    article {
      max-width: 38em;
      margin: 0 auto;
      padding: ${P2}rem ${P}rem;
    }
    .hero-logotype {
      margin-top: ${P2}rem;
      margin-bottom: ${P3}rem;
      display: inline-block;
    }
    .section-logotype {
      margin-top: ${P3}rem;
      margin-bottom: 0;
      display: inline-block;
    }
    .logo-top {
      display: flex;
      align-items: flex-end;
      gap: ${iP3}rem;
    }
    .logo-n1 {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: ${SP}rem;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .logo-circle {
      position: relative;
      width: ${r(SP * P3 * P)}rem;
      height: ${r(SP * P3 * P)}rem;
      flex-shrink: 0;
    }
    .logo-ring {
      position: absolute;
      inset: 0;
    }
    .logo-ring-outer {
      animation: spin 60s linear infinite;
    }
    .logo-ring-inner {
      animation: spin ${r(60 / P)}s linear infinite reverse;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes breathe {
      0%, 100% { opacity: 0.12; transform: translate(-50%, -50%) rotate(0deg); }
      50% { opacity: 0.55; transform: translate(-50%, -50%) rotate(45deg); }
    }
    .logo-dot {
      position: absolute;
      width: ${iP}rem;
      height: ${iP}rem;
      background: transparent;
      border: 1px solid var(--line-strong);
      transform: translate(-50%, -50%);
      opacity: 0.12;
      animation: breathe ${P3}s ease-in-out infinite;
    }
    .logo-community {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: ${SP}rem;
      line-height: 1;
      display: block;
      margin-top: ${iP3}rem;
    }
    header {
      margin-bottom: ${P3}rem;
    }
    section {
      margin-top: ${P3}rem;
    }
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: ${P}rem;
      align-items: stretch;
    }

    /* ─── Spacing (phi-derived) ─── */
    /* Fibonacci walked into a bar. 1, 1, 2, 3, 5 people were already there. */
    .mb-phi { margin-bottom: ${P}rem; }
    .mb-sm { margin-bottom: ${iP}rem; }
    .mb-micro { margin-bottom: ${iP2}rem; }
    .mt-phi { margin-top: ${P}rem; }
    .mt-sm { margin-top: ${iP}rem; }
    .mt-lg { margin-top: ${P2}rem; }
    .mb-lg { margin-bottom: ${P2}rem; }

    /* ─── Markdown content rhythm (semantic, classless) ─── */
    /* Component-emitted elements keep their utility classes; Markdown output is
       classless, so the golden-ratio rhythm rides on element + sibling selectors. */
    article p:not([class]),
    article ul:not([class]),
    article ol:not([class]),
    article .text-sm { margin-bottom: ${P}rem; }
    article ol:not([class]) { list-style: decimal inside; padding-left: 0; }
    article ol:not([class]) li::marker { font-weight: 700; }
    article ul:not([class]) { list-style: none; padding-left: 0; }
    article li { margin-bottom: ${iP2}rem; }
    article li:last-child { margin-bottom: 0; }
    article .callout > p { margin: 0; }
    article .text-sm > p:not([class]) { margin-bottom: ${iP2}rem; }
    article .text-sm > p:last-child { margin-bottom: 0; }
    section > :last-child,
    header > :last-child,
    .card > :last-child,
    .box > :last-child { margin-bottom: 0; }

    /* ─── Code & rules (long-form docs) ─── */
    /* Tailwind Preflight gives monospace but no surface; give inline code a quiet
       chip and fenced blocks a scrollable panel so long lines never overflow. */
    article :not(pre) > code {
      font-family: 'Space Grotesk', ui-monospace, monospace;
      font-size: ${iSP}rem;
      padding: 0.1em 0.35em;
      border: 1px solid var(--line);
      border-radius: 0.2em;
      background: var(--panel);
    }
    article pre {
      font-size: ${iSP}rem;
      line-height: ${P};
      padding: ${iP}rem;
      margin-bottom: ${P}rem;
      border: 1px solid var(--line);
      border-radius: 0.25rem;
      background: var(--panel);
      overflow-x: auto;
    }
    article pre code {
      font-family: 'Space Grotesk', ui-monospace, monospace;
      border: 0;
      padding: 0;
      background: none;
      white-space: pre;
    }
    article hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: ${P}rem 0;
    }

    /* ─── Tables (long-form docs) ─── */
    /* Markdown tables are classless; Preflight strips all chrome, so they
       inherit the loose body line-height with no padding or rules. Give them a
       tight, full-width grid: header underlined by --line-strong, rows split by
       --line, cells top-aligned with breathing room on the golden scale. */
    article table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${iSP}rem;
      line-height: 1.4;
      margin-bottom: ${P}rem;
      text-wrap: pretty;
    }
    article thead th {
      text-align: left;
      font-weight: 700;
      padding: ${iP2}rem ${iP}rem;
      border-bottom: 1px solid var(--line-strong);
    }
    article tbody th,
    article tbody td {
      vertical-align: top;
      text-align: left;
      padding: ${iP2}rem ${iP}rem;
      border-bottom: 1px solid var(--line);
    }
    article tbody th {
      font-weight: 700;
      white-space: nowrap;
    }
    article tbody tr:last-child th,
    article tbody tr:last-child td { border-bottom: 0; }
    article th:first-child,
    article td:first-child { padding-left: 0; }
    article th:last-child,
    article td:last-child { padding-right: 0; }
    @media (max-width: 28em) {
      article table { font-size: ${iP}rem; }
      article tbody th { white-space: normal; }
    }

    /* ─── Figures ─── */
    .fig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${P}rem;
      margin: ${P}rem 0;
    }
    .fig {
      margin: 0;
    }
    .fig img {
      width: 100%;
      height: auto;
      display: block;
      border: 1px solid var(--line);
    }
    .fig figcaption {
      font-size: ${iSP}rem;
      margin-top: ${iP3}rem;
      line-height: ${P};
    }
    @media (max-width: 28em) {
      .fig-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ─── Components ─── */
    .card, .box, .cta-box {
      border: 1px solid var(--outline);
      padding: ${P}rem;
      background: transparent;
      border-radius: 0.25rem;
    }
    .card { transition: opacity 0.3s; }
    .card-title {
      font-size: ${SP}rem;
      margin-bottom: ${P}rem;
    }
    .cta-box { margin-top: ${P3}rem; }
    .plane-2d {
      display: flex;
      align-items: stretch;
      margin: ${P}rem 0;
      gap: ${iP2}rem;
      max-width: 65vw;
    }
    .plane-y-label {
      writing-mode: vertical-lr;
      transform: rotate(180deg);
      font-size: ${iSP}rem;
      text-align: center;
      white-space: nowrap;
    }
    .plane-canvas-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: ${iP2}rem;
    }
    .plane-canvas {
      position: relative;
      width: min(20rem, 100%);
      aspect-ratio: 1;
      border: 1px solid var(--outline);
      background: transparent;
      border-radius: 0.25rem;
      cursor: crosshair;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    }
    .plane-line-h, .plane-line-v {
      position: absolute;
      pointer-events: none;
      background: var(--line-strong);
    }
    .plane-line-h {
      left: 0;
      right: 0;
      height: 1px;
    }
    .plane-line-v {
      top: 0;
      bottom: 0;
      width: 1px;
    }
    .plane-point {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--fg);
      transform: translate(-50%, 50%);
      cursor: grab;
      touch-action: none;
      z-index: 1;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      animation: pulse 2s ease-in-out infinite;
    }
    .plane-point:active, .plane-point.dragging {
      cursor: grabbing;
      transform: translate(-50%, 50%) scale(1.4);
      animation: none;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 var(--glow); }
      50% { box-shadow: 0 0 0 12px transparent; }
    }
    .plane-x-label {
      font-size: ${iSP}rem;
      text-align: center;
    }
    .plane-hint {
      position: absolute;
      left: 30%;
      bottom: 15%;
      transform: translate(1rem, -0.5rem);
      font-size: ${iSP}rem;
      color: var(--muted);
      white-space: nowrap;
      pointer-events: none;
      z-index: 2;
      transition: opacity 0.3s;
    }
    .plane-hint.hidden {
      opacity: 0;
    }

    /* ─── Timeline ─── */
    .dot, .milestone {
      font-size: ${iP2}rem;
      line-height: 1.1;
      margin: 0;
      padding: 0;
    }
    .dot-year {
      font-size: ${iP}rem;
      opacity: 0.30;
    }
    .milestone {
      font-size: ${iSP}rem;
      line-height: ${P};
      padding: ${iP3}rem 0;
    }

    /* ─── Controls ─── */
    .btn-scroll {
      display: block;
      margin-top: ${P}rem;
      padding: ${iP}rem ${P}rem;
      border: 1px solid var(--outline);
      text-align: center;
      text-decoration: none;
      color: var(--fg);
      font-size: ${P}rem;
      line-height: 1.2;
      background: transparent;
      border-radius: 0.25rem;
    }
    /* Transition only on hover so the per-frame --fg/--bg theme shift does not
       re-trigger a color/background transition on every scroll frame. */
    .btn-scroll:hover {
      background: var(--fg);
      color: var(--bg);
      text-shadow: none;
      transition: background 0.2s, color 0.2s;
    }
    .btn-scroll:focus-visible {
      outline: 1px solid var(--fg);
      outline-offset: ${iP2}rem;
    }
    .btn-scroll:active {
      opacity: 0.8;
    }

    /* ─── Responsive ─── */
    @media (max-width: 600px) {
      html { font-size: 20px; }
    }
    @media (max-width: 380px) {
      html { font-size: 18px; }
    }

    /* ─── Overrides ─── */
    #future {
      scroll-margin-top: ${iP2}rem;
      padding-top: ${P3}rem;
      margin-top: 0 !important;
    }

    /* ─── Accessibility ─── */
    .skip-link {
      position: absolute;
      top: -100%;
      left: 0;
      padding: 0.4em 0.8em;
      background: var(--fg);
      color: var(--bg);
      text-shadow: none;
      z-index: 9999;
      font-size: ${iSP}rem;
      text-decoration: none;
    }
    .skip-link:focus { top: 0; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
  </style>
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE + "/#organization",
        "name": "n1.community",
        "url": SITE,
        "logo": SITE + "/web-app-manifest-512x512.png",
        "description": DESC,
        "sameAs": ["https://t.me/Oresty"]
      },
      {
        "@type": "WebSite",
        "@id": SITE + "/#website",
        "name": "n1.community",
        "url": SITE,
        "publisher": { "@id": SITE + "/#organization" }
      },
      {
        "@type": "WebPage",
        "@id": canonical + "#webpage",
        "url": canonical,
        "name": ogTitle,
        "description": description,
        "isPartOf": { "@id": SITE + "/#website" },
        ...(isHome ? {} : {
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/" },
              { "@type": "ListItem", "position": 2, "name": title, "item": canonical }
            ]
          }
        })
      }
    ]
  })}
  </script>
  <!-- If you're a crawler: we see you. If you're a human reading structured data for fun — we like you already. -->
  <!-- Yandex.Metrika counter -->
  <script type="text/javascript">
      (function(m,e,t,r,i,k,a){
          m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
      })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108223787', 'ym');

      ym(108223787, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
  </script>
  <noscript><div><img src="https://mc.yandex.ru/watch/108223787" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
  <!-- /Yandex.Metrika counter -->
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-FM6ZVZ3Y22"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-FM6ZVZ3Y22');
  </script>
</head>
<body>
  <!-- You're reading the source. That's either professional curiosity or existential procrastination. Either way, welcome. -->
  <div id="sky-wrap" aria-hidden="true"><canvas id="sky-bg"></canvas></div>
  <a href="#content" class="skip-link">Skip to main content</a>
  <main id="content">
  <article>
${article}
  </article>
  </main>
  <!-- ─── Living planet background: physically-based atmospheric scattering ───
       Raw WebGL2, single fullscreen triangle. Rayleigh + Mie + ozone, raymarched.
       Hidden storytelling: the planet IS "the system for humanity". Cooperation,
       openness and win-win (benefit) lift the sun and clear the sky; deception
       (harm) sinks it into haze and night. The transfer function is asymmetric —
       it is easier to grow the light through benefit than to drag it into dark. -->
  <script>
  (function () {
    var canvas = document.getElementById('sky-bg');
    if (!canvas) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gl = null;
    try {
      if (!reduce) gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) { canvas.style.display = 'none'; return; } // CSS gradient fallback shows

    var VERT = \`#version 300 es
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }\`;

    var FRAG = \`#version 300 es
    precision highp float;
    out vec4 fragColor;

    uniform vec2  uRes;
    uniform float uTime;
    uniform vec3  uSunDir;     // normalized world-space sun direction
    uniform vec3  uCamPos;     // camera position, metres from planet centre
    uniform float uPitch;      // camera pitch below horizon (scroll-driven)
    uniform vec2  uParallax;   // subtle pointer tilt
    uniform float uHaze;       // Mie multiplier — rises with harm
    uniform float uCity;       // night-side civilisation lights — rises with benefit
    uniform float uHealth;     // system-health 0..1 — drives surface albedo (biosphere)
    uniform float uLight;      // theme 0..1 — 0 = dark space (top), 1 = white "heaven"
    uniform float uMood;       // plane 0..1 — sweeps the grade hue
    uniform float uHueA;       // grade hue at mood=0 (random per reload)
    uniform float uHueB;       // grade hue at mood=1 (analogous to uHueA)

    const float PI   = 3.141592653589793;
    const float Rp   = 6371000.0;            // planet radius (m)
    const float Ra   = 6471000.0;            // atmosphere radius (m)
    const vec3  bR   = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Rayleigh scattering
    const vec3  bM   = vec3(3e-6);           // Mie scattering
    const vec3  bO   = vec3(0.65e-6, 1.88e-6, 0.08e-6); // ozone absorption
    const float shR  = 8000.0;               // Rayleigh scale height
    const float shM  = 1200.0;               // Mie scale height
    const float g    = 0.76;                 // Mie anisotropy
    const float iSun = 22.0;                 // sun intensity
    const int   PRIMARY = 16;
    const int   LIGHT   = 8;

    // ray vs sphere centred at origin; returns (near, far), near>far if miss
    vec2 rsi(vec3 ro, vec3 rd, float r) {
      float b = dot(ro, rd);
      float c = dot(ro, ro) - r * r;
      float d = b * b - c;
      if (d < 0.0) return vec2(1e20, -1e20);
      d = sqrt(d);
      return vec2(-b - d, -b + d);
    }

    float hash13(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vnoise(vec3 p) {
      vec3 i = floor(p); vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      vec2 e = vec2(0.0, 1.0);
      return mix(
        mix(mix(hash13(i + e.xxx), hash13(i + e.yxx), f.x),
            mix(hash13(i + e.xyx), hash13(i + e.yyx), f.x), f.y),
        mix(mix(hash13(i + e.xxy), hash13(i + e.yxy), f.x),
            mix(hash13(i + e.xyy), hash13(i + e.yyy), f.x), f.y),
        f.z);
    }
    float fbm(vec3 p) {
      float s = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; }
      return s;
    }

    // Iridescent "heaven" palette. A cosine palette (Inigo Quilez form) tuned
    // for ethereal jewel tones — luminous teal → cyan → periwinkle → violet →
    // rose → gold — never muddy. High bias (a) keeps every hue bright and
    // surreal; moderate amplitude (b) keeps it pastel-luminous, not garish.
    vec3 heaven(float t) {
      return vec3(0.62, 0.60, 0.72)
           + vec3(0.34, 0.32, 0.34) * cos(6.28318530718 * (t + vec3(0.00, 0.12, 0.55)));
    }
    // Star field: three depth layers of round, anti-aliased stars, each with a
    // tight core + soft bloom, a unique heaven-palette hue, and gentle twinkle.
    //   col  — colored radiance (used additively for the dark night sky).
    //   mask — a CRISP per-star coverage (sharp dot + tight halo, NO wide bloom)
    //          so the light/heaven theme can stamp clean jewel points on white
    //          instead of the wide grey smudges a soft bloom would leave.
    vec3 stars(vec3 rd, out float mask) {
      vec3 col = vec3(0.0);
      mask = 0.0;
      for (float s = 0.0; s < 3.0; s += 1.0) {
        float sc = 58.0 + s * 92.0;
        vec3 p = rd * sc;
        vec3 id = floor(p);
        vec3 f = fract(p) - 0.5;
        float n = hash13(id + s * 19.0);
        float present = step(0.92 + s * 0.028, n);
        float d = length(f);
        float core = smoothstep(0.11, 0.0, d);
        float bloom = smoothstep(0.30, 0.0, d) * 0.06; // faint halo (dark sky only)
        float tw = 0.65 + 0.35 * sin(uTime * 1.4 + n * 40.0);
        vec3 hue = heaven(fract(n * 7.3) + uTime * 0.012 + s * 0.21);
        float bright = (0.4 + 0.6 * fract(n * 13.1)) * (1.0 - s * 0.26);
        col += hue * present * (core + bloom) * tw * bright;
        // crisp dot + a tight, faint halo — clean enough to read on white
        float pt = present * tw * (core + smoothstep(0.16, 0.0, d) * 0.05);
        mask = max(mask, pt);
      }
      return col;
    }

    float density(float h, float scale) { return exp(-max(h, 0.0) / scale); }
    // ozone: triangular band peaking ~25 km
    float ozone(float h) { return max(0.0, 1.0 - abs(h - 25000.0) / 25000.0); }

    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    // ACES filmic (Narkowicz fit) + gamma: physical radiance → display 0..1.
    vec3 tonemap(vec3 c) {
      c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
      return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
    }

    // ── One composite for both themes (uLight blends between them) ──────────
    //   DARK  (uLight=0): the original deep-space look — scene on black, with
    //                     luminous colored stars added on top.
    //   LIGHT (uLight=1): a white "heaven" — the scene is mixed toward #fff by
    //                     its own luminance (so it stays light enough for dark
    //                     text), and stars become saturated jewel specks.
    //   sceneRad  — planet/atmosphere radiance.
    //   star      — atmosphere-attenuated star radiance (its hue/glow).
    //   starMask  — crisp star coverage 0..1 (see stars()).
    // pure hue (0..1) → saturated rgb. Never gray for any input.
    vec3 hue2rgb(float h) {
      h = fract(h);
      return clamp(vec3(abs(h * 6.0 - 3.0) - 1.0,
                        2.0 - abs(h * 6.0 - 2.0),
                        2.0 - abs(h * 6.0 - 4.0)), 0.0, 1.0);
    }
    // ── Plane-driven colour grade ──────────────────────────────────────────
    //   The 2D planes are the user's hands on the system. Dragging them sweeps a
    //   single hue along an ANALOGOUS arc (uHueA→uHueB), random each reload. We
    //   interpolate the HUE, not two RGB tints — so the grade is a saturated
    //   colour at EVERY mood value and can never wash out to gray. Luminance is
    //   preserved, so it shifts hue, not exposure.
    vec3 grade(vec3 c) {
      vec3 hr  = hue2rgb(mix(uHueA, uHueB, uMood));
      float m  = (hr.r + hr.g + hr.b) / 3.0;
      vec3 tint = vec3(1.0) + 0.55 * (hr - vec3(m));   // chromatic, averages ~1
      vec3 g    = c * tint;
      g *= (luma(c) + 1e-4) / (luma(g) + 1e-4);         // keep exposure
      // guarantee a colour floor even on near-gray scene pixels
      float L = luma(g);
      return mix(g, mix(vec3(L), g, 1.6), 0.5);          // gentle chroma lift
    }

    vec3 composite(vec3 sceneRad, vec3 star, float starMask) {
      vec3 base  = grade(tonemap(sceneRad));
      vec3 lightScene = mix(vec3(1.0), base, min(luma(base), 0.85));

      // DARK theme: the original night sky with additive colored star glow.
      vec3 darkOut = base + star;

      // LIGHT theme: stamp a vivid, SATURATED jewel where a star core is. pow()
      // deepens the off-hue channels so the dot reads as a true colour (not a
      // washed pastel) on the white heaven; the crisp mask keeps it a point.
      float m = max(star.r, max(star.g, star.b));
      vec3 hue = star / max(m, 1e-4);                 // unit-bright star hue
      vec3 jewel = pow(hue, vec3(1.7)) * 0.92;        // saturated, reads on white
      starMask *= 0.45;                               // fainter stars on white heaven
      vec3 lightOut = mix(lightScene, jewel, clamp(starMask, 0.0, 1.0));

      return mix(darkOut, lightOut, uLight);
    }

    // extinction per metre at altitude h (scattering + absorption)
    vec3 extinction(float h) {
      return bR * density(h, shR) + bM * uHaze * density(h, shM) + bO * ozone(h);
    }

    // optical depth from a point toward the sun (light march); false if shadowed
    bool lightOD(vec3 p, vec3 sun, out vec3 od) {
      od = vec3(0.0);
      if (rsi(p, sun, Rp).x > 0.0) return false; // planet blocks the sun
      float dt = rsi(p, sun, Ra).y / float(LIGHT);
      for (int i = 0; i < LIGHT; i++) {
        vec3 s = p + sun * (float(i) + 0.5) * dt;
        od += extinction(length(s) - Rp) * dt;
      }
      return true;
    }

    void main() {
      // Normalise by the SHORTER axis so framing is consistent in portrait and
      // landscape (mobile-first): on tall phones this reveals more sky/limb
      // vertically instead of zooming the scene in.
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

      // ── camera basis: altitude along +Y, looking toward the horizon ──
      vec3 up0 = vec3(0.0, 1.0, 0.0);
      vec3 cam = uCamPos;
      float pitch = uPitch + uParallax.y * 0.05;
      vec3 fwd = normalize(vec3(0.0, -sin(pitch), -cos(pitch)));
      vec3 right = normalize(cross(fwd, up0));
      vec3 cup = cross(right, fwd);
      float fov = 1.15;
      vec3 rd = normalize(fwd + (right * (uv.x + uParallax.x * 0.06) + cup * uv.y) * fov);

      vec3 sun = normalize(uSunDir);

      vec2 atm = rsi(cam, rd, Ra);
      vec2 pl  = rsi(cam, rd, Rp);
      bool hitPlanet = (pl.x > 0.0 && pl.x < atm.y);

      vec3 color = vec3(0.0);
      float starMask;
      vec3 bg = stars(rd, starMask); // deep-space stars sitting behind everything
      vec3 star = vec3(0.0);         // star radiance reaching the eye (set below)
      float sMask = 0.0;             // star coverage reaching the eye

      // ray misses the atmosphere entirely -> pure space (full, unobstructed stars)
      if (atm.y < 0.0 || atm.x > atm.y) {
        fragColor = vec4(composite(vec3(0.0), bg, starMask), 1.0);
        return;
      }

      float tStart = max(atm.x, 0.0);
      float tEnd   = hitPlanet ? pl.x : atm.y;
      float dt     = max(tEnd - tStart, 0.0) / float(PRIMARY);
      float jit    = hash13(vec3(gl_FragCoord.xy, 7.0)); // static dither — removes step banding

      vec3 totR = vec3(0.0), totM = vec3(0.0);
      vec3 odV  = vec3(0.0); // accumulated view optical depth (surface attenuation)
      float t = tStart + dt * jit;
      for (int i = 0; i < PRIMARY; i++) {
        vec3 p = cam + rd * t;
        float h = length(p) - Rp;
        float dR = density(h, shR) * dt;
        float dM = density(h, shM) * dt;
        odV += extinction(h) * dt;
        vec3 lod;
        if (lightOD(p, sun, lod)) {
          vec3 tr = exp(-(odV + lod));
          totR += tr * dR;
          totM += tr * dM;
        }
        t += dt;
      }

      float mu = dot(rd, sun);
      float pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
      float gg = g * g;
      float pM = 3.0 / (8.0 * PI) * ((1.0 - gg) * (1.0 + mu * mu)) /
                 ((2.0 + gg) * pow(max(1.0 + gg - 2.0 * g * mu, 1e-4), 1.5));

      color = iSun * (pR * bR * totR + pM * bM * uHaze * totM);

      // ── planet surface, seen through the atmosphere ──
      if (hitPlanet) {
        vec3 sp = cam + rd * pl.x;
        vec3 n  = normalize(sp);
        float ca = cos(uTime * 0.02), sa = sin(uTime * 0.02);
        vec3 np = vec3(n.x * ca - n.z * sa, n.y, n.x * sa + n.z * ca);
        float land = smoothstep(0.50, 0.62, fbm(np * 2.3));
        // Surface albedo responds to system-health — a real, physical property.
        // Thriving biosphere: deep-blue oceans, green continents. Barren / sick
        // world: murky water, brown desert. The scattering physics is unchanged.
        vec3 ocean = mix(vec3(0.055, 0.06, 0.05), vec3(0.012, 0.045, 0.13), uHealth);
        vec3 forest = mix(vec3(0.20, 0.15, 0.08), vec3(0.03, 0.19, 0.05), uHealth);  // desert -> forest
        vec3 arid   = mix(vec3(0.17, 0.14, 0.10), vec3(0.15, 0.17, 0.07), uHealth);
        vec3 ground = mix(forest, arid, fbm(np * 6.0));
        vec3 ice = vec3(0.7, 0.78, 0.85);
        vec3 surf = mix(ocean, ground, land);
        surf = mix(surf, ice, smoothstep(0.78, 0.95, abs(np.y)));
        float sd  = dot(n, sun);
        float ndl = max(sd, 0.0);
        vec3 viewTr = exp(-odV);
        // Day side lit brightly enough to read THROUGH the atmosphere, with a
        // crisp terminator so the day/night "shadow" curves visibly across the
        // surface (otherwise the atmosphere glow drowns the dark albedo).
        float day = smoothstep(-0.05, 0.16, sd);          // crisp terminator
        vec3 lit = surf * (day * 3.0 + ndl * 0.5 + 0.012);
        // night side: lights of a flourishing civilisation (benefit-driven)
        float night = smoothstep(0.05, -0.15, dot(n, sun));
        float pop = smoothstep(0.55, 0.75, fbm(np * 9.0)) * land;
        vec3 lights = vec3(1.0, 0.82, 0.5) * pop * night * uCity * 1.4;
        color += (lit + lights) * viewTr;
      }
      else {
        vec3 tr = exp(-odV);   // view transmittance through the thin / night sky
        star = bg * tr;
        sMask = starMask * max(tr.r, max(tr.g, tr.b)); // dim the dot where sky is thick
      }

      fragColor = vec4(composite(color, star, sMask), 1.0);
    }\`;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src.replace(/^\\s+/gm, ''));
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('sky shader:', gl.getShaderInfoLog(s));
      }
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('sky link:', gl.getProgramInfoLog(prog));
      canvas.style.display = 'none';
      return;
    }
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray());

    var U = {};
    ['uRes', 'uTime', 'uSunDir', 'uCamPos', 'uPitch', 'uParallax', 'uHaze', 'uCity', 'uHealth', 'uLight', 'uMood', 'uHueA', 'uHueB'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    // ── Random colour personality, fresh each reload ──────────────────────────
    //   Pick one random base hue; the plane sweeps an ANALOGOUS arc from it (a
    //   harmonious ~58° span), so the grade is always a vivid, well-matched
    //   colour — never gray, no matter where the plane sits. Reloading reshuffles
    //   the whole palette.
    (function () {
      var h = Math.random();
      gl.uniform1f(U.uHueA, h);
      gl.uniform1f(U.uHueB, h + 0.16);
    })();

    var Rp = 6371000.0;
    // mobile-first render scale: the heavy raymarch runs below native resolution
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var scale = coarse ? 0.6 : 0.8;
    function resize() {
      // Match the drawing buffer to the canvas's ACTUAL box. The box is pinned
      // to 100lvh in CSS — a constant the mobile URL/bottom bar can't change —
      // so there is no jump, and the buffer always fills the element exactly so
      // there is no cropping / gap.
      var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 1.5);
      var rect = canvas.getBoundingClientRect();
      var cw = rect.width || window.innerWidth;
      var ch = rect.height || window.innerHeight;
      var w = Math.max(2, Math.round(cw * dpr * scale));
      var h = Math.max(2, Math.round(ch * dpr * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
    window.addEventListener('load', resize);
    resize();

    // ── Pin the background to the VISUAL viewport ─────────────────────────────
    // A position:fixed layer is anchored to the LAYOUT viewport. On Chrome
    // Android the dynamic URL bar resizes only the visual viewport, so as the
    // bar hides/shows the visible window slides over the layout-fixed canvas and
    // the background appears to scroll a little. visualViewport reports the exact
    // box that is actually on screen — translate + size the wrap to match it so
    // the background stays locked to what the user sees. (No-op on desktop and
    // where the API is missing → the CSS 100lvh box is used as the fallback.)
    var skyWrap = document.getElementById('sky-wrap');
    var vv = window.visualViewport;
    if (skyWrap && vv) {
      var maxVVH = 0;                 // tallest visual-viewport height ever seen
      var BOTTOM_OVERSCAN = 120;      // px safety pad below the visible bottom
      var pinSky = function () {
        // During an in-progress Chrome-Android bar-hide, scroll events fire with a
        // STALE (smaller) vv.height while the visible area is already taller. Never
        // shrink below the tallest height we've observed, and add a fixed pad, so
        // the fixed+clipped wrap always extends past the real bottom edge. The
        // extra height is clipped (overflow:hidden) and, being position:fixed,
        // adds no scrollable area — overscroll-behavior:none also kills rubber-band.
        if (vv.height > maxVVH) maxVVH = vv.height;
        var h = Math.max(vv.height, maxVVH) + BOTTOM_OVERSCAN;
        skyWrap.style.width = vv.width + 'px';
        skyWrap.style.height = h + 'px';
        skyWrap.style.transformOrigin = '0 0';
        skyWrap.style.transform =
          'translate(' + vv.offsetLeft + 'px,' + vv.offsetTop + 'px) scale(' + (1 / vv.scale) + ')';
      };
      vv.addEventListener('resize', pinSky, { passive: true });
      vv.addEventListener('scroll', pinSky, { passive: true });
      window.addEventListener('orientationchange', function () {
        maxVVH = 0;                   // metrics invalid after rotation — reset, then re-pin
        setTimeout(pinSky, 250);
      });
      pinSky();
    }

    // ── State: targets driven by planes / scroll / pointer; current values ease
    //    toward them every frame (asymmetric easing carries the message). ──
    var account = 0.15, scrollP = 0.0;          // accountability target, scroll
    var coopX = 0.30, openX = 0.30, wwY = 0.20;  // raw plane axes (benefit)
    var benefit = 0.30, healthTarget = 0.2;
    var px = 0.0, py = 0.0;                       // parallax target
    var lightTarget = 0.0;                        // theme target: 0 dark, 1 light
    var cur = { health: 0.15, alt: 0.0, haze: 1.0, city: 0.0, px: 0.0, py: 0.0, light: 0.0, mood: 0.15 };

    function recompute() {
      benefit = (coopX + openX + wwY) / 3.0;
      // benefit only fully counts when paired with accountability — mirrors the
      // site's safetyScore (the sqrt term penalises an imbalanced system).
      var sq = Math.sqrt(Math.max(benefit * account, 0.0));
      healthTarget = Math.max(0, Math.min(1, 0.45 * benefit + 0.20 * account + 0.35 * sq));
    }
    recompute();

    window.__n1bg = {
      setSystem: function (coop, decep) { coopX = coop; account = decep; recompute(); },
      setScroll: function (p) { scrollP = Math.max(0, Math.min(1, p)); },
      setLight: function (p) { lightTarget = Math.max(0, Math.min(1, p)); }
    };

    // Cache the scrollable height; recompute only on resize so the scroll
    // handler stays read-free (no forced layout per scroll tick).
    var scrollMax = 0;
    function measureScroll() {
      scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    }
    function onScroll() {
      window.__n1bg.setScroll(scrollMax > 0 ? window.scrollY / scrollMax : 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measureScroll, { passive: true });
    measureScroll();
    onScroll();

    window.addEventListener('pointermove', function (e) {
      px = (e.clientX / window.innerWidth) * 2.0 - 1.0;
      py = (e.clientY / window.innerHeight) * 2.0 - 1.0;
    }, { passive: true });

    var t0 = performance.now();
    function lerp(a, b, k) { return a + (b - a) * k; }

    var rafId = 0;
    function frame(now) {
      if (document.hidden) { rafId = requestAnimationFrame(frame); return; }
      var time = (now - t0) / 1000.0;

      // Brighten fast (benefit is easy), darken slow (harm is hard): the story.
      var rate = healthTarget > cur.health ? 0.045 : 0.012;
      cur.health = lerp(cur.health, healthTarget, rate);
      cur.alt    = lerp(cur.alt, scrollP, 0.05);
      // bM is the article's clean-sky value; harm scales it up to ~7x (hazy).
      cur.haze   = lerp(cur.haze, 1.0 + (1.0 - cur.health) * 6.0, 0.04);
      cur.city   = lerp(cur.city, Math.max(0, benefit - 0.15), 0.03);
      cur.px     = lerp(cur.px, px, 0.04);
      cur.py     = lerp(cur.py, py, 0.04);
      cur.light  = lerp(cur.light, lightTarget, 0.9);
      // Mood = the plane's colour grade. Unlike health (slow, asymmetric — the
      // story), this responds FAST so dragging a plane recolours the sky live.
      // Stretched so the playable range sweeps the full warm→cool palette.
      var moodTarget = Math.max(0, Math.min(1, (healthTarget - 0.18) / 0.62));
      cur.mood   = lerp(cur.mood, moodTarget, 0.10);

      // Sun: low and raking so one side of the limb is lit (day) while the other
      // curves into shadow (night) — the day/night terminator sweeps visibly
      // across the screen. Elevation still rises with health (the story), but
      // stays low so the shadow is always present.
      var elev = 0.05 + cur.health * 0.55 + 0.04 * Math.sin(time * 0.05);
      // Azimuth ~90° to the SIDE of the view (forward is -Z) so the sun lights
      // the limb from the right and the terminator runs across the disk.
      var azi  = -0.05 + 0.18 * Math.sin(time * 0.02);
      var ce = Math.cos(elev);
      var sx = ce * Math.cos(azi), sy = Math.sin(elev), sz = ce * Math.sin(azi);

      // Scroll = the journey, PLANET -> SPACE: top is the planet (low orbit,
      // tangent limb); scrolling down pulls back into deep space until the
      // planet is a small lit sphere among the stars.
      var alt   = lerp(220000.0, 3600000.0, cur.alt);
      var pitch = lerp(0.06, 0.6, cur.alt);

      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform3f(U.uSunDir, sx, sy, sz);
      gl.uniform3f(U.uCamPos, 0.0, Rp + alt, 0.0);
      gl.uniform1f(U.uPitch, pitch);
      gl.uniform2f(U.uParallax, cur.px, cur.py);
      gl.uniform1f(U.uHaze, cur.haze);
      gl.uniform1f(U.uCity, cur.city);
      gl.uniform1f(U.uHealth, cur.health);
      gl.uniform1f(U.uLight, cur.light);
      gl.uniform1f(U.uMood, cur.mood);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) t0 = performance.now() - 0;
    });
  })();
  </script>
  <script src="/static/typograf.min.js"></script>
  <script>
    (function() {
      console.log('You opened the console. Kant would approve \\u2014 you\\'re using reason autonomously. t.me/Oresty');

      // ── Scroll-driven theme ────────────────────────────────────────────
      //   Dark space at the top (as it always was); once the "future" section
      //   has scrolled past, the world turns into a luminous white "heaven".
      //   Single source of truth: progress() feeds BOTH the CSS theme (--lp,
      //   consumed by color-mix) and the WebGL background (uLight). Works with
      //   or without WebGL (reduced-motion uses the CSS gradient + --lp only).
      //
      //   Smoothness: scroll/resize only KICK a single self-stopping rAF loop —
      //   no layout reads or style writes happen in the event itself. Each frame
      //   measures the target once and eases --lp toward it (same lerp rate as
      //   the WebGL background's cur.light), so the CSS theme and the WebGL sky
      //   brighten in lockstep with no re-triggered CSS transition or layout
      //   thrash. The loop halts once settled and is re-kicked on the next scroll.
      (function () {
        var root = document.documentElement;
        var future = document.getElementById('future');
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var cur = 0, target = 0, raf = 0;
        function measure() {
          if (!future) return 0;
          var r = future.getBoundingClientRect();
          var vh = window.innerHeight || 1;
          // 0 while the section's bottom is still at/below the viewport bottom;
          // 1 once it has risen fully past the top → "scrolled the future".
          var x = Math.max(0, Math.min(1, (vh - r.bottom) / vh));
          return x * x * (3.0 - 2.0 * x); // smoothstep
        }
        function apply(v) {
          root.style.setProperty('--lp', v.toFixed(4));
          if (window.__n1bg && window.__n1bg.setLight) window.__n1bg.setLight(target);
        }
        function tick() {
          target = measure();
          cur += (target - cur) * 0.9;             // same rate as WebGL cur.light
          if (Math.abs(target - cur) < 0.0004) cur = target;
          apply(cur);
          raf = (cur === target) ? 0 : requestAnimationFrame(tick);
        }
        function kick() {
          if (reduce) { target = cur = measure(); apply(cur); return; }
          if (!raf) raf = requestAnimationFrame(tick);
        }
        window.addEventListener('scroll', kick, { passive: true });
        window.addEventListener('resize', kick, { passive: true });
        target = cur = measure();
        apply(cur);
      })();

      // ── Tooltip edge protection ──
      document.querySelectorAll('.tooltip').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
          el.style.removeProperty('--tt-left');
          var rect = el.getBoundingClientRect();
          var margin = 12;
          var maxW = 280;
          var overflow = rect.left + maxW - (window.innerWidth - margin);
          if (overflow > 0) {
            el.style.setProperty('--tt-left', (-overflow) + 'px');
          }
        });
      });

      // ── Tooltip accessibility ──
      var ttCount = 0;
      document.querySelectorAll('.tooltip').forEach(function(el) {
        var tip = el.getAttribute('data-tip');
        if (!tip) return;
        el.setAttribute('tabindex', '0');
        var ttId = 'tt-' + (++ttCount);
        var span = document.createElement('span');
        span.id = ttId;
        span.className = 'sr-only';
        span.textContent = tip;
        el.appendChild(span);
        el.setAttribute('aria-describedby', ttId);
      });

      // ── Event Definitions ──
      // Each event has separate coopWeight/decepWeight controlling how each
      // slider influences its timing, plus separate minCoop/minDecep/maxCoop/maxDecep
      // thresholds controlling whether it appears at all.
      var futureEvents = [
        // ── TECHNOLOGY: driven by momentum, coop accelerates (shared research) ──
        { label: 'BCI at Scale \\u{1F9E0}', category: 'tech',
          yearRange: [2027, 2030], cW: 0.2, dW: 0.1 },
        { label: 'AGI-Level Systems \\u26A1', category: 'tech',
          yearRange: [2027, 2033], cW: 0.4, dW: 0.1 },
        { label: 'Quantum-AI Drug Discovery \\u{1F48A}', category: 'tech',
          yearRange: [2029, 2038], cW: 0.5, dW: 0.1 },
        { label: 'AI-Driven Scientific Revolution \\u{1F52C}', category: 'tech',
          yearRange: [2030, 2045], cW: 0.6, dW: 0.1 },
        { label: 'The Singularity \\u{1F573}\\uFE0F', category: 'tech',
          yearRange: [2040, 2070], cW: 0.4, dW: 0.2 },

        // ── BENEFICIAL: need cooperation and/or accountability to materialize ──
        // minCoop: event won't happen without enough cooperation
        // minDecep: event won't happen without enough accountability
        { label: 'Longevity Escape Velocity \\u267E\\uFE0F', category: 'beneficial',
          yearRange: [2035, 2080], cW: 0.7, dW: 0.2, minCoop: 0.25 },
        { label: 'Aligned Superintelligence \\u{1F310}', category: 'beneficial',
          yearRange: [2040, 2075], cW: 0.5, dW: 0.4, minCoop: 0.40, minDecep: 0.30 },
        { label: 'Biological Age Reversal \\u{1F9EC}', category: 'beneficial',
          yearRange: [2045, 2090], cW: 0.6, dW: 0.2, minCoop: 0.35 },
        { label: 'Brain-Cloud Interface \\u2601\\uFE0F', category: 'beneficial',
          yearRange: [2050, 2100], cW: 0.4, dW: 0.5, minCoop: 0.40, minDecep: 0.35 },
        { label: 'Post-Scarcity Economics \\u{1F3DB}\\uFE0F', category: 'beneficial',
          yearRange: [2060, 2150], cW: 0.5, dW: 0.4, minCoop: 0.55, minDecep: 0.45 },
        { label: 'A-Mortality (Death Optional) \\u{1F52E}', category: 'beneficial',
          yearRange: [2070, 2200], cW: 0.5, dW: 0.4, minCoop: 0.55, minDecep: 0.50 },
        { label: 'Flourishing Civilization \\u{1F30C}', category: 'beneficial',
          yearRange: [2100, 2300], cW: 0.5, dW: 0.5, minCoop: 0.65, minDecep: 0.60 },

        // ── DYSTOPIAN: appear when specific slider is too low ──
        // maxCoop: disappears when cooperation is high enough (sharing prevents it)
        // maxDecep: disappears when deception costs are high enough (accountability prevents it)
        { label: 'The Useless Class \\u{1F4C9}', category: 'dystopian',
          yearRange: [2028, 2045], cW: 0.6, dW: 0.2, maxCoop: 0.55 },
        { label: 'Total Surveillance State \\u{1F441}\\uFE0F', category: 'dystopian',
          yearRange: [2028, 2050], cW: 0.2, dW: 0.8, maxDecep: 0.50 },
        { label: 'Biological Castes \\u{1F9EA}', category: 'dystopian',
          yearRange: [2035, 2070], cW: 0.6, dW: 0.3, maxCoop: 0.50 },
        { label: 'Species Divergence \\u{1F9EC}', category: 'dystopian',
          yearRange: [2045, 2090], cW: 0.5, dW: 0.4, maxCoop: 0.45 },
      ];

      // ── Typography (runtime) ──
      var tp = new Typograf({locale: ['en-US']});
      Typograf.getRules().forEach(function(r) { tp.disableRule(r.name); });
      Typograf.getRules().filter(function(r) { return r.name.indexOf('common/nbsp/') === 0; })
        .forEach(function(r) { tp.enableRule(r.name); });

      function typografRuntime(text) {
        return tp.execute(text);
      }

      // ── Reusable 2D Plane wiring (DRY: powers every plane2D component) ──
      // Mouse/touch/keyboard + accessibility. State lives here; the host supplies
      // an onChange(x, y) that maps the two axes (0-100) to its own content.
      function initPlane(id, opts) {
        var canvas = document.querySelector('#' + id + ' .plane-canvas');
        if (!canvas) return;
        var point = document.querySelector('#' + id + ' .plane-point');
        var hint  = document.querySelector('#' + id + ' .plane-hint');
        var lineH = document.querySelector('#' + id + ' .plane-line-h');
        var lineV = document.querySelector('#' + id + ' .plane-line-v');
        var pctX  = document.getElementById(id + '-pct-x');
        var pctY  = document.getElementById(id + '-pct-y');
        var announce = document.getElementById(id + '-announce');
        var xVal = opts.initialX;
        var yVal = opts.initialY;

        function updatePos() {
          point.style.left = xVal + '%';
          point.style.bottom = yVal + '%';
          lineH.style.bottom = yVal + '%';
          lineV.style.left = xVal + '%';
          pctX.textContent = xVal + '%';
          pctY.textContent = yVal + '%';
        }

        function fromPointer(e) {
          hint.classList.add('hidden');
          var rect = canvas.getBoundingClientRect();
          var clientX = e.touches ? e.touches[0].clientX : e.clientX;
          var clientY = e.touches ? e.touches[0].clientY : e.clientY;
          var x = (clientX - rect.left) / rect.width;
          var y = 1 - (clientY - rect.top) / rect.height;
          xVal = Math.round(Math.max(0, Math.min(100, x * 100)));
          yVal = Math.round(Math.max(0, Math.min(100, y * 100)));
          updatePos();
          opts.onChange(xVal, yVal);
        }

        var dragging = false;
        canvas.addEventListener('mousedown', function(e) { dragging = true; point.classList.add('dragging'); fromPointer(e); });
        document.addEventListener('mousemove', function(e) { if (dragging) { e.preventDefault(); fromPointer(e); } });
        document.addEventListener('mouseup', function() { dragging = false; point.classList.remove('dragging'); });
        canvas.addEventListener('touchstart', function(e) { dragging = true; point.classList.add('dragging'); fromPointer(e); e.preventDefault(); }, { passive: false });
        document.addEventListener('touchmove', function(e) { if (dragging) { fromPointer(e); e.preventDefault(); } }, { passive: false });
        document.addEventListener('touchend', function() { dragging = false; point.classList.remove('dragging'); });
        canvas.addEventListener('keydown', function(e) {
          var step = 5;
          if (e.key === 'ArrowRight') { xVal = Math.min(100, xVal + step); }
          else if (e.key === 'ArrowLeft') { xVal = Math.max(0, xVal - step); }
          else if (e.key === 'ArrowUp') { yVal = Math.min(100, yVal + step); }
          else if (e.key === 'ArrowDown') { yVal = Math.max(0, yVal - step); }
          else return;
          e.preventDefault();
          hint.classList.add('hidden');
          updatePos();
          opts.onChange(xVal, yVal);
          if (announce) announce.textContent = opts.xLabel + ': ' + xVal + '%, ' + opts.yLabel + ': ' + yVal + '%';
        });

        updatePos();
        opts.onChange(xVal, yVal);
      }

      // ── Future plane DOM + state ──
      var container = document.getElementById('future-timeline');
      var systemMsg = document.getElementById('system-message');
      var cardWisdom = document.getElementById('card-wisdom');
      var cardDeath = document.getElementById('card-death');
      var coopValue = 30;
      var decepValue = 15;

      // ── Safety Score for Extinction ──
      // Cooperation (40%): only helps if deception is costly — free defection exploits it
      // Deception costs (30%): reduces harm even without cooperation
      // Synergy (30%): you need BOTH for robust safety (sqrt penalizes imbalance)
      // When decep=0: bad actors exploit freely, safety collapses to 0 regardless of coop.
      function safetyScore(coop, decep) {
        return 0.4 * coop * decep + 0.3 * decep + 0.3 * Math.sqrt(coop * decep);
      }

      // ── Hazard Rate Model ──
      // Based on Toby Ord (~1/6 per century at current trajectory ~safety 0.35).
      // We're more optimistic, but we also read Bostrom at 2 AM.
      // Base hazard grows over time as tech capability increases.
      function computeExtinctionYear(coop, decep) {
        var safety = safetyScore(coop, decep);
        var k = 10;
        var normSafety = 0.35;
        var normalization = Math.exp(k * (1 - normSafety));
        var govMultiplier = Math.exp(k * (1 - safety)) / normalization;

        var cumulativeSurvival = 1.0;
        for (var y = 2026; y <= 2300; y++) {
          var yearsOut = y - 2026;
          var baseHazard = 0.001 + 0.009 * (1 - Math.exp(-yearsOut / 25));
          var annualHazard = Math.min(baseHazard * govMultiplier, 0.20);
          cumulativeSurvival *= (1 - annualHazard);
          if (cumulativeSurvival < 0.5) return y;
        }
        return null;
      }

      // ── Event Year Calculation ──
      // Each event has its own coop/decep sensitivity (cW, dW).
      // Tech/beneficial: higher slider value → earlier year
      // Dystopian: higher slider value → later year (delayed/mitigated)
      function computeEventYear(event, coop, decep) {
        var fast = event.yearRange[0];
        var slow = event.yearRange[1];
        var range = slow - fast;
        var totalW = event.cW + event.dW;
        var factor = totalW > 0 ? (event.cW * coop + event.dW * decep) / totalW : 0;

        if (event.category === 'dystopian') {
          // Higher sliders → later (delayed). factor=0 → fast year, factor=1 → slow year
          return Math.round(fast + range * factor);
        }
        // Tech & beneficial: higher sliders → earlier. factor=0 → slow year, factor=1 → fast year
        return Math.round(slow - range * factor);
      }

      function shouldShowEvent(event, coop, decep) {
        if (event.minCoop !== undefined && coop < event.minCoop) return false;
        if (event.minDecep !== undefined && decep < event.minDecep) return false;
        if (event.maxCoop !== undefined && coop >= event.maxCoop) return false;
        if (event.maxDecep !== undefined && decep >= event.maxDecep) return false;
        return true;
      }

      function addMilestone(milestones, year, label) {
        if (milestones[year]) {
          milestones[year] += ' / ' + label;
        } else {
          milestones[year] = label;
        }
      }

      function buildTimelineMarkup(startYear, endYear, milestones, fadeFromYear) {
        var html = '';
        for (var y = startYear; y <= endYear; y++) {
          if (milestones[y]) {
            html += '<p class="milestone">· ' + y + ' \u2014 ' + milestones[y] + '</p>';
          } else if (fadeFromYear != null && y >= fadeFromYear) {
            // Gradient disappearing: when the future is unbounded, the trailing
            // years dim toward zero — a timeline that keeps going past where
            // we can see it. Each step fades further into the dark.
            var span = endYear - fadeFromYear;
            var t = span > 0 ? (y - fadeFromYear) / span : 1; // 0 -> 1
            var mult = (1 - t) * (1 - t);                      // ease-out toward invisible
            html += '<p class="dot" style="opacity:' + mult.toFixed(3) + '">· <span class="dot-year">' + y + '</span></p>';
          } else {
            html += '<p class="dot">· <span class="dot-year">' + y + '</span></p>';
          }
          if (milestones[y] && milestones[y].indexOf('Extinction') !== -1) break;
        }
        return html;
      }

      // ── Timeline Computation ──
      function computeTimeline(coopRaw, decepRaw) {
        var coop = coopRaw / 100;
        var decep = decepRaw / 100;
        var extinctionYear = computeExtinctionYear(coop, decep);
        var visibleEvents = [];

        for (var i = 0; i < futureEvents.length; i++) {
          var ev = futureEvents[i];
          if (!shouldShowEvent(ev, coop, decep)) continue;

          var year = computeEventYear(ev, coop, decep);

          // Cut off at extinction — nothing happens after humanity dies
          if (extinctionYear !== null && year >= extinctionYear) continue;

          visibleEvents.push({ label: ev.label, category: ev.category, year: year });
        }

        // Determine ending
        var safety = safetyScore(coop, decep);
        var lastYear = visibleEvents.reduce(function(m, e) { return e.year > m ? e.year : m; }, 2060);
        if (extinctionYear !== null && extinctionYear <= 2200) {
          visibleEvents.push({ label: 'Human Extinction \\u{1F480}', category: 'extinction', year: extinctionYear });
        } else if (coop >= 0.65 && decep >= 0.60) {
          visibleEvents.push({ label: 'Humanity thrives \\u2014 a long future ahead \\u2728', category: 'transcendence', year: lastYear + 10 });
        } else if (safety >= 0.45) {
          visibleEvents.push({ label: 'Intelligent life survives \\u{1F331}', category: 'survival', year: lastYear + 5 });
        }

        visibleEvents.sort(function(a, b) { return a.year - b.year; });
        return { events: visibleEvents, coop: coop, decep: decep, safety: safety, extinctionYear: extinctionYear };
      }

      // ── System Message ──
      // References specific slider deficiencies so user knows what to change
      function getMessage(coop, decep, extinctionYear, events) {
        // ── Easter eggs ──
        var cx = Math.round(coop * 100);
        var dx = Math.round(decep * 100);
        if (cx === 62 && dx === 38) return '\\u03C6. You found the ratio. Luca Pacioli called it divine proportion. The universe agrees.';
        if (cx === 42 && dx === 42) return '42. The answer checks out. Now if only we knew the question.';
        if (cx === 0 && dx === 0) return 'Solitary, poor, nasty, brutish, and short. \\u2014 Thomas Hobbes, who was fun at parties.';
        if (cx === 100 && dx === 100) return 'Bertrand Russell warned that the demand for certainty is one of the most dangerous things. But this does look nice.';
        if (cx === 50 && dx === 50) return 'Nash equilibrium. Stable, but not optimal. John would tell you to cooperate more.';

        var hasExtinction = extinctionYear !== null && extinctionYear <= 2200;
        var hasDystopian = events.some(function(e) { return e.category === 'dystopian'; });
        var hasBeneficial = events.some(function(e) { return e.category === 'beneficial'; });
        var imbalance = Math.abs(coop - decep);

        // Extinction
        if (hasExtinction && extinctionYear <= 2035) {
          return 'Extinction by ' + extinctionYear + '. Cooperation and accountability collapsed. At these settings, the odds are far worse than Toby Ord\\'s 1-in-6.';
        }
        if (hasExtinction && extinctionYear <= 2060) {
          return 'Extinction by ' + extinctionYear + '. Technology without wisdom.' + (hasDystopian ? ' Biological castes accelerated collapse.' : '') + ' The gap closed \\u2014 the wrong way.';
        }
        if (hasExtinction) {
          return 'Extinction by ' + extinctionYear + '. The system never changed enough. The math caught up.';
        }

        // Slider-specific feedback
        if (coop > 0.6 && decep < 0.25) {
          return 'Cooperation is strong but deception is free. Bad actors exploit every open system. Raise deception costs.';
        }
        if (decep > 0.6 && coop < 0.25) {
          return 'Deception is costly but cooperation is blocked. Technology stalls. Make cooperation easier.';
        }
        if (imbalance > 0.35 && coop > decep) {
          return 'Cooperation outpaces accountability. No consequences for bad actors.' + (hasDystopian ? ' Exploitation persists.' : '') + ' Push deception costs higher.';
        }
        if (imbalance > 0.35 && decep > coop) {
          return 'Accountability outpaces cooperation. The system punishes harm but doesn\\'t enable good.' + (!hasBeneficial ? ' No breakthroughs appear.' : '') + ' Make cooperation easier.';
        }

        // Progress
        var safety = safetyScore(coop, decep);
        if (safety < 0.30) {
          return 'Current trajectory. The system rewards harm over cooperation. This is the default future without intervention.';
        }
        if (safety < 0.50) {
          return 'Partial progress. The gap narrows but hasn\\'t closed.' + (hasDystopian ? ' Dystopian outcomes still loom.' : '');
        }
        if (safety < 0.70) {
          return 'Genuine progress. Cooperation and accountability are catching up.' + (hasBeneficial ? ' Life extension and aligned AI become real possibilities.' : '') + ' Trust starts to outcompete exploitation.';
        }

        return 'The system works. Cooperation is easy, deception is expensive. Humanity unlocks its full potential.';
      }

      // ── Render ──
      function render() {
        var result = computeTimeline(coopValue, decepValue);
        var events = result.events;

        // Drive the living planet: cooperation lifts the sun; deception costs are
        // the accountability that lets benefit count. (See the #sky-bg shader.)
        if (window.__n1bg) window.__n1bg.setSystem(result.coop, result.decep);

        systemMsg.textContent = typografRuntime(getMessage(result.coop, result.decep, result.extinctionYear, events));

        var hasWisdom = events.some(function(e) { return e.category === 'transcendence'; });
        var hasExtinction = events.some(function(e) { return e.category === 'extinction'; });
        cardWisdom.style.opacity = hasWisdom ? '1' : '0.3';
        cardDeath.style.opacity = hasExtinction ? '1' : '0.3';

        // Build milestone map (handle same-year events)
        var milestones = {};
        for (var i = 0; i < events.length; i++) {
          addMilestone(milestones, events[i].year, events[i].label);
        }

        // Determine timeline range
        var lastEventYear = 2035;
        for (var i = 0; i < events.length; i++) {
          if (events[i].year > lastEventYear) lastEventYear = events[i].year;
        }
        var endYear = lastEventYear + 5;

        // When humanity thrives, the future is unbounded — give it a long tail
        // of years that fade out by gradient instead of stopping abruptly.
        var thrivesYear = null;
        for (var i = 0; i < events.length; i++) {
          if (events[i].category === 'transcendence') thrivesYear = events[i].year;
        }
        var fadeFromYear = null;
        if (thrivesYear !== null) {
          fadeFromYear = thrivesYear + 1;
          endYear = thrivesYear + 12;
        }

        container.innerHTML = buildTimelineMarkup(2027, endYear, milestones, fadeFromYear);
      }

      // ── Future plane: cooperation × deception costs → a timeline ──
      initPlane('plane', {
        initialX: 30, initialY: 15,
        xLabel: 'Easy to cooperate', yLabel: 'Costs of deception',
        onChange: function(coop, decep) { coopValue = coop; decepValue = decep; render(); }
      });
    })();
  </script>
</body>
</html>`;
}

// ─── Pages ───

const pages = discoverPages();

// ─── Write Output ───

const dist = path.join(__dirname, 'dist');
const staticDir = path.join(dist, 'static');
ensureDir(dist);
ensureDir(staticDir);
fs.copyFileSync(
  path.join(__dirname, 'node_modules/typograf/dist/typograf.min.js'),
  path.join(staticDir, 'typograf.min.js')
);
const pub = path.join(__dirname, 'public');
if (fs.existsSync(pub)) {
  copyDir(pub, dist);
}
for (const p of pages) {
  const outPath = path.join(dist, p.out);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, typographNbsp(pageShell(p)));
  console.log('Built dist/' + p.out);
}

// ─── Crawl files: sitemap.xml + robots.txt ───
// Generated (not static) so the domain stays DRY against SITE. lastmod is the
// newest mtime among a page's content files, so it reflects real edits.
function pageLastmod(slug) {
  const dir = path.join(__dirname, 'content', slug);
  let newest = 0;
  for (const f of fs.readdirSync(dir)) {
    const t = fs.statSync(path.join(dir, f)).mtime.getTime();
    if (t > newest) newest = t;
  }
  return new Date(newest).toISOString().slice(0, 10);
}

const urls = pages.map(p => {
  const slug = p.isHome ? 'home' : p.out.replace(/\/index\.html$/, '');
  return `  <url>\n    <loc>${p.canonical}</loc>\n    <lastmod>${pageLastmod(slug)}</lastmod>\n  </url>`;
}).join('\n');
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
console.log('Built dist/sitemap.xml');

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
);
console.log('Built dist/robots.txt');
