import { defineConfig } from '@apps-in-toss/web-framework/config';

const WORM_ARENA_RUSH_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A4FA6"/>
        <stop offset="1" stop-color="#0E1F49"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <circle cx="64" cy="64" r="38" fill="none" stroke="#7FB4FF" stroke-width="9" stroke-linecap="round" stroke-dasharray="160 90"/>
    <circle cx="88" cy="40" r="8" fill="#FFD372"/>
    <circle cx="91" cy="37" r="2.8" fill="#1A2445"/>
    <circle cx="44" cy="90" r="6" fill="#6DE8C4" opacity="0.92"/>
    <circle cx="30" cy="70" r="4" fill="#FF9F8A" opacity="0.88"/>
    <circle cx="76" cy="94" r="5" fill="#FFE9A4" opacity="0.9"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'worm-arena-rush',
  brand: {
    displayName: '웜아레나러시',
    primaryColor: '#2A4FA6',
    icon: WORM_ARENA_RUSH_ICON,
  },
  web: {
    host: 'localhost',
    port: 4187,
    commands: {
      dev: 'jiti scripts/dev-server.mjs',
      build: 'jiti scripts/build-web.mjs',
    },
  },
  webViewProps: {
    type: 'game',
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  permissions: [],
  outdir: 'dist',
});
