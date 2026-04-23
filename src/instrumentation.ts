import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    // D-12 bootstrap admin on Node cold start
    const { bootstrapAdmin } = await import('./lib/bootstrap');
    try {
      await bootstrapAdmin();
    } catch (err) {
      Sentry.captureException(err, { tags: { phase: 'bootstrap-admin' } });
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
