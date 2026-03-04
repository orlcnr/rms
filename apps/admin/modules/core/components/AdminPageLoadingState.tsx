export function AdminPageLoadingState() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          width: 220,
          height: 18,
          borderRadius: 999,
          background: 'var(--panel-muted)',
        }}
      />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            style={{
              height: 120,
              borderRadius: 20,
              background: 'var(--panel)',
              border: '1px solid var(--line)',
            }}
          />
        ))}
      </div>
      <div
        style={{
          minHeight: 320,
          borderRadius: 20,
          background: 'var(--panel)',
          border: '1px solid var(--line)',
        }}
      />
    </div>
  );
}
