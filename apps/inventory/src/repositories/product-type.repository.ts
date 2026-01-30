import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductType, ProductTypeDocument } from '@shared/schemas';

@Injectable()
export class ProductTypeRepository {
  constructor(
    @InjectModel(ProductType.name)
    private readonly model: Model<ProductTypeDocument>,
  ) {}

  /**
   * Create a new product type
   */
  async create(data: Partial<ProductType>): Promise<ProductTypeDocument> {
    const created = new this.model(data);
    return created.save();
  }

  /**
   * Find product type by ID
   */
  async findById(id: string): Promise<ProductTypeDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find product type by code
   */
  async findByCode(code: string): Promise<ProductTypeDocument | null> {
    return this.model.findOne({ code }).exec();
  }

  /**
   * Find all product types with filters
   */
  async findAll(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: any = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<ProductTypeDocument[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    let query = this.model.find(filter);

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query.exec();
  }

  /**
   * Count product types with filters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async count(filter: any = {}): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Update product type by ID
   */
  async update(
    id: string,
    data: Partial<ProductType>,
  ): Promise<ProductTypeDocument | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
  }

  /**
   * Soft delete product type
   */
  async softDelete(id: string): Promise<ProductTypeDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date(), isActive: false },
        { new: true },
      )
      .exec();
  }

  /**
   * Hard delete product type (use with caution)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Check if code exists
   */
  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const query: any = { code };
    if (excludeId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      query._id = { $ne: excludeId };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const count = await this.model.countDocuments(query).exec();
    return count > 0;
  }

  /**
   * Get active product types
   */
  async findActive(): Promise<ProductTypeDocument[]> {
    return this.model.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  /**
   * Search product types by text
   */
  async search(
    searchTerm: string,
    options?: { skip?: number; limit?: number },
  ): Promise<ProductTypeDocument[]> {
    let query = this.model.find({
      $text: { $search: searchTerm },
    });

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query.exec();
  }
}
