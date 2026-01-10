import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  QueryWarehouseDto,
} from '../dto/warehouse.dto';
import { WarehouseDocument } from '@shared/schemas';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  /**
   * Create a new warehouse
   */
  async create(
    createDto: CreateWarehouseDto,
    userId: string,
  ): Promise<WarehouseDocument> {
    // Validate province exists
    const provinceExists = await this.warehouseRepository.provinceExists(
      createDto.province.code,
    );
    if (!provinceExists) {
      throw new BadRequestException(
        `Province with code ${createDto.province.code} does not exist`,
      );
    }

    // Validate ward exists and belongs to the province
    const wardExists = await this.warehouseRepository.wardExists(
      createDto.ward.code,
      createDto.province.code,
    );
    if (!wardExists) {
      throw new BadRequestException(
        `Ward with code ${createDto.ward.code} does not exist in province ${createDto.province.code}`,
      );
    }

    // Check if warehouse code already exists
    const existingWarehouse = await this.warehouseRepository.findByCode(
      createDto.code,
      createDto.tenantId,
    );
    if (existingWarehouse) {
      throw new ConflictException(
        `Warehouse with code ${createDto.code} already exists`,
      );
    }

    // Validate temperature range
    if (
      createDto.temperatureMin !== undefined &&
      createDto.temperatureMax !== undefined &&
      createDto.temperatureMin > createDto.temperatureMax
    ) {
      throw new BadRequestException(
        'Temperature minimum cannot be greater than maximum',
      );
    }

    // Validate humidity range
    if (
      createDto.humidityMin !== undefined &&
      createDto.humidityMax !== undefined &&
      createDto.humidityMin > createDto.humidityMax
    ) {
      throw new BadRequestException(
        'Humidity minimum cannot be greater than maximum',
      );
    }

    // Validate usable area is not greater than total area
    if (
      createDto.usableAreaM2 !== undefined &&
      createDto.totalAreaM2 !== undefined &&
      createDto.usableAreaM2 > createDto.totalAreaM2
    ) {
      throw new BadRequestException(
        'Usable area cannot be greater than total area',
      );
    }

    // Validate location coordinates if provided
    if (createDto.location) {
      const [lon, lat] = createDto.location.coordinates;
      if (lon < -180 || lon > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180');
      }
      if (lat < -90 || lat > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90');
      }
    }

    try {
      return await this.warehouseRepository.create(createDto, userId);
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException(
          `Warehouse with code ${createDto.code} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Find all warehouses with filtering and pagination
   */
  async findAll(query: QueryWarehouseDto): Promise<{
    items: WarehouseDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.warehouseRepository.findAll(query);
  }

  /**
   * Find warehouse by ID
   */
  async findById(id: string): Promise<WarehouseDocument> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  /**
   * Find warehouse by code
   */
  async findByCode(
    code: string,
    tenantId?: string,
  ): Promise<WarehouseDocument> {
    const warehouse = await this.warehouseRepository.findByCode(code, tenantId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with code ${code} not found`);
    }
    return warehouse;
  }

  /**
   * Update warehouse
   */
  async update(
    id: string,
    updateDto: UpdateWarehouseDto,
    userId: string,
  ): Promise<WarehouseDocument> {
    // Check if warehouse exists
    const existingWarehouse = await this.warehouseRepository.findById(id);
    if (!existingWarehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Validate province if provided
    if (updateDto.province) {
      const provinceExists = await this.warehouseRepository.provinceExists(
        updateDto.province.code,
      );
      if (!provinceExists) {
        throw new BadRequestException(
          `Province with code ${updateDto.province.code} does not exist`,
        );
      }
    }

    // Validate ward if provided
    if (updateDto.ward && updateDto.province) {
      const wardExists = await this.warehouseRepository.wardExists(
        updateDto.ward.code,
        updateDto.province.code,
      );
      if (!wardExists) {
        throw new BadRequestException(
          `Ward with code ${updateDto.ward.code} does not exist in province ${updateDto.province.code}`,
        );
      }
    }

    // Check for code uniqueness if code is being updated
    if (updateDto.code && updateDto.code !== existingWarehouse.code) {
      const codeExists = await this.warehouseRepository.findByCode(
        updateDto.code,
        updateDto.tenantId || existingWarehouse.tenantId,
      );
      if (codeExists) {
        throw new ConflictException(
          `Warehouse with code ${updateDto.code} already exists`,
        );
      }
    }

    // Validate ranges
    const finalTempMin =
      updateDto.temperatureMin ?? existingWarehouse.temperatureMin;
    const finalTempMax =
      updateDto.temperatureMax ?? existingWarehouse.temperatureMax;
    if (
      finalTempMin !== undefined &&
      finalTempMax !== undefined &&
      finalTempMin > finalTempMax
    ) {
      throw new BadRequestException(
        'Temperature minimum cannot be greater than maximum',
      );
    }

    const finalHumidityMin =
      updateDto.humidityMin ?? existingWarehouse.humidityMin;
    const finalHumidityMax =
      updateDto.humidityMax ?? existingWarehouse.humidityMax;
    if (
      finalHumidityMin !== undefined &&
      finalHumidityMax !== undefined &&
      finalHumidityMin > finalHumidityMax
    ) {
      throw new BadRequestException(
        'Humidity minimum cannot be greater than maximum',
      );
    }

    const finalUsableArea =
      updateDto.usableAreaM2 ?? existingWarehouse.usableAreaM2;
    const finalTotalArea =
      updateDto.totalAreaM2 ?? existingWarehouse.totalAreaM2;
    if (
      finalUsableArea !== undefined &&
      finalTotalArea !== undefined &&
      finalUsableArea > finalTotalArea
    ) {
      throw new BadRequestException(
        'Usable area cannot be greater than total area',
      );
    }

    // Validate location coordinates if provided
    if (updateDto.location) {
      const [lon, lat] = updateDto.location.coordinates;
      if (lon < -180 || lon > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180');
      }
      if (lat < -90 || lat > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90');
      }
    }

    try {
      const updated = await this.warehouseRepository.update(
        id,
        updateDto,
        userId,
      );
      if (!updated) {
        throw new NotFoundException(`Warehouse with ID ${id} not found`);
      }
      return updated;
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException(
          `Warehouse with code ${updateDto.code} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete warehouse
   */
  async delete(id: string): Promise<void> {
    const warehouse = await this.warehouseRepository.softDelete(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
  }

  /**
   * Restore soft-deleted warehouse
   */
  async restore(id: string): Promise<WarehouseDocument> {
    const warehouse = await this.warehouseRepository.restore(id);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  /**
   * Get all provinces
   */
  async getProvinces() {
    return this.warehouseRepository.getAllProvinces();
  }

  /**
   * Get wards by province
   */
  async getWardsByProvince(provinceCode: string) {
    return this.warehouseRepository.getWardsByProvince(provinceCode);
  }

  /**
   * Find warehouses nearby
   */
  async findNearby(
    longitude: number,
    latitude: number,
    radiusKm: number,
    limit: number = 10,
  ) {
    // Validate coordinates
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }
    if (radiusKm <= 0) {
      throw new BadRequestException('Radius must be greater than 0');
    }

    return this.warehouseRepository.findNearby(
      longitude,
      latitude,
      radiusKm,
      limit,
    );
  }
}
