import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#18407C"/>
        <stop offset="60%" stop-color="#2F75D7"/>
        <stop offset="100%" stop-color="#7FCBFF"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <path d="M64 20L84 92H72L64 67L56 92H44L64 20Z" fill="#F5F9FF"/>
    <path d="M52 77L64 56L76 77" fill="#A6D7FF"/>
    <rect x="27" y="96" width="74" height="10" rx="5" fill="#0E2B56"/>
    <circle cx="52" cy="103" r="4" fill="#D6EEFF"/>
    <circle cx="76" cy="103" r="4" fill="#D6EEFF"/>
  </svg>`,
)}`;

const appName = process.env.TOSS_APP_NAME ?? 'airstrikerlite';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '에어 스트라이커 라이트';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#2F75D7',
    icon,
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
