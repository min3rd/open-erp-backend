import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
} from '@shared/response';
import { ProductScope, ProductType, ProductStatus } from '@shared/constants';

@ApiTags('products')
@Controller('products')
// @UseGuards(AuthGuard) // TODO: Implement auth guard
// @ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Product created successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'create' },
            item: {
              type: 'object',
              description: 'Product object',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - SKU already exists' })
  async create(@Body() createDto: CreateProductDto) {
    try {
      const product = await this.productService.create(createDto);
      return created(product, 'Product created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CREATE_ERROR',
          err.message || 'Failed to create product',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'scope', required: false, enum: ProductScope })
  @ApiQuery({ name: 'type', required: false, enum: ProductType })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Full-text search',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'null' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'object' } },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('scope') scope?: ProductScope,
    @Query('type') type?: ProductType,
    @Query('status') status?: ProductStatus,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
  ) {
    try {
      if (search) {
        const result = await this.productService.search(
          search,
          { scope, organizationId },
          { page, limit },
        );
        return paginated(
          result.items,
          result.page,
          result.limit,
          result.total,
          { query: { q: search } },
        );
      }

      const result = await this.productService.findAll(
        { scope, type, status, organizationId },
        { page, limit },
      );

      return paginated(result.items, result.page, result.limit, result.total);
    } catch (err) {
      throw new HttpException(
        error('PRODUCT_FETCH_ERROR', err.message || 'Failed to fetch products'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'null' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'get' },
            item: { type: 'object', description: 'Product object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(@Param('id') id: string) {
    try {
      const product = await this.productService.findById(id);
      return fetched(product);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PRODUCT_FETCH_ERROR', err.message || 'Failed to fetch product'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get a product by SKU' })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySku(
    @Param('sku') sku: string,
    @Query('organizationId') organizationId?: string,
  ) {
    try {
      const product = await this.productService.findBySku(sku, organizationId);
      return fetched(product);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PRODUCT_FETCH_ERROR', err.message || 'Failed to fetch product'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Product updated successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: { type: 'object', description: 'Updated product object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    try {
      const product = await this.productService.update(id, updateDto);
      return updated(product, 'Product updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_UPDATE_ERROR',
          err.message || 'Failed to update product',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Product deleted successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'delete' },
            item: { type: 'null' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async softDelete(@Param('id') id: string) {
    try {
      await this.productService.softDelete(id);
      return deleted('Product deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_DELETE_ERROR',
          err.message || 'Failed to delete product',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product restored successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async restore(@Param('id') id: string) {
    try {
      const product = await this.productService.restore(id);
      return updated(product, 'Product restored successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_RESTORE_ERROR',
          err.message || 'Failed to restore product',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history of a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Version history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getVersionHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.productService.getVersionHistory(id, {
        page,
        limit,
      });
      return paginated(result.items, result.page, result.limit, result.total);
    } catch (err) {
      throw new HttpException(
        error(
          'VERSION_FETCH_ERROR',
          err.message || 'Failed to fetch version history',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get a specific version of a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'version', description: 'Version number', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersion(@Param('id') id: string, @Param('version') version: number) {
    try {
      const versionDoc = await this.productService.getVersion(id, version);
      return fetched(versionDoc);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('VERSION_FETCH_ERROR', err.message || 'Failed to fetch version'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/rollback/:version')
  @ApiOperation({ summary: 'Rollback product to a specific version' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({
    name: 'version',
    description: 'Version number to rollback to',
    type: Number,
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'User ID performing the rollback',
  })
  @ApiResponse({
    status: 200,
    description: 'Product rolled back successfully',
  })
  @ApiResponse({ status: 404, description: 'Product or version not found' })
  async rollbackToVersion(
    @Param('id') id: string,
    @Param('version') version: number,
    @Query('userId') userId: string,
  ) {
    try {
      const product = await this.productService.rollbackToVersion(
        id,
        version,
        userId,
      );
      return updated(product, `Product rolled back to version ${version}`);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('ROLLBACK_ERROR', err.message || 'Failed to rollback product'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
