import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { District, DistrictDocument } from '@shared/schemas';
import { AdminGeometry, BBox } from '@shared/types/geometry.types';

@Injectable()
export class DistrictRepository {
  constructor(
    @InjectModel(District.name)
    private readonly districtModel: Model<DistrictDocument>,
  ) {}

  async findAll(
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<{ items: District[]; total: number }> {
    const query = this.districtModel.find(filter);

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
      this.districtModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findByCode(code: string): Promise<District | null> {
    return this.districtModel.findOne({ code }).exec();
  }

  async findById(id: string): Promise<District | null> {
    return this.districtModel.findById(id).exec();
  }

  async findByProvinceCode(provinceCode: string): Promise<District[]> {
    return this.districtModel
      .find({ provinceCode })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async create(data: Partial<District>): Promise<District> {
    const district = new this.districtModel(data);
    return district.save();
  }

  async update(
    code: string,
    data: Partial<District>,
  ): Promise<District | null> {
    return this.districtModel
      .findOneAndUpdate({ code }, data, { new: true })
      .exec();
  }

  async delete(code: string): Promise<District | null> {
    return this.districtModel.findOneAndDelete({ code }).exec();
  }

  async search(
    searchTerm: string,
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<{ items: District[]; total: number }> {
    const searchFilter: Record<string, any> = {
      ...filter,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { nameEn: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    const query = this.districtModel
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
      this.districtModel.countDocuments(searchFilter),
    ]);

    return { items, total };
  }

  /**
   * Find districts within a bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<District[]> {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    return this.districtModel
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
   * Find districts that intersect with a geometry
   */
  async findIntersecting(geometry: AdminGeometry): Promise<District[]> {
    return this.districtModel
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
   * Find districts near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<District[]> {
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

    return this.districtModel.find(query).exec();
  }

  /**
   * Update geometry fields
   */
  async updateGeometry(
    code: string,
    geometryData: Partial<District>,
  ): Promise<District | null> {
    return this.districtModel
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
