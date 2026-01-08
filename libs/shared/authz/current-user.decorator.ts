import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from './permissions.guard';

/**
 * CurrentUser Parameter Decorator
 * 
 * Extracts the authenticated user from the request object.
 * The user object is set by the JWT authentication guard.
 * 
 * @example
 * ```typescript
 * @Post('organizations/:organizationId/users')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions(Permission.ORGANIZATION_INVITE)
 * async inviteMember(
 *   @Param('organizationId') organizationId: string,
 *   @Body() inviteDto: InviteMemberDto,
 *   @CurrentUser() currentUser: UserContext,
 * ) {
 *   const invitedById = currentUser.userId;
 *   // Use invitedById for audit trail
 * }
 * ```
 * 
 * @returns The user context containing userId, organizationId, roles, etc.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
