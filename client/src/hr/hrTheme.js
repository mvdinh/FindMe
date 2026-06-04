/**
 * Lớp hiển thị trạng thái / điểm HR — token theme (shadcn), dùng chung admin & HR.
 */
export function hrStatusBadgeClass(status) {
  const s = (status || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  switch (s) {
    case 'active':
      return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'scheduled':
    case 'confirmed':
      return 'border border-primary/25 bg-primary/10 text-primary';
    case 'draft':
      return 'bg-secondary text-secondary-foreground';
    case 'closed':
      return 'border border-primary/30 bg-primary/15 text-primary';
    case 'inactive':
      return 'border border-destructive/30 bg-destructive/10 text-destructive';
    case 'archived':
      return 'bg-muted text-muted-foreground';
    case 'under_review':
    case 'shortlisted':
      return 'bg-accent text-accent-foreground';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    case 'interview_scheduled':
      return 'bg-primary/90 text-primary-foreground';
    case 'interview_confirmed':
      return 'bg-primary text-primary-foreground';
    case 'interview_passed':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100';
    case 'interview_failed':
      return 'bg-destructive text-destructive-foreground';
    case 'completed':
      return 'bg-muted text-foreground';
    case 'submitted':
      return 'bg-secondary text-secondary-foreground';
    case 'offer_accepted':
    case 'hired':
      return 'bg-primary text-primary-foreground';
    case 'offer_declined':
      return 'bg-secondary text-secondary-foreground';
    case 'withdrawn':
      return 'bg-muted/80 text-muted-foreground';
    default:
      return 'bg-muted/50 text-muted-foreground';
  }
}

export function hrScoreTextClass(score) {
  if (score >= 8.5) return 'font-semibold text-primary';
  if (score >= 7.0) return 'text-foreground';
  return 'text-muted-foreground';
}
