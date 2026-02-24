'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type VideoStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'FLAGGED' | 'REJECTED' | 'COMPLETED';

interface VideoStatusBadgeProps {
  status: VideoStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100',
  },
  ACTIVE: {
    label: 'Active',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
  },
  PAUSED: {
    label: 'Paused',
    variant: 'outline' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100',
  },
  FLAGGED: {
    label: 'Flagged',
    variant: 'outline' as const,
    className: 'bg-red-100 text-red-800 border-red-300 border-2 hover:bg-red-100',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-100',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100',
  },
};

export function VideoStatusBadge({ status, className, showLabel = true }: VideoStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showLabel ? config.label : status}
    </Badge>
  );
}

interface VideoStatusDisplayProps {
  status: VideoStatus;
  rejectionReason?: string | null;
  flagReason?: string | null;
  className?: string;
}

export function VideoStatusDisplay({ 
  status, 
  rejectionReason, 
  flagReason,
  className 
}: VideoStatusDisplayProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <VideoStatusBadge status={status} />
      
      {status === 'REJECTED' && rejectionReason && (
        <div className="text-sm text-red-600 p-2 bg-red-50 rounded border border-red-100">
          <span className="font-medium">Rejection Reason:</span> {rejectionReason}
        </div>
      )}
      
      {status === 'FLAGGED' && flagReason && (
        <div className="text-sm text-orange-600 p-2 bg-orange-50 rounded border border-orange-100">
          <span className="font-medium">Flag Reason:</span> {flagReason}
        </div>
      )}
    </div>
  );
}
