'use client';

import { useLanguage } from '@/app/translations';
import Link from 'next/link';

export default function TermsPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('terms.title')}</h1>
        <p className="text-gray-600 mb-8">{t('terms.lastUpdated')}: October 7, 2025</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. {t('terms.intro.title')}</h2>
            <p className="text-gray-700">
              {t('terms.intro.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. {t('terms.definitions.title')}</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>{t('terms.definitions.wayo')}</strong> - {t('terms.definitions.wayoDesc')}</li>
              <li><strong>{t('terms.definitions.user')}</strong> - {t('terms.definitions.userDesc')}</li>
              <li><strong>{t('terms.definitions.content')}</strong> - {t('terms.definitions.contentDesc')}</li>
              <li><strong>{t('terms.definitions.usage')}</strong> - {t('terms.definitions.usageDesc')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. {t('terms.access.title')}</h2>
            <p className="text-gray-700">
              {t('terms.access.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. {t('terms.protection.title')}</h2>
            <p className="text-gray-700">
              {t('terms.protection.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. {t('terms.features.title')}</h2>
            <p className="text-gray-700">
              {t('terms.features.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. {t('terms.support.title')}</h2>
            <p className="text-gray-700">
              {t('terms.support.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. {t('terms.rights.title')}</h2>
            <p className="text-gray-700 mb-4">
              {t('terms.rights.content')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.rights.prohibitedTitle')}</h3>
            <p className="text-gray-700">
              {t('terms.rights.prohibited')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. {t('terms.ip.title')}</h2>
            <p className="text-gray-700">
              {t('terms.ip.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. {t('terms.privacy.title')}</h2>
            <p className="text-gray-700">
              {t('terms.privacy.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. {t('terms.liability.title')}</h2>
            <p className="text-gray-700">
              {t('terms.liability.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. {t('terms.termination.title')}</h2>
            <p className="text-gray-700">
              {t('terms.termination.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. {t('terms.governing.title')}</h2>
            <p className="text-gray-700">
              {t('terms.governing.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. {t('terms.amendments.title')}</h2>
            <p className="text-gray-700">
              {t('terms.amendments.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. {t('terms.waiver.title')}</h2>
            <p className="text-gray-700">
              {t('terms.waiver.content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. {t('terms.contact.title')}</h2>
            <p className="text-gray-700">
              {t('terms.contact.content')}
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <Link href={`/${language}`} className="text-[#F47A1F] hover:underline">
            &larr; {t('terms.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
