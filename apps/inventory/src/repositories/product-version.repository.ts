import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductVersion, ProductVersionDocument } from '@shared/schemas';

@Injectable()
export class ProductVersionRepository {
  constructor(
    @InjectModel(ProductVersion.name)
    private readonly versionModel: Model<ProductVersionDocument>,
  ) {}

  async create(versionData: Partial<ProductVersion>): Promise<ProductVersionDocument> {
    const version = new this.versionModel(versionData);
    return version.save();
  }

  async findByProductId(
    productId: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<{ items: ProductVersionDocument[]; total: number }> {
    const { skip = 0, limit = 10 } = options;

    const query = { productId: new Types.ObjectId(productId) };

    const [items, total] = await Promise.all([
      this.versionModel
        .find(query)
        .sort({ version: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.versionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByVersion(productId: string, version: number): Promise<ProductVersionDocument | null> {
    return this.versionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        version,
      })
      .exec();
  }

  async getLatestVersion(productId: string): Promise<ProductVersionDocument | null> {
    return this.versionModel
      .findOne({ productId: new Types.ObjectId(productId) })
      .sort({ version: -1 })
      .exec();
  }

  async deleteByProductId(productId: string): Promise<boolean> {
    const result = await this.versionModel
      .deleteMany({ productId: new Types.ObjectId(productId) })
      .exec();
    return result.deletedCount > 0;
  }
}
