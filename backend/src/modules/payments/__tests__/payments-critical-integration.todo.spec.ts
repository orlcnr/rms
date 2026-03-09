/**
 * Critical integration scenarios for Payments module.
 */

describe('Payments critical integration scenarios', () => {
  test.todo(
    'GET /payments and GET /payments/orders/:orderId deny cross-tenant access with 403',
  );

  test.todo(
    'Split payment is all-or-nothing: one invalid line rolls back all created payment rows',
  );

  test.todo(
    'Revert ordering: REFUNDED status update happens before aggregate query and order status resolve',
  );

  test.todo(
    'Open account payment revert always decrements customer debt',
  );

  test.todo(
    'Revert requires active cash session: returns CASH_NO_ACTIVE_SESSION and payment status stays unchanged',
  );

  test.todo(
    'Revert writes negative cash movement with subtype REFUND and reference_payment_id',
  );

  test.todo(
    'Stock deduction event fail-open does not rollback committed payment transaction',
  );
});
