import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVersionRepository } from '../repositories/product-version.repository';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { ProductScope } from '@shared/constants';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly versionRepository: ProductVersionRepository,
  ) {}

  async create(createDto: CreateProductDto) {
    // Validate scope and organizationId
    if (createDto.scope === ProductScope.ORGANIZATION && !createDto.organizationId) {
      throw new BadRequestException('Organization ID is required for organization-scoped products');
    }

    // Check if SKU already exists
    const existing = await this.productRepository.findBySku(
      createDto.sku,
      createDto.organizationId,
    );

    if (existing) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Create product with initial version
    const productData: any = {
      ...createDto,
      currentVersion: 1,
      versionCreatedAt: new Date(),
      organizationId: createDto.organizationId
        ? new Types.ObjectId(createDto.organizationId)
        : undefined,
      createdBy: new Types.ObjectId(createDto.createdBy),
    };

    const product = await this.productRepository.create(productData);

    // Create initial version snapshot
    await this.createVersionSnapshot(
      product._id.toString(),
      1,
      product.toObject(),
      createDto.createdBy,
      'Initial version',
    );

    return product;
  }

  async findById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findBySku(sku: string, organizationId?: string) {
    const product = await this.productRepository.findBySku(sku, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findAll(
    filter: {
      scope?: ProductScope;
      type?: string;
      status?: string;
      organizationId?: string;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ) {
    const { page = 1, limit = 10, sort } = options;
    const skip = (page - 1) * limit;

    // Build filter query
    const query: any = {};
    if (filter.scope) query.scope = filter.scope;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.organizationId) {
      query.organizationId = new Types.ObjectId(filter.organizationId);
    }

    const result = await this.productRepository.findAll(query, {
      skip,
      limit,
      sort,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async update(id: string, updateDto: UpdateProductDto) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if there are actual changes
    const hasChanges = this.detectChanges(product.toObject(), updateDto);
    if (!hasChanges) {
      return product; // No changes, return existing product
    }

    // Increment version
    const newVersion = product.currentVersion + 1;

    // Update product
    const updateData: any = {
      ...updateDto,
      currentVersion: newVersion,
      versionCreatedAt: new Date(),
      updatedBy: new Types.ObjectId(updateDto.updatedBy),
    };

    const updatedProduct = await this.productRepository.update(id, updateData);

    if (!updatedProduct) {
      throw new NotFoundException('Product not found after update');
    }

    // Create version snapshot
    const changedFields = this.getChangedFields(product.toObject(), updateDto);
    await this.createVersionSnapshot(
      id,
      newVersion,
      updatedProduct.toObject(),
      updateDto.updatedBy,
      updateDto.changeReason || 'Product updated',
      changedFields,
    );

    return updatedProduct;
  }

  async softDelete(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.productRepository.softDelete(id);
  }

  async restore(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product.restore();
  }

  async search(
    searchText: string,
    filter: {
      scope?: ProductScope;
      organizationId?: string;
    } = {},
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // Build filter query
    const query: any = {};
    if (filter.scope) query.scope = filter.scope;
    if (filter.organizationId) {
      query.organizationId = new Types.ObjectId(filter.organizationId);
    }

    const result = await this.productRepository.search(searchText, query, {
      skip,
      limit,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getVersionHistory(
    productId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const result = await this.versionRepository.findByProductId(productId, {
      skip,
      limit,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getVersion(productId: string, version: number) {
    const versionDoc = await this.versionRepository.findByVersion(productId, version);
    if (!versionDoc) {
      throw new NotFoundException('Product version not found');
    }
    return versionDoc;
  }

  async rollbackToVersion(productId: string, version: number, userId: string) {
    const versionDoc = await this.versionRepository.findByVersion(productId, version);
    if (!versionDoc) {
      throw new NotFoundException('Product version not found');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Restore data from version snapshot (excluding system fields)
    const { _id, createdAt, updatedAt, deletedAt, createdBy, ...versionData } = versionDoc.data;

    // Create new version for rollback
    const newVersion = product.currentVersion + 1;
    const updateData = {
      ...versionData,
      currentVersion: newVersion,
      versionCreatedAt: new Date(),
      updatedBy: new Types.ObjectId(userId),
    };

    const updatedProduct = await this.productRepository.update(productId, updateData);

    if (!updatedProduct) {
      throw new NotFoundException('Product not found after rollback');
    }

    // Create version snapshot for rollback
    await this.createVersionSnapshot(
      productId,
      newVersion,
      updatedProduct.toObject(),
      userId,
      `Rolled back to version ${version}`,
    );

    return updatedProduct;
  }

  // Helper methods

  private async createVersionSnapshot(
    productId: string,
    version: number,
    data: any,
    userId: string,
    changeReason?: string,
    changedFields?: string[],
  ) {
    const versionData: any = {
      productId: new Types.ObjectId(productId),
      version,
      versionDate: new Date(),
      data,
      changeReason,
      changedFields: changedFields || [],
      createdBy: new Types.ObjectId(userId),
    };

    return this.versionRepository.create(versionData);
  }

  private detectChanges(original: any, update: any): boolean {
    const updateKeys = Object.keys(update).filter(
      (key) => !['updatedBy', 'changeReason'].includes(key),
    );
    return updateKeys.some((key) => {
      const originalValue = JSON.stringify(original[key]);
      const updateValue = JSON.stringify(update[key]);
      return originalValue !== updateValue;
    });
  }

  private getChangedFields(original: any, update: any): string[] {
    const changed: string[] = [];
    Object.keys(update).forEach((key) => {
      if (!['updatedBy', 'changeReason'].includes(key)) {
        const originalValue = JSON.stringify(original[key]);
        const updateValue = JSON.stringify(update[key]);
        if (originalValue !== updateValue) {
          changed.push(key);
        }
      }
    });
    return changed;
  }
}
