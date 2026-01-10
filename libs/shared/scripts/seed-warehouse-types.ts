/**
 * Seed script for warehouse types
 */

import { connect, connection } from 'mongoose';
import { WarehouseTypeSchema } from '../schemas/warehouse-type.schema';
import { WarehouseType } from '../constants/warehouse.constants';

// Warehouse types master data
const warehouseTypesData = [
  {
    code: WarehouseType.GENERAL,
    name: 'Kho tổng hợp',
    nameEn: 'General Warehouse',
    description: 'Kho lưu trữ hàng hóa tổng hợp, đa mục đích',
    isActive: true,
    sortOrder: 1,
  },
  {
    code: WarehouseType.COLD_STORAGE,
    name: 'Kho lạnh',
    nameEn: 'Cold Storage',
    description: 'Kho bảo quản hàng hóa ở nhiệt độ thấp',
    isActive: true,
    sortOrder: 2,
  },
  {
    code: WarehouseType.BONDED,
    name: 'Kho ngoại quan',
    nameEn: 'Bonded Warehouse',
    description: 'Kho hàng ngoại quan, tạm nhập tái xuất',
    isActive: true,
    sortOrder: 3,
  },
  {
    code: WarehouseType.DISTRIBUTION_CENTER,
    name: 'Trung tâm phân phối',
    nameEn: 'Distribution Center',
    description: 'Trung tâm phân phối hàng hóa',
    isActive: true,
    sortOrder: 4,
  },
  {
    code: WarehouseType.CROSS_DOCK,
    name: 'Kho cross-dock',
    nameEn: 'Cross-dock Warehouse',
    description: 'Kho chuyển hàng trực tiếp, không lưu trữ lâu dài',
    isActive: true,
    sortOrder: 5,
  },
  {
    code: WarehouseType.AUTOMATED,
    name: 'Kho tự động',
    nameEn: 'Automated Warehouse',
    description: 'Kho có hệ thống tự động hóa cao',
    isActive: true,
    sortOrder: 6,
  },
  {
    code: WarehouseType.HAZMAT,
    name: 'Kho hàng nguy hiểm',
    nameEn: 'Hazardous Materials Warehouse',
    description: 'Kho lưu trữ hàng nguy hiểm, hóa chất',
    isActive: true,
    sortOrder: 7,
  },
  {
    code: WarehouseType.PHARMACEUTICAL,
    name: 'Kho dược phẩm',
    nameEn: 'Pharmaceutical Warehouse',
    description: 'Kho lưu trữ dược phẩm, y tế',
    isActive: true,
    sortOrder: 8,
  },
  {
    code: WarehouseType.FOOD_GRADE,
    name: 'Kho thực phẩm',
    nameEn: 'Food Grade Warehouse',
    description: 'Kho lưu trữ thực phẩm đạt tiêu chuẩn an toàn',
    isActive: true,
    sortOrder: 9,
  },
  {
    code: WarehouseType.TEXTILE,
    name: 'Kho dệt may',
    nameEn: 'Textile Warehouse',
    description: 'Kho lưu trữ hàng dệt may',
    isActive: true,
    sortOrder: 10,
  },
  {
    code: WarehouseType.ELECTRONICS,
    name: 'Kho điện tử',
    nameEn: 'Electronics Warehouse',
    description: 'Kho lưu trữ thiết bị điện tử',
    isActive: true,
    sortOrder: 11,
  },
  {
    code: WarehouseType.CUSTOMS,
    name: 'Kho hải quan',
    nameEn: 'Customs Warehouse',
    description: 'Kho hải quan, kiểm soát hàng xuất nhập khẩu',
    isActive: true,
    sortOrder: 12,
  },
];

async function seedWarehouseTypes() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/open-erp';

  try {
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const WarehouseTypeMaster = connection.model(
      'WarehouseTypeMaster',
      WarehouseTypeSchema,
    );

    // Clear existing data (optional)
    console.log('Clearing existing warehouse types...');
    await WarehouseTypeMaster.deleteMany({});

    // Insert warehouse types
    console.log('Inserting warehouse types...');
    const inserted = await WarehouseTypeMaster.insertMany(warehouseTypesData);
    console.log(`Inserted ${inserted.length} warehouse types`);

    console.log('Warehouse types seed completed successfully!');
  } catch (error) {
    console.error('Error seeding warehouse types:', error);
    throw error;
  } finally {
    await connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedWarehouseTypes()
    .then(() => {
      console.log('Warehouse types seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Warehouse types seeding failed:', error);
      process.exit(1);
    });
}

export { seedWarehouseTypes, warehouseTypesData };
