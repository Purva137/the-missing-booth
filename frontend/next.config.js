/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig