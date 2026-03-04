import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["deck.gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/react"],
};

export default nextConfig;
