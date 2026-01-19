import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventsService } from '../src/events/events.service';
import { Event, EventDocument } from '../src/events/schemas/event.schema';
import { Customer, CustomerDocument } from '../src/customers/schemas/customer.schema';
import { Technician, TechnicianDocument } from '../src/technicians/schemas/technician.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventModel: any;
  let customerModel: any;
  let technicianModel: any;
  let serviceOrdersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
  const mockServiceOrderId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockCustomer = {
    _id: mockCustomerId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
  };

  const mockTechnician = {
    _id: mockTechnicianId,
    user: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
  };

  const mockEvent = {
    _id: new Types.ObjectId(),
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '10:00',
    customer: mockCustomerId,
    technician: mockTechnicianId,
    account: mockAccountId,
    title: 'John Doe - Jane Smith',
    description: 'Service call',
    status: 'scheduled',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    serviceOrder: mockServiceOrderId,
  };

  const mockEventArray = [mockEvent];

  beforeEach(async () => {
    const mockEventModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockEvent,
        toObject: jest.fn().mockReturnValue(mockEvent),
      }),
      toObject: jest.fn().mockReturnValue(mockEvent),
      populate: jest.fn().mockReturnThis(),
    }));

    // Add static methods
    mockEventModel.find = jest.fn();
    mockEventModel.findOne = jest.fn();
    mockEventModel.findOneAndDelete = jest.fn();
    mockEventModel.countDocuments = jest.fn();
    mockEventModel.deleteMany = jest.fn();

    const mockCustomerModel = {
      findById: jest.fn(),
    };

    const mockTechnicianModel = {
      findById: jest.fn(),
    };

    const mockServiceOrdersService = {
      updateByAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: getModelToken(Technician.name),
          useValue: mockTechnicianModel,
        },
        {
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventModel = module.get(getModelToken(Event.name));
    customerModel = module.get(getModelToken(Customer.name));
    technicianModel = module.get(getModelToken(Technician.name));
    serviceOrdersService = module.get(ServiceOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an event successfully', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId.toString(),
        technician: mockTechnicianId.toString(),
        description: 'Service call',
        serviceOrder: mockServiceOrderId.toString(),
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.findById.mockResolvedValue(mockTechnician as any);
      serviceOrdersService.updateByAccount.mockResolvedValue({} as any);

      const result = await service.create(eventData, mockAccountId);

      expect(customerModel.findById).toHaveBeenCalledWith(mockCustomerId.toString());
      expect(technicianModel.findById).toHaveBeenCalledWith(mockTechnicianId.toString());
      expect(serviceOrdersService.updateByAccount).toHaveBeenCalledWith(
        mockServiceOrderId.toString(),
        {
          status: 'scheduled',
          scheduledDate: expect.any(Date),
        },
        mockAccountId
      );
      expect(result).toEqual(mockEvent);
    });

    it('should throw error when customer not found', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId.toString(),
        technician: mockTechnicianId.toString(),
      };

      customerModel.findById.mockResolvedValue(null);
      technicianModel.findById.mockResolvedValue(mockTechnician as any);

      await expect(service.create(eventData, mockAccountId)).rejects.toThrow('Invalid customer or technician');
    });

    it('should throw error when technician not found', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId.toString(),
        technician: mockTechnicianId.toString(),
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.findById.mockResolvedValue(null);

      await expect(service.create(eventData, mockAccountId)).rejects.toThrow('Invalid customer or technician');
    });

    it('should create event without service order', async () => {
      const eventData = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: mockCustomerId.toString(),
        technician: mockTechnicianId.toString(),
        description: 'Service call',
      };

      customerModel.findById.mockResolvedValue(mockCustomer as any);
      technicianModel.findById.mockResolvedValue(mockTechnician as any);

      const result = await service.create(eventData, mockAccountId);

      expect(serviceOrdersService.updateByAccount).not.toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });
  });

  describe('findAll', () => {
    it('should return all events for account', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.findAll(mockAccountId);

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        status: { $ne: 'completed' },
      });
      expect(result).toEqual(mockEventArray);
    });

    it('should filter events by date range', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.findAll(mockAccountId, filters);

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        date: {
          $gte: '2024-01-01',
          $lte: '2024-01-31',
        },
        status: { $ne: 'completed' },
      });
      expect(result).toEqual(mockEventArray);
    });

    it('should filter events by technician', async () => {
      const filters = {
        technicianId: mockTechnicianId.toString(),
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.findAll(mockAccountId, filters);

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        technician: mockTechnicianId,
        status: { $ne: 'completed' },
      });
      expect(result).toEqual(mockEventArray);
    });

    it('should filter events by customer', async () => {
      const filters = {
        customerId: mockCustomerId.toString(),
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.findAll(mockAccountId, filters);

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        customer: mockCustomerId,
        status: { $ne: 'completed' },
      });
      expect(result).toEqual(mockEventArray);
    });

    it('should filter events by status', async () => {
      const filters = {
        status: 'completed',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.findAll(mockAccountId, filters);

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        status: 'completed',
      });
      expect(result).toEqual(mockEventArray);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated events', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);
      jest.spyOn(eventModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAllPaginated(mockAccountId, '1', '10');

      expect(eventModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(eventModel.countDocuments).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual({
        events: mockEventArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by customer when provided', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEventArray),
      };

      jest.spyOn(eventModel, 'find').mockReturnValue(mockQuery as any);
      jest.spyOn(eventModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAllPaginated(mockAccountId, '1', '10', mockCustomerId.toString());

      expect(eventModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        customer: mockCustomerId,
      });
      expect(result.events).toEqual(mockEventArray);
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return event by id and account', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      };

      jest.spyOn(eventModel, 'findOne').mockReturnValue(mockQuery as any);

      const result = await service.findByIdAndAccount(mockEvent._id.toString(), mockAccountId);

      expect(eventModel.findOne).toHaveBeenCalledWith({
        _id: mockEvent._id.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockEvent);
    });

    it('should return null when event not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(eventModel, 'findOne').mockReturnValue(mockQuery as any);

      const result = await service.findByIdAndAccount('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update event successfully', async () => {
      const updateData = {
        date: '2024-01-16',
        startTime: '10:00',
        endTime: '11:00',
        customer: mockCustomerId.toString(),
        technician: mockTechnicianId.toString(),
        description: 'Updated service call',
        updatedBy: mockUserId,
      };

      const mockEventDoc = {
        ...mockEvent,
        save: jest.fn().mockResolvedValue(mockEvent),
      };

      jest.spyOn(eventModel, 'findOne').mockResolvedValue(mockEventDoc as any);
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockEvent);

      const result = await service.updateByAccount(mockEvent._id.toString(), updateData, mockAccountId);

      expect(eventModel.findOne).toHaveBeenCalledWith({
        _id: mockEvent._id.toString(),
        account: mockAccountId,
      });
      expect(mockEventDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });

    it('should return null when event not found', async () => {
      const updateData = {
        date: '2024-01-16',
        description: 'Updated service call',
        updatedBy: mockUserId,
      };

      jest.spyOn(eventModel, 'findOne').mockResolvedValue(null);

      const result = await service.updateByAccount('nonexistent-id', updateData, mockAccountId);

      expect(result).toBeNull();
    });

    it('should update service order status when status changes to completed', async () => {
      const updateData = {
        status: 'completed',
        completionNotes: 'Service completed successfully',
        updatedBy: mockUserId,
      };

      const mockEventDoc = {
        ...mockEvent,
        serviceOrder: mockServiceOrderId,
        save: jest.fn().mockResolvedValue(mockEvent),
      };

      eventModel.findOne.mockResolvedValue(mockEventDoc as any);
      serviceOrdersService.updateByAccount.mockResolvedValue({} as any);
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockEvent);

      const result = await service.updateByAccount(mockEvent._id.toString(), updateData, mockAccountId);

      expect(serviceOrdersService.updateByAccount).toHaveBeenCalledWith(
        mockServiceOrderId.toString(),
        {
          status: 'completed',
          completedAt: expect.any(Date),
        },
        mockAccountId
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('deleteByAccount', () => {
    it('should delete event successfully', async () => {
      jest.spyOn(eventModel, 'findOneAndDelete').mockResolvedValue(mockEvent as any);

      const result = await service.deleteByAccount(mockEvent._id.toString(), mockAccountId);

      expect(eventModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockEvent._id.toString(),
        account: mockAccountId,
      });
      expect(result).toBe(true);
    });

    it('should return false when event not found', async () => {
      jest.spyOn(eventModel, 'findOneAndDelete').mockResolvedValue(null);

      const result = await service.deleteByAccount('nonexistent-id', mockAccountId);

      expect(result).toBe(false);
    });
  });

  describe('completeByAccount', () => {
    it('should complete event successfully', async () => {
      const mockEventDoc = {
        ...mockEvent,
        serviceOrder: mockServiceOrderId,
        save: jest.fn().mockResolvedValue(mockEvent),
      };

      eventModel.findOne.mockResolvedValue(mockEventDoc as any);
      serviceOrdersService.updateByAccount.mockResolvedValue({} as any);
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockEvent);

      const result = await service.completeByAccount(mockEvent._id.toString(), mockUserId.toString(), mockAccountId);

      expect(mockEventDoc.status).toBe('completed');
      expect(mockEventDoc.completedAt).toBeDefined();
      expect(mockEventDoc.completedBy.toString()).toBe(mockUserId.toString());
      expect(serviceOrdersService.updateByAccount).toHaveBeenCalledWith(
        mockServiceOrderId.toString(),
        {
          status: 'completed',
          completedAt: expect.any(Date),
        },
        mockAccountId
      );
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException when event not found', async () => {
      jest.spyOn(eventModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.completeByAccount('nonexistent-id', mockUserId, mockAccountId)
      ).rejects.toThrow('Event not found');
    });
  });
});