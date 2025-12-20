import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create users
  async create(@Body() createUserDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createUserDto.account = req.user.account;
    createUserDto.createdBy = req.user.id;
    createUserDto.updatedBy = req.user.id;
    return this.usersService.create(
      createUserDto.account as string,
      createUserDto.firstName as string,
      createUserDto.lastName as string,
      createUserDto.email as string,
      createUserDto.password as string,
      createUserDto.username as string,
      (createUserDto.roles as string[]) || [],
      createUserDto.createdBy as string,
      createUserDto.updatedBy as string
    );
  }

  @Get()
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '', @Request() req: any) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Check if user has ADMIN role
    const isAdmin = req.user.roles?.some((role: any) => role.name === 'ADMIN');

    if (isAdmin) {
      // ADMIN can see all users in their account
      return this.usersService.findByAccount(req.user.account.toString(), pageNum, limitNum, search);
    } else {
      // Regular users can only see themselves
      const user = await this.usersService.findByIdAndAccount(req.user.id as string, req.user.account.toString());
      return {
        users: user ? [user] : [],
        total: user ? 1 : 0,
        page: 1,
        limit: 1,
        totalPages: 1
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    // Check if user has ADMIN role or is requesting their own data
    const isAdmin = req.user.roles?.some((role: any) => role.name === 'ADMIN');
    const isOwnData = req.user.id === id;

    if (isAdmin || isOwnData) {
      return this.usersService.findByIdAndAccount(id, req.user.account.toString());
    } else {
      // Not authorized
      return null;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: any, @Request() req: any) {
    // Check if user has ADMIN role or is updating their own data
    const isAdmin = req.user.roles?.some((role: any) => role.name === 'ADMIN');
    const isOwnData = req.user.id === id;

    if (isAdmin || isOwnData) {
      // If not admin, prevent updating sensitive fields
      if (!isAdmin) {
        delete updateUserDto.roles;
        delete updateUserDto.status;
        delete updateUserDto.account;
      }

      updateUserDto.updatedBy = req.user.id;
      return this.usersService.update(id, updateUserDto as Partial<User>, req.user.account.toString());
    } else {
      // Not authorized
      return null;
    }
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete users
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.delete(id, req.user.account.toString());
  }
}
