import type { NextConfig } from "next";

// Vi hämtar denna från env så det blir rätt.
const r2Host = process.env.S3_PUBLIC_URL
  ? new URL(process.env.S3_PUBLIC_URL).hostname
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
      ...(r2Host
        ? [
            {
              protocol: "https" as const,
              hostname: r2Host,
              port: "",
              pathname: "/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: legacyR2Host,
        port: "",
        pathname: "/**",
      },
    ],
  },

  // <-- From MDXEditor docs:
  turbopack: {}, // Needed to add this too.'
  transpilePackages: ["@mdxeditor/editor"],
  reactStrictMode: true,
  webpack: (config) => {
    // this will override the experiments
    config.experiments = { ...config.experiments, topLevelAwait: true };
    // this will just update topLevelAwait property of config.experiments
    // config.experiments.topLevelAwait = true
    return config;
  },
  // -->
};

export default nextConfig;
