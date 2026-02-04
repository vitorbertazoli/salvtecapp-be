import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { DashboardController } from '../src/dashboard/dashboard.controller';
import { DashboardService } from '../src/dashboard/dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');

  const mockStats = {
    customerCount: 25,
    technicianCount: 8,
    openQuotesCount: 12,
    openServiceOrdersCount: 5,
    todaysEventsCount: 3,
    monthlySalesData: [
      { date: '2024-01-01', sales: 1500 },
      { date: '2024-01-02', sales: 2200 }
    ]
  };

  beforeEach(async () => {
    const mockDashboardService = {
      getStats: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return dashboard statistics successfully', async () => {
      dashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockAccountId);

      expect(dashboardService.getStats).toHaveBeenCalledWith(mockAccountId, undefined, undefined);
      expect(result).toEqual(mockStats);
    });

    it('should handle empty statistics', async () => {
      const emptyStats = {
        customerCount: 0,
        technicianCount: 0,
        openQuotesCount: 0,
        openServiceOrdersCount: 0,
        todaysEventsCount: 0,
        monthlySalesData: []
      };

      dashboardService.getStats.mockResolvedValue(emptyStats);

      const result = await controller.getStats(mockAccountId);

      expect(dashboardService.getStats).toHaveBeenCalledWith(mockAccountId, undefined, undefined);
      expect(result).toEqual(emptyStats);
    });

    it('should handle statistics with data', async () => {
      dashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockAccountId);

      expect(result.customerCount).toBe(25);
      expect(result.technicianCount).toBe(8);
      expect(result.openQuotesCount).toBe(12);
      expect(result.openServiceOrdersCount).toBe(5);
      expect(result.todaysEventsCount).toBe(3);
      expect(result.monthlySalesData).toHaveLength(2);
    });
  });
});
