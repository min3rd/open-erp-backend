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
import { DistrictService } from '../services/district.service';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
} from '@shared/response';
import { JwtAuthGuard, RolesGuard } from '@shared/authz';
import { Roles } from '@shared/authz/decorators';

@ApiTags('districts')
@Controller('districts')
export class DistrictController {
  constructor(private readonly districtService: DistrictService) {}

  @Get()
  @ApiOperation({ 
    summary: 'List all districts',
    description: 'Get paginated list of districts with optional filters'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'provinceCode', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'version', required: false, type: String })
  @ApiQuery({ name: 'isLegacy', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Districts retrieved successfully',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('provinceCode') provinceCode?: string,
    @Query('q') q?: string,
    @Query('version') version?: string,
    @Query('isLegacy') isLegacy?: boolean,
  ) {
    try {
      const { items, total } = await this.districtService.findAll({
        page,
        limit,
        provinceCode,
        q,
        version,
        isLegacy,
      });

      return paginated(items, page, limit, total, {
        query: { q, filters: { provinceCode, version, isLegacy } },
        sort: { by: 'sortOrder', order: 'asc' },
      });
    } catch (err) {
      throw new HttpException(
        error('DISTRICTS_FETCH_ERROR', err.message || 'Failed to fetch districts'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':code')
  @ApiOperation({ 
    summary: 'Get district by code',
    description: 'Retrieve a single district by its code'
  })
  @ApiParam({ name: 'code', example: 'D001', description: 'District code' })
  @ApiResponse({
    status: 200,
    description: 'District retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'District not found' })
  async findOne(@Param('code') code: string) {
    try {
      const district = await this.districtService.findByCode(code);
      return fetched(district);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('DISTRICT_FETCH_ERROR', err.message || 'Failed to fetch district'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new district (Admin only)',
    description: 'Create a new district in the system'
  })
  @ApiResponse({
    status: 201,
    description: 'District created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(@Body() createDto: any) {
    try {
      const district = await this.districtService.create(createDto);
      return created(district, 'District created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('DISTRICT_CREATE_ERROR', err.message || 'Failed to create district'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update district by code (Admin only)',
    description: 'Update an existing district'
  })
  @ApiParam({ name: 'code', example: 'D001', description: 'District code' })
  @ApiResponse({
    status: 200,
    description: 'District updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'District not found' })
  async update(@Param('code') code: string, @Body() updateDto: any) {
    try {
      const district = await this.districtService.update(code, updateDto);
      return updated(district, 'District updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('DISTRICT_UPDATE_ERROR', err.message || 'Failed to update district'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN', 'SYSTEM_ADMIN'])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete district by code (Admin only)',
    description: 'Delete a district from the system'
  })
  @ApiParam({ name: 'code', example: 'D001', description: 'District code' })
  @ApiResponse({
    status: 200,
    description: 'District deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'District not found' })
  async delete(@Param('code') code: string) {
    try {
      await this.districtService.delete(code);
      return deleted('District deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('DISTRICT_DELETE_ERROR', err.message || 'Failed to delete district'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
