import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductTypeService } from '../services/product-type.service';
import {
  CreateProductTypeDto,
  UpdateProductTypeDto,
} from '../dto/product-type.dto';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
} from '@shared/response';

@ApiTags('product-types')
@Controller('config/product-types')
// @UseGuards(AuthGuard, PermissionsGuard) // TODO: Implement auth guard
// @ApiBearerAuth()
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new product type',
    description: 'Requires MANAGE_PRODUCT_TYPE permission',
  })
  @ApiResponse({
    status: 201,
    description: 'Product type created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Product type created successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'create' },
            item: {
              type: 'object',
              description: 'Product type object',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - code already exists' })
  async create(@Body() createDto: CreateProductTypeDto) {
    try {
      // TODO: Get userId from authenticated user
      const userId = '000000000000000000000000'; // Placeholder
      const productType = await this.productTypeService.create(
        createDto,
        userId,
      );
      return created(productType, 'Product type created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create product type';
      throw new HttpException(
        error('PRODUCT_TYPE_CREATE_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all product types with filters',
    description: 'Requires PRODUCT_TYPE_READ permission',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Product types retrieved successfully',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.productTypeService.findAll({
        page,
        limit,
        isActive,
        search,
      });

      return paginated(result.items, result.page, result.limit, result.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch product types';
      throw new HttpException(
        error('PRODUCT_TYPE_FETCH_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get all active product types',
    description: 'Returns only active product types for dropdown/selection',
  })
  @ApiResponse({
    status: 200,
    description: 'Active product types retrieved successfully',
  })
  async findActive() {
    try {
      const productTypes = await this.productTypeService.findActive();
      return fetched(productTypes);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch active product types';
      throw new HttpException(
        error('PRODUCT_TYPE_FETCH_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product type by ID',
    description: 'Requires PRODUCT_TYPE_READ permission',
  })
  @ApiParam({ name: 'id', description: 'Product type ID' })
  @ApiResponse({
    status: 200,
    description: 'Product type retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  async findById(@Param('id') id: string) {
    try {
      const productType = await this.productTypeService.findById(id);
      return fetched(productType);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch product type';
      throw new HttpException(
        error('PRODUCT_TYPE_FETCH_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update product type',
    description: 'Requires MANAGE_PRODUCT_TYPE permission',
  })
  @ApiParam({ name: 'id', description: 'Product type ID' })
  @ApiResponse({
    status: 200,
    description: 'Product type updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  @ApiResponse({ status: 409, description: 'Conflict - code already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductTypeDto,
  ) {
    try {
      // TODO: Get userId from authenticated user
      const userId = '000000000000000000000000'; // Placeholder
      const productType = await this.productTypeService.update(
        id,
        updateDto,
        userId,
      );
      return updated(productType, 'Product type updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update product type';
      throw new HttpException(
        error('PRODUCT_TYPE_UPDATE_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete product type (soft delete)',
    description: 'Requires MANAGE_PRODUCT_TYPE permission',
  })
  @ApiParam({ name: 'id', description: 'Product type ID' })
  @ApiResponse({
    status: 200,
    description: 'Product type deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Product type not found' })
  async delete(@Param('id') id: string) {
    try {
      await this.productTypeService.delete(id);
      return deleted('Product type deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete product type';
      throw new HttpException(
        error('PRODUCT_TYPE_DELETE_ERROR', errorMessage),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
