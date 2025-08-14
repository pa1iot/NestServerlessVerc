import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Super Admin user
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: '8297808410' },
    update: {
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      isPhoneVerified: true,
      isActive: true,
    },
    create: {
      phoneNumber: '8297808410',
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      isPhoneVerified: true,
      isActive: true,
    },
  });

  console.log('Super Admin created:', superAdmin);
  console.log('\n=== IMPORTANT ===');
  console.log('Super Admin Phone: 8297808410');
  console.log('Use SMS OTP authentication to login as Super Admin');
  console.log('================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });