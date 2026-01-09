import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  WarehouseType,
  WarehouseStatus,
  CapacityUnit,
  SecurityLevel,
  WorkingShift,
  Region,
  PaymentTerm,
  Currency,
  SpecialCondition,
} from '../constants/warehouse.constants';

/**
 * Province sub-schema
 */
@Schema({ _id: false })
export class Province {
  @Prop({ required: true, type: String })
  code: string;

  @Prop({ required: true, type: String })
  name: string;
}

/**
 * Ward sub-schema
 */
@Schema({ _id: false })
export class Ward {
  @Prop({ required: true, type: String })
  code: string;

  @Prop({ required: true, type: String })
  name: string;
}

/**
 * Location sub-schema using GeoJSON Point format
 */
@Schema({ _id: false })
export class Location {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [longitude, latitude]
}

/**
 * Manager sub-schema
 */
@Schema({ _id: false })
export class Manager {
  @Prop({ type: String })
  id?: string;

  @Prop({ required: true, type: String })
  name: string;
}

/**
 * Camera system sub-schema
 */
@Schema({ _id: false })
export class CameraSystem {
  @Prop({ type: Number })
  cameraCount?: number;

  @Prop({ type: String })
  coverage?: string;

  @Prop({ type: Number })
  recordingDays?: number;

  @Prop({ type: Boolean, default: false })
  isAIEnabled?: boolean;
}

/**
 * Access control sub-schema
 */
@Schema({ _id: false })
export class AccessControl {
  @Prop({ type: String })
  system?: string;

  @Prop({ type: Boolean, default: false })
  biometric?: boolean;

  @Prop({ type: Boolean, default: false })
  cardAccess?: boolean;

  @Prop({ type: Number })
  securityGuards?: number;
}

// Define interface for instance methods
export interface WarehouseMethods {
  softDelete(): Promise<this>;
  restore(): Promise<this>;
}

export type WarehouseDocument = HydratedDocument<Warehouse, WarehouseMethods>;

@Schema({
  timestamps: true,
  collection: 'warehouses',
  versionKey: false,
})
export class Warehouse extends Document {
  // ========== IDENTIFICATION ==========
  @Prop({
    type: String,
    trim: true,
    index: true,
  })
  warehouseId?: string;

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
    maxlength: 200,
    index: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(WarehouseType),
    index: true,
  })
  type: WarehouseType;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(WarehouseStatus),
    default: WarehouseStatus.ACTIVE,
    index: true,
  })
  status: WarehouseStatus;

  // ========== LEGAL/MANAGEMENT ==========
  @Prop({
    type: String,
    trim: true,
    maxlength: 200,
  })
  companyName?: string;

  @Prop({
    type: String,
    trim: true,
    index: true,
  })
  taxCode?: string;

  @Prop({
    type: String,
    trim: true,
  })
  businessLicense?: string;

  @Prop({
    type: String,
    trim: true,
  })
  warehouseLicense?: string;

  @Prop({
    type: String,
    trim: true,
  })
  customsCode?: string;

  // ========== ADDRESS (2 levels: ward and province, NO district) ==========
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  })
  addressDetail: string;

  @Prop({
    type: Ward,
    required: true,
  })
  ward: Ward;

  @Prop({
    type: Province,
    required: true,
  })
  province: Province;

  @Prop({
    type: String,
    enum: Object.values(Region),
  })
  region?: Region;

  @Prop({
    type: Location,
    index: '2dsphere',
  })
  location?: Location;

  // ========== CAPACITY/TECHNICAL ==========
  @Prop({
    type: Number,
    min: 0,
  })
  totalAreaM2?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  usableAreaM2?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  storageCapacity?: number;

  @Prop({
    type: String,
    enum: Object.values(CapacityUnit),
  })
  capacityUnit?: CapacityUnit;

  @Prop({
    type: Number,
    min: 0,
  })
  zonesCount?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  racksCount?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  floorsCount?: number;

  // ========== STORAGE CONDITIONS ==========
  @Prop({
    type: Number,
    min: -100,
    max: 100,
  })
  temperatureMin?: number;

  @Prop({
    type: Number,
    min: -100,
    max: 100,
  })
  temperatureMax?: number;

  @Prop({
    type: Number,
    min: 0,
    max: 100,
  })
  humidityMin?: number;

  @Prop({
    type: Number,
    min: 0,
    max: 100,
  })
  humidityMax?: number;

  @Prop({
    type: [String],
    enum: Object.values(SpecialCondition),
    default: [],
  })
  specialConditions?: SpecialCondition[];

  // ========== OPERATIONS/STAFF ==========
  @Prop({
    type: Manager,
  })
  manager?: Manager;

  @Prop({
    type: String,
    trim: true,
    match:
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  })
  contactPhone?: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  contactEmail?: string;

  @Prop({
    type: Number,
    min: 0,
  })
  workersCount?: number;

  @Prop({
    type: String,
    enum: Object.values(WorkingShift),
  })
  workingShift?: WorkingShift;

  @Prop({
    type: String,
    trim: true,
  })
  operatingHours?: string;

  // ========== SAFETY/SECURITY ==========
  @Prop({
    type: String,
    trim: true,
  })
  fireProtectionCert?: string;

  @Prop({
    type: String,
    enum: Object.values(SecurityLevel),
  })
  securityLevel?: SecurityLevel;

  @Prop({
    type: CameraSystem,
  })
  cameraSystem?: CameraSystem;

  @Prop({
    type: AccessControl,
  })
  accessControl?: AccessControl;

  @Prop({
    type: String,
    trim: true,
  })
  insurancePolicy?: string;

  // ========== FINANCE/SERVICE ==========
  @Prop({
    type: Number,
    min: 0,
  })
  storageFee?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  handlingFee?: number;

  @Prop({
    type: String,
    enum: Object.values(Currency),
    default: Currency.VND,
  })
  currency?: Currency;

  @Prop({
    type: String,
    enum: Object.values(PaymentTerm),
  })
  paymentTerm?: PaymentTerm;

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
    type: Date,
    default: null,
  })
  deletedAt?: Date;

  @Prop({
    type: String,
    index: true,
  })
  tenantId?: string;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

// ========== INDEXES ==========

// Unique index on code (already defined with unique: true, but for clarity)
WarehouseSchema.index({ code: 1 }, { unique: true });

// Index on taxCode
WarehouseSchema.index({ taxCode: 1 });

// Compound index on province.code and ward.code
WarehouseSchema.index({ 'province.code': 1, 'ward.code': 1 });

// Text index for search on name and companyName
WarehouseSchema.index({
  name: 'text',
  companyName: 'text',
});

// 2dsphere index for geo queries (already defined in @Prop but for clarity)
WarehouseSchema.index({ location: '2dsphere' });

// Compound indexes for multi-tenant support
WarehouseSchema.index({ tenantId: 1, code: 1 }, { unique: true, sparse: true });
WarehouseSchema.index({ tenantId: 1, status: 1 });

// Additional useful indexes
WarehouseSchema.index({ type: 1, status: 1 });
WarehouseSchema.index({ region: 1, status: 1 });

// TTL index for soft-deleted warehouses (optional: auto-delete after 730 days / 2 years)
WarehouseSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 63072000 });

// ========== VIRTUALS ==========

WarehouseSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

WarehouseSchema.virtual('isActive').get(function () {
  return this.status === WarehouseStatus.ACTIVE;
});

WarehouseSchema.virtual('fullAddress').get(function () {
  return `${this.addressDetail}, ${this.ward.name}, ${this.province.name}`;
});

// ========== JSON/OBJECT TRANSFORMATION ==========

WarehouseSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

WarehouseSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// ========== MIDDLEWARE ==========

// Middleware to exclude soft-deleted documents by default
WarehouseSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// ========== METHODS ==========

// Add soft delete method
WarehouseSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.status = WarehouseStatus.INACTIVE;
  return this.save();
};

// Add restore method
WarehouseSchema.methods.restore = function () {
  this.deletedAt = null;
  this.status = WarehouseStatus.ACTIVE;
  return this.save();
};
