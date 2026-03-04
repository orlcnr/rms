import { FeatureShellState } from '@/modules/core/components/FeatureShellState';

export default function SettingsPage() {
  return (
    <FeatureShellState
      title="System Settings"
      summary="Global settings and feature-flag overrides land in Phase 2."
      status="coming_soon"
      etaLabel="Phase 2"
      dependencies={['feature-flags module', 'system-settings module']}
    />
  );
}
