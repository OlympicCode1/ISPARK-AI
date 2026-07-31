/** @type {import('next').NextConfig} */
const nextConfig = {
  // MapLibre initializes an imperative map instance; StrictMode's double-invoke
  // in dev would mount/destroy it twice, so we disable it for predictable map init.
  reactStrictMode: false,
};

export default nextConfig;
