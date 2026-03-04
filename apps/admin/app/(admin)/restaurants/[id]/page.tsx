import { RestaurantDetail } from '@/modules/restaurants/components/RestaurantDetail';
import { getRestaurantById } from '@/modules/restaurants/service';

export default async function RestaurantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getRestaurantById(params.id);

  return <RestaurantDetail data={data} />;
}
