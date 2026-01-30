import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ProductCategoryDocument = HydratedDocument<ProductCategory>;

/**
 * ProductCategory Schema - Hierarchical product category management
 * Supports tree structure with parent-child relationships
 */
@Schema({
  timestamps: true,
  collection: 'product_categories',
  versionKey: false,
})
export class ProductCategory extends Document {
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
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProductCategory',
    default: null,
    index: true,
  })
  parentId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    default: '/',
    index: true,
  })
  path: string; // Materialized path for efficient tree queries, e.g., "/root_id/child_id"

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  level: number; // Tree depth level for convenience

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
    type: Number,
    default: 0,
    min: 0,
  })
  order: number; // Display order within same parent

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

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);

// ========== INDEXES ==========

// Compound index for hierarchy queries
ProductCategorySchema.index({ parentId: 1, order: 1 });

// Index for path-based queries (tree traversal)
ProductCategorySchema.index({ path: 1 });

// Index for active categories
ProductCategorySchema.index({ isActive: 1 });

// Text index for search
ProductCategorySchema.index({
  name: 'text',
  description: 'text',
  code: 'text',
});

// ========== MIDDLEWARE ==========

// Middleware to exclude soft-deleted documents by default
ProductCategorySchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Pre-save middleware to update path and level
ProductCategorySchema.pre('save', async function () {
  if (this.isNew || this.isModified('parentId')) {
    if (this.parentId) {
      // Get parent category
      const parent = (await this.model('ProductCategory').findById(
        this.parentId,
      )) as ProductCategoryDocument | null;
      if (parent) {
        this.path = `${parent.path}${this._id}/`;
        this.level = parent.level + 1;
      } else {
        this.path = `/${this._id}/`;
        this.level = 0;
      }
    } else {
      this.path = `/${this._id}/`;
      this.level = 0;
    }
  }
});

// ========== METHODS ==========

ProductCategorySchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

ProductCategorySchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// ========== JSON/OBJECT TRANSFORMATION ==========

ProductCategorySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

ProductCategorySchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
