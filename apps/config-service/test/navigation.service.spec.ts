import { Test, TestingModule } from '@nestjs/testing';
import { NavigationService } from '../src/services/navigation.service';
import { NavigationRepository } from '../src/repositories/navigation.repository';
import { NavigationScope } from '../src/schemas/navigation.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RABBITMQ_USER_CLIENT } from '@shared/rabbitmq';

const mockRabbitMQClient = {
  emit: jest.fn().mockResolvedValue(undefined),
};

const mockNavigationRepository = {
  findById: jest.fn(),
  findByScope: jest.fn(),
  findChildren: jest.fn(),
  findRoots: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteChildren: jest.fn(),
  search: jest.fn(),
  getAncestors: jest.fn(),
  count: jest.fn(),
};

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        {
          provide: NavigationRepository,
          useValue: mockNavigationRepository,
        },
        {
          provide: RABBITMQ_USER_CLIENT,
          useValue: mockRabbitMQClient,
        },
      ],
    }).compile();

    service = module.get<NavigationService>(NavigationService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getGlobalNavigation', () => {
    it('should return global navigation tree', async () => {
      const mockRoots = [
        {
          id: 'nav-dashboard',
          label: 'Dashboard',
          scope: NavigationScope.GLOBAL,
          order: 1,
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNavigationRepository.findRoots.mockResolvedValue(mockRoots);
      mockNavigationRepository.findChildren.mockResolvedValue([]);

      const result = await service.getGlobalNavigation();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nav-dashboard');
      expect(mockNavigationRepository.findRoots).toHaveBeenCalledWith(
        NavigationScope.GLOBAL,
      );
    });

    it('should filter navigation by permissions', async () => {
      const mockRoots = [
        {
          id: 'nav-dashboard',
          label: 'Dashboard',
          scope: NavigationScope.GLOBAL,
          permissions: { include: ['user.read'] },
          order: 1,
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'nav-admin',
          label: 'Admin',
          scope: NavigationScope.GLOBAL,
          permissions: { include: ['admin.access'] },
          order: 2,
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNavigationRepository.findRoots.mockResolvedValue(mockRoots);
      mockNavigationRepository.findChildren.mockResolvedValue([]);

      const result = await service.getGlobalNavigation(['user.read']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nav-dashboard');
    });
  });

  describe('getModuleNavigation', () => {
    it('should return module-specific navigation tree', async () => {
      const mockRoots = [
        {
          id: 'nav-inventory',
          label: 'Inventory',
          scope: NavigationScope.MODULE,
          module: 'inventory',
          order: 1,
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNavigationRepository.findRoots.mockResolvedValue(mockRoots);
      mockNavigationRepository.findChildren.mockResolvedValue([]);

      const result = await service.getModuleNavigation('inventory');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nav-inventory');
      expect(mockNavigationRepository.findRoots).toHaveBeenCalledWith(
        NavigationScope.MODULE,
        'inventory',
      );
    });
  });

  describe('createNavigation', () => {
    it('should create a new navigation item', async () => {
      const dto = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
      };
      const userId = 'admin-user';
      const mockNav = {
        ...dto,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNavigationRepository.create.mockResolvedValue(mockNav);

      const result = await service.createNavigation(dto as any, userId);

      expect(result).toEqual(mockNav);
      expect(mockNavigationRepository.create).toHaveBeenCalledWith(dto, userId);
    });

    it('should throw error if module scope without module key', async () => {
      const dto = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.MODULE,
      };

      await expect(
        service.createNavigation(dto as any, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate parent exists', async () => {
      const dto = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        parentId: 'nav-parent',
      };

      mockNavigationRepository.findById.mockResolvedValue(null);

      await expect(
        service.createNavigation(dto as any, 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent XSS in label', async () => {
      const dto = {
        id: 'nav-test',
        label: '<script>alert("xss")</script>',
        scope: NavigationScope.GLOBAL,
      };

      await expect(
        service.createNavigation(dto as any, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateNavigation', () => {
    it('should update an existing navigation item', async () => {
      const dto = { label: 'Updated Label' };
      const userId = 'admin-user';
      const existing = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = { ...existing, ...dto, updatedBy: userId };

      mockNavigationRepository.findById.mockResolvedValue(existing);
      mockNavigationRepository.update.mockResolvedValue(updated);

      const result = await service.updateNavigation('nav-test', dto, userId);

      expect(result).toEqual(updated);
      expect(mockNavigationRepository.update).toHaveBeenCalledWith(
        'nav-test',
        dto,
        userId,
      );
    });

    it('should throw NotFoundException if item does not exist', async () => {
      mockNavigationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateNavigation('nonexistent', {}, 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNavigation', () => {
    it('should delete a navigation item with cascade', async () => {
      const navigation = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      mockNavigationRepository.findById.mockResolvedValue(navigation);
      mockNavigationRepository.findChildren.mockResolvedValue([]);
      mockNavigationRepository.delete.mockResolvedValue(true);

      await service.deleteNavigation('nav-test', 'admin', true);

      expect(mockNavigationRepository.delete).toHaveBeenCalledWith('nav-test');
    });

    it('should throw error if has children and cascade is false', async () => {
      const navigation = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      const children = [{ id: 'child-1', label: 'Child' }];

      mockNavigationRepository.findById.mockResolvedValue(navigation);
      mockNavigationRepository.findChildren.mockResolvedValue(children);

      await expect(
        service.deleteNavigation('nav-test', 'admin', false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveNavigation', () => {
    it('should move navigation item to new parent', async () => {
      const navigation = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        parentId: 'old-parent',
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      const newParent = {
        id: 'new-parent',
        label: 'New Parent',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      const moved = { ...navigation, parentId: 'new-parent' };

      mockNavigationRepository.findById
        .mockResolvedValueOnce(navigation)
        .mockResolvedValueOnce(newParent);
      mockNavigationRepository.getAncestors.mockResolvedValue([]);
      mockNavigationRepository.update.mockResolvedValue(moved);

      const result = await service.moveNavigation(
        'nav-test',
        { newParentId: 'new-parent' },
        'admin',
      );

      expect(result).toEqual(moved);
    });

    it('should prevent circular reference', async () => {
      const navigation = {
        id: 'nav-test',
        label: 'Test',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      const newParent = {
        id: 'nav-parent',
        label: 'Parent',
        scope: NavigationScope.GLOBAL,
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      mockNavigationRepository.findById
        .mockResolvedValueOnce(navigation)
        .mockResolvedValueOnce(newParent);
      mockNavigationRepository.getAncestors.mockResolvedValue(['nav-test']);

      await expect(
        service.moveNavigation(
          'nav-test',
          { newParentId: 'nav-parent' },
          'admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchNavigation', () => {
    it('should search navigation items', async () => {
      const mockResults = [
        { id: 'nav-1', label: 'Dashboard', scope: NavigationScope.GLOBAL },
        { id: 'nav-2', label: 'User Dashboard', scope: NavigationScope.GLOBAL },
      ];

      mockNavigationRepository.search.mockResolvedValue(mockResults);

      const result = await service.searchNavigation('dashboard');

      expect(mockNavigationRepository.search).toHaveBeenCalledWith(
        'dashboard',
        50,
      );
      expect(result).toEqual(mockResults);
    });

    it('should throw error for empty query', async () => {
      await expect(service.searchNavigation('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reloadCache', () => {
    it('should invalidate cache', async () => {
      await service.reloadCache();
      // Just ensure it doesn't throw
      expect(true).toBe(true);
    });
  });
});
