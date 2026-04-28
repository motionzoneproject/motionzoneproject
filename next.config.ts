import type { NextConfig } from "next";

// Vi hämtar denna från env så det blir rätt.
const r2Host = process.env.S3_PUBLIC_URL
  ? new URL(process.env.S3_PUBLIC_URL).hostname
  : "";
const legacyR2Host = "r2.motionzoneworld.com";

const securityHeaders = [
  // HSTS — force HTTPS for two years incl. subdomains. Only meaningful
  // on the production deployment (the browser ignores it on http://).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block the site from being framed (clickjacking). frame-ancestors
  // would be the modern CSP-based equivalent; keeping the legacy
  // header for browser coverage.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to third parties on cross-origin navigations.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Deny powerful APIs we don't use. Add entries here if a feature
  // ever needs camera/mic/geolocation.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
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

  reactStrictMode: true,
};

export default nextConfig;
