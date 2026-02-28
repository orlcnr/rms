import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost',
  },
};

const SentryWebpackPluginOptions = {
  silent: process.env.NODE_ENV !== 'production',
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
  org: 'posmenum',
  project: 'javascript-nextjs',
};

export default withSentryConfig(nextConfig, SentryWebpackPluginOptions);
