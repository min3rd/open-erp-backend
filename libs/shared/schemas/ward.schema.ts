import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type WardDocument = HydratedDocument<Ward>;

@Schema({
  timestamps: true,
  collection: 'wards',
  versionKey: false,
})
export class Ward extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
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
    required: true,
    index: true,
  })
  provinceCode: string;

  @Prop({
    type: String,
    index: true,
  })
  districtCode?: string;

  @Prop({
    type: Number,
  })
  sortOrder?: number;

  @Prop({
    type: String,
    default: '1.0',
    index: true,
  })
  version?: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isLegacy?: boolean;
}

export const WardSchema = SchemaFactory.createForClass(Ward);

// Compound index for efficient queries
WardSchema.index({ provinceCode: 1, code: 1 });
WardSchema.index({ provinceCode: 1, name: 1 });
WardSchema.index({ districtCode: 1, code: 1 });
WardSchema.index({ provinceCode: 1, districtCode: 1 });

// Text index for search
WardSchema.index({
  name: 'text',
  nameEn: 'text',
});

// Ensure virtuals are included in JSON output
WardSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

WardSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
