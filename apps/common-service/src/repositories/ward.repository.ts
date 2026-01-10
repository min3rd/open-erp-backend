import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ward, WardDocument } from '@shared/schemas';
import { AdminGeometry, BBox } from '@shared/types/geometry.types';

@Injectable()
export class WardRepository {
  constructor(
    @InjectModel(Ward.name)
    private readonly wardModel: Model<WardDocument>,
  ) {}

  async findAll(
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<{ items: Ward[]; total: number }> {
    const query = this.wardModel.find(filter);

    if (options?.sort) {
      query.sort(options.sort);
    }

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      this.wardModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findByCode(code: string): Promise<Ward | null> {
    return this.wardModel.findOne({ code }).exec();
  }

  async findById(id: string): Promise<Ward | null> {
    return this.wardModel.findById(id).exec();
  }

  async findByProvinceCode(provinceCode: string): Promise<Ward[]> {
    return this.wardModel
      .find({ provinceCode })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findByDistrictCode(districtCode: string): Promise<Ward[]> {
    return this.wardModel
      .find({ districtCode })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async create(data: Partial<Ward>): Promise<Ward> {
    const ward = new this.wardModel(data);
    return ward.save();
  }

  async update(code: string, data: Partial<Ward>): Promise<Ward | null> {
    return this.wardModel
      .findOneAndUpdate({ code }, data, { new: true })
      .exec();
  }

  async delete(code: string): Promise<Ward | null> {
    return this.wardModel.findOneAndDelete({ code }).exec();
  }

  async search(
    searchTerm: string,
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<{ items: Ward[]; total: number }> {
    const searchFilter: Record<string, any> = {
      ...filter,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { nameEn: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    const query = this.wardModel
      .find(searchFilter)
      .sort({ sortOrder: 1, name: 1 });

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      this.wardModel.countDocuments(searchFilter),
    ]);

    return { items, total };
  }

  /**
   * Find wards within a bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<Ward[]> {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    return this.wardModel
      .find({
        geometry: {
          $geoWithin: {
            $box: [
              [minLon, minLat],
              [maxLon, maxLat],
            ],
          },
        },
      })
      .exec();
  }

  /**
   * Find wards that intersect with a geometry
   */
  async findIntersecting(geometry: AdminGeometry): Promise<Ward[]> {
    return this.wardModel
      .find({
        geometry: {
          $geoIntersects: {
            $geometry: geometry,
          },
        },
      })
      .exec();
  }

  /**
   * Find wards near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<Ward[]> {
    const query: any = {
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
    };

    if (maxDistanceMeters) {
      query.geometry.$near.$maxDistance = maxDistanceMeters;
    }

    return this.wardModel.find(query).exec();
  }

  /**
   * Update geometry fields
   */
  async updateGeometry(
    code: string,
    geometryData: Partial<Ward>,
  ): Promise<Ward | null> {
    return this.wardModel
      .findOneAndUpdate(
        { code },
        {
          ...geometryData,
          geometryUpdatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }
}
