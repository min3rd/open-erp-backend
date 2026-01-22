import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { WarehouseService } from '../src/services/warehouse.service';
import { WarehouseRepository } from '../src/repositories/warehouse.repository';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  QueryWarehouseDto,
} from '../src/dto/warehouse.dto';
import {
  WarehouseType,
  WarehouseStatus,
  CapacityUnit,
  Region,
} from '@shared/constants/warehouse.constants';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repository: WarehouseRepository;

  const mockWarehouse = {
    _id: '507f1f77bcf86cd799439011',
    code: 'WH-HN-001',
    name: 'Kho Hà Nội 1',
    type: WarehouseType.GENERAL,
    status: WarehouseStatus.ACTIVE,
    addressDetail: '123 Đường ABC',
    ward: { code: '00001', name: 'Phúc Xá' },
    province: { code: '01', name: 'Hà Nội' },
    region: Region.NORTHERN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    provinceExists: jest.fn(),
    wardExists: jest.fn(),
    getAllProvinces: jest.fn(),
    getWardsByProvince: jest.fn(),
    findNearby: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: WarehouseRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    repository = module.get<WarehouseRepository>(WarehouseRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateWarehouseDto = {
      code: 'WH-HN-001',
      name: 'Kho Hà Nội 1',
      type: WarehouseType.GENERAL,
      status: WarehouseStatus.ACTIVE,
      addressDetail: '123 Đường ABC',
      ward: { code: '00001', name: 'Phúc Xá' },
      province: { code: '01', name: 'Hà Nội' },
      region: Region.NORTHERN,
    };

    it('should create a warehouse successfully', async () => {
      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.findByCode.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockWarehouse);

      const result = await service.create(createDto, 'user-id');

      expect(result).toEqual(mockWarehouse);
      expect(mockRepository.provinceExists).toHaveBeenCalledWith('01');
      expect(mockRepository.wardExists).toHaveBeenCalledWith('00001', '01');
      expect(mockRepository.findByCode).toHaveBeenCalledWith(
        'WH-HN-001',
        undefined,
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDto, 'user-id');
    });

    it('should throw BadRequestException if province does not exist', async () => {
      mockRepository.provinceExists.mockResolvedValue(false);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.provinceExists).toHaveBeenCalledWith('01');
    });

    it('should throw BadRequestException if ward does not exist', async () => {
      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(false);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.wardExists).toHaveBeenCalledWith('00001', '01');
    });

    it('should throw ConflictException if warehouse code already exists', async () => {
      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.findByCode.mockResolvedValue(mockWarehouse);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findByCode).toHaveBeenCalledWith(
        'WH-HN-001',
        undefined,
      );
    });

    it('should throw BadRequestException if temperature range is invalid', async () => {
      const invalidDto = {
        ...createDto,
        temperatureMin: 25,
        temperatureMax: -20,
      };

      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.findByCode.mockResolvedValue(null);

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if usable area exceeds total area', async () => {
      const invalidDto = {
        ...createDto,
        totalAreaM2: 1000,
        usableAreaM2: 1500,
      };

      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.findByCode.mockResolvedValue(null);

      await expect(service.create(invalidDto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow creating multiple warehouses with same province and ward codes but different warehouse codes', async () => {
      // First warehouse
      const firstWarehouse = {
        ...mockWarehouse,
        code: 'WH-HN-001',
        name: 'Warehouse A',
      };

      // Second warehouse with same province/ward but different code
      const secondWarehouseDto: CreateWarehouseDto = {
        code: 'WH-HN-002',
        name: 'Warehouse B',
        type: WarehouseType.GENERAL,
        status: WarehouseStatus.ACTIVE,
        addressDetail: '456 Đường XYZ',
        ward: { code: '00001', name: 'Phúc Xá' }, // Same ward
        province: { code: '01', name: 'Hà Nội' }, // Same province
        region: Region.NORTHERN,
      };

      const secondWarehouse = {
        ...firstWarehouse,
        _id: '507f1f77bcf86cd799439012',
        code: 'WH-HN-002',
        name: 'Warehouse B',
        addressDetail: '456 Đường XYZ',
      };

      // First create - should succeed
      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.findByCode.mockResolvedValueOnce(null); // First code check
      mockRepository.create.mockResolvedValueOnce(firstWarehouse);

      const result1 = await service.create(createDto, 'user-id');
      expect(result1.code).toEqual('WH-HN-001');

      // Second create - should also succeed with same province/ward
      mockRepository.findByCode.mockResolvedValueOnce(null); // Second code check
      mockRepository.create.mockResolvedValueOnce(secondWarehouse);

      const result2 = await service.create(secondWarehouseDto, 'user-id');
      expect(result2.code).toEqual('WH-HN-002');

      // Verify both calls used the same province and ward
      expect(mockRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRepository.provinceExists).toHaveBeenCalledWith('01');
      expect(mockRepository.wardExists).toHaveBeenCalledWith('00001', '01');
    });
  });

  describe('findAll', () => {
    it('should return paginated warehouses', async () => {
      const query: QueryWarehouseDto = { page: 1, limit: 10 };
      const result = {
        items: [mockWarehouse],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockRepository.findAll.mockResolvedValue(result);

      const warehouses = await service.findAll(query);

      expect(warehouses).toEqual(result);
      expect(mockRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should return a warehouse by id', async () => {
      mockRepository.findById.mockResolvedValue(mockWarehouse);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockWarehouse);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateWarehouseDto = {
      name: 'Updated Warehouse Name',
    };

    it('should update a warehouse successfully', async () => {
      const updatedWarehouse = {
        ...mockWarehouse,
        name: 'Updated Warehouse Name',
      };
      mockRepository.findById.mockResolvedValue(mockWarehouse);
      mockRepository.update.mockResolvedValue(updatedWarehouse);

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
        'user-id',
      );

      expect(result).toEqual(updatedWarehouse);
      expect(mockRepository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
        'user-id',
      );
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('507f1f77bcf86cd799439011', updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate province if provided in update', async () => {
      const updateWithProvince = {
        ...updateDto,
        province: { code: '79', name: 'Hồ Chí Minh' },
        ward: { code: '26734', name: 'Tân Định' },
      };

      mockRepository.findById.mockResolvedValue(mockWarehouse);
      mockRepository.provinceExists.mockResolvedValue(true);
      mockRepository.wardExists.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue({
        ...mockWarehouse,
        ...updateWithProvince,
      });

      await service.update(
        '507f1f77bcf86cd799439011',
        updateWithProvince,
        'user-id',
      );

      expect(mockRepository.provinceExists).toHaveBeenCalledWith('79');
      expect(mockRepository.wardExists).toHaveBeenCalledWith('26734', '79');
    });
  });

  describe('delete', () => {
    it('should soft delete a warehouse successfully', async () => {
      mockRepository.softDelete.mockResolvedValue(mockWarehouse);

      await service.delete('507f1f77bcf86cd799439011');

      expect(mockRepository.softDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      mockRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findNearby', () => {
    it('should find nearby warehouses', async () => {
      mockRepository.findNearby.mockResolvedValue([mockWarehouse]);

      const result = await service.findNearby(105.8342, 21.0285, 10, 10);

      expect(result).toEqual([mockWarehouse]);
      expect(mockRepository.findNearby).toHaveBeenCalledWith(
        105.8342,
        21.0285,
        10,
        10,
      );
    });

    it('should throw BadRequestException for invalid coordinates', async () => {
      await expect(service.findNearby(200, 21.0285, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findNearby(105.8342, 100, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findNearby(105.8342, 21.0285, -1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProvinces', () => {
    it('should return all provinces', async () => {
      const provinces = [
        { code: '01', name: 'Hà Nội' },
        { code: '79', name: 'Hồ Chí Minh' },
      ];
      mockRepository.getAllProvinces.mockResolvedValue(provinces);

      const result = await service.getProvinces();

      expect(result).toEqual(provinces);
      expect(mockRepository.getAllProvinces).toHaveBeenCalled();
    });
  });

  describe('getWardsByProvince', () => {
    it('should return wards for a province', async () => {
      const wards = [
        { code: '00001', name: 'Phúc Xá', provinceCode: '01' },
        { code: '00004', name: 'Trúc Bạch', provinceCode: '01' },
      ];
      mockRepository.getWardsByProvince.mockResolvedValue(wards);

      const result = await service.getWardsByProvince('01');

      expect(result).toEqual(wards);
      expect(mockRepository.getWardsByProvince).toHaveBeenCalledWith('01');
    });
  });
});
