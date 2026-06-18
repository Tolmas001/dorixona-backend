"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const password_1 = require("../src/services/password");
const prisma = new client_1.PrismaClient();
const addDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};
async function main() {
    const commonPasswordHash = await (0, password_1.hashPassword)('Password123!');
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
    const [superAdmin, owner, seller, customer] = await Promise.all([
        prisma.user.upsert({
            where: { email: 'superadmin@dorixona.uz' },
            update: {
                username: 'superadmin',
                password: commonPasswordHash,
                full_name: 'System Super Admin',
                tel_number: '+998901111111',
                age: 30,
                role: client_1.Role.SUPER_ADMIN,
                pharmacy_id: null,
            },
            create: {
                username: 'superadmin',
                email: 'superadmin@dorixona.uz',
                password: commonPasswordHash,
                full_name: 'System Super Admin',
                tel_number: '+998901111111',
                age: 30,
                role: client_1.Role.SUPER_ADMIN,
            },
        }),
        prisma.user.upsert({
            where: { email: 'owner@dorixona.uz' },
            update: {
                username: 'owner',
                password: commonPasswordHash,
                full_name: 'Main Pharmacy Owner',
                tel_number: '+998902222222',
                age: 35,
                role: client_1.Role.OWNER,
                pharmacy_id: mainPharmacy.id,
            },
            create: {
                username: 'owner',
                email: 'owner@dorixona.uz',
                password: commonPasswordHash,
                full_name: 'Main Pharmacy Owner',
                tel_number: '+998902222222',
                age: 35,
                role: client_1.Role.OWNER,
                pharmacy_id: mainPharmacy.id,
            },
        }),
        prisma.user.upsert({
            where: { email: 'seller@dorixona.uz' },
            update: {
                username: 'seller',
                password: commonPasswordHash,
                full_name: 'Main Pharmacy Seller',
                tel_number: '+998903333333',
                age: 24,
                role: client_1.Role.SELLER,
                pharmacy_id: mainPharmacy.id,
            },
            create: {
                username: 'seller',
                email: 'seller@dorixona.uz',
                password: commonPasswordHash,
                full_name: 'Main Pharmacy Seller',
                tel_number: '+998903333333',
                age: 24,
                role: client_1.Role.SELLER,
                pharmacy_id: mainPharmacy.id,
            },
        }),
        prisma.user.upsert({
            where: { email: 'customer@dorixona.uz' },
            update: {
                username: 'customer',
                password: commonPasswordHash,
                full_name: 'Demo Customer',
                tel_number: '+998904444444',
                age: 22,
                role: client_1.Role.CUSTOMER,
                pharmacy_id: null,
            },
            create: {
                username: 'customer',
                email: 'customer@dorixona.uz',
                password: commonPasswordHash,
                full_name: 'Demo Customer',
                tel_number: '+998904444444',
                age: 22,
                role: client_1.Role.CUSTOMER,
            },
        }),
    ]);
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
    console.log('SUPER_ADMIN => superadmin@dorixona.uz / Password123!');
    console.log('OWNER       => owner@dorixona.uz / Password123!');
    console.log('SELLER      => seller@dorixona.uz / Password123!');
    console.log('CUSTOMER    => customer@dorixona.uz / Password123!');
    console.log(`Created/updated pharmacies: ${mainPharmacy.name}, ${branchPharmacy.name}`);
    console.log(`Created/updated users: ${superAdmin.username}, ${owner.username}, ${seller.username}, ${customer.username}`);
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
