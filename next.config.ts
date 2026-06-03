import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
