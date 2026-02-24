import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Customer } from '../src/customers/schemas/customer.schema';
import { EventsService } from '../src/events/events.service';
import { Event } from '../src/events/schemas/event.schema';
import { RecurringEventConfig } from '../src/events/schemas/recurring-event-config.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';
import { Technician } from '../src/technicians/schemas/technician.schema';

describe('EventsService - Recurring Events', () => {
  let service: EventsService;
  let eventModel: any;
  let recurringConfigModel: any;
  let customerModel: any;
  let technicianModel: any;
  let serviceOrdersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRecurringConfigId = new Types.ObjectId();

  const mockCustomer = {
    _id: mockCustomerId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890'
  };

  const mockTechnician = {
    _id: mockTechnicianId,
    user: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com'
    }
  };

  beforeEach(async () => {
    const mockEventModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        ...data,
        toObject: jest.fn().mockReturnValue(data)
      }),
      toObject: jest.fn().mockReturnValue(data),
      populate: jest.fn().mockReturnThis()
    }));

    mockEventModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    });
    mockEventModel.findOne = jest.fn();
    mockEventModel.findOneAndDelete = jest.fn();
    mockEventModel.deleteMany = jest.fn();
    mockEventModel.insertMany = jest.fn();

    const mockRecurringConfigModel = {
      create: jest.fn().mockResolvedValue({
        _id: mockRecurringConfigId,
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5],
        startDate: '2024-01-01',
        untilDate: '2024-12-31',
        account: mockAccountId,
        save: jest.fn()
      }),
      findOne: jest.fn().mockReturnValue({
        _id: mockRecurringConfigId,
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5],
        startDate: '2024-01-01',
        untilDate: '2024-12-31',
        account: mockAccountId,
        save: jest.fn()
      }),
      findOneAndDelete: jest.fn()
    };

    const mockCustomerModel = {
      findById: jest.fn()
    };

    const mockTechnicianModel = {
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      })
    };

    const mockServiceOrdersService = {
      updateByAccount: jest.fn(),
      findByIdAndAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel
        },
        {
          provide: getModelToken(RecurringEventConfig.name),
          useValue: mockRecurringConfigModel
        },
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel
        },
        {
          provide: getModelToken(Technician.name),
          useValue: mockTechnicianModel
        },
        {
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService
        }
      ]
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventModel = module.get(getModelToken(Event.name));
    recurringConfigModel = module.get(getModelToken(RecurringEventConfig.name));
    customerModel = module.get(getModelToken(Customer.name));
    technicianModel = module.get(getModelToken(Technician.name));
    serviceOrdersService = module.get(ServiceOrdersService);
  });

  describe('create recurring event', () => {
    it('should create weekly recurring events', async () => {
      const eventData = {
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: {
          frequency: 'weekly' as const,
          interval: 1,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          untilDate: '2024-01-31'
        }
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      });
      const mockEventId = new Types.ObjectId();
      eventModel.insertMany.mockResolvedValue([
        {
          _id: mockEventId,
          ...eventData,
          toObject: () => ({ _id: mockEventId, ...eventData })
        }
      ]);

      const result = await service.create(eventData, mockAccountId);

      expect(recurringConfigModel.create).toHaveBeenCalled();
      expect(eventModel.insertMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create daily recurring events', async () => {
      const eventData = {
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: {
          frequency: 'daily' as const,
          interval: 1,
          untilDate: '2024-01-10'
        }
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      });
      const mockEventId = new Types.ObjectId();
      eventModel.insertMany.mockResolvedValue([
        {
          _id: mockEventId,
          ...eventData,
          toObject: () => ({ _id: mockEventId, ...eventData })
        }
      ]);

      const result = await service.create(eventData, mockAccountId);

      expect(recurringConfigModel.create).toHaveBeenCalled();
      expect(eventModel.insertMany).toHaveBeenCalled();
    });

    it('should create monthly recurring events', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: {
          frequency: 'monthly' as const,
          interval: 1,
          untilDate: '2024-06-15'
        }
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      });
      const mockEventId = new Types.ObjectId();
      eventModel.insertMany.mockResolvedValue([
        {
          _id: mockEventId,
          ...eventData,
          toObject: () => ({ _id: mockEventId, ...eventData })
        }
      ]);

      const result = await service.create(eventData, mockAccountId);

      expect(recurringConfigModel.create).toHaveBeenCalled();
      expect(eventModel.insertMany).toHaveBeenCalled();
    });

    it('should throw error when untilDate exceeds 1 year', async () => {
      const eventData = {
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: {
          frequency: 'weekly' as const,
          interval: 1,
          daysOfWeek: [1],
          untilDate: '2025-02-01' // More than 1 year
        }
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      });

      await expect(service.create(eventData, mockAccountId)).rejects.toThrow('events.errors.recurringMaxOneYear');
    });

    it('should throw error when untilDate is before startDate', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: {
          frequency: 'daily' as const,
          interval: 1,
          untilDate: '2024-01-10' // Before start date
        }
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockTechnician])
      });

      await expect(service.create(eventData, mockAccountId)).rejects.toThrow('events.errors.invalidRecurringDateRange');
    });
  });

  describe('deleteByAccount with recurring scope', () => {
    it('should delete only single occurrence when scope is single', async () => {
      const mockEvent = {
        _id: new Types.ObjectId(),
        date: '2024-01-15',
        recurringConfig: mockRecurringConfigId,
        account: mockAccountId
      };

      eventModel.findOne.mockResolvedValue(mockEvent as any);
      eventModel.findOneAndDelete.mockResolvedValue(mockEvent as any);

      const result = await service.deleteByAccount(mockEvent._id.toString(), mockAccountId, 'single');

      expect(eventModel.findOneAndDelete).toHaveBeenCalled();
      expect(eventModel.deleteMany).not.toHaveBeenCalled();
      expect(recurringConfigModel.findOneAndDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, deletedCount: 1 });
    });

    it('should delete future occurrences when scope is future', async () => {
      const mockEvent = {
        _id: new Types.ObjectId(),
        date: '2024-01-15',
        recurringConfig: mockRecurringConfigId,
        account: mockAccountId
      };

      eventModel.findOne.mockResolvedValue(mockEvent as any);
      eventModel.find.mockResolvedValue([mockEvent, mockEvent] as any);
      eventModel.deleteMany.mockResolvedValue({ deletedCount: 2 } as any);

      const result = await service.deleteByAccount(mockEvent._id.toString(), mockAccountId, 'future');

      expect(eventModel.deleteMany).toHaveBeenCalledWith({
        account: mockAccountId,
        recurringConfig: mockRecurringConfigId,
        date: { $gte: '2024-01-15' }
      });
      expect(recurringConfigModel.findOneAndDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, deletedCount: 2 });
    });

    it('should delete all occurrences and config when scope is all', async () => {
      const mockEvent = {
        _id: new Types.ObjectId(),
        date: '2024-01-15',
        recurringConfig: mockRecurringConfigId,
        account: mockAccountId
      };

      eventModel.findOne.mockResolvedValue(mockEvent as any);
      eventModel.find.mockResolvedValue([mockEvent, mockEvent, mockEvent] as any);
      eventModel.deleteMany.mockResolvedValue({ deletedCount: 3 } as any);
      recurringConfigModel.findOneAndDelete.mockResolvedValue({} as any);

      const result = await service.deleteByAccount(mockEvent._id.toString(), mockAccountId, 'all');

      expect(eventModel.deleteMany).toHaveBeenCalledWith({
        account: mockAccountId,
        recurringConfig: mockRecurringConfigId
      });
      expect(recurringConfigModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockRecurringConfigId,
        account: mockAccountId
      });
      expect(result).toEqual({ deleted: true, deletedCount: 3 });
    });
  });

  describe('updateByAccount with recurring scope', () => {
    it('should update only single occurrence when scope is single', async () => {
      const mockEvent = {
        _id: new Types.ObjectId(),
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: mockRecurringConfigId,
        account: mockAccountId,
        title: 'Test Event',
        save: jest.fn().mockResolvedValue(true)
      };

      const updateData = {
        startTime: '10:00',
        endTime: '11:00',
        updatedBy: mockUserId,
        recurringUpdate: {
          scope: 'single' as const
        }
      };

      eventModel.findOne.mockResolvedValue(mockEvent as any);
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockEvent as any);

      const result = await service.updateByAccount(mockEvent._id.toString(), updateData, mockAccountId);

      expect(mockEvent.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it.skip('should update future occurrences when scope is future', async () => {
      const mockEvent = {
        _id: new Types.ObjectId(),
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId,
        technician: [mockTechnicianId],
        recurringConfig: mockRecurringConfigId,
        account: mockAccountId,
        title: 'Test Event',
        save: jest.fn().mockResolvedValue(true)
      };

      const futureEvent = { ...mockEvent, save: jest.fn().mockResolvedValue(true) };

      const updateData = {
        startTime: '10:00',
        endTime: '11:00',
        updatedBy: mockUserId,
        recurringUpdate: {
          scope: 'future' as const
        }
      };

      eventModel.findOne.mockResolvedValue(mockEvent as any);
      eventModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue([mockEvent, futureEvent])
        })
      });
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockEvent as any);

      const result = await service.updateByAccount(mockEvent._id.toString(), updateData, mockAccountId);

      expect(result).toBeDefined();
    });
  });
});
