import { GuestSessionsController } from '../../controllers/guest-sessions.controller';
import { GuestPublicController } from '../../controllers/guest-public.controller';

describe('Guest Session Flow (controller integration)', () => {
  it('createSession delegates dto and returns created session payload', async () => {
    const mockService = {
      createSession: jest.fn().mockResolvedValue({
        guestAccessToken: 'guest-token',
        session: { id: 'session-1' },
      }),
    } as any;

    const controller = new GuestSessionsController(mockService);
    const dto = { qrToken: 'qr-token' } as any;

    const result = await controller.createSession(dto);

    expect(mockService.createSession).toHaveBeenCalledTimes(1);
    expect(mockService.createSession).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      guestAccessToken: 'guest-token',
      session: { id: 'session-1' },
    });
  });

  it('getBootstrap composes payload from dependent guest services', async () => {
    const session = {
      id: 'session-1',
      restaurantId: 'r-1',
      restaurantName: 'Test R',
      tableId: 't-1',
      tableName: 'Masa 1',
      googleCommentUrl: null,
    } as any;

    const guestOrdersService = {
      getCatalog: jest.fn().mockResolvedValue([{ id: 'cat-1', items: [] }]),
      getActiveDraftOrder: jest.fn().mockResolvedValue(null),
      getVisibleOrdersForGuest: jest.fn().mockResolvedValue([]),
      getTableOrderedMenuItemIds: jest.fn().mockResolvedValue([]),
      getTableGuestOrderSummary: jest.fn().mockResolvedValue({
        otherSessionsTotalAmount: 0,
        otherSessionsItemCount: 0,
        otherSessionsOrdersCount: 0,
        previewItems: [],
      }),
      getTableBill: jest.fn().mockResolvedValue({ items: [], totalAmount: 0 }),
    } as any;

    const guestRequestsService = {
      getRequestState: jest.fn().mockResolvedValue({
        waiterNextAllowedAt: null,
        billNextAllowedAt: null,
        serverTime: new Date().toISOString(),
      }),
    } as any;

    const guestSessionsService = {} as any;

    const controller = new GuestPublicController(
      guestOrdersService,
      guestRequestsService,
      guestSessionsService,
    );

    const req = { guestSession: session } as any;
    const result = await controller.getBootstrap(req);

    expect(result.session).toBe(session);
    expect(result.restaurant.id).toBe('r-1');
    expect(result.table.id).toBe('t-1');
    expect(result.catalog).toEqual([{ id: 'cat-1', items: [] }]);
    expect(guestOrdersService.getCatalog).toHaveBeenCalledWith(session);
    expect(guestRequestsService.getRequestState).toHaveBeenCalledWith(
      'session-1',
    );
  });
});
