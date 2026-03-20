import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0E3340"/>
        <stop offset="55%" stop-color="#14656A"/>
        <stop offset="100%" stop-color="#F48850"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <rect x="18" y="18" width="92" height="92" rx="20" fill="#F4FCFC"/>
    <circle cx="48" cy="64" r="18" fill="none" stroke="#CFE9E8" stroke-width="6"/>
    <circle cx="48" cy="64" r="8" fill="#0E7B7D"/>
    <path d="M48 64L66 48" fill="none" stroke="#F48850" stroke-width="6" stroke-linecap="round"/>
    <rect x="74" y="48" width="12" height="32" rx="3" fill="#0E7B7D"/>
    <rect x="90" y="39" width="12" height="41" rx="3" fill="#F48850"/>
  </svg>`,
)}`;

const appName = process.env.TOSS_APP_NAME ?? 'commercial-area-radar';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '동네 상권 레이더';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#0E7B7D',
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
