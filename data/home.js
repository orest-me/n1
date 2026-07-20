'use strict';

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

// Slider-driven future timeline. Threshold fields are optional:
// minCoop/minDecep require enough cooperation/accountability; maxCoop/maxDecep
// hide dystopian outcomes once those inputs become sufficiently strong.
const futureEvents = [
  { label: 'BCI at Scale 🧠', category: 'tech', yearRange: [2027, 2030], cW: 0.2, dW: 0.1 },
  { label: 'AGI-Level Systems ⚡', category: 'tech', yearRange: [2027, 2033], cW: 0.4, dW: 0.1 },
  { label: 'Quantum-AI Drug Discovery 💊', category: 'tech', yearRange: [2029, 2038], cW: 0.5, dW: 0.1 },
  { label: 'AI-Driven Scientific Revolution 🔬', category: 'tech', yearRange: [2030, 2045], cW: 0.6, dW: 0.1 },
  { label: 'The Singularity 🕳️', category: 'tech', yearRange: [2040, 2070], cW: 0.4, dW: 0.2 },

  { label: 'Longevity Escape Velocity ♾️', category: 'beneficial', yearRange: [2035, 2080], cW: 0.7, dW: 0.2, minCoop: 0.25 },
  { label: 'Aligned Superintelligence 🌐', category: 'beneficial', yearRange: [2040, 2075], cW: 0.5, dW: 0.4, minCoop: 0.40, minDecep: 0.30 },
  { label: 'Biological Age Reversal 🧬', category: 'beneficial', yearRange: [2045, 2090], cW: 0.6, dW: 0.2, minCoop: 0.35 },
  { label: 'Brain-Cloud Interface ☁️', category: 'beneficial', yearRange: [2050, 2100], cW: 0.4, dW: 0.5, minCoop: 0.40, minDecep: 0.35 },
  { label: 'Post-Scarcity Economics 🏛️', category: 'beneficial', yearRange: [2060, 2150], cW: 0.5, dW: 0.4, minCoop: 0.55, minDecep: 0.45 },
  { label: 'A-Mortality (Death Optional) 🔮', category: 'beneficial', yearRange: [2070, 2200], cW: 0.5, dW: 0.4, minCoop: 0.55, minDecep: 0.50 },
  { label: 'Flourishing Civilization 🌌', category: 'beneficial', yearRange: [2100, 2300], cW: 0.5, dW: 0.5, minCoop: 0.65, minDecep: 0.60 },

  { label: 'The Useless Class 📉', category: 'dystopian', yearRange: [2028, 2045], cW: 0.6, dW: 0.2, maxCoop: 0.55 },
  { label: 'Total Surveillance State 👁️', category: 'dystopian', yearRange: [2028, 2050], cW: 0.2, dW: 0.8, maxDecep: 0.50 },
  { label: 'Biological Castes 🧪', category: 'dystopian', yearRange: [2035, 2070], cW: 0.6, dW: 0.3, maxCoop: 0.50 },
  { label: 'Species Divergence 🧬', category: 'dystopian', yearRange: [2045, 2090], cW: 0.5, dW: 0.4, maxCoop: 0.45 },
];

module.exports = { pastMilestones, futureEvents };
