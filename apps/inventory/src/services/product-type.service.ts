import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ProductTypeRepository } from '../repositories/product-type.repository';
import {
  CreateProductTypeDto,
  UpdateProductTypeDto,
} from '../dto/product-type.dto';
import { ProductTypeDocument } from '@shared/schemas';
import { error } from '@shared/response';

@Injectable()
export class ProductTypeService {
  constructor(private readonly repository: ProductTypeRepository) {}

  /**
   * Create a new product type
   */
  async create(
    dto: CreateProductTypeDto,
    userId: string,
  ): Promise<ProductTypeDocument> {
    // Check if code already exists
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new HttpException(
        error(
          'PRODUCT_TYPE_CODE_EXISTS',
          `Product type with code "${dto.code}" already exists`,
        ),
        HttpStatus.CONFLICT,
      );
    }

    const data = {
      ...dto,
      createdBy: userId,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    };

    return this.repository.create(data);
  }

  /**
   * Get all product types with pagination and filters
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<{
    items: ProductTypeDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }

    let items: ProductTypeDocument[];
    let total: number;

    if (params.search) {
      items = await this.repository.search(params.search, { skip, limit });
      total = items.length; // For text search, we approximate
    } else {
      items = await this.repository.findAll(filter, {
        skip,
        limit,
        sort: { name: 1 },
      });
      total = await this.repository.count(filter);
    }

    return { items, total, page, limit };
  }

  /**
   * Get product type by ID
   */
  async findById(id: string): Promise<ProductTypeDocument> {
    const productType = await this.repository.findById(id);
    if (!productType) {
      throw new HttpException(
        error('PRODUCT_TYPE_NOT_FOUND', 'Product type not found'),
        HttpStatus.NOT_FOUND,
      );
    }
    return productType;
  }

  /**
   * Get product type by code
   */
  async findByCode(code: string): Promise<ProductTypeDocument> {
    const productType = await this.repository.findByCode(code);
    if (!productType) {
      throw new HttpException(
        error('PRODUCT_TYPE_NOT_FOUND', 'Product type not found'),
        HttpStatus.NOT_FOUND,
      );
    }
    return productType;
  }

  /**
   * Get all active product types
   */
  async findActive(): Promise<ProductTypeDocument[]> {
    return this.repository.findActive();
  }

  /**
   * Update product type
   */
  async update(
    id: string,
    dto: UpdateProductTypeDto,
    userId: string,
  ): Promise<ProductTypeDocument> {
    // Check if exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new HttpException(
        error('PRODUCT_TYPE_NOT_FOUND', 'Product type not found'),
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if code is being changed and if new code already exists
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.repository.existsByCode(dto.code, id);
      if (codeExists) {
        throw new HttpException(
          error(
            'PRODUCT_TYPE_CODE_EXISTS',
            `Product type with code "${dto.code}" already exists`,
          ),
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.repository.update(id, {
      ...dto,
      updatedBy: userId,
    });

    if (!updated) {
      throw new HttpException(
        error('PRODUCT_TYPE_UPDATE_FAILED', 'Failed to update product type'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return updated;
  }

  /**
   * Soft delete product type
   */
  async delete(id: string): Promise<ProductTypeDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new HttpException(
        error('PRODUCT_TYPE_NOT_FOUND', 'Product type not found'),
        HttpStatus.NOT_FOUND,
      );
    }

    // TODO: Check if product type is used by any products
    // This should prevent deletion if products are using this type

    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new HttpException(
        error('PRODUCT_TYPE_DELETE_FAILED', 'Failed to delete product type'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return deleted;
  }

  /**
   * Validate if product type exists and is active
   */
  async validateProductType(typeId: string): Promise<boolean> {
    const productType = await this.repository.findById(typeId);
    return !!productType && productType.isActive;
  }
}
