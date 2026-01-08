import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NavigationScope, PermissionConfig } from '../schemas/navigation.schema';

export class NavigationItemDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Display label' })
  label: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Subtitle' })
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Router link' })
  routerLink?: string;

  @ApiPropertyOptional({ description: 'External URL' })
  url?: string;

  @ApiPropertyOptional({ description: 'Permission configuration' })
  permissions?: PermissionConfig;

  @ApiPropertyOptional({ description: 'Command function name' })
  command?: string;

  @ApiPropertyOptional({ description: 'Nested navigation items', type: [Object] })
  items?: NavigationItemDto[];

  @ApiPropertyOptional({ description: 'Whether disabled' })
  disabled?: boolean;

  @ApiPropertyOptional({ description: 'Link target' })
  target?: string;

  @ApiPropertyOptional({ description: 'Badge text' })
  badge?: string;

  @ApiPropertyOptional({ description: 'Tooltip' })
  tooltip?: string;

  @ApiPropertyOptional({ description: 'Keyboard shortcut' })
  shortcut?: string;

  @ApiPropertyOptional({ description: 'CSS class' })
  class?: string;

  @ApiPropertyOptional({ description: 'Icon style' })
  iconStyle?: string;

  @ApiPropertyOptional({ description: 'Icon class' })
  iconClass?: string;

  @ApiPropertyOptional({ description: 'Label style' })
  labelStyle?: string;

  @ApiPropertyOptional({ description: 'Label class' })
  labelClass?: string;

  @ApiPropertyOptional({ description: 'Link style' })
  linkStyle?: string;

  @ApiPropertyOptional({ description: 'Link class' })
  linkClass?: string;

  @ApiPropertyOptional({ description: 'Order/position' })
  order?: number;

  @ApiProperty({ description: 'Scope', enum: NavigationScope })
  scope: NavigationScope;

  @ApiPropertyOptional({ description: 'Module key' })
  module?: string;

  @ApiPropertyOptional({ description: 'Parent ID' })
  parentId?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  meta?: Record<string, any>;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Updated by user ID' })
  updatedBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class NavigationResponseDto {
  @ApiProperty({ description: 'Navigation tree structure', type: [NavigationItemDto] })
  items: NavigationItemDto[];

  @ApiPropertyOptional({ description: 'Scope filter applied' })
  scope?: NavigationScope;

  @ApiPropertyOptional({ description: 'Module filter applied' })
  module?: string;

  @ApiProperty({ description: 'Total count of items' })
  total: number;
}
