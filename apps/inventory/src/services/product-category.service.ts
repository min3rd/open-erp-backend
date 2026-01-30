import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '../dto/product-category.dto';
import { ProductCategoryDocument } from '@shared/schemas';
import { error } from '@shared/response';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly repository: ProductCategoryRepository) {}

  /**
   * Create a new product category
   */
  async create(
    dto: CreateProductCategoryDto,
    userId: string,
  ): Promise<ProductCategoryDocument> {
    // Check if code already exists
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_CODE_EXISTS',
          `Product category with code "${dto.code}" already exists`,
        ),
        HttpStatus.CONFLICT,
      );
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.repository.findById(dto.parentId);
      if (!parent) {
        throw new HttpException(
          error('PARENT_CATEGORY_NOT_FOUND', 'Parent category not found'),
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data = {
      ...dto,
      createdBy: userId,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      order: dto.order !== undefined ? dto.order : 0,
    };

    return this.repository.create(data);
  }

  /**
   * Get all product categories with pagination and filters
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    parentId?: string;
    search?: string;
  }): Promise<{
    items: ProductCategoryDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 100;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }
    if (params.parentId !== undefined) {
      // null for root categories, specific ID for children
      filter.parentId = params.parentId === 'null' ? null : params.parentId;
    }

    let items: ProductCategoryDocument[];
    let total: number;

    if (params.search) {
      items = await this.repository.search(params.search, { skip, limit });
      total = items.length;
    } else {
      items = await this.repository.findAll(filter, {
        skip,
        limit,
        sort: { path: 1, order: 1 },
      });
      total = await this.repository.count(filter);
    }

    return { items, total, page, limit };
  }

  /**
   * Get product category by ID
   */
  async findById(id: string): Promise<ProductCategoryDocument> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new HttpException(
        error('PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found'),
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }

  /**
   * Get product category by code
   */
  async findByCode(code: string): Promise<ProductCategoryDocument> {
    const category = await this.repository.findByCode(code);
    if (!category) {
      throw new HttpException(
        error('PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found'),
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }

  /**
   * Get category tree structure
   */
  async getTree(): Promise<ProductCategoryDocument[]> {
    return this.repository.getTree();
  }

  /**
   * Get root categories
   */
  async getRoots(): Promise<ProductCategoryDocument[]> {
    return this.repository.findRoots();
  }

  /**
   * Get children of a category
   */
  async getChildren(parentId: string): Promise<ProductCategoryDocument[]> {
    return this.repository.findChildren(parentId);
  }

  /**
   * Get all descendants of a category
   */
  async getDescendants(id: string): Promise<ProductCategoryDocument[]> {
    const category = await this.findById(id);
    return this.repository.findDescendants(category.path);
  }

  /**
   * Update product category
   */
  async update(
    id: string,
    dto: UpdateProductCategoryDto,
    userId: string,
  ): Promise<ProductCategoryDocument> {
    // Check if exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new HttpException(
        error('PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found'),
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if code is being changed and if new code already exists
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.repository.existsByCode(dto.code, id);
      if (codeExists) {
        throw new HttpException(
          error(
            'PRODUCT_CATEGORY_CODE_EXISTS',
            `Product category with code "${dto.code}" already exists`,
          ),
          HttpStatus.CONFLICT,
        );
      }
    }

    // Validate parent if being changed
    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId) {
        // Check parent exists
        const parent = await this.repository.findById(dto.parentId);
        if (!parent) {
          throw new HttpException(
            error('PARENT_CATEGORY_NOT_FOUND', 'Parent category not found'),
            HttpStatus.BAD_REQUEST,
          );
        }

        // Check for circular reference
        if (dto.parentId === id) {
          throw new HttpException(
            error('CIRCULAR_REFERENCE', 'Category cannot be its own parent'),
            HttpStatus.BAD_REQUEST,
          );
        }

        // Check if new parent is a descendant of current category
        const descendants = await this.getDescendants(id);
        const isDescendant = descendants.some(
          (d) => d._id.toString() === dto.parentId,
        );
        if (isDescendant) {
          throw new HttpException(
            error(
              'CIRCULAR_REFERENCE',
              'Cannot move category to one of its descendants',
            ),
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    const oldPath = existing.path;
    const updated = await this.repository.update(id, {
      ...dto,
      updatedBy: userId,
    });

    if (!updated) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_UPDATE_FAILED',
          'Failed to update product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // If parent changed, update paths of all descendants
    if (dto.parentId !== undefined && updated.path !== oldPath) {
      await this.repository.updateChildrenPaths(oldPath, updated.path);
    }

    return updated;
  }

  /**
   * Soft delete product category
   */
  async delete(id: string): Promise<ProductCategoryDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new HttpException(
        error('PRODUCT_CATEGORY_NOT_FOUND', 'Product category not found'),
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if category has children
    const hasChildren = await this.repository.hasChildren(id);
    if (hasChildren) {
      throw new HttpException(
        error(
          'CATEGORY_HAS_CHILDREN',
          'Cannot delete category that has children',
        ),
        HttpStatus.BAD_REQUEST,
      );
    }

    // TODO: Check if category is used by any products
    // This should prevent deletion if products are using this category

    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_DELETE_FAILED',
          'Failed to delete product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return deleted;
  }

  /**
   * Validate if product category exists and is active
   */
  async validateProductCategory(categoryId: string): Promise<boolean> {
    const category = await this.repository.findById(categoryId);
    return !!category && category.isActive;
  }
}
