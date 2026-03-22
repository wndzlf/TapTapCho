import { defineConfig } from '@apps-in-toss/web-framework/config';

const HAMJJI_BOBA_SHOP_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFB7D3"/>
        <stop offset="1" stop-color="#FFD7A6"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#g)"/>
    <circle cx="64" cy="54" r="26" fill="#FFF8F4"/>
    <circle cx="51" cy="48" r="4" fill="#53313F"/>
    <circle cx="77" cy="48" r="4" fill="#53313F"/>
    <path d="M56 60Q64 68 72 60" stroke="#53313F" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="39" cy="34" r="10" fill="#FFF8F4"/>
    <circle cx="89" cy="34" r="10" fill="#FFF8F4"/>
    <rect x="27" y="68" width="74" height="38" rx="14" fill="#FFF2DA"/>
    <path d="M43 28H85L80 66H48Z" fill="#FF7AA8" opacity="0.9"/>
    <circle cx="49" cy="84" r="6" fill="#7CCF9A"/>
    <circle cx="64" cy="84" r="6" fill="#FFCB63"/>
    <circle cx="79" cy="84" r="6" fill="#FF7AA8"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'hamjji-boba-shop',
  brand: {
    displayName: '햄찌보바샵',
    primaryColor: '#FF7AA8',
    icon: HAMJJI_BOBA_SHOP_ICON,
  },
  web: {
    host: 'localhost',
    port: 4178,
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
