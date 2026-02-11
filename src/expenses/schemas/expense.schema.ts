import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExpenseDocument = Expense & Document;

export const ExpenseCategory = {
  // Materials and Supplies
  MATERIAL: 'material',
  PARTS: 'parts',
  CONSUMABLES: 'consumables',
  TOOLS: 'tools',
  EQUIPMENT: 'equipment',

  // Fuel and Transportation
  FUEL: 'fuel',
  VEHICLE_MAINTENANCE: 'vehicle_maintenance',
  TRANSPORTATION: 'transportation',
  TOLLS: 'tolls',
  PARKING: 'parking',

  // Labor and Services
  LABOR: 'labor',
  CONTRACTOR: 'contractor',
  SUBCONTRACTOR: 'subcontractor',
  CONSULTANT: 'consultant',

  // Rentals and Leases
  EQUIPMENT_RENTAL: 'equipment_rental',
  VEHICLE_RENTAL: 'vehicle_rental',
  FACILITY_RENTAL: 'facility_rental',
  SOFTWARE_LICENSE: 'software_license',

  // Utilities and Services
  UTILITIES: 'utilities',
  INTERNET: 'internet',
  TELEPHONE: 'telephone',
  INSURANCE: 'insurance',
  SECURITY: 'security',

  // Marketing and Sales
  MARKETING: 'marketing',
  ADVERTISING: 'advertising',
  PROMOTIONAL_MATERIALS: 'promotional_materials',

  // Administrative
  OFFICE_SUPPLIES: 'office_supplies',
  SOFTWARE: 'software',
  TRAINING: 'training',
  CERTIFICATION: 'certification',
  LEGAL_FEES: 'legal_fees',
  ACCOUNTING_FEES: 'accounting_fees',

  // Facility and Maintenance
  FACILITY_MAINTENANCE: 'facility_maintenance',
  CLEANING: 'cleaning',
  REPAIRS: 'repairs',
  SECURITY_SYSTEMS: 'security_systems',

  // Other
  MISCELLANEOUS: 'miscellaneous',
  TAXES: 'taxes',
  DONATIONS: 'donations',
  ENTERTAINMENT: 'entertainment',
  MEALS: 'meals'
} as const;

export type ExpenseCategoryType = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop()
  title?: string; // Brief description of the expense

  @Prop({
    enum: Object.values(ExpenseCategory),
    type: String
  })
  category?: ExpenseCategoryType;

  @Prop({ required: true, min: 0 })
  amount: number; // Total expense amount

  @Prop({ type: String, required: true })
  expenseDate: string; // When the expense occurred (YYYY/MM/DD)

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId; // Who approved this expense

  @Prop()
  approvedDate?: Date; // When it was approved

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
