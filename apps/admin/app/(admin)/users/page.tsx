import { UsersTable } from '@/modules/users/components/UsersTable';
import { getUsers } from '@/modules/users/service';
import { getRestaurants } from '@/modules/restaurants/service';
import { userSearchSchema } from '@/modules/users/schemas';

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { search?: string };
}) {
  const filters = userSearchSchema.parse({
    search: searchParams?.search,
  });
  const [data, restaurants] = await Promise.all([
    getUsers(filters.search),
    getRestaurants(),
  ]);

  return (
    <UsersTable
      data={data}
      search={filters.search}
      restaurantOptions={restaurants.data.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
      }))}
    />
  );
}
