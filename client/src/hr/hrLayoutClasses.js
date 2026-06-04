import { cn } from '@/lib/utils';

/** @see ./hrTheme.js — token theme (shadcn) */

export const HR_PAGE = cn(
  'max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
);

export const HR_PAGE_HEADER = cn(
  'mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'
);

export const HR_H1 = cn(
  "font-['Open_Sans'] text-2xl sm:text-3xl font-bold tracking-tight text-foreground transition-colors duration-300"
);

export const HR_SUBTITLE = cn(
  "font-['Roboto'] mt-1.5 sm:mt-2 text-sm sm:text-base text-muted-foreground transition-colors duration-300"
);

export const HR_FILTER_CHIPS = cn(
  'hr-scroll-x flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0'
);

export const HR_TABLE_WRAP = '-mx-3 px-0 sm:mx-0 sm:px-0';

/** Native controls — cùng token shadcn Input */
export { ADMIN_NATIVE_FIELD as HR_NATIVE_FIELD } from '../admin/adminLayoutClasses';
