const Job = require("../models/Job");
const Company = require("../models/Company");
const JobStatusChangeRequest = require("../models/JobStatusChangeRequest");
const User = require("../models/User");
const {
  broadcastToRole,
  createAndEmit,
} = require("../services/notificationService");
const { statusLabel } = require("../utils/jobStatusNotifications");
const AUTO_LOCK_THRESHOLD = 5;
const ALLOWED_TARGET = ["active", "closed", "draft"];

/**
 * API Endpoint: Nhà tuyển dụng (Recruiter) gửi yêu cầu (Request) để thay đổi trạng thái của tin tuyển dụng.
 * - Chỉ áp dụng khi tin tuyển dụng trước đó đã bị Admin thay đổi trạng thái, khiến Recruiter mất quyền tự đổi.
 * - Yêu cầu sẽ được chuyển vào trạng thái "pending" (chờ duyệt) và gửi thông báo tới Admin.
 */
const submitRecruiterRequest = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Chỉ tài khoản Nhà tuyển dụng mới gửi yêu cầu duyệt trạng thái.",
      });
    }
    const { requestedStatus, message } = req.body;
    if (!ALLOWED_TARGET.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái đề xuất không hợp lệ",
      });
    }
    if (requestedStatus === "closed") {
      return res.status(400).json({
        success: false,
        message:
          "Đóng tin do Nhà tuyển dụng thực hiện trực tiếp, không cần gửi yêu cầu duyệt.",
      });
    }
    const text = typeof message === "string" ? message.trim() : "";
    if (text.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do / nội dung đề xuất (tối thiểu 10 ký tự).",
      });
    }
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    if (job.lastStatusActorRole !== "admin") {
      return res.status(400).json({
        success: false,
        message:
          "Tin này chưa bị quản trị viên khóa thao tác trạng thái — bạn có thể đổi trực tiếp.",
      });
    }
    if (job.status === requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "Tin đã ở trạng thái này.",
      });
    }
    const existing = await JobStatusChangeRequest.findOne({
      job: job._id,
      reviewStatus: "pending",
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Đã có yêu cầu đang chờ admin duyệt cho tin này.",
      });
    }
    const doc = await JobStatusChangeRequest.create({
      job: job._id,
      requestedBy: req.user.id,
      requestedStatus,
      previousStatus: job.status,
      message: text,
    });
    const recruiterUser = await User.findById(req.user.id).select(
      "firstName lastName",
    );
    const recruiterName = recruiterUser
      ? `${recruiterUser.firstName || ""} ${recruiterUser.lastName || ""}`.trim() ||
        "Nhà tuyển dụng"
      : "Nhà tuyển dụng";
    try {
      await broadcastToRole("admin", {
        type: "job",
        title: "Nhà tuyển dụng xin duyệt đổi trạng thái tin",
        message: `${recruiterName} đề xuất đổi "${job.title}" sang "${requestedStatus}".`,
        actionUrl: "/admin/job-status-requests",
        entity: {
          kind: "job",
          id: job._id,
          extra: {
            requestId: doc._id.toString(),
          },
        },
        priority: "medium",
        createdBy: req.user.id,
      });
    } catch (e) {
      console.error("Notify admins (status request):", e);
    }
    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu tới quản trị viên.",
      data: {
        id: doc._id,
        jobId: job._id,
        requestedStatus,
        reviewStatus: doc.reviewStatus,
      },
    });
  } catch (error) {
    console.error("submitRecruiterRequest:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * API Endpoint: Lấy danh sách các yêu cầu đang chờ duyệt (pending) do chính Recruiter hiện tại gửi.
 * Dành cho giao diện quản lý yêu cầu bên phía Recruiter.
 */
const listPendingForRecruiter = async (req, res) => {
  try {
    const list = await JobStatusChangeRequest.find({
      requestedBy: req.user.id,
      reviewStatus: "pending",
    })
      .populate("job", "title status")
      .sort({
        createdAt: -1,
      })
      .lean();
    res.json({
      success: true,
      data: list.map((r) => ({
        id: r._id,
        jobId:
          r.job?._id != null
            ? String(r.job._id)
            : r.job != null
              ? String(r.job)
              : null,
        jobTitle: r.job?.title,
        currentJobStatus: r.job?.status,
        requestedStatus: r.requestedStatus,
        message: r.message,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("listPendingForRecruiter:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * API Endpoint: Lấy danh sách tất cả các yêu cầu đang chờ duyệt (pending) trên toàn hệ thống.
 * Dành cho giao diện Admin. Có hỗ trợ phân trang.
 */
const listPendingForAdmin = async (req, res) => {
  try {
    const filter = {
      reviewStatus: "pending",
    };
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const totalItems = await JobStatusChangeRequest.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const skip = (page - 1) * limit;
    const list = await JobStatusChangeRequest.find(filter)
      .populate({
        path: "job",
        select: "title status department lastStatusActorRole company",
        populate: {
          path: "company",
          select: "name",
        },
      })
      .populate("requestedBy", "firstName lastName email")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: list.map((r) => ({
        id: r._id,
        jobId:
          r.job?._id != null
            ? String(r.job._id)
            : r.job != null
              ? String(r.job)
              : null,
        jobTitle: r.job?.title,
        jobStatus: r.job?.status,
        department: r.job?.department,
        requestedStatus: r.requestedStatus,
        previousStatus: r.previousStatus,
        message: r.message,
        companyName: r.job?.company?.name,
        requestedByName: r.requestedBy
          ? `${r.requestedBy.firstName || ""} ${r.requestedBy.lastName || ""}`.trim()
          : "",
        requestedByEmail: r.requestedBy?.email,
        createdAt: r.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("listPendingForAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * API Endpoint: Quản trị viên (Admin) phê duyệt (Approve) yêu cầu thay đổi trạng thái tin tuyển dụng.
 * - Cập nhật trạng thái tin thành trạng thái được yêu cầu.
 * - Đánh dấu yêu cầu là "approved" kèm theo ghi chú (nếu có).
 * - Gửi thông báo lại cho Recruiter đã gửi yêu cầu.
 */
const approveRequest = async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      reviewStatus: "pending",
    };
    const reqDoc = await JobStatusChangeRequest.findOne(filter);
    if (!reqDoc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu hoặc đã xử lý.",
      });
    }
    const job = await Job.findById(reqDoc.job);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Tin tuyển dụng không còn tồn tại.",
      });
    }
    const previousStatus = job.status;
    job.status = reqDoc.requestedStatus;
    job.lastStatusActorRole = "recruiter";
    job.updatedAt = new Date();
    if (
      reqDoc.requestedStatus === "active" &&
      previousStatus === "draft" &&
      !job.publishedAt
    ) {
      job.publishedAt = new Date();
    }
    await job.save();
    reqDoc.reviewStatus = "approved";
    reqDoc.reviewedBy = req.user.id;
    reqDoc.reviewNote =
      typeof req.body?.reviewNote === "string"
        ? req.body.reviewNote.trim().slice(0, 1000)
        : "";
    await reqDoc.save();
    try {
      const adminUser = await User.findById(req.user.id)
        .select("firstName lastName")
        .lean();
      const adminName = adminUser
        ? `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() ||
          "Quản trị viên"
        : "Quản trị viên";
      const st = statusLabel(reqDoc.requestedStatus);
      await createAndEmit({
        toUserId: req.user.id,
        toRole: "admin",
        type: "job",
        title: "Bạn đã duyệt yêu cầu",
        message: `Bạn đã duyệt đổi trạng thái "${job.title}" sang ${st}.`,
        actionUrl: "/admin/job-status-requests",
        entity: {
          kind: "job",
          id: job._id,
          extra: {
            requestId: reqDoc._id.toString(),
          },
        },
        priority: "low",
        createdBy: req.user.id,
      });
      await createAndEmit({
        toUserId: reqDoc.requestedBy,
        toRole: "recruiter",
        type: "job",
        title: "Yêu cầu đổi trạng thái đã được duyệt",
        message: `${adminName} đã duyệt đề xuất của bạn. "${job.title}" hiện là ${st}.`,
        actionUrl: "/recruiter/jobs",
        entity: {
          kind: "job",
          id: job._id,
        },
        priority: "medium",
        createdBy: req.user.id,
      });
    } catch (e) {
      console.error("approveRequest notify:", e);
    }
    res.json({
      success: true,
      message: "Đã duyệt và cập nhật trạng thái tin.",
      data: {
        jobId: job._id,
        status: job.status,
        requestId: reqDoc._id,
      },
    });
  } catch (error) {
    console.error("approveRequest:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * API Endpoint: Quản trị viên (Admin) từ chối (Reject) yêu cầu thay đổi trạng thái tin tuyển dụng.
 * - Bắt buộc Admin phải nhập lý do (reviewNote).
 * - Đánh dấu yêu cầu là "rejected" và gửi thông báo lại cho Recruiter.
 */
const rejectRequest = async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      reviewStatus: "pending",
    };
    const reqDoc = await JobStatusChangeRequest.findOne(filter);
    if (!reqDoc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu hoặc đã xử lý.",
      });
    }
    const note =
      typeof req.body?.reviewNote === "string"
        ? req.body.reviewNote.trim().slice(0, 1000)
        : "";
    if (note.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự).",
      });
    }
    reqDoc.reviewStatus = "rejected";
    reqDoc.reviewedBy = req.user.id;
    reqDoc.reviewNote = note;
    await reqDoc.save();
    const jobForTitle = await Job.findById(reqDoc.job).select("title").lean();
    const jobTitle = jobForTitle?.title || "tin tuyển dụng";
    try {
      const adminUser = await User.findById(req.user.id)
        .select("firstName lastName")
        .lean();
      const adminName = adminUser
        ? `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() ||
          "Quản trị viên"
        : "Quản trị viên";
      await createAndEmit({
        toUserId: req.user.id,
        toRole: "admin",
        type: "job",
        title: "Bạn đã từ chối yêu cầu",
        message: `Bạn đã từ chối đề xuất đổi trạng thái "${jobTitle}".`,
        actionUrl: "/admin/job-status-requests",
        entity: {
          kind: "job",
          id: reqDoc.job,
        },
        priority: "low",
        createdBy: req.user.id,
      });
      await createAndEmit({
        toUserId: reqDoc.requestedBy,
        toRole: "recruiter",
        type: "job",
        title: "Yêu cầu đổi trạng thái bị từ chối",
        message: `${adminName} đã từ chối đề xuất của bạn cho "${jobTitle}". Ghi chú: ${note}`,
        actionUrl: "/recruiter/jobs",
        entity: {
          kind: "job",
          id: reqDoc.job,
        },
        priority: "medium",
        createdBy: req.user.id,
      });
    } catch (e) {
      console.error("rejectRequest notify:", e);
    }

    // === AUTO-LOCK: Tăng rejectionCount của company, nếu >= 5 thì tự động khóa ===
    try {
      const rejectedJob = await Job.findById(reqDoc.job)
        .select("company postedBy")
        .lean();
      if (rejectedJob && rejectedJob.company) {
        const updatedCompany = await Company.findByIdAndUpdate(
          rejectedJob.company,
          { $inc: { jobRejectionCount: 1 } },
          { new: true },
        );
        if (
          updatedCompany &&
          updatedCompany.jobRejectionCount >= AUTO_LOCK_THRESHOLD &&
          updatedCompany.verificationStatus !== "locked"
        ) {
          updatedCompany.verificationStatus = "locked";
          updatedCompany.lockReason = `Tự động khóa: Tin tuyển dụng bị từ chối quá ${AUTO_LOCK_THRESHOLD} lần.`;
          updatedCompany.lockedAt = new Date();
          updatedCompany.lockedBy = req.user.id;
          await updatedCompany.save();

          // Ẩn tất cả tin active
          await Job.updateMany(
            { company: updatedCompany._id, status: "active" },
            { $set: { status: "closed", lastStatusActorRole: "admin" } },
          );

          // Thông báo cho recruiter
          await createAndEmit({
            toUserId: updatedCompany.createdBy,
            type: "system",
            title: "Tài khoản doanh nghiệp bị khóa tự động",
            message: `Tài khoản doanh nghiệp "${updatedCompany.name}" đã bị khóa tự động do vi phạm quy định đăng tin quá ${AUTO_LOCK_THRESHOLD} lần. Vui lòng gửi yêu cầu mở khóa.`,
            actionUrl: "/recruiter/profile",
            priority: "high",
            createdBy: req.user.id,
          });

          // Thông báo cho admin
          await broadcastToRole("admin", {
            type: "system",
            title: "Hệ thống tự động khóa doanh nghiệp",
            message: `Doanh nghiệp "${updatedCompany.name}" đã bị tự động khóa do tin tuyển dụng bị từ chối quá ${AUTO_LOCK_THRESHOLD} lần.`,
            actionUrl: "/admin/companies",
            priority: "high",
            createdBy: req.user.id,
          });
        }
      }
    } catch (autoLockErr) {
      console.error("Auto-lock check error:", autoLockErr);
    }

    res.json({
      success: true,
      message: "Đã từ chối yêu cầu.",
      data: {
        requestId: reqDoc._id,
      },
    });
  } catch (error) {
    console.error("rejectRequest:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  submitRecruiterRequest,
  listPendingForRecruiter,
  listPendingForAdmin,
  approveRequest,
  rejectRequest,
};
