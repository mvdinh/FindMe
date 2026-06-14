
let lockCount = 0;
let savedBodyOverflow = '';

export function lockRecruiterBodyScroll() {
  if (lockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

export function unlockRecruiterBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
  }
}
