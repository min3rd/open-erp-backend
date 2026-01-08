import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { ClientProxy } from '@nestjs/microservices';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { RPC_METHODS } from '@shared/constants/message.constants';
import { of } from 'rxjs';

describe('AuthService - First User SYSTEM_ADMIN Assignment', () => {
  let service: AuthService;
  let mockUserClient: jest.Mocked<ClientProxy>;
  let mockNotificationClient: jest.Mocked<ClientProxy>;
  let mockVerificationTokenRepo: jest.Mocked<VerificationTokenRepository>;

  beforeEach(async () => {
    mockUserClient = {
      send: jest.fn(),
      emit: jest.fn(),
    } as any;

    mockNotificationClient = {
      send: jest.fn(),
      emit: jest.fn(),
    } as any;

    mockVerificationTokenRepo = {
      create: jest.fn(),
      countRecentTokens: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'RABBITMQ_USER_CLIENT',
          useValue: mockUserClient,
        },
        {
          provide: 'RABBITMQ_NOTIFICATION_CLIENT',
          useValue: mockNotificationClient,
        },
        {
          provide: VerificationTokenRepository,
          useValue: mockVerificationTokenRepo,
        },
        {
          provide: RefreshTokenRepository,
          useValue: { create: jest.fn() },
        },
        {
          provide: PasswordResetTokenRepository,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should assign SYSTEM_ADMIN role to first user during registration', async () => {
    const registerDto = {
      email: 'admin@example.com',
      fullName: 'First Admin',
      password: 'password123',
    };

    const newUser = {
      id: 'user-id-1',
      email: registerDto.email,
      fullName: registerDto.fullName,
      status: 'pending',
    };

    const systemAdminRole = {
      _id: 'role-id-1',
      code: 'SYSTEM_ADMIN',
      name: 'System Administrator',
    };

    // Mock: No existing user
    mockUserClient.send.mockImplementation((pattern, data) => {
      if (pattern === RPC_METHODS.USER.FIND_USER_BY_EMAIL) {
        return of(null);
      }
      if (pattern === RPC_METHODS.USER.COUNT_USERS) {
        return of(0); // First user
      }
      if (pattern === RPC_METHODS.USER.CREATE_USER) {
        return of(newUser);
      }
      if (pattern === RPC_METHODS.USER.ENSURE_SYSTEM_ROLE_EXISTS) {
        return of(systemAdminRole);
      }
      if (pattern === RPC_METHODS.USER.ADD_ROLE_TO_USER) {
        return of({ ...newUser, roleAssignments: [{ roleId: systemAdminRole._id }] });
      }
      return of(null);
    });

    mockNotificationClient.send.mockReturnValue(of({ success: true }));
    mockVerificationTokenRepo.create.mockResolvedValue({} as any);

    const result = await service.register(registerDto);

    // Verify user count was checked
    expect(mockUserClient.send).toHaveBeenCalledWith(RPC_METHODS.USER.COUNT_USERS, {});

    // Verify SYSTEM_ADMIN role was ensured to exist
    expect(mockUserClient.send).toHaveBeenCalledWith(
      RPC_METHODS.USER.ENSURE_SYSTEM_ROLE_EXISTS,
      expect.objectContaining({
        code: 'SYSTEM_ADMIN',
      }),
    );

    // Verify role was added to user
    expect(mockUserClient.send).toHaveBeenCalledWith(
      RPC_METHODS.USER.ADD_ROLE_TO_USER,
      expect.objectContaining({
        userId: newUser.id,
        roleId: systemAdminRole._id,
      }),
    );

    expect(result.success).toBe(true);
  });

  it('should NOT assign SYSTEM_ADMIN role to second user', async () => {
    const registerDto = {
      email: 'user@example.com',
      fullName: 'Second User',
      password: 'password123',
    };

    const newUser = {
      id: 'user-id-2',
      email: registerDto.email,
      fullName: registerDto.fullName,
      status: 'pending',
    };

    // Mock: No existing user with this email, but user count > 0
    mockUserClient.send.mockImplementation((pattern, data) => {
      if (pattern === RPC_METHODS.USER.FIND_USER_BY_EMAIL) {
        return of(null);
      }
      if (pattern === RPC_METHODS.USER.COUNT_USERS) {
        return of(1); // NOT first user
      }
      if (pattern === RPC_METHODS.USER.CREATE_USER) {
        return of(newUser);
      }
      return of(null);
    });

    mockNotificationClient.send.mockReturnValue(of({ success: true }));
    mockVerificationTokenRepo.create.mockResolvedValue({} as any);

    const result = await service.register(registerDto);

    // Verify user count was checked
    expect(mockUserClient.send).toHaveBeenCalledWith(RPC_METHODS.USER.COUNT_USERS, {});

    // Verify SYSTEM_ADMIN role was NOT ensured/added
    expect(mockUserClient.send).not.toHaveBeenCalledWith(
      RPC_METHODS.USER.ENSURE_SYSTEM_ROLE_EXISTS,
      expect.anything(),
    );
    expect(mockUserClient.send).not.toHaveBeenCalledWith(
      RPC_METHODS.USER.ADD_ROLE_TO_USER,
      expect.anything(),
    );

    expect(result.success).toBe(true);
  });
});
