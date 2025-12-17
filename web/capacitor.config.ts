import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coexist.app',
  appName: 'Coexist',
  webDir: 'build',
  server: {
    // Uncomment for development - allows live reload from web server
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
