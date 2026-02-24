/**
 * Finance Service Test Suite
 * 
 * This file contains test scenarios for the finance service layer.
 * It can be used as documentation for manual testing or integrated
 * with a test runner like Jest or Vitest.
 * 
 * To run manually:
 * 1. Create a test script that imports these scenarios
 * 2. Use an in-memory SQLite database for isolation
 * 3. Run each scenario in sequence
 */

import {
  getOrCreateWallet,
  getWalletByUserId,
  depositToWallet,
  withdrawFromWallet,
  lockCampaignBudget,
  releaseCampaignBudget,
  computeCampaignBudget,
  recordValidViewPayout,
  recordConversionPayout,
  getCreatorBalance,
  adjustWalletBalance,
  FinanceError,
  FinanceErrorCodes,
} from './financeService';
import { db } from '@/lib/db';
import { CampaignStatus, ApplicationStatus } from '@prisma/client';

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

/**
 * Simple test runner for manual testing
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return { name, passed: true, duration: Date.now() - start };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Assert helper
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert equal helper
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Got: ${actual}`);
  }
}

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Test Suite 1: Wallet Creation and Deposits
 * 
 * Scenario: User creates wallet and deposits funds
 * Expected: Wallet is created with correct balance
 */
export async function testWalletCreationAndDeposit(): Promise<void> {
  console.log('Running: testWalletCreationAndDeposit');

  // Create a test user
  const testUser = await db.user.create({
    data: {
      email: `test-wallet-${Date.now()}@example.com`,
      name: 'Test Wallet User',
      roles: 'USER,ADVERTISER',
    },
  });

  try {
    // Test: Create wallet
    const wallet = await getOrCreateWallet(testUser.id);
    assert(!!wallet, 'Wallet should be created');
    assertEqual(wallet.ownerUserId, testUser.id, 'Wallet owner should match');
    assertEqual(wallet.availableCents, 0, 'Initial balance should be 0');

    // Test: Deposit funds
    const depositResult = await depositToWallet({
      userId: testUser.id,
      amountCents: 10000, // €100
      description: 'Test deposit',
    });

    assert(depositResult.success, 'Deposit should succeed');
    assertEqual(depositResult.newAvailableCents, 10000, 'Balance should be €100');

    // Test: Get wallet again
    const walletAgain = await getWalletByUserId(testUser.id);
    assertEqual(walletAgain.availableCents, 10000, 'Wallet should show €100');

    // Test: Deposit more
    const deposit2 = await depositToWallet({
      userId: testUser.id,
      amountCents: 5000, // €50
    });

    assert(deposit2.success, 'Second deposit should succeed');
    assertEqual(deposit2.newAvailableCents, 15000, 'Balance should be €150');

    console.log('✅ testWalletCreationAndDeposit passed');
  } finally {
    // Cleanup
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: testUser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  }
}

/**
 * Test Suite 2: Withdrawal with Insufficient Funds
 * 
 * Scenario: User tries to withdraw more than balance
 * Expected: Withdrawal fails with INSUFFICIENT_FUNDS error
 */
export async function testWithdrawalInsufficientFunds(): Promise<void> {
  console.log('Running: testWithdrawalInsufficientFunds');

  const testUser = await db.user.create({
    data: {
      email: `test-withdraw-${Date.now()}@example.com`,
      name: 'Test Withdraw User',
      roles: 'USER,ADVERTISER',
    },
  });

  try {
    // Create wallet with deposit
    await depositToWallet({
      userId: testUser.id,
      amountCents: 5000, // €50
    });

    // Test: Withdraw more than balance
    const withdrawResult = await withdrawFromWallet({
      userId: testUser.id,
      amountCents: 10000, // €100 (more than €50)
    });

    assert(!withdrawResult.success, 'Withdrawal should fail');
    assertEqual(withdrawResult.error, FinanceErrorCodes.INSUFFICIENT_FUNDS, 'Should have insufficient funds error');

    // Verify balance unchanged
    const wallet = await getWalletByUserId(testUser.id);
    assertEqual(wallet.availableCents, 5000, 'Balance should still be €50');

    console.log('✅ testWithdrawalInsufficientFunds passed');
  } finally {
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: testUser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  }
}

/**
 * Test Suite 3: Campaign Budget Lock
 * 
 * Scenario: Advertiser locks budget for campaign
 * Expected: Budget is moved from available to locked
 */
export async function testCampaignBudgetLock(): Promise<void> {
  console.log('Running: testCampaignBudgetLock');

  const testUser = await db.user.create({
    data: {
      email: `test-lock-${Date.now()}@example.com`,
      name: 'Test Lock User',
      roles: 'USER,ADVERTISER',
    },
  });

  try {
    // Create wallet with funds
    await depositToWallet({
      userId: testUser.id,
      amountCents: 100000, // €1,000
    });

    // Create campaign
    const campaign = await db.campaign.create({
      data: {
        advertiserId: testUser.id,
        title: 'Test Campaign',
        landingUrl: 'https://example.com',
        totalBudgetCents: 50000,
        cpmCents: 1000, // €1 per 1000 views = €0.001 per view
        status: CampaignStatus.DRAFT,
      },
    });

    // Test: Lock budget
    const lockResult = await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: testUser.id,
      amountCents: 50000, // €500
    });

    assert(lockResult.success, 'Budget lock should succeed');
    assertEqual(lockResult.lockedCents, 50000, 'Should lock €500');
    assertEqual(lockResult.newAvailableCents, 50000, 'Available should be €500');

    // Test: Verify budget lock exists
    const budgetInfo = await computeCampaignBudget(campaign.id);
    assertEqual(budgetInfo.lockedCents, 50000, 'Budget info should show €500 locked');
    assertEqual(budgetInfo.remainingCents, 50000, 'Remaining should be €500');

    console.log('✅ testCampaignBudgetLock passed');
  } finally {
    await db.campaignBudgetLock.deleteMany({});
    await db.campaign.deleteMany({ where: { advertiser: { id: testUser.id } } });
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: testUser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  }
}

/**
 * Test Suite 4: View Payout Flow
 * 
 * Scenario: Valid view triggers payout
 * Expected: Creator receives payout, campaign budget decreases
 */
export async function testViewPayoutFlow(): Promise<void> {
  console.log('Running: testViewPayoutFlow');

  // Create advertiser
  const advertiser = await db.user.create({
    data: {
      email: `test-adv-payout-${Date.now()}@example.com`,
      name: 'Test Advertiser',
      roles: 'USER,ADVERTISER',
    },
  });

  // Create creator
  const creator = await db.user.create({
    data: {
      email: `test-creator-payout-${Date.now()}@example.com`,
      name: 'Test Creator',
      roles: 'USER,CREATOR',
    },
  });

  try {
    // Fund advertiser
    await depositToWallet({
      userId: advertiser.id,
      amountCents: 100000, // €1,000
    });

    // Create campaign with CPM = €10 (1000 cents)
    // Payout per view = 1000 / 1000 = 1 cent
    const campaign = await db.campaign.create({
      data: {
        advertiserId: advertiser.id,
        title: 'Test Payout Campaign',
        landingUrl: 'https://example.com',
        totalBudgetCents: 50000,
        cpmCents: 1000, // €10 CPM = 1 cent per view
        status: CampaignStatus.ACTIVE,
      },
    });

    // Lock budget
    await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      amountCents: 50000,
    });

    // Create tracking link
    const trackingLink = await db.creatorTrackingLink.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        slug: `test-payout-${Date.now()}`,
      },
    });

    // Create valid visit event
    const visitEvent = await db.visitEvent.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        linkId: trackingLink.id,
        visitorId: 'test-visitor-1',
        isBillable: true,
        isPaid: false,
      },
    });

    // Test: Record payout
    const payoutResult = await recordValidViewPayout({
      campaignId: campaign.id,
      creatorId: creator.id,
      visitEventId: visitEvent.id,
    });

    assert(payoutResult.success, 'Payout should succeed');
    assertEqual(payoutResult.payoutCents, 1, 'Payout should be 1 cent');
    assertEqual(payoutResult.platformFeeCents, 0, 'Platform fee on 1 cent is 0 (rounded)');
    assertEqual(payoutResult.netPayoutCents, 1, 'Net payout should be 1 cent');

    // Test: Creator balance updated
    const creatorBalance = await getCreatorBalance(creator.id);
    assertEqual(creatorBalance.availableCents, 1, 'Creator should have 1 cent');
    assertEqual(creatorBalance.totalEarnedCents, 1, 'Total earned should be 1 cent');

    // Test: Budget decreased
    const budgetInfo = await computeCampaignBudget(campaign.id);
    assertEqual(budgetInfo.spentCents, 1, 'Spent should be 1 cent');
    assertEqual(budgetInfo.remainingCents, 49999, 'Remaining should be €499.99');

    // Test: Visit marked as paid
    const paidVisit = await db.visitEvent.findUnique({
      where: { id: visitEvent.id },
    });
    assert(paidVisit?.isPaid === true, 'Visit should be marked as paid');

    console.log('✅ testViewPayoutFlow passed');
  } finally {
    await db.visitEvent.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorTrackingLink.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerEntry.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorBalance.deleteMany({ where: { creatorId: creator.id } });
    await db.campaignBudgetLock.deleteMany({});
    await db.campaign.deleteMany({ where: { advertiserId: advertiser.id } });
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: advertiser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: advertiser.id } });
    await db.user.delete({ where: { id: advertiser.id } });
    await db.user.delete({ where: { id: creator.id } });
  }
}

/**
 * Test Suite 5: Double Payout Prevention
 * 
 * Scenario: Same visit event is paid twice
 * Expected: Second payout fails with EVENT_ALREADY_PAID
 */
export async function testDoublePayoutPrevention(): Promise<void> {
  console.log('Running: testDoublePayoutPrevention');

  const advertiser = await db.user.create({
    data: {
      email: `test-adv-double-${Date.now()}@example.com`,
      name: 'Test Advertiser',
      roles: 'USER,ADVERTISER',
    },
  });

  const creator = await db.user.create({
    data: {
      email: `test-creator-double-${Date.now()}@example.com`,
      name: 'Test Creator',
      roles: 'USER,CREATOR',
    },
  });

  try {
    // Setup
    await depositToWallet({ userId: advertiser.id, amountCents: 100000 });
    
    const campaign = await db.campaign.create({
      data: {
        advertiserId: advertiser.id,
        title: 'Double Payout Test',
        landingUrl: 'https://example.com',
        totalBudgetCents: 50000,
        cpmCents: 1000,
        status: CampaignStatus.ACTIVE,
      },
    });

    await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      amountCents: 50000,
    });

    const trackingLink = await db.creatorTrackingLink.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        slug: `test-double-${Date.now()}`,
      },
    });

    const visitEvent = await db.visitEvent.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        linkId: trackingLink.id,
        visitorId: 'test-visitor-double',
        isBillable: true,
        isPaid: false,
      },
    });

    // First payout
    const firstPayout = await recordValidViewPayout({
      campaignId: campaign.id,
      creatorId: creator.id,
      visitEventId: visitEvent.id,
    });
    assert(firstPayout.success, 'First payout should succeed');

    // Second payout (should fail)
    const secondPayout = await recordValidViewPayout({
      campaignId: campaign.id,
      creatorId: creator.id,
      visitEventId: visitEvent.id,
    });

    assert(!secondPayout.success, 'Second payout should fail');
    assertEqual(
      secondPayout.error,
      FinanceErrorCodes.EVENT_ALREADY_PAID,
      'Should have already paid error'
    );

    // Verify creator only got paid once
    const creatorBalance = await getCreatorBalance(creator.id);
    assertEqual(creatorBalance.availableCents, 1, 'Creator should only have 1 cent');

    console.log('✅ testDoublePayoutPrevention passed');
  } finally {
    await db.visitEvent.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorTrackingLink.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerEntry.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorBalance.deleteMany({ where: { creatorId: creator.id } });
    await db.campaignBudgetLock.deleteMany({});
    await db.campaign.deleteMany({ where: { advertiserId: advertiser.id } });
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: advertiser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: advertiser.id } });
    await db.user.delete({ where: { id: advertiser.id } });
    await db.user.delete({ where: { id: creator.id } });
  }
}

/**
 * Test Suite 6: Insufficient Budget Stops Payout
 * 
 * Scenario: Campaign has no remaining budget
 * Expected: Payout fails with INSUFFICIENT_BUDGET
 */
export async function testInsufficientBudgetStopsPayout(): Promise<void> {
  console.log('Running: testInsufficientBudgetStopsPayout');

  const advertiser = await db.user.create({
    data: {
      email: `test-adv-budget-${Date.now()}@example.com`,
      name: 'Test Advertiser',
      roles: 'USER,ADVERTISER',
    },
  });

  const creator = await db.user.create({
    data: {
      email: `test-creator-budget-${Date.now()}@example.com`,
      name: 'Test Creator',
      roles: 'USER,CREATOR',
    },
  });

  try {
    await depositToWallet({ userId: advertiser.id, amountCents: 100 });
    
    // Create campaign with tiny budget
    const campaign = await db.campaign.create({
      data: {
        advertiserId: advertiser.id,
        title: 'Low Budget Test',
        landingUrl: 'https://example.com',
        totalBudgetCents: 1, // 1 cent total
        cpmCents: 1000, // 1 cent per view
        status: CampaignStatus.ACTIVE,
      },
    });

    await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      amountCents: 1, // Lock 1 cent
    });

    const trackingLink = await db.creatorTrackingLink.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        slug: `test-budget-${Date.now()}`,
      },
    });

    // Create first visit
    const visit1 = await db.visitEvent.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        linkId: trackingLink.id,
        visitorId: 'test-visitor-1',
        isBillable: true,
        isPaid: false,
      },
    });

    // First payout should succeed
    const payout1 = await recordValidViewPayout({
      campaignId: campaign.id,
      creatorId: creator.id,
      visitEventId: visit1.id,
    });
    assert(payout1.success, 'First payout should succeed');

    // Create second visit
    const visit2 = await db.visitEvent.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        linkId: trackingLink.id,
        visitorId: 'test-visitor-2',
        isBillable: true,
        isPaid: false,
      },
    });

    // Second payout should fail (no budget)
    const payout2 = await recordValidViewPayout({
      campaignId: campaign.id,
      creatorId: creator.id,
      visitEventId: visit2.id,
    });

    assert(!payout2.success, 'Second payout should fail');
    assertEqual(
      payout2.error,
      FinanceErrorCodes.INSUFFICIENT_BUDGET,
      'Should have insufficient budget error'
    );

    console.log('✅ testInsufficientBudgetStopsPayout passed');
  } finally {
    await db.visitEvent.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorTrackingLink.deleteMany({ where: { creatorId: creator.id } });
    await db.ledgerEntry.deleteMany({ where: { creatorId: creator.id } });
    await db.creatorBalance.deleteMany({ where: { creatorId: creator.id } });
    await db.campaignBudgetLock.deleteMany({});
    await db.campaign.deleteMany({ where: { advertiserId: advertiser.id } });
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: advertiser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: advertiser.id } });
    await db.user.delete({ where: { id: advertiser.id } });
    await db.user.delete({ where: { id: creator.id } });
  }
}

/**
 * Test Suite 7: Release Budget
 * 
 * Scenario: Campaign is cancelled, budget is released
 * Expected: Funds return to advertiser's wallet
 */
export async function testReleaseBudget(): Promise<void> {
  console.log('Running: testReleaseBudget');

  const advertiser = await db.user.create({
    data: {
      email: `test-adv-release-${Date.now()}@example.com`,
      name: 'Test Advertiser',
      roles: 'USER,ADVERTISER',
    },
  });

  try {
    await depositToWallet({ userId: advertiser.id, amountCents: 100000 });
    
    const campaign = await db.campaign.create({
      data: {
        advertiserId: advertiser.id,
        title: 'Release Test',
        landingUrl: 'https://example.com',
        totalBudgetCents: 50000,
        cpmCents: 1000,
        status: CampaignStatus.ACTIVE,
      },
    });

    await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      amountCents: 50000,
    });

    // Verify locked
    const walletBefore = await getWalletByUserId(advertiser.id);
    assertEqual(walletBefore.availableCents, 50000, 'Available should be €500 after lock');

    // Release budget
    const releaseResult = await releaseCampaignBudget({
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      reason: 'CAMPAIGN_CANCELLED',
    });

    assert(releaseResult.success, 'Release should succeed');
    assertEqual(releaseResult.releasedCents, 50000, 'Should release €500');
    assertEqual(releaseResult.newAvailableCents, 100000, 'Available should be back to €1,000');

    console.log('✅ testReleaseBudget passed');
  } finally {
    await db.campaignBudgetLock.deleteMany({});
    await db.campaign.deleteMany({ where: { advertiserId: advertiser.id } });
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerUserId: advertiser.id } } });
    await db.wallet.deleteMany({ where: { ownerUserId: advertiser.id } });
    await db.user.delete({ where: { id: advertiser.id } });
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

/**
 * Run all test suites
 * Usage: Call this function from a script or API endpoint
 */
export async function runAllFinanceTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  console.log('\n🧪 Running Finance Service Tests...\n');

  const tests = [
    { name: 'Wallet Creation and Deposit', fn: testWalletCreationAndDeposit },
    { name: 'Withdrawal Insufficient Funds', fn: testWithdrawalInsufficientFunds },
    { name: 'Campaign Budget Lock', fn: testCampaignBudgetLock },
    { name: 'View Payout Flow', fn: testViewPayoutFlow },
    { name: 'Double Payout Prevention', fn: testDoublePayoutPrevention },
    { name: 'Insufficient Budget Stops Payout', fn: testInsufficientBudgetStopsPayout },
    { name: 'Release Budget', fn: testReleaseBudget },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
    console.log(`${result.passed ? '✅' : '❌'} ${test.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  return { passed, failed, results };
}

// ============================================
// INTEGRATION NOTES
// ============================================

/**
 * How to integrate with tracking endpoint:
 * 
 * 1. In the tracking API route (e.g., /api/track/[slug]/route.ts):
 * 
 *    After validating a visit event:
 *    
 *    // Validate the visit
 *    const visitEvent = await validateVisitEvent(visitData);
 *    
 *    // If valid and not already paid, trigger payout
 *    if (visitEvent.isValid && !visitEvent.isPaid) {
 *      const payoutResult = await recordValidViewPayout({
 *        campaignId: visitEvent.campaignId,
 *        creatorId: visitEvent.creatorId,
 *        visitEventId: visitEvent.id,
 *      });
 *      
 *      if (!payoutResult.success) {
 *        // Log the error but don't fail the tracking
 *        console.warn('Payout failed:', payoutResult.error);
 *      }
 *    }
 * 
 * 2. The payout is atomic:
 *    - Creates ledger entries
 *    - Updates creator balance
 *    - Marks visit as paid
 *    - All in a single transaction
 * 
 * 3. Idempotency is guaranteed:
 *    - Unique constraint on (campaignId, creatorId, refEventId)
 *    - isPaid flag on VisitEvent
 *    - Double-payout attempts return EVENT_ALREADY_PAID error
 */
