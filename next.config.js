/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable WebAssembly support for ZK circuits
  webpack: (config, { isServer }) => {
    // Support for .wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true
    };
    
    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async"
    });
    
    // Handle .zkey files (ZK proving keys)
    config.module.rules.push({
      test: /\.zkey$/,
      type: "asset/resource"
    });
    
    // Fallback for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer"),
        util: require.resolve("util")
      };
    }
    
    return config;
  },
  
  // Configure headers for WASM files
  async headers() {
    return [
      {
        source: '/circuits/:path*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm'
          }
        ]
      }
    ];
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'anonymous-pickup-system'
  }
};

module.exports = nextConfig;