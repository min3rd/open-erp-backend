import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { UserContext } from './permissions.guard';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'test-user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        roles: ['USER'],
      } as UserContext,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  it('should extract user from request', () => {
    const decorator = CurrentUser();
    const result = decorator(null, mockExecutionContext);

    expect(result).toEqual(mockRequest.user);
    expect(result.userId).toBe('test-user-123');
    expect(result.email).toBe('test@example.com');
  });

  it('should return undefined if user is not set', () => {
    mockRequest.user = undefined;

    const decorator = CurrentUser();
    const result = decorator(null, mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should handle user with minimal properties', () => {
    mockRequest.user = {
      userId: 'minimal-user',
      email: 'minimal@example.com',
    };

    const decorator = CurrentUser();
    const result = decorator(null, mockExecutionContext);

    expect(result.userId).toBe('minimal-user');
    expect(result.organizationId).toBeUndefined();
    expect(result.roles).toBeUndefined();
  });

  it('should extract user context with all optional fields', () => {
    mockRequest.user = {
      userId: 'full-user',
      email: 'full@example.com',
      organizationId: 'org-789',
      roles: ['ADMIN', 'MANAGER'],
      customField: 'custom-value',
    };

    const decorator = CurrentUser();
    const result = decorator(null, mockExecutionContext);

    expect(result.userId).toBe('full-user');
    expect(result.organizationId).toBe('org-789');
    expect(result.roles).toEqual(['ADMIN', 'MANAGER']);
    expect((result as any).customField).toBe('custom-value');
  });
});
