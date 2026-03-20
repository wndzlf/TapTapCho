import { defineConfig } from '@apps-in-toss/web-framework/config';

const ORBIT_SURVIVOR_ICON =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20128%20128%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23071220%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231f2d5a%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22128%22%20height%3D%22128%22%20rx%3D%2228%22%20fill%3D%22url(%23bg)%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2264%22%20r%3D%2234%22%20fill%3D%22none%22%20stroke%3D%22%236dd3ff%22%20stroke-width%3D%225%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2264%22%20r%3D%228%22%20fill%3D%22%23162744%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2234%22%20r%3D%226%22%20fill%3D%22%23ff7b72%22%2F%3E%3Ccircle%20cx%3D%2296%22%20cy%3D%2288%22%20r%3D%225%22%20fill%3D%22%23ffd166%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2230%22%20r%3D%227%22%20fill%3D%22%237de3ff%22%2F%3E%3Cpath%20d%3D%22M70%2030%20L84%2034%20L70%2038%20Z%22%20fill%3D%22%237de3ff%22%20fill-opacity%3D%220.7%22%2F%3E%3C%2Fsvg%3E';

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
