'use client';

import Link from 'next/link';
import { CaseStudyCard } from '@/components/cards/CaseStudyCard';

const caseStudies = [
  {
    name: 'Bistro 21',
    location: 'Paris',
    industry: 'Restaurant',
    metrics: [
      { label: 'CAC', value: '-32%', highlight: true },
      { label: 'Foot Traffic', value: '+47%', highlight: true },
      { label: 'ROAS', value: '3.2x', highlight: true },
    ],
    quote: 'Local creators delivered real customers.',
  },
  {
    name: 'UrbanStyle',
    location: 'Dubai',
    industry: 'Retail',
    metrics: [
      { label: 'CPM', value: '-24%', highlight: true },
      { label: 'Engagement', value: '+38%', highlight: true },
      { label: 'Sales', value: '+29%', highlight: true },
    ],
    quote: 'Stronger local reach. Lower cost.',
  },
  {
    name: 'Wayo.ma',
    location: 'Casablanca',
    industry: 'SaaS',
    metrics: [
      { label: 'CPL', value: '-35%', highlight: true },
      { label: 'Demo Bookings', value: '+52%', highlight: true },
      { label: 'Conversion', value: '2.8x', highlight: true },
    ],
    quote: 'Creators outperformed paid ads.',
  },
];

export function BrandResults() {
  return (
    <section id="brands" className="py-24 px-4 bg-white scroll-mt-20">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-[#F47A1F] text-sm font-medium mb-6">
            For Brands
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Agency Results. <span className="text-[#F47A1F]">Without the Agency.</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto">
            Peer-to-peer local campaigns cut acquisition costs by 28%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {caseStudies.map((study) => (
            <CaseStudyCard
              key={study.name}
              name={study.name}
              location={study.location}
              industry={study.industry}
              metrics={study.metrics}
              quote={study.quote}
            />
          ))}
        </div>

        <div className="text-center">
          <Link href="/how-it-works">
            <button className="px-8 py-4 bg-[#F47A1F] hover:bg-[#F06423] text-white font-semibold rounded-xl transition-colors">
              See How It Works
            </button>
          </Link>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Illustrative performance examples.
        </p>
      </div>
    </section>
  );
}
