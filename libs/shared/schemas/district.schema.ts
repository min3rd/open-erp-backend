import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import type {
  AdminGeometry,
  Centroid,
  BBox,
  GeometryMeta,
} from '@shared/types/geometry.types';
import { GeometrySource } from '@shared/types/geometry.types';

export type DistrictDocument = HydratedDocument<District>;

@Schema({
  timestamps: true,
  collection: 'districts',
  versionKey: false,
})
export class District extends Document {
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

  // Geometry fields for GeoJSON support
  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
  })
  geometry?: AdminGeometry;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
  })
  geometrySimplified?: AdminGeometry;

  @Prop({
    type: Object,
    required: false,
  })
  centroid?: Centroid;

  @Prop({
    type: [Number],
    required: false,
  })
  bbox?: BBox;

  @Prop({
    type: Number,
    required: false,
  })
  areaSqKm?: number;

  @Prop({
    type: String,
    enum: Object.values(GeometrySource),
    required: false,
  })
  geometrySource?: GeometrySource;

  @Prop({
    type: Number,
    default: 1,
  })
  geometryVersion?: number;

  @Prop({
    type: Date,
  })
  geometryUpdatedAt?: Date;

  @Prop({
    type: String,
  })
  geometryUpdatedBy?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  geometryMeta?: GeometryMeta;
}

export const DistrictSchema = SchemaFactory.createForClass(District);

// Compound index for efficient queries
DistrictSchema.index({ provinceCode: 1, code: 1 });
DistrictSchema.index({ provinceCode: 1, name: 1 });

// Text index for search
DistrictSchema.index({
  name: 'text',
  nameEn: 'text',
});

// 2dsphere index for spatial queries
DistrictSchema.index({ geometry: '2dsphere' });

// Compound index for centroid-based queries
DistrictSchema.index({ 'centroid.lat': 1, 'centroid.lon': 1 });

// Ensure virtuals are included in JSON output
DistrictSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

DistrictSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
