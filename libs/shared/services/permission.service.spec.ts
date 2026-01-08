import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { PermissionService } from '../services/permission.service';
import { User, UserSchema, UserDocument } from '../schemas/user.schema';
import { Role, RoleSchema, RoleDocument } from '../schemas/role.schema';
import {
  Organization,
  OrganizationSchema,
  OrganizationDocument,
} from '../schemas/organization.schema';
import { Permission } from '../types/permission.enum';

describe('PermissionService', () => {
  let service: PermissionService;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let organizationModel: Model<OrganizationDocument>;

  let testOrganization: OrganizationDocument;
  let testUser: UserDocument;
  let globalAdminRole: RoleDocument;
  let organizationAdminRole: RoleDocument;
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
          { name: Organization.name, schema: OrganizationSchema },
        ]),
      ],
      providers: [PermissionService],
    }).compile();

    service = moduleRef.get<PermissionService>(PermissionService);
    userModel = moduleRef.get('UserModel');
    roleModel = moduleRef.get('RoleModel');
    organizationModel = moduleRef.get('OrganizationModel');
  }, 60000); // Increase timeout for MongoDB download

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    // Create test organization
    testOrganization = await organizationModel.create({
      type: 'company',
      name: 'Test Organization',
      taxId: 'TEST-TAX-123',
      headquartersAddress: '123 Test St',
      legalRepresentative: 'Test Representative',
      contactPhone: '+1234567890',
      contactEmail: 'test@example.com',
      foundedDate: new Date('2020-01-01'),
      status: 'active',
      createdBy: new MongooseSchema.Types.ObjectId(),
    });

    // Create global admin role
    globalAdminRole = await roleModel.create({
      name: 'Global Admin',
      code: 'GLOBAL_ADMIN',
      scope: 'global',
      permissions: [Permission.SYSTEM_ADMIN, Permission.USER_MANAGE],
      status: 'active',
      isSystem: true,
    });

    // Create organization admin role
    organizationAdminRole = await roleModel.create({
      name: 'Organization Admin',
      code: 'ORGANIZATION_ADMIN',
      scope: 'organization',
      organizationId: testOrganization._id as any,
      permissions: [
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.ORDER_MANAGE,
      ],
      status: 'active',
      isSystem: false,
    });

    // Create manager role for same organization
    managerRole = await roleModel.create({
      name: 'Manager',
      code: 'MANAGER',
      scope: 'organization',
      organizationId: testOrganization._id as any,
      permissions: [Permission.ORDER_READ, Permission.ORDER_APPROVE],
      status: 'active',
      isSystem: false,
    });

    // Create test user
    testUser = await userModel.create({
      username: 'testuser',
      email: 'test@example.com',
      organizationId: testOrganization._id as any,
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
    if (organizationModel) {
      await organizationModel.deleteMany({});
    }
  });

  describe('hasPermission', () => {
    it('should return false when user has no permissions', async () => {
      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_CREATE,
      );
      expect(result).toBe(false);
    });

    it('should return true when user has special permission', async () => {
      // Grant special permission directly to user
      testUser.specialPermissions = [Permission.USER_DELETE];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_DELETE,
      );
      expect(result).toBe(true);
    });

    it('should return true when user has permission through role', async () => {
      // Assign tenant admin role to user
      testUser.roleAssignments = [
        {
          roleId: organizationAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const result = await service.hasPermission(
        testUser._id.toString(),
        Permission.USER_CREATE,
      );
      expect(result).toBe(true);
    });

    it('should return true when user has permission through global role', async () => {
      // Assign global admin role to user
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
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const fakeId = new MongooseSchema.Types.ObjectId(
        '507f1f77bcf86cd799439011',
      );
      const result = await service.hasPermission(
        fakeId.toString(),
        Permission.USER_CREATE,
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', async () => {
      testUser.specialPermissions = [Permission.USER_READ];
      await testUser.save();

      const result = await service.hasAnyPermission(testUser._id.toString(), [
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_DELETE,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      const result = await service.hasAnyPermission(testUser._id.toString(), [
        Permission.USER_CREATE,
        Permission.USER_DELETE,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', async () => {
      testUser.specialPermissions = [
        Permission.USER_READ,
        Permission.USER_CREATE,
        Permission.USER_DELETE,
      ];
      await testUser.save();

      const result = await service.hasAllPermissions(testUser._id.toString(), [
        Permission.USER_READ,
        Permission.USER_CREATE,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      testUser.specialPermissions = [Permission.USER_READ];
      await testUser.save();

      const result = await service.hasAllPermissions(testUser._id.toString(), [
        Permission.USER_READ,
        Permission.USER_CREATE,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return empty array when user has no permissions', async () => {
      const permissions = await service.getEffectivePermissions(testUser);
      expect(permissions).toEqual([]);
    });

    it('should return special permissions', async () => {
      testUser.specialPermissions = [
        Permission.USER_DELETE,
        Permission.ORDER_DELETE,
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);
      expect(permissions).toContain(Permission.USER_DELETE);
      expect(permissions).toContain(Permission.ORDER_DELETE);
      expect(permissions).toHaveLength(2);
    });

    it('should aggregate permissions from multiple roles', async () => {
      // Assign both tenant admin and manager roles
      testUser.roleAssignments = [
        {
          roleId: organizationAdminRole._id as any,
          grantedAt: new Date(),
        },
        {
          roleId: managerRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      // Should have permissions from both roles
      expect(permissions).toContain(Permission.USER_CREATE); // from tenant admin
      expect(permissions).toContain(Permission.ORDER_READ); // from manager
      expect(permissions).toContain(Permission.ORDER_APPROVE); // from manager
    });

    it('should combine special permissions with role permissions', async () => {
      testUser.specialPermissions = [Permission.USER_DELETE];
      testUser.roleAssignments = [
        {
          roleId: managerRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      expect(permissions).toContain(Permission.USER_DELETE); // special permission
      expect(permissions).toContain(Permission.ORDER_READ); // from role
    });

    it('should only include permissions from tenant roles matching user tenant', async () => {
      // Create another tenant and role
      const otherOrganization = await organizationModel.create({
        name: 'Other Tenant',
        slug: 'other-tenant',
        status: 'active',
      });

      const otherOrganizationRole = await roleModel.create({
        name: 'Other Tenant Role',
        code: 'OTHER_ROLE',
        scope: 'tenant',
        organizationId: otherOrganization._id as any,
        permissions: [Permission.PRODUCT_CREATE],
        status: 'active',
        isSystem: false,
      });

      // Assign both tenant roles to user (user belongs to testOrganization)
      testUser.roleAssignments = [
        {
          roleId: organizationAdminRole._id as any,
          grantedAt: new Date(),
        },
        {
          roleId: otherOrganizationRole._id, // This should NOT apply
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      // Should have permissions from testOrganization role only
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).not.toContain(Permission.PRODUCT_CREATE);
    });

    it('should include global role permissions regardless of tenant', async () => {
      testUser.roleAssignments = [
        {
          roleId: globalAdminRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      expect(permissions).toContain(Permission.SYSTEM_ADMIN);
      expect(permissions).toContain(Permission.USER_MANAGE);
    });

    it('should not include permissions from inactive roles', async () => {
      // Make manager role inactive
      managerRole.status = 'inactive';
      await managerRole.save();

      testUser.roleAssignments = [
        {
          roleId: managerRole._id as any,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      expect(permissions).toEqual([]);
    });

    it('should deduplicate permissions', async () => {
      // Create two roles with overlapping permissions
      const role1 = await roleModel.create({
        name: 'Role 1',
        code: 'ROLE_1',
        scope: 'tenant',
        organizationId: testOrganization._id as any,
        permissions: [Permission.USER_READ, Permission.USER_CREATE],
        status: 'active',
        isSystem: false,
      });

      const role2 = await roleModel.create({
        name: 'Role 2',
        code: 'ROLE_2',
        scope: 'tenant',
        organizationId: testOrganization._id as any,
        permissions: [Permission.USER_READ, Permission.USER_UPDATE],
        status: 'active',
        isSystem: false,
      });

      testUser.roleAssignments = [
        { roleId: role1._id as any, grantedAt: new Date() },
        { roleId: role2._id as any, grantedAt: new Date() },
      ];
      await testUser.save();

      const permissions = await service.getEffectivePermissions(testUser);

      // USER_READ should only appear once
      const readCount = permissions.filter(
        (p) => p === Permission.USER_READ,
      ).length;
      expect(readCount).toBe(1);
      expect(permissions).toHaveLength(3); // USER_READ, USER_CREATE, USER_UPDATE
    });
  });

  describe('getUserRolesWithDetails', () => {
    it('should return empty array when user has no roles', async () => {
      const roles = await service.getUserRolesWithDetails(
        testUser._id.toString(),
      );
      expect(roles).toEqual([]);
    });

    it('should return role details with assignment info', async () => {
      const grantedAt = new Date();
      testUser.roleAssignments = [
        {
          roleId: organizationAdminRole._id as any,
          grantedAt: grantedAt,
        },
      ];
      await testUser.save();

      const roles = await service.getUserRolesWithDetails(
        testUser._id.toString(),
      );

      expect(roles).toHaveLength(1);
      expect(roles[0].role.name).toBe('Tenant Admin');
      expect(roles[0].grantedAt).toEqual(grantedAt);
    });

    it('should include department info when present', async () => {
      const departmentId = new MongooseSchema.Types.ObjectId(
        '507f1f77bcf86cd799439011',
      );
      testUser.roleAssignments = [
        {
          roleId: managerRole._id as any,
          departmentId: departmentId,
          grantedAt: new Date(),
        },
      ];
      await testUser.save();

      const roles = await service.getUserRolesWithDetails(
        testUser._id.toString(),
      );

      expect(roles).toHaveLength(1);
      expect(roles[0].departmentId).toEqual(departmentId);
    });
  });
});
