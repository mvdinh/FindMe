/**
 * Lớp hiển thị trạng thái / điểm Recruiter — token theme (shadcn), dùng chung admin & Recruiter.
 */
export function recruiterStatusBadgeClass(status) {
  const s = (status || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  switch (s) {
    case 'active':
      return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'scheduled':
    case 'confirmed':
      return 'border border-primary/25 bg-primary/10 text-primary';
    case 'pending_approval':
      return 'border border-destructive/20 bg-destructive/10 text-destructive';
    case 'draft':
      return 'bg-secondary text-secondary-foreground';
    case 'closed':
      return 'border border-primary/30 bg-primary/15 text-primary';

    case 'archived':
      return 'bg-muted text-muted-foreground';
    case 'offer_accepted':
    case 'hired':
      return 'border border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300';
    case 'under_review':
    case 'shortlisted':
    case 'rejected':
    case 'interview_scheduled':
    case 'interview_confirmed':
    case 'interview_passed':
    case 'interview_failed':
    case 'completed':
    case 'submitted':
    case 'offer_extended':
    case 'offer_declined':
    case 'withdrawn':
      return 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300';
    default:
      return 'bg-muted/50 text-muted-foreground';
  }
}

export function recruiterScoreTextClass(score) {
  if (score >= 8.5) return 'font-semibold text-primary';
  if (score >= 7.0) return 'text-foreground';
  return 'text-muted-foreground';
}
