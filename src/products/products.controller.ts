import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create products
  create(@Body() createProductDto: CreateProductDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const productData = {
      ...createProductDto,
      account: accountId,
      createdBy: userId,
      updatedBy: userId
    };
    return this.productsService.create(productData);
  }
  213
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    // Always filter by the user's account from JWT token
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.productsService.findByAccount(accountId, pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.productsService.findOne(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update products
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const productData = {
      ...updateProductDto,
      updatedBy: userId
    };
    return this.productsService.update(id, productData, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete products
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.productsService.delete(id, accountId);
  }
}
