import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { promises as fs } from 'fs';
import { Model, Types } from 'mongoose';
import { diskStorage } from 'multer';
import { extname } from 'path';
import sharp from 'sharp';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';
import { AddNoteDto } from './dto/add-note.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async create(@Body() dto: CreateCustomerDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    // Check account plan limits for free accounts
    const account = await this.accountModel.findById(accountId);
    if (account?.plan === 'free') {
      const currentCustomerCount = await this.customersService.countByAccount(accountId);
      if (currentCustomerCount >= 20) {
        throw new BadRequestException('customers.errors.freePlanLimitReached');
      }
    }

    const customerData = {
      ...dto,
      account: accountId,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.customersService.create(customerData, accountId);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see customers in their account
    return this.customersService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update customers
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const customerData = {
      ...dto,
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.customersService.updateByAccount(id, customerData, accountId);
  }

  @Post(':id/notes')
  async addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.addNote(id, dto, userId, accountId);
  }

  @Put(':id/notes/:noteId')
  async updateNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: AddNoteDto,
    @GetUser('id') userId: string,
    @GetAccountId() accountId: Types.ObjectId
  ) {
    return this.customersService.updateNote(id, noteId, dto, userId, accountId);
  }

  @Delete(':id/notes/:noteId')
  async deleteNote(@Param('id') id: string, @Param('noteId') noteId: string, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.deleteNote(id, noteId, userId, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete customers
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.deleteByAccount(id, accountId);
  }

  @Post(':id/equipments/:equipmentIndex/pictures')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // ADMIN and SUPERVISOR can upload equipment pictures
  @UseInterceptors(
    FileInterceptor('pictures', {
      storage: diskStorage({
        destination: './uploads/equipment-pictures',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `equipment-${req.params.id}-${req.params.equipmentIndex}-${uniqueSuffix}${ext}`);
        }
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // Increased to 10MB to allow for original upload before resizing
      }
    })
  )
  async uploadEquipmentPicture(
    @Param('id') id: string,
    @Param('equipmentIndex') equipmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process the single file
    const inputPath = `./uploads/equipment-pictures/${file.filename}`;

    try {
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();

      // Only resize if image is larger than 720p
      if (metadata.width > 1280 || metadata.height > 720) {
        // Resize to fit within 720p while maintaining aspect ratio
        await sharp(inputPath)
          .resize(1280, 720, {
            fit: 'inside',
            withoutEnlargement: true // Do not enlarge smaller images
          })
          .jpeg({ quality: 85 })
          .png({ compressionLevel: 6 })
          .toFile(`${inputPath}.resized`);

        // Replace original with resized version
        await fs.rename(`${inputPath}.resized`, inputPath);
      } else {
        // For smaller images, just compress
        const isJpeg = file.mimetype === 'image/jpeg';
        const isPng = file.mimetype === 'image/png';

        if (isJpeg) {
          await sharp(inputPath).jpeg({ quality: 85 }).toFile(`${inputPath}.compressed`);
          await fs.rename(`${inputPath}.compressed`, inputPath);
        } else if (isPng) {
          await sharp(inputPath).png({ compressionLevel: 6 }).toFile(`${inputPath}.compressed`);
          await fs.rename(`${inputPath}.compressed`, inputPath);
        }
      }
    } catch (error) {
      console.error(`Error processing image ${file.filename}:`, error);
      // Continue with original file if processing fails
    }

    // Handle single file
    const pictureUrl = `/uploads/equipment-pictures/${file.filename}`;

    return await this.customersService.addEquipmentPicture(id, equipmentId, [pictureUrl], accountId);
  }

  @Delete(':id/equipments/:equipmentId/pictures/:index')
  @Roles('ADMIN', 'SUPERVISOR')
  async deleteEquipmentPicture(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Param('index') pictureIndex: string,
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const index = parseInt(pictureIndex, 10);
    return await this.customersService.deleteEquipmentPicture(id, equipmentId, index, accountId);
  }

  @Post(':id/pictures')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // All roles can upload customer pictures
  @UseInterceptors(
    FileInterceptor('picture', {
      storage: diskStorage({
        destination: './uploads/customer-pictures',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `customer-${req.params.id}-${uniqueSuffix}${ext}`);
        }
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    })
  )
  async uploadCustomerPicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process the file (resize and compress)
    const inputPath = `./uploads/customer-pictures/${file.filename}`;

    try {
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();

      // Only resize if image is larger than 720p
      if (metadata.width > 1280 || metadata.height > 720) {
        // Resize to fit within 720p while maintaining aspect ratio
        await sharp(inputPath)
          .resize(1280, 720, {
            fit: 'inside',
            withoutEnlargement: true // Do not enlarge smaller images
          })
          .jpeg({ quality: 85 })
          .png({ compressionLevel: 6 })
          .toFile(`${inputPath}.resized`);

        // Replace original with resized version
        await fs.rename(`${inputPath}.resized`, inputPath);
      } else {
        // For smaller images, just compress
        const isJpeg = file.mimetype === 'image/jpeg';
        const isPng = file.mimetype === 'image/png';

        if (isJpeg) {
          await sharp(inputPath).jpeg({ quality: 85 }).toFile(`${inputPath}.compressed`);
          await fs.rename(`${inputPath}.compressed`, inputPath);
        } else if (isPng) {
          await sharp(inputPath).png({ compressionLevel: 6 }).toFile(`${inputPath}.compressed`);
          await fs.rename(`${inputPath}.compressed`, inputPath);
        }
      }
    } catch (error) {
      console.error(`Error processing image ${file.filename}:`, error);
      // Continue with original file if processing fails
    }

    // Create picture URL
    const pictureUrl = `/uploads/customer-pictures/${file.filename}`;

    return await this.customersService.addCustomerPicture(id, pictureUrl, userId, accountId);
  }

  @Delete(':id/pictures/:pictureId')
  @Roles('ADMIN', 'SUPERVISOR')
  async deleteCustomerPicture(@Param('id') id: string, @Param('pictureId') pictureId: string, @GetAccountId() accountId: Types.ObjectId) {
    return await this.customersService.deleteCustomerPicture(id, pictureId, accountId);
  }

  // add delete endpoints for pictures if needed
}
