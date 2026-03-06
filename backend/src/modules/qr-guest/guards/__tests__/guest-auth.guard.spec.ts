import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GuestAuthGuard } from '../guest-auth.guard';

describe('GuestAuthGuard', () => {
  function createContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  it('throws UnauthorizedException when bearer token is missing', async () => {
    const guard = new GuestAuthGuard(
      { verify: jest.fn() } as any,
      { get: jest.fn() } as any,
      { getSession: jest.fn() } as any,
    );

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches guest session and branchId for valid token + active session', async () => {
    const jwtVerify = jest.fn().mockReturnValue({
      sessionId: 'session-1',
      type: 'guest',
    });

    const session = {
      id: 'session-1',
      tableId: 'table-1',
      restaurantId: 'branch-1',
      serviceCycleVersion: '5',
    };

    const guard = new GuestAuthGuard(
      { verify: jwtVerify } as any,
      { get: jest.fn().mockReturnValue('guest-secret') } as any,
      {
        getSession: jest.fn().mockResolvedValue(session),
        getCurrentServiceCycleVersion: jest.fn().mockResolvedValue('5'),
        normalizeServiceCycleVersion: jest
          .fn()
          .mockImplementation((v) => String(v)),
      } as any,
    );

    const request: any = {
      headers: {
        authorization: 'Bearer guest.jwt.token',
      },
    };

    const allowed = await guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(jwtVerify).toHaveBeenCalledTimes(1);
    expect(request.guestSession).toEqual(session);
    expect(request.branchId).toBe('branch-1');
  });
});
