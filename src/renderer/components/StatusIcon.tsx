import { Check, CircleDot, Circle, X } from 'lucide-react';
import type { Issue } from '@shared/types';

interface Props {
  category: Issue['statusCategory'];
  className?: string;
}

export function StatusIcon({ category, className = 'h-3.5 w-3.5' }: Props) {
  switch (category) {
    case 'done':
      return <Check className={className + ' text-accent-green'} />;
    case 'indeterminate':
      return <CircleDot className={className + ' text-accent-yellow'} />;
    case 'todo':
      return <Circle className={className + ' text-fg-muted'} />;
    default:
      return <X className={className + ' text-fg-subtle'} />;
  }
}
