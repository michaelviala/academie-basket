import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/entrainements", destination: "/seances", permanent: true },
      {
        source: "/entrainements/:path*",
        destination: "/seances/:path*",
        permanent: true,
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
