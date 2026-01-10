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
import { WardService } from '../services/ward.service';
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

@ApiTags('wards')
@Controller('wards')
export class WardController {
  constructor(private readonly wardService: WardService) {}

  @Get()
  @ApiOperation({ 
    summary: 'List all wards',
    description: 'Get paginated list of wards with optional filters'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'provinceCode', required: false, type: String })
  @ApiQuery({ name: 'districtCode', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'version', required: false, type: String })
  @ApiQuery({ name: 'isLegacy', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Wards retrieved successfully',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('provinceCode') provinceCode?: string,
    @Query('districtCode') districtCode?: string,
    @Query('q') q?: string,
    @Query('version') version?: string,
    @Query('isLegacy') isLegacy?: boolean,
  ) {
    try {
      const { items, total } = await this.wardService.findAll({
        page,
        limit,
        provinceCode,
        districtCode,
        q,
        version,
        isLegacy,
      });

      return paginated(items, page, limit, total, {
        query: { q, filters: { provinceCode, districtCode, version, isLegacy } },
        sort: { by: 'sortOrder', order: 'asc' },
      });
    } catch (err) {
      throw new HttpException(
        error('WARDS_FETCH_ERROR', err.message || 'Failed to fetch wards'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':code')
  @ApiOperation({ 
    summary: 'Get ward by code',
    description: 'Retrieve a single ward by its code'
  })
  @ApiParam({ name: 'code', example: '00001', description: 'Ward code' })
  @ApiResponse({
    status: 200,
    description: 'Ward retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Ward not found' })
  async findOne(@Param('code') code: string) {
    try {
      const ward = await this.wardService.findByCode(code);
      return fetched(ward);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('WARD_FETCH_ERROR', err.message || 'Failed to fetch ward'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new ward (Admin only)',
    description: 'Create a new ward in the system'
  })
  @ApiResponse({
    status: 201,
    description: 'Ward created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(@Body() createDto: any) {
    try {
      const ward = await this.wardService.create(createDto);
      return created(ward, 'Ward created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('WARD_CREATE_ERROR', err.message || 'Failed to create ward'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update ward by code (Admin only)',
    description: 'Update an existing ward'
  })
  @ApiParam({ name: 'code', example: '00001', description: 'Ward code' })
  @ApiResponse({
    status: 200,
    description: 'Ward updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Ward not found' })
  async update(@Param('code') code: string, @Body() updateDto: any) {
    try {
      const ward = await this.wardService.update(code, updateDto);
      return updated(ward, 'Ward updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('WARD_UPDATE_ERROR', err.message || 'Failed to update ward'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete ward by code (Admin only)',
    description: 'Delete a ward from the system'
  })
  @ApiParam({ name: 'code', example: '00001', description: 'Ward code' })
  @ApiResponse({
    status: 200,
    description: 'Ward deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Ward not found' })
  async delete(@Param('code') code: string) {
    try {
      await this.wardService.delete(code);
      return deleted('Ward deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('WARD_DELETE_ERROR', err.message || 'Failed to delete ward'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
