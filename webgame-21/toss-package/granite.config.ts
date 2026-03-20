import { defineConfig } from '@apps-in-toss/web-framework/config';

const ZIGZAG_MEMORY_RUN_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#11243a"/>
    <g opacity="0.22" stroke="#2b4964" stroke-width="2">
      <path d="M32 0V128"/>
      <path d="M64 0V128"/>
      <path d="M96 0V128"/>
      <path d="M0 32H128"/>
      <path d="M0 64H128"/>
      <path d="M0 96H128"/>
    </g>
    <path d="M30 70L64 98L94 42" fill="none" stroke="#74F7D4" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="70" r="8" fill="#FFD479"/>
    <circle cx="64" cy="98" r="8" fill="#FFD479"/>
    <circle cx="94" cy="42" r="11" fill="none" stroke="#58D7C4" stroke-width="7"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'zigzag-memory-run',
  brand: {
    displayName: 'Zigzag Memory Run',
    primaryColor: '#74F7D4',
    icon: ZIGZAG_MEMORY_RUN_ICON,
  },
  web: {
    host: 'localhost',
    port: 4174,
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
