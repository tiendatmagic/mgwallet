import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Allow custom webpack config
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
