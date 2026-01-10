/**
 * Product and inventory-related constants and enums
 */

/**
 * Scope for products (global or organization-specific)
 */
export enum ProductScope {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
}

/**
 * Product types
 */
export enum ProductType {
  // Raw materials and components
  RAW_MATERIAL = 'raw_material',
  COMPONENT = 'component',
  INGREDIENT = 'ingredient',
  
  // Manufacturing and production
  FINISHED_GOOD = 'finished_good',
  SEMI_FINISHED = 'semi_finished',
  WORK_IN_PROGRESS = 'work_in_progress',
  BY_PRODUCT = 'by_product',
  
  // Packaging and containers
  PACKAGING = 'packaging',
  CONTAINER = 'container',
  
  // Maintenance and operations
  CONSUMABLE = 'consumable',
  SPARE_PART = 'spare_part',
  TOOL = 'tool',
  EQUIPMENT = 'equipment',
  MACHINERY = 'machinery',
  
  // Trade goods (Vietnam specific)
  MERCHANDISE = 'merchandise',        // Hàng hóa thương mại
  AGRICULTURAL = 'agricultural',      // Nông sản
  SEAFOOD = 'seafood',               // Thủy sản
  HANDICRAFT = 'handicraft',         // Thủ công mỹ nghệ
  TEXTILE = 'textile',               // Hàng dệt may
  ELECTRONICS = 'electronics',        // Điện tử
  FURNITURE = 'furniture',           // Nội thất
  
  // Food and beverage
  FOOD = 'food',                     // Thực phẩm
  BEVERAGE = 'beverage',             // Đồ uống
  FRESH_PRODUCE = 'fresh_produce',   // Nông sản tươi
  PROCESSED_FOOD = 'processed_food', // Thực phẩm chế biến
  
  // Healthcare and pharma
  MEDICINE = 'medicine',             // Thuốc
  MEDICAL_DEVICE = 'medical_device', // Thiết bị y tế
  COSMETIC = 'cosmetic',             // Mỹ phẩm
  
  // Services and intangibles
  SERVICE = 'service',
  DIGITAL = 'digital',
  SOFTWARE = 'software',
  
  // Other common types
  BOOK = 'book',                     // Sách
  STATIONERY = 'stationery',         // Văn phòng phẩm
  TOY = 'toy',                       // Đồ chơi
  JEWELRY = 'jewelry',               // Trang sức
  VEHICLE = 'vehicle',               // Phương tiện
  SPARE_VEHICLE_PART = 'spare_vehicle_part', // Phụ tùng xe
}

/**
 * Product status
 */
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  DRAFT = 'draft',
}

/**
 * Unit of measurement for products
 */
export enum Unit {
  // Weight
  KG = 'kg',
  G = 'g',
  TON = 'ton',
  LB = 'lb',
  
  // Volume
  LITER = 'liter',
  ML = 'ml',
  M3 = 'm3',
  GALLON = 'gallon',
  
  // Length
  METER = 'meter',
  CM = 'cm',
  MM = 'mm',
  INCH = 'inch',
  
  // Area
  M2 = 'm2',
  SQF = 'sqf',
  
  // Count
  PIECE = 'piece',
  BOX = 'box',
  CARTON = 'carton',
  PALLET = 'pallet',
  CONTAINER = 'container',
  PACK = 'pack',
  SET = 'set',
  PAIR = 'pair',
  DOZEN = 'dozen',
}

/**
 * Hazard level for dangerous goods
 */
export enum HazardLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPLOSIVE = 'explosive',
  FLAMMABLE = 'flammable',
  OXIDIZING = 'oxidizing',
  TOXIC = 'toxic',
  CORROSIVE = 'corrosive',
  RADIOACTIVE = 'radioactive',
}

/**
 * Storage requirement types
 */
export enum StorageRequirement {
  AMBIENT = 'ambient',
  REFRIGERATED = 'refrigerated',
  FROZEN = 'frozen',
  DRY = 'dry',
  TEMPERATURE_CONTROLLED = 'temperature_controlled',
  HUMIDITY_CONTROLLED = 'humidity_controlled',
  LIGHT_PROTECTED = 'light_protected',
  VENTILATED = 'ventilated',
  SECURE = 'secure',
}

/**
 * Transaction types for inventory
 */
export enum InventoryTransactionType {
  IN = 'in',           // Receipt/Purchase
  OUT = 'out',         // Sale/Consumption
  TRANSFER = 'transfer', // Transfer between warehouses
  ADJUSTMENT = 'adjustment', // Stock adjustment
  RETURN = 'return',   // Return from customer/to supplier
  DISPOSE = 'dispose', // Disposal/Scrap
  PRODUCE = 'produce', // Manufacturing
  CONSUME = 'consume', // Material consumption in production
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Inventory valuation methods
 */
export enum ValuationMethod {
  FIFO = 'fifo',       // First In First Out
  LIFO = 'lifo',       // Last In First Out
  AVERAGE = 'average', // Weighted Average
  SPECIFIC = 'specific', // Specific Identification
}

/**
 * Tracking type for inventory
 */
export enum TrackingType {
  NONE = 'none',
  LOT = 'lot',
  SERIAL = 'serial',
}
