import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { TenantMemberRepository } from '../repositories/tenant-member.repository';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from '../dto/user.dto';
import { User } from '@shared/schemas';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantMemberRepository: TenantMemberRepository,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      if (dto.username) {
        const existingUsername = await this.userRepository.findByUsername(dto.username);
        if (existingUsername) {
          throw new BadRequestException('User with this username already exists');
        }
      }

      const createData: any = {
        username: dto.username,
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName: dto.displayName || (dto.firstName && dto.lastName ? `${dto.firstName} ${dto.lastName}` : undefined),
      };

      const user = await this.userRepository.create(createData);
      
      // Update additional fields if provided
      // Note: avatarUrl is used for now. Phone field will be added to schema in future update
      if (dto.avatarUrl) {
        return await this.userRepository.update(user._id.toString(), {
          avatarUrl: dto.avatarUrl,
        }) || user;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findUserById(id: string, includeMemberships: boolean = false): Promise<any> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (includeMemberships) {
        const memberships = await this.tenantMemberRepository.findUserTenants(id);
        return {
          ...user.toJSON(),
          memberships,
        };
      }

      return user;
    } catch (error) {
      this.logger.error(`Error finding user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check for email/username conflicts if updating
      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(dto.email);
        if (existingUser) {
          throw new BadRequestException('Email already in use');
        }
      }

      if (dto.username && dto.username !== user.username) {
        const existingUser = await this.userRepository.findByUsername(dto.username);
        if (existingUser) {
          throw new BadRequestException('Username already in use');
        }
      }

      const updateData: any = {
        ...(dto.username && { username: dto.username }),
        ...(dto.email && { email: dto.email }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
      };
      // Note: phone and displayName from DTO are not persisted as they don't exist in schema yet

      const updatedUser = await this.userRepository.update(id, updateData);
      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Soft delete the user
      await this.userRepository.delete(id);

      // Note: Membership records are retained for audit purposes
      this.logger.log(`User ${id} soft deleted`);
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listUsers(query: ListUsersQueryDto): Promise<any> {
    try {
      const { q, email, username, scope, tenantId, page = 1, size = 10, includeMemberships = false } = query;

      // If tenant scope is requested, we need to filter by tenant membership
      if (scope === 'tenant') {
        if (!tenantId) {
          throw new BadRequestException('tenantId is required when scope is tenant');
        }

        const membersResult = await this.tenantMemberRepository.listTenantMembers({
          tenantId,
          page,
          limit: size,
        });

        return {
          users: membersResult.members.map((m: any) => ({
            ...m.userId?.toJSON?.() || m.userId,
            membership: {
              id: m._id.toString(),
              role: m.role,
              status: m.status,
              joinedAt: m.joinedAt,
            },
          })),
          total: membersResult.total,
          page: membersResult.page,
          totalPages: membersResult.totalPages,
        };
      }

      // Global scope - search all users
      const result = await this.userRepository.searchUsers({
        searchQuery: q,
        email,
        username,
        page,
        limit: size,
      });

      if (includeMemberships) {
        const usersWithMemberships = await Promise.all(
          result.users.map(async (user) => {
            const memberships = await this.tenantMemberRepository.findUserTenants(user._id.toString());
            return {
              ...user.toJSON(),
              memberships,
            };
          }),
        );

        return {
          users: usersWithMemberships,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Error listing users: ${error.message}`, error.stack);
      throw error;
    }
  }
}
