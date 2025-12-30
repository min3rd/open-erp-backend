import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AuthorizationService } from './authorization.service';
import { User, UserSchema, UserDocument } from '../schemas/user.schema';
import { Role, RoleSchema, RoleDocument } from '../schemas/role.schema';
import { Tenant, TenantSchema, TenantDocument } from '../schemas/tenant.schema';
import { Permission } from '../types/permission.enum';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let tenantModel: Model<TenantDocument>;

  let testTenant: TenantDocument;
  let testUser: UserDocument;
  let globalAdminRole: RoleDocument;
  let tenantAdminRole: RoleDocument;
  let managerRole: RoleDocument;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Create testing module
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Role.name, schema: RoleSchema },
          { name: Tenant.name, schema: TenantSchema },
        ]),
      ],
      providers: [AuthorizationService],
    }).compile();

    service = moduleRef.get<AuthorizationService>(AuthorizationService);
    userModel = moduleRef.get('UserModel');
    roleModel = moduleRef.get('RoleModel');
    tenantModel = moduleRef.get('TenantModel');
  }, 60000);

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    // Create test tenant
    testTenant = await tenantModel.create({
      name: 'Test Tenant',
      slug: 'test-tenant',
      status: 'active',
    });

    // Create global admin role
    globalAdminRole = await roleModel.create({
      name: 'Global Admin',
      code: 'SYSTEM_ADMIN',
      scope: 'global',
      permissions: [Permission.SYSTEM_ADMIN, Permission.USER_MANAGE],
      status: 'active',
      isSystem: true,
    });

    // Create tenant admin role
    tenantAdminRole = await roleModel.create({
      name: 'Tenant Admin',
      code: 'TENANT_ADMIN',
      scope: 'tenant',
      tenantId: testTenant._id as any,
      permissions: [
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.ORDER_MANAGE,
      ],
      status: 'active',
      isSystem: false,
    });

    // Create manager role for same tenant
    managerRole = await roleModel.create({
      name: 'Manager',
      code: 'MANAGER',
      scope: 'tenant',
      tenantId: testTenant._id as any,
      permissions: [Permission.ORDER_READ, Permission.ORDER_APPROVE],
      status: 'active',
      isSystem: false,
    });

    // Create test user
    testUser = await userModel.create({
      username: 'testuser',
      email: 'test@example.com',
      tenantId: testTenant._id as any,
      status: 'active',
      roleAssignments: [],
      specialPermissions: [],
    });
  });

  afterEach(async () => {
    // Clean up between tests
    if (userModel) {
      await userModel.deleteMany({});
    }
    if (roleModel) {
      await roleModel.deleteMany({});
    }
    if (tenantModel) {
      await tenantModel.deleteMany({});
    }
  });

  describe('hasPermission with scope', () => {
    it('should check tenant-scoped permission correctly', async () => {
      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_CREATE,
        { scope: 'tenant' },
      );
      expect(result).toBe(true);
    });

    it('should deny global-scoped permission when user only has tenant role', async () => {
      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_CREATE,
        { scope: 'global' },
      );
      expect(result).toBe(false);
    });

    it('should grant global-scoped permission when user has global role', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.SYSTEM_ADMIN,
        { scope: 'global' },
      );
      expect(result).toBe(true);
    });

    it('should grant tenant-scoped permission from global role', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_MANAGE,
        { scope: 'tenant' },
      );
      expect(result).toBe(true);
    });
  });

  describe('getEffectivePermissions with scope', () => {
    it('should return only global permissions for global scope', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(
        testUser,
        'global',
      );

      expect(permissions).toContain(Permission.SYSTEM_ADMIN);
      expect(permissions).toContain(Permission.USER_MANAGE);
      expect(permissions).not.toContain(Permission.USER_CREATE); // tenant role permission
    });

    it('should return both global and tenant permissions for tenant scope', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(
        testUser,
        'tenant',
      );

      expect(permissions).toContain(Permission.SYSTEM_ADMIN); // global
      expect(permissions).toContain(Permission.USER_MANAGE); // global
      expect(permissions).toContain(Permission.USER_CREATE); // tenant
      expect(permissions).toContain(Permission.ORDER_MANAGE); // tenant
    });

    it('should respect custom tenantId parameter', async () => {
      const otherTenant = await tenantModel.create({
        name: 'Other Tenant',
        slug: 'other-tenant',
        status: 'active',
      });

      const otherTenantRole = await roleModel.create({
        name: 'Other Tenant Role',
        code: 'OTHER_ROLE',
        scope: 'tenant',
        tenantId: otherTenant._id as any,
        permissions: [Permission.PRODUCT_CREATE],
        status: 'active',
        isSystem: false,
      });

      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
        {
          roleId: otherTenantRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      // Check with user's default tenant
      const permissionsUserTenant = await service.getEffectivePermissions(
        testUser,
        'tenant',
      );
      expect(permissionsUserTenant).toContain(Permission.USER_CREATE);
      expect(permissionsUserTenant).not.toContain(Permission.PRODUCT_CREATE);

      // Check with other tenant
      const permissionsOtherTenant = await service.getEffectivePermissions(
        testUser,
        'tenant',
        otherTenant._id,
      );
      expect(permissionsOtherTenant).not.toContain(Permission.USER_CREATE);
      expect(permissionsOtherTenant).toContain(Permission.PRODUCT_CREATE);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', async () => {
      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasRole(
        testUser._id.toString(),
        'TENANT_ADMIN',
      );
      expect(result).toBe(true);
    });

    it('should return false when user does not have the role', async () => {
      const result = await service.hasRole(
        testUser._id.toString(),
        'TENANT_ADMIN',
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has at least one role', async () => {
      testUser.roleAssignments = [
        {
          roleId: managerRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasAnyRole(testUser._id.toString(), [
        'TENANT_ADMIN',
        'MANAGER',
      ]);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the roles', async () => {
      const result = await service.hasAnyRole(testUser._id.toString(), [
        'TENANT_ADMIN',
        'MANAGER',
      ]);
      expect(result).toBe(false);
    });
  });

  describe('isSystemAdmin', () => {
    it('should return true for system admin', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.isSystemAdmin(testUser._id.toString());
      expect(result).toBe(true);
    });

    it('should return false for non-system admin', async () => {
      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.isSystemAdmin(testUser._id.toString());
      expect(result).toBe(false);
    });
  });

  describe('isTenantAdmin', () => {
    it('should return true for tenant admin of the same tenant', async () => {
      testUser.roleAssignments = [
        {
          roleId: tenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.isTenantAdmin(testUser._id.toString());
      expect(result).toBe(true);
    });

    it('should return false for non-tenant admin', async () => {
      testUser.roleAssignments = [
        {
          roleId: managerRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.isTenantAdmin(testUser._id.toString());
      expect(result).toBe(false);
    });

    it('should return false for tenant admin of different tenant', async () => {
      const otherTenant = await tenantModel.create({
        name: 'Other Tenant',
        slug: 'other-tenant',
        status: 'active',
      });

      const otherTenantAdminRole = await roleModel.create({
        name: 'Other Tenant Admin',
        code: 'TENANT_ADMIN',
        scope: 'tenant',
        tenantId: otherTenant._id as any,
        permissions: [Permission.USER_CREATE],
        status: 'active',
        isSystem: false,
      });

      testUser.roleAssignments = [
        {
          roleId: otherTenantAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.isTenantAdmin(testUser._id.toString());
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission with scope', () => {
    it('should return true if user has at least one permission in tenant scope', async () => {
      testUser.specialPermissions = [Permission.USER_READ];
      await testUser.save();

      const result = await service.hasAnyPermission(
        testUser._id.toString(),
        [Permission.USER_CREATE, Permission.USER_READ, Permission.USER_DELETE],
        { scope: 'tenant' },
      );

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions in global scope', async () => {
      testUser.specialPermissions = [Permission.USER_READ];
      await testUser.save();

      const result = await service.hasAnyPermission(
        testUser._id.toString(),
        [Permission.SYSTEM_ADMIN, Permission.SYSTEM_CONFIG],
        { scope: 'global' },
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions with scope', () => {
    it('should return true if user has all permissions in tenant scope', async () => {
      testUser.specialPermissions = [
        Permission.USER_READ,
        Permission.USER_CREATE,
        Permission.USER_DELETE,
      ];
      await testUser.save();

      const result = await service.hasAllPermissions(
        testUser._id.toString(),
        [Permission.USER_READ, Permission.USER_CREATE],
        { scope: 'tenant' },
      );

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission in tenant scope', async () => {
      testUser.specialPermissions = [Permission.USER_READ];
      await testUser.save();

      const result = await service.hasAllPermissions(
        testUser._id.toString(),
        [Permission.USER_READ, Permission.USER_CREATE],
        { scope: 'tenant' },
      );

      expect(result).toBe(false);
    });
  });
});
