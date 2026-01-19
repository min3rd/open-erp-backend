import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Warehouse,
  WarehouseDocument,
  Province,
  ProvinceDocument,
  Ward,
  WardDocument,
} from '@shared/schemas';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  QueryWarehouseDto,
} from '../dto/warehouse.dto';

@Injectable()
export class WarehouseRepository {
  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
    @InjectModel(Ward.name)
    private readonly wardModel: Model<WardDocument>,
  ) {}

  /**
   * Create a new warehouse
   */
  async create(
    createDto: CreateWarehouseDto,
    createdBy: string,
  ): Promise<WarehouseDocument> {
    const warehouse = new this.warehouseModel({
      ...createDto,
      createdBy,
    });
    return warehouse.save();
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
    const {
      page = 1,
      limit = 10,
      type,
      status,
      provinceCode,
      wardCode,
      region,
      tenantId,
      search,
      bbox,
    } = query;

    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (provinceCode) {
      filter['province.code'] = provinceCode;
    }

    if (wardCode) {
      filter['ward.code'] = wardCode;
    }

    if (region) {
      filter.region = region;
    }

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Geo query - bounding box
    if (bbox) {
      const [lon, lat, radiusKm] = bbox.split(',').map(Number);
      if (lon && lat && radiusKm) {
        filter.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            $maxDistance: radiusKm * 1000, // Convert km to meters
          },
        };
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.warehouseModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.warehouseModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Find warehouse by ID
   */
  async findById(id: string): Promise<WarehouseDocument | null> {
    return this.warehouseModel.findById(id).exec();
  }

  /**
   * Find warehouse by code
   */
  async findByCode(
    code: string,
    tenantId?: string,
  ): Promise<WarehouseDocument | null> {
    const filter: any = { code };
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    return this.warehouseModel.findOne(filter).exec();
  }

  /**
   * Update warehouse
   */
  async update(
    id: string,
    updateDto: UpdateWarehouseDto,
    updatedBy: string,
  ): Promise<WarehouseDocument | null> {
    return this.warehouseModel
      .findByIdAndUpdate(
        id,
        { ...updateDto, updatedBy },
        { new: true, runValidators: true },
      )
      .exec();
  }

  /**
   * Soft delete warehouse
   */
  async softDelete(id: string): Promise<WarehouseDocument | null> {
    const warehouse = await this.warehouseModel.findById(id).exec();
    if (!warehouse) {
      return null;
    }
    return warehouse.softDelete();
  }

  /**
   * Hard delete warehouse (for testing purposes only)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.warehouseModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Restore soft-deleted warehouse
   */
  async restore(id: string): Promise<WarehouseDocument | null> {
    const warehouse = await this.warehouseModel
      .findById(id)
      .setOptions({ includeDeleted: true })
      .exec();
    if (!warehouse) {
      return null;
    }
    return warehouse.restore();
  }

  /**
   * Check if province code exists
   */
  async provinceExists(code: string): Promise<boolean> {
    const province = await this.provinceModel.findOne({ code }).exec();
    return !!province;
  }

  /**
   * Check if ward code exists for a given province
   */
  async wardExists(code: string, provinceCode: string): Promise<boolean> {
    const ward = await this.wardModel.findOne({ code, provinceCode }).exec();
    return !!ward;
  }

  /**
   * Get province by code
   */
  async getProvince(code: string): Promise<ProvinceDocument | null> {
    return this.provinceModel.findOne({ code }).exec();
  }

  /**
   * Get ward by code
   */
  async getWard(
    code: string,
    provinceCode: string,
  ): Promise<WardDocument | null> {
    return this.wardModel.findOne({ code, provinceCode }).exec();
  }

  /**
   * Get all provinces
   */
  async getAllProvinces(): Promise<ProvinceDocument[]> {
    return this.provinceModel.find().sort({ sortOrder: 1 }).exec();
  }

  /**
   * Get wards by province code
   */
  async getWardsByProvince(provinceCode: string): Promise<WardDocument[]> {
    return this.wardModel.find({ provinceCode }).sort({ sortOrder: 1 }).exec();
  }

  /**
   * Find warehouses within radius
   */
  async findNearby(
    longitude: number,
    latitude: number,
    radiusKm: number,
    limit: number = 10,
  ): Promise<WarehouseDocument[]> {
    return this.warehouseModel
      .find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000, // Convert km to meters
          },
        },
      })
      .limit(limit)
      .exec();
  }
}
