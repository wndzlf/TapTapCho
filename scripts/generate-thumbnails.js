const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'assets', 'thumbs');

function escapeXml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function colorSet(seed) {
  const h = seed % 360;
  const h2 = (h + 46) % 360;
  const h3 = (h + 120) % 360;
  return {
    a: `hsl(${h} 84% 56%)`,
    b: `hsl(${h2} 82% 50%)`,
    c: `hsl(${h3} 86% 58%)`,
  };
}

function normalizeTag(tag) {
  return tag.replace(/[\u00b7]/g, '-').replace(/\s+/g, ' ').trim();
}

function categoryIcon(category, accent) {
  const c = category.toLowerCase();

  if (c.includes('racing') || c.includes('drift') || c.includes('runner')) {
    return `<g opacity="0.94" stroke="${accent}" stroke-width="8" stroke-linecap="round" fill="none">
      <path d="M430 88 L570 88"/>
      <path d="M400 122 L540 122"/>
      <path d="M455 156 L595 156"/>
    </g>`;
  }

  if (c.includes('puzzle') || c.includes('logic') || c.includes('sudoku') || c.includes('blocks')) {
    return `<g opacity="0.93" fill="${accent}">
      <rect x="430" y="64" width="48" height="48" rx="10"/>
      <rect x="488" y="64" width="48" height="48" rx="10" opacity="0.75"/>
      <rect x="546" y="64" width="48" height="48" rx="10" opacity="0.58"/>
      <rect x="459" y="122" width="48" height="48" rx="10" opacity="0.82"/>
      <rect x="517" y="122" width="48" height="48" rx="10" opacity="0.66"/>
    </g>`;
  }

  if (c.includes('snake') || c.includes('worm')) {
    return `<path d="M424 144 C470 74, 538 74, 574 122 C599 154, 582 201, 542 208 C500 216, 475 196, 468 172"
      fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>`;
  }

  if (c.includes('arcade') || c.includes('reflex') || c.includes('survival')) {
    return `<g opacity="0.95" fill="${accent}">
      <circle cx="470" cy="98" r="16"/>
      <circle cx="527" cy="86" r="12"/>
      <circle cx="560" cy="130" r="10"/>
      <circle cx="515" cy="144" r="8"/>
    </g>`;
  }

  if (c.includes('party') || c.includes('wheel')) {
    return `<g opacity="0.95" transform="translate(510 116)">
      <circle cx="0" cy="0" r="50" fill="none" stroke="${accent}" stroke-width="10"/>
      <path d="M0 -48 L20 0 L0 48 L-20 0 Z" fill="${accent}" opacity="0.72"/>
    </g>`;
  }

  if (c.includes('3d') || c.includes('explore') || c.includes('roam')) {
    return `<g opacity="0.94" fill="none" stroke="${accent}" stroke-width="7" stroke-linejoin="round">
      <path d="M470 76 L540 52 L604 86 L535 109 Z"/>
      <path d="M470 76 L470 152 L535 186 L535 109 Z"/>
      <path d="M535 109 L604 86 L604 160 L535 186 Z"/>
    </g>`;
  }

  if (c.includes('multiplayer')) {
    return `<g opacity="0.95" fill="${accent}">
      <circle cx="496" cy="95" r="22"/>
      <circle cx="548" cy="115" r="22" opacity="0.7"/>
    </g>`;
  }

  if (c.includes('card') || c.includes('solitaire')) {
    return `<g opacity="0.95" fill="${accent}">
      <rect x="470" y="70" width="80" height="110" rx="10"/>
      <rect x="490" y="54" width="80" height="110" rx="10" opacity="0.6"/>
    </g>`;
  }

  return `<g opacity="0.94" stroke="${accent}" stroke-width="9" fill="none" stroke-linecap="round">
    <path d="M452 84 L592 84"/>
    <path d="M432 126 L572 126"/>
    <path d="M472 168 L612 168"/>
  </g>`;
}

function buildSvg(title, tags, href) {
  const safeTitle = title.trim();
  const safeTags = normalizeTag(tags || 'Game');
  const seed = hashString(`${safeTitle}|${safeTags}|${href}`);
  const colors = colorSet(seed);

  const titleShort = safeTitle.length > 22 ? `${safeTitle.slice(0, 21)}...` : safeTitle;
  const tagShort = safeTags.length > 26 ? `${safeTags.slice(0, 25)}...` : safeTags;
  const initial = safeTitle.charAt(0).toUpperCase();

  const icon = categoryIcon(safeTags, colors.c);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${escapeXml(safeTitle)} thumbnail">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1326"/>
      <stop offset="45%" stop-color="${colors.a}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#121a31"/>
    </linearGradient>
    <radialGradient id="flare" cx="0.18" cy="0.2" r="0.8">
      <stop offset="0%" stop-color="${colors.b}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="strip" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${colors.c}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${colors.b}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="640" height="360" fill="url(#bg)"/>
  <rect width="640" height="360" fill="url(#flare)"/>
  <path d="M-20 286 C145 208, 266 330, 420 272 C512 238, 590 204, 680 256 L680 380 L-20 380 Z" fill="url(#strip)"/>

  <g opacity="0.18" fill="#ffffff">
    <circle cx="86" cy="74" r="18"/>
    <circle cx="142" cy="46" r="7"/>
    <circle cx="204" cy="78" r="12"/>
    <circle cx="248" cy="42" r="5"/>
  </g>

  <text x="36" y="126" fill="#ffffff" fill-opacity="0.12" font-size="108" font-family="Arial, sans-serif" font-weight="700">${escapeXml(initial)}</text>
  ${icon}

  <rect x="22" y="258" width="596" height="82" rx="12" fill="#050916" fill-opacity="0.44"/>
  <text x="40" y="300" fill="#f4f9ff" font-family="Arial, sans-serif" font-weight="700" font-size="34">${escapeXml(titleShort)}</text>
  <text x="40" y="328" fill="#d1ddf6" font-family="Arial, sans-serif" font-size="20">${escapeXml(tagShort)}</text>
</svg>
`;
}

function parseCards(html) {
  const cards = [];
  const cardRegex = /<a class="card(?: card-3d)?" href="([^"]+)">([\s\S]*?)<\/a>/g;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const href = match[1];
    const body = match[2];

    const titleMatch = body.match(/<div class="thumb-title">([^<]+)<\/div>/);
    const tagsMatch = body.match(/<div class="tags">([^<]+)<\/div>/);

    if (!titleMatch) continue;

    cards.push({
      href,
      title: titleMatch[1].trim(),
      tags: tagsMatch ? tagsMatch[1].trim() : 'Game',
    });
  }

  return cards;
}

function makeKeyFromHref(href) {
  return href
    .replace(/^\.\//, '')
    .replace(/\/index\.html$/, '')
    .replace(/\//g, '__');
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html not found.');
    process.exit(1);
  }

  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const cards = parseCards(html);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const card of cards) {
    const key = makeKeyFromHref(card.href);
    const filePath = path.join(OUT_DIR, `${key}.svg`);
    const svg = buildSvg(card.title, card.tags, card.href);
    fs.writeFileSync(filePath, svg, 'utf8');
  }

  console.log(`Generated ${cards.length} thumbnails in assets/thumbs`);
}

main();
