import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserRepository } from '../src/repositories/user.repository';
import { User, UserSchema } from '../src/schemas/user.schema';

describe('UserRepository Integration Tests', () => {
  let repository: UserRepository;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Create testing module
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UserRepository],
    }).compile();

    repository = moduleRef.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  afterEach(async () => {
    // Clean up between tests
    const model = moduleRef.get('UserModel');
    await model.deleteMany({});
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await repository.create(userData);

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.status).toBe('active');
    });

    it('should fail to create user with duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
      };

      await repository.create(userData);

      // Try to create another user with same email
      await expect(
        repository.create({
          username: 'testuser2',
          email: 'test@example.com',
        }),
      ).rejects.toThrow();
    });

    it('should fail to create user with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
      };

      await repository.create(userData);

      // Try to create another user with same username
      await expect(
        repository.create({
          username: 'testuser',
          email: 'test2@example.com',
        }),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      await repository.create({
        username: 'user1',
        email: 'user1@example.com',
      });
      await repository.create({
        username: 'user2',
        email: 'user2@example.com',
      });

      const users = await repository.findAll();

      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('user1');
      expect(users[1].username).toBe('user2');
    });

    it('should exclude soft-deleted users', async () => {
      const user1 = await repository.create({
        username: 'user1',
        email: 'user1@example.com',
      });
      await repository.create({
        username: 'user2',
        email: 'user2@example.com',
      });

      // Soft delete user1
      await repository.delete(user1._id.toString());

      const users = await repository.findAll();

      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('user2');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      const user = await repository.findById(created._id.toString());

      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('should return null for non-existent id', async () => {
      const user = await repository.findById('507f1f77bcf86cd799439011');

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      const user = await repository.findByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await repository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      const user = await repository.findByUsername('testuser');

      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('should return null for non-existent username', async () => {
      const user = await repository.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const created = await repository.create({
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
      });

      const updated = await repository.update(created._id.toString(), {
        firstName: 'Updated',
        lastName: 'User',
      });

      expect(updated).toBeDefined();
      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('User');
      expect(updated?.username).toBe('testuser'); // unchanged
    });

    it('should return null for non-existent id', async () => {
      const updated = await repository.update('507f1f77bcf86cd799439011', {
        firstName: 'Updated',
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete user', async () => {
      const created = await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      const deleted = await repository.delete(created._id.toString());

      expect(deleted).toBeDefined();
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.status).toBe('inactive');

      // Verify user is excluded from normal queries
      const found = await repository.findById(created._id.toString());
      expect(found).toBeNull();
    });

    it('should return null for non-existent id', async () => {
      const deleted = await repository.delete('507f1f77bcf86cd799439011');

      expect(deleted).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted user', async () => {
      const created = await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      // Soft delete
      await repository.delete(created._id.toString());

      // Restore
      const restored = await repository.restore(created._id.toString());

      expect(restored).toBeDefined();
      expect(restored?.deletedAt).toBeNull();
      expect(restored?.status).toBe('active');

      // Verify user is included in normal queries
      const found = await repository.findById(created._id.toString());
      expect(found).toBeDefined();
    });
  });

  describe('count', () => {
    it('should count users', async () => {
      await repository.create({
        username: 'user1',
        email: 'user1@example.com',
      });
      await repository.create({
        username: 'user2',
        email: 'user2@example.com',
      });

      const count = await repository.count();

      expect(count).toBe(2);
    });

    it('should exclude soft-deleted users from count', async () => {
      const user1 = await repository.create({
        username: 'user1',
        email: 'user1@example.com',
      });
      await repository.create({
        username: 'user2',
        email: 'user2@example.com',
      });

      await repository.delete(user1._id.toString());

      const count = await repository.count();

      expect(count).toBe(1);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const created = await repository.create({
        username: 'testuser',
        email: 'test@example.com',
      });

      expect(created.lastLoginAt).toBeNull();

      const updated = await repository.updateLastLogin(created._id.toString());

      expect(updated).toBeDefined();
      expect(updated?.lastLoginAt).toBeDefined();
      expect(updated?.lastLoginAt).toBeInstanceOf(Date);
    });
  });
});
