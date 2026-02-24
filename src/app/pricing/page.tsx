'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Percent, Shield, Wallet, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/translations';

export default function PricingPage() {
  const { t, language } = useLanguage();
  
  const isRTL = language === 'ar';

  const features = [
    t('pricing.securePayments'),
    t('pricing.fraudPrevention'),
    t('pricing.analytics'),
    t('pricing.campaignTools'),
    t('pricing.creatorVerification'),
    t('pricing.support'),
    t('pricing.payouts'),
    t('pricing.tracking'),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6ed] via-white to-[#fffdf9]">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
            {t('pricing.backToHome')}
          </Button>
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-[#F47A1F] text-sm mb-6">
            <Percent className="w-4 h-4" />
            <span>{t('nav.pricing')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-[#F47A1F] to-orange-500 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{t('pricing.platformFee')}</h2>
                <p className="text-orange-100">{t('pricing.perTransaction')}</p>
              </div>
              <div className="text-5xl font-bold text-white">5%</div>
            </div>
          </div>

          <div className="p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('pricing.whatMeans')}</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('pricing.forAdvertisers')}</h4>
                  <p className="text-gray-600">
                    {t('pricing.advertisersDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('pricing.forCreators')}</h4>
                  <p className="text-gray-600">
                    {t('pricing.creatorsDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t('pricing.example')}</h4>
                  <p className="text-gray-600">
                    {t('pricing.exampleDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('pricing.whatsIncluded')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">{t('pricing.getStarted')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/campaigns">
              <Button size="lg" className="bg-[#F47A1F] hover:bg-[#F06423]">
                {t('pricing.browseCampaigns')}
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="border-[#F47A1F] text-[#F47A1F] hover:bg-orange-50">
                {t('pricing.createAccount')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
