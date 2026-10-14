import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @param {string} phase @returns {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    devIndicators: false,
    ...(phase === PHASE_DEVELOPMENT_SERVER ? {
      async rewrites() {
        return [
          { source: "/api/predict", destination: "http://127.0.0.1:8000/api/predict" },
          { source: "/api/metadata", destination: "http://127.0.0.1:8000/api/metadata" },
        ];
      },
    } : {}),
  };
}
