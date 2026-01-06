import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { OrganizationType, OrganizationStatus } from '@shared/schemas';

export class CreateOrganizationDto {
  @ApiProperty({ enum: OrganizationType })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  internationalName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  headquartersAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  legalRepresentative: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  )
  contactPhone: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  foundedDate: Date;

  @ApiProperty({ enum: OrganizationStatus, required: false })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiProperty({ required: false, default: 'VN' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;
}

export class UpdateOrganizationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  internationalName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  headquartersAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  legalRepresentative?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  foundedDate?: Date;

  @ApiProperty({ enum: OrganizationStatus, required: false })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;
}
