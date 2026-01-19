import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WarehouseService } from '../services/warehouse.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  QueryWarehouseDto,
} from '../dto/warehouse.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';
import {
  created,
  fetched,
  updated,
  deleted,
  ok,
  paginated,
} from '@shared/response';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Warehouse created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Warehouse created successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'create' },
            item: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Warehouse code already exists',
  })
  @Permissions('warehouse.create')
  async create(
    @Body() createDto: CreateWarehouseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const warehouse = await this.warehouseService.create(
      createDto,
      req.user.userId,
    );
    return created(warehouse, 'Warehouse created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Warehouses retrieved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'list' },
            items: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 50 },
                totalPages: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @Permissions('warehouse.read')
  async findAll(@Query() query: QueryWarehouseDto) {
    const { items, total, page, limit } =
      await this.warehouseService.findAll(query);
    return paginated(items, page, limit, total, {
      query: {
        filters: {
          type: query.type,
          status: query.status,
          provinceCode: query.provinceCode,
          wardCode: query.wardCode,
          region: query.region,
          tenantId: query.tenantId,
          bbox: query.bbox,
        },
        q: query.search,
      },
    });
  }

  @Get('provinces')
  @ApiOperation({ summary: 'Get all provinces' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provinces retrieved successfully',
  })
  @Permissions('warehouse.read')
  async getProvinces() {
    const provinces = await this.warehouseService.getProvinces();
    return ok(provinces, 'Provinces retrieved successfully');
  }

  @Get('provinces/:provinceCode/wards')
  @ApiOperation({ summary: 'Get wards by province code' })
  @ApiParam({
    name: 'provinceCode',
    description: 'Province code',
    example: '01',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wards retrieved successfully',
  })
  @Permissions('warehouse.read')
  async getWardsByProvince(@Param('provinceCode') provinceCode: string) {
    const wards = await this.warehouseService.getWardsByProvince(provinceCode);
    return ok(wards, 'Wards retrieved successfully');
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find warehouses nearby a location' })
  @ApiQuery({ name: 'longitude', description: 'Longitude', example: 105.8342 })
  @ApiQuery({ name: 'latitude', description: 'Latitude', example: 21.0285 })
  @ApiQuery({
    name: 'radiusKm',
    description: 'Radius in kilometers',
    example: 10,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum results',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nearby warehouses retrieved successfully',
  })
  @Permissions('warehouse.read')
  async findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radiusKm') radiusKm: number,
    @Query('limit') limit?: number,
  ) {
    const warehouses = await this.warehouseService.findNearby(
      Number(longitude),
      Number(latitude),
      Number(radiusKm),
      limit ? Number(limit) : 10,
    );
    return ok(warehouses, 'Nearby warehouses retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Warehouse retrieved successfully',
        },
        error: { type: 'null' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @Permissions('warehouse.read')
  async findById(@Param('id') id: string) {
    const warehouse = await this.warehouseService.findById(id);
    return fetched(warehouse, 'Warehouse retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Warehouse updated successfully' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Warehouse code already exists',
  })
  @Permissions(['warehouse.update', 'warehouse.manage'], {
    mode: 'any',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWarehouseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const warehouse = await this.warehouseService.update(
      id,
      updateDto,
      req.user.userId,
    );
    return updated(warehouse, 'Warehouse updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete warehouse (soft delete)' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Warehouse deleted successfully' },
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @Permissions(['warehouse.delete', 'warehouse.manage'], {
    mode: 'any',
  })
  async delete(@Param('id') id: string) {
    await this.warehouseService.delete(id);
    return deleted('Warehouse deleted successfully');
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore soft-deleted warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse restored successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @Permissions(['warehouse.update', 'warehouse.manage'], {
    mode: 'any',
  })
  async restore(@Param('id') id: string) {
    const warehouse = await this.warehouseService.restore(id);
    return ok(warehouse, 'Warehouse restored successfully');
  }
}
