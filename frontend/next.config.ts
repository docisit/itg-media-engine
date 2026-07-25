import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Enable standalone output for Docker (copies only necessary files)
  output: 'standalone',
  
  // Note: outputFileTracingRoot is intentionally omitted for Docker builds
  // (the WORKDIR in the container IS the project root)
  // reactCompiler requires babel-plugin-react-compiler which isn't in Docker prod deps
  
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "https",
        hostname: "yourdomain.com",
      },
      {
        protocol: "https",
        hostname: "api.yourdomain.com",
      },
      {
        protocol: "https",
        hostname: "vdo.yourdomain.com",
      },
      {
        protocol: "https",
        hostname: "live.yourdomain.com",
      },
    ],
  },
  
  // Enable experimental features for better performance
  // Note: turbo is not a valid experimental key in NextConfig type
  // experimental: {},
  
  // Add headers for security and CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          // CORS headers for API calls
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://yourdomain.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
