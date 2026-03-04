import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || 'v2.4.0-STABLE',
  },
};

const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const shouldEnableSentryWebpackPlugin =
  process.env.NODE_ENV === 'production' && hasSentryAuthToken;

const SentryWebpackPluginOptions = {
  silent: true,
  telemetry: false,
  disableServerWebpackPlugin: !shouldEnableSentryWebpackPlugin,
  disableClientWebpackPlugin: !shouldEnableSentryWebpackPlugin,
  org: 'posmenum',
  project: 'javascript-nextjs',
};

export default withSentryConfig(nextConfig, SentryWebpackPluginOptions);
