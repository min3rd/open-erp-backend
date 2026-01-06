import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { RelationType, RelationStatus } from '@shared/schemas';

export class CreateRelationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiProperty({ enum: RelationType })
  @IsEnum(RelationType)
  @IsNotEmpty()
  relationType: RelationType;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  sharePercentage?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateRelationDto {
  @ApiProperty({ enum: RelationType, required: false })
  @IsEnum(RelationType)
  @IsOptional()
  relationType?: RelationType;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  sharePercentage?: number;

  @ApiProperty({ enum: RelationStatus, required: false })
  @IsEnum(RelationStatus)
  @IsOptional()
  status?: RelationStatus;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveDate?: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
