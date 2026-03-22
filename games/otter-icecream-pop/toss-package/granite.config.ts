import { defineConfig } from '@apps-in-toss/web-framework/config';

const OTTER_ICECREAM_POP_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#91E4FF"/>
        <stop offset="100%" stop-color="#4FB8E0"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#g)"/>
    <circle cx="64" cy="71" r="28" fill="#FFF8E8"/>
    <circle cx="50" cy="54" r="11" fill="#FFF8E8"/>
    <circle cx="78" cy="54" r="11" fill="#FFF8E8"/>
    <circle cx="54" cy="67" r="4" fill="#3F556A"/>
    <circle cx="74" cy="67" r="4" fill="#3F556A"/>
    <path d="M56 78Q64 85 72 78" stroke="#3F556A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="40" y="88" width="48" height="16" rx="8" fill="#FF9FBA"/>
    <rect x="52" y="16" width="24" height="34" rx="10" fill="#FFF7CF"/>
    <circle cx="64" cy="18" r="8" fill="#FFF7CF"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'otter-icecream-pop',
  brand: {
    displayName: '수달아이스팝',
    primaryColor: '#7EDAF5',
    icon: OTTER_ICECREAM_POP_ICON,
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
