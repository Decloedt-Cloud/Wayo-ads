'use client';

import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { useLanguage } from '@/app/translations';

export default function Footer() {
  const { t, language } = useLanguage();
  
  const getLocalizedPath = (path: string) => {
    return language && language !== 'en' ? `/${language}${path}` : path;
  };
  
  return (
    <footer className="mt-auto border-t bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Megaphone className="h-6 w-6 text-[#F47A1F]" />
              <span className="font-bold text-xl text-gray-900">Wayo Ads Market</span>
            </Link>
            <p className="text-gray-600 text-sm max-w-md">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{t('footer.forAdvertisers')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href={getLocalizedPath('/campaigns')} className="hover:text-[#F47A1F]">{t('footer.browseCampaigns')}</Link></li>
              <li><Link href={getLocalizedPath('/dashboard/advertiser')} className="hover:text-[#F47A1F]">{t('footer.createCampaign')}</Link></li>
              <li><Link href={getLocalizedPath('/pricing')} className="hover:text-[#F47A1F]">{t('footer.pricing')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{t('footer.forCreators')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href={getLocalizedPath('/campaigns')} className="hover:text-[#F47A1F]">{t('footer.findCampaigns')}</Link></li>
              <li><Link href={getLocalizedPath('/dashboard/creator')} className="hover:text-[#F47A1F]">{t('footer.creatorDashboard')}</Link></li>
              <li><Link href={getLocalizedPath('/how-it-works')} className="hover:text-[#F47A1F]">{t('footer.howItWorks')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Wayo Ads Market. {t('footer.rights')}</p>
          <div className="mt-2 space-x-4">
            <Link href={getLocalizedPath('/terms')} className="hover:text-[#F47A1F]">{t('footer.terms')}</Link>
            <span className="text-gray-400">|</span>
            <Link href={getLocalizedPath('/privacy')} className="hover:text-[#F47A1F]">{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
