const fs = require('fs');
const path = require('path');
const Typograf = require('typograf');


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

function dots(from, to, milestones = {}) {
  const lines = [];
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
    <div class="plane-y-label" aria-hidden="true">${yLabel} — <span class="plane-pct" id="pct-y">${initialY}%</span></div>
    <div class="plane-canvas-wrap">
      <div class="plane-canvas" role="application" tabindex="0"
           aria-label="${xLabel} and ${yLabel} interactive plane. Use arrow keys: left/right for ${xLabel}, up/down for ${yLabel}.">
        <div class="plane-line-h" style="bottom:${initialY}%" aria-hidden="true"></div>
        <div class="plane-line-v" style="left:${initialX}%" aria-hidden="true"></div>
        <div class="plane-point" style="left:${initialX}%;bottom:${initialY}%" aria-hidden="true"></div>
        <p class="plane-hint" aria-hidden="true">Drag responsibly</p>
        <div id="${id}-announce" class="sr-only" aria-live="polite" aria-atomic="true"></div>
      </div>
      <div class="plane-x-label" aria-hidden="true">${xLabel} — <span class="plane-pct" id="pct-x">${initialX}%</span></div>
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
  1980: 'Discovery of Cosmic Inflation 🌌',
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
  2024: 'First Complete Brain Connectome 🪰',
  2025: 'Humanoid Robots at Scale 🦿',
};


// ─── Build HTML ───

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>n1.community — Weekly fixes for humanity</title>
  ${meta('description', DESC)}
  ${meta('keywords', 'n1, community, cooperation, win-win, coordination, humanity, mission-driven')}
  ${meta('author', 'n1.community')}
  <link rel="canonical" href="https://n1.community/">

  <!-- Open Graph -->
  ${meta('og:type', 'website')}
  ${meta('og:url', 'https://n1.community/')}
  ${meta('og:title', OG_TITLE)}
  ${meta('og:description', DESC)}
  ${meta('og:image', 'https://n1.community/web-app-manifest-512x512.png')}
  ${meta('og:site_name', 'n1.community')}
  ${meta('og:locale', 'en_US')}

  <!-- Twitter Card -->
  ${meta('twitter:card', 'summary')}
  ${meta('twitter:title', OG_TITLE)}
  ${meta('twitter:description', DESC)}
  ${meta('twitter:image', 'https://n1.community/web-app-manifest-512x512.png')}

  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="n1" />
  <meta name="theme-color" content="#ffffff">
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

    /* ─── Reset ─── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ::selection { background: #111; color: #fff; }

    /* ─── Base ─── */
    html { font-size: 24px; scroll-behavior: smooth; }
    body {
      font-family: 'Playfair', serif;
      color: #111;
      background: #fff;
      line-height: ${P};
      overflow-wrap: break-word;
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
      background: #111;
      color: #fff;
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
      color: #111;
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
      outline: 1px solid #111;
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
      font-family: 'Playfair Display', serif;
      font-weight: 400;
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
      border: 1px solid #111;
      transform: translate(-50%, -50%);
      opacity: 0.12;
      animation: breathe ${P3}s ease-in-out infinite;
    }
    .logo-community {
      font-family: 'Playfair Display', serif;
      font-weight: 400;
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
      border: 1px solid #111;
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
    .card, .box, .cta-box { border: 1px solid #111; padding: ${P}rem; }
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
      border: 1px solid #111;
      cursor: crosshair;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    }
    .plane-line-h, .plane-line-v {
      position: absolute;
      pointer-events: none;
      background: rgba(0,0,0,0.15);
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
      background: #111;
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
      0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.4); }
      50% { box-shadow: 0 0 0 12px rgba(0,0,0,0); }
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
      color: #111;
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
      border: 1px solid #111;
      text-align: center;
      text-decoration: none;
      color: #111;
      font-size: ${P}rem;
      line-height: 1.2;
      background: #fff;
      transition: background 0.2s, color 0.2s;
    }
    .btn-scroll:hover {
      background: #111;
      color: #fff;
    }
    .btn-scroll:focus-visible {
      outline: 1px solid #111;
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
      background: #111;
      color: #fff;
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
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "n1.community",
    "url": "https://n1.community",
    "logo": "https://n1.community/web-app-manifest-512x512.png",
    "description": "${DESC}",
    "sameAs": ["https://t.me/Oresty"]
  }
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
  <a href="#content" class="skip-link">Skip to main content</a>
  <main id="content">
  <article>

    <header>
      <p class="text-sm mb-lg"><span class="tooltip" data-tip="Still not the center of the universe — we checked.">Moscow, Earth.</span></p>
      ${logotype()}
      <h1>Weekly fixes for humanity</h1>
      <p class="mt-sm">We build products that make cooperation easy and deception expensive.</p>
    </header>

    ${section('timeline', 'Not that long ago, right?', `
      <p class="mb-phi">In 1543, we realized Earth isn't the center of the universe. We took it personally:</p>
      ${dots(1543, 2025, pastMilestones)}
      <p class="milestone">· 2026 — <span class='tooltip' data-tip='The universe is 13.8 billion years old and you got here just in time.'>What will you do?</span></p>
    `)}

    ${section('future', 'Can we handle what\'s coming?', `
      <p class="text-sm mt-phi mb-micro">The problem is not in human nature. It is in the system — harm is still cheaper than cooperation.</p>
      <p class="text-sm mt-micro mb-micro">Only now do we have enough technology to change how people interact, connect, and cooperate.</p>

      ${plane2D('plane', 'Easy to cooperate', 'Costs of deception', 30, 15)}

      <div id="future-timeline" class="mt-lg"></div>

      <div class="two-col mt-lg">
        ${card('card-wisdom', 'Gods with wisdom ✨', `<p>We build, we grow, we transcend.</p>`)}
        ${card('card-death', 'Humanity is gone 💀', `<p>Destruction outpaced cooperation.</p>`)}
      </div>

      <div class="box mt-lg">
        <p id="system-message" class="mb-phi"></p>
        <a href="#future" class="btn-scroll" onclick="this.blur()">Go back to the plane</a>
      </div>
    `)}

    ${logotype('section-logotype')}

    ${section('mission', 'Mission', `
      <p class="mb-phi">For 300,000 years, a single human could kill one person with <span class='tooltip' data-tip='Cain and Abel energy.'>a rock</span>. Today, a single human can kill millions. But our systems still reward harm and cooperation at roughly the same rate.</p>
      <p class="mb-phi">The fix isn't better humans. It's a better system — one where growing through benefit is faster, cheaper, and more powerful than growing through harm.</p>
      <p class="callout"><strong>Elevate the system for humanity: make it easier to grow through benefit, harder to grow through harm.</strong></p>
      <p class="mb-micro">Create a way of living through win-win that beats selfishness — not through morality, but through better results.</p>
      <p class="mb-phi">Radical openness and win-win as the de facto standard for humanity.</p>

    `)}

    ${section('values', 'Values', items([
      `<strong>1. Win-win or no deal.</strong> Every interaction either creates mutual value or doesn't happen.`,
      `<strong>2. Truth.</strong> Accurate models over comfortable narratives — starting with self-deception.`,
      `<strong>3. Rationality.</strong> Evidence and logic over consensus and emotion — including the obligation to update when proven wrong.`,
      `<strong>4. Transparency.</strong> Default to open. Remove information gaps, starting with your own.`,
      `<strong>5. <span class='tooltip' data-tip="Taleb's term. He'd want us to note he invented it. We just did.">Antifragility.</span></strong> Build mechanisms that get stronger when attacked.`,
      `<strong>6. Leverage.</strong> Minimum force at the point of maximum systemic effect.`,
      `<strong>7. Courage.</strong> Act on the Mission despite resistance from those who profit from the status quo.`,
      `<strong>8. <span class='tooltip' data-tip='Also Taleb. He&#39;s doing well in this section.'>Skin in the Game.</span></strong> Live the system yourself. The founder is the first evidence.`,
      `<strong>9. Patience.</strong> Compound interest mindset — urgency in action, patience in expectation.`,
    ]))}

    ${section('participants', 'Participants', `
      <p class="mb-phi"><strong>n1.member</strong> — an individual who absorbs the coordination cost no one else will, driven by a first-principles understanding that win-win isn't idealism but a superior strategy — in the interests of all humanity.</p>
      <p class="mb-phi"><strong>Current status:</strong> early stage — we are assembling the founding core from scratch.</p>
      <p><strong>Language:</strong> day-to-day communication is mostly in Russian for now.</p>
    `)}

    ${section('internal', 'Internal products', `
      <p class="mb-phi">Solve each other's problems. Access people who raise your ceiling. Raise your efficiency through shared tools and systems.</p>

      <h3>Activities</h3>
      <p class="mb-phi">Weekly rhythm, online and offline.</p>

      ${items([
        `<strong>Joint projects.</strong> In teams of 2‑4. Each must make cooperation easier or deception harder.`,
        `<strong>Idea incubator.</strong> Raw ideas shaped into projects through collective feedback and iteration.`,
        `<strong>Informal meetups.</strong> Sports, dinners, spontaneous conversations.`,
        `<strong>Strategy alignment.</strong> Goals review, roadmap recalibration.`,
        `<strong>Research.</strong> Deep dives into problems worth solving — findings feed back into members' work.`,
      ])}

      <h3>Infrastructure</h3>
      ${items([
        `<strong>Shared expertise map.</strong> Members' skills, contacts, and knowledge — mapped and accessible.`,
        `<strong>Systematic mutual help.</strong> Structured system where helping is tracked, visible, and reciprocated.`,
        `<strong>Club chat.</strong> Async coordination — decisions, questions, quick feedback.`,
      ])}

      <h3>Upcoming event</h3>
      <p class="mb-phi"><strong>Strategy alignment.</strong> Our first community-wide session to review our goals, recalibrate the roadmap, and make sure everyone is pulling in the same direction.</p>
    `)}

    ${section('external', 'External products', `
      <p class="mb-phi">We build and ship our own products — tools that make cooperation easier and deception harder. Weekly updates, small steps that compound.</p>

      <p class="mb-micro">1. IT products for cooperation</p>
      <p class="mb-micro">2. Methods to simplify win-win</p>
      <p class="mb-phi">3. Methods to raise costs of deception</p>

      <h3>Current products</h3>

      <h4>np2</h4>

      <p class="mb-phi"><a href="https://np2.ru/">np2.ru</a> is a community app platform we built ourselves — profiles with skills and requests, AI-powered member search, event ticketing with payments.</p>

      <p class="mb-phi"><strong>Mission alignment:</strong> np2 makes cooperation inside communities systematic — members find the right person instantly, organizers make decisions from real data instead of gut feelings.</p>
      <p class="mb-phi"><strong>Traction (7 weeks in):</strong> 764 users, 20 events, 355 transactions, $20K revenue processed.</p>

      <p class="mb-micro"><strong>Model:</strong> <span class='tooltip' data-tip='Also: Salvation as a Subscription'>SaaS</span> — monthly fee. Target: 1,000 communities → $5M/year.</p>
    `)}

    ${section('join', 'Who this is for', `
      <div class="two-col">
        ${card('card-join-yes', 'Fits', items([
          'Ambitious goals',
          'Explorer of the world',
          'Impact on society/humanity',
          'Growth through win-win',
        ]))}
        ${card('card-join-no', 'Doesn\'t fit', items([
          'Not ready to devote their life to serving society',
          'Satisfied with how the world is',
        ]))}
      </div>
    `)}

    ${ctaBox("Statistically, you shouldn't still be here. And yet.", "Write to us", "https://t.me/Oresty")}

  </article>
  </main>
  <script src="/static/typograf.min.js"></script>
  <script>
    (function() {
      console.log('You opened the console. Kant would approve \\u2014 you\\'re using reason autonomously. t.me/Oresty');

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

      // ── DOM ──
      var planeCanvas = document.querySelector('#plane .plane-canvas');
      var planePoint = document.querySelector('#plane .plane-point');
      var planeHint = document.querySelector('#plane .plane-hint');
      var lineH = document.querySelector('#plane .plane-line-h');
      var lineV = document.querySelector('#plane .plane-line-v');
      var pctX = document.getElementById('pct-x');
      var pctY = document.getElementById('pct-y');
      var container = document.getElementById('future-timeline');
      var systemMsg = document.getElementById('system-message');
      var cardWisdom = document.getElementById('card-wisdom');
      var cardDeath = document.getElementById('card-death');

      // ── 2D Plane State ──
      var coopValue = 30;
      var decepValue = 15;

      function updatePointPosition() {
        planePoint.style.left = coopValue + '%';
        planePoint.style.bottom = decepValue + '%';
        lineH.style.bottom = decepValue + '%';
        lineV.style.left = coopValue + '%';
        pctX.textContent = coopValue + '%';
        pctY.textContent = decepValue + '%';
      }

      function handlePlaneInteraction(e) {
        planeHint.classList.add('hidden');
        var rect = planeCanvas.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        var x = (clientX - rect.left) / rect.width;
        var y = 1 - (clientY - rect.top) / rect.height;
        coopValue = Math.round(Math.max(0, Math.min(100, x * 100)));
        decepValue = Math.round(Math.max(0, Math.min(100, y * 100)));
        updatePointPosition();
        render();
      }

      var dragging = false;
      planeCanvas.addEventListener('mousedown', function(e) { dragging = true; planePoint.classList.add('dragging'); handlePlaneInteraction(e); });
      document.addEventListener('mousemove', function(e) { if (dragging) { e.preventDefault(); handlePlaneInteraction(e); } });
      document.addEventListener('mouseup', function() { dragging = false; planePoint.classList.remove('dragging'); render(); });
      planeCanvas.addEventListener('touchstart', function(e) { dragging = true; planePoint.classList.add('dragging'); handlePlaneInteraction(e); e.preventDefault(); }, { passive: false });
      document.addEventListener('touchmove', function(e) { if (dragging) { handlePlaneInteraction(e); e.preventDefault(); } }, { passive: false });
      document.addEventListener('touchend', function() { dragging = false; planePoint.classList.remove('dragging'); render(); });
      planeCanvas.addEventListener('keydown', function(e) {
        var step = 5;
        if (e.key === 'ArrowRight') { coopValue = Math.min(100, coopValue + step); }
        else if (e.key === 'ArrowLeft') { coopValue = Math.max(0, coopValue - step); }
        else if (e.key === 'ArrowUp') { decepValue = Math.min(100, decepValue + step); }
        else if (e.key === 'ArrowDown') { decepValue = Math.max(0, decepValue - step); }
        else return;
        e.preventDefault();
        planeHint.classList.add('hidden');
        updatePointPosition();
        render();
        var announceEl = document.getElementById('plane-announce');
        if (announceEl) announceEl.textContent = 'Easy to cooperate: ' + coopValue + '%, Costs of deception: ' + decepValue + '%';
      });

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

      function buildTimelineMarkup(startYear, endYear, milestones) {
        var html = '';
        for (var y = startYear; y <= endYear; y++) {
          if (milestones[y]) {
            html += '<p class="milestone">· ' + y + ' \u2014 ' + milestones[y] + '</p>';
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
        var endYear = lastEventYear + 3;

        container.innerHTML = buildTimelineMarkup(2027, endYear, milestones);
      }

      render();
    })();
  </script>
</body>
</html>`;

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
fs.writeFileSync(path.join(dist, 'index.html'), typographNbsp(html));
console.log('Built dist/index.html');
