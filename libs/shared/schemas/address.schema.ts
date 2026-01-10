import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AddressDocument = HydratedDocument<Address>;

/**
 * Address scope - determines visibility and access control
 */
export enum AddressScope {
  GLOBAL = 'global', // Personal address for a user
  ORGANIZATION = 'organization', // Address belonging to an organization
}

/**
 * Address type classification
 */
export enum AddressType {
  SHIPPING = 'shipping',
  BILLING = 'billing',
  WAREHOUSE = 'warehouse',
  OFFICE = 'office',
  PERSONAL = 'personal',
  OTHER = 'other',
}

/**
 * Administrative unit snapshot embedded in address
 * Stores province/district/ward data as snapshot to preserve historical accuracy
 */
@Schema({ _id: false, versionKey: false })
export class AdministrativeUnitSnapshot {
  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  nameEn?: string;
}

const AdministrativeUnitSnapshotSchema = SchemaFactory.createForClass(
  AdministrativeUnitSnapshot,
);

/**
 * Address schema for storing user-input addresses
 * Includes snapshot of administrative data to maintain historical accuracy
 */
@Schema({
  timestamps: true,
  collection: 'addresses',
  versionKey: false,
})
export class Address extends Document {
  @Prop({
    type: String,
    enum: Object.values(AddressScope),
    required: true,
    index: true,
  })
  scope: AddressScope;

  @Prop({
    type: String,
    enum: Object.values(AddressType),
    required: true,
    default: AddressType.PERSONAL,
  })
  type: AddressType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  })
  organizationId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  })
  addressLine1: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 200,
  })
  addressLine2?: string;

  // Administrative unit snapshots - preserve data even if master data changes
  @Prop({
    type: AdministrativeUnitSnapshotSchema,
    required: true,
  })
  province: AdministrativeUnitSnapshot;

  @Prop({
    type: AdministrativeUnitSnapshotSchema,
  })
  district?: AdministrativeUnitSnapshot;

  @Prop({
    type: AdministrativeUnitSnapshotSchema,
  })
  ward?: AdministrativeUnitSnapshot;

  @Prop({
    type: String,
    trim: true,
    maxlength: 20,
  })
  postalCode?: string;

  @Prop({
    type: String,
    default: 'VN',
    maxlength: 3,
  })
  countryCode?: string;

  // Contact information
  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
  })
  contactName?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 20,
  })
  contactPhone?: string;

  // Geocoding data (optional)
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
  })
  location?: {
    type: string;
    coordinates: number[];
  };

  // Metadata
  @Prop({
    type: Boolean,
    default: false,
  })
  isDefault?: boolean;

  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
  })
  label?: string;

  @Prop({
    type: String,
    maxlength: 500,
  })
  notes?: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isDeleted?: boolean;

  @Prop({
    type: Date,
  })
  deletedAt?: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Compound indexes for efficient queries
AddressSchema.index({ scope: 1, userId: 1 });
AddressSchema.index({ scope: 1, organizationId: 1 });
AddressSchema.index({ 'province.code': 1 });
AddressSchema.index({ 'district.code': 1 });
AddressSchema.index({ 'ward.code': 1 });
AddressSchema.index({ isDeleted: 1, scope: 1 });

// Text search index
AddressSchema.index({
  addressLine1: 'text',
  addressLine2: 'text',
  'province.name': 'text',
  'district.name': 'text',
  'ward.name': 'text',
  contactName: 'text',
  label: 'text',
});

// Ensure virtuals are included in JSON output
AddressSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

AddressSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
