import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/users/users.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRoleId = new Types.ObjectId();
  const mockCreatedBy = 'user123';
  const mockUpdatedBy = 'user456';

  const mockUser = {
    _id: mockUserId,
    account: mockAccountId,
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@example.com',
    passwordHash: 'hashedpassword',
    roles: [mockRoleId],
    status: 'active' as const,
    language: 'pt-BR',
    createdBy: mockCreatedBy,
    updatedBy: mockUpdatedBy,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUserArray = [mockUser];

  const mockPopulatedUser = {
    ...mockUser,
    account: {
      _id: mockAccountId,
      name: 'Test Account',
      id: 'test-id',
      logoUrl: 'logo.png',
      status: 'active'
    },
    roles: [
      {
        _id: mockRoleId,
        name: 'ADMIN'
      }
    ]
  };

  beforeEach(async () => {
    const mockUserModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockUser,
        ...data,
        toObject: jest.fn().mockReturnValue({
          ...mockUser,
          ...data
        })
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockUserModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUserArray)
        })
      }),
      exec: jest.fn().mockResolvedValue(mockUserArray)
    });
    mockUserModel.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPopulatedUser)
        })
      })
    });
    mockUserModel.findOne = jest.fn().mockImplementation(() => {
      const createMockQuery = () => ({
        populate: jest.fn().mockImplementation(() => createMockQuery()),
        exec: jest.fn()
      });
      return createMockQuery();
    });
    mockUserModel.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn()
        })
      })
    });
    mockUserModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn()
    });
    mockUserModel.deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn()
    });
    mockUserModel.aggregate = jest.fn().mockReturnValue({
      exec: jest.fn()
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      mockedBcrypt.hash.mockResolvedValue('hashedpassword' as never);

      const result = await service.create(
        mockAccountId,
        'João',
        'Silva',
        'joao.silva@example.com',
        'password123',
        [mockRoleId.toString()], // Use valid ObjectId string
        mockCreatedBy,
        mockUpdatedBy
      );

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'joao.silva@example.com' });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userModel).toHaveBeenCalledWith({
        account: mockAccountId,
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        passwordHash: 'hashedpassword',
        roles: [mockRoleId], // Should be ObjectId
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy
      });
      expect(result).toBeDefined();
    });

    it('should throw error if user with email already exists', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      await expect(service.create(mockAccountId, 'João', 'Silva', 'joao.silva@example.com', 'password123', [], mockCreatedBy, mockUpdatedBy)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('findOneByAccountAndEmail', () => {
    it('should return user by account and email', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOneByAccountAndEmail(mockAccountId, 'joao.silva@example.com');

      expect(userModel.findOne).toHaveBeenCalledWith({
        account: mockAccountId,
        email: 'joao.silva@example.com'
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneByEmail', () => {
    it('should return user by email with populated data', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUser)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOneByEmail('joao.silva@example.com');

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'joao.silva@example.com' });
      expect(mockQuery.populate).toHaveBeenCalledWith('account', 'name id logoUrl status');
      expect(mockQuery.populate).toHaveBeenCalledWith('roles');
      expect(result).toEqual(mockPopulatedUser);
    });
  });

  describe('findById', () => {
    it('should return user by id with populated data', async () => {
      const result = await service.findById(mockUserId.toString());

      expect(userModel.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual(mockPopulatedUser);
    });
  });

  describe('findAll', () => {
    it('should return all users with populated data', async () => {
      const result = await service.findAll();

      expect(userModel.find).toHaveBeenCalled();
      expect(result).toEqual({
        users: mockUserArray,
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1
      });
    });
  });

  describe('findByAccount', () => {
    it('should return users by account with pagination and search', async () => {
      const mockUsers = [mockUser];
      const mockCountResult = [{ total: 1 }];

      userModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockUsers)
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'João');

      expect(userModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return empty result when no users found', async () => {
      const mockUsers = [];
      const mockCountResult = [];

      userModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockUsers)
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        });

      const result = await service.findByAccount(mockAccountId, 1, 10, '');

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUser)
      };
      userModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const updateData = {
        firstName: 'João Updated',
        lastName: 'Silva Updated',
        email: 'joao.updated@example.com'
      };

      const result = await service.update(mockUserId.toString(), updateData, mockAccountId);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockUserId.toString(), account: mockAccountId }, updateData, { new: true });
      expect(result).toEqual(mockPopulatedUser);
    });

    it('should hash password when provided', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUser)
      };
      userModel.findOneAndUpdate.mockReturnValue(mockQuery);

      mockedBcrypt.hash.mockResolvedValue('newhashedpassword' as never);

      const updateData = {
        firstName: 'João Updated',
        password: 'newpassword123'
      };

      await service.update(mockUserId.toString(), updateData, mockAccountId);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockUserId.toString(), account: mockAccountId },
        {
          firstName: 'João Updated',
          passwordHash: 'newhashedpassword'
        },
        { new: true }
      );
    });
  });

  describe('updateLanguage', () => {
    it('should update user language successfully', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUser)
      };
      userModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateLanguage(mockUserId.toString(), 'en-US', mockAccountId);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockUserId.toString(), account: mockAccountId }, { language: 'en-US' }, { new: true });
      expect(result).toEqual(mockPopulatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOneAndDelete.mockReturnValue(mockQuery);

      const result = await service.delete(mockUserId.toString(), mockAccountId);

      expect(userModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockUserId.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteById', () => {
    it('should delete user by id only', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOneAndDelete.mockReturnValue(mockQuery);

      const result = await service.deleteById(mockUserId.toString());

      expect(userModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockUserId.toString()
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return user by id and account with populated data', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUser)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByIdAndAccount(mockUserId.toString(), mockAccountId);

      expect(userModel.findOne).toHaveBeenCalledWith({
        _id: mockUserId.toString(),
        account: mockAccountId
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('account', 'name id logoUrl');
      expect(mockQuery.populate).toHaveBeenCalledWith('roles', 'name');
      expect(result).toEqual(mockPopulatedUser);
    });
  });

  describe('updateResetToken', () => {
    it('should update reset token successfully', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const resetToken = 'reset-token-123';
      const resetTokenExpiry = new Date();

      const result = await service.updateResetToken('joao.silva@example.com', resetToken, resetTokenExpiry);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith({ email: 'joao.silva@example.com' }, { resetToken, resetTokenExpiry }, { new: true });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByResetToken', () => {
    it('should return user by valid reset token', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUser)
      };
      userModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByResetToken('reset-token-123');

      expect(userModel.findOne).toHaveBeenCalledWith({
        resetToken: 'reset-token-123',
        resetTokenExpiry: { $gt: expect.any(Date) }
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all users by account', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 })
      };
      userModel.deleteMany.mockReturnValue(mockQuery);

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(userModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual({ deletedCount: 5 });
    });
  });
});
