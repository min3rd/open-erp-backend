import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * Product Version Schema - Stores historical snapshots of product changes
 * This allows tracking complete history and rollback capabilities
 */

export type ProductVersionDocument = HydratedDocument<ProductVersion>;

@Schema({
  timestamps: true,
  collection: 'product_versions',
  versionKey: false,
})
export class ProductVersion extends Document {
  // ========== REFERENCE ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  // ========== VERSION INFO ==========
  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  version: number;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  })
  versionDate: Date;

  // ========== SNAPSHOT DATA ==========
  // Store complete product data as snapshot
  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  data: any;

  // ========== CHANGE TRACKING ==========
  @Prop({
    type: String,
    maxlength: 500,
  })
  changeReason?: string;

  @Prop({
    type: [String],
    default: [],
  })
  changedFields: string[];

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  changes?: any; // Diff object showing what changed

  // ========== AUDIT ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const ProductVersionSchema = SchemaFactory.createForClass(ProductVersion);

// ========== INDEXES ==========

// Compound index for efficient version queries
ProductVersionSchema.index({ productId: 1, version: -1 });
ProductVersionSchema.index({ productId: 1, versionDate: -1 });

// Index for audit queries
ProductVersionSchema.index({ createdBy: 1, versionDate: -1 });

// ========== JSON/OBJECT TRANSFORMATION ==========

ProductVersionSchema.set('toJSON', {
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

ProductVersionSchema.set('toObject', {
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
