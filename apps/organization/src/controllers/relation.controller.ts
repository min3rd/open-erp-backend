import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RelationService } from '../services/relation.service';
import { CreateRelationDto, UpdateRelationDto } from '../dto/relation.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';
import { created, ok, updated, deleted } from '@shared/response';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('relations')
@ApiBearerAuth()
@Controller('relations')
@UseGuards(JwtAuthGuard)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post('organizations/:organizationId')
  @ApiOperation({ summary: 'Create organization relation' })
  @ApiResponse({ status: 201, description: 'Relation created successfully' })
  @Permissions(['relation.create', 'organization.manage'], { mode: 'any' })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateRelationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const relation = await this.relationService.create(
      organizationId,
      createDto.childId,
      createDto.relationType,
      req.user.userId,
      {
        sharePercentage: createDto.sharePercentage,
        effectiveDate: createDto.effectiveDate,
        notes: createDto.notes,
      },
    );
    return created(relation, 'Relation created successfully');
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get organization relations' })
  @ApiResponse({ status: 200, description: 'Relations retrieved successfully' })
  @Permissions('relation.read')
  async findByOrganization(@Param('organizationId') organizationId: string) {
    const relations = await this.relationService.findByOrganization(organizationId);
    return ok(relations, 'Relations retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update relation' })
  @ApiResponse({ status: 200, description: 'Relation updated successfully' })
  @Permissions(['relation.update', 'organization.manage'], { mode: 'any' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRelationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const relation = await this.relationService.update(id, updateDto as any, req.user.userId);
    return updated(relation, 'Relation updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete relation' })
  @ApiResponse({ status: 200, description: 'Relation deleted successfully' })
  @Permissions(['relation.delete', 'organization.manage'], { mode: 'any' })
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.relationService.delete(id, req.user.userId);
    return deleted('Relation deleted successfully');
  }
}
