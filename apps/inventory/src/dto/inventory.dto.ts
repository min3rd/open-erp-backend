import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { InventoryTransactionType } from '@shared/constants';

export class LotInfoDto {
  @ApiPropertyOptional({ example: 'LOT-2024-001' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ example: 'SN-12345' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiPropertyOptional({ example: '2025-01-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ enum: InventoryTransactionType, example: InventoryTransactionType.IN })
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @ApiProperty({ description: 'Product ID' })
  @IsMongoId()
  productId: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Source warehouse ID (for OUT, TRANSFER)' })
  @IsOptional()
  @IsMongoId()
  sourceWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Destination warehouse ID (for IN, TRANSFER)' })
  @IsOptional()
  @IsMongoId()
  destinationWarehouseId?: string;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 50.5, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: LotInfoDto })
  @IsOptional()
  lotInfo?: LotInfoDto;

  @ApiPropertyOptional({ example: 'A1-B2-C3' })
  @IsOptional()
  @IsString()
  sourceLocation?: string;

  @ApiPropertyOptional({ example: 'A2-B3-C4' })
  @IsOptional()
  @IsString()
  destinationLocation?: string;

  @ApiPropertyOptional({ example: 'purchase_order' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference document ID' })
  @IsOptional()
  @IsMongoId()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'PO-2024-001' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Received from supplier', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'Stock replenishment', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ description: 'User ID who created the transaction' })
  @IsMongoId()
  createdBy: string;
}

export class StockAdjustmentDto {
  @ApiProperty({ description: 'Product ID' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsMongoId()
  warehouseId: string;

  @ApiProperty({ example: 150, minimum: 0, description: 'New quantity after adjustment' })
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiProperty({ example: 'Physical count adjustment', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiProperty({ description: 'User ID who performed the adjustment' })
  @IsMongoId()
  adjustedBy: string;
}

export class TransferStockDto {
  @ApiProperty({ description: 'Product ID' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Source warehouse ID' })
  @IsMongoId()
  sourceWarehouseId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsMongoId()
  destinationWarehouseId: string;

  @ApiProperty({ example: 50, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'A1-B2-C3' })
  @IsOptional()
  @IsString()
  sourceLocation?: string;

  @ApiPropertyOptional({ example: 'A2-B3-C4' })
  @IsOptional()
  @IsString()
  destinationLocation?: string;

  @ApiPropertyOptional({ example: 'Warehouse rebalancing', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'User ID who initiated the transfer' })
  @IsMongoId()
  initiatedBy: string;
}
