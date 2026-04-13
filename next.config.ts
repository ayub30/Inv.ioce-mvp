import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/llm/:path*',
        destination: 'http://18.130.144.4:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
