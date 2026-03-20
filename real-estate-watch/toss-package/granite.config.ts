import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#17313A"/>
        <stop offset="55%" stop-color="#27444A"/>
        <stop offset="100%" stop-color="#D88D52"/>
      </linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF6E8"/>
        <stop offset="100%" stop-color="#F1D8B7"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <rect x="18" y="18" width="92" height="92" rx="20" fill="url(#card)"/>
    <g fill="#254047">
      <rect x="32" y="70" width="10" height="20" rx="3"/>
      <rect x="47" y="58" width="10" height="32" rx="3"/>
      <rect x="62" y="46" width="10" height="44" rx="3"/>
      <rect x="77" y="35" width="10" height="55" rx="3"/>
    </g>
    <path d="M34 56L50 48L64 54L84 36" fill="none" stroke="#0F6C6D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="34" cy="56" r="4" fill="#0F6C6D"/>
    <circle cx="50" cy="48" r="4" fill="#0F6C6D"/>
    <circle cx="64" cy="54" r="4" fill="#0F6C6D"/>
    <circle cx="84" cy="36" r="4" fill="#0F6C6D"/>
  </svg>`,
)}`;

const appName = process.env.TOSS_APP_NAME ?? 'real-estate-watch';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '서울·경기 아파트 실거래';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#B86B2F',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4176,
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
