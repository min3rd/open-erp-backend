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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProvinceService } from '../services/province.service';
import { DistrictService } from '../services/district.service';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
  ok,
} from '@shared/response';
import { JwtAuthGuard, RolesGuard } from '@shared/authz';
import { Roles } from '@shared/authz/decorators';

@ApiTags('provinces')
@Controller('provinces')
export class ProvinceController {
  constructor(
    private readonly provinceService: ProvinceService,
    private readonly districtService: DistrictService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'List all provinces',
    description: 'Get paginated list of provinces with optional filters'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'region', required: false, type: String, example: 'northern' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'version', required: false, type: String, example: '2.0' })
  @ApiQuery({ name: 'isLegacy', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Provinces retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'null' },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 100 },
            total: { type: 'number', example: 63 },
            totalPages: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('region') region?: string,
    @Query('q') q?: string,
    @Query('version') version?: string,
    @Query('isLegacy') isLegacy?: boolean,
  ) {
    try {
      const { items, total } = await this.provinceService.findAll({
        page,
        limit,
        region,
        q,
        version,
        isLegacy,
      });

      return paginated(items, page, limit, total, {
        query: { q, filters: { region, version, isLegacy } },
        sort: { by: 'sortOrder', order: 'asc' },
      });
    } catch (err) {
      throw new HttpException(
        error('PROVINCES_FETCH_ERROR', err.message || 'Failed to fetch provinces'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':code')
  @ApiOperation({ 
    summary: 'Get province by code',
    description: 'Retrieve a single province by its code'
  })
  @ApiParam({ name: 'code', example: 'P01', description: 'Province code' })
  @ApiResponse({
    status: 200,
    description: 'Province retrieved successfully',
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
            item: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Province not found' })
  async findOne(@Param('code') code: string) {
    try {
      const province = await this.provinceService.findByCode(code);
      return fetched(province);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PROVINCE_FETCH_ERROR', err.message || 'Failed to fetch province'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':code/districts')
  @ApiOperation({ 
    summary: 'Get districts by province code',
    description: 'Retrieve all districts belonging to a province'
  })
  @ApiParam({ name: 'code', example: 'P01', description: 'Province code' })
  @ApiResponse({
    status: 200,
    description: 'Districts retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Province not found' })
  async getDistricts(@Param('code') code: string) {
    try {
      // First verify province exists
      await this.provinceService.findByCode(code);
      
      const districts = await this.districtService.findByProvinceCode(code);
      return ok(districts);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('DISTRICTS_FETCH_ERROR', err.message || 'Failed to fetch districts'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new province (Admin only)',
    description: 'Create a new province in the system'
  })
  @ApiResponse({
    status: 201,
    description: 'Province created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Province created successfully' },
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(@Body() createDto: any) {
    try {
      const province = await this.provinceService.create(createDto);
      return created(province, 'Province created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PROVINCE_CREATE_ERROR', err.message || 'Failed to create province'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update province by code (Admin only)',
    description: 'Update an existing province'
  })
  @ApiParam({ name: 'code', example: 'P01', description: 'Province code' })
  @ApiResponse({
    status: 200,
    description: 'Province updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Province not found' })
  async update(@Param('code') code: string, @Body() updateDto: any) {
    try {
      const province = await this.provinceService.update(code, updateDto);
      return updated(province, 'Province updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PROVINCE_UPDATE_ERROR', err.message || 'Failed to update province'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete province by code (Admin only)',
    description: 'Delete a province from the system'
  })
  @ApiParam({ name: 'code', example: 'P01', description: 'Province code' })
  @ApiResponse({
    status: 200,
    description: 'Province deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Province not found' })
  async delete(@Param('code') code: string) {
    try {
      await this.provinceService.delete(code);
      return deleted('Province deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('PROVINCE_DELETE_ERROR', err.message || 'Failed to delete province'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
