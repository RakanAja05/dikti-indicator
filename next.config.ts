import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const sassOptions = {
  includePaths: ["./node_modules"],
  silenceDeprecations: ["legacy-js-api"],
  webpackImporter: false,
};

const nextConfig: NextConfig = {
  output: "standalone",

  outputFileTracingRoot: projectRoot,

  turbopack: {
    root: projectRoot,
  },

  sassOptions: {
    ...sassOptions,
    loadPaths: [join(projectRoot, "node_modules")],
  },

  experimental: {
    turbopackUseBuiltinSass: false,
  },
};

export default nextConfig;