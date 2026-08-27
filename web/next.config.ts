import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/generate/hwp": [
      "./vendor/claw-hwp/**/*",
      "./src/assets/templates/travel-expense-template.hwp",
    ],
  },
};

export default nextConfig;
