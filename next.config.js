

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [ {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
      },],
  },
  // Keep this out of the server bundle so its bundled ffmpeg binary
  // resolves correctly at runtime.
  serverExternalPackages: ['ffmpeg-static'],
};

module.exports = nextConfig;
