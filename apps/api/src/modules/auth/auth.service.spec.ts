import { hash } from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let userModel: { findById: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let configService: { get: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    userModel = {
      findById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn()
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'test-refresh-secret';
        }

        return defaultValue;
      })
    };
    jwtService = {
      signAsync: jest.fn()
    };
    auditService = {
      log: jest.fn()
    };

    service = new AuthService(
      userModel as never,
      jwtService as never,
      configService as never,
      auditService as never
    );
  });

  it('does not expose passwordHash in getUserById', async () => {
    userModel.findById.mockResolvedValue({
      _id: 'user_1',
      fullName: 'Admin',
      email: 'admin@rifaria.local',
      passwordHash: 'secret-hash',
      role: 'owner',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
      updatedAt: new Date('2026-02-20T00:00:00.000Z')
    });

    const result = await service.getUserById('user_1');
    expect(result).toEqual({
      id: 'user_1',
      fullName: 'Admin',
      email: 'admin@rifaria.local',
      role: 'owner',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
      updatedAt: new Date('2026-02-20T00:00:00.000Z')
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('does not expose passwordHash in listUsers', async () => {
    userModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'user_2',
              fullName: 'Support',
              email: 'support@rifaria.local',
              passwordHash: 'hash',
              role: 'support',
              isActive: true,
              lastLoginAt: null,
              createdAt: null,
              updatedAt: null
            }
          ])
        })
      })
    });

    const result = await service.listUsers(10);
    expect(result).toEqual([
      {
        id: 'user_2',
        fullName: 'Support',
        email: 'support@rifaria.local',
        role: 'support',
        isActive: true,
        lastLoginAt: null,
        createdAt: null,
        updatedAt: null
      }
    ]);
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('signs refresh token with JWT_REFRESH_SECRET', async () => {
    const password = 'Password123!';
    const passwordHash = await hash(password, 4);

    const mockUser = {
      _id: 'user_3',
      fullName: 'Owner',
      email: 'owner@rifaria.local',
      passwordHash,
      role: 'owner',
      isActive: true,
      lastLoginAt: null,
      save: jest.fn().mockResolvedValue(undefined)
    };

    userModel.findOne.mockResolvedValue(mockUser);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'owner@rifaria.local',
      password
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tokenType: 'refresh'
      }),
      expect.objectContaining({
        secret: 'test-refresh-secret',
        expiresIn: '7d'
      })
    );
  });
});
