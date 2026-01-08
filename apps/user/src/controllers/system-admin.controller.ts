import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserContext,
} from '@shared/authz';
import { Role } from '@shared/types/role.enum';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';

/**
 * Controller for managing SYSTEM_ADMIN users
 * All endpoints require SYSTEM_ADMIN role
 */
@Controller('admin/system-admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
export class SystemAdminController {
  private readonly logger = new Logger(SystemAdminController.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  /**
   * List all users with SYSTEM_ADMIN role
   */
  @Get()
  async listSystemAdmins() {
    try {
      // Find SYSTEM_ADMIN role
      const systemAdminRole = await this.roleRepository.findByCode(
        'SYSTEM_ADMIN',
        'global',
      );

      if (!systemAdminRole) {
        return {
          success: true,
          data: [],
          message: 'No SYSTEM_ADMIN role found',
        };
      }

      // Find all users with this role
      const allUsers = await this.userRepository.findAll();
      const systemAdmins = allUsers.filter((user) =>
        user.roleAssignments?.some(
          (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
        ),
      );

      // Get detailed info for each admin
      const adminsWithDetails = await Promise.all(
        systemAdmins.map(async (user) => {
          const assignment = user.roleAssignments?.find(
            (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
          );
          return {
            userId: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            username: user.username,
            status: user.status,
            grantedAt: assignment?.grantedAt,
            grantedBy: assignment?.grantedBy?.toString(),
          };
        }),
      );

      this.logger.log(`Listed ${adminsWithDetails.length} SYSTEM_ADMIN users`);

      return {
        success: true,
        data: adminsWithDetails,
        count: adminsWithDetails.length,
      };
    } catch (error) {
      this.logger.error(
        `Error listing SYSTEM_ADMIN users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Grant SYSTEM_ADMIN role to a user
   */
  @Post('grant/:userId')
  @HttpCode(HttpStatus.OK)
  async grantSystemAdmin(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserContext,
  ) {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Ensure SYSTEM_ADMIN role exists
      const systemAdminRole = await this.roleRepository.ensureSystemRoleExists(
        'SYSTEM_ADMIN',
        {
          name: 'System Administrator',
          description: 'Full system administrator with unrestricted access',
          permissions: [
            'system.admin',
            'system.config',
            'user.manage',
            'role.manage',
          ],
        },
      );

      // Check if user already has the role
      const hasRole = user.roleAssignments?.some(
        (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
      );

      if (hasRole) {
        return {
          success: true,
          message: 'User already has SYSTEM_ADMIN role',
          data: { userId, email: user.email },
        };
      }

      // Add SYSTEM_ADMIN role to user
      await this.userRepository.addRoleToUser(
        userId,
        systemAdminRole._id.toString(),
        currentUser.userId,
      );

      this.logger.log({
        event: 'system_admin.granted',
        targetUserId: userId,
        targetEmail: user.email,
        grantedBy: currentUser.userId,
        grantedByEmail: currentUser.email,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'SYSTEM_ADMIN role granted successfully',
        data: {
          userId,
          email: user.email,
          grantedBy: currentUser.email,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error granting SYSTEM_ADMIN role: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Revoke SYSTEM_ADMIN role from a user
   */
  @Delete('revoke/:userId')
  @HttpCode(HttpStatus.OK)
  async revokeSystemAdmin(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserContext,
  ) {
    try {
      // Prevent self-revocation
      if (userId === currentUser.userId) {
        throw new ForbiddenException(
          'Cannot revoke your own SYSTEM_ADMIN role',
        );
      }

      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Find SYSTEM_ADMIN role
      const systemAdminRole = await this.roleRepository.findByCode(
        'SYSTEM_ADMIN',
        'global',
      );
      if (!systemAdminRole) {
        throw new ForbiddenException('SYSTEM_ADMIN role not found');
      }

      // Check if user has the role
      const hasRole = user.roleAssignments?.some(
        (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
      );

      if (!hasRole) {
        return {
          success: true,
          message: 'User does not have SYSTEM_ADMIN role',
          data: { userId, email: user.email },
        };
      }

      // Check if this is the last SYSTEM_ADMIN
      const allUsers = await this.userRepository.findAll();
      const systemAdmins = allUsers.filter((u) =>
        u.roleAssignments?.some(
          (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
        ),
      );

      if (systemAdmins.length <= 1) {
        throw new ForbiddenException(
          'Cannot revoke SYSTEM_ADMIN role from the last system administrator. ' +
            'System must have at least one SYSTEM_ADMIN user.',
        );
      }

      // Remove SYSTEM_ADMIN role from user
      await this.userRepository.removeRoleFromUser(
        userId,
        systemAdminRole._id.toString(),
      );

      this.logger.log({
        event: 'system_admin.revoked',
        targetUserId: userId,
        targetEmail: user.email,
        revokedBy: currentUser.userId,
        revokedByEmail: currentUser.email,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'SYSTEM_ADMIN role revoked successfully',
        data: {
          userId,
          email: user.email,
          revokedBy: currentUser.email,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error revoking SYSTEM_ADMIN role: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
