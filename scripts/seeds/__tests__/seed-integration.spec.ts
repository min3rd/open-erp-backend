/**
 * Integration tests for seed scripts
 * Tests seeding operations with an in-memory MongoDB database
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, connection, Model } from 'mongoose';
import { RoleSchema, Role } from '@shared/schemas/role.schema';
import {
  OrganizationSchema,
  Organization,
} from '@shared/schemas/organization.schema';
import { UserSchema, User } from '@shared/schemas/user.schema';
import {
  OrganizationMemberSchema,
  OrganizationMember,
} from '@shared/schemas/organization-member.schema';

describe('Seed Scripts Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let RoleModel: Model<Role>;
  let OrganizationModel: Model<Organization>;
  let UserModel: Model<User>;
  let OrganizationMemberModel: Model<OrganizationMember>;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    // Skip tests if MongoDB Memory Server cannot be started (e.g., in CI/sandbox)
    try {
      mongoServer = await MongoMemoryServer.create();
    } catch (err) {
      console.warn(
        'MongoDB Memory Server could not be started. Skipping integration tests.',
      );
      console.warn(
        'To run integration tests locally, ensure internet connection is available.',
      );
      return;
    }

    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await connect(mongoUri);

    // Register models
    RoleModel = connection.model('Role', RoleSchema);
    OrganizationModel = connection.model('Organization', OrganizationSchema);
    UserModel = connection.model('User', UserSchema);
    OrganizationMemberModel = connection.model(
      'OrganizationMember',
      OrganizationMemberSchema,
    );
  });

  afterAll(async () => {
    // Cleanup
    if (mongoServer) {
      await connection.close();
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    // Clear all collections after each test
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Role Seeding', () => {
    it('should seed system roles successfully', async () => {
      if (!mongoServer) {
        console.log('Skipping test: MongoDB Memory Server not available');
        return;
      }
      // Define test roles
      const testRoles = [
        {
          code: 'SUPER_ADMIN',
          name: 'Super Administrator',
          description: 'System super administrator',
          scope: 'global' as const,
          permissions: ['system.manage'],
          isSystem: true,
          status: 'active',
        },
        {
          code: 'ORG_ADMIN',
          name: 'Organization Administrator',
          description: 'Organization administrator',
          scope: 'organization' as const,
          permissions: ['org.manage'],
          isSystem: true,
          status: 'active',
        },
      ];

      // Insert roles
      for (const role of testRoles) {
        await RoleModel.updateOne(
          { code: role.code, scope: role.scope },
          { $set: role },
          { upsert: true },
        );
      }

      // Verify roles were inserted
      const roles = await RoleModel.find({});
      expect(roles.length).toBe(2);

      const superAdminRole = await RoleModel.findOne({ code: 'SUPER_ADMIN' });
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole?.name).toBe('Super Administrator');
      expect(superAdminRole?.scope).toBe('global');
    });

    it('should handle role upserts correctly', async () => {
      const role = {
        code: 'TEST_ROLE',
        name: 'Test Role',
        description: 'Test role',
        scope: 'global' as const,
        permissions: ['test.read'],
        isSystem: true,
        status: 'active',
      };

      // First insert
      await RoleModel.updateOne(
        { code: role.code, scope: role.scope },
        { $set: role },
        { upsert: true },
      );

      // Verify first insert
      let count = await RoleModel.countDocuments({ code: 'TEST_ROLE' });
      expect(count).toBe(1);

      // Update with same upsert
      await RoleModel.updateOne(
        { code: role.code, scope: role.scope },
        { $set: { ...role, name: 'Updated Test Role' } },
        { upsert: true },
      );

      // Verify still only one document
      count = await RoleModel.countDocuments({ code: 'TEST_ROLE' });
      expect(count).toBe(1);

      // Verify update was applied
      const updatedRole = await RoleModel.findOne({ code: 'TEST_ROLE' });
      expect(updatedRole?.name).toBe('Updated Test Role');
    });
  });

  describe('Organization Seeding', () => {
    let systemUser: any;

    beforeEach(async () => {
      // Create a system user for createdBy field
      systemUser = await UserModel.create({
        username: 'system',
        email: 'system@test.com',
        password: 'hashedpassword',
        status: 'active',
        displayName: 'System User',
      });
    });

    it('should seed organizations successfully', async () => {
      const testOrgs = [
        {
          taxId: 'ORG0000000001',
          name: 'Test Company 1',
          type: 'company' as const,
          headquartersAddress: '123 Test St',
          legalRepresentative: 'John Doe',
          contactPhone: '+84912345678',
          contactEmail: 'contact@testcompany1.com',
          foundedDate: new Date('2020-01-01'),
          status: 'active' as const,
          country: 'VN',
          createdBy: systemUser._id,
        },
        {
          taxId: 'ORG0000000002',
          name: 'Test Company 2',
          type: 'branch' as const,
          headquartersAddress: '456 Test Ave',
          legalRepresentative: 'Jane Smith',
          contactPhone: '+84987654321',
          contactEmail: 'contact@testcompany2.com',
          foundedDate: new Date('2021-01-01'),
          status: 'active' as const,
          country: 'VN',
          createdBy: systemUser._id,
        },
      ];

      // Insert organizations
      await OrganizationModel.insertMany(testOrgs);

      // Verify organizations were inserted
      const orgs = await OrganizationModel.find({});
      expect(orgs.length).toBe(2);

      const org1 = await OrganizationModel.findOne({ taxId: 'ORG0000000001' });
      expect(org1).toBeDefined();
      expect(org1?.name).toBe('Test Company 1');
      expect(org1?.type).toBe('company');
    });
  });

  describe('User Seeding', () => {
    let superAdminRole: any;
    let orgUserRole: any;
    let testOrg: any;
    let systemUser: any;

    beforeEach(async () => {
      // Create system user
      systemUser = await UserModel.create({
        username: 'system',
        email: 'system@test.com',
        password: 'hashedpassword',
        status: 'active',
        displayName: 'System User',
      });

      // Create test roles
      superAdminRole = await RoleModel.create({
        code: 'SUPER_ADMIN',
        name: 'Super Administrator',
        description: 'System super administrator',
        scope: 'global',
        permissions: ['system.manage'],
        isSystem: true,
        status: 'active',
      });

      orgUserRole = await RoleModel.create({
        code: 'ORG_USER',
        name: 'Organization User',
        description: 'Regular organization user',
        scope: 'organization',
        permissions: ['org.inventory.read'],
        isSystem: true,
        status: 'active',
      });

      // Create test organization
      testOrg = await OrganizationModel.create({
        taxId: 'ORG0000000001',
        name: 'Test Company',
        type: 'company',
        headquartersAddress: '123 Test St',
        legalRepresentative: 'John Doe',
        contactPhone: '+84912345678',
        contactEmail: 'contact@testcompany.com',
        foundedDate: new Date('2020-01-01'),
        status: 'active',
        country: 'VN',
        createdBy: systemUser._id,
      });
    });

    it('should seed superadmin user successfully', async () => {
      const superadmin = await UserModel.create({
        username: 'superadmin',
        email: 'superadmin@test.com',
        password: 'hashedpassword',
        displayName: 'Super Administrator',
        fullName: 'Super Administrator',
        status: 'active',
        verifiedAt: new Date(),
        roleAssignments: [
          {
            roleId: superAdminRole._id,
            grantedAt: new Date(),
          },
        ],
      });

      expect(superadmin).toBeDefined();
      expect(superadmin.username).toBe('superadmin');
      expect(superadmin.roleAssignments.length).toBe(1);
      expect(superadmin.roleAssignments[0].roleId.toString()).toBe(
        superAdminRole._id.toString(),
      );
    });

    it('should seed regular users with organization assignment', async () => {
      const regularUser = await UserModel.create({
        username: 'john.doe1',
        email: 'john.doe1@test.com',
        password: 'hashedpassword',
        displayName: 'John Doe',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
        verifiedAt: new Date(),
        organizationId: testOrg._id,
        roleAssignments: [
          {
            roleId: orgUserRole._id,
            grantedAt: new Date(),
          },
        ],
      });

      expect(regularUser).toBeDefined();
      expect(regularUser.organizationId?.toString()).toBe(
        testOrg._id.toString(),
      );
      expect(regularUser.roleAssignments.length).toBe(1);
    });

    it('should ensure email uniqueness', async () => {
      await UserModel.create({
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'hashedpassword',
        displayName: 'User 1',
        status: 'active',
      });

      // Attempt to create user with duplicate email should fail
      await expect(
        UserModel.create({
          username: 'user2',
          email: 'duplicate@test.com',
          password: 'hashedpassword',
          displayName: 'User 2',
          status: 'active',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Relationship Seeding', () => {
    let testOrg: any;
    let adminUser: any;
    let regularUser: any;
    let orgAdminRole: any;
    let orgUserRole: any;
    let systemUser: any;

    beforeEach(async () => {
      // Create system user
      systemUser = await UserModel.create({
        username: 'system',
        email: 'system@test.com',
        password: 'hashedpassword',
        status: 'active',
        displayName: 'System User',
      });

      // Create roles
      orgAdminRole = await RoleModel.create({
        code: 'ORG_ADMIN',
        name: 'Organization Administrator',
        description: 'Organization administrator',
        scope: 'organization',
        permissions: ['org.manage'],
        isSystem: true,
        status: 'active',
      });

      orgUserRole = await RoleModel.create({
        code: 'ORG_USER',
        name: 'Organization User',
        description: 'Regular organization user',
        scope: 'organization',
        permissions: ['org.inventory.read'],
        isSystem: true,
        status: 'active',
      });

      // Create organization
      testOrg = await OrganizationModel.create({
        taxId: 'ORG0000000001',
        name: 'Test Company',
        type: 'company',
        headquartersAddress: '123 Test St',
        legalRepresentative: 'John Doe',
        contactPhone: '+84912345678',
        contactEmail: 'contact@testcompany.com',
        foundedDate: new Date('2020-01-01'),
        status: 'active',
        country: 'VN',
        createdBy: systemUser._id,
      });

      // Create users
      adminUser = await UserModel.create({
        username: 'admin1',
        email: 'admin1@test.com',
        password: 'hashedpassword',
        displayName: 'Admin User',
        status: 'active',
        organizationId: testOrg._id,
        roleAssignments: [
          {
            roleId: orgAdminRole._id,
            grantedAt: new Date(),
          },
        ],
      });

      regularUser = await UserModel.create({
        username: 'user1',
        email: 'user1@test.com',
        password: 'hashedpassword',
        displayName: 'Regular User',
        status: 'active',
        organizationId: testOrg._id,
        roleAssignments: [
          {
            roleId: orgUserRole._id,
            grantedAt: new Date(),
          },
        ],
      });
    });

    it('should create organization member relationships', async () => {
      // Create organization member entries
      await OrganizationMemberModel.create({
        organizationId: testOrg._id,
        userId: adminUser._id,
        roles: ['admin', 'member'],
        status: 'active',
        joinedAt: new Date(),
        createdBy: systemUser._id,
      });

      await OrganizationMemberModel.create({
        organizationId: testOrg._id,
        userId: regularUser._id,
        roles: ['member'],
        status: 'active',
        joinedAt: new Date(),
        createdBy: systemUser._id,
      });

      // Verify relationships
      const members = await OrganizationMemberModel.find({
        organizationId: testOrg._id,
      });
      expect(members.length).toBe(2);

      const adminMember = members.find(
        (m) => m.userId.toString() === adminUser._id.toString(),
      );
      expect(adminMember).toBeDefined();
      expect(adminMember?.roles).toContain('admin');

      const regularMember = members.find(
        (m) => m.userId.toString() === regularUser._id.toString(),
      );
      expect(regularMember).toBeDefined();
      expect(regularMember?.roles).toContain('member');
    });

    it('should enforce unique user-organization membership', async () => {
      await OrganizationMemberModel.create({
        organizationId: testOrg._id,
        userId: adminUser._id,
        roles: ['admin'],
        status: 'active',
        joinedAt: new Date(),
        createdBy: systemUser._id,
      });

      // Attempt to create duplicate membership should fail
      await expect(
        OrganizationMemberModel.create({
          organizationId: testOrg._id,
          userId: adminUser._id,
          roles: ['member'],
          status: 'active',
          joinedAt: new Date(),
          createdBy: systemUser._id,
        }),
      ).rejects.toThrow();
    });
  });
});
