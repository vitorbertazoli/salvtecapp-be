import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../src/users/dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRoleId = new Types.ObjectId();

  const mockUser = {
    _id: mockUserId,
    account: mockAccountId,
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@example.com',
    roles: [mockRoleId],
    status: 'active',
    language: 'pt-BR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutSensitive = {
    _id: mockUserId,
    account: mockAccountId,
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@example.com',
    roles: [mockRoleId],
    status: 'active',
    language: 'pt-BR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser = {
    id: 'admin-id',
    roles: ['ADMIN'],
    isMasterAdmin: false,
  };

  const mockMasterAdminUser = {
    id: 'master-admin-id',
    roles: ['ADMIN'],
    isMasterAdmin: true,
  };

  const mockRegularUser = {
    id: mockUserId.toString(),
    roles: ['USER'],
    isMasterAdmin: false,
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByAccount: jest.fn(),
      findByIdAndAccount: jest.fn(),
      update: jest.fn(),
      updateLanguage: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard() // Mock guards
      .useValue({})
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user and return sanitized data', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        password: 'password123',
        roles: ['role1'],
      };

      usersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockAccountId, 'user-id');

      expect(usersService.create).toHaveBeenCalledWith(
        mockAccountId,
        'João',
        'Silva',
        'joao.silva@example.com',
        'password123',
        ['role1'],
        'user-id',
        'user-id'
      );
      expect(result).toEqual(mockUserWithoutSensitive);
    });

    it('should create user with empty roles array when roles not provided', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        password: 'password123',
      };

      usersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockAccountId, 'user-id');

      expect(usersService.create).toHaveBeenCalledWith(
        mockAccountId,
        'João',
        'Silva',
        'joao.silva@example.com',
        'password123',
        [],
        'user-id',
        'user-id'
      );
      expect(result).toEqual(mockUserWithoutSensitive);
    });
  });

  describe('findAll', () => {
    it('should return all users for master admin', async () => {
      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      usersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', mockAccountId, mockMasterAdminUser);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockResult,
        users: [mockUserWithoutSensitive],
      });
    });

    it('should return users by account for admin user', async () => {
      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      usersService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', 'João', mockAccountId, mockAdminUser);

      expect(usersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, 'João');
      expect(result).toEqual({
        ...mockResult,
        users: [mockUserWithoutSensitive],
      });
    });

    it('should return only own user data for regular user', async () => {
      usersService.findByIdAndAccount.mockResolvedValue(mockUser);

      const result = await controller.findAll('1', '10', '', mockAccountId, mockRegularUser);

      expect(usersService.findByIdAndAccount).toHaveBeenCalledWith(mockUserId.toString(), mockAccountId);
      expect(result).toEqual({
        users: [mockUserWithoutSensitive],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      });
    });

    it('should return empty array when regular user not found', async () => {
      usersService.findByIdAndAccount.mockResolvedValue(null);

      const result = await controller.findAll('1', '10', '', mockAccountId, mockRegularUser);

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return user data for admin user', async () => {
      usersService.findByIdAndAccount.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUserId.toString(), mockAccountId, mockAdminUser);

      expect(usersService.findByIdAndAccount).toHaveBeenCalledWith(mockUserId.toString(), mockAccountId);
      expect(result).toEqual(mockUserWithoutSensitive);
    });

    it('should return user data for own user', async () => {
      usersService.findByIdAndAccount.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUserId.toString(), mockAccountId, mockRegularUser);

      expect(usersService.findByIdAndAccount).toHaveBeenCalledWith(mockUserId.toString(), mockAccountId);
      expect(result).toEqual(mockUserWithoutSensitive);
    });

    it('should return null when regular user tries to access other user data', async () => {
      const result = await controller.findOne('other-user-id', mockAccountId, mockRegularUser);

      expect(usersService.findByIdAndAccount).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user data for admin user', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'João Updated',
        lastName: 'Silva Updated',
        email: 'joao.updated@example.com',
        password: 'newpassword123',
        roles: [mockRoleId.toString()], // Use valid ObjectId string
        status: 'active',
        language: 'en-US',
      };

      usersService.update.mockResolvedValue(mockUser);

      const result = await controller.update(mockUserId.toString(), updateUserDto, mockAccountId, mockAdminUser);

      expect(usersService.update).toHaveBeenCalledWith(
        mockUserId.toString(),
        {
          firstName: 'João Updated',
          lastName: 'Silva Updated',
          email: 'joao.updated@example.com',
          password: 'newpassword123',
          status: 'active',
          language: 'en-US',
          updatedBy: 'admin-id',
          roles: [mockRoleId], // Should be ObjectId
        },
        mockAccountId
      );
      expect(result).toEqual({ message: 'User updated successfully' });
    });

    it('should update own user data for regular user with restrictions', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'João Updated',
        lastName: 'Silva Updated',
        email: 'joao.updated@example.com',
        password: 'newpassword123',
        roles: [mockRoleId.toString()], // Use valid ObjectId string - this should be removed
        status: 'inactive', // This should be removed
        language: 'en-US',
      };

      usersService.update.mockResolvedValue(mockUser);

      const result = await controller.update(mockUserId.toString(), updateUserDto, mockAccountId, mockRegularUser);

      expect(usersService.update).toHaveBeenCalledWith(
        mockUserId.toString(),
        {
          firstName: 'João Updated',
          lastName: 'Silva Updated',
          email: 'joao.updated@example.com',
          password: 'newpassword123',
          language: 'en-US',
          updatedBy: mockUserId.toString(),
          // roles and status should be removed
        },
        mockAccountId
      );
      expect(result).toEqual({ message: 'User updated successfully' });
    });

    it('should return null when regular user tries to update other user data', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'João Updated',
      };

      const result = await controller.update('other-user-id', updateUserDto, mockAccountId, mockRegularUser);

      expect(usersService.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('updateLanguage', () => {
    it('should update language for own user', async () => {
      usersService.updateLanguage.mockResolvedValue(mockUser);

      const result = await controller.updateLanguage(mockUserId.toString(), { language: 'en-US' }, mockAccountId, mockRegularUser);

      expect(usersService.updateLanguage).toHaveBeenCalledWith(mockUserId.toString(), 'en-US', mockAccountId);
      expect(result).toEqual({ message: 'Language updated successfully' });
    });

    it('should return null when user tries to update other user language', async () => {
      const result = await controller.updateLanguage('other-user-id', { language: 'en-US' }, mockAccountId, mockRegularUser);

      expect(usersService.updateLanguage).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete user for admin user', async () => {
      usersService.delete.mockResolvedValue(mockUser);

      const result = await controller.remove(mockUserId.toString(), mockAccountId, mockAdminUser);

      expect(usersService.delete).toHaveBeenCalledWith(mockUserId.toString(), mockAccountId);
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should delete user across all accounts for master admin', async () => {
      usersService.deleteById.mockResolvedValue(mockUser);

      const result = await controller.remove(mockUserId.toString(), mockAccountId, mockMasterAdminUser);

      expect(usersService.deleteById).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual(mockUser);
    });
  });
});