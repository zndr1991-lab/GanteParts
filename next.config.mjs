/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  i18n: {
    locales: ["es-MX"],
    defaultLocale: "es-MX"
  }
};

export default nextConfig;
