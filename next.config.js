

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [ {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
      },],
  },
  // Keep these out of the server bundle: ffmpeg-static's binary and
  // transformers' native onnxruntime must resolve from node_modules.
  serverExternalPackages: ['ffmpeg-static', '@huggingface/transformers'],
};

module.exports = nextConfig;
