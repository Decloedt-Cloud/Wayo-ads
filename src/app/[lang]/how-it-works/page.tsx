'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../../translations';
import {
  ArrowRight,
  Search,
  MessageSquare,
  Play,
  TrendingUp,
  Wallet,
  Shield,
  CheckCircle,
  Star,
  Users,
  Globe,
  Target,
  Rocket,
  Handshake,
  CreditCard,
} from 'lucide-react';

export default function HowItWorksPage() {
  const { t, language } = useLanguage();

  const getLocalizedPath = (path: string) => path;
  
  const isRTL = language === 'ar';

  const advertiserSteps = [
    {
      number: '01',
      title: t('howItWorks.advertisers.step1.title'),
      description: t('howItWorks.advertisers.step1.desc'),
      icon: Rocket,
      color: 'from-orange-500 to-red-500',
    },
    {
      number: '02',
      title: t('howItWorks.advertisers.step2.title'),
      description: t('howItWorks.advertisers.step2.desc'),
      icon: Search,
      color: 'from-amber-500 to-orange-600',
    },
    {
      number: '03',
      title: t('howItWorks.advertisers.step3.title'),
      description: t('howItWorks.advertisers.step3.desc'),
      icon: MessageSquare,
      color: 'from-orange-400 to-amber-500',
    },
    {
      number: '04',
      title: t('howItWorks.advertisers.step4.title'),
      description: t('howItWorks.advertisers.step4.desc'),
      icon: TrendingUp,
      color: 'from-red-500 to-orange-600',
    },
  ];

  const creatorSteps = [
    {
      number: '01',
      title: t('howItWorks.creators.step1.title'),
      description: t('howItWorks.creators.step1.desc'),
      icon: Users,
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '02',
      title: t('howItWorks.creators.step2.title'),
      description: t('howItWorks.creators.step2.desc'),
      icon: Search,
      color: 'from-violet-500 to-purple-600',
    },
    {
      number: '03',
      title: t('howItWorks.creators.step3.title'),
      description: t('howItWorks.creators.step3.desc'),
      icon: Handshake,
      color: 'from-fuchsia-500 to-pink-600',
    },
    {
      number: '04',
      title: t('howItWorks.creators.step4.title'),
      description: t('howItWorks.creators.step4.desc'),
      icon: Wallet,
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  const trustFeatures = [
    {
      title: t('howItWorks.trust.verified.title'),
      description: t('howItWorks.trust.verified.desc'),
      icon: Shield,
      stat: t('howItWorks.trust.verified.stat'),
      statLabel: t('howItWorks.trust.verified.title'),
    },
    {
      title: t('howItWorks.trust.realViews.title'),
      description: t('howItWorks.trust.realViews.desc'),
      icon: Target,
      stat: t('howItWorks.trust.realViews.stat'),
      statLabel: 'Fraud Block Rate',
    },
    {
      title: t('howItWorks.trust.payments.title'),
      description: t('howItWorks.trust.payments.desc'),
      icon: CreditCard,
      stat: t('howItWorks.trust.payments.stat'),
      statLabel: 'Paid to Creators',
    },
  ];

  const happyFlowSteps = [
    t('howItWorks.happyFlow.1'),
    t('howItWorks.happyFlow.2'),
    t('howItWorks.happyFlow.3'),
    t('howItWorks.happyFlow.4'),
    t('howItWorks.happyFlow.5'),
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmNjc5M2IiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-50"></div>
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-orange-700 mb-6 shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              {t('howItWorks.hero.tagline')}
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t('howItWorks.hero.title')}
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('howItWorks.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-orange-500/25">
                <Link href={getLocalizedPath('/auth/signup')}>
                  {t('howItWorks.hero.cta1')}
                  <ArrowRight className={`ml-2 w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg rounded-full border-orange-200 hover:bg-orange-50">
                <Link href={getLocalizedPath('/campaigns')}>
                  {t('howItWorks.hero.cta2')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Happy Flow Banner */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-3xl p-8 lg:p-12 shadow-xl shadow-orange-500/20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                  {t('howItWorks.happyFlow.title')}
                </h2>
                <div className="space-y-4">
                  {happyFlowSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-white/90 font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t('howItWorks.happyFlow.profileCreated')}</p>
                        <p className="text-sm text-gray-500">2 {language === 'fr' ? 'minutes ago' : language === 'ar' ? 'منذ دقيقتين' : 'minutes ago'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Search className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t('howItWorks.happyFlow.campaignMatch')}</p>
                        <p className="text-sm text-gray-500">1 {language === 'fr' ? 'minute ago' : language === 'ar' ? 'منذ دقيقة' : 'minute ago'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border-2 border-green-500">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Handshake className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t('howItWorks.happyFlow.collaboration')}</p>
                        <p className="text-sm text-green-600 font-medium">{t('howItWorks.happyFlow.justNow')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Advertisers */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              {t('howItWorks.advertisers.label')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {t('howItWorks.advertisers.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('howItWorks.advertisers.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {advertiserSteps.map((step, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-orange-500 font-bold text-sm mb-2">{step.number}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Creators */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              {t('howItWorks.creators.label')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {t('howItWorks.creators.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('howItWorks.creators.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {creatorSteps.map((step, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-gray-50 to-white p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-purple-500 font-bold text-sm mb-2">{step.number}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Stats */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              {t('howItWorks.trust.title')}
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('howItWorks.trust.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {trustFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 text-center border border-white/10 hover:border-orange-500/50 transition-colors"
              >
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">{feature.stat}</div>
                <div className="text-orange-400 font-medium mb-4">{feature.statLabel}</div>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-orange-500 to-amber-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZzwvc3ZnPg==')]"></div>
        
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            {t('howItWorks.cta.title')}
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            {t('howItWorks.cta.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-xl">
              <Link href={getLocalizedPath('/auth/signup')}>
                {t('howItWorks.cta.cta1')}
                <ArrowRight className={`ml-2 w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full">
              <Link href={getLocalizedPath('/campaigns')}>
                {t('howItWorks.cta.cta2')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
