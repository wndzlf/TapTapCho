import { defineConfig } from '@apps-in-toss/web-framework/config';

const CRIMSON_HUNTER_ICON =
  'https://static.toss.im/appsintoss/29647/dc773a75-a4f4-41cb-8c07-c24a16073a15.png';

export default defineConfig({
  appName: 'crimsonhuntertrials',
  brand: {
    displayName: 'Crimson Hunter Trials',
    primaryColor: '#E15274',
    icon: CRIMSON_HUNTER_ICON,
  },
  web: {
    host: 'localhost',
    port: 4173,
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
