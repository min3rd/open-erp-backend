import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateConfigDto {
  @ApiPropertyOptional({
    description: 'Configuration data as JSON object',
    example: { darkMode: false, language: 'vi' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional description of the configuration',
    example: 'Updated user preferences',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
