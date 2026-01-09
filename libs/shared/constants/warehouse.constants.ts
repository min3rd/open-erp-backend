/**
 * Warehouse-related constants and enums
 */

/**
 * Warehouse types enum
 */
export enum WarehouseType {
  GENERAL = 'general',
  COLD_STORAGE = 'cold_storage',
  BONDED = 'bonded',
  DISTRIBUTION_CENTER = 'distribution_center',
  CROSS_DOCK = 'cross_dock',
  AUTOMATED = 'automated',
  HAZMAT = 'hazmat',
  PHARMACEUTICAL = 'pharmaceutical',
  FOOD_GRADE = 'food_grade',
  TEXTILE = 'textile',
  ELECTRONICS = 'electronics',
  CUSTOMS = 'customs',
}

/**
 * Warehouse status enum
 */
export enum WarehouseStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

/**
 * Capacity unit enum
 */
export enum CapacityUnit {
  TON = 'TON',
  PALLET = 'PALLET',
  M3 = 'M3',
  CONTAINER = 'CONTAINER',
}

/**
 * Security level enum
 */
export enum SecurityLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  HIGH = 'high',
  MAXIMUM = 'maximum',
}

/**
 * Working shift type enum
 */
export enum WorkingShift {
  DAY = 'day',
  NIGHT = 'night',
  FULL_TIME = 'full_time',
  TWENTY_FOUR_SEVEN = '24/7',
}

/**
 * Region enum for Vietnam
 */
export enum Region {
  NORTHERN = 'northern',
  CENTRAL = 'central',
  SOUTHERN = 'southern',
  HIGHLAND = 'highland',
}

/**
 * Payment term enum
 */
export enum PaymentTerm {
  PREPAID = 'prepaid',
  NET_7 = 'net_7',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  COD = 'cod',
}

/**
 * Currency enum
 */
export enum Currency {
  VND = 'VND',
  USD = 'USD',
  EUR = 'EUR',
}

/**
 * Special storage condition types
 */
export enum SpecialCondition {
  TEMPERATURE_CONTROLLED = 'temperature_controlled',
  HUMIDITY_CONTROLLED = 'humidity_controlled',
  HAZMAT_CERTIFIED = 'hazmat_certified',
  FOOD_SAFETY_CERTIFIED = 'food_safety_certified',
  PHARMACEUTICAL_CERTIFIED = 'pharmaceutical_certified',
  FIREPROOF = 'fireproof',
  EARTHQUAKE_RESISTANT = 'earthquake_resistant',
  FLOOD_PROTECTED = 'flood_protected',
  PEST_CONTROLLED = 'pest_controlled',
  CLEAN_ROOM = 'clean_room',
}
