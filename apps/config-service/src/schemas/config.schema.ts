import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ConfigDocument = HydratedDocument<Config>;

export enum ConfigScope {
  GLOBAL = 'global',
  USER = 'user',
}

@Schema({ timestamps: true, collection: 'configs' })
export class Config extends Document {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({
    required: true,
    enum: ConfigScope,
    default: ConfigScope.GLOBAL,
    index: true,
  })
  scope: ConfigScope;

  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @Prop()
  description?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ index: true })
  ownerId?: string; // userId for user-scoped configs

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ConfigSchema = SchemaFactory.createForClass(Config);

// Create compound unique index for name+scope+ownerId
ConfigSchema.index(
  { name: 1, scope: 1, ownerId: 1 },
  { unique: true, sparse: true },
);

// Additional indexes for efficient queries
ConfigSchema.index({ name: 1, scope: 1 });
ConfigSchema.index({ ownerId: 1, scope: 1 });
ConfigSchema.index({ updatedAt: -1 });
