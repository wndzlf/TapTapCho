import { defineConfig } from '@apps-in-toss/web-framework/config';

const WINTER_SKI_RUSH_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d4e8fb"/>
        <stop offset="100%" stop-color="#c5dcf4"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <path d="M18 0C15 24 16 38 21 54C26 71 27 90 35 128H113C110 104 105 83 100 65C95 47 95 28 100 0H18Z" fill="#edf6ff"/>
    <g fill="#a8c9ef">
      <circle cx="64" cy="14" r="3"/>
      <circle cx="64" cy="37" r="3.5"/>
      <circle cx="74" cy="59" r="4"/>
      <circle cx="74" cy="88" r="4"/>
      <circle cx="83" cy="113" r="4"/>
    </g>
    <g transform="translate(64 46)">
      <circle cx="0" cy="-4" r="5" fill="#eef7ff"/>
      <circle cx="0" cy="8" r="11" fill="#9ca6b6"/>
      <path d="M0 -14L11 19H-11Z" fill="#f7bb58"/>
      <rect x="-17" y="19" width="34" height="4" rx="2" fill="#bfe0ff" transform="rotate(10)"/>
      <rect x="-16" y="26" width="34" height="4" rx="2" fill="#a8d2ff" transform="rotate(10)"/>
    </g>
    <g transform="translate(93 101)">
      <rect x="-2.5" y="10" width="5" height="12" fill="#8a5a37"/>
      <path d="M0 -10L-12 10H12Z" fill="#43a55d"/>
      <path d="M0 -2L-10 13H10Z" fill="#368f50"/>
    </g>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'winter-ski-rush',
  brand: {
    displayName: 'Winter Ski Rush',
    primaryColor: '#87D3FF',
    icon: WINTER_SKI_RUSH_ICON,
  },
  web: {
    host: 'localhost',
    port: 4175,
    commands: {
      dev: 'node scripts/dev-server.mjs',
      build: 'node scripts/build-web.mjs',
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
