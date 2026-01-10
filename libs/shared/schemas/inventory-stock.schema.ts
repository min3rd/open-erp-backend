import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ValuationMethod } from '../constants/product.constants';

/**
 * Product snapshot for stock (minimal fields needed for history)
 */
@Schema({ _id: false })
export class StockProductSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  sku: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  unit: string;

  @Prop({ type: String })
  hazardLevel?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  storageRequirements?: any;
}

/**
 * Lot/Batch tracking information
 */
@Schema({ _id: false })
export class LotInfo {
  @Prop({ required: true, type: String })
  lotNumber: string;

  @Prop({ type: Date })
  manufactureDate?: Date;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  quantity: number;

  @Prop({ type: Number, min: 0 })
  costPerUnit?: number;
}

// Define interface for instance methods
export interface InventoryStockMethods {
  addQuantity(quantity: number, lotInfo?: LotInfo): Promise<this>;
  removeQuantity(quantity: number, lotNumber?: string): Promise<this>;
  adjustQuantity(newQuantity: number, reason?: string): Promise<this>;
}

export type InventoryStockDocument = HydratedDocument<
  InventoryStock,
  InventoryStockMethods
>;

@Schema({
  timestamps: true,
  collection: 'inventory_stocks',
  versionKey: false,
})
export class InventoryStock extends Document {
  // ========== REFERENCES ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: StockProductSnapshot,
    required: true,
  })
  productSnapshot: StockProductSnapshot;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true,
  })
  warehouseId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  })
  organizationId?: MongooseSchema.Types.ObjectId;

  // ========== QUANTITIES ==========
  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  availableQuantity: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  reservedQuantity: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  damagedQuantity: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  inTransitQuantity: number;

  // ========== LOT/BATCH TRACKING ==========
  @Prop({
    type: [LotInfo],
    default: [],
  })
  lots: LotInfo[];

  // ========== VALUATION ==========
  @Prop({
    type: String,
    enum: Object.values(ValuationMethod),
    default: ValuationMethod.AVERAGE,
  })
  valuationMethod: ValuationMethod;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  averageCost: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  totalValue: number;

  // ========== LOCATION ==========
  @Prop({
    type: String,
    trim: true,
  })
  zone?: string;

  @Prop({
    type: String,
    trim: true,
  })
  aisle?: string;

  @Prop({
    type: String,
    trim: true,
  })
  rack?: string;

  @Prop({
    type: String,
    trim: true,
  })
  bin?: string;

  // ========== LAST MOVEMENT ==========
  @Prop({
    type: Date,
  })
  lastMovementDate?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'InventoryTransaction',
  })
  lastTransactionId?: MongooseSchema.Types.ObjectId;

  // ========== AUDIT/META ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const InventoryStockSchema =
  SchemaFactory.createForClass(InventoryStock);

// ========== INDEXES ==========

// Unique index for product-warehouse combination
InventoryStockSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

// Compound indexes for queries
InventoryStockSchema.index({ warehouseId: 1, availableQuantity: 1 });
InventoryStockSchema.index({ organizationId: 1, productId: 1 });
InventoryStockSchema.index({ productId: 1, availableQuantity: 1 });

// Index for expiry tracking
InventoryStockSchema.index({ 'lots.expiryDate': 1 });

// Index for location queries
InventoryStockSchema.index({
  warehouseId: 1,
  zone: 1,
  aisle: 1,
  rack: 1,
  bin: 1,
});

// ========== VIRTUALS ==========

InventoryStockSchema.virtual('totalQuantity').get(function () {
  return (
    this.availableQuantity +
    this.reservedQuantity +
    this.damagedQuantity +
    this.inTransitQuantity
  );
});

InventoryStockSchema.virtual('location').get(function () {
  const parts = [this.zone, this.aisle, this.rack, this.bin].filter(Boolean);
  return parts.length > 0 ? parts.join('-') : null;
});

// ========== JSON/OBJECT TRANSFORMATION ==========

InventoryStockSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

InventoryStockSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// ========== METHODS ==========

// Add quantity method
InventoryStockSchema.methods.addQuantity = function (
  quantity: number,
  lotInfo?: LotInfo,
) {
  if (quantity < 0) {
    throw new Error('Quantity to add must be positive');
  }

  this.availableQuantity += quantity;
  this.lastMovementDate = new Date();

  if (lotInfo) {
    this.lots.push(lotInfo);
  }

  return this.save();
};

// Remove quantity method
InventoryStockSchema.methods.removeQuantity = function (
  quantity: number,
  lotNumber?: string,
) {
  if (quantity < 0) {
    throw new Error('Quantity to remove must be positive');
  }

  if (quantity > this.availableQuantity) {
    throw new Error('Insufficient stock available');
  }

  this.availableQuantity -= quantity;
  this.lastMovementDate = new Date();

  // If lot tracking, update lot quantities
  if (lotNumber && this.lots.length > 0) {
    const lot = this.lots.find((l) => l.lotNumber === lotNumber);
    if (lot) {
      lot.quantity -= quantity;
      if (lot.quantity <= 0) {
        this.lots = this.lots.filter((l) => l.lotNumber !== lotNumber);
      }
    }
  }

  return this.save();
};

// Adjust quantity method
InventoryStockSchema.methods.adjustQuantity = function (
  newQuantity: number,
  reason?: string,
) {
  if (newQuantity < 0) {
    throw new Error('New quantity must be non-negative');
  }

  this.availableQuantity = newQuantity;
  this.lastMovementDate = new Date();

  if (reason) {
    if (!this.metadata) {
      this.metadata = new Map();
    }
    this.metadata.set('lastAdjustmentReason', reason);
  }

  return this.save();
};
