import { FeatureShellState } from '@/modules/core/components/FeatureShellState';

export default function SubscriptionsPage() {
  return (
    <FeatureShellState
      title="Subscriptions"
      summary="Subscription packages and tenant assignment land in Phase 2."
      status="coming_soon"
      etaLabel="Phase 2"
      dependencies={['subscriptions module']}
    />
  );
}
