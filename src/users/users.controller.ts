import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create users
  async create(@Body() createUserDto: any, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createUserDto.account = accountId;
    createUserDto.createdBy = userId;
    createUserDto.updatedBy = userId;
    return this.usersService.create(
      createUserDto.account,
      createUserDto.firstName as string,
      createUserDto.lastName as string,
      createUserDto.email as string,
      createUserDto.password as string,
      (createUserDto.roles as string[]) || [],
      createUserDto.createdBy as string,
      createUserDto.updatedBy as string
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
  async update(@Param('id') id: string, @Body() updateUserDto: any, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    // Check if user has ADMIN role or is updating their own data
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');
    const isOwnData = user.id === id;

    if (isAdmin || isOwnData) {
      // Prevent updating sensitive system-level fields
      delete updateUserDto.isMasterAdmin; // Master admin status can only be set by master admins through secure channels

      // If not admin, prevent updating other sensitive fields
      if (!isAdmin) {
        delete updateUserDto.roles;
        delete updateUserDto.status;
        delete updateUserDto.account;
      }

      updateUserDto.updatedBy = user.id;
      return this.usersService.update(id, updateUserDto as Partial<User>, accountId);
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
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.usersService.delete(id, accountId);
  }
}
