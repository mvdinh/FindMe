/**
 * Mã tuyển dụng: id tin đăng (job) — trả về đúng chuỗi từ API, không thêm tiền tố hay ký tự.
 */
export function recruitmentJobIdRaw(job) {
  if (job == null) return '';
  const id = job.id ?? job._id;
  if (id == null || id === '') return '';
  return String(id);
}
