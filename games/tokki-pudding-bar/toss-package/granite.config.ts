import { defineConfig } from '@apps-in-toss/web-framework/config';

const TOKKI_PUDDING_BAR_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#F9D5B8"/>
    <rect x="21" y="66" width="86" height="39" rx="16" fill="#FFF8F1"/>
    <ellipse cx="64" cy="60" rx="30" ry="22" fill="#FFFFFF"/>
    <ellipse cx="54" cy="39" rx="8" ry="17" fill="#FFFFFF" transform="rotate(-14 54 39)"/>
    <ellipse cx="74" cy="39" rx="8" ry="17" fill="#FFFFFF" transform="rotate(14 74 39)"/>
    <circle cx="54" cy="60" r="3" fill="#4B2B1D"/>
    <circle cx="74" cy="60" r="3" fill="#4B2B1D"/>
    <path d="M57 69Q64 75 71 69" fill="none" stroke="#4B2B1D" stroke-width="3" stroke-linecap="round"/>
    <circle cx="33" cy="84" r="7" fill="#FF8FB3"/>
    <circle cx="50" cy="84" r="7" fill="#92E8CF"/>
    <circle cx="67" cy="84" r="7" fill="#FFE093"/>
    <circle cx="84" cy="84" r="7" fill="#FFB881"/>
    <circle cx="99" cy="84" r="7" fill="#D49DF5"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'tokki-pudding-bar',
  brand: {
    displayName: '토끼푸딩 바',
    primaryColor: '#FF8FB3',
    icon: TOKKI_PUDDING_BAR_ICON,
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
