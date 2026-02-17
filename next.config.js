/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
    instrumentationHook: true,
  },
}

export default nextConfig
