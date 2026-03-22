import { defineConfig } from '@apps-in-toss/web-framework/config';

const BERRY_BEAR_BAKERY_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#F06D8B"/>
    <circle cx="64" cy="58" r="28" fill="#FFF8F5"/>
    <circle cx="64" cy="65" r="18" fill="#FFE7DB"/>
    <circle cx="54" cy="54" r="3.5" fill="#563243"/>
    <circle cx="74" cy="54" r="3.5" fill="#563243"/>
    <path d="M58 67Q64 72 70 67" stroke="#563243" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M33 84H95V102H33z" fill="#FFF2E8"/>
    <circle cx="42" cy="79" r="7" fill="#FF6F8F"/>
    <circle cx="58" cy="79" r="7" fill="#7F9DFF"/>
    <circle cx="74" cy="79" r="7" fill="#DB6E9B"/>
    <circle cx="90" cy="79" r="7" fill="#FF9EB7"/>
    <path d="M44 35l8-10 8 10" fill="#B66F4A"/>
    <path d="M84 35l-8-10-8 10" fill="#B66F4A"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'berry-bear-bakery',
  brand: {
    displayName: '베리베어 베이커리',
    primaryColor: '#FF6F8F',
    icon: BERRY_BEAR_BAKERY_ICON,
  },
  web: {
    host: 'localhost',
    port: 4179,
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
