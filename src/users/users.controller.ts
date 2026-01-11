import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create users
  async create(@Body() createUserDto: CreateUserDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.usersService.create(
      accountId,
      createUserDto.firstName,
      createUserDto.lastName,
      createUserDto.email,
      createUserDto.password,
      createUserDto.roles || [],
      userId,
      userId
    );
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser() user: any
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Check if user has ADMIN role
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');
    const isMasterAdmin = user.isMasterAdmin;

    if (isMasterAdmin) {
      // Master Admin can see all users across all accounts
      return this.usersService.findAll();
    }

    if (isAdmin) {
      // ADMIN can see all users in their account
      return this.usersService.findByAccount(accountId, pageNum, limitNum, search);
    } else {
      // Regular users can only see themselves
      const userData = await this.usersService.findByIdAndAccount(user.id as string, accountId);
      return {
        users: userData ? [userData] : [],
        total: userData ? 1 : 0,
        page: 1,
        limit: 1,
        totalPages: 1
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    // Check if user has ADMIN role or is requesting their own data
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');
    const isOwnData = user.id === id;

    if (isAdmin || isOwnData) {
      return this.usersService.findByIdAndAccount(id, accountId);
    } else {
      // Not authorized
      return null;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    // Check if user has ADMIN role or is updating their own data
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');
    const isOwnData = user.id === id;

    if (isAdmin || isOwnData) {
      // If not admin, prevent updating sensitive fields
      if (!isAdmin) {
        delete updateUserDto.roles;
        delete updateUserDto.status;
      }

      const userData: Partial<User> & { password?: string } = {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        email: updateUserDto.email,
        password: updateUserDto.password,
        status: updateUserDto.status,
        language: updateUserDto.language,
        updatedBy: user.id,
        // Convert role strings to ObjectIds if roles are provided
        ...(updateUserDto.roles && {
          roles: updateUserDto.roles.map((role) => new Types.ObjectId(role))
        })
      };
      return this.usersService.update(id, userData, accountId);
    } else {
      // Not authorized
      return null;
    }
  }

  @Patch(':id')
  async updateLanguage(@Param('id') id: string, @Body() body: { language: string }, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    // Users can only update their own language preference
    if (user.id !== id) {
      return null;
    }

    return this.usersService.updateLanguage(id, body.language, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete users
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    if (user.isMasterAdmin) {
      console.log(`Master admin ${user.id} is deleting user ${id} across all accounts.`);
      return this.usersService.deleteById(id);
    }
    return this.usersService.delete(id, accountId);
  }
}
