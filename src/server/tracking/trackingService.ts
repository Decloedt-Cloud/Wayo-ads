import { Prisma, ConversionType } from '@prisma/client';
import { db } from '@/lib/db';
import {
  hashIP,
  hashUserAgent,
  isLikelyBot,
  getDedupeWindowStart,
  getRateLimitWindowStart,
  config,
  calculateFraudScore,
  isViewSuspicious,
  generateDeviceFingerprint,
} from '@/lib/tracking';

export interface TrackingStats {
  totalViews: number;
  validViews: number;
  billableViews: number;
  totalConversions: number;
  totalRevenue: number;
}

export interface TrackViewInput {
  campaignId: string;
  creatorId: string;
  linkId: string;
  visitorId: string;
  ip: string;
  userAgent: string;
  referrer?: string | null;
  deviceFingerprint?: {
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
  };
}

export interface TrackViewResult {
  isRecorded: boolean;
  isValidated: boolean;
  isBillable: boolean;
  visitId?: string;
  reason?: string;
  fraudScore: number;
  isSuspicious?: boolean;
  payoutCents: number;
  recordedViewsCount?: number;
  message?: string;
  pixelUrl?: string;
  processingTime?: number;
}

async function getGeoFromIp(ip: string): Promise<string | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    if (response.ok) {
      const data = await response.json();
      return data.countryCode || null;
    }
  } catch (error) {
    console.warn('Geo lookup failed:', error);
  }
  return null;
}

async function getIpVelocity(ipHash: string): Promise<number> {
  const rateLimitStart = getRateLimitWindowStart();
  return db.visitEvent.count({
    where: {
      ipHash,
      occurredAt: { gte: rateLimitStart },
    },
  });
}

async function getTotalIpCount(ipHash: string): Promise<number> {
  return db.visitEvent.count({
    where: { ipHash },
  });
}

async function checkVisitorHistory(visitorId: string): Promise<boolean> {
  const count = await db.visitEvent.count({
    where: { visitorId },
  });
  return count > 0;
}

async function checkDeviceHistory(deviceFingerprintHash: string): Promise<boolean> {
  const count = await db.visitEvent.count({
    where: { deviceFingerprintHash },
  });
  return count > 0;
}

async function createVisitEvent(data: {
  campaignId: string;
  creatorId: string;
  linkId: string;
  visitorId: string;
  ipHash: string;
  userAgentHash: string;
  referrer: string | null | undefined;
  fraudScore: number;
  geoCountry: string | null;
  isSuspicious: boolean;
  deviceFingerprintHash?: string;
  isValidated?: boolean;
  isBillable?: boolean;
}) {
  return db.visitEvent.create({
    data: {
      campaignId: data.campaignId,
      creatorId: data.creatorId,
      linkId: data.linkId,
      visitorId: data.visitorId,
      ipHash: data.ipHash,
      userAgentHash: data.userAgentHash,
      referrer: data.referrer ?? null,
      isRecorded: true,
      isValidated: data.isValidated ?? false,
      isBillable: data.isBillable ?? false,
      isPaid: false,
      fraudScore: data.fraudScore,
      geoCountry: data.geoCountry,
      isSuspicious: data.isSuspicious,
      deviceFingerprintHash: data.deviceFingerprintHash,
    },
  });
}

export async function trackView(input: TrackViewInput): Promise<TrackViewResult> {
  const startTime = Date.now();
  
  const { campaignId, creatorId, linkId, visitorId, ip, userAgent, referrer, deviceFingerprint } = input;

  const ipHash = hashIP(ip);
  const userAgentHash = hashUserAgent(userAgent);
  
  const isBot = isLikelyBot(userAgent);
  const ipVelocity = await getIpVelocity(ipHash);
  const totalIpCount = await getTotalIpCount(ipHash);
  const isNewVisitor = !(await checkVisitorHistory(visitorId));
  
  let deviceFingerprintHash: string | null = null;
  let isSameDevice = false;
  
  if (deviceFingerprint) {
    deviceFingerprintHash = generateDeviceFingerprint(
      deviceFingerprint.screenResolution || '',
      deviceFingerprint.timezone || '',
      deviceFingerprint.language || '',
      deviceFingerprint.platform || ''
    );
    isSameDevice = await checkDeviceHistory(deviceFingerprintHash);
  }

  const countryCode = await getGeoFromIp(ip);

  const fraudScore = calculateFraudScore({
    isBot,
    ipVelocity,
    ipVisitCount: totalIpCount,
    userAgent,
    referrer: referrer ?? null,
    isNewVisitor,
    countryCode,
    isKnownVpn: false,
    isDataCenter: false,
    isSameDevice,
  });

  const isSuspicious = isViewSuspicious(fraudScore);

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      status: true,
      payoutMode: true,
      fraudScoreThreshold: true,
    },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    await createVisitEvent({
      campaignId,
      creatorId,
      linkId,
      visitorId,
      ipHash,
      userAgentHash,
      referrer: referrer || null,
      fraudScore,
      geoCountry: countryCode,
      isSuspicious,
      deviceFingerprintHash: deviceFingerprintHash || undefined,
      isValidated: false,
      isBillable: false,
    });
    
    return {
      isRecorded: true,
      isValidated: false,
      isBillable: false,
      reason: campaign ? 'campaign_inactive' : 'campaign_not_found',
      fraudScore,
      isSuspicious,
      payoutCents: 0,
    };
  }

  const fraudThreshold = campaign.fraudScoreThreshold || 50;
  const passesFraudCheck = fraudScore < fraudThreshold;

  if (isBot || !passesFraudCheck) {
    await createVisitEvent({
      campaignId,
      creatorId,
      linkId,
      visitorId,
      ipHash,
      userAgentHash,
      referrer: referrer || null,
      fraudScore,
      geoCountry: countryCode,
      isSuspicious,
      deviceFingerprintHash: deviceFingerprintHash || undefined,
      isValidated: false,
      isBillable: false,
    });

    const reason = isBot ? 'bot_detected' : 'fraud_score_exceeded';
    
    return {
      isRecorded: true,
      isValidated: false,
      isBillable: false,
      reason,
      fraudScore,
      isSuspicious,
      payoutCents: 0,
    };
  }

  const dedupeStart = getDedupeWindowStart();
  const recentVisit = await db.visitEvent.findFirst({
    where: {
      campaignId,
      creatorId,
      visitorId,
      occurredAt: { gte: dedupeStart },
      isRecorded: true,
    },
  });

  if (recentVisit) {
    await createVisitEvent({
      campaignId,
      creatorId,
      linkId,
      visitorId,
      ipHash,
      userAgentHash,
      referrer: referrer || null,
      fraudScore,
      geoCountry: countryCode,
      isSuspicious,
      deviceFingerprintHash: deviceFingerprintHash || undefined,
      isValidated: false,
      isBillable: false,
    });
    
    return {
      isRecorded: true,
      isValidated: false,
      isBillable: false,
      reason: 'duplicate',
      fraudScore,
      payoutCents: 0,
    };
  }

  const ipVisitCount = await db.visitEvent.count({
    where: { ipHash, occurredAt: { gte: getRateLimitWindowStart() } },
  });

  if (ipVisitCount >= config.ipRateLimitPerHour) {
    await createVisitEvent({
      campaignId,
      creatorId,
      linkId,
      visitorId,
      ipHash,
      userAgentHash,
      referrer: referrer || null,
      fraudScore,
      geoCountry: countryCode,
      isSuspicious,
      deviceFingerprintHash: deviceFingerprintHash || undefined,
      isValidated: false,
      isBillable: false,
    });
    
    return {
      isRecorded: true,
      isValidated: false,
      isBillable: false,
      reason: 'rate_limited',
      fraudScore,
      payoutCents: 0,
    };
  }

  const visitEvent = await createVisitEvent({
    campaignId,
    creatorId,
    linkId,
    visitorId,
    ipHash,
    userAgentHash,
    referrer: referrer || null,
    fraudScore,
    geoCountry: countryCode,
    isSuspicious,
    deviceFingerprintHash: deviceFingerprintHash || undefined,
    isValidated: false,
    isBillable: false,
  });

  const recordedViewsCount = await db.visitEvent.count({
    where: { campaignId, isRecorded: true },
  });

  const processingTime = Date.now() - startTime;

  return {
    isRecorded: true,
    isValidated: false,
    isBillable: false,
    visitId: visitEvent.id,
    fraudScore,
    recordedViewsCount,
    message: 'View recorded. Validation required via pixel.',
    pixelUrl: `/api/track/pixel?visitId=${visitEvent.id}`,
    payoutCents: 0,
    processingTime,
  };
}

export interface TrackingStats {
  totalViews: number;
  validViews: number;
  billableViews: number;
  totalConversions: number;
  totalRevenue: number;
}

export async function getCampaignTrackingStats(campaignId: string): Promise<TrackingStats> {
  const [views, validViews, billableViews, conversions, revenue] = await Promise.all([
    db.visitEvent.count({ where: { campaignId } }),
    db.visitEvent.count({ where: { campaignId, isValidated: true } }),
    db.visitEvent.count({ where: { campaignId, isBillable: true } }),
    db.conversionEvent.count({ where: { campaignId } }),
    db.conversionEvent.aggregate({
      where: { campaignId },
      _sum: { revenueCents: true },
    }),
  ]);

  return {
    totalViews: views,
    validViews,
    billableViews,
    totalConversions: conversions,
    totalRevenue: revenue._sum.revenueCents || 0,
  };
}

export async function getCreatorTrackingStats(creatorId: string): Promise<TrackingStats> {
  const [views, validViews, billableViews, conversions, revenue] = await Promise.all([
    db.visitEvent.count({ where: { creatorId } }),
    db.visitEvent.count({ where: { creatorId, isValidated: true } }),
    db.visitEvent.count({ where: { creatorId, isBillable: true } }),
    db.conversionEvent.count({ where: { creatorId } }),
    db.conversionEvent.aggregate({
      where: { creatorId },
      _sum: { revenueCents: true },
    }),
  ]);

  return {
    totalViews: views,
    validViews,
    billableViews,
    totalConversions: conversions,
    totalRevenue: revenue._sum.revenueCents || 0,
  };
}

export async function getTrackingLinkBySlug(slug: string) {
  return db.creatorTrackingLink.findUnique({
    where: { slug },
    include: {
      campaign: true,
      creator: true,
    },
  });
}

export async function recordVisit(params: {
  campaignId: string;
  creatorId: string;
  linkId: string;
  visitorId: string;
  referrer?: string;
  ipHash?: string;
  userAgentHash?: string;
}) {
  return db.visitEvent.create({
    data: {
      campaignId: params.campaignId,
      creatorId: params.creatorId,
      linkId: params.linkId,
      visitorId: params.visitorId,
      referrer: params.referrer,
      ipHash: params.ipHash,
      userAgentHash: params.userAgentHash,
      isRecorded: true,
      isValidated: false,
      isBillable: false,
      isPaid: false,
    },
  });
}

export async function recordConversion(params: {
  campaignId: string;
  creatorId?: string;
  visitorId: string;
  type: ConversionType;
  revenueCents?: number;
  attributedTo?: string;
}) {
  return db.conversionEvent.create({
    data: {
      campaignId: params.campaignId,
      creatorId: params.creatorId,
      visitorId: params.visitorId,
      type: params.type,
      revenueCents: params.revenueCents || 0,
      attributedTo: params.attributedTo,
    },
  });
}

export async function validateVisit(visitId: string, fraudScore: number, geoCountry?: string) {
  const isSuspicious = fraudScore > 50;
  const isBillable = fraudScore < 50;

  return db.visitEvent.update({
    where: { id: visitId },
    data: {
      isValidated: true,
      validatedAt: new Date(),
      fraudScore,
      geoCountry,
      isSuspicious,
      isBillable,
    },
  });
}

export async function markVisitAsPaid(visitId: string) {
  return db.visitEvent.update({
    where: { id: visitId },
    data: { isPaid: true },
  });
}

export interface DebugOverviewResult {
  overview: {
    totalViews: number;
    validViews: number;
    invalidViews: number;
    totalConversions: number;
    suspiciousViews: number;
    activeCampaigns: number;
    avgFraudScore: number;
    fraudDistribution: Array<{ fraudScore: number; count: number }>;
  };
  lifecycle: {
    totalRecorded: number;
    totalValidated: number;
    totalBillable: number;
    totalPaid: number;
    validationRate: number;
    fraudBlockRate: number;
  };
  config: {
    viewDedupeMinutes: number;
    ipRateLimitPerHour: number;
    attributionWindowDays: number;
    conversionCommissionRate: number;
  };
}

export async function getDebugOverview(): Promise<DebugOverviewResult> {
  const [
    totalViews,
    validViews,
    invalidViews,
    totalConversions,
    suspiciousViews,
    campaigns,
    totalRecorded,
    totalValidated,
    totalBillable,
    totalPaid,
  ] = await Promise.all([
    db.visitEvent.count(),
    db.visitEvent.count({ where: { isValidated: true } }),
    db.visitEvent.count({ where: { isValidated: false } }),
    db.conversionEvent.count(),
    db.visitEvent.count({ where: { isSuspicious: true } }),
    db.campaign.count({ where: { status: 'ACTIVE' } }),
    db.visitEvent.count({ where: { isRecorded: true } }),
    db.visitEvent.count({ where: { isValidated: true } }),
    db.visitEvent.count({ where: { isBillable: true } }),
    db.visitEvent.count({ where: { isPaid: true } }),
  ]);

  const fraudDistribution = await db.visitEvent.groupBy({
    by: ['fraudScore'],
    _count: true,
    where: { isValidated: true },
  });

  const avgFraudScore = await db.visitEvent.aggregate({
    _avg: { fraudScore: true },
    where: { isValidated: true },
  });

  const validationRate = totalRecorded > 0 
    ? Math.round((totalValidated / totalRecorded) * 100 * 10) / 10 
    : 0;
  
  const fraudBlockRate = totalRecorded > 0 
    ? Math.round((suspiciousViews / totalRecorded) * 100 * 10) / 10 
    : 0;

  return {
    overview: {
      totalViews,
      validViews,
      invalidViews,
      totalConversions,
      suspiciousViews,
      activeCampaigns: campaigns,
      avgFraudScore: avgFraudScore._avg.fraudScore || 0,
      fraudDistribution: fraudDistribution.slice(0, 10).map(d => ({ fraudScore: d.fraudScore, count: d._count })),
    },
    lifecycle: {
      totalRecorded,
      totalValidated,
      totalBillable,
      totalPaid,
      validationRate,
      fraudBlockRate,
    },
    config: {
      viewDedupeMinutes: config.viewDedupeMinutes,
      ipRateLimitPerHour: config.ipRateLimitPerHour,
      attributionWindowDays: config.attributionWindowDays,
      conversionCommissionRate: config.conversionCommissionRate,
    },
  };
}

export interface DebugView {
  id: string;
  campaignId: string;
  creatorId: string;
  visitorId: string;
  isValidated: boolean;
  isPaid: boolean;
  validationMethod: string | null;
  fraudScore: number;
  isSuspicious: boolean;
  geoCountry: string | null;
  occurredAt: Date;
}

export async function getDebugViews(limit: number = 50, offset: number = 0): Promise<DebugView[]> {
  return db.visitEvent.findMany({
    take: limit,
    skip: offset,
    orderBy: { occurredAt: 'desc' },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      visitorId: true,
      isValidated: true,
      isPaid: true,
      validationMethod: true,
      fraudScore: true,
      isSuspicious: true,
      geoCountry: true,
      occurredAt: true,
    },
  }) as Promise<DebugView[]>;
}

export interface DebugConversion {
  id: string;
  campaignId: string;
  creatorId: string | null;
  visitorId: string;
  type: string;
  revenueCents: number;
  attributedTo: string | null;
  occurredAt: Date;
}

export async function getDebugConversions(limit: number = 50, offset: number = 0): Promise<DebugConversion[]> {
  return db.conversionEvent.findMany({
    take: limit,
    skip: offset,
    orderBy: { occurredAt: 'desc' },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      visitorId: true,
      type: true,
      revenueCents: true,
      attributedTo: true,
      occurredAt: true,
    },
  }) as Promise<DebugConversion[]>;
}

export interface DebugCampaignBudget {
  id: string;
  title: string;
  totalBudgetCents: number;
  spentBudgetCents: number;
  payoutMode: string | null;
  fraudScoreThreshold: number | null;
}

export async function getDebugCampaignBudgets(): Promise<DebugCampaignBudget[]> {
  return db.campaign.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      totalBudgetCents: true,
      spentBudgetCents: true,
      payoutMode: true,
      fraudScoreThreshold: true,
    },
  }) as Promise<DebugCampaignBudget[]>;
}

export async function getDebugCampaignBudget(campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      totalBudgetCents: true,
      spentBudgetCents: true,
      payoutMode: true,
      fraudScoreThreshold: true,
    },
  });

  if (!campaign) return null;

  const ledgerSpent = await db.ledgerEntry.aggregate({
    where: { 
      campaignId,
      type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] },
    },
    _sum: { amountCents: true },
  });

  const validViews = await db.visitEvent.count({
    where: { campaignId, isValidated: true, isPaid: true },
  });

  const totalViews = await db.visitEvent.count({
    where: { campaignId, isValidated: true },
  });

  return {
    campaign,
    ledgerSpent: ledgerSpent._sum.amountCents || 0,
    validViews,
    totalViews,
  };
}

export interface FraudTestResult {
  testInput: { userAgent: string; ipVelocity: number };
  fraudScore: number;
  isSuspicious: boolean;
}

export async function runFraudTest(userAgent: string = 'Mozilla/5.0', ipVelocity: number = 1): Promise<FraudTestResult> {
  const testResult = calculateFraudScore({
    isBot: false,
    ipVelocity,
    ipVisitCount: ipVelocity * 5,
    userAgent,
    referrer: 'https://google.com',
    isNewVisitor: false,
    countryCode: 'US',
    isKnownVpn: false,
    isDataCenter: false,
    isSameDevice: false,
  });

  return {
    testInput: { userAgent, ipVelocity },
    fraudScore: testResult,
    isSuspicious: testResult >= 50,
  };
}

export interface CreatorRiskSummary {
  totalCreators: number;
  flaggedCreators: number;
  creators: Array<{
    creatorId: string;
    anomalyScore: number;
    flagged: boolean;
    flagReasons: string | null;
    totalRecorded: number;
    totalValidated: number;
    validationRate: number;
    avgFraudScore: number;
    date: Date;
  }>;
  dailyStats: Array<{
    date: Date;
    totalCreators: number;
    totalRecorded: number;
    totalValidated: number;
    avgAnomalyScore: number;
  }>;
}

export async function getDebugCreatorRiskSummary(): Promise<CreatorRiskSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const allCreators = await db.creatorTrafficMetrics.findMany({
    where: {
      date: { gte: sevenDaysAgo },
    },
    select: {
      creatorId: true,
      anomalyScore: true,
      flagged: true,
      flagReasons: true,
      totalRecorded: true,
      totalValidated: true,
      validationRate: true,
      avgFraudScore: true,
      date: true,
    },
    orderBy: { date: 'desc' },
    take: 100,
  });

  const creatorSummary = new Map();
  for (const m of allCreators) {
    const existing = creatorSummary.get(m.creatorId);
    if (!existing || m.date > existing.date) {
      creatorSummary.set(m.creatorId, m);
    }
  }

  const flaggedCreators = Array.from(creatorSummary.values()).filter(c => c.flagged);

  const dailyStats = await db.creatorTrafficMetrics.groupBy({
    by: ['date'],
    where: {
      date: { gte: sevenDaysAgo },
    },
    _count: { creatorId: true },
    _sum: {
      totalRecorded: true,
      totalValidated: true,
      anomalyScore: true,
    },
    orderBy: { date: 'asc' },
  });

  return {
    totalCreators: creatorSummary.size,
    flaggedCreators: flaggedCreators.length,
    creators: Array.from(creatorSummary.values()).slice(0, 20) as any,
    dailyStats: dailyStats.map(d => ({
      date: d.date,
      totalCreators: d._count.creatorId,
      totalRecorded: d._sum.totalRecorded || 0,
      totalValidated: d._sum.totalValidated || 0,
      avgAnomalyScore: d._sum.anomalyScore ? d._sum.anomalyScore / d._count.creatorId : 0,
    })),
  };
}

export async function getDebugCreatorRisk(creatorId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const last7Days = await db.creatorTrafficMetrics.findMany({
    where: {
      creatorId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
  });

  const latest = last7Days[0];
  
  const flagReasons = latest?.flagReasons 
    ? JSON.parse(latest.flagReasons) 
    : [];

  const campaignBreakdown = await db.creatorTrafficMetrics.groupBy({
    by: ['campaignId'],
    where: {
      creatorId,
      date: { gte: sevenDaysAgo },
    },
    _sum: {
      totalRecorded: true,
      totalValidated: true,
      totalBillable: true,
    },
    _avg: {
      anomalyScore: true,
      validationRate: true,
      avgFraudScore: true,
    },
  });

  return {
    creatorId,
    last7Days: last7Days.map(m => ({
      date: m.date,
      totalRecorded: m.totalRecorded,
      totalValidated: m.totalValidated,
      validationRate: m.validationRate,
      conversionRate: m.conversionRate,
      avgFraudScore: m.avgFraudScore,
      anomalyScore: m.anomalyScore,
      flagged: m.flagged,
    })),
    current: latest ? {
      anomalyScore: latest.anomalyScore,
      flagged: latest.flagged,
      flagReasons: flagReasons,
      validationRate: latest.validationRate,
      avgFraudScore: latest.avgFraudScore,
      geoDiversityScore: latest.geoDiversityScore,
      uniqueIPs: latest.uniqueIPs,
      uniqueFingerprints: latest.uniqueFingerprints,
      spikePercent: latest.spikePercent,
    } : null,
    campaignBreakdown: campaignBreakdown.map(c => ({
      campaignId: c.campaignId,
      totalRecorded: c._sum.totalRecorded || 0,
      totalValidated: c._sum.totalValidated || 0,
      totalBillable: c._sum.totalBillable || 0,
      avgAnomalyScore: c._avg.anomalyScore || 0,
      avgValidationRate: c._avg.validationRate || 0,
      avgFraudScore: c._avg.avgFraudScore || 0,
    })),
  };
}
