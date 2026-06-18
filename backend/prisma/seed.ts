import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/services/password';

const prisma = new PrismaClient();

const addDays = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

type DemoUserInput = {
  username: string;
  email: string;
  password: string;
  full_name: string;
  tel_number: string;
  age: number;
  is_email_verified: boolean;
  role: Role;
  pharmacy_id?: string | null;
};

const demoSuperAdminOneEmail = (
  process.env.DEMO_SUPER_ADMIN_1_EMAIL ?? 'superadmin@dorixona.uz'
).toLowerCase();
const demoSuperAdminOnePassword = process.env.DEMO_SUPER_ADMIN_1_PASSWORD ?? 'Password123!';
const demoSuperAdminTwoEmail = (
  process.env.DEMO_SUPER_ADMIN_2_EMAIL ?? 'superadmin2@dorixona.uz'
).toLowerCase();
const demoSuperAdminTwoPassword = process.env.DEMO_SUPER_ADMIN_2_PASSWORD ?? 'Password123!';

const upsertDemoUser = async (
  prisma: PrismaClient,
  input: DemoUserInput,
) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.email },
        { username: input.username },
      ],
    },
    select: { id: true },
  });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username: input.username,
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        tel_number: input.tel_number,
        age: input.age,
        is_email_verified: input.is_email_verified,
        role: input.role,
        pharmacy_id: input.pharmacy_id ?? null,
      },
    });
  }

  return prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      password: input.password,
      full_name: input.full_name,
      tel_number: input.tel_number,
      age: input.age,
      is_email_verified: input.is_email_verified,
      role: input.role,
      pharmacy_id: input.pharmacy_id ?? null,
    },
  });
};

async function main(): Promise<void> {
  const commonPasswordHash = await hashPassword('Password123!');
  const superAdminOnePasswordHash = await hashPassword(demoSuperAdminOnePassword);
  const superAdminTwoPasswordHash = await hashPassword(demoSuperAdminTwoPassword);

  const [mainPharmacy, branchPharmacy] = await Promise.all([
    prisma.pharmacy.upsert({
      where: { licenseNumber: 'DORI-001' },
      update: {
        name: 'Dorixona Markaz',
        address: 'Tashkent, Yunusobod',
        phone: '+998712000001',
        isBlocked: false,
      },
      create: {
        name: 'Dorixona Markaz',
        licenseNumber: 'DORI-001',
        address: 'Tashkent, Yunusobod',
        phone: '+998712000001',
      },
    }),
    prisma.pharmacy.upsert({
      where: { licenseNumber: 'DORI-002' },
      update: {
        name: 'Dorixona Sergeli',
        address: 'Tashkent, Sergeli',
        phone: '+998712000002',
        isBlocked: false,
      },
      create: {
        name: 'Dorixona Sergeli',
        licenseNumber: 'DORI-002',
        address: 'Tashkent, Sergeli',
        phone: '+998712000002',
      },
    }),
  ]);

  const [superAdmin, secondSuperAdmin, owner, primaryAdmin, seller, customer] = await Promise.all([
    upsertDemoUser(prisma, {
      username: 'superadmin',
      email: demoSuperAdminOneEmail,
      password: superAdminOnePasswordHash,
      full_name: 'System Super Admin',
      tel_number: '+998901111111',
      age: 30,
      is_email_verified: true,
      role: Role.SUPER_ADMIN,
      pharmacy_id: null,
    }),
    upsertDemoUser(prisma, {
      username: 'superadmin2',
      email: demoSuperAdminTwoEmail,
      password: superAdminTwoPasswordHash,
      full_name: 'Operations Super Admin',
      tel_number: '+998901111112',
      age: 32,
      is_email_verified: true,
      role: Role.SUPER_ADMIN,
      pharmacy_id: null,
    }),
    upsertDemoUser(prisma, {
      username: 'owner',
      email: 'owner@dorixona.uz',
      password: commonPasswordHash,
      full_name: 'Main Pharmacy Owner',
      tel_number: '+998902222222',
      age: 35,
      is_email_verified: true,
      role: Role.OWNER,
      pharmacy_id: mainPharmacy.id,
    }),
    upsertDemoUser(prisma, {
      username: 'admin',
      email: 'admin@dorixona.uz',
      password: commonPasswordHash,
      full_name: 'Main Pharmacy Admin',
      tel_number: '+998905555555',
      age: 29,
      is_email_verified: true,
      role: Role.ADMIN,
      pharmacy_id: mainPharmacy.id,
    }),
    upsertDemoUser(prisma, {
      username: 'seller',
      email: 'seller@dorixona.uz',
      password: commonPasswordHash,
      full_name: 'Main Pharmacy Seller',
      tel_number: '+998903333333',
      age: 24,
      is_email_verified: true,
      role: Role.SELLER,
      pharmacy_id: mainPharmacy.id,
    }),
    upsertDemoUser(prisma, {
      username: 'customer',
      email: 'customer@dorixona.uz',
      password: commonPasswordHash,
      full_name: 'Demo Customer',
      tel_number: '+998904444444',
      age: 22,
      is_email_verified: true,
      role: Role.CUSTOMER,
      pharmacy_id: null,
    }),
  ]);

  const additionalAdminSpecs = Array.from({ length: 49 }, (_, index) => {
    const serial = String(index + 1).padStart(2, '0');
    const pharmacy = index % 2 === 0 ? mainPharmacy : branchPharmacy;

    return {
      username: `admin${serial}`,
      email: `admin${serial}@dorixona.uz`,
      full_name: `Demo Admin ${serial}`,
      tel_number: `+99890${String(6000000 + index).padStart(7, '0')}`,
      age: 25 + (index % 8),
      pharmacy_id: pharmacy.id,
    };
  });

  const additionalAdmins = await Promise.all(
    additionalAdminSpecs.map((item) =>
      prisma.user.upsert({
        where: { email: item.email },
        update: {
          username: item.username,
          password: commonPasswordHash,
          full_name: item.full_name,
          tel_number: item.tel_number,
          age: item.age,
          is_email_verified: true,
          role: Role.ADMIN,
          pharmacy_id: item.pharmacy_id,
        },
        create: {
          username: item.username,
          email: item.email,
          password: commonPasswordHash,
          full_name: item.full_name,
          tel_number: item.tel_number,
          age: item.age,
          is_email_verified: true,
          role: Role.ADMIN,
          pharmacy_id: item.pharmacy_id,
        },
      }).catch(async (error: { code?: string }) => {
        if (error.code === 'P2002') {
          return upsertDemoUser(prisma, {
            username: item.username,
            email: item.email,
            password: commonPasswordHash,
            full_name: item.full_name,
            tel_number: item.tel_number,
            age: item.age,
            is_email_verified: true,
            role: Role.ADMIN,
            pharmacy_id: item.pharmacy_id,
          });
        }

        throw error;
      }),
    ),
  );

  const products = await Promise.all([
    prisma.product.upsert({
      where: { barcode: '4780001000011' },
      update: {
        name: 'Paracetamol 500mg',
        sku: 'PARA-500',
        purchasePrice: '8000',
        sellingPrice: '12000',
        expiryDate: addDays(240),
        manufacturer: 'Demo Pharma',
      },
      create: {
        name: 'Paracetamol 500mg',
        sku: 'PARA-500',
        barcode: '4780001000011',
        purchasePrice: '8000',
        sellingPrice: '12000',
        expiryDate: addDays(240),
        manufacturer: 'Demo Pharma',
      },
    }),
    prisma.product.upsert({
      where: { barcode: '4780001000012' },
      update: {
        name: 'Ibuprofen 200mg',
        sku: 'IBU-200',
        purchasePrice: '10000',
        sellingPrice: '15000',
        expiryDate: addDays(180),
        manufacturer: 'Health Labs',
      },
      create: {
        name: 'Ibuprofen 200mg',
        sku: 'IBU-200',
        barcode: '4780001000012',
        purchasePrice: '10000',
        sellingPrice: '15000',
        expiryDate: addDays(180),
        manufacturer: 'Health Labs',
      },
    }),
    prisma.product.upsert({
      where: { barcode: '4780001000013' },
      update: {
        name: 'Amoxicillin 500mg',
        sku: 'AMOX-500',
        purchasePrice: '18000',
        sellingPrice: '25000',
        expiryDate: addDays(90),
        manufacturer: 'Antibiotix',
      },
      create: {
        name: 'Amoxicillin 500mg',
        sku: 'AMOX-500',
        barcode: '4780001000013',
        purchasePrice: '18000',
        sellingPrice: '25000',
        expiryDate: addDays(90),
        manufacturer: 'Antibiotix',
      },
    }),
  ]);

  const [starterPlan, proPlan] = await Promise.all([
    prisma.billingPlan.upsert({
      where: { code: 'STARTER' },
      update: {
        name: 'Starter',
        description: 'Small pharmacy monthly plan',
        price: '99000',
        billingInterval: 'MONTHLY',
        maxUsers: 5,
        maxPharmacies: 1,
        isActive: true,
      },
      create: {
        name: 'Starter',
        code: 'STARTER',
        description: 'Small pharmacy monthly plan',
        price: '99000',
        billingInterval: 'MONTHLY',
        maxUsers: 5,
        maxPharmacies: 1,
        isActive: true,
      },
    }),
    prisma.billingPlan.upsert({
      where: { code: 'PRO' },
      update: {
        name: 'Pro',
        description: 'Growing pharmacies yearly plan',
        price: '999000',
        billingInterval: 'YEARLY',
        maxUsers: 50,
        maxPharmacies: 10,
        isActive: true,
      },
      create: {
        name: 'Pro',
        code: 'PRO',
        description: 'Growing pharmacies yearly plan',
        price: '999000',
        billingInterval: 'YEARLY',
        maxUsers: 50,
        maxPharmacies: 10,
        isActive: true,
      },
    }),
  ]);

  await Promise.all([
    prisma.stock.upsert({
      where: {
        pharmacyId_productId_batchNumber: {
          pharmacyId: mainPharmacy.id,
          productId: products[0].id,
          batchNumber: 'P500-BATCH-01',
        },
      },
      update: {
        quantity: 120,
        reorderLevel: 25,
        expiryDate: addDays(240),
      },
      create: {
        pharmacyId: mainPharmacy.id,
        productId: products[0].id,
        batchNumber: 'P500-BATCH-01',
        quantity: 120,
        reorderLevel: 25,
        expiryDate: addDays(240),
      },
    }),
    prisma.stock.upsert({
      where: {
        pharmacyId_productId_batchNumber: {
          pharmacyId: mainPharmacy.id,
          productId: products[1].id,
          batchNumber: 'IBU-BATCH-01',
        },
      },
      update: {
        quantity: 60,
        reorderLevel: 20,
        expiryDate: addDays(180),
      },
      create: {
        pharmacyId: mainPharmacy.id,
        productId: products[1].id,
        batchNumber: 'IBU-BATCH-01',
        quantity: 60,
        reorderLevel: 20,
        expiryDate: addDays(180),
      },
    }),
    prisma.stock.upsert({
      where: {
        pharmacyId_productId_batchNumber: {
          pharmacyId: mainPharmacy.id,
          productId: products[2].id,
          batchNumber: 'AMOX-BATCH-01',
        },
      },
      update: {
        quantity: 15,
        reorderLevel: 15,
        expiryDate: addDays(25),
      },
      create: {
        pharmacyId: mainPharmacy.id,
        productId: products[2].id,
        batchNumber: 'AMOX-BATCH-01',
        quantity: 15,
        reorderLevel: 15,
        expiryDate: addDays(25),
      },
    }),
    prisma.stock.upsert({
      where: {
        pharmacyId_productId_batchNumber: {
          pharmacyId: branchPharmacy.id,
          productId: products[0].id,
          batchNumber: 'P500-BATCH-02',
        },
      },
      update: {
        quantity: 80,
        reorderLevel: 20,
        expiryDate: addDays(210),
      },
      create: {
        pharmacyId: branchPharmacy.id,
        productId: products[0].id,
        batchNumber: 'P500-BATCH-02',
        quantity: 80,
        reorderLevel: 20,
        expiryDate: addDays(210),
      },
    }),
  ]);

  const existingSubscription = await prisma.pharmacySubscription.findFirst({
    where: {
      pharmacyId: mainPharmacy.id,
      planId: starterPlan.id,
    },
  });

  if (!existingSubscription) {
    await prisma.pharmacySubscription.create({
      data: {
        pharmacyId: mainPharmacy.id,
        planId: starterPlan.id,
        status: 'ACTIVE',
        autoRenew: true,
      },
    });
  }

  const branchSubscription = await prisma.pharmacySubscription.findFirst({
    where: {
      pharmacyId: branchPharmacy.id,
      planId: proPlan.id,
    },
  });

  if (!branchSubscription) {
    await prisma.pharmacySubscription.create({
      data: {
        pharmacyId: branchPharmacy.id,
        planId: proPlan.id,
        status: 'TRIAL',
        autoRenew: true,
      },
    });
  }

  const existingSalesCount = await prisma.sale.count({
    where: {
      pharmacyId: mainPharmacy.id,
    },
  });

  if (existingSalesCount === 0) {
    await prisma.sale.create({
      data: {
        pharmacyId: mainPharmacy.id,
        sellerId: seller.id,
        totalAmount: '39000',
        notes: 'Initial seeded sale',
        items: {
          create: [
            {
              productId: products[0].id,
              quantity: 2,
              unitPrice: '12000',
              lineTotal: '24000',
            },
            {
              productId: products[1].id,
              quantity: 1,
              unitPrice: '15000',
              lineTotal: '15000',
            },
          ],
        },
      },
    });
  }

  console.log('Seed completed successfully.');
  console.log('Demo users:');
  console.log(`SUPER_ADMIN => ${demoSuperAdminOneEmail} / ${demoSuperAdminOnePassword}`);
  console.log(`SUPER_ADMIN => ${demoSuperAdminTwoEmail} / ${demoSuperAdminTwoPassword}`);
  console.log('OWNER       => owner@dorixona.uz / Password123!');
  console.log('ADMIN       => admin@dorixona.uz / Password123!');
  console.log('ADMIN       => admin01@dorixona.uz ... admin49@dorixona.uz / Password123!');
  console.log('SELLER      => seller@dorixona.uz / Password123!');
  console.log('CUSTOMER    => customer@dorixona.uz / Password123!');
  console.log(`Created/updated pharmacies: ${mainPharmacy.name}, ${branchPharmacy.name}`);
  console.log(
    `Created/updated users: ${superAdmin.username}, ${secondSuperAdmin.username}, ${owner.username}, ${primaryAdmin.username}, ${additionalAdmins.length} extra admins, ${seller.username}, ${customer.username}`,
  );
  console.log(`SUPER_ADMIN count: 2`);
  console.log(`ADMIN count: ${1 + additionalAdmins.length}`);
  console.log(`Created/updated billing plans: ${starterPlan.code}, ${proPlan.code}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
