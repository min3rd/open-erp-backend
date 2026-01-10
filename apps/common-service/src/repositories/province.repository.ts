import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Province, ProvinceDocument } from '@shared/schemas';
import { AdminGeometry, BBox } from '@shared/types/geometry.types';

@Injectable()
export class ProvinceRepository {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
  ) {}

  async findAll(
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<{ items: Province[]; total: number }> {
    const query = this.provinceModel.find(filter);

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
      this.provinceModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findByCode(code: string): Promise<Province | null> {
    return this.provinceModel.findOne({ code }).exec();
  }

  async findById(id: string): Promise<Province | null> {
    return this.provinceModel.findById(id).exec();
  }

  async create(data: Partial<Province>): Promise<Province> {
    const province = new this.provinceModel(data);
    return province.save();
  }

  async update(
    code: string,
    data: Partial<Province>,
  ): Promise<Province | null> {
    return this.provinceModel
      .findOneAndUpdate({ code }, data, { new: true })
      .exec();
  }

  async delete(code: string): Promise<Province | null> {
    return this.provinceModel.findOneAndDelete({ code }).exec();
  }

  async search(
    searchTerm: string,
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<{ items: Province[]; total: number }> {
    const searchFilter: Record<string, any> = {
      ...filter,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { nameEn: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    const query = this.provinceModel
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
      this.provinceModel.countDocuments(searchFilter),
    ]);

    return { items, total };
  }

  /**
   * Find provinces within a bounding box
   */
  async findWithinBBox(bbox: BBox): Promise<Province[]> {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    return this.provinceModel
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
   * Find provinces that intersect with a geometry
   */
  async findIntersecting(geometry: AdminGeometry): Promise<Province[]> {
    return this.provinceModel
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
   * Find provinces near a point
   */
  async findNearPoint(
    longitude: number,
    latitude: number,
    maxDistanceMeters?: number,
  ): Promise<Province[]> {
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

    return this.provinceModel.find(query).exec();
  }

  /**
   * Update geometry fields
   */
  async updateGeometry(
    code: string,
    geometryData: Partial<Province>,
  ): Promise<Province | null> {
    return this.provinceModel
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
