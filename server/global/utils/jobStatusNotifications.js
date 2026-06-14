const User = require("../models/User");
const {
  createAndEmit,
  broadcastToRole,
} = require("../services/notificationService");
const STATUS_VI = {
  active: "đang hoạt động",
  closed: "đã đóng",

  draft: "bản nháp",
};
function statusLabel(s) {
  return STATUS_VI[s] || s || "";
}
async function notifyActorAndPeerRoleOnStatusChange({
  actorUserId,
  actorRole,
  jobId,
  jobTitle,
  previousStatus,
  newStatus,
}) {
  if (!actorUserId || !jobId) return;
  if (String(previousStatus || "") === String(newStatus || "")) return;
  const ar = String(actorRole || "").toLowerCase();
  if (ar !== "recruiter" && ar !== "admin") return;
  try {
    const actor = await User.findById(actorUserId)
      .select("firstName lastName")
      .lean();
    const actorName = actor
      ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
        "Người dùng"
      : "Người dùng";
    const newL = statusLabel(newStatus);
    const selfPath = ar === "admin" ? "/admin/jobs" : "/recruiter/jobs";
    if (ar !== "admin") {
      await createAndEmit({
        toUserId: actorUserId,
        toRole: ar,
        type: "job",
        title: "Đã cập nhật trạng thái tin",
        message: `Bạn đã đổi "${jobTitle}" sang: ${newL}.`,
        actionUrl: selfPath,
        entity: {
          kind: "job",
          id: jobId,
        },
        priority: "low",
        createdBy: actorUserId,
      });
    }
    const peerRole = ar === "recruiter" ? "admin" : "recruiter";
    const peerTitle =
      ar === "recruiter"
        ? "Nhà tuyển dụng cập nhật trạng thái tin"
        : "Admin cập nhật trạng thái tin";
    const peerUrl = peerRole === "admin" ? "/admin/jobs" : "/recruiter/jobs";
    await broadcastToRole(peerRole, {
      type: "job",
      title: peerTitle,
      message: `${actorName} đã đổi "${jobTitle}" sang ${newL}.`,
      actionUrl: peerUrl,
      entity: {
        kind: "job",
        id: jobId,
      },
      priority: "medium",
      createdBy: actorUserId,
    });
  } catch (e) {
    console.error("notifyActorAndPeerRoleOnStatusChange:", e);
  }
}
module.exports = {
  statusLabel,
  notifyActorAndPeerRoleOnStatusChange,
};
