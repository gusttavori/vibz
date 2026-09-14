import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', 
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  turbopack: {}, 

  // 👇 NOVA CONFIGURAÇÃO: Proxy Reverso para o Render
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://vibz.onrender.com/api/:path*' 
      }
    ];
  }
};

export default withPWA(nextConfig);