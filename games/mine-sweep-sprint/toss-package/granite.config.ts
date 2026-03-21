import { defineConfig } from '@apps-in-toss/web-framework/config';

const MINE_SWEEP_SPRINT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#10253F"/>
    <g opacity="0.22" stroke="#2E5375" stroke-width="2">
      <path d="M32 0V128"/>
      <path d="M64 0V128"/>
      <path d="M96 0V128"/>
      <path d="M0 32H128"/>
      <path d="M0 64H128"/>
      <path d="M0 96H128"/>
    </g>
    <rect x="22" y="22" width="84" height="84" rx="14" fill="#1B385D"/>
    <circle cx="64" cy="64" r="18" fill="#FF8A7B"/>
    <path d="M64 44V84M44 64H84M49 49L79 79M79 49L49 79" stroke="#FFF3EE" stroke-width="5" stroke-linecap="round"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'mine-sweep-sprint',
  brand: {
    displayName: '지뢰찾기 스프린트',
    primaryColor: '#76F5D2',
    icon: MINE_SWEEP_SPRINT_ICON,
  },
  web: {
    host: 'localhost',
    port: 4176,
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
