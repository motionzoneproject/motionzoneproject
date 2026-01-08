import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb", // Sätt till t.ex. 4mb eller 10mb beroende på behov
    },
  },
};

export default nextConfig;
