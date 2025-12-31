import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfigScope } from '../schemas/config.schema';

export class ConfigResponseDto {
  @ApiProperty({ description: 'Config ID' })
  id: string;

  @ApiProperty({ description: 'Config name' })
  name: string;

  @ApiProperty({ description: 'Config scope', enum: ConfigScope })
  scope: ConfigScope;

  @ApiProperty({ description: 'Configuration data' })
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Config description' })
  description?: string;

  @ApiProperty({ description: 'Config version number' })
  version: number;

  @ApiPropertyOptional({ description: 'Owner ID (for user-scoped configs)' })
  ownerId?: string;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Last updated by user ID' })
  updatedBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
