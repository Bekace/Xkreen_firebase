/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.vercel-insights.com https://vitals.vercel-insights.com https://*.supabase.co wss://*.supabase.co https://api.v0.app https://tfhub.dev https://storage.googleapis.com https://www.kaggle.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://docs.google.com https://drive.google.com",
              "media-src 'self' blob: https:",
              "worker-src 'self' blob:",
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig
