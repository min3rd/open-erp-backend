import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserManagementService } from '../services/user-management.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto, UserResponseDto } from '../dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (global)' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.userManagementService.createUser(createUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List/search users' })
  @ApiResponse({ status: 200, description: 'Return list of users' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.userManagementService.listUsers(query);
    return {
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ 
    name: 'include', 
    required: false, 
    description: 'Include related data (memberships)',
    example: 'memberships',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return user details',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @Query('include') include?: string,
  ) {
    const includeMemberships = include === 'memberships';
    const user = await this.userManagementService.findUserById(id, includeMemberships);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile (global fields)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userManagementService.updateUser(id, updateUserDto);
    return {
      success: true,
      data: user,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/deactivate user (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    await this.userManagementService.deleteUser(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
