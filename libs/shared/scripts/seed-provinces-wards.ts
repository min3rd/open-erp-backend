/**
 * Seed script for provinces and wards
 * This script populates the database with Vietnam administrative divisions
 */

import { connect, connection } from 'mongoose';
import { ProvinceSchema } from '../schemas/province.schema';
import { WardSchema } from '../schemas/ward.schema';

// Sample provinces data (Vietnam)
const provincesData = [
  { code: '01', name: 'Hà Nội', nameEn: 'Hanoi', region: 'northern', sortOrder: 1 },
  { code: '79', name: 'Hồ Chí Minh', nameEn: 'Ho Chi Minh City', region: 'southern', sortOrder: 2 },
  { code: '48', name: 'Đà Nẵng', nameEn: 'Da Nang', region: 'central', sortOrder: 3 },
  { code: '31', name: 'Hải Phòng', nameEn: 'Hai Phong', region: 'northern', sortOrder: 4 },
  { code: '92', name: 'Cần Thơ', nameEn: 'Can Tho', region: 'southern', sortOrder: 5 },
  { code: '02', name: 'Hà Giang', nameEn: 'Ha Giang', region: 'northern', sortOrder: 6 },
  { code: '04', name: 'Cao Bằng', nameEn: 'Cao Bang', region: 'northern', sortOrder: 7 },
  { code: '06', name: 'Bắc Kạn', nameEn: 'Bac Kan', region: 'northern', sortOrder: 8 },
  { code: '08', name: 'Tuyên Quang', nameEn: 'Tuyen Quang', region: 'northern', sortOrder: 9 },
  { code: '10', name: 'Lào Cai', nameEn: 'Lao Cai', region: 'northern', sortOrder: 10 },
  { code: '11', name: 'Điện Biên', nameEn: 'Dien Bien', region: 'northern', sortOrder: 11 },
  { code: '12', name: 'Lai Châu', nameEn: 'Lai Chau', region: 'northern', sortOrder: 12 },
  { code: '14', name: 'Sơn La', nameEn: 'Son La', region: 'northern', sortOrder: 13 },
  { code: '15', name: 'Yên Bái', nameEn: 'Yen Bai', region: 'northern', sortOrder: 14 },
  { code: '17', name: 'Hòa Bình', nameEn: 'Hoa Binh', region: 'northern', sortOrder: 15 },
  { code: '19', name: 'Thái Nguyên', nameEn: 'Thai Nguyen', region: 'northern', sortOrder: 16 },
  { code: '20', name: 'Lạng Sơn', nameEn: 'Lang Son', region: 'northern', sortOrder: 17 },
  { code: '22', name: 'Quảng Ninh', nameEn: 'Quang Ninh', region: 'northern', sortOrder: 18 },
  { code: '24', name: 'Bắc Giang', nameEn: 'Bac Giang', region: 'northern', sortOrder: 19 },
  { code: '25', name: 'Phú Thọ', nameEn: 'Phu Tho', region: 'northern', sortOrder: 20 },
  { code: '26', name: 'Vĩnh Phúc', nameEn: 'Vinh Phuc', region: 'northern', sortOrder: 21 },
  { code: '27', name: 'Bắc Ninh', nameEn: 'Bac Ninh', region: 'northern', sortOrder: 22 },
  { code: '30', name: 'Hải Dương', nameEn: 'Hai Duong', region: 'northern', sortOrder: 23 },
  { code: '33', name: 'Hưng Yên', nameEn: 'Hung Yen', region: 'northern', sortOrder: 24 },
  { code: '34', name: 'Thái Bình', nameEn: 'Thai Binh', region: 'northern', sortOrder: 25 },
  { code: '35', name: 'Hà Nam', nameEn: 'Ha Nam', region: 'northern', sortOrder: 26 },
  { code: '36', name: 'Nam Định', nameEn: 'Nam Dinh', region: 'northern', sortOrder: 27 },
  { code: '37', name: 'Ninh Bình', nameEn: 'Ninh Binh', region: 'northern', sortOrder: 28 },
  { code: '38', name: 'Thanh Hóa', nameEn: 'Thanh Hoa', region: 'central', sortOrder: 29 },
  { code: '40', name: 'Nghệ An', nameEn: 'Nghe An', region: 'central', sortOrder: 30 },
  { code: '42', name: 'Hà Tĩnh', nameEn: 'Ha Tinh', region: 'central', sortOrder: 31 },
  { code: '44', name: 'Quảng Bình', nameEn: 'Quang Binh', region: 'central', sortOrder: 32 },
  { code: '45', name: 'Quảng Trị', nameEn: 'Quang Tri', region: 'central', sortOrder: 33 },
  { code: '46', name: 'Thừa Thiên Huế', nameEn: 'Thua Thien Hue', region: 'central', sortOrder: 34 },
  { code: '49', name: 'Quảng Nam', nameEn: 'Quang Nam', region: 'central', sortOrder: 35 },
  { code: '51', name: 'Quảng Ngãi', nameEn: 'Quang Ngai', region: 'central', sortOrder: 36 },
  { code: '52', name: 'Bình Định', nameEn: 'Binh Dinh', region: 'central', sortOrder: 37 },
  { code: '54', name: 'Phú Yên', nameEn: 'Phu Yen', region: 'central', sortOrder: 38 },
  { code: '56', name: 'Khánh Hòa', nameEn: 'Khanh Hoa', region: 'central', sortOrder: 39 },
  { code: '58', name: 'Ninh Thuận', nameEn: 'Ninh Thuan', region: 'central', sortOrder: 40 },
  { code: '60', name: 'Bình Thuận', nameEn: 'Binh Thuan', region: 'central', sortOrder: 41 },
  { code: '62', name: 'Kon Tum', nameEn: 'Kon Tum', region: 'highland', sortOrder: 42 },
  { code: '64', name: 'Gia Lai', nameEn: 'Gia Lai', region: 'highland', sortOrder: 43 },
  { code: '66', name: 'Đắk Lắk', nameEn: 'Dak Lak', region: 'highland', sortOrder: 44 },
  { code: '67', name: 'Đắk Nông', nameEn: 'Dak Nong', region: 'highland', sortOrder: 45 },
  { code: '68', name: 'Lâm Đồng', nameEn: 'Lam Dong', region: 'highland', sortOrder: 46 },
  { code: '70', name: 'Bình Phước', nameEn: 'Binh Phuoc', region: 'southern', sortOrder: 47 },
  { code: '72', name: 'Tây Ninh', nameEn: 'Tay Ninh', region: 'southern', sortOrder: 48 },
  { code: '74', name: 'Bình Dương', nameEn: 'Binh Duong', region: 'southern', sortOrder: 49 },
  { code: '75', name: 'Đồng Nai', nameEn: 'Dong Nai', region: 'southern', sortOrder: 50 },
  { code: '77', name: 'Bà Rịa - Vũng Tàu', nameEn: 'Ba Ria - Vung Tau', region: 'southern', sortOrder: 51 },
  { code: '80', name: 'Long An', nameEn: 'Long An', region: 'southern', sortOrder: 52 },
  { code: '82', name: 'Tiền Giang', nameEn: 'Tien Giang', region: 'southern', sortOrder: 53 },
  { code: '83', name: 'Bến Tre', nameEn: 'Ben Tre', region: 'southern', sortOrder: 54 },
  { code: '84', name: 'Trà Vinh', nameEn: 'Tra Vinh', region: 'southern', sortOrder: 55 },
  { code: '86', name: 'Vĩnh Long', nameEn: 'Vinh Long', region: 'southern', sortOrder: 56 },
  { code: '87', name: 'Đồng Tháp', nameEn: 'Dong Thap', region: 'southern', sortOrder: 57 },
  { code: '89', name: 'An Giang', nameEn: 'An Giang', region: 'southern', sortOrder: 58 },
  { code: '91', name: 'Kiên Giang', nameEn: 'Kien Giang', region: 'southern', sortOrder: 59 },
  { code: '93', name: 'Hậu Giang', nameEn: 'Hau Giang', region: 'southern', sortOrder: 60 },
  { code: '94', name: 'Sóc Trăng', nameEn: 'Soc Trang', region: 'southern', sortOrder: 61 },
  { code: '95', name: 'Bạc Liêu', nameEn: 'Bac Lieu', region: 'southern', sortOrder: 62 },
  { code: '96', name: 'Cà Mau', nameEn: 'Ca Mau', region: 'southern', sortOrder: 63 },
];

// Sample wards data (just a few examples for major cities)
const wardsData = [
  // Hanoi wards
  { code: '00001', name: 'Phúc Xá', nameEn: 'Phuc Xa', provinceCode: '01', sortOrder: 1 },
  { code: '00004', name: 'Trúc Bạch', nameEn: 'Truc Bach', provinceCode: '01', sortOrder: 2 },
  { code: '00006', name: 'Vĩnh Phúc', nameEn: 'Vinh Phuc', provinceCode: '01', sortOrder: 3 },
  { code: '00007', name: 'Cống Vị', nameEn: 'Cong Vi', provinceCode: '01', sortOrder: 4 },
  { code: '00008', name: 'Liễu Giai', nameEn: 'Lieu Giai', provinceCode: '01', sortOrder: 5 },
  { code: '00010', name: 'Nguyễn Trung Trực', nameEn: 'Nguyen Trung Truc', provinceCode: '01', sortOrder: 6 },
  { code: '00013', name: 'Quán Thánh', nameEn: 'Quan Thanh', provinceCode: '01', sortOrder: 7 },
  { code: '00016', name: 'Ngọc Hà', nameEn: 'Ngoc Ha', provinceCode: '01', sortOrder: 8 },
  { code: '00019', name: 'Điện Biên', nameEn: 'Dien Bien', provinceCode: '01', sortOrder: 9 },
  { code: '00022', name: 'Đội Cấn', nameEn: 'Doi Can', provinceCode: '01', sortOrder: 10 },
  
  // Ho Chi Minh City wards
  { code: '26734', name: 'Tân Định', nameEn: 'Tan Dinh', provinceCode: '79', sortOrder: 1 },
  { code: '26737', name: 'Đa Kao', nameEn: 'Da Kao', provinceCode: '79', sortOrder: 2 },
  { code: '26740', name: 'Bến Nghé', nameEn: 'Ben Nghe', provinceCode: '79', sortOrder: 3 },
  { code: '26743', name: 'Bến Thành', nameEn: 'Ben Thanh', provinceCode: '79', sortOrder: 4 },
  { code: '26746', name: 'Nguyễn Thái Bình', nameEn: 'Nguyen Thai Binh', provinceCode: '79', sortOrder: 5 },
  { code: '26749', name: 'Phạm Ngũ Lão', nameEn: 'Pham Ngu Lao', provinceCode: '79', sortOrder: 6 },
  { code: '26752', name: 'Cầu Ông Lãnh', nameEn: 'Cau Ong Lanh', provinceCode: '79', sortOrder: 7 },
  { code: '26755', name: 'Cô Giang', nameEn: 'Co Giang', provinceCode: '79', sortOrder: 8 },
  { code: '26758', name: 'Nguyễn Cư Trinh', nameEn: 'Nguyen Cu Trinh', provinceCode: '79', sortOrder: 9 },
  { code: '26761', name: 'Cầu Kho', nameEn: 'Cau Kho', provinceCode: '79', sortOrder: 10 },
  
  // Da Nang wards
  { code: '20194', name: 'Thạc Gián', nameEn: 'Thac Gian', provinceCode: '48', sortOrder: 1 },
  { code: '20195', name: 'Thanh Bình', nameEn: 'Thanh Binh', provinceCode: '48', sortOrder: 2 },
  { code: '20197', name: 'Tân Chính', nameEn: 'Tan Chinh', provinceCode: '48', sortOrder: 3 },
  { code: '20200', name: 'Chính Gián', nameEn: 'Chinh Gian', provinceCode: '48', sortOrder: 4 },
  { code: '20203', name: 'Vĩnh Trung', nameEn: 'Vinh Trung', provinceCode: '48', sortOrder: 5 },
  { code: '20206', name: 'Thọ Quang', nameEn: 'Tho Quang', provinceCode: '48', sortOrder: 6 },
  { code: '20207', name: 'Nại Hiên Đông', nameEn: 'Nai Hien Dong', provinceCode: '48', sortOrder: 7 },
  { code: '20209', name: 'Mân Thái', nameEn: 'Man Thai', provinceCode: '48', sortOrder: 8 },
  { code: '20212', name: 'An Hải Bắc', nameEn: 'An Hai Bac', provinceCode: '48', sortOrder: 9 },
  { code: '20215', name: 'An Hải Tây', nameEn: 'An Hai Tay', provinceCode: '48', sortOrder: 10 },
];

async function seedProvincesAndWards() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/open-erp';
  
  try {
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    const Province = connection.model('Province', ProvinceSchema);
    const Ward = connection.model('Ward', WardSchema);

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('Clearing existing provinces and wards...');
    await Province.deleteMany({});
    await Ward.deleteMany({});

    // Insert provinces
    console.log('Inserting provinces...');
    const insertedProvinces = await Province.insertMany(provincesData);
    console.log(`Inserted ${insertedProvinces.length} provinces`);

    // Insert wards
    console.log('Inserting wards...');
    const insertedWards = await Ward.insertMany(wardsData);
    console.log(`Inserted ${insertedWards.length} wards`);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedProvincesAndWards()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedProvincesAndWards, provincesData, wardsData };
