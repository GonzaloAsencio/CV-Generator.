import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI runs tsc separately — skip redundant type check during build
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
