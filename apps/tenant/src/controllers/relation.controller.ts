import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RelationService } from '../services/relation.service';
import { CreateRelationDto, UpdateRelationDto } from '../dto/relation.dto';

@ApiTags('relations')
@ApiBearerAuth()
@Controller('relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post('organizations/:organizationId')
  @ApiOperation({ summary: 'Create organization relation' })
  @ApiResponse({ status: 201, description: 'Relation created successfully' })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateRelationDto,
  ) {
    const userId = 'temp-user-id'; // Placeholder
    return this.relationService.create(
      organizationId,
      createDto.childId,
      createDto.relationType,
      userId,
      {
        sharePercentage: createDto.sharePercentage,
        effectiveDate: createDto.effectiveDate,
        notes: createDto.notes,
      },
    );
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get organization relations' })
  @ApiResponse({ status: 200, description: 'Relations retrieved successfully' })
  async findByOrganization(@Param('organizationId') organizationId: string) {
    return this.relationService.findByOrganization(organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update relation' })
  @ApiResponse({ status: 200, description: 'Relation updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateRelationDto) {
    const userId = 'temp-user-id'; // Placeholder
    return this.relationService.update(id, updateDto as any, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete relation' })
  @ApiResponse({ status: 200, description: 'Relation deleted successfully' })
  async delete(@Param('id') id: string) {
    const userId = 'temp-user-id'; // Placeholder
    return this.relationService.delete(id, userId);
  }
}
