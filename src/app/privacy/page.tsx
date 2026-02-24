'use client';

import { useLanguage } from '@/app/translations';
import Link from 'next/link';

export default function PrivacyPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('privacy.title')}</h1>
        <p className="text-gray-600 mb-8">{t('privacy.lastUpdated')}: October 7, 2025</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. {t('privacy.intro.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.intro.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. {t('privacy.data.title')}</h2>
            <p className="text-gray-700 mb-4">
              {t('privacy.data.subtitle')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.data.advertisers.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('privacy.data.advertisers.content')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.data.creators.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('privacy.data.creators.content')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.data.technical.title')}</h3>
            <p className="text-gray-700 mb-4">
              {t('privacy.data.technical.content')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.data.payment.title')}</h3>
            <p className="text-gray-700">
              {t('privacy.data.payment.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. {t('privacy.purpose.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.purpose.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. {t('privacy.legal.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.legal.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. {t('privacy.sharing.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.sharing.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. {t('privacy.security.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.security.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. {t('privacy.userRights.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.userRights.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. {t('privacy.cookies.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.cookies.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. {t('privacy.retention.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.retention.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. {t('privacy.children.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.children.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. {t('privacy.changes.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.changes.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. {t('privacy.contact.title')}</h2>
            <p className="text-gray-700">
              {t('privacy.contact.content')}
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <Link href={`/${language}`} className="text-[#F47A1F] hover:underline">
            &larr; {t('privacy.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
