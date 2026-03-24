const fs = require('fs');
const path = require('path');
const Typograf = require('typograf');


// ─── Golden Ratio Constants ───
const phi = 1.618033988749895;
const sqrtPhi = Math.sqrt(phi);    // 1.272
const r = (n) => Math.round(n * 1000) / 1000; // round to 3 decimals

// Type scale (all derived from phi):
//   phi²    = 2.618rem — h1/hero
//   phi     = 1.618rem — h2, subtitle, button
//   sqrtPhi    = 1.272rem — h3
//   1     = 1rem     — body
//   1/sqrtPhi  = 0.786rem — small body, milestones, labels
//   1/phi   = 0.618rem — captions, slider values
//   1/phi²  = 0.382rem — dots, micro text

// ─── DRY Functions ───

function dots(from, to, milestones = {}) {
  const lines = [];
  for (let year = from; year <= to; year++) {
    if (milestones[year]) {
      lines.push(`<p class="milestone">. ${year} — ${milestones[year]}</p>`);
    } else {
      lines.push(`<p class="dot">. <span class="dot-year">${year}</span></p>`);
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
    <div class="plane-y-label">${yLabel} — <span class="plane-pct" id="pct-y">${initialY}%</span></div>
    <div class="plane-canvas-wrap">
      <div class="plane-canvas">
        <div class="plane-line-h" style="bottom:${initialY}%"></div>
        <div class="plane-line-v" style="left:${initialX}%"></div>
        <div class="plane-point" style="left:${initialX}%;bottom:${initialY}%"></div>
        <p class="plane-hint">Drag responsibly</p>
      </div>
      <div class="plane-x-label">${xLabel} — <span class="plane-pct" id="pct-x">${initialX}%</span></div>
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
  1961: 'First human in space 🧑‍🚀',
  1965: 'First spacewalk 🧑‍🚀',
  1969: 'First human on Moon 🌕',
  1973: 'Recombinant DNA Technology 🔬',
  1978: 'First IVF Baby 👶',
  1980: 'Discovery of Cosmic Inflation 🌌',
  1983: 'GNU Project 💿',
  1987: 'Black Monday crash 📉',
  1989: 'World Wide Web 🌐',
  1991: 'Linux kernel released 🐧',
  1995: 'First exoplanet around a sun-like star 🪐',
  1997: 'Deep Blue vs. Kasparov ♟️',
  2001: 'Human Genome Sequence 🧪',
  2004: 'Mars Rovers land 🤖',
  2007: 'iPhone 📱',
  2009: 'Bitcoin 🪙',
  2010: 'First synthetic cell created 🧫',
  2012: 'CRISPR/Cas9 ✂️',
  2013: 'NSA revelations 👀',
  2015: 'SpaceX Falcon 9 landing 🚀',
  2016: 'AlphaGo vs. Lee Sedol 🎲',
  2017: 'Transformer Architecture 🤖',
  2018: 'CRISPR Human Embryo Editing 🧬',
  2019: 'COVID-19 🦠',
  2020: 'AlphaFold 🧪',
  2021: 'James Webb Space Telescope 🔭',
  2022: 'ChatGPT 💬',
  2023: 'Repeated Fusion Ignition ☀️',
  2024: 'First complete brain connectome 🪰',
  2025: 'Humanoid Robots at Scale 🦿',
};


// ─── Build HTML ───

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>n1.community — Closing the gap between destruction and cooperation</title>
  <meta name="description" content="We build products that make cooperation easy and deception expensive. A community driven by the understanding that win-win isn't idealism — it's a superior strategy.">
  <meta name="keywords" content="n1, community, cooperation, win-win, coordination, humanity, mission-driven">
  <meta name="author" content="n1.community">
  <link rel="canonical" href="https://n1.community/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://n1.community/">
  <meta property="og:title" content="n1.community — Weekly fixes for humanity">
  <meta property="og:description" content="We build products that make cooperation easy and deception expensive. A community driven by the understanding that win-win isn't idealism — it's a superior strategy.">
  <meta property="og:image" content="https://n1.community/web-app-manifest-512x512.png">
  <meta property="og:site_name" content="n1.community">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="n1.community — Weekly fixes for humanity">
  <meta name="twitter:description" content="We build products that make cooperation easy and deception expensive. A community driven by the understanding that win-win isn't idealism — it's a superior strategy.">
  <meta name="twitter:image" content="https://n1.community/web-app-manifest-512x512.png">

  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="n1" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Playfair:ital,opsz,wght@0,5..1200,300..900;1,5..1200,300..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
  <style>
    /* ─── Reset ─── */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ─── Base ─── */
    html { font-size: 24px; scroll-behavior: smooth; }
    body {
      font-family: 'Playfair', serif;
      color: #000;
      background: #fff;
      line-height: ${r(phi)};
    }

    /* ─── Typography ─── */
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Playfair Display', serif;
      line-height: 1.2;
    }
    h1 {
      font-size: ${r(phi * phi)}rem;
      line-height: 1.1;
      margin-bottom: ${r(phi)}rem;
    }
    h2 {
      font-size: ${r(phi)}rem;
      margin-bottom: ${r(phi)}rem;
    }
    h3 {
      font-size: ${r(sqrtPhi)}rem;
      margin-top: ${r(phi * phi)}rem;
      margin-bottom: ${r(1/phi)}rem;
    }
    h4 {
      margin-top: ${r(1/phi)}rem;
      margin-bottom: ${r(1/phi/phi)}rem;
    }
    .subtitle {
      font-family: 'Playfair Display', serif;
      font-size: ${r(phi)}rem;
      line-height: 1.2;
      margin-bottom: ${r(phi)}rem;
    }
    .callout {
      font-family: 'Playfair Display', serif;
      font-size: ${r(sqrtPhi)}rem;
      margin-bottom: ${r(phi)}rem;
    }
    .text-sm {
      font-size: ${r(1/sqrtPhi)}rem;
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
      left: 0;
      top: 100%;
      margin-top: 0.4em;
      background: #000;
      color: #fff;
      font-size: ${r(1/phi)}rem;
      line-height: 1.4;
      padding: 0.4em 0.7em;
      border-radius: 0.25em;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10;
    }
    .tooltip:hover::after {
      opacity: 1;
    }

    /* ─── Links ─── */
    article a:not(.btn-scroll) {
      color: #000;
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
      outline: 1px solid #000;
      outline-offset: 0.15em;
    }

    /* ─── Layout ─── */
    article {
      max-width: 38em;
      margin: 0 auto;
      padding: ${r(phi * phi)}rem ${r(phi)}rem;
    }
    .hero-logotype {
      height: ${r(phi * phi * phi)}rem;
      width: auto;
      margin-top: ${r(phi * phi)}rem;
      margin-bottom: ${r(phi * phi)}rem;
    }
    header {
      margin-bottom: ${r(phi * phi * phi)}rem;
    }
    section {
      margin-top: ${r(phi * phi * phi)}rem;
    }
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: ${r(phi)}rem;
      align-items: stretch;
    }

    /* ─── Spacing (phi-derived) ─── */
    .mb-phi { margin-bottom: ${r(phi)}rem; }
    .mb-sm { margin-bottom: ${r(1/phi)}rem; }
    .mb-micro { margin-bottom: ${r(1/phi/phi)}rem; }
    .mt-phi { margin-top: ${r(phi)}rem; }
    .mt-sm { margin-top: ${r(1/phi)}rem; }
    .mt-lg { margin-top: ${r(phi * phi)}rem; }
    .mb-lg { margin-bottom: ${r(phi * phi)}rem; }

    /* ─── Components ─── */
    .card {
      border: 1px solid #000;
      padding: ${r(phi)}rem;
      transition: opacity 0.3s;
    }
    .card-title {
      font-family: 'Playfair Display', serif;
      font-size: ${r(sqrtPhi)}rem;
      margin-bottom: ${r(phi)}rem;
    }
    .box {
      border: 1px solid #000;
      padding: ${r(phi)}rem;
    }
    .cta-box {
      margin-top: ${r(phi * phi * phi)}rem;
      padding: ${r(phi)}rem;
      border: 1px solid #000;
    }
    .plane-2d {
      display: flex;
      align-items: stretch;
      margin: ${r(phi)}rem 0;
      gap: ${r(1/phi/phi)}rem;
      max-width: 100%;
    }
    .plane-y-label {
      writing-mode: vertical-lr;
      transform: rotate(180deg);
      font-size: ${r(1/sqrtPhi)}rem;
      text-align: center;
      white-space: nowrap;
    }
    .plane-canvas-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: ${r(1/phi/phi)}rem;
    }
    .plane-canvas {
      position: relative;
      width: 100%;
      max-width: 20rem;
      aspect-ratio: 1;
      border: 1px solid #000;
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
      background: #000;
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
      font-size: ${r(1/sqrtPhi)}rem;
      text-align: center;
    }
    .plane-hint {
      position: absolute;
      left: 30%;
      bottom: 15%;
      transform: translate(1rem, -0.5rem);
      font-size: ${r(1/sqrtPhi)}rem;
      color: #000;
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
      font-size: ${r(1/phi/phi)}rem;
      line-height: 1.1;
      margin: 0;
      padding: 0;
    }
    .dot-year {
      font-size: ${r(1/phi)}rem;
      opacity: 0.30;
    }
    .milestone {
      font-size: ${r(1/sqrtPhi)}rem;
      line-height: ${r(phi)};
      padding: ${r(1/phi/phi/phi)}rem 0;
    }

    /* ─── Controls ─── */
    .btn-scroll {
      display: block;
      margin-top: ${r(phi)}rem;
      padding: ${r(1/phi)}rem ${r(phi)}rem;
      border: 1px solid #000;
      text-align: center;
      text-decoration: none;
      color: #000;
      font-size: ${r(phi)}rem;
      line-height: 1.2;
      background: #fff;
      transition: background 0.2s, color 0.2s;
    }
    .btn-scroll:hover {
      background: #000;
      color: #fff;
    }
    .btn-scroll:focus-visible {
      outline: 1px solid #000;
      outline-offset: ${r(1/phi/phi)}rem;
    }
    .btn-scroll:active {
      opacity: 0.8;
    }

    /* ─── Responsive ─── */
    @media (max-width: 600px) {
      html { font-size: 18px; }
      h1 { font-size: ${r(phi)}rem; }
    }
    @media (max-width: 380px) {
      html { font-size: 16px; }
    }

    /* ─── Overrides ─── */
    #future {
      scroll-margin-top: ${r(1/phi/phi)}rem;
      padding-top: ${r(phi * phi * phi)}rem;
      margin-top: 0 !important;
    }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "n1.community",
    "url": "https://n1.community",
    "logo": "https://n1.community/web-app-manifest-512x512.png",
    "description": "We build products that make cooperation easy and deception expensive. A community driven by the understanding that win-win isn't idealism — it's a superior strategy.",
    "sameAs": ["https://t.me/Oresty"]
  }
  </script>
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
  <article>

    <header>
      <p class="text-sm mb-lg"><span class="tooltip" data-tip="Still not the center of the universe — we checked.">Moscow, Earth.</span></p>
      <img class="hero-logotype" src="/static/n1-logotype.svg" alt="n1.community">
      <h1>Weekly fixes for humanity</h1>
      <p class="mt-sm">We build products that make cooperation easy and deception expensive. New updates — every week.</p>
      <p class="mt-sm">A community of individuals who absorb the coordination cost no one else will — driven by the first-principles understanding that win-win isn't idealism, it's a superior strategy.</p>
    </header>

    ${section('timeline', 'Not that long ago, right?', `
      <p class="mb-phi">In 1543 we realized Earth isn't the center of the universe. We took it personally.</p>
      ${dots(1543, 2025, pastMilestones)}
      <p class="milestone">. 2026 — What will you do?</p>
    `)}

    ${section('future', 'Can we handle what\'s coming?', `
      <p class="text-sm mt-phi mb-micro">The problem is not in human nature. It's in the system — it still makes harm cheaper than cooperation.</p>
      <p class="text-sm mt-micro mb-micro">Only now do we have enough technology to change the whole system of interactions, connections, and cooperation.</p>

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

    ${section('mission', 'Mission', `
      <p class="mb-phi">For 300,000 years, a single human could kill one person with a rock. Today, a single human can kill millions. But our systems still reward harm and cooperation at roughly the same rate.</p>
      <p class="mb-phi">The fix isn't better humans. It's a better system — one where growing through benefit is faster, cheaper, and more powerful than growing through harm.</p>
      <p class="callout"><strong>Elevate the system for humanity: make it easier to grow through benefit, harder to grow through harm.</strong></p>
      <p class="mb-micro">Create a way of living by win-win that outcompetes egoism — not through morality, but through superior results.</p>
      <p class="mb-phi">Radical openness and win-win as the de facto standard for humanity.</p>

      <h3>Why "N1"</h3>
      <p class="mb-phi">Named after the Soviet N-1 rocket. In the 1960s, engineers designed a brilliant architecture — 30 engines working in sync — but lacked the computing power to coordinate them. It failed not because the idea was wrong, but because the technology wasn't ready. Sixty years later, SpaceX flew Starship with 33 engines — the same approach, now proven by modern computing.</p>
      <p>Same story with cooperation. For centuries, philosophers, writers, and reformers tried to build a society on mutual benefit — and every time it fell apart. Not because the idea was wrong, but because the technologies didn't exist. Now they do: internet, Big Data, AI, cryptography, smart contracts, and global real-time communication make large-scale cooperation possible for the first time.</p>
    `)}

    ${section('values', 'Values', `
      <p class="mb-micro"><strong>1. Win-win or no deal.</strong> Every interaction either creates mutual value or doesn't happen.</p>
      <p class="mb-micro"><strong>2. Truth.</strong> Accurate models above comfortable narratives — starting with self-deception.</p>
      <p class="mb-micro"><strong>3. Rationality.</strong> Evidence and logic over consensus and emotion — including the obligation to update when proven wrong.</p>
      <p class="mb-micro"><strong>4. Transparency.</strong> Default to open. Eliminate information asymmetry starting with yourself.</p>
      <p class="mb-micro"><strong>5. Antifragility.</strong> Build mechanisms that get stronger when attacked.</p>
      <p class="mb-micro"><strong>6. Leverage.</strong> Minimum force at the point of maximum systemic effect.</p>
      <p class="mb-micro"><strong>7. Courage.</strong> Act on the Mission despite resistance from those who profit from the status quo.</p>
      <p class="mb-micro"><strong>8. Skin in the Game.</strong> Live the system yourself. The founder is the first evidence.</p>
      <p><strong>9. Patience.</strong> Compound interest mindset — urgency in action, patience in expectation.</p>
    `)}

    ${section('participants', 'Participants', `
      <p class="mb-phi"><strong>n1.member</strong> — an individual who absorbs the coordination cost no one else will, driven by first-principles understanding that win-win isn't idealism but a superior strategy — in the interests of all humanity.</p>
      <p>For now we are building the core of the community from scratch and actively recruiting new members.</p>
    `)}

    ${section('internal', 'Internal products', `
      <p class="mb-phi">Solve each other's problems. Access people who raise your ceiling. Systematically raise your operating efficiency through shared infrastructure.</p>

      <h3>Activities</h3>
      <p class="mb-phi">Weekly: Set goals, execute, demo results.</p>

      <p class="mb-micro"><strong>Joint projects.</strong> In teams of 2‑4. Each must make cooperation easier or deception harder.</p>
      <p class="mb-micro"><strong>Quarterly:</strong> Strategy alignment, goals review, roadmap recalibration.</p>
      <p class="mb-micro"><strong>Research.</strong> Deep dives into problems worth solving — findings feed back into members' work.</p>
      <p class="mb-micro"><strong>Idea incubator.</strong> Raw ideas shaped into projects through collective feedback and iteration.</p>
      <p class="mb-micro"><strong>Informal meetups.</strong> Sports, dinners, spontaneous conversations.</p>

      <h3>Infrastructure</h3>
      <p class="mb-micro"><strong>Shared expertise map.</strong> Members' skills, contacts, and knowledge — mapped and accessible.</p>
      <p class="mb-micro"><strong>Systematic mutual help.</strong> Structured system where helping is tracked, visible, and reciprocated.</p>
      <p><strong>Club chat.</strong> Async coordination — decisions, questions, quick feedback.</p>

      <h3>Upcoming event</h3>
      <p class="mb-phi"><strong>Strategy alignment.</strong> Our first community-wide session to review our goals, recalibrate the roadmap, and make sure everyone is pulling in the same direction. Goals review, open discussion, and clear next steps — so every member knows where we're headed and why.</p>
    `)}

    ${section('external', 'External products', `
      <p class="mb-phi">We build and ship our own products — tools that make cooperation easier and deception harder. Weekly updates, small steps compound.</p>

      <p class="mb-micro">1. IT products for cooperation</p>
      <p class="mb-micro">2. Methods to simplify win-win</p>
      <p class="mb-phi">3. Methods to raise costs of deception</p>

      <h3>Current product</h3>
      <p class="mb-phi"><a href="https://np2.ru/">np2.ru</a> is a community app platform we built ourselves — profiles with skills and requests, AI-powered member search, event ticketing with payments.</p>

      <p class="mb-micro"><strong>Mission alignment:</strong> np2 makes cooperation inside communities systematic — members find the right person instantly, organizers make decisions from real data instead of gut feelings.</p>
      <p class="mb-phi"><strong>Traction (7 weeks in):</strong> 764 users, 20 events, 355 transactions, 1.5M ₽ revenue processed.</p>

      <p class="mb-micro"><strong>Model:</strong> SaaS — monthly fee. Target: 100 clubs → 42M ₽/year.</p>
    `)}

    ${section('join', 'Join', `
      <div class="two-col">
        ${card('card-join-yes', 'Who fits', `
          <p class="mb-micro">Ambitious goals</p>
          <p class="mb-micro">Explorer of the world</p>
          <p class="mb-micro">Impact on society/humanity</p>
          <p>Growth through win-win</p>
        `)}
        ${card('card-join-no', 'Who doesn\'t fit', `
          <p class="mb-micro">Not ready to devote their life to serving humanity</p>
          <p>Satisfied with how the world is</p>
        `)}
      </div>
    `)}

    ${ctaBox("If you've read this far without closing the tab, your prefrontal cortex has overruled your limbic system. That's exactly the kind of person we're looking for.", "Write to us", "https://t.me/Oresty")}

  </article>
  <script src="/static/typograf.min.js"></script>
  <script>
    (function() {
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
        { label: 'Homo Deus: Transcendence \\u{1F30C}', category: 'beneficial',
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
      document.addEventListener('mouseup', function() { dragging = false; planePoint.classList.remove('dragging'); });
      planeCanvas.addEventListener('touchstart', function(e) { dragging = true; planePoint.classList.add('dragging'); handlePlaneInteraction(e); e.preventDefault(); }, { passive: false });
      document.addEventListener('touchmove', function(e) { if (dragging) { handlePlaneInteraction(e); e.preventDefault(); } }, { passive: false });
      document.addEventListener('touchend', function() { dragging = false; planePoint.classList.remove('dragging'); });

      // ── Safety Score for Extinction ──
      // Cooperation (40%): enables collective governance against existential risk
      // Deception costs (30%): deters bad actors from catastrophic actions
      // Synergy (30%): you need BOTH for robust safety (sqrt penalizes imbalance)
      function safetyScore(coop, decep) {
        return 0.4 * coop + 0.3 * decep + 0.3 * Math.sqrt(coop * decep);
      }

      // ── Hazard Rate Model ──
      // Based on Toby Ord (~1/6 per century at current trajectory ~safety 0.35).
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

      // ── Timeline Computation ──
      function computeTimeline(coopRaw, decepRaw) {
        var coop = coopRaw / 100;
        var decep = decepRaw / 100;
        var extinctionYear = computeExtinctionYear(coop, decep);
        var visibleEvents = [];

        for (var i = 0; i < futureEvents.length; i++) {
          var ev = futureEvents[i];

          // Beneficial: need minimum cooperation and/or deception cost
          if (ev.minCoop !== undefined && coop < ev.minCoop) continue;
          if (ev.minDecep !== undefined && decep < ev.minDecep) continue;

          // Dystopian: filtered out when slider is high enough
          if (ev.maxCoop !== undefined && coop >= ev.maxCoop) continue;
          if (ev.maxDecep !== undefined && decep >= ev.maxDecep) continue;

          var year = computeEventYear(ev, coop, decep);

          // Cut off at extinction — nothing happens after humanity dies
          if (extinctionYear !== null && year >= extinctionYear) continue;

          visibleEvents.push({ label: ev.label, category: ev.category, year: year });
        }

        // Determine ending
        var safety = safetyScore(coop, decep);
        if (extinctionYear !== null && extinctionYear <= 2200) {
          visibleEvents.push({ label: 'Human Extinction \\u{1F480}', category: 'extinction', year: extinctionYear });
        } else if (coop >= 0.65 && decep >= 0.60) {
          var lastYear = 2060;
          for (var j = 0; j < visibleEvents.length; j++) {
            if (visibleEvents[j].year > lastYear) lastYear = visibleEvents[j].year;
          }
          visibleEvents.push({ label: 'Humanity \\u2014 gods with wisdom \\u2728', category: 'transcendence', year: lastYear + 10 });
        } else if (safety >= 0.45) {
          var lastYear = 2060;
          for (var j = 0; j < visibleEvents.length; j++) {
            if (visibleEvents[j].year > lastYear) lastYear = visibleEvents[j].year;
          }
          visibleEvents.push({ label: 'Intelligent life survives \\u{1F331}', category: 'survival', year: lastYear + 5 });
        }

        visibleEvents.sort(function(a, b) { return a.year - b.year; });
        return { events: visibleEvents, coop: coop, decep: decep, safety: safety, extinctionYear: extinctionYear };
      }

      // ── System Message ──
      // References specific slider deficiencies so user knows what to change
      function getMessage(coop, decep, extinctionYear, events) {
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
          return 'Genuine progress. Cooperation and accountability are catching up.' + (hasBeneficial ? ' Life extension, aligned AI become real possibilities.' : '') + ' Trust starts to outcompete exploitation.';
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
          var e = events[i];
          if (milestones[e.year]) {
            milestones[e.year] += ' / ' + e.label;
          } else {
            milestones[e.year] = e.label;
          }
        }

        // Determine timeline range
        var lastEventYear = 2035;
        for (var i = 0; i < events.length; i++) {
          if (events[i].year > lastEventYear) lastEventYear = events[i].year;
        }
        var endYear = lastEventYear + 3;

        var startYear = 2027;
        var html = '';
        for (var y = startYear; y <= endYear; y++) {
          if (milestones[y]) {
            html += '<p class="milestone">. ' + y + ' \\u2014 ' + milestones[y] + '</p>';
          } else {
            html += '<p class="dot">. <span class="dot-year">' + y + '</span></p>';
          }
          // Stop after extinction
          if (milestones[y] && milestones[y].indexOf('Extinction') !== -1) break;
        }
        container.innerHTML = html;
      }

      render();
    })();
  </script>
</body>
</html>`;

// ─── Write Output ───

const dist = path.join(__dirname, 'dist');
const staticDir = path.join(dist, 'static');
if (!fs.existsSync(dist)) fs.mkdirSync(dist);
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir);
fs.copyFileSync(
  path.join(__dirname, 'node_modules/typograf/dist/typograf.min.js'),
  path.join(staticDir, 'typograf.min.js')
);
const pub = path.join(__dirname, 'public');
if (fs.existsSync(pub)) {
  for (const file of fs.readdirSync(pub)) {
    if (file === 'n1-logotype.svg') continue; // only used from /static/
    fs.copyFileSync(path.join(pub, file), path.join(dist, file));
  }
  fs.copyFileSync(path.join(pub, 'n1-logotype.svg'), path.join(staticDir, 'n1-logotype.svg'));
}
fs.writeFileSync(path.join(dist, 'index.html'), typographNbsp(html));
console.log('Built dist/index.html');
