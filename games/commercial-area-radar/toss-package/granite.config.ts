import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON =
  'https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/commercial-area-radar/appintos-logo-600.png';

const appName = process.env.TOSS_APP_NAME ?? 'commercial-area-radar';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '동네 상권 레이더';
const envIcon = process.env.TOSS_BRAND_ICON_URL?.trim();
const icon = envIcon || DEFAULT_ICON;

if (!icon.startsWith('https://')) {
  throw new Error('TOSS_BRAND_ICON_URL must start with https://');
}

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#0E7B7D',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4177,
    commands: {
      dev: 'node scripts/dev-server.mjs',
      build: 'node scripts/build-web.mjs',
    },
  },
  webViewProps: {
    type: 'partner',
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  permissions: [],
  outdir: 'dist',
});
