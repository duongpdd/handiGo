import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  poweredByHeader: false,
  devIndicators: false,
};

export default config;
