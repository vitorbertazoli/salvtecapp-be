import { faker } from '@faker-js/faker/locale/pt_BR';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import * as path from 'path';
import { AccountSchema } from '../src/accounts/schemas/account.schema';
import { ContractSchema } from '../src/contracts/schemas/contract.schema';
import { CustomerSchema } from '../src/customers/schemas/customer.schema';
import { EquipmentTypeSchema } from '../src/equipmentType/schemas/equipment-type.schema';
import { EventSchema } from '../src/events/schemas/event.schema';
import { RecurringEventConfigSchema } from '../src/events/schemas/recurring-event-config.schema';
import { ExpenseCategory, ExpenseSchema } from '../src/expenses/schemas/expense.schema';
import { FollowUpSchema } from '../src/follow-ups/schemas/follow-up.schema';
import { PaymentOrderSchema } from '../src/payments/schemas/payment-order.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';
import { QuoteSchema } from '../src/quotes/schemas/quote.schema';
import { RoleSchema } from '../src/roles/schemas/role.schema';
import { ServiceOrderSchema } from '../src/service-orders/schemas/service-order.schema';
import { ServiceSchema } from '../src/services/schemas/service.schema';
import { TechnicianSchema } from '../src/technicians/schemas/technician.schema';
import { UserSchema } from '../src/users/schemas/user.schema';
import { VehicleUsageSchema } from '../src/vehicle-usages/schemas/vehicle-usages.schema';
import { VehicleSchema } from '../src/vehicles/schemas/vehicles.schema';

dotenv.config({ path: path.join(process.cwd(), '.env') });

type Address = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

const CONFIG = {
  technicianUsers: 16,
  officeUsers: 6,
  customers: 180,
  contracts: 70,
  services: 50,
  products: 70,
  quotes: 260,
  serviceOrders: 180,
  recurringConfigs: 16,
  events: 320,
  followUps: 120,
  vehicles: 10,
  vehicleUsages: 180,
  expenses: 360,
  equipmentsPerCustomer: { min: 1, max: 4 },
  servicesPerQuote: { min: 1, max: 5 },
  productsPerQuote: { min: 0, max: 4 },
  extraDiscountProbability: 0.2
};

const BRAZILIAN_STATES = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'GO', 'DF', 'BA', 'PE', 'CE'];
const CITIES_BY_STATE: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'Sorocaba'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Petrópolis', 'Nova Iguaçu'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Cascavel'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'Itajaí'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas'],
  GO: ['Goiânia', 'Anápolis', 'Rio Verde', 'Aparecida de Goiânia'],
  DF: ['Brasília'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista'],
  PE: ['Recife', 'Olinda', 'Caruaru'],
  CE: ['Fortaleza', 'Caucaia', 'Sobral']
};

const EQUIPMENT_TYPES = [
  'Ar Condicionado Split',
  'Ar Condicionado Cassete',
  'Ar Condicionado Piso Teto',
  'Ar Condicionado Janela',
  'Ventilador Industrial',
  'Exaustor',
  'Sistema VRF'
];

const EQUIPMENT_MAKERS = ['LG', 'Samsung', 'Daikin', 'Midea', 'Gree', 'Carrier', 'Hitachi', 'Fujitsu', 'York'];

const SERVICE_NAMES = [
  'Instalação de Ar Condicionado',
  'Manutenção Preventiva',
  'Manutenção Corretiva',
  'Limpeza de Evaporadora',
  'Limpeza de Condensadora',
  'Recarga de Gás Refrigerante',
  'Troca de Compressor',
  'Troca de Capacitor',
  'Inspeção Técnica',
  'Higienização Completa',
  'Balanceamento de Ventilação'
];

const PRODUCT_NAMES = [
  'Filtro de Ar',
  'Compressor',
  'Capacitor',
  'Placa Eletrônica',
  'Gás R410A',
  'Gás R32',
  'Tubo de Cobre',
  'Isolamento Térmico',
  'Sensor de Temperatura',
  'Controle Remoto Universal'
];

const VEHICLE_MAKES = ['Fiat', 'Volkswagen', 'Chevrolet', 'Renault', 'Toyota', 'Ford'];
const VEHICLE_MODELS = ['Strada', 'Saveiro', 'Montana', 'Kangoo', 'Hilux', 'Ranger', 'Doblò'];

const EXPENSE_TITLES_BY_CATEGORY: Record<string, string[]> = {
  [ExpenseCategory.MATERIAL]: ['Material para instalação', 'Suprimentos de manutenção'],
  [ExpenseCategory.PARTS]: ['Peças de reposição', 'Compra de componentes'],
  [ExpenseCategory.CONSUMABLES]: ['Consumíveis para atendimento', 'Itens de uso diário'],
  [ExpenseCategory.TOOLS]: ['Compra de ferramentas manuais', 'Reposição de ferramentas'],
  [ExpenseCategory.EQUIPMENT]: ['Compra de equipamento técnico', 'Equipamento de apoio'],
  [ExpenseCategory.FUEL]: ['Abastecimento de frota', 'Combustível para visitas'],
  [ExpenseCategory.VEHICLE_MAINTENANCE]: ['Manutenção veicular', 'Revisão de veículo'],
  [ExpenseCategory.TRANSPORTATION]: ['Transporte para atendimento', 'Frete de equipamentos'],
  [ExpenseCategory.TOLLS]: ['Pedágios de deslocamento', 'Pedágio de rota técnica'],
  [ExpenseCategory.PARKING]: ['Estacionamento em atendimento', 'Estacionamento comercial'],
  [ExpenseCategory.LABOR]: ['Pagamento de mão de obra', 'Mão de obra adicional'],
  [ExpenseCategory.CONTRACTOR]: ['Pagamento de contratado', 'Serviço terceirizado'],
  [ExpenseCategory.SUBCONTRACTOR]: ['Pagamento de subcontratado', 'Serviço de apoio terceirizado'],
  [ExpenseCategory.CONSULTANT]: ['Consultoria técnica', 'Consultoria de processos'],
  [ExpenseCategory.OWNERS_SALARY]: ['Pró-labore dos sócios', 'Pagamento de pró-labore'],
  [ExpenseCategory.EQUIPMENT_RENTAL]: ['Locação de equipamento', 'Aluguel de máquinas'],
  [ExpenseCategory.VEHICLE_RENTAL]: ['Aluguel de veículo', 'Locação de utilitário'],
  [ExpenseCategory.FACILITY_RENTAL]: ['Aluguel do escritório', 'Locação de galpão'],
  [ExpenseCategory.SOFTWARE_LICENSE]: ['Licença de software', 'Assinatura de sistema'],
  [ExpenseCategory.UTILITIES]: ['Conta de energia', 'Conta de água'],
  [ExpenseCategory.INTERNET]: ['Internet empresarial', 'Link dedicado'],
  [ExpenseCategory.TELEPHONE]: ['Telefonia móvel', 'Telefonia fixa'],
  [ExpenseCategory.INSURANCE]: ['Seguro empresarial', 'Seguro de equipamentos'],
  [ExpenseCategory.SECURITY]: ['Serviço de segurança', 'Monitoramento'],
  [ExpenseCategory.MARKETING]: ['Campanha de marketing', 'Ações promocionais'],
  [ExpenseCategory.ADVERTISING]: ['Anúncios online', 'Publicidade local'],
  [ExpenseCategory.PROMOTIONAL_MATERIALS]: ['Materiais promocionais', 'Brindes e folders'],
  [ExpenseCategory.OFFICE_SUPPLIES]: ['Materiais de escritório', 'Papelaria'],
  [ExpenseCategory.SOFTWARE]: ['Compra de software', 'Ferramenta digital'],
  [ExpenseCategory.TRAINING]: ['Treinamento da equipe', 'Curso técnico'],
  [ExpenseCategory.CERTIFICATION]: ['Certificação profissional', 'Recertificação técnica'],
  [ExpenseCategory.LEGAL_FEES]: ['Honorários advocatícios', 'Custas jurídicas'],
  [ExpenseCategory.ACCOUNTING_FEES]: ['Honorários contábeis', 'Serviço de contabilidade'],
  [ExpenseCategory.FACILITY_MAINTENANCE]: ['Manutenção predial', 'Reparo de instalações'],
  [ExpenseCategory.CLEANING]: ['Serviço de limpeza', 'Materiais de limpeza'],
  [ExpenseCategory.REPAIRS]: ['Reparos gerais', 'Conserto de infraestrutura'],
  [ExpenseCategory.SECURITY_SYSTEMS]: ['Sistema de segurança', 'Câmeras e alarmes'],
  [ExpenseCategory.MISCELLANEOUS]: ['Despesa diversa', 'Outras despesas operacionais'],
  [ExpenseCategory.TAXES]: ['Pagamento de impostos', 'Tributos e taxas'],
  [ExpenseCategory.DONATIONS]: ['Doação institucional', 'Ação social'],
  [ExpenseCategory.ENTERTAINMENT]: ['Evento corporativo', 'Relacionamento com clientes'],
  [ExpenseCategory.MEALS]: ['Refeições em atendimento', 'Alimentação da equipe']
};

function weighted<T>(options: Array<{ value: T; weight: number }>): T {
  const total = options.reduce((acc, item) => acc + item.weight, 0);
  const random = faker.number.float({ min: 0, max: total });
  let acc = 0;
  for (const option of options) {
    acc += option.weight;
    if (random <= acc) return option.value;
  }
  return options[options.length - 1].value;
}

function chance(probability: number): boolean {
  return faker.number.float({ min: 0, max: 1 }) < probability;
}

function randomDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function randomIsoDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateCPF(): string {
  const numbers = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));
  const calcDigit = (base: number[], factor: number) => {
    const total = base.reduce((sum, num) => sum + num * factor--, 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const digit1 = calcDigit(numbers, 10);
  const digit2 = calcDigit([...numbers, digit1], 11);
  return [...numbers, digit1, digit2].join('');
}

function generateCNPJ(): string {
  return faker.string.numeric(14);
}

function generatePhone(): string {
  const ddd = faker.helpers.arrayElement(['11', '21', '31', '41', '51', '61', '71', '81', '85']);
  return `${ddd}9${faker.string.numeric(8)}`;
}

function generateZipCode(): string {
  return `${faker.string.numeric(5)}${faker.string.numeric(3)}`;
}

function generateAddress(): Address {
  const state = faker.helpers.arrayElement(BRAZILIAN_STATES);
  const city = faker.helpers.arrayElement(CITIES_BY_STATE[state] || ['São Paulo']);
  return {
    street: faker.location.street(),
    number: faker.location.buildingNumber(),
    complement: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.25 }) || undefined,
    neighborhood: faker.location.county(),
    city,
    state,
    zipCode: generateZipCode(),
    country: 'Brazil'
  };
}

function pickManyUnique<T>(items: T[], min: number, max: number): T[] {
  const desired = faker.number.int({ min, max: Math.min(max, items.length) });
  const shuffled = faker.helpers.shuffle(items);
  return shuffled.slice(0, desired);
}

function calculateQuoteTotals(
  services: Array<{ quantity: number; unitValue: number }>,
  products: Array<{ quantity: number; unitValue: number }>,
  discountPercent = 0,
  otherDiscounts: ReadonlyArray<{ amount: number }> = []
) {
  const subtotalServices = services.reduce((acc, item) => acc + item.quantity * item.unitValue, 0);
  const subtotalProducts = products.reduce((acc, item) => acc + item.quantity * item.unitValue, 0);
  const subtotal = subtotalServices + subtotalProducts;
  const percentageDiscount = subtotal * (discountPercent / 100);
  const additionalDiscount = otherDiscounts.reduce((acc, item) => acc + item.amount, 0);
  const totalValue = Math.max(0, subtotal - percentageDiscount - additionalDiscount);
  return {
    subtotal,
    totalValue
  };
}

async function populateDummyData() {
  try {
    console.log('🚀 Starting realistic seed data generation...\n');

    const accountName = process.argv[2];
    if (!accountName) {
      console.log('❌ Missing account name argument.');
      console.log('Usage: npm run seed -- "<account-name>"');
      process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Account = mongoose.model('Account', AccountSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const User = mongoose.model('User', UserSchema);
    const Technician = mongoose.model('Technician', TechnicianSchema);
    const Customer = mongoose.model('Customer', CustomerSchema);
    const EquipmentType = mongoose.model('EquipmentType', EquipmentTypeSchema);
    const Contract = mongoose.model('Contract', ContractSchema);
    const Service = mongoose.model('Service', ServiceSchema);
    const Product = mongoose.model('Product', ProductSchema);
    const Quote = mongoose.model('Quote', QuoteSchema);
    const ServiceOrder = mongoose.model('ServiceOrder', ServiceOrderSchema);
    const RecurringEventConfig = mongoose.model('RecurringEventConfig', RecurringEventConfigSchema);
    const Event = mongoose.model('Event', EventSchema);
    const FollowUp = mongoose.model('FollowUp', FollowUpSchema);
    const PaymentOrder = mongoose.model('PaymentOrder', PaymentOrderSchema);
    const Expense = mongoose.model('Expense', ExpenseSchema);
    const Vehicle = mongoose.model('Vehicle', VehicleSchema);
    const VehicleUsage = mongoose.model('VehicleUsage', VehicleUsageSchema);

    const account = await Account.findOne({ name: { $regex: new RegExp(`^${accountName}$`, 'i') } });
    if (!account) {
      console.log(`❌ Account "${accountName}" not found. Run initDB first.`);
      process.exit(1);
    }

    const adminUser = await User.findOne({ account: account._id }).sort({ createdAt: 1 });
    if (!adminUser) {
      console.log('❌ No user found for the account. Run initDB first.');
      process.exit(1);
    }

    const defaultPassword = process.env.DEFAULT_TEST_USER_PASSWORD || 'Teste@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await Account.updateOne(
      { _id: account._id },
      {
        $set: {
          status: 'active',
          plan: 'pro',
          replyToEmail: `contato+${account.name.toLowerCase().replace(/\s+/g, '')}@salvtec.com.br`,
          expireDate: faker.date.future({ years: 1 }),
          customizations: JSON.stringify({ theme: 'default', locale: 'pt-BR' }),
          updatedBy: adminUser._id
        }
      }
    );

    const roleNames = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'];
    const rolesMap: Record<string, any> = {};
    for (const roleName of roleNames) {
      const role = await Role.findOneAndUpdate(
        { name: roleName },
        {
          $set: { description: `${roleName} role`, updatedBy: adminUser._id },
          $setOnInsert: { createdBy: adminUser._id }
        },
        { upsert: true, new: true }
      );
      rolesMap[roleName] = role;
    }

    console.log('🧹 Cleaning previous seeded data...');

    const existingTechnicians = await Technician.find({ account: account._id }).select('user');
    const technicianUserIds = existingTechnicians.map((tech) => tech.user).filter((id): id is typeof id & {} => id != null);

    const accountUsersToDelete = await User.find({
      account: account._id,
      _id: { $ne: adminUser._id }
    }).select('_id');

    const uniqueUserIds = Array.from(new Set([...technicianUserIds.map((id) => id.toString()), ...accountUsersToDelete.map((u) => u._id.toString())]));
    const userIdsToDelete = uniqueUserIds.map((id) => new Types.ObjectId(id));

    await Promise.all([
      Contract.deleteMany({ account: account._id }),
      Customer.deleteMany({ account: account._id }),
      Service.deleteMany({ account: account._id }),
      Product.deleteMany({ account: account._id }),
      Quote.deleteMany({ account: account._id }),
      ServiceOrder.deleteMany({ account: account._id }),
      RecurringEventConfig.deleteMany({ account: account._id }),
      Event.deleteMany({ account: account._id }),
      FollowUp.deleteMany({ account: account._id }),
      PaymentOrder.deleteMany({ account: account._id }),
      Expense.deleteMany({ account: account._id }),
      VehicleUsage.deleteMany({ account: account._id }),
      Vehicle.deleteMany({ account: account._id }),
      Technician.deleteMany({ account: account._id }),
      User.deleteMany({ _id: { $in: userIdsToDelete }, account: account._id })
    ]);

    console.log('✅ Cleanup complete');

    console.log('👥 Creating users and technicians...');

    const technicianUsersPayload: any[] = [];
    for (let i = 0; i < CONFIG.technicianUsers; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `${firstName}.${lastName}.${faker.string.alphanumeric({ length: 4, casing: 'lower' })}@demo-salvtec.com.br`
        .toLowerCase()
        .replace(/\s+/g, '');

      technicianUsersPayload.push({
        account: account._id,
        firstName,
        lastName,
        email,
        passwordHash,
        status: weighted([
          { value: 'active', weight: 88 },
          { value: 'inactive', weight: 8 },
          { value: 'suspended', weight: 4 }
        ]),
        roles: [rolesMap.TECHNICIAN._id],
        language: 'pt-BR',
        phoneNumber: generatePhone(),
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      });
    }

    const officeUsersPayload: any[] = [];
    for (let i = 0; i < CONFIG.officeUsers; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const isSupervisor = i < Math.ceil(CONFIG.officeUsers / 2);
      const role = isSupervisor ? rolesMap.SUPERVISOR._id : rolesMap.ADMIN._id;
      const email = `${firstName}.${lastName}.office.${faker.string.alphanumeric({ length: 3, casing: 'lower' })}@demo-salvtec.com.br`
        .toLowerCase()
        .replace(/\s+/g, '');

      officeUsersPayload.push({
        account: account._id,
        firstName,
        lastName,
        email,
        passwordHash,
        status: 'active',
        roles: [role],
        language: 'pt-BR',
        phoneNumber: generatePhone(),
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      });
    }

    const createdTechnicianUsers = await User.insertMany(technicianUsersPayload);
    const createdOfficeUsers = await User.insertMany(officeUsersPayload);
    const allOperationalUsers = [adminUser, ...createdOfficeUsers];

    const cpfSet = new Set<string>();
    const techniciansPayload = createdTechnicianUsers.map((user: any) => {
      let cpf = generateCPF();
      while (cpfSet.has(cpf)) cpf = generateCPF();
      cpfSet.add(cpf);

      const status = weighted([
        { value: 'active', weight: 90 },
        { value: 'inactive', weight: 7 },
        { value: 'suspended', weight: 3 }
      ]);

      const startDate = faker.date.past({ years: 4 });
      const endDate = status === 'active' ? undefined : faker.date.between({ from: startDate, to: new Date() });

      return {
        account: account._id,
        user: user._id,
        cpf,
        status,
        startDate,
        endDate,
        address: generateAddress(),
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      };
    });

    const createdTechnicians = await Technician.insertMany(techniciansPayload);

    console.log(`✅ Users created: ${createdTechnicianUsers.length + createdOfficeUsers.length}`);
    console.log(`✅ Technicians created: ${createdTechnicians.length}`);

    console.log('🏷️ Creating equipment types...');

    const equipmentTypePayload = EQUIPMENT_TYPES.map((name) => ({
      name,
      description: `Tipo de equipamento: ${name}`,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }));

    for (const equipmentType of equipmentTypePayload) {
      await EquipmentType.findOneAndUpdate({ name: equipmentType.name }, { $set: equipmentType, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    }

    console.log('✅ Equipment types ready');

    console.log('🏢 Creating customers and contracts...');

    const customerPayload: any[] = [];
    for (let i = 0; i < CONFIG.customers; i++) {
      const type = weighted([
        { value: 'residential', weight: 72 },
        { value: 'commercial', weight: 28 }
      ]);
      const status = weighted([
        { value: 'active', weight: 84 },
        { value: 'inactive', weight: 10 },
        { value: 'suspended', weight: 6 }
      ]);

      const equipments = Array.from({ length: faker.number.int({ min: CONFIG.equipmentsPerCustomer.min, max: CONFIG.equipmentsPerCustomer.max }) }, () => ({
        name: faker.helpers.arrayElement(EQUIPMENT_TYPES),
        room: faker.helpers.arrayElement(['Sala', 'Quarto', 'Escritório', 'Loja', 'Recepção', 'Depósito']),
        btus: faker.helpers.arrayElement([9000, 12000, 18000, 24000, 30000, 36000]),
        maker: faker.helpers.arrayElement(EQUIPMENT_MAKERS),
        model: faker.string.alphanumeric({ length: { min: 4, max: 8 }, casing: 'upper' }),
        pictures: []
      }));

      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      const noteDate = faker.date.recent({ days: 120 });

      customerPayload.push({
        account: account._id,
        name: type === 'commercial' ? faker.company.name() : faker.person.fullName(),
        email: faker.helpers.maybe(() => faker.internet.email().toLowerCase(), { probability: 0.92 }),
        type,
        status,
        cpf: type === 'residential' ? generateCPF() : undefined,
        cnpj: type === 'commercial' ? generateCNPJ() : undefined,
        contactName: type === 'commercial' ? faker.person.fullName() : undefined,
        phoneNumbers: [generatePhone(), ...(chance(0.35) ? [generatePhone()] : [])],
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.45 }),
        noteHistory: chance(0.55)
          ? [
              {
                date: noteDate,
                content: faker.helpers.arrayElement([
                  'Cliente solicita manutenção trimestral.',
                  'Preferência por atendimento no período da manhã.',
                  'Equipamento em área de difícil acesso.',
                  'Histórico de chamados recorrentes no verão.'
                ]),
                createdBy: createdByUser._id
              }
            ]
          : [],
        address: generateAddress(),
        equipments,
        pictures: [],
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      });
    }

    const createdCustomers = await Customer.insertMany(customerPayload);

    const contractsPayload: any[] = [];
    const contractCustomers = faker.helpers.shuffle(createdCustomers).slice(0, CONFIG.contracts);
    for (const customer of contractCustomers) {
      const startDate = faker.date.past({ years: 2 });
      const frequency = faker.helpers.arrayElement(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual']);
      const monthsToAdd = { monthly: 12, bimonthly: 12, quarterly: 12, biannual: 24, annual: 24 }[frequency];
      const expireDate = new Date(startDate);
      expireDate.setMonth(expireDate.getMonth() + monthsToAdd);

      const status =
        expireDate < new Date()
          ? 'expired'
          : weighted([
              { value: 'active', weight: 70 },
              { value: 'pending', weight: 20 },
              { value: 'cancelled', weight: 10 }
            ]);

      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);

      contractsPayload.push({
        startDate,
        expireDate,
        status,
        frequency,
        terms: faker.helpers.arrayElement([
          'Visita técnica conforme periodicidade acordada, incluindo checklist de segurança.',
          'Inclui manutenção preventiva com relatório técnico digital.',
          'Atendimento corretivo com SLA de até 48 horas úteis.',
          'Cobertura de mão de obra e deslocamento em horário comercial.'
        ]),
        value: faker.number.float({ min: 390, max: 6200, fractionDigits: 2 }),
        customer: customer._id,
        account: account._id,
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      });
    }

    const createdContracts = await Contract.insertMany(contractsPayload);

    console.log(`✅ Customers created: ${createdCustomers.length}`);
    console.log(`✅ Contracts created: ${createdContracts.length}`);

    console.log('🧰 Creating services and products...');

    const servicesPayload = Array.from({ length: CONFIG.services }, (_, index) => {
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      return {
        account: account._id,
        name: `${faker.helpers.arrayElement(SERVICE_NAMES)} ${index + 1}`,
        description: faker.lorem.sentence({ min: 8, max: 18 }),
        value: faker.number.float({ min: 120, max: 2400, fractionDigits: 2 }),
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      };
    });

    const productsPayload = Array.from({ length: CONFIG.products }, (_, index) => {
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      return {
        account: account._id,
        name: `${faker.helpers.arrayElement(PRODUCT_NAMES)} ${index + 1}`,
        description: faker.lorem.sentence({ min: 6, max: 16 }),
        maker: faker.helpers.arrayElement(EQUIPMENT_MAKERS),
        model: faker.string.alphanumeric({ length: { min: 4, max: 8 }, casing: 'upper' }),
        value: faker.number.float({ min: 20, max: 1600, fractionDigits: 2 }),
        sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      };
    });

    const createdServices = await Service.insertMany(servicesPayload);
    const createdProducts = await Product.insertMany(productsPayload);

    console.log(`✅ Services created: ${createdServices.length}`);
    console.log(`✅ Products created: ${createdProducts.length}`);

    console.log('📄 Creating quotes and service orders...');

    const quotesPayload: any[] = [];
    for (let i = 0; i < CONFIG.quotes; i++) {
      const customer = faker.helpers.arrayElement(createdCustomers);
      const quoteServicesBase = pickManyUnique(createdServices, CONFIG.servicesPerQuote.min, CONFIG.servicesPerQuote.max).map((service) => ({
        service: service._id,
        quantity: faker.number.int({ min: 1, max: 3 }),
        unitValue: service.value
      }));

      const quoteProductsBase = pickManyUnique(createdProducts, CONFIG.productsPerQuote.min, CONFIG.productsPerQuote.max).map((product) => ({
        product: product._id,
        quantity: faker.number.int({ min: 1, max: 4 }),
        unitValue: product.value
      }));

      const discount = faker.helpers.maybe(() => faker.number.int({ min: 5, max: 18 }), { probability: 0.35 }) || 0;
      const otherDiscounts =
        faker.helpers.maybe(
          () => [
            {
              description: faker.helpers.arrayElement(['Desconto comercial', 'Ajuste de fidelidade', 'Campanha sazonal']),
              amount: faker.number.float({ min: 50, max: 350, fractionDigits: 2 })
            }
          ],
          { probability: CONFIG.extraDiscountProbability }
        ) || [];

      const totals = calculateQuoteTotals(quoteServicesBase, quoteProductsBase, discount, otherDiscounts);
      const issuedAt = faker.date.recent({ days: 150 });
      const validUntil = faker.date.between({ from: issuedAt, to: faker.date.future({ years: 1, refDate: issuedAt }) });
      const status = weighted([
        { value: 'draft', weight: 16 },
        { value: 'sent', weight: 36 },
        { value: 'accepted', weight: 38 },
        { value: 'rejected', weight: 10 }
      ]);

      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);

      quotesPayload.push({
        account: account._id,
        customer: customer._id,
        equipments: customer.equipments || [],
        services: quoteServicesBase,
        products: quoteProductsBase,
        totalValue: totals.totalValue,
        description: faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 3 }), { probability: 0.75 }),
        discount,
        otherDiscounts,
        status,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
        validUntil,
        issuedAt,
        accountCustomizations: account.customizations,
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      });
    }

    const createdQuotes = await Quote.insertMany(quotesPayload);

    const acceptedQuotes = createdQuotes.filter((quote: any) => quote.status === 'accepted');
    const serviceOrdersPayload: any[] = [];
    const orderCount = Math.min(CONFIG.serviceOrders, acceptedQuotes.length);

    for (let i = 0; i < orderCount; i++) {
      const quote = acceptedQuotes[i];
      const quoteCustomer = createdCustomers.find((customer: any) => customer._id.toString() === quote.customer.toString());
      if (!quoteCustomer) continue;

      const itemServices = (quote.services || []).map((serviceItem: any) => {
        const linkedService = createdServices.find((service: any) => service._id.toString() === serviceItem.service.toString());
        const totalValue = serviceItem.quantity * serviceItem.unitValue;
        return {
          type: 'service',
          itemId: serviceItem.service,
          name: linkedService?.name || 'Serviço',
          description: linkedService?.description,
          quantity: serviceItem.quantity,
          unitValue: serviceItem.unitValue,
          totalValue
        };
      });

      const itemProducts = (quote.products || []).map((productItem: any) => {
        const linkedProduct = createdProducts.find((product: any) => product._id.toString() === productItem.product.toString());
        const totalValue = productItem.quantity * productItem.unitValue;
        return {
          type: 'product',
          itemId: productItem.product,
          name: linkedProduct?.name || 'Produto',
          description: linkedProduct?.description,
          quantity: productItem.quantity,
          unitValue: productItem.unitValue,
          totalValue
        };
      });

      const items = [...itemServices, ...itemProducts];
      const subtotal = items.reduce((acc, item) => acc + item.totalValue, 0);
      const discount = quote.discount || 0;
      const orderOtherDiscounts = quote.otherDiscounts || [];
      const percentageDiscountValue = subtotal * (discount / 100);
      const otherDiscountValue = orderOtherDiscounts.reduce((acc: number, item: { amount: number }) => acc + item.amount, 0);
      const totalValue = Math.max(0, subtotal - percentageDiscountValue - otherDiscountValue);

      const status = weighted([
        { value: 'pending', weight: 14 },
        { value: 'scheduled', weight: 24 },
        { value: 'in_progress', weight: 18 },
        { value: 'completed', weight: 30 },
        { value: 'payment_order_created', weight: 10 },
        { value: 'cancelled', weight: 4 }
      ]);

      const issuedAt = faker.date.recent({ days: 120 });
      const now = new Date();
      let scheduledDate: Date | undefined;
      if (status === 'scheduled') {
        scheduledDate = faker.date.between({ from: issuedAt, to: faker.date.future({ years: 1, refDate: issuedAt }) });
      } else if (['in_progress', 'completed', 'payment_order_created'].includes(status)) {
        scheduledDate = faker.date.between({ from: issuedAt, to: now });
      }

      const startedAt =
        ['in_progress', 'completed', 'payment_order_created'].includes(status) && scheduledDate
          ? faker.date.between({ from: scheduledDate, to: now })
          : undefined;
      const completedAt = ['completed', 'payment_order_created'].includes(status) && startedAt ? faker.date.between({ from: startedAt, to: now }) : undefined;

      const assignedTechnician = faker.helpers.arrayElement(createdTechnicians);
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);

      serviceOrdersPayload.push({
        orderNumber: `SO-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}-${faker.string.alphanumeric({ length: 3, casing: 'upper' })}`,
        quote: quote._id,
        customer: quoteCustomer._id,
        equipments: quote.equipments || quoteCustomer.equipments || [],
        account: account._id,
        items,
        changeOrders: [],
        description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
        discount,
        otherDiscounts: orderOtherDiscounts,
        subtotal,
        totalValue,
        issuedAt,
        scheduledDate,
        startedAt,
        completedAt,
        assignedTechnician: assignedTechnician._id,
        status,
        priority: weighted([
          { value: 'low', weight: 10 },
          { value: 'normal', weight: 65 },
          { value: 'high', weight: 20 },
          { value: 'urgent', weight: 5 }
        ]),
        notes: faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 2 }), { probability: 0.45 }),
        customerNotes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      });
    }

    const createdServiceOrders = await ServiceOrder.insertMany(serviceOrdersPayload);

    console.log(`✅ Quotes created: ${createdQuotes.length}`);
    console.log(`✅ Service orders created: ${createdServiceOrders.length}`);

    console.log('🗓️ Creating recurring configs and events...');

    const recurringConfigsPayload = Array.from({ length: CONFIG.recurringConfigs }, () => {
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      const startDate = faker.date.recent({ days: 120 });
      const untilDate = faker.date.future({ years: 1, refDate: startDate });
      const frequency = faker.helpers.arrayElement(['weekly', 'monthly']);

      return {
        account: account._id,
        frequency,
        interval: frequency === 'weekly' ? faker.number.int({ min: 1, max: 2 }) : 1,
        daysOfWeek: frequency === 'weekly' ? pickManyUnique([1, 2, 3, 4, 5], 1, 2).sort() : [],
        startDate: randomIsoDateString(startDate),
        untilDate: randomIsoDateString(untilDate),
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      };
    });

    const createdRecurringConfigs = await RecurringEventConfig.insertMany(recurringConfigsPayload);

    const eventsPayload: any[] = [];

    for (const order of createdServiceOrders.slice(0, Math.floor(createdServiceOrders.length * 0.7))) {
      const customer = createdCustomers.find((item: any) => item._id.toString() === order.customer.toString());
      if (!customer) continue;

      const assignedTechnician = order.assignedTechnician ? [order.assignedTechnician] : [faker.helpers.arrayElement(createdTechnicians)._id];
      const status = order.status === 'completed' || order.status === 'payment_order_created' ? 'completed' : 'scheduled';
      const day = order.scheduledDate || faker.date.recent({ days: 50 });
      const startHour = faker.number.int({ min: 8, max: 16 });
      const duration = faker.number.int({ min: 1, max: 3 });

      eventsPayload.push({
        date: randomIsoDateString(day),
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(Math.min(22, startHour + duration)).padStart(2, '0')}:00`,
        customer: customer._id,
        technician: assignedTechnician,
        account: account._id,
        title: faker.helpers.arrayElement(['Visita técnica', 'Execução de serviço', 'Retorno técnico']),
        description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
        status,
        completionNotes: status === 'completed' ? faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) : undefined,
        completedAt: status === 'completed' ? order.completedAt || new Date() : undefined,
        completedBy: status === 'completed' ? faker.helpers.arrayElement(allOperationalUsers)._id : undefined,
        serviceOrder: order._id,
        recurringConfig: chance(0.2) ? faker.helpers.arrayElement(createdRecurringConfigs)._id : undefined,
        createdBy: faker.helpers.arrayElement(allOperationalUsers)._id,
        updatedBy: faker.helpers.arrayElement(allOperationalUsers)._id
      });
    }

    while (eventsPayload.length < CONFIG.events) {
      const customer = faker.helpers.arrayElement(createdCustomers);
      const technicians = pickManyUnique(createdTechnicians, 1, 2).map((technician) => technician._id);
      const startHour = faker.number.int({ min: 8, max: 17 });
      const duration = faker.number.int({ min: 1, max: 3 });
      const status = weighted([
        { value: 'scheduled', weight: 62 },
        { value: 'completed', weight: 33 },
        { value: 'cancelled', weight: 5 }
      ]);

      const now = new Date();
      const date =
        status === 'completed'
          ? faker.date.between({ from: faker.date.past({ years: 1 }), to: now })
          : faker.date.between({ from: faker.date.past({ years: 1 }), to: faker.date.future({ years: 1 }) });

      const recurringConfig = chance(0.3) ? faker.helpers.arrayElement(createdRecurringConfigs)._id : undefined;

      eventsPayload.push({
        date: randomIsoDateString(date),
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(Math.min(22, startHour + duration)).padStart(2, '0')}:00`,
        customer: customer._id,
        technician: technicians,
        account: account._id,
        title: faker.helpers.arrayElement(['Visita de manutenção', 'Inspeção preventiva', 'Atendimento técnico']),
        description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
        status,
        completionNotes: status === 'completed' ? faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }) : undefined,
        completedAt: status === 'completed' ? faker.date.between({ from: date, to: new Date() }) : undefined,
        completedBy: status === 'completed' ? faker.helpers.arrayElement(allOperationalUsers)._id : undefined,
        recurringConfig,
        createdBy: faker.helpers.arrayElement(allOperationalUsers)._id,
        updatedBy: faker.helpers.arrayElement(allOperationalUsers)._id
      });
    }

    const createdEvents = await Event.insertMany(eventsPayload);

    console.log(`✅ Recurring configs created: ${createdRecurringConfigs.length}`);
    console.log(`✅ Events created: ${createdEvents.length}`);

    console.log('💰 Creating payment orders and expenses...');

    const paymentOrdersPayload: any[] = [];
    for (const order of createdServiceOrders) {
      if (order.status === 'cancelled' || order.totalValue <= 0) continue;

      const paymentStatus = weighted([
        { value: 'pending', weight: 22 },
        { value: 'partial', weight: 28 },
        { value: 'paid', weight: 46 },
        { value: 'refunded', weight: 4 }
      ]);

      const dueDate = faker.date.between({ from: order.issuedAt || new Date(), to: faker.date.future({ years: 1 }) });
      let paidAmount = 0;
      if (paymentStatus === 'paid') paidAmount = order.totalValue;
      if (paymentStatus === 'partial') {
        paidAmount = faker.number.float({ min: order.totalValue * 0.25, max: order.totalValue * 0.85, fractionDigits: 2 });
      }
      if (paymentStatus === 'refunded') paidAmount = order.totalValue;

      const payments =
        paidAmount > 0
          ? [
              {
                amount: paidAmount,
                paymentMethod: faker.helpers.arrayElement(['pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer']),
                transactionId: faker.helpers.maybe(() => `TX-${faker.string.alphanumeric({ length: 12, casing: 'upper' })}`, { probability: 0.75 }),
                paymentDate: faker.date.between({ from: order.issuedAt || new Date(), to: new Date() }),
                notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.45 }),
                recordedBy: faker.helpers.arrayElement(allOperationalUsers)._id
              }
            ]
          : [];

      paymentOrdersPayload.push({
        account: account._id,
        customer: order.customer,
        serviceOrder: order._id,
        paymentStatus,
        payments,
        totalAmount: order.totalValue,
        dueDate,
        invoiceNumber: `INV-${new Date().getFullYear()}-${faker.string.numeric(6)}`,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.35 }),
        discountAmount: faker.helpers.maybe(() => faker.number.float({ min: 0, max: 250, fractionDigits: 2 }), { probability: 0.25 }),
        taxAmount: faker.helpers.maybe(() => faker.number.float({ min: 0, max: 300, fractionDigits: 2 }), { probability: 0.3 }),
        createdBy: faker.helpers.arrayElement(allOperationalUsers)._id,
        updatedBy: faker.helpers.arrayElement(allOperationalUsers)._id
      });
    }

    const createdPaymentOrders = await PaymentOrder.insertMany(paymentOrdersPayload);

    const expenseCategories = Object.values(ExpenseCategory);
    const expensesPayload = Array.from({ length: CONFIG.expenses }, () => {
      const category = faker.helpers.arrayElement(expenseCategories);
      const date = faker.date.between({ from: faker.date.past({ years: 1 }), to: new Date() });
      const title = faker.helpers.arrayElement(EXPENSE_TITLES_BY_CATEGORY[category] || ['Despesa operacional']);
      const approved = chance(0.68);
      const approver = approved ? faker.helpers.arrayElement(allOperationalUsers) : undefined;
      const creator = faker.helpers.arrayElement(allOperationalUsers);

      return {
        account: account._id,
        title,
        category,
        amount: faker.number.float({ min: 40, max: category === ExpenseCategory.OWNERS_SALARY ? 14000 : 3800, fractionDigits: 2 }),
        expenseDate: randomDateString(date),
        approvedBy: approver?._id,
        approvedDate: approved ? faker.date.between({ from: date, to: new Date() }) : undefined,
        createdBy: creator._id,
        updatedBy: creator._id
      };
    });

    const createdExpenses = await Expense.insertMany(expensesPayload);

    console.log(`✅ Payment orders created: ${createdPaymentOrders.length}`);
    console.log(`✅ Expenses created: ${createdExpenses.length}`);

    console.log('🚚 Creating fleet and vehicle usage records...');

    const vehiclesPayload = Array.from({ length: CONFIG.vehicles }, (_, index) => {
      const make = faker.helpers.arrayElement(VEHICLE_MAKES);
      const model = faker.helpers.arrayElement(VEHICLE_MODELS);
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      return {
        account: account._id,
        name: `Veículo ${index + 1} - ${model}`,
        licensePlate: `${faker.string.alpha({ length: 3, casing: 'upper' })}${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`,
        make,
        model,
        year: faker.number.int({ min: 2014, max: new Date().getFullYear() }),
        isActive: chance(0.9),
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      };
    });

    const createdVehicles = await Vehicle.insertMany(vehiclesPayload);

    const vehicleUsagesPayload: any[] = [];
    for (let i = 0; i < CONFIG.vehicleUsages; i++) {
      const departureDate = faker.date.between({ from: faker.date.past({ years: 1 }), to: new Date() });
      const status = weighted([
        { value: 'approved', weight: 72 },
        { value: 'pending', weight: 28 }
      ]);
      const departureMileage = faker.number.int({ min: 5000, max: 160000 });
      const hasArrival = chance(0.82);
      const arrivalDate = hasArrival ? faker.date.between({ from: departureDate, to: new Date() }) : undefined;
      const arrivalMileage = hasArrival ? departureMileage + faker.number.int({ min: 5, max: 180 }) : undefined;
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);
      const approvedByUser = status === 'approved' ? faker.helpers.arrayElement(allOperationalUsers) : undefined;

      vehicleUsagesPayload.push({
        account: account._id,
        technician: faker.helpers.arrayElement(createdTechnicians)._id,
        vehicle: faker.helpers.arrayElement(createdVehicles)._id,
        departureDate,
        departureMileage,
        arrivalDate,
        arrivalMileage,
        status,
        approvedBy: approvedByUser?._id,
        approvedAt: approvedByUser ? faker.date.between({ from: departureDate, to: new Date() }) : undefined,
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      });
    }

    const createdVehicleUsages = await VehicleUsage.insertMany(vehicleUsagesPayload);

    console.log(`✅ Vehicles created: ${createdVehicles.length}`);
    console.log(`✅ Vehicle usages created: ${createdVehicleUsages.length}`);

    console.log('📌 Creating follow-ups...');

    const followUpsPayload = Array.from({ length: CONFIG.followUps }, () => {
      const status = weighted([
        { value: 'pending', weight: 44 },
        { value: 'completed', weight: 56 }
      ]);
      const startDate = faker.date.between({ from: faker.date.past({ years: 1 }), to: faker.date.future({ years: 1 }) });
      const completedAt = status === 'completed' ? faker.date.between({ from: faker.date.past({ years: 1 }), to: new Date() }) : undefined;
      const completedBy = completedAt ? faker.helpers.arrayElement(allOperationalUsers)._id : undefined;
      const createdByUser = faker.helpers.arrayElement(allOperationalUsers);

      return {
        customer: faker.helpers.arrayElement(createdCustomers)._id,
        account: account._id,
        startDate,
        status,
        completedAt,
        completedBy,
        notes: faker.helpers.maybe(
          () => [
            faker.helpers.arrayElement([
              'Retornar contato para proposta de manutenção anual.',
              'Cliente solicitou revisão de orçamento enviado.',
              'Agendar visita técnica no próximo mês.',
              'Confirmar troca de equipamento em garantia.'
            ])
          ],
          { probability: 0.75 }
        ),
        createdBy: createdByUser._id,
        updatedBy: createdByUser._id
      };
    });

    const createdFollowUps = await FollowUp.insertMany(followUpsPayload);

    console.log(`✅ Follow-ups created: ${createdFollowUps.length}`);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log(`Account: ${account.name}`);
    console.log(`Admin kept: ${adminUser.email}`);
    console.log('Generated entities:');
    console.log(`- Users (new): ${createdTechnicianUsers.length + createdOfficeUsers.length}`);
    console.log(`- Technicians: ${createdTechnicians.length}`);
    console.log(`- Customers: ${createdCustomers.length}`);
    console.log(`- Contracts: ${createdContracts.length}`);
    console.log(`- Services: ${createdServices.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Quotes: ${createdQuotes.length}`);
    console.log(`- Service Orders: ${createdServiceOrders.length}`);
    console.log(`- Recurring Configs: ${createdRecurringConfigs.length}`);
    console.log(`- Events: ${createdEvents.length}`);
    console.log(`- Payment Orders: ${createdPaymentOrders.length}`);
    console.log(`- Expenses: ${createdExpenses.length}`);
    console.log(`- Vehicles: ${createdVehicles.length}`);
    console.log(`- Vehicle Usages: ${createdVehicleUsages.length}`);
    console.log(`- Follow-ups: ${createdFollowUps.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error while seeding dummy data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

populateDummyData();
