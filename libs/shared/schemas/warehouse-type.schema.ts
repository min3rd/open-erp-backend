import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { WarehouseType } from '../constants/warehouse.constants';

export type WarehouseTypeDocument = HydratedDocument<WarehouseTypeMaster>;

@Schema({
  timestamps: true,
  collection: 'warehouse_types',
  versionKey: false,
})
export class WarehouseTypeMaster extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    enum: Object.values(WarehouseType),
  })
  code: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
  })
  nameEn?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

  @Prop({
    type: Number,
  })
  sortOrder?: number;
}

export const WarehouseTypeSchema =
  SchemaFactory.createForClass(WarehouseTypeMaster);

// Text index for search
WarehouseTypeSchema.index({
  name: 'text',
  nameEn: 'text',
  description: 'text',
});

// Ensure virtuals are included in JSON output
WarehouseTypeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

WarehouseTypeSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
