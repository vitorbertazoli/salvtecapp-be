import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create products
  create(@Body() createProductDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createProductDto.account = req.user.account;
    createProductDto.createdBy = req.user.id;
    createProductDto.updatedBy = req.user.id;
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '', @Request() req: any) {
    // Always filter by the user's account from JWT token
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.productsService.findByAccount(req.user.account.toString(), pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.productsService.findOne(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update products
  update(@Param('id') id: string, @Body() updateProductDto: any, @Request() req: any) {
    return this.productsService.update(id, updateProductDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete products
  remove(@Param('id') id: string, @Request() req: any) {
    return this.productsService.delete(id, req.user.account.toString());
  }
}
