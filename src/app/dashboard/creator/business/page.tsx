'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  creatorBusinessProfileSchema, 
  type CreatorBusinessProfileInput,
  BusinessType
} from '@/lib/validation/business-profile';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BusinessInformationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutReady, setPayoutReady] = useState(false);

  const form = useForm({
    resolver: zodResolver(creatorBusinessProfileSchema) as any,
    defaultValues: {
      businessType: BusinessType.PERSONAL,
      companyName: '',
      vatNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      state: '',
      countryCode: '',
    },
  });

  const businessType = form.watch('businessType') as BusinessType;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/creator/business-profile');
        const data = await response.json();
        
        if (data.profile) {
          // Reset form with fetched data
          form.reset({
            businessType: data.profile.businessType,
            companyName: data.profile.companyName || '',
            vatNumber: data.profile.vatNumber || '',
            addressLine1: data.profile.addressLine1 || '',
            addressLine2: data.profile.addressLine2 || '',
            city: data.profile.city || '',
            postalCode: data.profile.postalCode || '',
            state: data.profile.state || '',
            countryCode: data.profile.countryCode || '',
          });
          checkPayoutReadiness(data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchProfile();
    }
  }, [session, form]);

  const checkPayoutReadiness = (data: any) => {
    if (!data) return setPayoutReady(false);
    
    if (data.businessType === BusinessType.REGISTERED_COMPANY) {
      setPayoutReady(!!(data.companyName && data.vatNumber && data.addressLine1 && data.city && data.postalCode && data.countryCode));
    } else if (data.businessType === BusinessType.SOLE_PROPRIETOR) {
      setPayoutReady(!!(data.addressLine1 && data.city && data.postalCode && data.countryCode));
    } else {
      setPayoutReady(true); // PERSONAL is always ready by default (address optional)
    }
  };

  async function onSubmit(values: CreatorBusinessProfileInput) {
    setSaving(true);
    try {
      const response = await fetch('/api/creator/business-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Profile updated',
          description: 'Your business information has been saved successfully.',
        });
        checkPayoutReadiness(values);
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/creator">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Legal & Business Information</h1>
          <p className="text-muted-foreground">
            Manage your tax and business details for compliance and payouts.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
          {payoutReady ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Payout Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-800 border-amber-200 bg-amber-50">
              <AlertCircle className="mr-1 h-3 w-3" /> Action Required
            </Badge>
          )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Why is this needed?</AlertTitle>
        <AlertDescription>
          We require this information to generate valid invoices for your earnings and to comply with international tax regulations. Your data is stored securely and only used for financial processing.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
          <CardDescription>
            Select your operating status and provide the required legal identifiers.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={BusinessType.PERSONAL}>Individual / Private Person</SelectItem>
                        <SelectItem value={BusinessType.SOLE_PROPRIETOR}>Sole Proprietor / Freelancer</SelectItem>
                        <SelectItem value={BusinessType.REGISTERED_COMPANY}>Registered Company</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines what tax information and documentation is required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {businessType === BusinessType.REGISTERED_COMPANY && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Acme Studio LLC" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT / Tax ID Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. LU12345678" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {businessType === BusinessType.SOLE_PROPRIETOR && (
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT / Tax ID Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FR123456789" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Provide this if you are VAT-registered in your jurisdiction.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {businessType !== BusinessType.PERSONAL && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Business Address</h3>
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Zip/Postal code" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Region (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="State or province" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country (ISO Code)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. US, GB, FR" maxLength={2} {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {businessType === BusinessType.PERSONAL && (
                <p className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-md border border-slate-100">
                  As an Individual, you do not need to provide a company name or VAT number. Payouts will be processed to your personal name.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Information
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
