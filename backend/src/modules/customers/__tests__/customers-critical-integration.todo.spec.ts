/**
 * Critical integration scenarios for Customers module.
 *
 * NOTE:
 * These tests require a real integration environment (DB + auth scope).
 */

describe('Customers critical integration scenarios', () => {
  test.todo(
    'Soft delete visibility matrix: deleted customer is excluded from GET /customers and /customers/search, and returns 404 for GET /customers/:id, PATCH /customers/:id, GET /customers/:id/orders',
  );

  test.todo(
    'Reservation dependency: creating/updating reservation with soft-deleted customer fails with scope-safe not found/validation error',
  );

  test.todo(
    'Audit fail-open: create/update/delete customer should still succeed when audit transport fails',
  );
});

