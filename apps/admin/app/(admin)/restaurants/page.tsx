import { RestaurantsTable } from '@/modules/restaurants/components/RestaurantsTable';
import { restaurantSearchSchema } from '@/modules/restaurants/schemas';
import { getRestaurants } from '@/modules/restaurants/service';

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams?: { search?: string };
}) {
  const filters = restaurantSearchSchema.parse({
    search: searchParams?.search,
  });
  const data = await getRestaurants(filters.search);
  return <RestaurantsTable data={data} search={filters.search} />;
}
