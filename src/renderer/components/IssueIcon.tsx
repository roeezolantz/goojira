import {
  Bookmark,
  Bug,
  CheckSquare,
  Layers,
  Zap,
  ListTree,
} from 'lucide-react';
import type { IssueType } from '@shared/types';

interface Props {
  type: IssueType;
  className?: string;
}

export function IssueIcon({ type, className = 'h-3.5 w-3.5' }: Props) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('bug')) return <Bug className={className + ' text-accent-red'} />;
  if (t.includes('story')) return <Bookmark className={className + ' text-accent-green'} />;
  if (t.includes('epic')) return <Zap className={className + ' text-accent-purple'} />;
  if (t.includes('sub')) return <ListTree className={className + ' text-fg-muted'} />;
  if (t.includes('spike')) return <Layers className={className + ' text-accent-yellow'} />;
  return <CheckSquare className={className + ' text-accent'} />;
}
