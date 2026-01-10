import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import type { AdminGeometry, GeometryMeta } from '@shared/types/geometry.types';

export type GeometryVersionDocument = HydratedDocument<GeometryVersion>;

/**
 * Schema for tracking geometry version history
 */
@Schema({
  timestamps: true,
  collection: 'geometry_versions',
  versionKey: false,
})
export class GeometryVersion extends Document {
  @Prop({
    type: String,
    required: true,
    enum: ['province', 'district', 'ward'],
    index: true,
  })
  entityType: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  entityCode: string;

  @Prop({
    type: Number,
    required: true,
  })
  version: number;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  geometry: AdminGeometry;

  @Prop({
    type: String,
  })
  updatedBy?: string;

  @Prop({
    type: String,
  })
  changeDescription?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  geometryMeta?: GeometryMeta;

  @Prop({
    type: Date,
    default: Date.now,
  })
  snapshotDate: Date;
}

export const GeometryVersionSchema =
  SchemaFactory.createForClass(GeometryVersion);

// Compound index for efficient version queries
GeometryVersionSchema.index({ entityType: 1, entityCode: 1, version: -1 });

// Ensure virtuals are included in JSON output
GeometryVersionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

GeometryVersionSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
