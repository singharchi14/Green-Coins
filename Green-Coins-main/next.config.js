module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Serve the 3D scroll landing page (public/landing.html) at "/"
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/landing.html' },
      { source: '/how-it-works', destination: '/how-it-works.html' },
      { source: '/program-rules', destination: '/program-rules.html' },
      { source: '/partner-shops', destination: '/partner-shops.html' },
    ] };
  },
};
