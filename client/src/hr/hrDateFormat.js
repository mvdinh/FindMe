const DATE_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
};

const DATETIME_OPTS = {
  ...DATE_OPTS,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

export function formatDateVN(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', DATE_OPTS);
}

export function formatDateTimeVN(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', DATETIME_OPTS);
}
