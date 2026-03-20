import { defineConfig } from '@apps-in-toss/web-framework/config';

const ORBIT_SURVIVOR_ICON =
  'https://static.toss.im/appsintoss/29647/dc773a75-a4f4-41cb-8c07-c24a16073a15.png';

export default defineConfig({
  appName: 'orbitsuvivor',
  brand: {
    displayName: 'Orbit Survivor',
    primaryColor: '#3182F6',
    icon: ORBIT_SURVIVOR_ICON,
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
