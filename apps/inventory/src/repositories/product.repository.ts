import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@shared/schemas';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(productData: Partial<Product>): Promise<ProductDocument> {
    const product = new this.productModel(productData);
    return product.save();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).exec();
  }

  async findBySku(sku: string, organizationId?: string): Promise<ProductDocument | null> {
    const query: any = { sku };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    return this.productModel.findOne(query).exec();
  }

  async findByBarcode(barcode: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ barcode }).exec();
  }

  async findAll(
    filter: any = {},
    options: {
      skip?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{ items: ProductDocument[]; total: number }> {
    const { skip = 0, limit = 10, sort = { createdAt: -1 } } = options;

    const [items, total] = await Promise.all([
      this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async update(id: string, updateData: Partial<Product>): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async softDelete(id: string): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { deletedAt: new Date(), status: 'inactive' } },
        { new: true },
      )
      .exec();
  }

  async search(
    searchText: string,
    filter: any = {},
    options: { skip?: number; limit?: number } = {},
  ): Promise<{ items: ProductDocument[]; total: number }> {
    const { skip = 0, limit = 10 } = options;

    const searchQuery = {
      ...filter,
      $text: { $search: searchText },
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(searchQuery).exec(),
    ]);

    return { items, total };
  }

  async incrementVersion(id: string): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { currentVersion: 1 },
          $set: { versionCreatedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }
}
