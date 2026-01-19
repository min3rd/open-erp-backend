import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsEmail,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  WarehouseType,
  WarehouseStatus,
  CapacityUnit,
  SecurityLevel,
  WorkingShift,
  Region,
  PaymentTerm,
  Currency,
  SpecialCondition,
} from '@shared/constants/warehouse.constants';

/**
 * Province DTO
 */
export class ProvinceDto {
  @ApiProperty({ example: '01', description: 'Province code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Hà Nội', description: 'Province name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * Ward DTO
 */
export class WardDto {
  @ApiProperty({ example: '00001', description: 'Ward code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Phúc Xá', description: 'Ward name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * Location DTO
 */
export class LocationDto {
  @ApiProperty({ example: 'Point', description: 'GeoJSON type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: [105.8342, 21.0285],
    description: 'Coordinates [longitude, latitude]',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];
}

/**
 * Manager DTO
 */
export class ManagerDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Manager user ID',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Manager name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * Camera System DTO
 */
export class CameraSystemDto {
  @ApiPropertyOptional({ example: 20, description: 'Number of cameras' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cameraCount?: number;

  @ApiPropertyOptional({ example: '100%', description: 'Coverage area' })
  @IsOptional()
  @IsString()
  coverage?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Number of days recordings are kept',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  recordingDays?: number;

  @ApiPropertyOptional({ example: true, description: 'AI-enabled cameras' })
  @IsOptional()
  isAIEnabled?: boolean;
}

/**
 * Access Control DTO
 */
export class AccessControlDto {
  @ApiPropertyOptional({
    example: 'RFID',
    description: 'Access control system type',
  })
  @IsOptional()
  @IsString()
  system?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Biometric access control',
  })
  @IsOptional()
  biometric?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Card-based access control',
  })
  @IsOptional()
  cardAccess?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Number of security guards' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  securityGuards?: number;
}

/**
 * Create Warehouse DTO
 */
export class CreateWarehouseDto {
  @ApiPropertyOptional({
    example: 'WH-001',
    description: 'Warehouse ID (optional)',
  })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ example: 'WH-HN-001', description: 'Unique warehouse code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Kho Hà Nội 1', description: 'Warehouse name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    enum: WarehouseType,
    example: WarehouseType.GENERAL,
    description: 'Warehouse type',
  })
  @IsEnum(WarehouseType)
  @IsNotEmpty()
  type: WarehouseType;

  @ApiPropertyOptional({
    enum: WarehouseStatus,
    example: WarehouseStatus.ACTIVE,
    description: 'Warehouse status',
  })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Organization ID reference',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    example: 'GPKD-001',
    description: 'Business license number',
  })
  @IsOptional()
  @IsString()
  businessLicense?: string;

  @ApiPropertyOptional({
    example: 'GPKHO-001',
    description: 'Warehouse license number',
  })
  @IsOptional()
  @IsString()
  warehouseLicense?: string;

  @ApiPropertyOptional({ example: 'HQ-001', description: 'Customs code' })
  @IsOptional()
  @IsString()
  customsCode?: string;

  @ApiProperty({ example: '123 Đường ABC', description: 'Detailed address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  addressDetail: string;

  @ApiProperty({ type: WardDto, description: 'Ward information' })
  @ValidateNested()
  @Type(() => WardDto)
  @IsNotEmpty()
  ward: WardDto;

  @ApiProperty({ type: ProvinceDto, description: 'Province information' })
  @ValidateNested()
  @Type(() => ProvinceDto)
  @IsNotEmpty()
  province: ProvinceDto;

  @ApiPropertyOptional({
    enum: Region,
    example: Region.NORTHERN,
    description: 'Region',
  })
  @IsOptional()
  @IsEnum(Region)
  region?: Region;

  @ApiPropertyOptional({
    type: LocationDto,
    description: 'Geographic location',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Total area in square meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAreaM2?: number;

  @ApiPropertyOptional({
    example: 4500,
    description: 'Usable area in square meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usableAreaM2?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Storage capacity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageCapacity?: number;

  @ApiPropertyOptional({
    enum: CapacityUnit,
    example: CapacityUnit.TON,
    description: 'Capacity unit',
  })
  @IsOptional()
  @IsEnum(CapacityUnit)
  capacityUnit?: CapacityUnit;

  @ApiPropertyOptional({ example: 5, description: 'Number of zones' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  zonesCount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Number of racks' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  racksCount?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of floors' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorsCount?: number;

  @ApiPropertyOptional({
    example: -20,
    description: 'Minimum temperature (°C)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureMin?: number;

  @ApiPropertyOptional({ example: 25, description: 'Maximum temperature (°C)' })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  temperatureMax?: number;

  @ApiPropertyOptional({ example: 30, description: 'Minimum humidity (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityMin?: number;

  @ApiPropertyOptional({ example: 80, description: 'Maximum humidity (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityMax?: number;

  @ApiPropertyOptional({
    enum: SpecialCondition,
    isArray: true,
    example: [SpecialCondition.TEMPERATURE_CONTROLLED],
    description: 'Special storage conditions',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SpecialCondition, { each: true })
  specialConditions?: SpecialCondition[];

  @ApiPropertyOptional({ type: ManagerDto, description: 'Warehouse manager' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManagerDto)
  manager?: ManagerDto;

  @ApiPropertyOptional({
    example: '+84901234567',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  )
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'warehouse@example.com',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 50, description: 'Number of workers' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workersCount?: number;

  @ApiPropertyOptional({
    enum: WorkingShift,
    example: WorkingShift.FULL_TIME,
    description: 'Working shift',
  })
  @IsOptional()
  @IsEnum(WorkingShift)
  workingShift?: WorkingShift;

  @ApiPropertyOptional({
    example: '08:00 - 17:00',
    description: 'Operating hours',
  })
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiPropertyOptional({
    example: 'CERT-FIRE-001',
    description: 'Fire protection certificate',
  })
  @IsOptional()
  @IsString()
  fireProtectionCert?: string;

  @ApiPropertyOptional({
    enum: SecurityLevel,
    example: SecurityLevel.STANDARD,
    description: 'Security level',
  })
  @IsOptional()
  @IsEnum(SecurityLevel)
  securityLevel?: SecurityLevel;

  @ApiPropertyOptional({
    type: CameraSystemDto,
    description: 'Camera system details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CameraSystemDto)
  cameraSystem?: CameraSystemDto;

  @ApiPropertyOptional({
    type: AccessControlDto,
    description: 'Access control details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessControlDto)
  accessControl?: AccessControlDto;

  @ApiPropertyOptional({
    example: 'INS-001',
    description: 'Insurance policy number',
  })
  @IsOptional()
  @IsString()
  insurancePolicy?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Storage fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageFee?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Handling fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  handlingFee?: number;

  @ApiPropertyOptional({
    enum: Currency,
    example: Currency.VND,
    description: 'Currency',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    enum: PaymentTerm,
    example: PaymentTerm.NET_30,
    description: 'Payment term',
  })
  @IsOptional()
  @IsEnum(PaymentTerm)
  paymentTerm?: PaymentTerm;

  @ApiPropertyOptional({
    example: 'tenant-001',
    description: 'Tenant ID (for multi-tenant)',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

/**
 * Update Warehouse DTO
 */
export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

/**
 * Query Warehouse DTO
 */
export class QueryWarehouseDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Page size' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: WarehouseType,
    description: 'Filter by warehouse type',
  })
  @IsOptional()
  @IsEnum(WarehouseType)
  type?: WarehouseType;

  @ApiPropertyOptional({
    enum: WarehouseStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @ApiPropertyOptional({
    example: '01',
    description: 'Filter by province code',
  })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiPropertyOptional({ example: '00001', description: 'Filter by ward code' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional({ enum: Region, description: 'Filter by region' })
  @IsOptional()
  @IsEnum(Region)
  region?: Region;

  @ApiPropertyOptional({
    example: 'tenant-001',
    description: 'Filter by tenant ID',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    example: 'kho',
    description: 'Search by name or company name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '105.8342,21.0285,10',
    description: 'Bounding box query: longitude,latitude,radiusKm',
  })
  @IsOptional()
  @IsString()
  bbox?: string;
}
