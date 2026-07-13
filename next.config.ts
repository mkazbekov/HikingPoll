import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a wasm/native-ish module; keep it external to the server bundle
  // so it is required at runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
