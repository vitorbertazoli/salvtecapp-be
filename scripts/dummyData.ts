import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';
import { AccountSchema } from '../src/accounts/schemas/account.schema';
import { AddressSchema } from '../src/accounts/schemas/address.schema';
import { CustomerSchema } from '../src/customers/schemas/customer.schema';
import { EquipmentTypeSchema } from '../src/equipmentType/schemas/equipment-type.schema';
import { EventSchema } from '../src/events/schemas/event.schema';
import { FollowUpSchema } from '../src/follow-ups/schemas/follow-up.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';
import { QuoteSchema } from '../src/quotes/schemas/quote.schema';
import { RoleSchema } from '../src/roles/schemas/role.schema';
import { ServiceOrderSchema } from '../src/service-orders/schemas/service-order.schema';
import { ServiceSchema } from '../src/services/schemas/service.schema';
import { TechnicianSchema } from '../src/technicians/schemas/technician.schema';
import { UserSchema } from '../src/users/schemas/user.schema';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function populateDummyData() {
  try {
    console.log('🚀 Starting dummy data population...\n');

    // Get account name from command line argument
    const accountName = process.argv[2];
    if (!accountName) {
      console.log('❌ Please provide an account name as a command line argument.');
      console.log('Usage: npm run dummyData <account-name>');
      process.exit(1);
    }

    console.log(`Account name: ${accountName}\n`);

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Create models
    const Account = mongoose.model('Account', AccountSchema);
    const Address = mongoose.model('Address', AddressSchema);
    const Customer = mongoose.model('Customer', CustomerSchema);
    const EquipmentType = mongoose.model('EquipmentType', EquipmentTypeSchema);
    const Event = mongoose.model('Event', EventSchema);
    const FollowUp = mongoose.model('FollowUp', FollowUpSchema);
    const Product = mongoose.model('Product', ProductSchema);
    const Quote = mongoose.model('Quote', QuoteSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const ServiceOrder = mongoose.model('ServiceOrder', ServiceOrderSchema);
    const Service = mongoose.model('Service', ServiceSchema);
    const Technician = mongoose.model('Technician', TechnicianSchema);
    const User = mongoose.model('User', UserSchema);

    // Find account
    const account = await Account.findOne({ name: accountName });
    if (!account) {
      console.log(`❌ Account "${accountName}" not found. Please run initDB.ts first to create the account.`);
      process.exit(1);
    }

    console.log(`✅ Found account: ${account.name}\n`);

    // Get admin user for createdBy/updatedBy
    const adminUser = await User.findOne({ account: account._id });
    if (!adminUser) {
      console.log('❌ No admin user found for this account.');
      process.exit(1);
    }

    const userId = adminUser._id.toString();

    console.log('🗑️  Deleting existing data (except users)...\n');

    // Delete all data except users
    await Promise.all([
      Address.deleteMany({ account: account._id }),
      Customer.deleteMany({ account: account._id }),
      Event.deleteMany({ account: account._id }),
      FollowUp.deleteMany({ account: account._id }),
      Product.deleteMany({ account: account._id }),
      Quote.deleteMany({ account: account._id }),
      ServiceOrder.deleteMany({ account: account._id }),
      Service.deleteMany({ account: account._id }),
      Technician.deleteMany({ account: account._id })
    ]);

    console.log('✅ Deleted existing data\n');

    console.log('📦 Creating dummy data...\n');

    // Create addresses
    const addresses = [
      {
        account: account._id,
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        street: 'Avenida Paulista',
        number: '456',
        complement: 'Sala 789',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        street: 'Rua dos Pinheiros',
        number: '789',
        neighborhood: 'Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '05422-001',
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        street: 'Rua Augusta',
        number: '101',
        complement: 'Cobertura',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01305-100',
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        street: 'Avenida Brigadeiro Faria Lima',
        number: '202',
        complement: 'Andar 15',
        neighborhood: 'Itaim Bibi',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01452-001',
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdAddresses = await Address.insertMany(addresses);
    console.log(`✅ Created ${createdAddresses.length} addresses`);

    // Create technicians
    const technicians = [
      {
        account: account._id,
        name: 'João Silva',
        email: 'joao.silva@company.com',
        cpf: '123.456.789-00',
        status: 'active',
        startDate: new Date('2023-01-15'),
        address: createdAddresses[0]._id,
        phoneNumber: '(11) 99999-0001',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        name: 'Maria Santos',
        email: 'maria.santos@company.com',
        cpf: '987.654.321-00',
        status: 'active',
        startDate: new Date('2023-03-20'),
        address: createdAddresses[1]._id,
        phoneNumber: '(11) 99999-0002',
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        name: 'Carlos Oliveira',
        email: 'carlos.oliveira@company.com',
        cpf: '456.789.123-00',
        status: 'active',
        startDate: new Date('2023-05-10'),
        address: createdAddresses[2]._id,
        phoneNumber: '(11) 99999-0003',
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdTechnicians = await Technician.insertMany(technicians);
    console.log(`✅ Created ${createdTechnicians.length} technicians`);

    // Create customers
    const customers = [
      {
        name: 'Empresa ABC Ltda',
        email: 'contato@empresaabc.com',
        cpf: null,
        status: 'active',
        phoneNumber: '(11) 88888-0001',
        technicianResponsible: createdTechnicians[0]._id,
        address: createdAddresses[3]._id,
        account: account._id,
        equipments: [
          {
            name: 'Ar Condicionado Split',
            room: 'Sala de Reuniões',
            btus: 12000,
            type: 'Ar Condicionado Split',
            maker: 'LG',
            model: 'Premium'
          },
          {
            name: 'Ventilador',
            room: 'Escritório',
            type: 'Ventilador'
          }
        ],
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'João Pereira',
        email: 'joao.pereira@email.com',
        cpf: '111.222.333-44',
        status: 'active',
        phoneNumber: '(11) 88888-0002',
        technicianResponsible: createdTechnicians[1]._id,
        address: createdAddresses[4]._id,
        account: account._id,
        equipments: [
          {
            name: 'Ar Condicionado Janela',
            room: 'Quarto',
            btus: 8000,
            type: 'Ar Condicionado Janela',
            maker: 'Samsung',
            model: 'Cool'
          }
        ],
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Restaurante Sabor',
        email: 'contato@restaurantesabor.com',
        cpf: null,
        status: 'active',
        phoneNumber: '(11) 88888-0003',
        technicianResponsible: createdTechnicians[2]._id,
        address: createdAddresses[0]._id,
        account: account._id,
        equipments: [
          {
            name: 'Exaustor',
            room: 'Cozinha',
            type: 'Exaustor',
            maker: 'Mondial',
            model: 'Force'
          },
          {
            name: 'Ar Condicionado Cassete',
            room: 'Sala Principal',
            btus: 18000,
            type: 'Ar Condicionado Cassete',
            maker: 'Daikin',
            model: 'Premium'
          }
        ],
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create services
    const services = [
      {
        name: 'Instalação de Ar Condicionado',
        description: 'Instalação completa de sistema de ar condicionado',
        value: 450.0,
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Manutenção Preventiva',
        description: 'Manutenção preventiva anual',
        value: 120.0,
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Reparo de Compressor',
        description: 'Reparo ou substituição de compressor',
        value: 350.0,
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Limpeza de Filtros',
        description: 'Limpeza e substituição de filtros',
        value: 80.0,
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Recarga de Gás',
        description: 'Recarga de gás refrigerante',
        value: 150.0,
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdServices = await Service.insertMany(services);
    console.log(`✅ Created ${createdServices.length} services`);

    // Create products
    const products = [
      {
        name: 'Filtro de Ar',
        description: 'Filtro de ar para ar condicionado',
        maker: 'Generic',
        model: 'Standard',
        value: 25.0,
        sku: 'FLT-001',
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Compressor 12000 BTU',
        description: 'Compressor para ar condicionado 12000 BTU',
        maker: 'LG',
        model: 'Comp-12K',
        value: 280.0,
        sku: 'COMP-12K',
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Gás Refrigerante R410A',
        description: 'Cilindro de gás refrigerante R410A',
        maker: 'Generic',
        model: 'R410A-1KG',
        value: 120.0,
        sku: 'GAS-R410A',
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Ventilador de Teto',
        description: 'Ventilador de teto 52"',
        maker: 'Mondial',
        model: 'V-52',
        value: 180.0,
        sku: 'FAN-52',
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      },
      {
        name: 'Termostato Digital',
        description: 'Termostato digital para controle de temperatura',
        maker: 'Nest',
        model: 'T100',
        value: 95.0,
        sku: 'THERM-DIG',
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdProducts = await Product.insertMany(products);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create quotes
    const quotes = [
      {
        account: account._id,
        customer: createdCustomers[0]._id,
        equipments: createdCustomers[0].equipments,
        services: [
          {
            service: createdServices[0]._id,
            quantity: 2,
            unitValue: 450.0
          },
          {
            service: createdServices[1]._id,
            quantity: 1,
            unitValue: 120.0
          }
        ],
        products: [
          {
            product: createdProducts[0]._id,
            quantity: 4,
            unitValue: 25.0
          }
        ],
        totalValue: 1100.0,
        description: 'Orçamento para instalação e manutenção',
        discount: 0,
        status: 'accepted',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        issuedAt: new Date(),
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        customer: createdCustomers[1]._id,
        equipments: createdCustomers[1].equipments,
        services: [
          {
            service: createdServices[2]._id,
            quantity: 1,
            unitValue: 350.0
          }
        ],
        products: [
          {
            product: createdProducts[1]._id,
            quantity: 1,
            unitValue: 280.0
          }
        ],
        totalValue: 630.0,
        description: 'Reparo de compressor',
        discount: 50.0,
        status: 'sent',
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        issuedAt: new Date(),
        createdBy: userId,
        updatedBy: userId
      },
      {
        account: account._id,
        customer: createdCustomers[2]._id,
        equipments: createdCustomers[2].equipments,
        services: [
          {
            service: createdServices[3]._id,
            quantity: 2,
            unitValue: 80.0
          },
          {
            service: createdServices[4]._id,
            quantity: 1,
            unitValue: 150.0
          }
        ],
        products: [
          {
            product: createdProducts[2]._id,
            quantity: 1,
            unitValue: 120.0
          }
        ],
        totalValue: 510.0,
        description: 'Manutenção completa do sistema',
        discount: 0,
        status: 'draft',
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        issuedAt: new Date(),
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdQuotes = await Quote.insertMany(quotes);
    console.log(`✅ Created ${createdQuotes.length} quotes`);

    // Create service orders
    const serviceOrders = [
      {
        orderNumber: 'SO-2024-001',
        quote: createdQuotes[0]._id,
        customer: createdCustomers[0]._id,
        equipments: createdCustomers[0].equipments,
        account: account._id,
        items: [
          {
            type: 'service',
            itemId: createdServices[0]._id,
            name: 'Instalação de Ar Condicionado',
            description: 'Instalação completa de sistema de ar condicionado',
            quantity: 2,
            unitValue: 450.0,
            totalValue: 900.0
          },
          {
            type: 'product',
            itemId: createdProducts[0]._id,
            name: 'Filtro de Ar',
            description: 'Filtro de ar para ar condicionado',
            quantity: 4,
            unitValue: 25.0,
            totalValue: 100.0
          }
        ],
        description: 'Ordem de serviço para instalação',
        discount: 0,
        subtotal: 1000.0,
        totalValue: 1000.0,
        issuedAt: new Date(),
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        assignedTechnician: createdTechnicians[0]._id,
        status: 'scheduled',
        priority: 'normal',
        notes: 'Cliente solicitou agendamento para a próxima semana',
        paymentStatus: 'pending',
        paidAmount: 0,
        createdBy: userId,
        updatedBy: userId
      },
      {
        orderNumber: 'SO-2024-002',
        quote: createdQuotes[1]._id,
        customer: createdCustomers[1]._id,
        equipments: createdCustomers[1].equipments,
        account: account._id,
        items: [
          {
            type: 'service',
            itemId: createdServices[2]._id,
            name: 'Reparo de Compressor',
            description: 'Reparo ou substituição de compressor',
            quantity: 1,
            unitValue: 350.0,
            totalValue: 350.0
          },
          {
            type: 'product',
            itemId: createdProducts[1]._id,
            name: 'Compressor 12000 BTU',
            description: 'Compressor para ar condicionado 12000 BTU',
            quantity: 1,
            unitValue: 280.0,
            totalValue: 280.0
          }
        ],
        description: 'Reparo urgente de compressor',
        discount: 50.0,
        subtotal: 630.0,
        totalValue: 580.0,
        issuedAt: new Date(),
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        startedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 3 days + 2 hours
        completedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 3 days + 4 hours
        assignedTechnician: createdTechnicians[1]._id,
        status: 'completed',
        priority: 'high',
        notes: 'Compressor substituído com sucesso',
        completionNotes: 'Cliente satisfeito com o serviço',
        paymentStatus: 'paid',
        paidAmount: 580.0,
        paymentMethod: 'Cartão de Crédito',
        paymentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdServiceOrders = await ServiceOrder.insertMany(serviceOrders);
    console.log(`✅ Created ${createdServiceOrders.length} service orders`);

    // Create events
    const events = [
      {
        date: new Date().toISOString().split('T')[0], // Today
        startTime: '09:00',
        endTime: '11:00',
        customer: createdCustomers[0]._id,
        technician: createdTechnicians[0]._id,
        account: account._id,
        title: 'Instalação de Ar Condicionado',
        description: 'Instalação de 2 unidades de ar condicionado split',
        status: 'scheduled',
        createdBy: userId
      },
      {
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        startTime: '14:00',
        endTime: '16:00',
        customer: createdCustomers[1]._id,
        technician: createdTechnicians[1]._id,
        account: account._id,
        title: 'Reparo de Compressor',
        description: 'Reparo urgente do compressor',
        status: 'completed',
        completionNotes: 'Compressor substituído. Cliente satisfeito.',
        completedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        completedBy: userId,
        createdBy: userId
      },
      {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        startTime: '10:00',
        endTime: '12:00',
        customer: createdCustomers[2]._id,
        technician: createdTechnicians[2]._id,
        account: account._id,
        title: 'Manutenção Preventiva',
        description: 'Manutenção anual do sistema de climatização',
        status: 'scheduled',
        createdBy: userId
      }
    ];

    const createdEvents = await Event.insertMany(events);
    console.log(`✅ Created ${createdEvents.length} events`);

    // Create follow-ups
    const followUps = [
      {
        customer: createdCustomers[0]._id,
        account: account._id,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'pending',
        notes: 'Follow-up após instalação para verificar satisfação',
        createdBy: userId,
        updatedBy: userId
      },
      {
        customer: createdCustomers[1]._id,
        account: account._id,
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        status: 'pending',
        notes: 'Verificar se reparo foi efetivo',
        createdBy: userId,
        updatedBy: userId
      },
      {
        customer: createdCustomers[2]._id,
        account: account._id,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'completed',
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        completedBy: userId,
        notes: 'Cliente solicitou nova manutenção em 6 meses',
        createdBy: userId,
        updatedBy: userId
      }
    ];

    const createdFollowUps = await FollowUp.insertMany(followUps);
    console.log(`✅ Created ${createdFollowUps.length} follow-ups`);

    console.log('\n🎉 Dummy data population completed successfully!\n');
    console.log('Summary:');
    console.log(`- Addresses: ${createdAddresses.length}`);
    console.log(`- Technicians: ${createdTechnicians.length}`);
    console.log(`- Customers: ${createdCustomers.length}`);
    console.log(`- Services: ${createdServices.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Quotes: ${createdQuotes.length}`);
    console.log(`- Service Orders: ${createdServiceOrders.length}`);
    console.log(`- Events: ${createdEvents.length}`);
    console.log(`- Follow-ups: ${createdFollowUps.length}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating dummy data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

populateDummyData();
