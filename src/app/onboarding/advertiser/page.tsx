'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, Building, CreditCard, Rocket, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/app/translations';

const STEPS = [
  { id: 1, title: 'businessProfile', icon: Building },
  { id: 2, title: 'paymentMethod', icon: CreditCard },
  { id: 3, title: 'firstCampaign', icon: Rocket },
];

interface CampaignFormData {
  name: string;
  goal: string;
  budget: string;
  duration: string;
}

export default function AdvertiserOnboardingWizard() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const [businessData, setBusinessData] = useState({
    companyName: '',
    industry: '',
    website: '',
    description: '',
  });

  const [paymentData, setPaymentData] = useState({
    method: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
  });

  const [campaignData, setCampaignData] = useState<CampaignFormData>({
    name: '',
    goal: 'brand_awareness',
    budget: '',
    duration: '30',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/advertiser/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: businessData,
          payment: paymentData,
          campaign: campaignData,
        }),
      });

      if (res.ok) {
        setIsComplete(true);
        setTimeout(() => {
          router.push('/dashboard/advertiser');
        }, 3000);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F47A1F]" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="relative mb-6">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-yellow-400 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('onboarding.advertiserComplete')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('onboarding.advertiserCompleteMessage')}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-green-800">
                ✅ {t('onboarding.businessSaved')}: {businessData.companyName}
              </p>
              <p className="text-sm font-medium text-green-800">
                ✅ {t('onboarding.paymentConfigured')}
              </p>
              <p className="text-sm font-medium text-green-800">
                ✅ {t('onboarding.campaignCreated')}: {campaignData.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  isActive
                    ? 'border-[#F47A1F] bg-[#F47A1F] text-white shadow-lg shadow-[#F47A1F]/30'
                    : isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-20 h-1 mx-3 transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-200px)] py-12 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F47A1F] rounded-full mb-4 shadow-lg shadow-[#F47A1F]/30">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('onboarding.advertiserWelcome')}
          </h1>
          <p className="text-gray-600">
            {t('onboarding.advertiserSubtitle')}
          </p>
        </div>

        {renderStepIndicator()}

        <Card className="border-2 border-gray-100 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[#F47A1F]/5 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Building className="h-5 w-5 text-[#F47A1F]" />}
              {currentStep === 2 && <CreditCard className="h-5 w-5 text-[#F47A1F]" />}
              {currentStep === 3 && <Rocket className="h-5 w-5 text-[#F47A1F]" />}
              {t(`onboarding.advertiserStep${currentStep}Title`)}
            </CardTitle>
            <CardDescription>
              {t(`onboarding.advertiserStep${currentStep}Desc`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('onboarding.companyName')}</Label>
                  <Input
                    id="companyName"
                    placeholder={t('onboarding.companyNamePlaceholder')}
                    value={businessData.companyName}
                    onChange={(e) => setBusinessData({ ...businessData, companyName: e.target.value })}
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">{t('onboarding.industry')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Technology', 'E-commerce', 'Healthcare', 'Finance', 'Entertainment', 'Other'].map((ind) => (
                      <div
                        key={ind}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          businessData.industry === ind
                            ? 'border-[#F47A1F] bg-[#F47A1F]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setBusinessData({ ...businessData, industry: ind })}
                      >
                        <p className="text-sm font-medium text-center">{ind}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">{t('onboarding.website')}</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={businessData.website}
                    onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('onboarding.companyDescription')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('onboarding.companyDescriptionPlaceholder')}
                    value={businessData.description}
                    onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {t('onboarding.paymentSecure')}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {t('onboarding.paymentSecureDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">{t('onboarding.cardNumber')}</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, cardNumber: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">{t('onboarding.expiryDate')}</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData({ ...paymentData, expiryDate: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">{t('onboarding.cvv')}</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingAddress">{t('onboarding.billingAddress')}</Label>
                  <Input
                    id="billingAddress"
                    placeholder={t('onboarding.billingAddressPlaceholder')}
                    value={paymentData.billingAddress}
                    onChange={(e) => setPaymentData({ ...paymentData, billingAddress: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-[#F47A1F]/10 to-green-50 border border-[#F47A1F]/20 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {t('onboarding.campaignTip')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('onboarding.campaignTipDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignName">{t('onboarding.campaignName')}</Label>
                  <Input
                    id="campaignName"
                    placeholder={t('onboarding.campaignNamePlaceholder')}
                    value={campaignData.name}
                    onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('onboarding.campaignGoal')}</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'brand_awareness', label: t('onboarding.goalBrandAwareness') },
                      { id: 'website_traffic', label: t('onboarding.goalWebsiteTraffic') },
                      { id: 'lead_generation', label: t('onboarding.goalLeadGeneration') },
                      { id: 'app_installs', label: t('onboarding.goalAppInstalls') },
                    ].map((goal) => (
                      <div
                        key={goal.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          campaignData.goal === goal.id
                            ? 'border-[#F47A1F] bg-[#F47A1F]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCampaignData({ ...campaignData, goal: goal.id })}
                      >
                        <p className="font-medium">{goal.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">{t('onboarding.campaignBudget')}</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="1000"
                      value={campaignData.budget}
                      onChange={(e) => setCampaignData({ ...campaignData, budget: e.target.value })}
                      className="h-12 pl-8 text-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {t('onboarding.budgetHelp')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">{t('onboarding.campaignDuration')}</Label>
                  <Select
                    value={campaignData.duration}
                    onValueChange={(value) => setCampaignData({ ...campaignData, duration: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">{t('onboarding.duration7Days')}</SelectItem>
                      <SelectItem value="14">{t('onboarding.duration14Days')}</SelectItem>
                      <SelectItem value="30">{t('onboarding.duration30Days')}</SelectItem>
                      <SelectItem value="60">{t('onboarding.duration60Days')}</SelectItem>
                      <SelectItem value="90">{t('onboarding.duration90Days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className="px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboarding.back')}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="bg-[#F47A1F] hover:bg-[#F06423] px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('onboarding.saving')}
              </>
            ) : (
              <>
                {currentStep === STEPS.length ? t('onboarding.launchCampaign') : t('onboarding.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {currentStep} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
