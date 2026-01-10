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
import { AddressService } from '../services/address.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';
import {
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
} from '@shared/response';
import { JwtAuthGuard } from '@shared/authz';
import { AddressScope } from '@shared/schemas';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({
    summary: 'List addresses',
    description: 'Get paginated list of addresses with scope filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'scope', required: false, enum: AddressScope })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
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
            limit: { type: 'number', example: 20 },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('scope') scope?: AddressScope,
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    try {
      const { items, total } = await this.addressService.findAll({
        page,
        limit,
        scope,
        userId,
        organizationId,
      });

      return paginated(items, page, limit, total, {
        query: { filters: { scope, userId, organizationId } },
        sort: { by: 'createdAt', order: 'desc' },
      });
    } catch (err) {
      throw new HttpException(
        error(
          'ADDRESSES_FETCH_ERROR',
          err.message || 'Failed to fetch addresses',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get address by ID',
    description: 'Retrieve a single address by its ID',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address retrieved successfully',
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(@Param('id') id: string) {
    try {
      const address = await this.addressService.findById(id);
      return fetched(address);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error('ADDRESS_FETCH_ERROR', err.message || 'Failed to fetch address'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new address',
    description: 'Create a new address with validation against master data',
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Address created successfully' },
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
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createDto: CreateAddressDto) {
    try {
      const address = await this.addressService.create(createDto);
      return created(address, 'Address created successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'ADDRESS_CREATE_ERROR',
          err.message || 'Failed to create address',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update address by ID',
    description: 'Update an existing address',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Address updated successfully' },
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
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateAddressDto) {
    try {
      const address = await this.addressService.update(id, updateDto);
      return updated(address, 'Address updated successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'ADDRESS_UPDATE_ERROR',
          err.message || 'Failed to update address',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete address by ID (soft delete)',
    description: 'Soft delete an address from the system',
  })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Address deleted successfully' },
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async delete(@Param('id') id: string) {
    try {
      await this.addressService.delete(id);
      return deleted('Address deleted successfully');
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        error(
          'ADDRESS_DELETE_ERROR',
          err.message || 'Failed to delete address',
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
