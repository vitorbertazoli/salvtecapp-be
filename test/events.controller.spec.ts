import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateEventDto } from '../src/events/dto/create-event.dto';
import { UpdateEventDto } from '../src/events/dto/update-event.dto';
import { EventsController } from '../src/events/events.controller';
import { EventsService } from '../src/events/events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let service: jest.Mocked<EventsService>;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockTechnicianId = 'tech123';

  const mockEvent = {
    _id: new Types.ObjectId(),
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '10:00',
    customer: new Types.ObjectId(),
    technician: [new Types.ObjectId()],
    title: 'Test Event',
    description: 'Test description',
    status: 'scheduled' as const,
    account: mockAccountId,
    createdBy: mockUserId,
    updatedBy: mockUserId
  };

  beforeEach(async () => {
    const mockEventsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      findByIdAndAccount: jest.fn(),
      updateByAccount: jest.fn(),
      deleteByAccount: jest.fn(),
      completeByAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService
        }
      ]
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an event successfully', async () => {
      const createEventDto: CreateEventDto = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: new Types.ObjectId().toString(),
        technician: [new Types.ObjectId().toString()],
        title: 'Test Event',
        description: 'Test description',
        status: 'scheduled',
        serviceOrder: new Types.ObjectId().toString()
      };

      const expectedEventData = {
        ...createEventDto,
        account: mockAccountId,
        customer: new Types.ObjectId(createEventDto.customer),
        technician: createEventDto.technician.map((id) => new Types.ObjectId(id)),
        serviceOrder: new Types.ObjectId(createEventDto.serviceOrder),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      service.create.mockResolvedValue(mockEvent as any);

      const result = await controller.create(createEventDto, mockAccountId, mockUserId);

      expect(service.create).toHaveBeenCalledWith(expectedEventData, mockAccountId);
      expect(result).toEqual(mockEvent);
    });

    it('should create an event without optional fields', async () => {
      const createEventDto: CreateEventDto = {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        customer: new Types.ObjectId().toString(),
        technician: [new Types.ObjectId().toString()]
      };

      const expectedEventData = {
        ...createEventDto,
        account: mockAccountId,
        customer: new Types.ObjectId(createEventDto.customer),
        technician: createEventDto.technician.map((id) => new Types.ObjectId(id)),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      service.create.mockResolvedValue(mockEvent as any);

      const result = await controller.create(createEventDto, mockAccountId, mockUserId);

      expect(service.create).toHaveBeenCalledWith(expectedEventData, mockAccountId);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('findAll', () => {
    it('should return all events with filters', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        customerId: 'customer123',
        status: 'scheduled'
      };

      const mockEvents = [mockEvent];
      service.findAll.mockResolvedValue(mockEvents as any);

      const result = await controller.findAll(mockAccountId, mockTechnicianId, filters.startDate, filters.endDate, filters.customerId, filters.status);

      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        technicianId: mockTechnicianId,
        customerId: filters.customerId,
        status: filters.status
      });
      expect(result).toEqual(mockEvents);
    });

    it('should return all events without filters', async () => {
      const mockEvents = [mockEvent];
      service.findAll.mockResolvedValue(mockEvents as any);

      const result = await controller.findAll(mockAccountId, mockTechnicianId);

      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, {
        technicianId: mockTechnicianId
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated events', async () => {
      const page = '1';
      const limit = '10';
      const customerId = 'customer123';

      const mockPaginatedResult = {
        events: [mockEvent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      service.findAllPaginated.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAllPaginated(mockAccountId, page, limit, customerId);

      expect(service.findAllPaginated).toHaveBeenCalledWith(mockAccountId, page, limit, customerId);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return paginated events with default values', async () => {
      const page = '1';

      const mockPaginatedResult = {
        events: [mockEvent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      service.findAllPaginated.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAllPaginated(mockAccountId, page);

      expect(service.findAllPaginated).toHaveBeenCalledWith(mockAccountId, page, undefined, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single event', async () => {
      const eventId = mockEvent._id.toString();

      service.findByIdAndAccount.mockResolvedValue(mockEvent as any);

      const result = await controller.findOne(eventId, mockAccountId);

      expect(service.findByIdAndAccount).toHaveBeenCalledWith(eventId, mockAccountId);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('update', () => {
    it('should update an event successfully', async () => {
      const eventId = mockEvent._id.toString();
      const updateEventDto: UpdateEventDto = {
        date: '2024-01-16',
        startTime: '10:00',
        endTime: '11:00',
        customer: new Types.ObjectId().toString(),
        technician: [new Types.ObjectId().toString()],
        title: 'Updated Event',
        description: 'Updated description',
        status: 'completed',
        completionNotes: 'Event completed successfully',
        serviceOrder: new Types.ObjectId().toString()
      };

      const expectedUpdateData = {
        ...updateEventDto,
        customer: new Types.ObjectId(updateEventDto.customer),
        technician: updateEventDto.technician.map((id) => new Types.ObjectId(id)),
        serviceOrder: new Types.ObjectId(updateEventDto.serviceOrder),
        updatedBy: mockUserId
      };

      const updatedEvent = { ...mockEvent, ...expectedUpdateData };
      service.updateByAccount.mockResolvedValue(updatedEvent as any);

      const result = await controller.update(eventId, updateEventDto, mockUserId, mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(eventId, expectedUpdateData, mockAccountId);
      expect(result).toEqual(updatedEvent);
    });

    it('should update an event with minimal fields', async () => {
      const eventId = mockEvent._id.toString();
      const updateEventDto: UpdateEventDto = {
        date: '2024-01-16',
        startTime: '10:00',
        endTime: '11:00',
        customer: new Types.ObjectId().toString(),
        technician: [new Types.ObjectId().toString()]
      };

      const expectedUpdateData = {
        ...updateEventDto,
        customer: new Types.ObjectId(updateEventDto.customer),
        technician: updateEventDto.technician.map((id) => new Types.ObjectId(id)),
        updatedBy: mockUserId
      };

      const updatedEvent = { ...mockEvent, ...expectedUpdateData };
      service.updateByAccount.mockResolvedValue(updatedEvent as any);

      const result = await controller.update(eventId, updateEventDto, mockUserId, mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(eventId, expectedUpdateData, mockAccountId);
      expect(result).toEqual(updatedEvent);
    });

    it('should return not found message when event does not exist', async () => {
      const eventId = 'nonexistent-id';
      const updateEventDto: UpdateEventDto = {
        date: '2024-01-16',
        startTime: '10:00',
        endTime: '11:00',
        customer: new Types.ObjectId().toString(),
        technician: [new Types.ObjectId().toString()]
      };

      service.updateByAccount.mockResolvedValue(null);

      const result = await controller.update(eventId, updateEventDto, mockUserId, mockAccountId);

      expect(result).toEqual({ message: 'Event not found' });
    });
  });

  describe('delete', () => {
    it('should delete an event successfully', async () => {
      const eventId = mockEvent._id.toString();

      service.deleteByAccount.mockResolvedValue(true);

      const result = await controller.delete(eventId, mockAccountId);

      expect(service.deleteByAccount).toHaveBeenCalledWith(eventId, mockAccountId);
      expect(result).toEqual({ message: 'Event deleted successfully' });
    });

    it('should return not found message when event does not exist', async () => {
      const eventId = 'nonexistent-id';

      service.deleteByAccount.mockResolvedValue(false);

      const result = await controller.delete(eventId, mockAccountId);

      expect(result).toEqual({ message: 'Event not found' });
    });
  });

  describe('complete', () => {
    it('should complete an event successfully', async () => {
      const eventId = mockEvent._id.toString();
      const completedEvent = { ...mockEvent, status: 'completed' as const };

      service.completeByAccount.mockResolvedValue(completedEvent as any);

      const result = await controller.complete(eventId, {}, mockUserId, mockAccountId);

      expect(service.completeByAccount).toHaveBeenCalledWith(eventId, mockUserId, mockAccountId, undefined, undefined);
      expect(result).toEqual(completedEvent);
    });
  });
});
