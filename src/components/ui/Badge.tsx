import { cn, statusColors } from '@/lib/utils';

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export default function Badge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn('badge', statusColors[status] || 'bg-gray-100 text-gray-600', className)}>
      {label || status.replace(/_/g, ' ')}
    </span>
  );
}
