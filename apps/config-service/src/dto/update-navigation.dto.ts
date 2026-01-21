import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateNavigationDto } from './create-navigation.dto';

export class UpdateNavigationDto extends PartialType(
  OmitType(CreateNavigationDto, ['scope'] as const),
) {}
