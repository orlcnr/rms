/**
 * Critical integration scenarios for Reservations module.
 *
 * NOTE:
 * These tests require real integration environment (DB + timezone-aware queries).
 */

describe('Reservations critical integration scenarios', () => {
  test.todo(
    'Istanbul midnight boundary: at 23:30 Europe/Istanbul, GET /reservations?date=today returns only same local-day reservations',
  );

  test.todo(
    'Update conflict with excludeId: PATCH /reservations/:id does not self-conflict when table/time unchanged',
  );

  test.todo(
    'Delete flow: DELETE /reservations/:id sets status=CANCELLED and soft-deletes in single transaction',
  );
});
