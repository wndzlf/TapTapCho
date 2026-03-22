import { defineConfig } from '@apps-in-toss/web-framework/config';

const CASSETTE_AB_WORLD_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFBE7D"/>
        <stop offset="1" stop-color="#7AE7FF"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="#121C2D"/>
    <rect x="20" y="40" width="88" height="48" rx="14" fill="url(#g)"/>
    <rect x="30" y="50" width="68" height="28" rx="10" fill="#0F1A2A"/>
    <circle cx="44" cy="64" r="8" fill="#FFBE7D"/>
    <circle cx="84" cy="64" r="8" fill="#7AE7FF"/>
    <rect x="58" y="57" width="12" height="14" rx="3" fill="#EAF2FC" opacity="0.8"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'cassette-ab-world',
  brand: {
    displayName: '카세트 A/B 월드',
    primaryColor: '#7AE7FF',
    icon: CASSETTE_AB_WORLD_ICON,
  },
  web: {
    host: 'localhost',
    port: 4176,
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
