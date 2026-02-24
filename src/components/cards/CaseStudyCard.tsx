'use client';

interface CaseStudyCardProps {
  name: string;
  location: string;
  industry: string;
  metrics: {
    label: string;
    value: string;
    highlight?: boolean;
  }[];
  quote: string;
}

export function CaseStudyCard({ name, location, industry, metrics, quote }: CaseStudyCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{industry}</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{name}</h3>
            <p className="text-sm text-gray-500">{location}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className={`text-center p-3 rounded-xl ${
                metric.highlight 
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' 
                  : 'bg-gray-50'
              }`}
            >
              <div className={`text-2xl font-bold ${metric.highlight ? 'text-white' : 'text-gray-900'}`}>
                {metric.value}
              </div>
              <div className={`text-xs ${metric.highlight ? 'text-orange-100' : 'text-gray-500'}`}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        <p className="text-gray-600 font-medium italic border-l-4 border-orange-500 pl-4">
          "{quote}"
        </p>
      </div>
    </div>
  );
}
