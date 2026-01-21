import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  @ApiProperty({
    description: 'Navigation item ID',
    example: 'nav-users',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New order position',
    example: 0,
  })
  @IsNumber()
  newOrder: number;

  @ApiProperty({
    description: 'New parent ID (optional)',
    required: false,
    example: 'nav-system',
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;
}

export class ReorderNavigationDto {
  @ApiProperty({
    description: 'List of navigation items to reorder',
    type: [ReorderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
