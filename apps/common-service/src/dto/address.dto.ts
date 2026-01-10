import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsMongoId,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressScope, AddressType } from '@shared/schemas';

export class AdministrativeUnitSnapshotDto {
  @ApiProperty({ example: 'P01', description: 'Administrative unit code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Hà Nội', description: 'Administrative unit name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Hanoi',
    description: 'Administrative unit name in English',
  })
  @IsString()
  @IsOptional()
  nameEn?: string;
}

export class CreateAddressDto {
  @ApiProperty({
    enum: AddressScope,
    example: AddressScope.GLOBAL,
    description: 'Address scope (global for personal, organization for company)',
  })
  @IsEnum(AddressScope)
  @IsNotEmpty()
  scope: AddressScope;

  @ApiPropertyOptional({
    enum: AddressType,
    example: AddressType.SHIPPING,
    description: 'Address type classification',
  })
  @IsEnum(AddressType)
  @IsOptional()
  type?: AddressType;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID (required for global scope)',
  })
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Organization ID (required for organization scope)',
  })
  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    example: '123 Nguyễn Trãi Street',
    description: 'Primary address line',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  addressLine1: string;

  @ApiPropertyOptional({
    example: 'Apartment 5A',
    description: 'Secondary address line',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({
    type: AdministrativeUnitSnapshotDto,
    description: 'Province information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsNotEmpty()
  province: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    type: AdministrativeUnitSnapshotDto,
    description: 'District information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsOptional()
  district?: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    type: AdministrativeUnitSnapshotDto,
    description: 'Ward information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsOptional()
  ward?: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    example: '100000',
    description: 'Postal code',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'VN',
    description: 'Country code (ISO 3166-1 alpha-2 or alpha-3)',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Contact person name',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({
    example: '+84-901-234-567',
    description: 'Contact phone number',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as default address',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Home',
    description: 'Address label/nickname',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    example: 'Use back entrance',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      type: { type: 'string', example: 'Point' },
      coordinates: {
        type: 'array',
        items: { type: 'number' },
        example: [105.8342, 21.0278],
        description: '[longitude, latitude]',
      },
    },
    description: 'Geolocation data',
  })
  @IsOptional()
  location?: {
    type: string;
    coordinates: number[];
  };
}

export class UpdateAddressDto {
  @ApiPropertyOptional({
    enum: AddressType,
    example: AddressType.SHIPPING,
    description: 'Address type classification',
  })
  @IsEnum(AddressType)
  @IsOptional()
  type?: AddressType;

  @ApiPropertyOptional({
    example: '123 Nguyễn Trãi Street',
    description: 'Primary address line',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Apartment 5A',
    description: 'Secondary address line',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({
    type: AdministrativeUnitSnapshotDto,
    description: 'Province information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsOptional()
  province?: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    type: AdministrativeUnitSnapshotDto,
    description: 'District information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsOptional()
  district?: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    type: AdministrativeUnitSnapshotDto,
    description: 'Ward information (snapshot)',
  })
  @ValidateNested()
  @Type(() => AdministrativeUnitSnapshotDto)
  @IsOptional()
  ward?: AdministrativeUnitSnapshotDto;

  @ApiPropertyOptional({
    example: '100000',
    description: 'Postal code',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'VN',
    description: 'Country code (ISO 3166-1 alpha-2 or alpha-3)',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Contact person name',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({
    example: '+84-901-234-567',
    description: 'Contact phone number',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as default address',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Home',
    description: 'Address label/nickname',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    example: 'Use back entrance',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      type: { type: 'string', example: 'Point' },
      coordinates: {
        type: 'array',
        items: { type: 'number' },
        example: [105.8342, 21.0278],
        description: '[longitude, latitude]',
      },
    },
    description: 'Geolocation data',
  })
  @IsOptional()
  location?: {
    type: string;
    coordinates: number[];
  };
}
