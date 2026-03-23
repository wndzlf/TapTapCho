import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON =
  'https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/tokki-pudding-bar/appintos-logo-600.png';

const appName = process.env.TOSS_APP_NAME ?? 'tokki-pudding-bar';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '토끼푸딩 바';
const envIcon = process.env.TOSS_BRAND_ICON_URL?.trim();
const icon = envIcon || DEFAULT_ICON;

if (!icon.startsWith('https://')) {
  throw new Error('TOSS_BRAND_ICON_URL must start with https://');
}

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#FF8FB3',
    icon,
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
