'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
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
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Video, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VideoRequirements {
  minDurationSeconds?: number;
  requiredPlatform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
  allowMultiplePosts?: boolean;
}

interface VideoSubmissionFormProps {
  campaignId: string;
  videoRequirements: VideoRequirements | null;
  onSuccess?: () => void;
}

const submissionSchema = z.object({
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'TWITCH'] as const, {
    message: 'Please select a platform',
  }),
  postUrl: z.string().url('Please enter a valid URL').min(1, 'Video URL is required'),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

export function VideoSubmissionForm({
  campaignId,
  videoRequirements,
  onSuccess,
}: VideoSubmissionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      platform: videoRequirements?.requiredPlatform || 'YOUTUBE',
      postUrl: '',
    },
  });

  const onSubmit = async (data: SubmissionFormData) => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch(`/api/creator/campaigns/${campaignId}/submit-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit video',
        });
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: result.error || 'Failed to submit video',
        });
        return;
      }

      setSubmitResult({
        success: true,
        message: result.message || 'Video submitted successfully!',
      });

      toast({
        title: 'Video Submitted',
        description: 'Your video has been submitted for review.',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitResult({
        success: false,
        message: errorMessage,
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePlatforms = videoRequirements?.requiredPlatform
    ? [videoRequirements.requiredPlatform]
    : ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];

  return (
    <div className="space-y-4">
      {submitResult && (
        <Alert variant={submitResult.success ? 'default' : 'destructive'}>
          {submitResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {submitResult.success ? 'Success' : 'Submission Failed'}
          </AlertTitle>
          <AlertDescription>{submitResult.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!videoRequirements?.requiredPlatform || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform.charAt(0) + platform.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {videoRequirements?.requiredPlatform && (
                  <p className="text-xs text-gray-500">
                    This campaign requires {videoRequirements.requiredPlatform}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      form.watch('platform') === 'YOUTUBE'
                        ? 'https://youtube.com/watch?v=...'
                        : form.watch('platform') === 'TIKTOK'
                        ? 'https://tiktok.com/@user/video/...'
                        : 'https://instagram.com/reel/...'
                    }
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {videoRequirements?.minDurationSeconds && (
            <p className="text-xs text-gray-500">
              Video must be at least {videoRequirements.minDurationSeconds} seconds long
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Submit Video
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

interface SubmitVideoButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SubmitVideoButton({ onClick, disabled }: SubmitVideoButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled} className="bg-green-600 hover:bg-green-700">
      <Video className="h-4 w-4 mr-2" />
      Submit Video
    </Button>
  );
}
