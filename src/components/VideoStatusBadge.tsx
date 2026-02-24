import { Globe, Lock, EyeOff, Loader2, HelpCircle } from 'lucide-react';

interface VideoStatusBadgeProps {
  status: string | null | undefined;
  showText?: boolean;
  isLoading?: boolean;
}

export function VideoStatusBadge({ status, showText = true, isLoading = false }: VideoStatusBadgeProps) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        {showText && <span>Checking...</span>}
      </span>
    );
  }

  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <EyeOff className="h-3 w-3" />
        {showText && <span>Not Verified</span>}
      </span>
    );
  }

  const config: Record<string, { className: string; icon: typeof Globe; label: string }> = {
    public: {
      className: 'bg-green-100 text-green-700 border border-green-200',
      icon: Globe,
      label: 'PUBLIC',
    },
    unlisted: {
      className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      icon: EyeOff,
      label: 'UNLISTED',
    },
    private: {
      className: 'bg-red-100 text-red-700 border border-red-200',
      icon: Lock,
      label: 'PRIVATE',
    },
    PENDING: {
      className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      icon: HelpCircle,
      label: 'PENDING',
    },
    APPROVED: {
      className: 'bg-green-100 text-green-700 border border-green-200',
      icon: Globe,
      label: 'APPROVED',
    },
    REJECTED: {
      className: 'bg-red-100 text-red-700 border border-red-200',
      icon: Lock,
      label: 'REJECTED',
    },
    FLAGGED: {
      className: 'bg-orange-100 text-orange-700 border border-orange-200',
      icon: HelpCircle,
      label: 'FLAGGED',
    },
    ACTIVE: {
      className: 'bg-green-100 text-green-700 border border-green-200',
      icon: Globe,
      label: 'ACTIVE',
    },
  };

  const statusConfig = config[status] || {
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
    icon: HelpCircle,
    label: status.toUpperCase(),
  };

  const { className, icon: Icon, label } = statusConfig;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {showText && <span>{label}</span>}
    </span>
  );
}
