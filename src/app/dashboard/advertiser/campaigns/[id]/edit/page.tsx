'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { SiYoutube, SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useLanguage } from '@/app/translations';
import { VideoSubmissionsManager } from '@/components/advertiser/VideoSubmissionsManager';

const PLATFORMS = [
  { id: 'YOUTUBE', label: 'YouTube', icon: SiYoutube, color: 'text-red-600' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: SiInstagram, color: 'text-pink-600' },
  { id: 'TIKTOK', label: 'TikTok', icon: SiTiktok, color: 'text-black' },
  { id: 'FACEBOOK', label: 'Facebook', icon: SiFacebook, color: 'text-blue-600' },
] as const;

type PlatformType = typeof PLATFORMS[number]['id'];

interface CampaignFormData {
  title: string;
  description: string;
  landingUrl: string;
  totalBudget: string;
  cpm: string;
  notes: string;
  platforms: PlatformType[];
  isGeoTargeted: boolean;
  targetingType: 'city' | 'country';
  targetCity: string | null;
  targetCountryCode: string | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number;
  dynamicCpmEnabled: boolean;
  dynamicCpmMode: 'CONSERVATIVE' | 'AUTO' | 'AGGRESSIVE';
  minCpm: string;
  maxCpm: string;
}

export default function EditCampaignPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [hasBudgetLocked, setHasBudgetLocked] = useState(false);

  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    landingUrl: '',
    totalBudget: '',
    cpm: '',
    notes: '',
    platforms: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK'],
    isGeoTargeted: false,
    targetingType: 'city',
    targetCity: null,
    targetCountryCode: null,
    targetLatitude: null,
    targetLongitude: null,
    targetRadiusKm: 50,
    dynamicCpmEnabled: false,
    dynamicCpmMode: 'AUTO',
    minCpm: '',
    maxCpm: '',
  });

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch campaign');
        }
        const data = await response.json();
        setCampaign(data.campaign);
        
        const budgetLocked = data.campaign.budgetLock && data.campaign.budgetLock.length > 0;
        setHasBudgetLocked(budgetLocked);

        const campaign = data.campaign;
        setFormData({
          title: campaign.title || '',
          description: campaign.description || '',
          landingUrl: campaign.landingUrl || '',
          totalBudget: campaign.totalBudgetCents ? (campaign.totalBudgetCents / 100).toString() : '',
          cpm: campaign.cpmCents ? (campaign.cpmCents / 100).toString() : '',
          notes: campaign.notes || '',
          platforms: campaign.platforms ? campaign.platforms.split(',') as PlatformType[] : ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK'],
          isGeoTargeted: campaign.isGeoTargeted || false,
          targetingType: 'city',
          targetCity: campaign.targetCity,
          targetCountryCode: campaign.targetCountryCode,
          targetLatitude: campaign.targetLatitude,
          targetLongitude: campaign.targetLongitude,
          targetRadiusKm: campaign.targetRadiusKm || 50,
          dynamicCpmEnabled: campaign.dynamicCpmEnabled || false,
          dynamicCpmMode: campaign.dynamicCpmMode || 'AUTO',
          minCpm: campaign.minCpmCents ? (campaign.minCpmCents / 100).toString() : '',
          maxCpm: campaign.maxCpmCents ? (campaign.maxCpmCents / 100).toString() : '',
        });
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('Failed to load campaign');
        router.push('/dashboard/advertiser');
      } finally {
        setIsLoading(false);
      }
    }

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId, router]);

  const handleSave = async () => {
    if (!formData.title || !formData.landingUrl || !formData.cpm) {
      toast.error('Missing required fields', {
        description: 'Please fill in all required fields',
      });
      return;
    }

    if (formData.platforms.length === 0) {
      toast.error('No platforms selected', {
        description: 'Please select at least one platform',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description || undefined,
        landingUrl: formData.landingUrl,
        platforms: formData.platforms.join(','),
        cpmCents: Math.round(parseFloat(formData.cpm) * 100),
        notes: formData.notes || undefined,
        isGeoTargeted: formData.isGeoTargeted,
        targetCity: formData.isGeoTargeted ? formData.targetCity : null,
        targetCountryCode: formData.isGeoTargeted ? formData.targetCountryCode : null,
        targetLatitude: formData.isGeoTargeted ? formData.targetLatitude : null,
        targetLongitude: formData.isGeoTargeted ? formData.targetLongitude : null,
        targetRadiusKm: formData.isGeoTargeted ? formData.targetRadiusKm : null,
        dynamicCpmEnabled: formData.dynamicCpmEnabled,
        dynamicCpmMode: formData.dynamicCpmEnabled ? formData.dynamicCpmMode : null,
        minCpmCents: formData.dynamicCpmEnabled && formData.minCpm ? Math.round(parseFloat(formData.minCpm) * 100) : null,
        maxCpmCents: formData.dynamicCpmEnabled && formData.maxCpm ? Math.round(parseFloat(formData.maxCpm) * 100) : null,
      };

      if (!hasBudgetLocked && formData.totalBudget) {
        updateData.totalBudgetCents = Math.round(parseFloat(formData.totalBudget) * 100);
      }

      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign');
      }

      toast.success('Campaign updated successfully');
      router.push('/dashboard/advertiser');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/advertiser">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        {hasBudgetLocked && (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Budget Locked</AlertTitle>
            <AlertDescription className="text-amber-700">
              This campaign has allocated funds. Budget cannot be changed but you can edit other details.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="title">Campaign Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Summer Product Launch"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your campaign..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="landingUrl">Landing URL *</Label>
          <Input
            id="landingUrl"
            type="url"
            value={formData.landingUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, landingUrl: e.target.value }))}
            placeholder="your-landing-page.com"
          />
        </div>

        <div>
          <Label>Target Platforms *</Label>
          <p className="text-sm text-gray-500 mb-3">Select platforms for your campaign</p>
          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <div 
                  key={platform.id} 
                  className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const newPlatforms = formData.platforms.includes(platform.id)
                      ? formData.platforms.filter((p) => p !== platform.id)
                      : [...formData.platforms, platform.id];
                    setFormData((prev) => ({ ...prev, platforms: newPlatforms }));
                  }}
                >
                  <Checkbox
                    id={`edit-${platform.id}`}
                    checked={formData.platforms.includes(platform.id)}
                    onCheckedChange={() => {
                      const newPlatforms = formData.platforms.includes(platform.id)
                        ? formData.platforms.filter((p) => p !== platform.id)
                        : [...formData.platforms, platform.id];
                      setFormData((prev) => ({ ...prev, platforms: newPlatforms }));
                    }}
                  />
                  <label htmlFor={`edit-${platform.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    {platform.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            {!hasBudgetLocked ? (
              <>
                <Label htmlFor="totalBudget">Total Budget (€)*</Label>
                <Input
                  id="totalBudget"
                  type="number"
                  value={formData.totalBudget}
                  onChange={(e) => setFormData((prev) => ({ ...prev, totalBudget: e.target.value }))}
                  placeholder="10000"
                />
              </>
            ) : (
              <>
                <Label>Total Budget (€)</Label>
                <div className="p-3 bg-gray-100 rounded-md">
                  <span className="font-medium">
                    {campaign?.totalBudgetCents ? (campaign.totalBudgetCents / 100).toFixed(2) : '0'} €
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Cannot be changed (budget locked)</p>
                </div>
              </>
            )}
          </div>
          <div>
            <Label htmlFor="cpm">CPM Rate (€)*</Label>
            <Input
              id="cpm"
              type="number"
              value={formData.cpm}
              onChange={(e) => setFormData((prev) => ({ ...prev, cpm: e.target.value }))}
              placeholder="15"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.cpm && !isNaN(parseFloat(formData.cpm)) ? `${((parseFloat(formData.cpm) * 100) / 1000).toFixed(2)}€ per view` : '€ per 1000 views'}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Instructions for creators..."
            rows={3}
          />
        </div>

        <div className="border rounded-lg p-6 space-y-4 bg-slate-50 my-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Dynamic CPM</Label>
              <p className="text-xs text-gray-500">Adjust CPM based on creator trust score</p>
            </div>
            <Switch
              checked={formData.dynamicCpmEnabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, dynamicCpmEnabled: checked }))}
            />
          </div>

          {formData.dynamicCpmEnabled && (
            <div className="space-y-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Adjustment Mode</Label>
                <Select
                  value={formData.dynamicCpmMode}
                  onValueChange={(value: 'CONSERVATIVE' | 'AUTO' | 'AGGRESSIVE') => 
                    setFormData((prev) => ({ ...prev, dynamicCpmMode: value }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSERVATIVE">
                      <div>
                        <div className="font-medium">Conservative</div>
                        <div className="text-xs text-gray-500">Small adjustments (±10%)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="AUTO">
                      <div>
                        <div className="font-medium">Auto</div>
                        <div className="text-xs text-gray-500">Balanced adjustments (±25%)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="AGGRESSIVE">
                      <div>
                        <div className="font-medium">Aggressive</div>
                        <div className="text-xs text-gray-500">Large adjustments (±50%)</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minCpm">Min CPM (€)</Label>
                  <Input
                    id="minCpm"
                    type="number"
                    value={formData.minCpm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minCpm: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="maxCpm">Max CPM (€)</Label>
                  <Input
                    id="maxCpm"
                    type="number"
                    value={formData.maxCpm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxCpm: e.target.value }))}
                    placeholder="25"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => router.push('/dashboard/advertiser')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {campaign && campaign.type === 'VIDEO' && campaign.videoSubmissions && campaign.videoSubmissions.length > 0 && (
          <div className="mt-6">
            <VideoSubmissionsManager
              campaignId={campaignId}
              videoSubmissions={campaign.videoSubmissions}
              onRefresh={() => {
                fetch(`/api/campaigns/${campaignId}`)
                  .then(res => res.json())
                  .then(data => setCampaign(data.campaign));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
