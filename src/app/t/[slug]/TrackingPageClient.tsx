'use client';

import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

interface TrackingData {
  campaignId: string;
  creatorId: string;
  linkId: string;
  visitorId: string;
  landingUrl: string;
  campaignTitle: string;
  creatorName: string | null;
  campaignStatus: string;
}

interface TrackingPageClientProps {
  data: TrackingData;
}

export default function TrackingPageClient({ data }: TrackingPageClientProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Recording your visit...');

  useEffect(() => {
    document.cookie = `visitor_id=${data.visitorId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    const getDeviceFingerprint = () => {
      return {
        screenResolution: window.screen.width + 'x' + window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
      };
    };

    const loadPixel = (pixelUrl: string) => {
      const img = new Image();
      img.src = pixelUrl;
      img.style.display = 'none';
      document.body.appendChild(img);
      
      setTimeout(() => {
        if (document.body.contains(img)) {
          document.body.removeChild(img);
        }
      }, 5000);
    };

    const trackView = async () => {
      try {
        const deviceFingerprint = getDeviceFingerprint();
        
        const response = await fetch('/api/track/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: data.campaignId,
            creatorId: data.creatorId,
            linkId: data.linkId,
            visitorId: data.visitorId,
            deviceFingerprint,
          }),
        });

        const result = await response.json();

        if (result.isRecorded) {
          setStatus('success');
          
          if (result.pixelUrl) {
            loadPixel(result.pixelUrl);
            setMessage('View recorded! Validating...');
          } else if (result.reason === 'campaign_inactive' || result.reason === 'campaign_not_found') {
            setMessage('Campaign not available. Redirecting...');
          } else if (result.reason === 'bot_detected') {
            setMessage('Bot detected. Redirecting...');
          } else if (result.reason === 'fraud_score_exceeded') {
            setMessage('View recorded (flagged). Redirecting...');
          } else if (result.reason === 'duplicate') {
            setMessage('Duplicate view detected. Redirecting...');
          } else if (result.reason === 'rate_limited') {
            setMessage('Rate limited. Redirecting...');
          } else {
            setMessage('View recorded successfully!');
          }
        } else {
          setStatus('success');
          setMessage(`Visit recorded (${result.reason || 'pending'})`);
        }

        setTimeout(() => {
          window.location.href = data.landingUrl;
        }, 1500);
      } catch (error) {
        console.error('Error tracking view:', error);
        setStatus('error');
        setMessage('Error tracking view. Redirecting anyway...');

        setTimeout(() => {
          window.location.href = data.landingUrl;
        }, 2000);
      }
    };

    trackView();
  }, [data]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {status === 'loading' ? 'Processing...' : status === 'success' ? 'Done!' : 'Error'}
        </h2>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <a
          href={data.landingUrl}
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Continue to Website
        </a>
        
        <p className="text-xs text-gray-400 mt-4">
          Powered by Wayo Ads Market
        </p>
      </div>
    </div>
  );
}
