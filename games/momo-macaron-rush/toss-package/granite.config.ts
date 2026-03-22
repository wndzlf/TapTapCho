import { defineConfig } from '@apps-in-toss/web-framework/config';

const MOMO_MACARON_RUSH_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#FFB28E"/>
    <circle cx="46" cy="48" r="20" fill="#FFF5EE"/>
    <circle cx="82" cy="48" r="20" fill="#FFF5EE"/>
    <circle cx="64" cy="34" r="30" fill="#FFD6BF"/>
    <circle cx="52" cy="42" r="4" fill="#4A2A1E"/>
    <circle cx="76" cy="42" r="4" fill="#4A2A1E"/>
    <path d="M54 54Q64 63 74 54" stroke="#4A2A1E" stroke-width="4" stroke-linecap="round" fill="none"/>
    <rect x="24" y="82" width="80" height="20" rx="10" fill="#FFF5EE"/>
    <circle cx="38" cy="92" r="5" fill="#8FE0C7"/>
    <circle cx="50" cy="92" r="5" fill="#FFD77F"/>
    <circle cx="62" cy="92" r="5" fill="#FF88B4"/>
    <circle cx="74" cy="92" r="5" fill="#8FE0C7"/>
    <circle cx="86" cy="92" r="5" fill="#FFD77F"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'momo-macaron-rush',
  brand: {
    displayName: '모모마카롱 러시',
    primaryColor: '#FFB28E',
    icon: MOMO_MACARON_RUSH_ICON,
  },
  web: {
    host: 'localhost',
    port: 4175,
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
