'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, Building, Globe, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyBusinessInfo {
  id: string;
  companyName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  legalEntityType: string | null;
  incorporationDate: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
  bankIban: string | null;
  createdAt: string;
  updatedAt: string;
}

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CA', name: 'Canada' },
];

const LEGAL_ENTITY_TYPES = [
  { value: 'SARL', label: 'SARL (Société à Responsabilité Limitée)' },
  { value: 'SAS', label: 'SAS (Société par Actions Simplifiée)' },
  { value: 'SA', label: 'SA (Société Anonyme)' },
  { value: 'EURL', label: 'EURL (Entreprise Unipersonnelle à Responsabilité Limitée)' },
  { value: 'SCI', label: 'SCI (Société Civile Immobilière)' },
  { value: 'LLC', label: 'LLC (Limited Liability Company)' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Sole Proprietor', label: 'Sole Proprietor' },
  { value: 'Other', label: 'Other' },
];

export default function AdminBusinessInfoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [legalEntityType, setLegalEntityType] = useState('');
  const [incorporationDate, setIncorporationDate] = useState('');
  
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('');
  
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSwift, setBankSwift] = useState('');
  const [bankIban, setBankIban] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchInfo() {
      if (status !== 'authenticated') return;

      try {
        const res = await fetch('/api/admin/company-business-info');
        
        if (res.status === 403) {
          toast.error('Access denied. Superadmin privileges required.');
          router.push('/dashboard/admin');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load business info');
        }

        const data = await res.json();
        const info: CompanyBusinessInfo = data.info;

        setCompanyName(info.companyName || '');
        setRegistrationNumber(info.registrationNumber || '');
        setVatNumber(info.vatNumber || '');
        setLegalEntityType(info.legalEntityType || '');
        setIncorporationDate(info.incorporationDate ? info.incorporationDate.split('T')[0] : '');
        setContactEmail(info.contactEmail || '');
        setContactPhone(info.contactPhone || '');
        setAddressLine1(info.addressLine1 || '');
        setAddressLine2(info.addressLine2 || '');
        setCity(info.city || '');
        setState(info.state || '');
        setPostalCode(info.postalCode || '');
        setCountryCode(info.countryCode || '');
        setBankName(info.bankName || '');
        setBankAccountNumber(info.bankAccountNumber || '');
        setBankSwift(info.bankSwift || '');
        setBankIban(info.bankIban || '');
      } catch (error) {
        console.error('Error loading business info:', error);
        toast.error('Failed to load business information');
      } finally {
        setLoading(false);
      }
    }

    fetchInfo();
  }, [status, router]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/admin/company-business-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName || null,
          registrationNumber: registrationNumber || null,
          vatNumber: vatNumber || null,
          legalEntityType: legalEntityType || null,
          incorporationDate: incorporationDate || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          countryCode: countryCode || null,
          bankName: bankName || null,
          bankAccountNumber: bankAccountNumber || null,
          bankSwift: bankSwift || null,
          bankIban: bankIban || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
      toast.success('Business information saved successfully');
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error('Error saving business info:', error);
      toast.error(error.message || 'Failed to save business information');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47A1F]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#F47A1F] hover:bg-[#e06d1a]"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Legal & Business Information</h1>
          <p className="text-gray-600 mt-1">
            Manage your company&apos;s legal details, tax information, and banking coordinates
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            This information is used for legal compliance, invoicing, and tax purposes. Please keep it up to date.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#F47A1F]" />
              <CardTitle>Company Details</CardTitle>
            </div>
            <CardDescription>Basic information about your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalEntityType">Legal Entity Type</Label>
                <select
                  id="legalEntityType"
                  value={legalEntityType}
                  onChange={(e) => setLegalEntityType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select entity type</option>
                  {LEGAL_ENTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g., 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="e.g., FR12345678901"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incorporationDate">Incorporation Date</Label>
              <Input
                id="incorporationDate"
                type="date"
                value={incorporationDate}
                onChange={(e) => setIncorporationDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#F47A1F]" />
              <CardTitle>Contact & Address</CardTitle>
            </div>
            <CardDescription>Your company&apos;s contact information and address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apartment, suite, unit, etc."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country</Label>
              <select
                id="countryCode"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#F47A1F]" />
              <CardTitle>Banking Information</CardTitle>
            </div>
            <CardDescription>Bank details for receiving payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Enter bank name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankSwift">SWIFT / BIC Code</Label>
                <Input
                  id="bankSwift"
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                  placeholder="SWIFT code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankIban">IBAN</Label>
              <Input
                id="bankIban"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="International Bank Account Number"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#F47A1F] hover:bg-[#e06d1a]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
