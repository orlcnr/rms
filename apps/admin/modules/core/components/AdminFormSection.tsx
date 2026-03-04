'use client';

import type { CSSProperties, ReactNode } from 'react';

interface AdminFormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}

export function AdminFormSection({
  title,
  description,
  children,
  columns = 2,
}: AdminFormSectionProps) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      {title || description ? (
        <div style={{ display: 'grid', gap: 4 }}>
          {title ? <h3 style={titleStyle}>{title}</h3> : null}
          {description ? <p style={descriptionStyle}>{description}</p> : null}
        </div>
      ) : null}
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns:
            columns === 1 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
        }}
      >
        {children}
      </div>
    </section>
  );
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-muted)',
  fontSize: 13,
};
