import { faker } from '@faker-js/faker/locale/pt_BR';
import bcrypt from 'bcrypt';
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

// Configuration for data generation
const CONFIG = {
  addresses: 1500,
  technicians: 20,
  customers: 1200,
  services: 200,
  products: 200,
  quotes: 1500,
  serviceOrders: 1200,
  events: 2000,
  followUps: 1000,
  equipmentsPerCustomer: { min: 1, max: 5 },
  servicesPerQuote: { min: 1, max: 8 },
  productsPerQuote: { min: 0, max: 5 }
};

// Helper function to generate Brazilian CPF (unformatted)
function generateCPF(): string {
  const n1 = Math.floor(Math.random() * 10);
  const n2 = Math.floor(Math.random() * 10);
  const n3 = Math.floor(Math.random() * 10);
  const n4 = Math.floor(Math.random() * 10);
  const n5 = Math.floor(Math.random() * 10);
  const n6 = Math.floor(Math.random() * 10);
  const n7 = Math.floor(Math.random() * 10);
  const n8 = Math.floor(Math.random() * 10);
  const n9 = Math.floor(Math.random() * 10);

  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

// Helper function to generate Brazilian phone number (unformatted)
function generatePhone(): string {
  const ddd = faker.helpers.arrayElement([
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '21',
    '22',
    '24',
    '27',
    '28',
    '31',
    '32',
    '33',
    '34',
    '35',
    '37',
    '38',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '51',
    '53',
    '54',
    '55',
    '61',
    '62',
    '63',
    '64',
    '65',
    '66',
    '67',
    '68',
    '69',
    '71',
    '73',
    '74',
    '75',
    '77',
    '79',
    '81',
    '82',
    '83',
    '84',
    '85',
    '86',
    '87',
    '88',
    '89',
    '91',
    '92',
    '93',
    '94',
    '95',
    '96',
    '97',
    '98',
    '99'
  ]);
  const prefix = faker.helpers.arrayElement(['9', '8', '7']);
  const number = faker.string.numeric(4) + faker.string.numeric(4);
  return `${ddd}${prefix}${number}`;
}

// Helper function to generate Brazilian ZIP code (unformatted)
function generateZipCode(): string {
  return faker.string.numeric(5) + faker.string.numeric(3);
}

// Equipment types for HVAC systems
const EQUIPMENT_TYPES = [
  'Ar Condicionado Split',
  'Ar Condicionado Janela',
  'Ar Condicionado Cassete',
  'Ar Condicionado Piso Teto',
  'Ventilador',
  'Exaustor',
  'Ar Condicionado Central',
  'Climatizador',
  'Purificador de Ar',
  'Umidificador'
];

const EQUIPMENT_MAKERS = [
  'LG',
  'Samsung',
  'Daikin',
  'Fujitsu',
  'Midea',
  'Gree',
  'Philco',
  'Consul',
  'Electrolux',
  'Mondial',
  'Springer',
  'Carrier',
  'Trane',
  'York',
  'Hitachi',
  'Panasonic',
  'Sharp',
  'Toshiba',
  'Haier',
  'Challenger'
];

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO'
];

const CITIES_BY_STATE: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Guarulhos', 'Jundiaí'],
  RJ: [
    'Rio de Janeiro',
    'Niterói',
    'Duque de Caxias',
    'Nova Iguaçu',
    'São Gonçalo',
    'Belford Roxo',
    'Campos dos Goytacazes',
    'Petrópolis',
    'Volta Redonda',
    'Magé'
  ],
  MG: [
    'Belo Horizonte',
    'Uberlândia',
    'Contagem',
    'Juiz de Fora',
    'Betim',
    'Montes Claros',
    'Ribeirão das Neves',
    'Uberaba',
    'Governador Valadares',
    'Ipatinga'
  ],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí', 'Lages', 'Palhoça', 'Balneário Camboriú'],
  DF: ['Brasília'],
  GO: [
    'Goiânia',
    'Aparecida de Goiânia',
    'Anápolis',
    'Rio Verde',
    'Luziânia',
    'Águas Lindas de Goiás',
    'Valparaíso de Goiás',
    'Trindade',
    'Formosa',
    'Novo Gama'
  ],
  PE: [
    'Recife',
    'Jaboatão dos Guararapes',
    'Olinda',
    'Caruaru',
    'Petrolina',
    'Paulista',
    'Cabo de Santo Agostinho',
    'Camaragibe',
    'Garanhuns',
    'Vitória de Santo Antão'
  ],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá'],
  PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Abaetetuba', 'Cametá', 'Bragança', 'São Félix do Xingu'],
  BA: [
    'Salvador',
    'Feira de Santana',
    'Vitória da Conquista',
    'Camaçari',
    'Itabuna',
    'Juazeiro',
    'Lauro de Freitas',
    'Ilhéus',
    'Jequié',
    'Teixeira de Freitas'
  ],
  MA: ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cabedelo', 'Cajazeiras', 'Guarabira', 'Sapé'],
  RN: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim', 'Caicó', 'Açu', 'Currais Novos', 'São José de Mipibu'],
  AL: [
    'Maceió',
    'Arapiraca',
    'Rio Largo',
    'Palmeira dos Índios',
    'São Miguel dos Campos',
    'Penedo',
    'União dos Palmares',
    'São Luís do Quitunde',
    'Delmiro Gouveia',
    'Coruripe'
  ],
  PI: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras', 'União', 'Altos', 'Esperantina'],
  MT: [
    'Cuiabá',
    'Várzea Grande',
    'Rondonópolis',
    'Sinop',
    'Tangará da Serra',
    'Cáceres',
    'Sorriso',
    'Lucas do Rio Verde',
    'Primavera do Leste',
    'Barra do Garças'
  ],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Viana', 'Nova Venécia', 'Barra de São Francisco', 'Santa Teresa', 'São Mateus', 'Linhares'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Aquidauana', 'Maracaju', 'Rio Brilhante'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Guajará-Mirim', 'Buritis', "Machadinho d'Oeste"],
  TO: [
    'Palmas',
    'Araguaína',
    'Gurupi',
    'Porto Nacional',
    'Paraíso do Tocantins',
    'Colinas do Tocantins',
    'Araguatins',
    'Formoso do Araguaia',
    'Tocantinópolis',
    'Augustinópolis'
  ],
  SE: [
    'Aracaju',
    'Nossa Senhora do Socorro',
    'Lagarto',
    'Itabaiana',
    'São Cristóvão',
    'Estância',
    'Tobias Barreto',
    "Itaporanga d'Ajuda",
    'Simão Dias',
    'Poço Redondo'
  ],
  AM: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Humaitá', 'Iranduba', 'Eirunepé', 'Envira'],
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasiléia', 'Mâncio Lima', 'Xapuri', 'Epitaciolândia', 'Plácido de Castro'],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande', 'Ferreira Gomes', 'Cutias', 'Amapá', 'Calçoene'],
  RR: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá', 'Pacaraima', 'Iracema', 'Normandia', 'Amajari']
};

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
    const account = await Account.findOne({ name: { $regex: new RegExp(`^${accountName}$`, 'i') } });
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

    // select all userIds from the technicians in this account, so we can clean up their user accounts later
    const technicianUsers = await Technician.find({ account: account._id }).select('user').exec();
    const technicianUserIds = technicianUsers.map(t => t.user);

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
      Technician.deleteMany({ account: account._id }),
      // Also delete technician user accounts
      User.deleteMany({ _id: { $in: technicianUserIds } , account: account._id })
    ]);

    console.log('✅ Deleted existing data\n');

    console.log('📦 Creating dummy data...\n');

    // Create addresses
    console.log(`Creating ${CONFIG.addresses} addresses...`);
    const addresses: any[] = [];
    for (let i = 0; i < CONFIG.addresses; i++) {
      const state = faker.helpers.arrayElement(BRAZILIAN_STATES);
      const city = faker.helpers.arrayElement(CITIES_BY_STATE[state] || ['São Paulo']);

      addresses.push({
        account: account._id,
        street: faker.location.street(),
        number: faker.location.buildingNumber(),
        complement: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.3 }),
        neighborhood: faker.location.county(),
        city: city,
        state: state,
        zipCode: generateZipCode(),
        country: 'Brazil',
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdAddresses = await Address.insertMany(addresses);
    console.log(`✅ Created ${createdAddresses.length} addresses`);

    // Create technicians
    console.log(`Creating ${CONFIG.technicians} technicians...`);

    // Get the TECHNICIAN role
    const technicianRole = await Role.findOne({ name: 'TECHNICIAN' });
    if (!technicianRole) {
      console.log('❌ TECHNICIAN role not found. Please run initDB.ts first.');
      process.exit(1);
    }

    // Get default password from environment
    const defaultPassword = process.env.DEFAULT_TEST_USER_PASSWORD;
    if (!defaultPassword) {
      console.log('❌ DEFAULT_TEST_USER_PASSWORD not found in environment variables.');
      process.exit(1);
    }

    const technicians: any[] = [];
    const users: any[] = [];

    for (let i = 0; i < CONFIG.technicians; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();

      // Create user account
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const user = {
        account: account._id,
        firstName,
        lastName,
        email,
        passwordHash: hashedPassword,
        roles: [technicianRole._id],
        status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']),
        createdBy: userId,
        updatedBy: userId
      };
      users.push(user);

      // Create technician linked to user
      technicians.push({
        account: account._id,
        user: null, // Will be set after user creation
        cpf: generateCPF(),
        startDate: faker.date.past({ years: 5 }),
        endDate: faker.helpers.maybe(() => faker.date.recent({ days: 365 }), { probability: 0.1 }),
        address: faker.helpers.arrayElement(createdAddresses)._id,
        phoneNumber: generatePhone(),
        createdBy: userId,
        updatedBy: userId
      });
    }

    // Create all users first
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} technician user accounts`);

    // Link users to technicians
    technicians.forEach((technician, index) => {
      technician.user = createdUsers[index]._id;
    });

    // Create technicians
    const createdTechnicians = await Technician.insertMany(technicians);
    console.log(`✅ Created ${createdTechnicians.length} technicians`);

    // Create customers
    console.log(`Creating ${CONFIG.customers} customers...`);
    const customers: any[] = [];
    for (let i = 0; i < CONFIG.customers; i++) {
      const isCompany = faker.datatype.boolean({ probability: 0.3 });
      const numEquipments = faker.number.int(CONFIG.equipmentsPerCustomer);

      const equipments: any[] = [];
      for (let j = 0; j < numEquipments; j++) {
        equipments.push({
          name: faker.helpers.arrayElement(EQUIPMENT_TYPES),
          room: faker.helpers.arrayElement(['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Escritório', 'Sala de Estar', 'Varanda']),
          btus: faker.helpers.arrayElement([7000, 9000, 12000, 18000, 24000, 30000, 36000]),
          type: faker.helpers.arrayElement(EQUIPMENT_TYPES),
          subType: faker.helpers.maybe(() => faker.commerce.productAdjective(), { probability: 0.5 }),
          maker: faker.helpers.arrayElement(EQUIPMENT_MAKERS),
          model: faker.string.alphanumeric({ length: { min: 3, max: 8 }, casing: 'upper' })
        });
      }

      customers.push({
        name: isCompany ? faker.company.name() : faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        cpf: isCompany ? undefined : generateCPF(),
        status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']),
        phoneNumber: generatePhone(),
        technicianResponsible: faker.helpers.arrayElement(createdTechnicians)._id,
        address: faker.helpers.arrayElement(createdAddresses)._id,
        account: account._id,
        equipments: equipments,
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create services
    console.log(`Creating ${CONFIG.services} services...`);
    const services: any[] = [];
    for (let i = 0; i < CONFIG.services; i++) {
      services.push({
        name: faker.helpers.arrayElement([
          'Instalação de Ar Condicionado',
          'Manutenção Preventiva',
          'Reparo de Compressor',
          'Limpeza de Filtros',
          'Recarga de Gás',
          'Instalação de Ventilador',
          'Reparo de Ventilador',
          'Instalação de Exaustor',
          'Manutenção de Climatizador',
          'Reparo de Climatizador',
          'Instalação de Purificador',
          'Manutenção de Sistema Central',
          'Reparo de Sistema Central',
          'Instalação de Umidificador',
          'Manutenção de Umidificador'
        ]),
        description: faker.lorem.sentence({ min: 5, max: 15 }),
        value: faker.number.float({ min: 50, max: 1500, fractionDigits: 2 }),
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdServices = await Service.insertMany(services);
    console.log(`✅ Created ${createdServices.length} services`);

    // Create products
    console.log(`Creating ${CONFIG.products} products...`);
    const products: any[] = [];
    for (let i = 0; i < CONFIG.products; i++) {
      products.push({
        name: faker.helpers.arrayElement([
          'Filtro de Ar',
          'Compressor 12000 BTU',
          'Gás Refrigerante R410A',
          'Ventilador de Teto',
          'Termostato Digital',
          'Controle Remoto',
          'Cabo de Energia',
          'Mangueira de Drenagem',
          'Suporte para Ar Condicionado',
          'Isolamento Térmico',
          'Fita Vedante',
          'Conector Elétrico',
          'Sensor de Temperatura',
          'Painel de Controle',
          'Motor do Ventilador'
        ]),
        description: faker.lorem.sentence({ min: 3, max: 10 }),
        maker: faker.helpers.arrayElement(EQUIPMENT_MAKERS),
        model: faker.string.alphanumeric({ length: { min: 3, max: 10 }, casing: 'upper' }),
        value: faker.number.float({ min: 10, max: 800, fractionDigits: 2 }),
        sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
        account: account._id,
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdProducts = await Product.insertMany(products);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create quotes
    console.log(`Creating ${CONFIG.quotes} quotes...`);
    const quotes: any[] = [];
    for (let i = 0; i < CONFIG.quotes; i++) {
      const customer = faker.helpers.arrayElement(createdCustomers);
      const numServices = faker.number.int(CONFIG.servicesPerQuote);
      const numProducts = faker.number.int(CONFIG.productsPerQuote);

      const quoteServices: any[] = [];
      let totalValue = 0;

      for (let j = 0; j < numServices; j++) {
        const service = faker.helpers.arrayElement(createdServices);
        const quantity = faker.number.int({ min: 1, max: 5 });
        const unitValue = service.value;
        quoteServices.push({
          service: service._id,
          quantity: quantity,
          unitValue: unitValue
        });
        totalValue += quantity * unitValue;
      }

      const quoteProducts: any[] = [];
      for (let j = 0; j < numProducts; j++) {
        const product = faker.helpers.arrayElement(createdProducts);
        const quantity = faker.number.int({ min: 1, max: 3 });
        const unitValue = product.value;
        quoteProducts.push({
          product: product._id,
          quantity: quantity,
          unitValue: unitValue
        });
        totalValue += quantity * unitValue;
      }

      const discount = faker.helpers.maybe(() => faker.number.int({ min: 5, max: 20 }), { probability: 0.3 }) || 0;
      totalValue = totalValue * (1 - discount / 100);

      quotes.push({
        account: account._id,
        customer: customer._id,
        equipments: customer.equipments,
        services: quoteServices,
        products: quoteProducts,
        totalValue: totalValue,
        description: faker.helpers.maybe(() => faker.lorem.sentence({ min: 5, max: 15 }), { probability: 0.7 }),
        discount: discount,
        status: faker.helpers.arrayElement(['draft', 'sent', 'accepted', 'rejected']),
        validUntil: faker.date.future({ years: 1 }),
        issuedAt: faker.date.recent({ days: 90 }),
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdQuotes = await Quote.insertMany(quotes);
    console.log(`✅ Created ${createdQuotes.length} quotes`);

    // Create service orders (from accepted quotes)
    console.log(`Creating ${CONFIG.serviceOrders} service orders...`);
    const acceptedQuotes = createdQuotes.filter((q) => q.status === 'accepted');
    const serviceOrders: any[] = [];

    for (let i = 0; i < Math.min(CONFIG.serviceOrders, acceptedQuotes.length); i++) {
      const quote = acceptedQuotes[i];
      const customer = createdCustomers.find((c) => c._id.toString() === quote.customer.toString());
      if (!customer) continue;

      const orderNumber = `SO-${faker.date.recent({ days: 365 }).getFullYear()}-${faker.string.numeric(4)}${i}`;

      // Calculate totals from quote
      let subtotal = 0;
      const items: any[] = [];

      quote.services?.forEach((serviceItem) => {
        const service = createdServices.find((s) => s._id.toString() === serviceItem.service.toString());
        if (service) {
          const totalValue = serviceItem.quantity * serviceItem.unitValue;
          items.push({
            type: 'service',
            itemId: serviceItem.service,
            name: service.name,
            description: service.description,
            quantity: serviceItem.quantity,
            unitValue: serviceItem.unitValue,
            totalValue: totalValue
          });
          subtotal += totalValue;
        }
      });

      quote.products?.forEach((productItem) => {
        const product = createdProducts.find((p) => p._id.toString() === productItem.product.toString());
        if (product) {
          const totalValue = productItem.quantity * productItem.unitValue;
          items.push({
            type: 'product',
            itemId: productItem.product,
            name: product.name,
            description: product.description,
            quantity: productItem.quantity,
            unitValue: productItem.unitValue,
            totalValue: totalValue
          });
          subtotal += totalValue;
        }
      });

      const discount = quote.discount || 0;
      const totalValue = subtotal * (1 - discount / 100);

      const status = faker.helpers.arrayElement(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']);
      let scheduledDate, startedAt, completedAt, paymentStatus, paidAmount, paymentMethod, paymentDate;

      if (status === 'scheduled' || status === 'in_progress' || status === 'completed') {
        scheduledDate = faker.date.recent({ days: 30 });
      }

      if (status === 'in_progress' || status === 'completed') {
        startedAt = scheduledDate ? faker.date.between({ from: scheduledDate, to: new Date() }) : faker.date.recent({ days: 14 });
      }

      if (status === 'completed') {
        completedAt = startedAt ? faker.date.between({ from: startedAt, to: new Date() }) : faker.date.recent({ days: 7 });
        paymentStatus = faker.helpers.arrayElement(['pending', 'partial', 'paid']);
        if (paymentStatus === 'paid') {
          paidAmount = totalValue;
          paymentMethod = faker.helpers.arrayElement(['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto']);
          paymentDate = completedAt;
        } else if (paymentStatus === 'partial') {
          paidAmount = faker.number.float({ min: totalValue * 0.1, max: totalValue * 0.9, fractionDigits: 2 });
        }
      }

      serviceOrders.push({
        orderNumber: orderNumber,
        quote: quote._id,
        customer: customer._id,
        equipments: customer.equipments,
        account: account._id,
        items: items,
        description: faker.helpers.maybe(() => faker.lorem.sentence({ min: 5, max: 15 }), { probability: 0.5 }),
        discount: discount,
        subtotal: subtotal,
        totalValue: totalValue,
        issuedAt: faker.date.recent({ days: 90 }),
        scheduledDate: scheduledDate,
        startedAt: startedAt,
        completedAt: completedAt,
        assignedTechnician: faker.helpers.arrayElement(createdTechnicians)._id,
        status: status,
        priority: faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
        notes: faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 3 }), { probability: 0.6 }),
        customerNotes: faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 2 }), { probability: 0.3 }),
        paymentStatus: paymentStatus || 'pending',
        paidAmount: paidAmount || 0,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdServiceOrders = await ServiceOrder.insertMany(serviceOrders);
    console.log(`✅ Created ${createdServiceOrders.length} service orders`);

    // Create events
    console.log(`Creating ${CONFIG.events} events...`);
    const events: any[] = [];
    for (let i = 0; i < CONFIG.events; i++) {
      const customer = faker.helpers.arrayElement(createdCustomers);
      const technician = faker.helpers.arrayElement(createdTechnicians);
      const date = faker.date.between({ from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) });
      const startHour = faker.number.int({ min: 8, max: 17 });
      const duration = faker.number.int({ min: 1, max: 4 });

      const status = faker.helpers.arrayElement(['scheduled', 'completed']);
      let completionNotes, completedAt, completedBy;

      if (status === 'completed') {
        completionNotes = faker.lorem.sentences({ min: 1, max: 3 });
        completedAt = faker.date.recent({ days: 90 });
        completedBy = userId;
      }

      events.push({
        date: date.toISOString().split('T')[0],
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${(startHour + duration).toString().padStart(2, '0')}:00`,
        customer: customer._id,
        technician: technician._id,
        account: account._id,
        title: faker.helpers.arrayElement([
          'Instalação de Ar Condicionado',
          'Manutenção Preventiva',
          'Reparo de Compressor',
          'Limpeza de Sistema',
          'Recarga de Gás',
          'Instalação de Ventilador',
          'Reparo de Ventilador',
          'Manutenção de Climatizador',
          'Instalação de Purificador',
          'Manutenção Geral'
        ]),
        description: faker.lorem.sentences({ min: 1, max: 3 }),
        status: status,
        completionNotes: completionNotes,
        completedAt: completedAt,
        completedBy: completedBy,
        createdBy: userId,
        updatedBy: userId
      });
    }
    const createdEvents = await Event.insertMany(events);
    console.log(`✅ Created ${createdEvents.length} events`);

    // Create follow-ups
    console.log(`Creating ${CONFIG.followUps} follow-ups...`);
    const followUps: any[] = [];
    for (let i = 0; i < CONFIG.followUps; i++) {
      const customer = faker.helpers.arrayElement(createdCustomers);
      const status = faker.helpers.arrayElement(['pending', 'completed']);
      let completedAt, completedBy, notes;

      if (status === 'completed') {
        completedAt = faker.date.recent({ days: 30 });
        completedBy = userId;
        notes = [faker.lorem.sentences({ min: 1, max: 3 })];
      } else {
        notes = [faker.lorem.sentences({ min: 1, max: 2 })];
      }

      followUps.push({
        customer: customer._id,
        account: account._id,
        startDate:
          status === 'completed'
            ? faker.date.between({ from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), to: new Date() })
            : faker.date.future({ years: 1 }),
        status: status,
        completedAt: completedAt,
        completedBy: completedBy,
        notes: notes,
        createdBy: userId,
        updatedBy: userId
      });
    }
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
    console.log(
      `Total records: ${createdAddresses.length + createdTechnicians.length + createdCustomers.length + createdServices.length + createdProducts.length + createdQuotes.length + createdServiceOrders.length + createdEvents.length + createdFollowUps.length}`
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating dummy data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

populateDummyData();
