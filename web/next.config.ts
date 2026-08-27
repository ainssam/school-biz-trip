import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/generate/hwp": [
      "./vendor/claw-hwp/**/*",
      "./src/assets/templates/travel-expense-template.hwp",
    ],
    "/api/generate/pdf": [
      "./src/assets/templates/travel-expense-template.pdf",
      "./src/assets/fonts/NanumMyeongjo-Regular.ttf",
    ],
  },
};

export default nextConfig;
