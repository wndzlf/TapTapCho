import { defineConfig } from '@apps-in-toss/web-framework/config';

const NYANG_JELLY_CAFE_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#3B1C61"/>
    <g opacity="0.2" fill="#FFFFFF">
      <circle cx="28" cy="28" r="5"/>
      <circle cx="44" cy="20" r="3"/>
      <circle cx="58" cy="34" r="4"/>
      <circle cx="90" cy="26" r="5"/>
    </g>
    <rect x="20" y="66" width="88" height="42" rx="14" fill="#FFE8F5"/>
    <circle cx="64" cy="54" r="24" fill="#FFFDFD"/>
    <path d="M48 44L55 29L62 43" fill="#FFFDFD"/>
    <path d="M80 44L73 29L66 43" fill="#FFFDFD"/>
    <circle cx="56" cy="54" r="3" fill="#4B365F"/>
    <circle cx="72" cy="54" r="3" fill="#4B365F"/>
    <path d="M58 63Q64 68 70 63" stroke="#4B365F" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="84" r="7" fill="#FF92C0"/>
    <circle cx="52" cy="84" r="7" fill="#9BF5DA"/>
    <circle cx="70" cy="84" r="7" fill="#FFE28F"/>
    <circle cx="88" cy="84" r="7" fill="#FF92C0" opacity="0.75"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'nyang-jelly-cafe',
  brand: {
    displayName: '냥젤리 카페',
    primaryColor: '#FF92C0',
    icon: NYANG_JELLY_CAFE_ICON,
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
