'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Megaphone, Loader2, ArrowLeft, Save, User, Mail, Calendar, Shield, Camera, Trash2 } from 'lucide-react';
import { useLanguage } from '../translations';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getLocalizedPath = (path: string) => path;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (status !== 'authenticated') return;

      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) throw new Error('Failed to fetch profile');

        const data = await res.json();
        setProfile(data.user);
        setName(data.user.name || '');
        setImagePreview(data.user.image || null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(t('settings.failedLoad'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [status, t]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('settings.invalidImage'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('settings.imageTooLarge'));
      return;
    }

    setError('');
    setIsCompressing(true);
    setCompressionInfo(null);

    const originalSize = file.size;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxWidth = 300;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        const compressedData = canvas.toDataURL('image/jpeg', 0.75);

        const base64Data = compressedData.split(',')[1];
        const compressedSize = Math.round((base64Data.length * 3) / 4);

        if (compressedSize > 500 * 1024) {
          const lowerQualityData = canvas.toDataURL('image/jpeg', 0.5);
          const lowerBase64 = lowerQualityData.split(',')[1];
          const lowerSize = Math.round((lowerBase64.length * 3) / 4);

          if (lowerSize > 500 * 1024) {
            setError(t('settings.imageTooLarge2'));
            setIsCompressing(false);
            return;
          }

          setImagePreview(lowerQualityData);
          setImageData(lowerQualityData);
          setCompressionInfo({ original: originalSize, compressed: lowerSize });
        } else {
          setImagePreview(compressedData);
          setImageData(compressedData);
          setCompressionInfo({ original: originalSize, compressed: compressedSize });
        }

        setIsCompressing(false);
      };
      img.onerror = () => {
        setError(t('settings.failedLoadImage'));
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError(t('settings.failedReadFile'));
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageData(null);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatePayload: { name: string; image?: string; removeImage?: boolean } = { name };

      if (imageData) {
        updatePayload.image = imageData;
      } else if (imagePreview === null && profile?.image) {
        updatePayload.removeImage = true;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Failed to parse server response');
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to update profile (${res.status})`);
      }

      setProfile(data.user);
      setImagePreview(data.user.image || null);
      setImageData(null);
      setCompressionInfo(null);
      setSuccess(t('settings.profileUpdated'));

      try {
        await update({ name: data.user.name, image: data.user.image });
      } catch (updateErr) {
        console.warn('Session update failed:', updateErr);
      }

      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (name) return name.charAt(0).toUpperCase();
    if (profile?.email) return profile.email.charAt(0).toUpperCase();
    return 'U';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47A1F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href={getLocalizedPath('/')} className="flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-[#F47A1F]" />
              <span className="font-bold text-lg text-gray-900">Wayo Ads Market</span>
            </Link>
            <span className="text-gray-400">|</span>
            <h1 className="text-lg font-semibold text-gray-900">{t('settings.title')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={getLocalizedPath('/')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('settings.backToHome')}
            </Button>
          </Link>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('settings.profileInfo')}
              </CardTitle>
              <CardDescription>
                {t('settings.updateInfo')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={imagePreview || undefined} alt={name || 'User'} />
                    <AvatarFallback className="text-2xl bg-[#F47A1F] text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border hover:bg-gray-50 transition-colors"
                    disabled={isCompressing}
                  >
                    {isCompressing ? (
                      <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">
                    {t('settings.uploadPhoto')}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {t('settings.autoResize')}
                  </p>
                  {compressionInfo && (
                    <p className="text-xs text-green-600 mb-2">
                      {t('settings.compressed')} {formatBytes(compressionInfo.original)} → {formatBytes(compressionInfo.compressed)}
                      {' '}({Math.round((1 - compressionInfo.compressed / compressionInfo.original) * 100)}% {t('settings.smaller')})
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {t('settings.uploadPhotoBtn')}
                    </Button>
                    {imagePreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveImage}
                        disabled={isCompressing}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('settings.remove')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('settings.displayName')}</Label>
                  <Input
                    id="name"
                    placeholder={t('settings.enterName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-md bg-green-50 text-green-600 text-sm">
                  {success}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#F47A1F] hover:bg-[#F06423]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('settings.save')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('settings.accountDetails')}
              </CardTitle>
              <CardDescription>
                {t('settings.accountInfo')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('settings.emailAddress')}</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('settings.roles')}</p>
                    <div className="flex gap-2 mt-1">
                      {profile?.roles.split(',').map((role) => (
                        <span
                          key={role}
                          className={`text-xs px-2 py-1 rounded-full ${
                            role === 'SUPERADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : role === 'ADVERTISER'
                              ? 'bg-blue-100 text-blue-700'
                              : role === 'CREATOR'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('settings.memberSince')}</p>
                    <p className="font-medium">
                      {profile?.createdAt ? formatDate(profile.createdAt) : t('settings.na')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.quickLinks')}</CardTitle>
              <CardDescription>
                {t('settings.navigateDashboards')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {profile?.roles.includes('ADVERTISER') && (
                  <Link href={getLocalizedPath('/dashboard/advertiser')}>
                    <Button variant="outline">{t('settings.advertiserDashboard')}</Button>
                  </Link>
                )}
                {profile?.roles.includes('CREATOR') && (
                  <Link href={getLocalizedPath('/dashboard/creator')}>
                    <Button variant="outline">{t('settings.creatorDashboard')}</Button>
                  </Link>
                )}
                {profile?.roles.includes('SUPERADMIN') && (
                  <Link href={getLocalizedPath('/dashboard/admin')}>
                    <Button variant="outline" className="border-purple-500 text-purple-600">
                      {t('settings.adminDashboard')}
                    </Button>
                  </Link>
                )}
                <Link href={getLocalizedPath('/campaigns')}>
                  <Button variant="outline">{t('settings.browseCampaigns')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
