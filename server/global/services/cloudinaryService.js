const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');

/**
 * Hàm phụ trợ: Ghi log (in ra console) cho các tiến trình của Cloudinary
 * chỉ khi biến môi trường CLOUDINARY_LOG=true.
 */
function cloudLog(...args) {
  if (String(process.env.CLOUDINARY_LOG || '').toLowerCase() !== 'true') return;
  console.log('[CLOUDINARY]', ...args);
}

/**
 * Hàm phụ trợ: Kiểm tra xem các biến môi trường (API Key, Cloud Name, API Secret)
 * đã được cài đặt đầy đủ chưa, nếu chưa sẽ báo lỗi.
 */
function ensureConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
    err.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
}

/**
 * Hàm phụ trợ: Upload một tệp dữ liệu dạng Buffer (nhị phân) lên Cloudinary
 * thông qua phương thức upload_stream (để tránh rò rỉ bộ nhớ khi tải file lớn).
 */
function uploadBuffer(buffer, options = {}) {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const {
      folder = 'findme',
      publicId,
      resourceType = 'raw',
      originalFilename,
      overwrite = false
    } = options;

    cloudLog('upload:start', {
      folder,
      publicId,
      resourceType,
      overwrite,
      bytes: Buffer.isBuffer(buffer) ? buffer.length : undefined,
      originalFilename
    });

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite,
        use_filename: !publicId,
        unique_filename: !publicId,
        original_filename: originalFilename
      },
      (error, result) => {
        if (error) {
          cloudLog('upload:fail', {
            publicId,
            resourceType,
            message: error?.message,
            http_code: error?.http_code,
            name: error?.name
          });
          return reject(error);
        }
        cloudLog('upload:success', {
          publicId: result?.public_id,
          resourceType: result?.resource_type,
          bytes: result?.bytes,
          url: result?.secure_url || result?.url
        });
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

/**
 * Service: Tải file CV (Buffer) của ứng viên lên Cloudinary.
 * Tự động tạo tên file có chứa ID người dùng và timestamp để đảm bảo tính duy nhất (publicId).
 */
async function uploadResumeBuffer(buffer, { userId, originalName, mimeType } = {}) {
  const safeUserId = userId ? String(userId) : 'anonymous';
  const timestamp = Date.now();
  const safeOriginal = originalName ? String(originalName).replace(/[^\w.\-() ]+/g, '').slice(0, 120) : 'resume';
  const parsed = path.parse(safeOriginal);
  const baseNameNoExt = (parsed?.name || safeOriginal || 'resume').slice(0, 80);
  const publicId = `resumes/${safeUserId}_${timestamp}_${baseNameNoExt}`;
  cloudLog('resume:prepare', { userId: safeUserId, mimeType, originalName, safeOriginal, publicId });
  const result = await uploadBuffer(buffer, {
    folder: 'findme',
    publicId,
    resourceType: 'raw',
    originalFilename: baseNameNoExt,
    overwrite: true
  });
  return {
    url: result?.secure_url || result?.url,
    publicId: result?.public_id,
    bytes: result?.bytes,
    format: result?.format,
    resourceType: result?.resource_type
  };
}

/**
 * Service: Lấy thông tin tài nguyên (Resource) từ Cloudinary thông qua API.
 * Thường dùng để làm mới link (Refresh URL) trong trường hợp link cũ bị hỏng hoặc hết hạn.
 */
async function getResource(publicId, resourceType = 'raw') {
  if (!publicId) return null;
  ensureConfigured();
  cloudLog('resource:get', { publicId, resourceType });
  return cloudinary.api.resource(publicId, { resource_type: resourceType });
}

/**
 * Service: Xóa một file (dựa trên publicId) khỏi máy chủ Cloudinary.
 */
async function deleteByPublicId(publicId, resourceType = 'raw') {
  if (!publicId) return null;
  ensureConfigured();
  cloudLog('delete:start', { publicId, resourceType });
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  uploadResumeBuffer,
  getResource,
  deleteByPublicId
};

