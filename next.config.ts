import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["symbol-sdk", "symbol-crypto-wasm-node"],
};

export default nextConfig;
