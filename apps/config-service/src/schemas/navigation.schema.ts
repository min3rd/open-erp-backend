import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type NavigationDocument = HydratedDocument<Navigation>;

export enum NavigationScope {
  GLOBAL = 'global',
  MODULE = 'module',
}

export interface PermissionConfig {
  include?: string[];
  exclude?: string[];
}

@Schema({ timestamps: true, collection: 'navigations' })
export class Navigation extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  label: string;

  @Prop()
  icon?: string;

  @Prop()
  subtitle?: string;

  @Prop()
  routerLink?: string;

  @Prop()
  url?: string;

  @Prop({ type: Object })
  permissions?: PermissionConfig;

  @Prop()
  command?: string;

  @Prop({ type: [String], default: [] })
  items?: string[]; // Array of child navigation IDs

  @Prop({ default: false })
  disabled?: boolean;

  @Prop()
  target?: string;

  @Prop()
  badge?: string;

  @Prop()
  tooltip?: string;

  @Prop()
  shortcut?: string;

  @Prop()
  class?: string;

  @Prop()
  iconStyle?: string;

  @Prop()
  iconClass?: string;

  @Prop()
  labelStyle?: string;

  @Prop()
  labelClass?: string;

  @Prop()
  linkStyle?: string;

  @Prop()
  linkClass?: string;

  @Prop({ default: 0 })
  order?: number;

  @Prop({
    required: true,
    enum: NavigationScope,
    default: NavigationScope.GLOBAL,
    index: true,
  })
  scope: NavigationScope;

  @Prop({ index: true })
  moduleId?: string; // Module identifier when scope='module'

  @Prop()
  parentId?: string; // Reference to parent navigation item

  @Prop({ type: Object })
  meta?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NavigationSchema = SchemaFactory.createForClass(Navigation);

// Create indexes for efficient queries
NavigationSchema.index({ scope: 1, moduleId: 1, order: 1 });
NavigationSchema.index({ scope: 1, parentId: 1 });
NavigationSchema.index({ moduleId: 1, order: 1 });
NavigationSchema.index({ parentId: 1 });
NavigationSchema.index({ label: 'text', command: 'text' }); // Text search index
