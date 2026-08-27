import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/generate/hwp": [
      "./vendor/claw-hwp/**/*",
      "./src/assets/templates/**/*",
    ],
    "/api/generate/pdf": [
      "./src/assets/templates/**/*",
      "./src/assets/fonts/NanumMyeongjo-Regular.ttf",
    ],
  },
};

export default nextConfig;
