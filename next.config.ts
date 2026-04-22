import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's eingebauter TypeScript-Check wird in einem separaten Worker
  // ausgeführt und ist speicherhungrig — auf dieser Hetzner-VM (3.7 GB) zerrt
  // er den Build in OOM. Wir laufen `npm run typecheck` ohnehin im CI- und
  // Pre-Commit-Pfad, der Build-interne Pass ist redundant.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
