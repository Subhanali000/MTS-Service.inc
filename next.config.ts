// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "res.cloudinary.com",
//       },
//       {
//         protocol: "https",
//         hostname: "lh3.googleusercontent.com",
//       },
//       {
//         protocol: "https",
//         hostname: "images.unsplash.com",
//       },
//       {
//         protocol: "https",
//         hostname: "via.placeholder.com",
//       },
//       {
//         protocol: "https",
//         hostname: "newjaisa.com",
//       },
//       {
//         protocol: "https",
//         hostname: "cdn.shopify.com",
//       },
//       { protocol: "https", hostname: "upload.wikimedia.org" },
//     ],
//   },
// };

// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // This double asterisk allows ALL hostnames
      },
    ],
  },
};

export default nextConfig;