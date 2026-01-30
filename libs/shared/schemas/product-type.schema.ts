import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * Attribute definition sub-schema for ProductType
 * Defines custom attributes specific to each product type
 */
@Schema({ _id: false })
export class AttributeDefinition {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({
    required: true,
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'select'],
  })
  type: string;

  @Prop({ type: String })
  label?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: false })
  required: boolean;

  @Prop({ type: [String], default: [] })
  options?: string[]; // For select type

  @Prop({ type: String })
  defaultValue?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  validation?: Record<string, any>; // Additional validation rules
}

export type ProductTypeDocument = HydratedDocument<ProductType>;

/**
 * ProductType Schema - Dynamic product type management
 * Replaces hardcoded ProductType enum
 */
@Schema({
  timestamps: true,
  collection: 'product_types',
  versionKey: false,
})
export class ProductType extends Document {
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
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;

  @Prop({
    type: [AttributeDefinition],
    default: [],
  })
  attributes: AttributeDefinition[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const ProductTypeSchema = SchemaFactory.createForClass(ProductType);

// ========== INDEXES ==========

// Index for active types
ProductTypeSchema.index({ isActive: 1 });

// Text index for search
ProductTypeSchema.index({ name: 'text', description: 'text', code: 'text' });

// ========== MIDDLEWARE ==========

// Middleware to exclude soft-deleted documents by default
ProductTypeSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// ========== METHODS ==========

ProductTypeSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

ProductTypeSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// ========== JSON/OBJECT TRANSFORMATION ==========

ProductTypeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

ProductTypeSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
