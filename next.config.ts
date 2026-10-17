import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  sassOptions: {
    includePaths: ["./node_modules"],
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default nextConfig;