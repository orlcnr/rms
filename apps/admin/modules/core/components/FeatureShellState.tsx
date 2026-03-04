import Link from 'next/link';
import { FeatureShellStateProps } from '../types';

export function FeatureShellState({
  title,
  summary,
  status,
  etaLabel,
  dependencies,
  ctaHref,
  ctaLabel,
}: FeatureShellStateProps) {
  return (
    <section
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '6px 10px',
          borderRadius: 999,
          background: 'var(--primary-soft)',
          color: 'var(--primary)',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {status.replace('_', ' ')}
      </div>
      <h2 style={{ margin: '16px 0 8px' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{summary}</p>
      {etaLabel ? (
        <p style={{ margin: '12px 0 0', fontSize: 14 }}>Target: {etaLabel}</p>
      ) : null}
      <ul style={{ margin: '18px 0 0', paddingLeft: 20, color: 'var(--text-muted)' }}>
        {dependencies.map((dependency) => (
          <li key={dependency}>{dependency}</li>
        ))}
      </ul>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          style={{
            marginTop: 20,
            display: 'inline-flex',
            padding: '10px 14px',
            borderRadius: 12,
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
