import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON =
  'https://raw.githubusercontent.com/wndzlf/TapTapCho/main/games/retro-hero-street-beat/appintos-logo-600.png';

const appName = process.env.TOSS_APP_NAME ?? 'retro-hero-beat';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? 'Retro Hero: Street Beat';
const envIcon = process.env.TOSS_BRAND_ICON_URL?.trim();
const icon = envIcon || DEFAULT_ICON;

if (!icon.startsWith('https://')) {
  throw new Error('TOSS_BRAND_ICON_URL must start with https://');
}

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#FF2E97',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4186,
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
