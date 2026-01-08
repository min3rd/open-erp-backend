import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MoveNavigationDto {
  @ApiPropertyOptional({
    description: 'New parent navigation item ID (null for root level)',
    example: 'nav-settings',
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @ApiPropertyOptional({
    description: 'Position/order in the new parent (optional)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  order?: number;
}
