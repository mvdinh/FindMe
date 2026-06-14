const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  getIO
} = require('../socket');

/**
 * Service: Tạo mới một thông báo trong cơ sở dữ liệu và phát (emit) sự kiện
 * qua Socket.IO tới các client đang kết nối (để hiển thị thông báo realtime).
 */
async function createAndEmit({
  toUserId,
  toRole,
  type,
  title,
  message,
  actionUrl,
  entity,
  priority = 'low',
  metadata,
  createdBy
}) {
  console.log('📧 Creating notification:', {
    toUserId,
    toRole,
    type,
    title
  });
  const notif = new Notification({
    user: toUserId || undefined,
    role: toRole || undefined,
    type,
    title,
    message,
    actionUrl,
    entity,
    priority,
    metadata,
    createdBy
  });
  await notif.save();

  try {
    const io = getIO();
    if (io) {
      const rooms = [];
      if (toUserId) rooms.push(`user:${toUserId.toString()}`);
      rooms.forEach(room => {
        io.to(room).emit('notifications:new', {
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          createdAt: notif.createdAt
        });
      });
    }
  } catch (e) {}

  return notif;
}

/**
 * Service: Gửi thông báo hàng loạt (Broadcast) tới toàn bộ người dùng
 * thuộc một nhóm quyền (role) cụ thể (ví dụ: gửi cho tất cả Admin).
 */
async function broadcastToRole(role, payload) {
  const users = await User.find({
    role
  }).select('_id');
  const promises = users.map(u =>
    createAndEmit({
      ...payload,
      toUserId: u._id,
      toRole: role
    })
  );
  return Promise.all(promises);
}

module.exports = {
  createAndEmit,
  broadcastToRole
};
