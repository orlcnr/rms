import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],

    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        const sensitiveFields = [
          'password',
          'card_number',
          'cvv',
          'tip_amount',
          'token',
          'secret',
        ];
        sensitiveFields.forEach((field) => {
          if (event.request?.data?.[field]) {
            event.request.data[field] = '[FILTERED]';
          }
        });
      }
      return event;
    },
  });
  console.log('[Sentry] Initialized with DSN:', sentryDsn);
}
