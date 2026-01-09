import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  Matches,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NavigationScope } from '../schemas/navigation.schema';

export class PermissionConfigDto {
  @ApiPropertyOptional({
    description: 'Array of permission keys required to access this item',
    example: ['user.read', 'user.write'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @ApiPropertyOptional({
    description: 'Array of permission keys that deny access to this item',
    example: ['admin.only'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];
}

export class CreateNavigationDto {
  @ApiProperty({
    description: 'Unique identifier for the navigation item',
    example: 'nav-dashboard',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  @MaxLength(100)
  id: string;

  @ApiProperty({
    description: 'Display label for the navigation item',
    example: 'Dashboard',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({
    description: 'Icon identifier (e.g., FontAwesome class or custom icon)',
    example: 'pi pi-home',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Subtitle or description text',
    example: 'Main dashboard view',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional({
    description: 'Angular router link path',
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  routerLink?: string;

  @ApiPropertyOptional({
    description: 'External URL (alternative to routerLink)',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string;

  @ApiPropertyOptional({
    description: 'Permission configuration for access control',
    type: PermissionConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionConfigDto)
  permissions?: PermissionConfigDto;

  @ApiPropertyOptional({
    description: 'Client-side command function name to invoke',
    example: 'openSettings',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  command?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is disabled',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @ApiPropertyOptional({
    description: 'Target attribute for links (_blank, _self, etc.)',
    example: '_blank',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  target?: string;

  @ApiPropertyOptional({
    description: 'Badge text or number to display',
    example: '5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badge?: string;

  @ApiPropertyOptional({
    description: 'Tooltip text on hover',
    example: 'Go to dashboard',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tooltip?: string;

  @ApiPropertyOptional({
    description: 'Keyboard shortcut (e.g., "Ctrl+D", "Ctrl+Shift+S", "F1")',
    example: 'Ctrl+D',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^(Ctrl|Alt|Shift|Meta)(\+(Ctrl|Alt|Shift|Meta))*\+([A-Za-z0-9]|F\d{1,2})$/,
    {
      message:
        'Invalid shortcut format (e.g., Ctrl+D, Alt+Shift+S, F1, Ctrl+Shift+Delete)',
    },
  )
  @MaxLength(50)
  shortcut?: string;

  @ApiPropertyOptional({
    description: 'CSS class for the item',
    example: 'custom-nav-item',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  class?: string;

  @ApiPropertyOptional({
    description: 'Inline styles for icon',
    example: 'color: blue',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconStyle?: string;

  @ApiPropertyOptional({
    description: 'CSS class for icon',
    example: 'custom-icon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  iconClass?: string;

  @ApiPropertyOptional({
    description: 'Inline styles for label',
    example: 'font-weight: bold',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  labelStyle?: string;

  @ApiPropertyOptional({
    description: 'CSS class for label',
    example: 'custom-label',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  labelClass?: string;

  @ApiPropertyOptional({
    description: 'Inline styles for link',
    example: 'text-decoration: none',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkStyle?: string;

  @ApiPropertyOptional({
    description: 'CSS class for link',
    example: 'custom-link',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkClass?: string;

  @ApiPropertyOptional({
    description: 'Order/position among siblings',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({
    description: 'Scope of the navigation item',
    enum: NavigationScope,
    example: NavigationScope.GLOBAL,
  })
  @IsEnum(NavigationScope)
  scope: NavigationScope;

  @ApiPropertyOptional({
    description: 'Module identifier (required when scope is MODULE)',
    example: 'inventory',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  moduleId?: string;

  @ApiPropertyOptional({
    description: 'Parent navigation item ID (for nested items)',
    example: 'nav-settings',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Free-form metadata object',
    example: { color: 'blue', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
