import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ProvinceDocument = HydratedDocument<Province>;

@Schema({
  timestamps: true,
  collection: 'provinces',
  versionKey: false,
})
export class Province extends Document {
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
    trim: true,
  })
  region?: string;

  @Prop({
    type: Number,
  })
  sortOrder?: number;
}

export const ProvinceSchema = SchemaFactory.createForClass(Province);

// Text index for search
ProvinceSchema.index({
  name: 'text',
  nameEn: 'text',
});

// Ensure virtuals are included in JSON output
ProvinceSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

ProvinceSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
