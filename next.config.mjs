/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingIncludes: {
    '/*': ['./pages-original/**/*'],
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/404', destination: '/__site-not-found' }] };
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }];
  },
};

export default nextConfig;
