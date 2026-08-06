import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.openrouter.ai https://*.stripe.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://checkout.stripe.com",
      "img-src 'self' data: blob: https:",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
