import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Must stay >= maxAttachmentSizeBytes in
      // src/lib/storage/attachment-storage.ts (50 MB) plus multipart
      // framing overhead.
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
