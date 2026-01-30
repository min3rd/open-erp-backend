import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AddressRepository } from '../repositories/address.repository';
import { ProvinceRepository } from '../repositories/province.repository';
import { DistrictRepository } from '../repositories/district.repository';
import { WardRepository } from '../repositories/ward.repository';
import { Address, AddressScope } from '@shared/schemas';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly provinceRepository: ProvinceRepository,
    private readonly districtRepository: DistrictRepository,
    private readonly wardRepository: WardRepository,
  ) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    scope?: AddressScope;
    userId?: string;
    organizationId?: string;
  }): Promise<{ items: Address[]; total: number }> {
    const { page = 1, limit = 20, scope, userId, organizationId } = options;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Finding addresses with options: ${JSON.stringify({ page, limit, scope, userId, organizationId })}`,
    );

    const filter: any = { isDeleted: false };

    if (scope) {
      filter.scope = scope;
    }
    if (userId) {
      filter.userId = userId;
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    const result = await this.addressRepository.findAll(filter, {
      skip,
      limit,
      sort: { isDefault: -1, createdAt: -1 },
    });

    this.logger.log(`Found ${result.total} addresses`);
    return result;
  }

  async findById(id: string): Promise<Address> {
    this.logger.debug(`Finding address by ID: ${id}`);
    const address = await this.addressRepository.findById(id);
    if (!address) {
      this.logger.warn(`Address not found: ${id}`);
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return address;
  }

  async create(dto: CreateAddressDto): Promise<Address> {
    this.logger.log(`Creating address for scope: ${dto.scope}`);

    // Validate scope-specific requirements
    if (dto.scope === AddressScope.GLOBAL && !dto.userId) {
      throw new BadRequestException(
        'userId is required for global scope addresses',
      );
    }
    if (dto.scope === AddressScope.ORGANIZATION && !dto.organizationId) {
      throw new BadRequestException(
        'organizationId is required for organization scope addresses',
      );
    }

    // Validate province code exists
    const province = await this.provinceRepository.findByCode(
      dto.province.code,
    );
    if (!province) {
      throw new BadRequestException(
        `Province with code ${dto.province.code} not found`,
      );
    }

    // Validate district code if provided
    if (dto.district) {
      const district = await this.districtRepository.findByCode(
        dto.district.code,
      );
      if (!district) {
        throw new BadRequestException(
          `District with code ${dto.district.code} not found`,
        );
      }
      // Verify district belongs to province
      if (district.provinceCode !== dto.province.code) {
        throw new BadRequestException(
          `District ${dto.district.code} does not belong to province ${dto.province.code}`,
        );
      }
    }

    // Validate ward code if provided
    if (dto.ward) {
      const ward = await this.wardRepository.findByCode(dto.ward.code);
      if (!ward) {
        throw new BadRequestException(
          `Ward with code ${dto.ward.code} not found`,
        );
      }
      // Verify ward belongs to province
      if (ward.provinceCode !== dto.province.code) {
        throw new BadRequestException(
          `Ward ${dto.ward.code} does not belong to province ${dto.province.code}`,
        );
      }
      // Verify ward belongs to district if district is provided
      if (dto.district && ward.districtCode !== dto.district.code) {
        throw new BadRequestException(
          `Ward ${dto.ward.code} does not belong to district ${dto.district.code}`,
        );
      }
    }

    // Convert string IDs to ObjectIds and create the address data
    const addressData: any = {
      ...dto,
    };

    if (dto.userId) {
      addressData.userId = new Types.ObjectId(dto.userId);
    }
    if (dto.organizationId) {
      addressData.organizationId = new Types.ObjectId(dto.organizationId);
    }

    const address = await this.addressRepository.create(addressData);
    this.logger.log(`Created address: ${address._id}`);
    return address;
  }

  async update(id: string, dto: UpdateAddressDto): Promise<Address> {
    this.logger.log(`Updating address: ${id}`);
    const existingAddress = await this.findById(id);

    // Validate province code if provided
    if (dto.province) {
      const province = await this.provinceRepository.findByCode(
        dto.province.code,
      );
      if (!province) {
        throw new BadRequestException(
          `Province with code ${dto.province.code} not found`,
        );
      }
    }

    // Validate district code if provided
    if (dto.district) {
      const district = await this.districtRepository.findByCode(
        dto.district.code,
      );
      if (!district) {
        throw new BadRequestException(
          `District with code ${dto.district.code} not found`,
        );
      }
      // Verify district belongs to province (use existing or new province)
      const provinceCode = dto.province?.code || existingAddress.province.code;
      if (district.provinceCode !== provinceCode) {
        throw new BadRequestException(
          `District ${dto.district.code} does not belong to province ${provinceCode}`,
        );
      }
    }

    // Validate ward code if provided
    if (dto.ward) {
      const ward = await this.wardRepository.findByCode(dto.ward.code);
      if (!ward) {
        throw new BadRequestException(
          `Ward with code ${dto.ward.code} not found`,
        );
      }
      // Verify ward belongs to province
      const provinceCode = dto.province?.code || existingAddress.province.code;
      if (ward.provinceCode !== provinceCode) {
        throw new BadRequestException(
          `Ward ${dto.ward.code} does not belong to province ${provinceCode}`,
        );
      }
      // Verify ward belongs to district if district is provided
      const districtCode = dto.district?.code || existingAddress.district?.code;
      if (districtCode && ward.districtCode !== districtCode) {
        throw new BadRequestException(
          `Ward ${dto.ward.code} does not belong to district ${districtCode}`,
        );
      }
    }

    const updated = await this.addressRepository.update(id, dto);
    if (!updated) {
      this.logger.warn(`Address not found after update: ${id}`);
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    this.logger.log(`Updated address: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting address: ${id}`);
    const address = await this.addressRepository.softDelete(id);
    if (!address) {
      this.logger.warn(`Address not found for deletion: ${id}`);
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    this.logger.log(`Deleted address: ${id}`);
  }
}
