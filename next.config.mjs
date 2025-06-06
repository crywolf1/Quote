/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          ],
        },
      ];
    },
  };
  
  // Use ES module export syntax instead of CommonJS
  export default nextConfig;