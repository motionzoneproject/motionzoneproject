import type { NextConfig } from "next";

// Vi hämtar denna från env så det blir rätt.
const r2Host = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : "";
const legacyR2Host = "r2.motionzoneworld.com";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2Host,
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: legacyR2Host,
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
