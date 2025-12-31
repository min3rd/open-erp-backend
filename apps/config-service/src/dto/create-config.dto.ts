import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  Matches,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateConfigDto {
  @ApiProperty({
    description: 'Config name (alphanumeric, hyphens, underscores only)',
    example: 'feature-flags',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Config name must contain only alphanumeric characters, hyphens, and underscores',
  })
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Configuration data as JSON object',
    example: { darkMode: true, language: 'en' },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional description of the configuration',
    example: 'User UI preferences',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
