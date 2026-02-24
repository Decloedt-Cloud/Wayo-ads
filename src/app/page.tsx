'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from './translations';
import { FeaturedCreators } from '@/components/sections/FeaturedCreators';
import { BrandResults } from '@/components/sections/BrandResults';
import Script from 'next/script';
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Shield,
  Users,
  TrendingUp,
  CheckCircle2,
  Heart,
  Sparkles,
  Globe,
  Star,
  Eye,
  MapPin,
  HandHeart,
  Calculator,
  X,
  Video,
  Brain,
  Palette,
  Check,
} from 'lucide-react';

const creators = [
  {
    title: 'Earn from Every View',
    description: 'Get paid fairly for every validated view. No minimums, no delays.',
    gradient: 'from-orange-500 to-amber-600',
    icon: DollarSign,
    tKey: 'creators.feature1',
  },
  {
    title: 'Choose Brands You Love',
    description: 'Browse campaigns and partner with brands that match your style.',
    gradient: 'from-orange-400 to-red-500',
    icon: Heart,
    tKey: 'creators.feature2',
  },
  {
    title: 'Real-Time Analytics',
    description: 'Track your earnings with transparent, real-time dashboards.',
    gradient: 'from-orange-500 to-yellow-500',
    icon: BarChart3,
    tKey: 'creators.feature3',
  },
];

const brands = [
  {
    title: 'Local Creators',
    description: 'Connect with creators who have engaged followers in your target market.',
    gradient: 'from-orange-500 to-amber-600',
    icon: Users,
    tKey: 'brands.feature1',
  },
  {
    title: 'Pay for Real Views',
    description: 'Our fraud protection ensures you only pay for validated, quality views.',
    gradient: 'from-orange-500 to-amber-600',
    icon: Shield,
    tKey: 'brands.feature2',
  },
  {
    title: 'Better CPM Rates',
    description: 'Get more value than expensive agencies. Direct creator relationships.',
    gradient: 'from-orange-400 to-red-500',
    icon: TrendingUp,
    tKey: 'brands.feature3',
  },
];

const testimonials = [
  {
    quote: "I started earning within a week of joining. Finally, a platform that values small creators!",
    author: 'Sarah M.',
    role: 'Creator',
    avatar: 'S',
  },
  {
    quote: "Our campaign reached real people in our target city. The results exceeded expectations.",
    author: 'Mike R.',
    role: 'Brand Owner',
    avatar: 'M',
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const { t, language } = useLanguage();
  const userRoles = (session?.user as any)?.roles || [];

  const getLocalizedPath = (path: string) => path;

  return (
    <>
      <Script
        id="json-ld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Wayo Ads",
            "url": "https://wayoads.com",
            "logo": "https://wayoads.com/logo.png",
            "description": "The creator monetization platform where influencers earn from every view. Connect with local creators, pay for real validated views, and grow your brand.",
            "sameAs": [
              "https://twitter.com/wayoads",
              "https://instagram.com/wayoads",
              "https://linkedin.com/company/wayoads"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "email": "support@wayoads.com"
            },
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "AE"
            }
          }),
        }}
      />
      <Script
        id="json-ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Wayo Ads",
            "url": "https://wayoads.com",
            "description": "Creator monetization platform for pay per view advertising",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://wayoads.com/campaigns?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }),
        }}
      />
      <Script
        id="json-ld-softwareapplication"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Wayo Ads",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "url": "https://wayoads.com",
            "description": "Creator monetization platform connecting brands with local influencers for pay-per-view advertising campaigns.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "150"
            }
          }),
        }}
      />
      <div className="flex flex-col">
      {/* Hero Section - Light Orange Gradient */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#fff6ed] via-[#fff] to-[#fffdf9] pt-16">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#F47A1F]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#F47A1F]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#F47A1F]/5 to-orange-100 rounded-full blur-3xl" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,122,31,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,122,31,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 text-[#F47A1F] text-sm mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>{t('hero.badge')}</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-[#F47A1F] to-orange-400 bg-clip-text text-transparent">
                {t('hero.realIncome')}
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {status === 'authenticated' ? (
                <>
                  {userRoles.includes('ADVERTISER') && (
                    <Link href={getLocalizedPath('/dashboard/advertiser')}>
                      <Button size="lg" className="gap-2 bg-[#F47A1F] hover:bg-[#F06423] text-lg px-8 h-14">
                        Advertiser Dashboard
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  )}
                  {userRoles.includes('CREATOR') && (
                    <Link href={getLocalizedPath('/dashboard/creator')}>
                      <Button size="lg" variant="outline" className="gap-2 border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-[#F47A1F] hover:text-[#F47A1F] text-lg px-8 h-14">
                        Creator Dashboard
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  )}
                  <Link href={getLocalizedPath('/campaigns')}>
                    <Button size="lg" variant="ghost" className="text-gray-700 hover:bg-orange-50 text-lg px-8 h-14">
                      Browse Campaigns
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={getLocalizedPath('/campaigns')}>
                    <Button size="lg" className="gap-2 bg-[#F47A1F] hover:bg-[#F06423] text-lg px-8 h-14">
                      Browse Campaigns
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href={getLocalizedPath('/auth/signup')}>
                    <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-[#F47A1F] hover:text-[#F47A1F] text-lg px-8 h-14">
                      Start Earning
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>{t('hero.noMinFollowers')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>{t('hero.instantPayouts')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>{t('hero.fraudProtection')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Your Content Pays Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#fff6ed] via-white to-[#fffdf9]">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('contentPays.title')}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('contentPays.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100">
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&h=400&fit=crop" 
                  alt="Ahmed Nasser - Food Vlogger promoting local restaurant campaign" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
              <div className="relative h-80 flex flex-col justify-end p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    J
                  </div>
                  <div>
                    <div className="text-white font-semibold">Ahmed Nasser</div>
                    <div className="text-gray-300 text-sm">{t('contentPays.foodVlogger')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('contentPays.promoted')} {t('contentPays.localRestaurant')}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-3xl font-bold text-white">30,000+</div>
                  <div className="text-gray-300">{t('contentPays.views')}</div>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-3xl font-bold text-green-400">{t('pricing.earnings2450')}</div>
                  <div className="text-gray-300">{t('contentPays.earned')}</div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100">
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop" 
                  alt="Sarah Travels - Travel creator promoting hotel chain campaign" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
              <div className="relative h-80 flex flex-col justify-end p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    S
                  </div>
                  <div>
                    <div className="text-white font-semibold">Sarah Travels</div>
                    <div className="text-gray-300 text-sm">{t('contentPays.travelCreator')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('contentPays.promoted')} {t('contentPays.hotelChain')}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-3xl font-bold text-white">45,000+</div>
                  <div className="text-gray-300">{t('contentPays.views')}</div>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-3xl font-bold text-green-400">{t('pricing.earnings3820')}</div>
                  <div className="text-gray-300">{t('contentPays.earned')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F47A1F] to-orange-500 text-white">
              <Sparkles className="w-6 h-6" />
              <span className="text-lg font-semibold">{t('contentPays.cta')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Creators Section - Dynamic */}
      <FeaturedCreators />

      {/* Campaigns Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('campaigns.activeTitle')}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('campaigns.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                id: '1',
                brand: 'TechGlow',
                title: 'Promote Our New Smartphone',
                description: 'Create engaging content showcasing our latest smartphone features',
                budget: language === 'en' ? 'AED 5,000' : language === 'fr' ? '€3,500' : '35,000 د.م.',
                views: '50K+',
                location: 'Paris, France',
                category: 'Tech',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                id: '2',
                brand: 'FreshBites',
                title: 'Healthy Food Delivery',
                description: 'Share your experience with our healthy meal delivery service',
                budget: language === 'en' ? 'AED 3,500' : language === 'fr' ? '€3,000' : '35,000 د.م.',
                views: '30K+',
                location: 'Marrakech, Morocco',
                category: 'Food & Beverage',
                color: 'from-green-500 to-emerald-500',
              },
              {
                id: '3',
                brand: 'StyleHub',
                title: 'Fashion Collection Launch',
                description: 'Showcase our new summer fashion collection to your audience',
                budget: language === 'en' ? 'AED 4,200' : language === 'fr' ? '€3,500' : '42,000 د.م.',
                views: '40K+',
                location: 'Dubai, UAE',
                category: 'Fashion',
                color: 'from-purple-500 to-pink-500',
              },
            ].map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className={`h-3 bg-gradient-to-r ${campaign.color}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-[#F47A1F]">{campaign.brand}</span>
                    <span className="text-xs text-gray-500">{campaign.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{campaign.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{campaign.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{campaign.views}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-500">{t('campaigns.cardBudget')}</span>
                      <p className="font-bold text-gray-900">{campaign.budget}</p>
                    </div>
                    {status === 'authenticated' ? (
                      <Link href={getLocalizedPath('/campaigns')}>
                        <Button size="sm" className="bg-[#F47A1F] hover:bg-[#F06423]">
                          View Details
                        </Button>
                      </Link>
                    ) : (
                      <Link href={getLocalizedPath('/auth/signup')}>
                        <Button size="sm" className="bg-[#F47A1F] hover:bg-[#F06423]">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            {status === 'authenticated' ? (
              <Link href={getLocalizedPath('/campaigns')}>
                <Button variant="outline" size="lg" className="border-[#F47A1F] text-[#F47A1F] hover:bg-orange-50">
                  View All Campaigns
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href={getLocalizedPath('/auth/signup')}>
                <Button variant="outline" size="lg" className="border-[#F47A1F] text-[#F47A1F] hover:bg-orange-50">
                  View All Campaigns
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-white scroll-mt-20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-[#F47A1F] text-sm mb-6">
              <Calculator className="w-4 h-4" />
              <span>{t('pricing.title')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F47A1F] to-orange-500 p-10 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative text-center">
                <div className="text-lg font-medium text-orange-100 mb-2">{t('pricing.platformFee')}</div>
                <div className="text-6xl md:text-7xl font-bold mb-4">5%<sup className="text-2xl">*</sup></div>
                <p className="text-orange-100 text-lg mb-8">
                  That's it. We only make money when you do. No monthly subscription, no setup fees.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t('pricing.noMonthly')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t('pricing.noSetup')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t('pricing.payPer')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('comparison.title')}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t('comparison.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-8 rounded-2xl bg-white border-2 border-gray-200">
              <div className="text-center mb-6">
                <div className="text-xl font-bold text-gray-900 mb-2">Google Ads</div>
                <div className="text-gray-500 text-sm">{t('comparison.traditional')}</div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.minBudget')}</span>
                  <span className="font-semibold text-red-500">{t('pricing.monthly500')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.cpm')}</span>
                  <span className="font-semibold text-red-500">{t('pricing.cpm350to10')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.platformFee')}</span>
                  <span className="font-semibold text-red-500">15-30%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.targeting')}</span>
                  <span className="font-semibold text-gray-400">{t('comparison.broad')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.local')}</span>
                  <X className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-white border-2 border-gray-200">
              <div className="text-center mb-6">
                <div className="text-xl font-bold text-gray-900 mb-2">Meta Ads</div>
                <div className="text-gray-500 text-sm">{t('comparison.traditional')}</div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.minBudget')}</span>
                  <span className="font-semibold text-red-500">{t('pricing.monthly300')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.cpm')}</span>
                  <span className="font-semibold text-red-500">{t('pricing.cpm5to15')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.platformFee')}</span>
                  <span className="font-semibold text-red-500">15-30%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.targeting')}</span>
                  <span className="font-semibold text-gray-400">{t('comparison.algo')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('comparison.local')}</span>
                  <X className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </div>

            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#F47A1F] to-orange-500 text-white border-2 border-[#F47A1F]">
              <div className="absolute top-0 right-0 bg-white text-[#F47A1F] text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                {t('comparison.save')}
              </div>
              <div className="text-center mb-6">
                <div className="text-xl font-bold mb-2">Wayo Ads Market</div>
                <div className="text-orange-100 text-sm">{t('comparison.creator')}</div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-orange-400/30">
                  <span className="text-orange-100">{t('comparison.minBudget')}</span>
                  <span className="font-bold">{t('pricing.payout50')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-orange-400/30">
                  <span className="text-orange-100">{t('comparison.cpm')}</span>
                  <span className="font-bold">{t('pricing.view50to150')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-orange-400/30">
                  <span className="text-orange-100">{t('comparison.platformFee')}</span>
                  <span className="font-bold">5%<sup className="text-xs">*</sup></span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-orange-400/30">
                  <span className="text-orange-100">{t('comparison.targeting')}</span>
                  <span className="font-bold">{t('comparison.geoTargeted')}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-orange-400/30">
                  <span className="text-orange-100">{t('comparison.local')}</span>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">70%+ Cheaper</div>
                <div className="text-orange-100">{t('comparison.tradThan')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Results Section */}
      <BrandResults />

      {/* AI Magic Content Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-purple-500/20 text-purple-200 border-purple-400/30 px-4 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered Tools
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Your Magic Recipe to Content that Performs
            </h2>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
              Create high-performing content with our AI content scriptwriter and content spy tool — built for creators, social media managers, growth marketers, and agencies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={getLocalizedPath('/creator/pricing')}>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Link href={getLocalizedPath('/creator/pricing')}>
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-12">
            <div className="text-center p-4">
              <div className="p-3 bg-white/10 rounded-full w-fit mx-auto mb-3">
                <Video className="h-6 w-6 text-pink-400" />
              </div>
              <p className="text-white font-medium">Script Generation</p>
              <p className="text-purple-300 text-sm">5 tokens</p>
            </div>
            <div className="text-center p-4">
              <div className="p-3 bg-white/10 rounded-full w-fit mx-auto mb-3">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-white font-medium">Pattern Analysis</p>
              <p className="text-purple-300 text-sm">10 tokens</p>
            </div>
            <div className="text-center p-4">
              <div className="p-3 bg-white/10 rounded-full w-fit mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-white font-medium">Trend Analysis</p>
              <p className="text-purple-300 text-sm">10 tokens</p>
            </div>
            <div className="text-center p-4">
              <div className="p-3 bg-white/10 rounded-full w-fit mx-auto mb-3">
                <Palette className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-white font-medium">Thumbnail Psychology</p>
              <p className="text-purple-300 text-sm">5 tokens</p>
            </div>
          </div>
          
          <p className="text-center text-purple-300 mt-8">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              100 free tokens on signup
            </span>
          </p>
        </div>
      </section>

      {/* Stats - Orange */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#F47A1F] to-orange-600">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2">{t('pricing.earning10k')}</div>
              <div className="text-orange-100">{t('stats.paidCreators')}</div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
              <div className="text-orange-100">{t('stats.activeCampaigns')}</div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2">200+</div>
              <div className="text-orange-100">{t('stats.verified')}</div>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2">30d</div>
              <div className="text-orange-100">{t('stats.window')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Light */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('testimonials.title')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-8 rounded-2xl bg-white border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F47A1F] to-orange-400 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-gray-900 font-medium">{testimonial.author}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Light */}
      <section className="py-24 px-4 bg-gradient-to-br from-[#fff6ed] via-white to-[#fffdf9]">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Creator CTA */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F47A1F] to-orange-500 p-10 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                  <HandHeart className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('cta.creatorTitle')}</h3>
                <p className="text-orange-100 text-lg mb-8">
                  {t('cta.creatorText')}
                </p>
                <Link href={getLocalizedPath('/auth/signup')}>
                  <Button size="lg" className="bg-white text-[#F47A1F] hover:bg-orange-50 gap-2">
                    {t('cta.getStarted')}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Brand CTA */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 p-10 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('cta.brandTitle')}</h3>
                <p className="text-gray-300 text-lg mb-8">
                  {t('cta.brandText')}
                </p>
                <Link href={getLocalizedPath('/auth/signup')}>
                  <Button size="lg" className="bg-[#F47A1F] hover:bg-[#F06423] gap-2">
                    {t('cta.startCampaign')}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto text-center">
          <p className="text-gray-500">
            {t('cta.haveQuestions')}{' '}
            <a href="#" className="text-[#F47A1F] hover:underline">
              {t('cta.contactTeam')}
            </a>
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
