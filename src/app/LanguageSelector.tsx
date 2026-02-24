'use client';

import { useLanguage } from './translations';
import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

const languages = [
  { code: 'en', flag: '🇬🇧', label: 'English', urlPrefix: 'en' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', urlPrefix: 'fr' },
  { code: 'ar', flag: '🇲🇦', label: 'العربية', urlPrefix: 'ar' },
];

const pathMappings: Record<string, Record<string, string>> = {
  'terms': { en: 'terms', fr: 'conditions-generales', ar: 'الشروط-و-الأحكام' },
  'privacy': { en: 'privacy', fr: 'politique-confidentialite', ar: 'سياسة-الخصوصية' },
};

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const getUrlPrefix = (langCode: string) => {
    const lang = languages.find(l => l.code === langCode);
    return lang?.urlPrefix || 'en';
  };

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as any);
    const currentPath = window.location.pathname;
    const currentLang = languages.find(l => 
      currentPath.startsWith(`/${l.urlPrefix}/`) || currentPath === `/${l.urlPrefix}`
    );
    const currentLangCode = currentLang?.code || 'en';
    const targetUrlPrefix = getUrlPrefix(langCode);
    
    const pathKey = Object.keys(pathMappings).find(key => 
      currentPath.includes(pathMappings[key][currentLangCode])
    );
    
    if (pathKey && pathMappings[pathKey][langCode]) {
      const newPath = `/${targetUrlPrefix}/${pathMappings[pathKey][langCode]}`;
      router.push(newPath);
      return;
    }

    const isRootPath = currentPath === '/' || currentPath === '/en' || currentPath === '/fr' || currentPath === '/ar';
    
    if (isRootPath) {
      if (targetUrlPrefix === 'en') {
        router.push('/');
      } else {
        router.push(`/${targetUrlPrefix}`);
      }
    } else if (currentPath.match(/^\/(en|fr|ar)\//)) {
      const pathWithoutLocale = currentPath.replace(/^\/(en|fr|ar)/, '');
      if (targetUrlPrefix === 'en') {
        router.push(pathWithoutLocale || '/');
      } else {
        router.push(`/${targetUrlPrefix}${pathWithoutLocale}`);
      }
    } else {
      if (targetUrlPrefix === 'en') {
        router.push(currentPath);
      } else {
        router.push(`/${targetUrlPrefix}${currentPath}`);
      }
    }
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{languages.find(l => l.code === language)?.flag}</span>
      </button>
      
      <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
              language === lang.code ? 'bg-orange-50 text-[#F47A1F]' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="font-medium">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
