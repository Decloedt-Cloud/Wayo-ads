'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Building, Wallet, Rocket, CheckCircle, User, DollarSign, Briefcase } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';
import { useLanguage } from '@/app/translations';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const ADVERTISER_STEPS = [
  { id: 'welcome', icon: Sparkles },
  { id: 'business', icon: Building },
  { id: 'wallet', icon: Wallet },
  { id: 'campaign', icon: Rocket },
];

const CREATOR_STEPS = [
  { id: 'welcome', icon: Sparkles },
  { id: 'profile', icon: User },
  { id: 'payments', icon: DollarSign },
  { id: 'campaigns', icon: Briefcase },
];

export default function OnboardingModal() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { 
    isOpen, 
    currentStep, 
    totalSteps, 
    userType,
    closeOnboarding, 
    nextStep, 
    prevStep, 
    completeOnboarding 
  } = useOnboarding();
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const isAdvertiser = userType === 'advertiser';
  const isCreator = userType === 'creator';
  const steps = isAdvertiser ? ADVERTISER_STEPS : isCreator ? CREATOR_STEPS : ADVERTISER_STEPS;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeOnboarding();
      setIsClosing(false);
    }, 300);
  };

  const handleComplete = async () => {
    await completeOnboarding();
    if (isAdvertiser) {
      router.push('/dashboard/advertiser');
    } else {
      router.push('/dashboard/creator');
    }
  };

  const getStepContent = () => {
    if (isCreator) {
      switch (currentStep) {
        case 0:
          return {
            title: t('onboarding.creator.welcome.title'),
            description: t('onboarding.creator.welcome.description'),
            image: null,
          };
        case 1:
          return {
            title: t('onboarding.creator.business.title'),
            description: t('onboarding.creator.business.description'),
            image: 'profile',
          };
        case 2:
          return {
            title: t('onboarding.creator.payments.title'),
            description: t('onboarding.creator.payments.description'),
            image: 'payments',
          };
        case 3:
          return {
            title: t('onboarding.creator.campaigns.title'),
            description: t('onboarding.creator.campaigns.description'),
            image: 'campaigns',
          };
        default:
          return { title: '', description: '' };
      }
    }

    switch (currentStep) {
      case 0:
        return {
          title: t('onboarding.modal.welcome.title'),
          description: t('onboarding.modal.welcome.description'),
          image: null,
        };
      case 1:
        return {
          title: t('onboarding.modal.business.title'),
          description: t('onboarding.modal.business.description'),
          image: 'business',
        };
      case 2:
        return {
          title: t('onboarding.modal.wallet.title'),
          description: t('onboarding.modal.wallet.description'),
          notes: [
            t('onboarding.modal.wallet.note1'),
            t('onboarding.modal.wallet.note2'),
          ],
          image: 'wallet',
        };
      case 3:
        return {
          title: t('onboarding.modal.campaign.title'),
          description: t('onboarding.modal.campaign.description'),
          fields: [
            { name: t('onboarding.modal.campaign.field1'), desc: t('onboarding.modal.campaign.field1Desc') },
            { name: t('onboarding.modal.campaign.field2'), desc: t('onboarding.modal.campaign.field2Desc') },
            { name: t('onboarding.modal.campaign.field3'), desc: t('onboarding.modal.campaign.field3Desc') },
            { name: t('onboarding.modal.campaign.field4'), desc: t('onboarding.modal.campaign.field4Desc') },
          ],
          image: 'campaign',
        };
      default:
        return { title: '', description: '' };
    }
  };

  const getStepLabel = (stepId: string) => {
    if (isCreator) {
      return t(`onboarding.creator.step.${stepId}`);
    }
    return t(`onboarding.modal.step.${stepId}`);
  };

  const getStepIcon = (index: number) => {
    const step = steps[index];
    if (!step) return Sparkles;
    
    if (isCreator) {
      switch (index) {
        case 0: return Sparkles;
        case 1: return User;
        case 2: return DollarSign;
        case 3: return Briefcase;
        default: return step.icon;
      }
    }
    return step.icon;
  };

  const content = getStepContent();
  const isRTL = language === 'ar';

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex">
              <div className="w-1/3 bg-gradient-to-br from-[#F47A1F] to-[#F06423] p-8 flex flex-col justify-between">
                <div>
                  <h2 className="text-white text-2xl font-bold mb-2">
                    {currentStep + 1} / {totalSteps}
                  </h2>
                  <div className="space-y-3 mt-6">
                    {steps.map((step, index) => {
                      const Icon = getStepIcon(index);
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;
                      
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 ${
                            isActive ? 'text-white' : isCompleted ? 'text-white/70' : 'text-white/40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-white/20' : isCompleted ? 'bg-white/10' : 'bg-white/5'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-sm font-medium">
                            {getStepLabel(step.id)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-8">
                  <div className="flex gap-2">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          index <= currentStep ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-2/3 p-8 flex flex-col">
                <div className="flex-1">
                  {currentStep === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-[#F47A1F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-[#F47A1F]" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {content.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {content.description}
                      </p>
                    </div>
                  ) : isCreator && currentStep === 3 ? (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#F47A1F]/10 rounded-xl flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-[#F47A1F]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {content.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 mb-6">
                        {content.description}
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{t('onboarding.modal.wallet.note2')}</span>
                        </div>
                      </div>
                    </div>
                  ) : currentStep === 3 && isAdvertiser ? (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#F47A1F]/10 rounded-xl flex items-center justify-center">
                          <Rocket className="w-6 h-6 text-[#F47A1F]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {content.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 mb-6">
                        {content.description}
                      </p>
                      <div className="space-y-4">
                        {content.fields?.map((field, index) => (
                          <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            <div className="w-8 h-8 bg-[#F47A1F] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{field.name}</p>
                              <p className="text-sm text-gray-500">{field.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#F47A1F]/10 rounded-xl flex items-center justify-center">
                          {isCreator && currentStep === 1 ? (
                            <User className="w-6 h-6 text-[#F47A1F]" />
                          ) : isCreator && currentStep === 2 ? (
                            <DollarSign className="w-6 h-6 text-[#F47A1F]" />
                          ) : currentStep === 1 ? (
                            <Building className="w-6 h-6 text-[#F47A1F]" />
                          ) : (
                            <Wallet className="w-6 h-6 text-[#F47A1F]" />
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {content.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 mb-6">
                        {content.description}
                      </p>
                      {content.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                          {content.notes.map((note, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm text-blue-700">
                              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{note}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t">
                  {currentStep === 0 ? (
                    <div className="flex-1 flex justify-end">
                      <Button
                        onClick={handleClose}
                        variant="outline"
                        className="mr-3"
                      >
                        {t('onboarding.modal.skip')}
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="bg-[#F47A1F] hover:bg-[#F06423]"
                      >
                        {t('onboarding.modal.start')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : currentStep === totalSteps - 1 ? (
                    <div className="flex-1 flex justify-end gap-3">
                      <Button
                        onClick={prevStep}
                        variant="outline"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        {t('onboarding.modal.back')}
                      </Button>
                      <Button
                        onClick={handleComplete}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {t('onboarding.modal.goToDashboard')}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex justify-between">
                      <Button
                        onClick={prevStep}
                        variant="outline"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        {t('onboarding.modal.back')}
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="bg-[#F47A1F] hover:bg-[#F06423]"
                      >
                        {t('onboarding.modal.next')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
