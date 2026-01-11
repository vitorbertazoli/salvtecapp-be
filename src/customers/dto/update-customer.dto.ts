import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class EquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsNumber()
  btus?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  subType?: string;

  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['residential', 'commercial'])
  type?: 'residential' | 'commercial';

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsMongoId()
  technicianResponsible?: string;

  @IsOptional()
  @IsMongoId()
  address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentDto)
  equipments?: EquipmentDto[];
}
