/**
 * Lớp form Recruiter — căn shadcn Input/Textarea/Button (theme).
 * Applicant re-export từ đây; giữ tên export cũ.
 */
import { cn } from '@/lib/utils';

export const HR_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const HR_INPUT = cn(
  "flex w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_TEXTAREA = cn(
  "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_INPUT_PILL = cn(
  "flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_TEXTAREA_PILL = cn(
  "flex min-h-[120px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_INPUT_ROUNDED_L = cn(
  "flex-1 rounded-l-md rounded-r-none border border-input border-r-0 bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_FILTER_CONTROL = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']",
  HR_FOCUS_RING
);

export const HR_BTN_PRIMARY = cn(
  "inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 font-['Roboto']"
);

export const HR_BTN_SECONDARY = cn(
  "inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted font-['Roboto']"
);

export const HR_BTN_PRIMARY_SM = cn(
  "inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 font-['Roboto']"
);

export const HR_BTN_SECONDARY_SM = cn(
  "inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 font-['Roboto']"
);

/** Track toggle iOS (checkbox `peer` + div kế bên) — ATS / resume trong CreateJob */
export const HR_TOGGLE_TRACK = cn(
  'relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors duration-300',
  "after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:shadow-sm after:transition-all after:content-['']",
  'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring/25',
  'peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white'
);
