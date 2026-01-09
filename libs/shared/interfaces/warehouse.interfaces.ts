/**
 * Warehouse-related TypeScript interfaces
 */

import { Schema as MongooseSchema } from 'mongoose';
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
 * Geographic location interface using GeoJSON Point format
 */
export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Province reference interface
 */
export interface IProvince {
  code: string;
  name: string;
}

/**
 * Ward reference interface
 */
export interface IWard {
  code: string;
  name: string;
}

/**
 * Address information interface
 */
export interface IAddress {
  addressDetail: string;
  ward: IWard;
  province: IProvince;
  region?: Region;
  location?: ILocation;
}

/**
 * Warehouse manager interface
 */
export interface IManager {
  id?: string;
  name: string;
}

/**
 * Capacity information interface
 */
export interface ICapacity {
  totalAreaM2?: number;
  usableAreaM2?: number;
  storageCapacity?: number;
  capacityUnit?: CapacityUnit;
  zonesCount?: number;
  racksCount?: number;
  floorsCount?: number;
}

/**
 * Temperature range interface
 */
export interface ITemperatureRange {
  min?: number;
  max?: number;
}

/**
 * Humidity range interface
 */
export interface IHumidityRange {
  min?: number;
  max?: number;
}

/**
 * Storage conditions interface
 */
export interface IStorageConditions {
  temperature?: ITemperatureRange;
  humidity?: IHumidityRange;
  specialConditions?: SpecialCondition[];
}

/**
 * Camera system interface
 */
export interface ICameraSystem {
  cameraCount?: number;
  coverage?: string;
  recordingDays?: number;
  isAIEnabled?: boolean;
}

/**
 * Access control interface
 */
export interface IAccessControl {
  system?: string;
  biometric?: boolean;
  cardAccess?: boolean;
  securityGuards?: number;
}

/**
 * Security & safety interface
 */
export interface ISecurity {
  fireProtectionCert?: string;
  securityLevel?: SecurityLevel;
  cameraSystem?: ICameraSystem;
  accessControl?: IAccessControl;
  insurancePolicy?: string;
}

/**
 * Operations interface
 */
export interface IOperations {
  manager?: IManager;
  contactPhone?: string;
  contactEmail?: string;
  workersCount?: number;
  workingShift?: WorkingShift;
  operatingHours?: string;
}

/**
 * Finance & service interface
 */
export interface IFinance {
  storageFee?: number;
  handlingFee?: number;
  currency?: Currency;
  paymentTerm?: PaymentTerm;
}

/**
 * Main Warehouse interface
 */
export interface IWarehouse {
  _id?: MongooseSchema.Types.ObjectId | string;
  
  // Identification
  warehouseId?: string;
  code: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  
  // Legal/Management
  companyName?: string;
  taxCode?: string;
  businessLicense?: string;
  warehouseLicense?: string;
  customsCode?: string;
  
  // Address (2 levels: ward and province only, NO district)
  addressDetail: string;
  ward: IWard;
  province: IProvince;
  region?: Region;
  location?: ILocation;
  
  // Capacity/Technical
  totalAreaM2?: number;
  usableAreaM2?: number;
  storageCapacity?: number;
  capacityUnit?: CapacityUnit;
  zonesCount?: number;
  racksCount?: number;
  floorsCount?: number;
  
  // Storage conditions
  temperatureMin?: number;
  temperatureMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  specialConditions?: SpecialCondition[];
  
  // Operations/Staff
  manager?: IManager;
  contactPhone?: string;
  contactEmail?: string;
  workersCount?: number;
  workingShift?: WorkingShift;
  operatingHours?: string;
  
  // Safety/Security
  fireProtectionCert?: string;
  securityLevel?: SecurityLevel;
  cameraSystem?: ICameraSystem;
  accessControl?: IAccessControl;
  insurancePolicy?: string;
  
  // Finance/Service
  storageFee?: number;
  handlingFee?: number;
  currency?: Currency;
  paymentTerm?: PaymentTerm;
  
  // Audit/Meta
  createdBy?: MongooseSchema.Types.ObjectId | string;
  updatedBy?: MongooseSchema.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  tenantId?: string;
  
  // Metadata
  metadata?: Map<string, any>;
}

/**
 * Warehouse document interface (for Mongoose documents)
 */
export interface IWarehouseDocument extends IWarehouse, Document {
  _id: MongooseSchema.Types.ObjectId;
  softDelete(): Promise<this>;
  restore(): Promise<this>;
}
