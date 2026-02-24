import { PrismaClient, BusinessType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing CreatorBusinessProfile...');

  // 1. Fetch all business profiles
  const profiles = await prisma.creatorBusinessProfile.findMany({
    include: { user: true }
  });

  console.log(`Found ${profiles.length} profiles.`);

  // 2. Verify profiles
  let passed = true;

  for (const profile of profiles) {
    console.log(`\nProfile for ${profile.user.email} (${profile.businessType}):`);
    
    // Check constraints
    if (profile.businessType === BusinessType.REGISTERED_COMPANY) {
      if (!profile.companyName || !profile.vatNumber || !profile.addressLine1) {
        console.error('❌ FAILED: Registered Company missing required fields');
        passed = false;
      } else {
        console.log('✅ Registered Company fields present');
      }
    } else if (profile.businessType === BusinessType.SOLE_PROPRIETOR) {
        if (!profile.addressLine1) {
            console.error('❌ FAILED: Sole Proprietor missing address');
            passed = false;
        } else {
            console.log('✅ Sole Proprietor fields present');
        }
    } else {
        console.log('✅ Personal profile (minimal requirements)');
    }

    // Check ISO code
    if (profile.countryCode && profile.countryCode.length !== 2) {
        console.error(`❌ FAILED: Invalid Country Code ${profile.countryCode}`);
        passed = false;
    } else if (profile.countryCode) {
        console.log(`✅ Country Code ${profile.countryCode} valid`);
    }
  }

  if (passed) {
    console.log('\n✅ All profiles validated successfully!');
  } else {
    console.error('\n❌ Validation failed for some profiles.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
