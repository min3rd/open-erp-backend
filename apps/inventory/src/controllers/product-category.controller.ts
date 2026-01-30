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
import { ProductCategoryService } from '../services/product-category.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '../dto/product-category.dto';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
} from '@shared/response';

@ApiTags('product-categories')
@Controller('config/product-categories')
// @UseGuards(AuthGuard, PermissionsGuard) // TODO: Implement auth guard
// @ApiBearerAuth()
export class ProductCategoryController {
  constructor(private readonly categoryService: ProductCategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new product category',
    description: 'Requires MANAGE_PRODUCT_CATEGORY permission',
  })
  @ApiResponse({
    status: 201,
    description: 'Product category created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Product category created successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'create' },
            item: {
              type: 'object',
              description: 'Product category object',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - code already exists' })
  async create(@Body() createDto: CreateProductCategoryDto) {
    try {
      // TODO: Get userId from authenticated user
      const userId = '000000000000000000000000'; // Placeholder
      const category = await this.categoryService.create(createDto, userId);
      return created(category, 'Product category created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_CREATE_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to create product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all product categories with filters',
    description:
      'Requires PRODUCT_CATEGORY_READ permission. Supports tree view filtering.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent ID. Use "null" for root categories.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Product categories retrieved successfully',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.categoryService.findAll({
        page,
        limit,
        isActive,
        parentId,
        search,
      });

      return paginated(result.items, result.page, result.limit, result.total);
    } catch (err) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to fetch product categories',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Get category tree structure',
    description: 'Returns all active categories in tree structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
  })
  async getTree() {
    try {
      const tree = await this.categoryService.getTree();
      return fetched(tree);
    } catch (err) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error ? err.message : 'Failed to fetch category tree',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('roots')
  @ApiOperation({
    summary: 'Get root categories',
    description: 'Returns only root-level categories (no parent)',
  })
  @ApiResponse({
    status: 200,
    description: 'Root categories retrieved successfully',
  })
  async getRoots() {
    try {
      const roots = await this.categoryService.getRoots();
      return fetched(roots);
    } catch (err) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to fetch root categories',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product category by ID',
    description: 'Requires PRODUCT_CATEGORY_READ permission',
  })
  @ApiParam({ name: 'id', description: 'Product category ID' })
  @ApiResponse({
    status: 200,
    description: 'Product category retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  async findById(@Param('id') id: string) {
    try {
      const category = await this.categoryService.findById(id);
      return fetched(category);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to fetch product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/children')
  @ApiOperation({
    summary: 'Get children of a category',
    description: 'Returns direct children of the specified category',
  })
  @ApiParam({ name: 'id', description: 'Parent category ID' })
  @ApiResponse({
    status: 200,
    description: 'Children categories retrieved successfully',
  })
  async getChildren(@Param('id') id: string) {
    try {
      const children = await this.categoryService.getChildren(id);
      return fetched(children);
    } catch (err) {
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to fetch children categories',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/descendants')
  @ApiOperation({
    summary: 'Get all descendants of a category',
    description:
      'Returns all descendants (recursive) of the specified category',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Descendant categories retrieved successfully',
  })
  async getDescendants(@Param('id') id: string) {
    try {
      const descendants = await this.categoryService.getDescendants(id);
      return fetched(descendants);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_FETCH_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to fetch descendant categories',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update product category',
    description: 'Requires MANAGE_PRODUCT_CATEGORY permission',
  })
  @ApiParam({ name: 'id', description: 'Product category ID' })
  @ApiResponse({
    status: 200,
    description: 'Product category updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  @ApiResponse({ status: 409, description: 'Conflict - code already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductCategoryDto,
  ) {
    try {
      // TODO: Get userId from authenticated user
      const userId = '000000000000000000000000'; // Placeholder
      const category = await this.categoryService.update(id, updateDto, userId);
      return updated(category, 'Product category updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_UPDATE_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to update product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete product category (soft delete)',
    description: 'Requires MANAGE_PRODUCT_CATEGORY permission',
  })
  @ApiParam({ name: 'id', description: 'Product category ID' })
  @ApiResponse({
    status: 200,
    description: 'Product category deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - category has children',
  })
  async delete(@Param('id') id: string) {
    try {
      await this.categoryService.delete(id);
      return deleted('Product category deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'PRODUCT_CATEGORY_DELETE_ERROR',
          err instanceof Error
            ? err.message
            : 'Failed to delete product category',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
