import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CustomerVehiclesService } from '../src/customer-vehicles/customer-vehicles.service';
import { CustomerVehicle } from '../src/customer-vehicles/schemas/customer-vehicle.schema';
import { CustomersService } from '../src/customers/customers.service';

describe('CustomerVehiclesService', () => {
  let service: CustomerVehiclesService;
  let model: any;
  let customersService: any;
  const accountId = new Types.ObjectId();
  const customerId = new Types.ObjectId();

  beforeEach(async () => {
    model = jest.fn().mockImplementation((data) => ({ save: jest.fn().mockResolvedValue(data) }));
    model.find = jest.fn();
    model.findOneAndUpdate = jest.fn();
    model.findOneAndDelete = jest.fn();
    model.deleteMany = jest.fn();
    customersService = { findByIdAndAccount: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerVehiclesService,
        { provide: getModelToken(CustomerVehicle.name), useValue: model },
        { provide: CustomersService, useValue: customersService }
      ]
    }).compile();

    service = module.get<CustomerVehiclesService>(CustomerVehiclesService);
  });

  it('creates only for a customer in the account', async () => {
    customersService.findByIdAndAccount.mockResolvedValue(null);

    await expect(service.create({ customer: customerId } as any, accountId)).rejects.toThrow(NotFoundException);
    expect(customersService.findByIdAndAccount).toHaveBeenCalledWith(customerId.toString(), accountId);
    expect(model).not.toHaveBeenCalled();
  });

  it('scopes vehicle listings to the account and requested customer', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ exec });
    const populate = jest.fn().mockReturnValue({ sort });
    model.find.mockReturnValue({ populate });

    await service.findByAccount(accountId, customerId.toString());

    expect(model.find).toHaveBeenCalledWith({ account: accountId, customer: customerId });
    expect(populate).toHaveBeenCalledWith('customer', 'name');
  });

  it('scopes updates and deletes to the account', async () => {
    const vehicle = { _id: new Types.ObjectId() };
    model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(vehicle) });
    model.findOneAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(vehicle) });

    await service.updateByAccount(vehicle._id.toString(), { model: 'Civic' }, accountId, new Types.ObjectId());
    await service.deleteByAccount(vehicle._id.toString(), accountId);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: vehicle._id.toString(), account: accountId },
      expect.objectContaining({ model: 'Civic' }),
      { new: true }
    );
    expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: vehicle._id.toString(), account: accountId });
  });
});
