import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsMongoId,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductScope,
  ProductType,
  ProductStatus,
  Unit,
  HazardLevel,
  StorageRequirement,
  TrackingType,
} from '@shared/constants';

export class MediaItemDto {
  @ApiProperty({ enum: ['image', 'video', 'document'], example: 'image' })
  @IsEnum(['image', 'video', 'document'])
  type: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'Product front view' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'High quality product image' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 1024000, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CustomAttributeDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 'RGB' })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class StorageConditionsDto {
  @ApiPropertyOptional({ example: -10, minimum: -100, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureMin?: number;

  @ApiPropertyOptional({ example: 25, minimum: -100, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureMax?: number;

  @ApiPropertyOptional({ example: 30, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityMin?: number;

  @ApiPropertyOptional({ example: 70, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityMax?: number;

  @ApiPropertyOptional({ enum: StorageRequirement, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(StorageRequirement, { each: true })
  requirements?: StorageRequirement[];

  @ApiPropertyOptional({ example: 'Keep away from direct sunlight' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class DimensionsDto {
  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ example: 30, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiProperty({ enum: Unit, example: Unit.CM })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ example: 5.5, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ enum: Unit, example: Unit.KG })
  @IsEnum(Unit)
  weightUnit: Unit;
}

export class CategorySnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  id?: string;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'ELEC' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Electronic components and devices' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-001', description: 'Stock Keeping Unit' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Product Name', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'International Product Name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  internationalName?: string;

  @ApiPropertyOptional({ example: 'Product description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ type: [MediaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];

  @ApiProperty({ enum: ProductScope, example: ProductScope.ORGANIZATION })
  @IsEnum(ProductScope)
  scope: ProductScope;

  @ApiPropertyOptional({
    description: 'Organization ID (required for organization scope)',
  })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiProperty({ enum: ProductType, example: ProductType.FINISHED_GOOD })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CategorySnapshotDto)
  category?: CategorySnapshotDto;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.DRAFT })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiProperty({ enum: Unit, example: Unit.PIECE })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ enum: TrackingType, example: TrackingType.NONE })
  @IsOptional()
  @IsEnum(TrackingType)
  trackingType?: TrackingType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasExpiryDate?: boolean;

  @ApiPropertyOptional({ example: 365, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiPropertyOptional({ enum: HazardLevel, example: HazardLevel.NONE })
  @IsOptional()
  @IsEnum(HazardLevel)
  hazardLevel?: HazardLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StorageConditionsDto)
  storageConditions?: StorageConditionsDto;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional({ type: [CustomAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomAttributeDto)
  customAttributes?: CustomAttributeDto[];

  @ApiProperty({ description: 'User ID who created the product' })
  @IsMongoId()
  createdBy: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Product Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'International Product Name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  internationalName?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ type: [MediaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CategorySnapshotDto)
  category?: CategorySnapshotDto;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: Unit })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({ enum: TrackingType })
  @IsOptional()
  @IsEnum(TrackingType)
  trackingType?: TrackingType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasExpiryDate?: boolean;

  @ApiPropertyOptional({ example: 365 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiPropertyOptional({ enum: HazardLevel })
  @IsOptional()
  @IsEnum(HazardLevel)
  hazardLevel?: HazardLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StorageConditionsDto)
  storageConditions?: StorageConditionsDto;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional({ type: [CustomAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomAttributeDto)
  customAttributes?: CustomAttributeDto[];

  @ApiProperty({ description: 'User ID who updated the product' })
  @IsMongoId()
  updatedBy: string;

  @ApiPropertyOptional({ example: 'Updated pricing information' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
