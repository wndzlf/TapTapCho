import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#153549"/>
        <stop offset="60%" stop-color="#215E7B"/>
        <stop offset="100%" stop-color="#0FA39A"/>
      </linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F7FCFF"/>
        <stop offset="100%" stop-color="#DDEEF5"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <rect x="18" y="18" width="92" height="92" rx="20" fill="url(#card)"/>
    <g fill="#184D69">
      <rect x="32" y="62" width="14" height="28" rx="3"/>
      <rect x="51" y="46" width="14" height="44" rx="3"/>
      <rect x="70" y="32" width="14" height="58" rx="3"/>
    </g>
    <path d="M30 48L46 56L62 44L90 28" fill="none" stroke="#0F8A83" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="48" r="4" fill="#0F8A83"/>
    <circle cx="46" cy="56" r="4" fill="#0F8A83"/>
    <circle cx="62" cy="44" r="4" fill="#0F8A83"/>
    <circle cx="90" cy="28" r="4" fill="#0F8A83"/>
  </svg>`,
)}`;

const appName = process.env.TOSS_APP_NAME ?? 'officetel-watch';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '서울·경기 오피스텔 실거래 TOP 10';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#28739A',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4177,
    commands: {
      dev: 'node scripts/dev-server.mjs',
      build: 'node scripts/build-web.mjs',
    },
  },
  webViewProps: {
    type: 'partner',
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  permissions: [],
  outdir: 'dist',
});
