declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface RuntimeCaching {
    urlPattern: string | RegExp;
    handler: string;
    options?: Record<string, unknown>;
  }
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCaching[];
    [key: string]: unknown;
  }
  
  function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export = withPWA;
}
