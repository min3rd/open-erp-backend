import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductCategory, ProductCategoryDocument } from '@shared/schemas';

@Injectable()
export class ProductCategoryRepository {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly model: Model<ProductCategoryDocument>,
  ) {}

  /**
   * Create a new product category
   */
  async create(
    data: Partial<ProductCategory>,
  ): Promise<ProductCategoryDocument> {
    const created = new this.model(data);
    return created.save();
  }

  /**
   * Find product category by ID
   */
  async findById(id: string): Promise<ProductCategoryDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find product category by code
   */
  async findByCode(code: string): Promise<ProductCategoryDocument | null> {
    return this.model.findOne({ code }).exec();
  }

  /**
   * Find all product categories with filters
   */
  async findAll(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: any = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<ProductCategoryDocument[]> {
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
   * Count product categories with filters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async count(filter: any = {}): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Update product category by ID
   */
  async update(
    id: string,
    data: Partial<ProductCategory>,
  ): Promise<ProductCategoryDocument | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
  }

  /**
   * Soft delete product category
   */
  async softDelete(id: string): Promise<ProductCategoryDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date(), isActive: false },
        { new: true },
      )
      .exec();
  }

  /**
   * Hard delete product category (use with caution)
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
   * Get active product categories
   */
  async findActive(): Promise<ProductCategoryDocument[]> {
    return this.model.find({ isActive: true }).sort({ order: 1 }).exec();
  }

  /**
   * Get root categories (no parent)
   */
  async findRoots(): Promise<ProductCategoryDocument[]> {
    return this.model
      .find({ parentId: null, isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  /**
   * Get children of a category
   */
  async findChildren(parentId: string): Promise<ProductCategoryDocument[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.model.find({ parentId } as any).sort({ order: 1 }).exec();
  }

  /**
   * Get all descendants of a category using path
   */
  async findDescendants(path: string): Promise<ProductCategoryDocument[]> {
    // Escape regex special characters in path
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.model
      .find({ path: new RegExp(`^${escapedPath}`) })
      .sort({ path: 1, order: 1 })
      .exec();
  }

  /**
   * Get category tree structure
   */
  async getTree(): Promise<ProductCategoryDocument[]> {
    return this.model
      .find({ isActive: true })
      .sort({ path: 1, order: 1 })
      .exec();
  }

  /**
   * Search product categories by text
   */
  async search(
    searchTerm: string,
    options?: { skip?: number; limit?: number },
  ): Promise<ProductCategoryDocument[]> {
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

  /**
   * Check if category has children
   */
  async hasChildren(id: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await this.model.countDocuments({ parentId: id } as any).exec();
    return count > 0;
  }

  /**
   * Update children paths when parent path changes
   */
  async updateChildrenPaths(oldPath: string, newPath: string): Promise<void> {
    // Escape regex special characters in oldPath
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const children = await this.model.find({
      path: new RegExp(`^${escapedOldPath}`),
    });

    for (const child of children) {
      // Only replace at the beginning of the path
      const updatedPath = child.path.startsWith(oldPath)
        ? newPath + child.path.slice(oldPath.length)
        : child.path;
      await this.model
        .findByIdAndUpdate(child._id, { path: updatedPath })
        .exec();
    }
  }
}
