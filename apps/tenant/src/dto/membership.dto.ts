import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { MemberRole } from '@shared/schemas';

export class UpdateMemberRolesDto {
  @ApiProperty({ type: [String], enum: MemberRole })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(MemberRole, { each: true })
  roles: MemberRole[];
}
