/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/temporadas',
        destination: '/historico/temporadas',
        permanent: true,
      },
      {
        source: '/equipos',
        destination: '/historico/equipos',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
