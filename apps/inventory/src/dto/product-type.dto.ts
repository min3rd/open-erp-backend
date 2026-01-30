import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * DTO for attribute definition
 */
export class AttributeDefinitionDto {
  @ApiProperty({
    description: 'Attribute name',
    example: 'color',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Attribute data type',
    enum: ['string', 'number', 'boolean', 'date', 'select'],
    example: 'select',
  })
  @IsEnum(['string', 'number', 'boolean', 'date', 'select'])
  type: string;

  @ApiPropertyOptional({
    description: 'Display label for the attribute',
    example: 'Product Color',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Attribute description',
    example: 'The primary color of the product',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this attribute is required',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Options for select type',
    type: [String],
    example: ['Red', 'Blue', 'Green'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Default value',
    example: 'Red',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({
    description: 'Additional validation rules',
    example: { min: 0, max: 100 },
  })
  @IsOptional()
  validation?: Record<string, any>;
}

/**
 * DTO for creating a new product type
 */
export class CreateProductTypeDto {
  @ApiProperty({
    description: 'Unique code for the product type',
    example: 'raw_material',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Display name of the product type',
    example: 'Raw Material',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the product type',
    example: 'Raw materials used in manufacturing processes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the product type is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Custom attributes for this product type',
    type: [AttributeDefinitionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDefinitionDto)
  attributes?: AttributeDefinitionDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { category: 'manufacturing' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a product type
 */
export class UpdateProductTypeDto extends PartialType(CreateProductTypeDto) {
  @ApiPropertyOptional({
    description: 'Unique code for the product type',
    example: 'raw_material',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Display name of the product type',
    example: 'Raw Material',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}
