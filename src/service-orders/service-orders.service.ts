import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { QuoteToServiceOrderService } from '../quote-to-service-order/quote-to-service-order.service';
import { Technician, TechnicianDocument } from '../technicians/schemas/technician.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { UpdateWorkSessionDto } from './dto/update-work-session.dto';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from './schemas/service-order.schema';
import { calculateServiceOrderTotals } from './utils/service-order-totals';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private quoteToServiceOrderService: QuoteToServiceOrderService
  ) {}

  private roundHours(value: number): number {
    return Math.round(Math.max(0, value) * 100) / 100;
  }

  private getSessionDurationHours(startedAt: Date, endedAt: Date): number {
    return this.roundHours((endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60));
  }

  private validateSessionDates(startedAt: Date, endedAt: Date) {
    if (endedAt <= startedAt) {
      throw new BadRequestException('serviceOrders.errors.invalidWorkSessionRange');
    }
  }

  private ensureNoOverlap(serviceOrder: ServiceOrderDocument, technicianId: Types.ObjectId, startedAt: Date, endedAt: Date, skipSessionId?: string) {
    const workSessions = serviceOrder.workSessions || [];
    const hasOverlap = workSessions.some((session) => {
      const sessionId = (session as any)._id?.toString();
      if (skipSessionId && sessionId === skipSessionId) {
        return false;
      }

      if (session.technician.toString() !== technicianId.toString()) {
        return false;
      }

      const existingStart = new Date(session.startedAt);
      const existingEnd = new Date(session.endedAt);
      return startedAt < existingEnd && endedAt > existingStart;
    });

    if (hasOverlap) {
      throw new BadRequestException('serviceOrders.errors.workSessionOverlap');
    }
  }

  private recomputeExecutionFields(serviceOrder: ServiceOrderDocument) {
    const workSessions = serviceOrder.workSessions || [];
    if (workSessions.length === 0) {
      serviceOrder.totalElapsedHours = 0;
      serviceOrder.startedAt = undefined;
      serviceOrder.completedAt = undefined;
      return;
    }

    const sorted = [...workSessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    const total = sorted.reduce((sum, session) => {
      return sum + this.getSessionDurationHours(new Date(session.startedAt), new Date(session.endedAt));
    }, 0);

    serviceOrder.startedAt = new Date(sorted[0].startedAt);
    serviceOrder.completedAt = new Date(sorted[sorted.length - 1].endedAt);
    serviceOrder.totalElapsedHours = this.roundHours(total);
  }

  private async enrichWorkSessionTechnicians(baseServiceOrder: any) {
    const workSessions = baseServiceOrder.workSessions || [];
    const technicianIds = [
      ...new Set(
        workSessions
          .map((session: any) => {
            const technician = session?.technician;
            if (!technician) {
              return undefined;
            }

            if (typeof technician === 'string') {
              return technician;
            }

            return technician._id?.toString?.();
          })
          .filter(Boolean)
      )
    ];

    if (technicianIds.length === 0) {
      return baseServiceOrder;
    }

    const technicians = await this.technicianModel
      .find({ _id: { $in: technicianIds } })
      .lean()
      .exec();
    const userIds = technicians.map((technician: any) => technician.user?.toString?.()).filter(Boolean);
    const users =
      userIds.length > 0
        ? await this.userModel
            .find({ _id: { $in: userIds } })
            .lean()
            .exec()
        : [];
    const usersById = new Map(users.map((user: any) => [user._id.toString(), user]));
    const techniciansById = new Map(
      technicians.map((technician: any) => {
        const user = technician.user ? usersById.get(technician.user.toString()) : undefined;
        const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

        return [
          technician._id.toString(),
          {
            _id: technician._id,
            name: name || technician._id.toString(),
            email: user?.email,
            phoneNumber: user?.phoneNumber
          }
        ];
      })
    );

    return {
      ...baseServiceOrder,
      workSessions: workSessions.map((session: any) => {
        const technician = session?.technician;
        const technicianId = typeof technician === 'string' ? technician : technician?._id?.toString?.();
        const resolvedTechnician = technicianId ? techniciansById.get(technicianId) : undefined;

        return {
          ...session,
          technician: resolvedTechnician || technician
        };
      })
    };
  }

  private async mapServiceOrderForResponse(serviceOrder: ServiceOrderDocument | null) {
    if (!serviceOrder) {
      return null;
    }

    const rawServiceOrder = (serviceOrder as any).toObject ? (serviceOrder as any).toObject() : serviceOrder;
    const baseServiceOrder = await this.enrichWorkSessionTechnicians(rawServiceOrder);

    const workSessions = (baseServiceOrder.workSessions || []).map((session: any) => {
      const normalizedSession = session.toObject?.() ?? session;
      const technician = normalizedSession.technician;
      const technicianUser = technician?.user;
      const technicianName = technicianUser ? `${technicianUser.firstName || ''} ${technicianUser.lastName || ''}`.trim() : technician?.name;

      return {
        ...normalizedSession,
        technician:
          technician && typeof technician === 'object'
            ? {
                _id: technician._id,
                name: technicianName || technician._id?.toString?.() || '-',
                email: technicianUser?.email,
                phoneNumber: technicianUser?.phoneNumber
              }
            : technician,
        durationHours: this.getSessionDurationHours(new Date(session.startedAt), new Date(session.endedAt))
      };
    });

    const sortedSessions = workSessions.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    return {
      ...baseServiceOrder,
      workSessions: sortedSessions,
      totalElapsedHours: this.roundHours(
        sortedSessions.reduce((sum, session) => sum + this.getSessionDurationHours(new Date(session.startedAt), new Date(session.endedAt)), 0)
      )
    };
  }

  async create(serviceOrderData: Partial<ServiceOrder>): Promise<ServiceOrder> {
    // Generate order number if not provided
    if (!serviceOrderData.orderNumber) {
      const year = new Date().getFullYear();
      // generate a 6 digit random string using bcrypt, remove special characters and take first 8 characters
      const randomString = (await bcrypt.hash(Date.now().toString(), 5)).replace(/\W/g, '').slice(0, 8).toUpperCase();
      serviceOrderData.orderNumber = `SO-${year}-${randomString}`;
    }

    const createdServiceOrder = new this.serviceOrderModel(serviceOrderData);
    const savedServiceOrder = await createdServiceOrder.save();
    return savedServiceOrder.toObject() as any;
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    statuses?: string[],
    customerId?: string
  ): Promise<{
    serviceOrders: ServiceOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    if (statuses && statuses.length > 0) {
      matchConditions.status = { $in: statuses };
    }
    if (customerId) {
      matchConditions.customer = new Types.ObjectId(customerId);
    }

    // Build search pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Join with customers collection
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      // Join with accounts collection
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
      // Join with quotes collection
      {
        $lookup: {
          from: 'quotes',
          localField: 'quote',
          foreignField: '_id',
          as: 'quote'
        }
      },
      { $unwind: { path: '$quote', preserveNullAndEmptyArrays: true } },
      // Join with technicians collection
      {
        $lookup: {
          from: 'technicians',
          localField: 'assignedTechnician',
          foreignField: '_id',
          as: 'assignedTechnician'
        }
      },
      { $unwind: { path: '$assignedTechnician', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { orderNumber: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { _id: Types.ObjectId.isValid(search) ? new Types.ObjectId(search) : undefined },
            { 'customer.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting, pagination
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Project to limit fields
      {
        $project: {
          'account.name': 1,
          'account.id': 1,
          'customer.name': 1,
          'customer.email': 1,
          'customer.phoneNumbers': 1,
          'customer.address': 1,
          'customer.id': 1,
          'quote.quoteId': 1,
          'assignedTechnician.name': 1,
          'assignedTechnician.email': 1,
          'assignedTechnician.phoneNumber': 1,
          'assignedTechnician.id': 1,
          orderNumber: 1,
          equipments: 1,
          items: 1,
          description: 1,
          discount: 1,
          applyServiceTax: 1,
          serviceTaxPercent: 1,
          serviceTaxAmount: 1,
          subtotal: 1,
          totalValue: 1,
          issuedAt: 1,
          scheduledDate: 1,
          startedAt: 1,
          completedAt: 1,
          status: 1,
          priority: 1,
          notes: 1,
          customerNotes: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    // Get total count with search filter
    const countPipeline = [...pipeline];
    countPipeline.splice(countPipeline.length - 3, 3, { $count: 'total' });

    const [serviceOrders, countResult] = await Promise.all([
      this.serviceOrderModel.aggregate(pipeline).exec(),
      search ? this.serviceOrderModel.aggregate(countPipeline).exec() : this.serviceOrderModel.countDocuments(matchConditions).exec()
    ]);

    const total = search && Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : (countResult as number);
    const totalPages = Math.ceil(total / limit);

    return {
      serviceOrders,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<ServiceOrderDocument | null> {
    const serviceOrder = await this.serviceOrderModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumbers address id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email phoneNumber id')
      .populate({ path: 'workSessions.technician', populate: { path: 'user', select: 'firstName lastName email phoneNumber' } })
      .populate('items.service', 'name')
      .populate('items.product', 'name')
      .exec();

    return await this.mapServiceOrderForResponse(serviceOrder);
  }

  async updateByAccount(id: string, serviceOrderData: Partial<ServiceOrder>, accountId: Types.ObjectId): Promise<ServiceOrder | null> {
    const query = { _id: id, account: accountId };

    const updatedServiceOrder = await this.serviceOrderModel
      .findOneAndUpdate(query, serviceOrderData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email address id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email id')
      .exec();

    return updatedServiceOrder;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<ServiceOrder | null> {
    const query = { _id: id, account: accountId };
    return this.serviceOrderModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.serviceOrderModel.deleteMany({ account: accountId }).exec();
  }

  async findByCustomerAndAccount(customerId: string, accountId: Types.ObjectId): Promise<ServiceOrder[]> {
    return this.serviceOrderModel
      .find({
        customer: new Types.ObjectId(customerId),
        account: accountId,
        status: { $in: ['pending', 'scheduled', 'in_progress'] }
      })
      .populate('customer', 'name email phoneNumbers address id')
      .populate('assignedTechnician', 'name email phoneNumber id')
      .select('orderNumber description status priority scheduledDate createdAt customer assignedTechnician')
      .sort({ createdAt: -1 })
      .exec();
  }

  async createChangeOrder(
    serviceOrderId: string,
    modifiedItems: ServiceOrderItem[],
    accountId: Types.ObjectId,
    userId: Types.ObjectId,
    description?: string,
    discount?: number,
    applyServiceTax?: boolean,
    serviceTaxPercent?: number,
    otherDiscounts?: { description: string; amount: number }[],
    equipments?: any[]
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.errors.notFound');
    }

    // Calculate new version
    const version = (serviceOrder.changeOrders?.length || 0) + 1;

    // Calculate totals for modified items
    const nextApplyServiceTax = applyServiceTax ?? serviceOrder.applyServiceTax ?? false;
    const nextServiceTaxPercent = serviceTaxPercent ?? serviceOrder.serviceTaxPercent ?? 0;
    const { subtotal, serviceTaxAmount, totalValue } = calculateServiceOrderTotals({
      items: modifiedItems,
      discount: discount || 0,
      otherDiscounts: otherDiscounts || [],
      applyServiceTax: nextApplyServiceTax,
      serviceTaxPercent: nextServiceTaxPercent
    });

    const changeOrder = {
      version,
      originalItems: serviceOrder.items,
      modifiedItems,
      originalEquipments: serviceOrder.equipments || [],
      modifiedEquipments: equipments || [],
      description,
      discount: discount || 0,
      applyServiceTax: nextApplyServiceTax,
      serviceTaxPercent: nextServiceTaxPercent,
      serviceTaxAmount,
      otherDiscounts: otherDiscounts || [],
      subtotal,
      totalValue,
      status: 'pending' as const,
      createdBy: userId,
      createdAt: new Date()
    };

    // Add change order to service order
    serviceOrder.changeOrders = serviceOrder.changeOrders || [];
    serviceOrder.changeOrders.push(changeOrder);
    serviceOrder.updatedBy = userId;

    return serviceOrder.save();
  }

  async approveChangeOrder(serviceOrderId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.notFound');
    }

    const changeOrder = serviceOrder.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('serviceOrders.errors.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('serviceOrders.errors.changeOrderNotPending');
    }

    // Update change order status
    changeOrder.status = 'approved';
    changeOrder.approvedAt = new Date();
    changeOrder.approvedBy = userId;

    // Update service order items and totals
    serviceOrder.description = changeOrder.description;
    serviceOrder.items = changeOrder.modifiedItems;
    serviceOrder.subtotal = changeOrder.subtotal;
    serviceOrder.totalValue = changeOrder.totalValue;
    serviceOrder.discount = changeOrder.discount;
    serviceOrder.applyServiceTax = changeOrder.applyServiceTax;
    serviceOrder.serviceTaxPercent = changeOrder.serviceTaxPercent;
    serviceOrder.serviceTaxAmount = changeOrder.serviceTaxAmount;
    serviceOrder.otherDiscounts = changeOrder.otherDiscounts;
    serviceOrder.equipments = changeOrder.modifiedEquipments || [];
    serviceOrder.updatedBy = userId;

    // Mark changeOrders as modified for Mongoose to detect the change
    serviceOrder.markModified('changeOrders');

    const savedServiceOrder = await serviceOrder.save();
    return savedServiceOrder;
  }

  async rejectChangeOrder(serviceOrderId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.notFound');
    }

    const changeOrder = serviceOrder.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('serviceOrders.errors.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('serviceOrders.errors.changeOrderNotPending');
    }

    // Update change order status
    changeOrder.status = 'rejected';
    changeOrder.approvedBy = userId; // Use approvedBy for rejection as well

    serviceOrder.updatedBy = userId;

    // Mark changeOrders as modified for Mongoose to detect the change
    serviceOrder.markModified('changeOrders');

    return serviceOrder.save();
  }

  async createWorkSession(serviceOrderId: string, dto: CreateWorkSessionDto, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.errors.notFound');
    }

    const technicianId = dto.technician ? new Types.ObjectId(dto.technician) : serviceOrder.assignedTechnician;
    if (!technicianId) {
      throw new BadRequestException('serviceOrders.errors.workSessionTechnicianRequired');
    }

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    this.validateSessionDates(startedAt, endedAt);
    this.ensureNoOverlap(serviceOrder, technicianId, startedAt, endedAt);

    serviceOrder.workSessions = serviceOrder.workSessions || [];
    serviceOrder.workSessions.push({
      startedAt,
      endedAt,
      technician: technicianId,
      notes: dto.notes,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);

    this.recomputeExecutionFields(serviceOrder);
    serviceOrder.updatedBy = userId;
    serviceOrder.markModified('workSessions');

    await serviceOrder.save();
    const populatedServiceOrder = await this.findByIdAndAccount(serviceOrderId, accountId);
    return populatedServiceOrder as any;
  }

  async updateWorkSession(
    serviceOrderId: string,
    sessionId: string,
    dto: UpdateWorkSessionDto,
    accountId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.errors.notFound');
    }

    const targetSession = (serviceOrder.workSessions || []).find((session) => (session as any)._id?.toString() === sessionId);
    if (!targetSession) {
      throw new NotFoundException('serviceOrders.errors.workSessionNotFound');
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date(targetSession.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : new Date(targetSession.endedAt);
    const technicianId = dto.technician ? new Types.ObjectId(dto.technician) : targetSession.technician;

    this.validateSessionDates(startedAt, endedAt);
    this.ensureNoOverlap(serviceOrder, technicianId, startedAt, endedAt, sessionId);

    targetSession.startedAt = startedAt;
    targetSession.endedAt = endedAt;
    targetSession.technician = technicianId;
    targetSession.notes = dto.notes ?? targetSession.notes;
    targetSession.updatedBy = userId;
    targetSession.updatedAt = new Date();

    this.recomputeExecutionFields(serviceOrder);
    serviceOrder.updatedBy = userId;
    serviceOrder.markModified('workSessions');

    await serviceOrder.save();
    const populatedServiceOrder = await this.findByIdAndAccount(serviceOrderId, accountId);
    return populatedServiceOrder as any;
  }

  async deleteWorkSession(
    serviceOrderId: string,
    sessionId: string,
    accountId: Types.ObjectId,
    userId: Types.ObjectId,
    legacyMatch?: {
      startedAt?: string;
      endedAt?: string;
      technicianId?: string;
    }
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.errors.notFound');
    }

    const workSessions = serviceOrder.workSessions || [];
    const previousLength = workSessions.length;
    serviceOrder.workSessions = workSessions.filter((session) => (session as any)._id?.toString() !== sessionId);

    if (serviceOrder.workSessions.length === previousLength && legacyMatch?.startedAt && legacyMatch?.endedAt) {
      const startedAtMs = new Date(legacyMatch.startedAt).getTime();
      const endedAtMs = new Date(legacyMatch.endedAt).getTime();
      const technicianId = legacyMatch.technicianId;

      const matchIndex = workSessions.findIndex((session) => {
        const sessionStartedAtMs = new Date(session.startedAt).getTime();
        const sessionEndedAtMs = new Date(session.endedAt).getTime();
        const technicianMatches = technicianId ? session.technician?.toString() === technicianId : true;

        return technicianMatches && sessionStartedAtMs === startedAtMs && sessionEndedAtMs === endedAtMs;
      });

      if (matchIndex >= 0) {
        serviceOrder.workSessions = workSessions.filter((_, index) => index !== matchIndex);
      }
    }

    if (serviceOrder.workSessions.length === previousLength) {
      throw new NotFoundException('serviceOrders.errors.workSessionNotFound');
    }

    this.recomputeExecutionFields(serviceOrder);
    serviceOrder.updatedBy = userId;
    serviceOrder.markModified('workSessions');

    await serviceOrder.save();
    const populatedServiceOrder = await this.findByIdAndAccount(serviceOrderId, accountId);
    return populatedServiceOrder as any;
  }
}
