import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../src/services/config.service';
import { ConfigRepository } from '../src/repositories/config.repository';
import { ConfigScope } from '../src/schemas/config.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockRabbitMQClient = {
  publishEvent: jest.fn().mockResolvedValue(undefined),
};

const mockConfigRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

describe('ConfigService', () => {
  let service: ConfigService;
  let repository: ConfigRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: ConfigRepository,
          useValue: mockConfigRepository,
        },
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: mockRabbitMQClient,
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    repository = module.get<ConfigRepository>(ConfigRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('upsertGlobalConfig', () => {
    it('should create a new global config', async () => {
      const dto = {
        name: 'feature-flags',
        data: { darkMode: true },
        description: 'Feature flags',
      };
      const userId = 'admin-user';
      const mockConfig = {
        _id: 'config-id',
        name: dto.name,
        scope: ConfigScope.GLOBAL,
        data: dto.data,
        description: dto.description,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConfigRepository.upsert.mockResolvedValue(mockConfig);

      const result = await service.upsertGlobalConfig(dto, userId);

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.upsert).toHaveBeenCalledWith(
        dto.name,
        ConfigScope.GLOBAL,
        dto.data,
        userId,
        undefined,
        dto.description,
      );
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalled();
    });

    it('should reject config data exceeding size limit', async () => {
      const largeData = { data: 'x'.repeat(200000) }; // > 100KB
      const dto = {
        name: 'large-config',
        data: largeData,
      };

      await expect(
        service.upsertGlobalConfig(dto, 'admin-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getGlobalConfig', () => {
    it('should return a global config by name', async () => {
      const mockConfig = {
        _id: 'config-id',
        name: 'feature-flags',
        scope: ConfigScope.GLOBAL,
        data: { darkMode: true },
        version: 1,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getGlobalConfig('feature-flags');

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.findOne).toHaveBeenCalledWith(
        'feature-flags',
        ConfigScope.GLOBAL,
      );
    });

    it('should throw NotFoundException if config does not exist', async () => {
      mockConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getGlobalConfig('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateGlobalConfig', () => {
    it('should update an existing global config', async () => {
      const dto = { data: { darkMode: false } };
      const userId = 'admin-user';
      const mockConfig = {
        _id: 'config-id',
        name: 'feature-flags',
        scope: ConfigScope.GLOBAL,
        data: dto.data,
        version: 2,
        updatedBy: userId,
      };

      mockConfigRepository.update.mockResolvedValue(mockConfig);

      const result = await service.updateGlobalConfig(
        'feature-flags',
        dto,
        userId,
      );

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.update).toHaveBeenCalledWith(
        'feature-flags',
        ConfigScope.GLOBAL,
        { ...dto, updatedBy: userId },
      );
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if config does not exist', async () => {
      mockConfigRepository.update.mockResolvedValue(null);

      await expect(
        service.updateGlobalConfig('nonexistent', { data: {} }, 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteGlobalConfig', () => {
    it('should delete a global config', async () => {
      mockConfigRepository.delete.mockResolvedValue(true);

      await service.deleteGlobalConfig('feature-flags', 'admin-user');

      expect(mockConfigRepository.delete).toHaveBeenCalledWith(
        'feature-flags',
        ConfigScope.GLOBAL,
      );
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if config does not exist', async () => {
      mockConfigRepository.delete.mockResolvedValue(false);

      await expect(
        service.deleteGlobalConfig('nonexistent', 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserConfig', () => {
    it('should return a user config by name', async () => {
      const mockConfig = {
        _id: 'config-id',
        name: 'ui-preferences',
        scope: ConfigScope.USER,
        ownerId: 'user123',
        data: { theme: 'dark' },
        version: 1,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getUserConfig('user123', 'ui-preferences');

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.findOne).toHaveBeenCalledWith(
        'ui-preferences',
        ConfigScope.USER,
        'user123',
      );
    });

    it('should fallback to global config when user config not found', async () => {
      const mockGlobalConfig = {
        _id: 'global-config-id',
        name: 'feature-flags',
        scope: ConfigScope.GLOBAL,
        data: { darkMode: true },
        version: 1,
      };

      mockConfigRepository.findOne
        .mockResolvedValueOnce(null) // user config not found
        .mockResolvedValueOnce(mockGlobalConfig); // global config found

      const result = await service.getUserConfig(
        'user123',
        'feature-flags',
        true,
      );

      expect(result).toEqual(mockGlobalConfig);
      expect(mockConfigRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if config not found and no fallback', async () => {
      mockConfigRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserConfig('user123', 'nonexistent', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertUserConfig', () => {
    it('should create a new user config', async () => {
      const dto = {
        name: 'ui-preferences',
        data: { theme: 'dark' },
        description: 'User preferences',
      };
      const userId = 'user123';
      const actorId = 'user123';
      const mockConfig = {
        _id: 'config-id',
        name: dto.name,
        scope: ConfigScope.USER,
        ownerId: userId,
        data: dto.data,
        description: dto.description,
        version: 1,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConfigRepository.upsert.mockResolvedValue(mockConfig);

      const result = await service.upsertUserConfig(userId, dto, actorId);

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.upsert).toHaveBeenCalledWith(
        dto.name,
        ConfigScope.USER,
        dto.data,
        actorId,
        userId,
        dto.description,
      );
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalled();
    });
  });

  describe('listGlobalConfigs', () => {
    it('should return a list of global configs', async () => {
      const mockConfigs = [
        { name: 'config1', scope: ConfigScope.GLOBAL, data: {} },
        { name: 'config2', scope: ConfigScope.GLOBAL, data: {} },
      ];

      mockConfigRepository.find.mockResolvedValue(mockConfigs);

      const result = await service.listGlobalConfigs(100);

      expect(result).toEqual(mockConfigs);
      expect(mockConfigRepository.find).toHaveBeenCalledWith(
        ConfigScope.GLOBAL,
        undefined,
        100,
      );
    });
  });

  describe('listUserConfigs', () => {
    it('should return a list of user configs', async () => {
      const mockConfigs = [
        {
          name: 'config1',
          scope: ConfigScope.USER,
          ownerId: 'user123',
          data: {},
        },
        {
          name: 'config2',
          scope: ConfigScope.USER,
          ownerId: 'user123',
          data: {},
        },
      ];

      mockConfigRepository.find.mockResolvedValue(mockConfigs);

      const result = await service.listUserConfigs('user123', 100);

      expect(result).toEqual(mockConfigs);
      expect(mockConfigRepository.find).toHaveBeenCalledWith(
        ConfigScope.USER,
        'user123',
        100,
      );
    });
  });
});
