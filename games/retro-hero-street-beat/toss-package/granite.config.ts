import { defineConfig } from '@apps-in-toss/web-framework/config';

const RETRO_HERO_STREET_BEAT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#101A3A"/>
    <circle cx="64" cy="38" r="22" fill="#FF4EA7" opacity="0.9"/>
    <path d="M0 78H128V128H0z" fill="#091022"/>
    <g stroke="#2CD6FF" stroke-width="2" opacity="0.44">
      <path d="M0 84H128"/>
      <path d="M0 94H128"/>
      <path d="M0 104H128"/>
      <path d="M0 114H128"/>
      <path d="M24 78V128"/>
      <path d="M44 78V128"/>
      <path d="M64 78V128"/>
      <path d="M84 78V128"/>
      <path d="M104 78V128"/>
    </g>
    <path d="M64 46L81 70L75 102H53L47 70Z" fill="#6AE6FF"/>
    <rect x="56" y="68" width="16" height="8" rx="3" fill="#132A4D"/>
  </svg>`,
)}`;

export default defineConfig({
  appName: 'retro-hero-street-beat',
  brand: {
    displayName: 'Retro Hero: Street Beat',
    primaryColor: '#FF2E97',
    icon: RETRO_HERO_STREET_BEAT_ICON,
  },
  web: {
    host: 'localhost',
    port: 4186,
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
