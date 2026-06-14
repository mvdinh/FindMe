import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl'
};

/**
 * Modal khu Recruiter — shadcn Dialog (API tương thích RecruiterModal cũ).
 */
export default function RecruiterModal({
  open,
  onClose,
  title,
  subtitle,
  header,
  children,
  footer,
  footerClassName = '',
  size = 'lg',
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  panelClassName = '',
  bodyClassName = '',
  zClass = 'z-[100]'
}) {
  const handleOpenChange = React.useCallback(
    next => {
      if (!next) onClose();
    },
    [onClose]
  );

  const hasHeaderBlock = header != null || title || subtitle;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!hideCloseButton}
        className={cn(
          zClass,
          'flex max-h-[min(90dvh,calc(100dvh-1.25rem))] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-none',
          SIZE_CLASS[size] || SIZE_CLASS.lg,
          panelClassName
        )}
        onPointerDownOutside={e => {
          if (!closeOnBackdrop) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (!closeOnEscape) e.preventDefault();
        }}
      >
        {header != null ? (
          <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-4 text-left sm:px-5">
            {header}
          </DialogHeader>
        ) : hasHeaderBlock ? (
          <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-4 text-left sm:px-5">
            {title ? (
              <DialogTitle className="font-['Open_Sans'] text-lg font-semibold sm:text-xl">{title}</DialogTitle>
            ) : null}
            {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
          </DialogHeader>
        ) : null}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5',
            !hasHeaderBlock && !hideCloseButton ? 'pt-10' : '',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className={cn('shrink-0 border-t bg-muted/50 px-4 py-3 sm:px-5', footerClassName)}>{footer}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
