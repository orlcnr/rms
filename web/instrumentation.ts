import './sentry.client.config';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config').then((module) => module.default?.());
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config').then((module) => module.default?.());
  }
}
