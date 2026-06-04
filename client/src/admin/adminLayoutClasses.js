import { cn } from '@/lib/utils';

/** Khung trang admin — padding + max-width (shadcn: nền từ layout) */
export const ADMIN_PAGE = cn(
  'max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
);

export const ADMIN_PAGE_HEADER = cn(
  'mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'
);

export const ADMIN_H1 = cn(
  "font-['Open_Sans'] text-2xl sm:text-3xl font-bold tracking-tight text-foreground transition-colors duration-300"
);

export const ADMIN_SUBTITLE = cn(
  "font-['Roboto'] mt-1.5 sm:mt-2 text-sm sm:text-base text-muted-foreground transition-colors duration-300"
);

/** Select/date native — cùng token với shadcn Input (dùng khi chưa gắn Radix Select). */
export const ADMIN_NATIVE_FIELD = cn(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30 font-['Roboto']"
);

export { HR_FILTER_CHIPS, HR_TABLE_WRAP } from '../hr/hrLayoutClasses';
