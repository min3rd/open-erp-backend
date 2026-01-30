import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  ProductScope,
  ProductType,
  ProductStatus,
  Unit,
  HazardLevel,
  StorageRequirement,
  TrackingType,
} from '../constants/product.constants';

// TTL expiration time for soft-deleted products (2 years)
const TTL_SOFT_DELETE_SECONDS = 2 * 365 * 24 * 60 * 60; // 63072000 seconds

/**
 * Custom attributes sub-schema
 */
@Schema({ _id: false })
export class CustomAttribute {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  value: string;

  @Prop({ type: String })
  unit?: string;
}

/**
 * Storage conditions sub-schema
 */
@Schema({ _id: false })
export class StorageConditions {
  @Prop({ type: Number, min: -100, max: 100 })
  temperatureMin?: number;

  @Prop({ type: Number, min: -100, max: 100 })
  temperatureMax?: number;

  @Prop({ type: Number, min: 0, max: 100 })
  humidityMin?: number;

  @Prop({ type: Number, min: 0, max: 100 })
  humidityMax?: number;

  @Prop({
    type: [String],
    enum: Object.values(StorageRequirement),
    default: [],
  })
  requirements: StorageRequirement[];

  @Prop({ type: String })
  specialInstructions?: string;
}

/**
 * Dimensions sub-schema
 */
@Schema({ _id: false })
export class Dimensions {
  @Prop({ type: Number, min: 0 })
  length?: number;

  @Prop({ type: Number, min: 0 })
  width?: number;

  @Prop({ type: Number, min: 0 })
  height?: number;

  @Prop({ type: String, enum: Object.values(Unit), default: Unit.CM })
  unit: Unit;

  @Prop({ type: Number, min: 0 })
  weight?: number;

  @Prop({ type: String, enum: Object.values(Unit), default: Unit.KG })
  weightUnit: Unit;
}

/**
 * Category snapshot (embedded data)
 */
@Schema({ _id: false })
export class CategorySnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String })
  code?: string;

  @Prop({ type: String })
  description?: string;
}

/**
 * Media item sub-schema (images, videos, documents)
 */
@Schema({ _id: false })
export class MediaItem {
  @Prop({ required: true, type: String, enum: ['image', 'video', 'document'] })
  type: string;

  @Prop({ required: true, type: String })
  url: string;

  @Prop({ type: String })
  title?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: Number, min: 0 })
  size?: number; // Size in bytes

  @Prop({ type: Number, min: 0, default: 0 })
  order: number; // Display order

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean; // Primary/featured image
}

// Define interface for instance methods
export interface ProductMethods {
  softDelete(): Promise<this>;
  restore(): Promise<this>;
  createVersion(): Promise<any>;
}

export type ProductDocument = HydratedDocument<Product, ProductMethods>;

@Schema({
  timestamps: true,
  collection: 'products',
  versionKey: false,
})
export class Product extends Document {
  // ========== IDENTIFICATION ==========
  @Prop({
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  sku: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
    index: true,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
  })
  internationalName?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 2000,
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
    index: true,
  })
  barcode?: string;

  // ========== MEDIA ==========
  @Prop({
    type: [MediaItem],
    default: [],
  })
  media: MediaItem[];

  // ========== SCOPE & OWNERSHIP ==========
  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProductScope),
    default: ProductScope.ORGANIZATION,
    index: true,
  })
  scope: ProductScope;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  })
  organizationId?: MongooseSchema.Types.ObjectId;

  // ========== CLASSIFICATION ==========
  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProductType),
    index: true,
  })
  type: ProductType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProductType',
    index: true,
  })
  typeId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: CategorySnapshot,
  })
  category?: CategorySnapshot;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProductCategory',
    index: true,
  })
  categoryId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProductStatus),
    default: ProductStatus.DRAFT,
    index: true,
  })
  status: ProductStatus;

  // ========== UNIT & TRACKING ==========
  @Prop({
    type: String,
    required: true,
    enum: Object.values(Unit),
  })
  unit: Unit;

  @Prop({
    type: String,
    enum: Object.values(TrackingType),
    default: TrackingType.NONE,
  })
  trackingType: TrackingType;

  @Prop({
    type: Boolean,
    default: false,
  })
  hasExpiryDate: boolean;

  @Prop({
    type: Number,
    min: 0,
  })
  shelfLifeDays?: number;

  // ========== PHYSICAL ATTRIBUTES ==========
  @Prop({
    type: Dimensions,
  })
  dimensions?: Dimensions;

  // ========== SAFETY & STORAGE ==========
  @Prop({
    type: String,
    enum: Object.values(HazardLevel),
    default: HazardLevel.NONE,
  })
  hazardLevel: HazardLevel;

  @Prop({
    type: StorageConditions,
  })
  storageConditions?: StorageConditions;

  // ========== INVENTORY THRESHOLDS ==========
  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  minStockLevel: number;

  @Prop({
    type: Number,
    min: 0,
  })
  maxStockLevel?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  reorderPoint?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  reorderQuantity?: number;

  // ========== CUSTOM ATTRIBUTES ==========
  @Prop({
    type: [CustomAttribute],
    default: [],
  })
  customAttributes: CustomAttribute[];

  // ========== VERSIONING ==========
  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  currentVersion: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  versionCreatedAt: Date;

  // ========== AUDIT/META ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
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

export const ProductSchema = SchemaFactory.createForClass(Product);

// ========== INDEXES ==========

// Unique index for SKU within organization scope
ProductSchema.index(
  { organizationId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { scope: ProductScope.ORGANIZATION },
  },
);

// Unique index for global scope SKU
ProductSchema.index(
  { sku: 1 },
  {
    unique: true,
    partialFilterExpression: { scope: ProductScope.GLOBAL },
  },
);

// Text index for search
ProductSchema.index({
  name: 'text',
  internationalName: 'text',
  description: 'text',
  sku: 'text',
});

// Compound indexes
ProductSchema.index({ scope: 1, status: 1 });
ProductSchema.index({ type: 1, status: 1 });
ProductSchema.index({ organizationId: 1, type: 1, status: 1 });
ProductSchema.index({ barcode: 1 }, { sparse: true });

// TTL index for soft-deleted products (auto-delete after 2 years)
ProductSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: TTL_SOFT_DELETE_SECONDS },
);

// ========== VIRTUALS ==========

ProductSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

ProductSchema.virtual('isActive').get(function () {
  return this.status === ProductStatus.ACTIVE;
});

// ========== JSON/OBJECT TRANSFORMATION ==========

ProductSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

ProductSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// ========== MIDDLEWARE ==========

// Middleware to exclude soft-deleted documents by default
ProductSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// ========== METHODS ==========

// Add soft delete method
ProductSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.status = ProductStatus.INACTIVE;
  return this.save();
};

// Add restore method
ProductSchema.methods.restore = function () {
  this.deletedAt = null;
  this.status = ProductStatus.ACTIVE;
  return this.save();
};
