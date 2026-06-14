import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import RecruiterLayout from "../layout/RecruiterLayout";
import RecruiterModal from "../components/RecruiterModal";
import Pagination from "@/components/common/Pagination";
import {
  HR_PAGE,
  HR_PAGE_HEADER,
  HR_H1,
  HR_SUBTITLE,
  HR_FILTER_CHIPS,
  HR_NATIVE_FIELD,
} from "../recruiterLayoutClasses";
import { HR_INPUT, HR_TEXTAREA } from "../recruiterFormClasses";
import { useRecruiterApplications } from "../../hooks/useRecruiterApplications";
import { useApiRequest } from "../../hooks/useApiRequest";
import { formatDateVN } from "@/utils/dateFormat";
import { recruitmentJobIdRaw } from "../recruiterApplicationCode";
import { recruiterStatusBadgeClass, recruiterScoreTextClass } from "../recruiterTheme";
import {
  getInterviewPassFailLabel,
  getInterviewPassFailBadgeKey,
} from "../../utils/applicationStatusDisplay";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Search,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
const hrCanDecideOnStatus = (status) =>
  ["submitted", "under_review"].includes(status);
const DEFAULT_INVITE_FORM = {
  interviewFormat: "online",
  expectedDate: "",
  expectedTime: "",
  venueOrLink: "",
  contactPerson: "",
  contactInfo: "",
  additionalNotes: "",
};
const INTERVIEW_FORMAT_LABELS = {
  online: "Trực tuyến",
  in_person: "Trực tiếp tại văn phòng",
  phone: "Qua điện thoại",
};
/** Giờ trong form là giờ VN (cùng ý nghĩa với dòng ghi chú), không phụ thuộc múi giờ trình duyệt Recruiter. */
function buildInterviewScheduledIso(form) {
  const f = form || {};
  if (!f.expectedDate || !f.expectedTime) return null;
  const t = f.expectedTime.trim();
  const raw = /^\d{1,2}:\d{2}$/.test(t) ? `${t}:00` : t;
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(m[1]).padStart(2, "0");
  const mm = String(m[2]).padStart(2, "0");
  const ss = m[3] ? String(m[3]).padStart(2, "0") : "00";
  const d = new Date(`${f.expectedDate}T${hh}:${mm}:${ss}+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
/** Ngày tối thiểu mời PV: hôm nay (Asia/Ho_Chi_Minh), định dạng YYYY-MM-DD cho input[type=date]. */
function interviewInviteMinDateYyyyMmDd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const da = parts.find((p) => p.type === "day")?.value;
  if (y && mo && da) return `${y}-${mo}-${da}`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function buildInterviewInviteNotes(form) {
  const f = form || {};
  const lines = [];
  const fmt =
    INTERVIEW_FORMAT_LABELS[f.interviewFormat] ||
    f.interviewFormat ||
    "Không xác định";
  lines.push(`Hình thức: ${fmt}`);
  if (f.expectedDate && f.expectedTime) {
    lines.push(`Thời gian dự kiến: ${f.expectedDate} lúc ${f.expectedTime}`);
  } else if (f.expectedDate) {
    lines.push(`Ngày dự kiến: ${f.expectedDate}`);
  }
  if ((f.venueOrLink || "").trim()) {
    lines.push(`Địa điểm hoặc liên kết: ${f.venueOrLink.trim()}`);
  }
  if ((f.contactPerson || "").trim()) {
    lines.push(`Người liên hệ: ${f.contactPerson.trim()}`);
  }
  if ((f.contactInfo || "").trim()) {
    lines.push(`Điện thoại hoặc thư điện tử: ${f.contactInfo.trim()}`);
  }
  if ((f.additionalNotes || "").trim()) {
    lines.push(`Ghi chú: ${f.additionalNotes.trim()}`);
  }
  return lines.join("\n");
}
/** Recruiter chỉ báo kết quả PV khi ứng viên đã xác nhận lịch và thời điểm PV đã qua. */
function canReportInterviewOutcome(application) {
  if (!application || application.status !== "interview_confirmed")
    return false;
  const inv = application.interviewInvite;
  return !!(inv?.confirmedAt && inv?.scheduledAt);
}
const emptyStatusReasonModal = () => ({
  open: false,
  applicationId: "",
  status: "",
  reason: "",
  submitting: false,
  inviteForm: {
    ...DEFAULT_INVITE_FORM,
  },
});
const emptyInterviewOutcomeModal = () => ({
  open: false,
  applicationId: "",
  outcome: "passed",
  reason: "",
  submitting: false,
});
const RecruiterApplicationManagement = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const { makeJsonRequest, makeRequest } = useApiRequest();
  const {
    applications,
    pagination,
    loading,
    error,
    fetchApplications,
    updateApplicationStatus,
    clearCache,
  } = useRecruiterApplications();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [sortBy, setSortBy] = useState("appliedDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pageType, setPageType] = useState(jobIdFromUrl ? "filtered" : "all");
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInputRef, setSearchInputRef] = useState(null);
  const [externalFeedback, setExternalFeedback] = useState(null);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [feedbackByAppId, setFeedbackByAppId] = useState({});
  const [coverLetterModal, setCoverLetterModal] = useState({
    open: false,
    text: "",
    candidateName: "",
  });
  const [statusReasonModal, setStatusReasonModal] = useState(() =>
    emptyStatusReasonModal(),
  );
  const [interviewOutcomeModal, setInterviewOutcomeModal] = useState(() =>
    emptyInterviewOutcomeModal(),
  );
  const prevListPageRef = useRef(1);
  const jobFilterParam = jobIdFromUrl || undefined;
  const hasCoverLetterText = (text) =>
    typeof text === "string" && text.trim().length > 0;
  useEffect(() => {
    if (!jobIdFromUrl) {
      setPageType("all");
      setCurrentJobTitle("");
      return;
    }
    setPageType("filtered");
    let cancelled = false;
    (async () => {
      try {
        const res = await makeJsonRequest(`/api/recruiter/jobs/${jobIdFromUrl}`);
        if (!cancelled && res?.success && res.data?.title) {
          setCurrentJobTitle(res.data.title);
        } else if (!cancelled) {
          setCurrentJobTitle("");
        }
      } catch {
        if (!cancelled) setCurrentJobTitle("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobIdFromUrl, makeJsonRequest]);
  useEffect(() => {
    if (!initialLoad) {
      const fetchParams = {
        page: 1,
        limit: 20,
        job: jobIdFromUrl || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
      };
      fetchApplications(fetchParams);
    }
  }, [jobIdFromUrl]);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== searchTerm) {
        setIsSearching(true);
        setSearchTerm(searchInput);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, searchTerm]);
  useEffect(() => {
    if (!loading && isSearching) {
      setIsSearching(false);
      if (searchInputRef && document.activeElement !== searchInputRef) {
        setTimeout(() => {
          searchInputRef.focus();
          const length = searchInputRef.value.length;
          searchInputRef.setSelectionRange(length, length);
        }, 100);
      }
    }
  }, [loading, isSearching, searchInputRef]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !showApplicationModal) {
        e.preventDefault();
        if (searchInputRef) {
          searchInputRef.focus();
          searchInputRef.select();
        }
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef) {
        setSearchInput("");
        searchInputRef.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchInputRef, showApplicationModal]);
  useEffect(() => {
    const fetchParams = {
      page: 1,
      limit: 20,
      job: jobFilterParam,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
    };
    fetchApplications(fetchParams);
    setInitialLoad(false);
  }, []);
  useEffect(() => {
    if (!initialLoad) {
      const fetchParams = {
        page: 1,
        limit: 20,
        job: jobFilterParam,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
      };
      if (searchTerm !== searchInput && searchTerm) {
        setIsSearching(true);
      }
      fetchApplications(fetchParams);
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [
    jobFilterParam,
    statusFilter,
    searchTerm,
    sortBy,
    sortOrder,
    initialLoad,
  ]);
  useEffect(() => {
    if (!initialLoad) {
      const cameBackToFirstPage =
        prevListPageRef.current > 1 && currentPage === 1;
      prevListPageRef.current = currentPage;
      if (currentPage > 1 || cameBackToFirstPage) {
        const fetchParams = {
          page: currentPage,
          limit: 20,
          job: jobFilterParam,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchTerm || undefined,
          sortBy,
          sortOrder,
        };
        fetchApplications(fetchParams);
      }
    }
  }, [currentPage, initialLoad]);
  useEffect(() => {
    if (initialLoad) return;
    const intervalId = setInterval(() => {
      const fetchParams = {
        page: currentPage,
        limit: 20,
        job: jobFilterParam,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
      };
      fetchApplications(fetchParams, { force: true, silent: true });
    }, 15000);
    return () => clearInterval(intervalId);
  }, [
    currentPage,
    jobFilterParam,
    statusFilter,
    searchTerm,
    sortBy,
    sortOrder,
    initialLoad,
    fetchApplications,
  ]);
  const formatStatus = (status) => {
    switch (status) {
      case "submitted":
        return "Đã nộp";
      case "under_review":
      case "shortlisted":
        return "Chờ xét duyệt";
      case "interview_scheduled":
        return "Đã mời phỏng vấn";
      case "interview_confirmed":
        return "Đã xác nhận lịch phỏng vấn";
      case "interview_passed":
        return "Đạt phỏng vấn";
      case "offer_accepted":
        return "Nhận việc";
      case "offer_declined":
        return "Từ chối đề nghị";
      case "withdrawn":
        return "Ứng viên rút đơn";
      case "rejected":
        return "Đã từ chối";
      case "completed":
        return "Hoàn tất";
      default:
        return String(status)
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };
  const openCoverLetterModal = (application, e) => {
    if (e) e.stopPropagation();
    if (!hasCoverLetterText(application?.coverLetter)) return;
    setCoverLetterModal({
      open: true,
      text: application.coverLetter.trim(),
      candidateName: application.candidate?.name || "",
    });
  };
  const normalizeFeedbackFromApplication = (app) => {
    if (!app) return null;
    const rawCandidates = [
      app.feedback,
      app.existingFeedback,
      app.interviewerFeedback,
      app.latestFeedback,
      app.interview?.feedback,
      app.interview?.existingFeedback,
      app.latestInterview?.feedback,
      app.latestInterview?.existingFeedback,
      ...(Array.isArray(app.interviews)
        ? app.interviews
            .map((iv) => iv?.feedback || iv?.existingFeedback)
            .filter(Boolean)
        : []),
    ].filter(Boolean);
    const scoreFeedback = (f) => {
      if (!f || typeof f !== "object") return 0;
      let score = 0;
      const fields = [
        "overallRating",
        "technicalSkills",
        "problemSolving",
        "candidateExperienceRating",
        "recommendation",
        "additionalNotes",
        "submittedAt",
      ];
      fields.forEach((k) => {
        if (f[k] !== undefined && f[k] !== null && f[k] !== "") score++;
      });
      if (Array.isArray(f.strengths) && f.strengths.length) score++;
      if (Array.isArray(f.weaknesses) && f.weaknesses.length) score++;
      if (f.technical) score++;
      if (f.problem_solving) score++;
      if (f.candidateExperience || f.experienceRating) score++;
      return score;
    };
    const fb = rawCandidates.sort(
      (a, b) => scoreFeedback(b) - scoreFeedback(a),
    )[0];
    if (!fb || scoreFeedback(fb) === 0) return null;
    const overallRating = fb.overallRating ?? fb.overall ?? fb.rating?.overall;
    const technicalSkills =
      fb.technicalSkills ?? fb.technical ?? fb.ratings?.technical;
    const problemSolving =
      fb.problemSolving ?? fb.problem_solving ?? fb.ratings?.problemSolving;
    const candidateExperienceRating =
      fb.candidateExperienceRating ??
      fb.candidateExperience ??
      fb.experienceRating ??
      fb.ratings?.candidateExperience;
    const strengths = Array.isArray(fb.strengths)
      ? fb.strengths
      : Array.isArray(fb.positives)
        ? fb.positives
        : [];
    const weaknesses = Array.isArray(fb.weaknesses)
      ? fb.weaknesses
      : Array.isArray(fb.concerns)
        ? fb.concerns
        : Array.isArray(fb.areasOfImprovement)
          ? fb.areasOfImprovement
          : [];
    const recommendation = fb.recommendation;
    const additionalNotes = fb.additionalNotes ?? fb.notes ?? "";
    const submittedAt = fb.submittedAt ?? fb.createdAt ?? fb.updatedAt;
    return {
      overallRating,
      technicalSkills,
      problemSolving,
      candidateExperienceRating,
      strengths,
      weaknesses,
      recommendation,
      additionalNotes,
      submittedAt,
    };
  };
  const handleApplicationAction = async (action, applicationId) => {
    switch (action) {
      case "view":
        const application = applications.find(
          (app) =>
            (app.id || app._id) === applicationId ||
            String(app.id ?? app._id) === String(applicationId),
        );
        setSelectedApplication(application);
        setShowApplicationModal(true);
        break;
      case "approve":
        setStatusReasonModal({
          open: true,
          applicationId,
          status: "interview_scheduled",
          reason: "",
          submitting: false,
          inviteForm: {
            ...DEFAULT_INVITE_FORM,
          },
        });
        break;
      case "reject":
        setStatusReasonModal({
          open: true,
          applicationId,
          status: "rejected",
          reason: "",
          submitting: false,
          inviteForm: {
            ...DEFAULT_INVITE_FORM,
          },
        });
        break;
      case "interview_outcome":
        setInterviewOutcomeModal({
          open: true,
          applicationId,
          outcome: "passed",
          reason: "",
          submitting: false,
        });
        break;
    }
  };
  const handleStatusChange = async (
    applicationId,
    newStatus,
    notes = "",
    scheduleMeta = {},
  ) => {
    try {
      const result = await updateApplicationStatus(
        applicationId,
        newStatus,
        notes,
        scheduleMeta,
      );
      if (result.success) {
        const filterWouldExclude =
          statusFilter !== "all" && newStatus !== statusFilter;
        if (filterWouldExclude) {
          setStatusFilter("all");
          setCurrentPage(1);
        }
        clearCache();
        await fetchApplications({
          page: filterWouldExclude ? 1 : currentPage,
          limit: 20,
          job: jobFilterParam,
          status: filterWouldExclude
            ? undefined
            : statusFilter !== "all"
              ? statusFilter
              : undefined,
          search: searchTerm || undefined,
          sortBy,
          sortOrder,
        });
        setSelectedApplication((prev) => {
          if (!prev) return prev;
          const prevId = prev.id ?? prev._id;
          if (String(prevId) !== String(applicationId)) return prev;
          return {
            ...prev,
            status: newStatus,
          };
        });
        return {
          success: true,
        };
      } else {
        console.error("Failed to update status:", result.error);
        toast.error(result.error || "Không thể cập nhật trạng thái hồ sơ.");
        return {
          success: false,
        };
      }
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Đã xảy ra lỗi khi cập nhật trạng thái hồ sơ.");
      return {
        success: false,
      };
    }
  };
  const handleConfirmStatusReason = async () => {
    let reason = "";
    if (statusReasonModal.status === "interview_scheduled") {
      const f = statusReasonModal.inviteForm || DEFAULT_INVITE_FORM;
      if (!f.expectedDate || !f.expectedTime) {
        toast.warning("Vui lòng chọn ngày và giờ dự kiến phỏng vấn.");
        return;
      }
      if (!(f.venueOrLink || "").trim()) {
        toast.warning("Vui lòng nhập địa điểm hoặc liên kết họp trực tuyến.");
        return;
      }
      reason = buildInterviewInviteNotes(f);
      if (!reason.trim()) {
        toast.warning("Vui lòng điền đủ thông tin mời phỏng vấn.");
        return;
      }
    } else {
      reason = (statusReasonModal.reason || "").trim();
      if (!reason) {
        toast.warning(
          "Vui lòng nhập lý do từ chối để gửi thông báo cho ứng viên.",
        );
        return;
      }
    }
    setStatusReasonModal((prev) => ({
      ...prev,
      submitting: true,
    }));
    let scheduleMeta = {};
    if (statusReasonModal.status === "interview_scheduled") {
      const f = statusReasonModal.inviteForm || DEFAULT_INVITE_FORM;
      const iso = buildInterviewScheduledIso(f);
      if (!iso) {
        toast.warning("Vui lòng chọn ngày và giờ phỏng vấn.");
        setStatusReasonModal((prev) => ({ ...prev, submitting: false }));
        return;
      }
      scheduleMeta = {
        interviewScheduledAt: iso,
        interviewVenue: (f.venueOrLink || "").trim(),
      };
    }
    const res = await handleStatusChange(
      statusReasonModal.applicationId,
      statusReasonModal.status,
      reason,
      scheduleMeta,
    );
    if (res?.success) {
      setStatusReasonModal(emptyStatusReasonModal());
    } else {
      setStatusReasonModal((prev) => ({
        ...prev,
        submitting: false,
      }));
    }
  };
  const handleConfirmInterviewOutcome = async () => {
    const trimmed = (interviewOutcomeModal.reason || "").trim();
    if (!trimmed) {
      toast.warning("Vui lòng nhập nhận xét hoặc lý do gửi tới ứng viên.");
      return;
    }
    const newStatus =
      interviewOutcomeModal.outcome === "passed"
        ? "interview_passed"
        : "rejected";
    setInterviewOutcomeModal((prev) => ({
      ...prev,
      submitting: true,
    }));
    const res = await handleStatusChange(
      interviewOutcomeModal.applicationId,
      newStatus,
      trimmed,
    );
    if (res?.success) {
      setInterviewOutcomeModal(emptyInterviewOutcomeModal());
    } else {
      setInterviewOutcomeModal((prev) => ({
        ...prev,
        submitting: false,
      }));
    }
  };
  const handleExportRequest = () => {
    exportApplicationsToExcel();
  };
  const exportApplicationsToExcel = () => {
    const dataToExport = applications;
    const sanitizeSheetName = (name) => {
      const safe = String(name || "Không xác định")
        .replace(/[\\/*?:[\]]/g, " ")
        .trim();
      return (safe || "Không xác định").slice(0, 31);
    };
    const toRow = (app, rowIndex) => ({
      STT: rowIndex + 1,
      "Mã tuyển dụng": recruitmentJobIdRaw(app?.job) || "—",
      "Họ tên": app?.candidate?.name || "",
      "Thư điện tử": app?.candidate?.email || "",
      "Điện thoại": app?.candidate?.phone || "",
      "Chức danh": app?.job?.title || "",
      "Phòng ban": app?.job?.department || "",
      "Điểm hồ sơ": app?.resumeScore ?? "",
      "Trạng thái": getInterviewPassFailLabel(app) ?? formatStatus(app?.status),
      "Kỹ năng": Array.isArray(app?.skills) ? app.skills.join(", ") : "",
      "Ngày nộp": app?.appliedDate ? formatDateVN(app.appliedDate) : "",
    });
    const workbook = XLSX.utils.book_new();
    const summaryRows = dataToExport.map((app, i) => toRow(app, i));
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Bang_tong_hop");
    const byJob = dataToExport.reduce((acc, app) => {
      const jobTitle = app?.job?.title || "Không xác định";
      if (!acc[jobTitle]) acc[jobTitle] = [];
      acc[jobTitle].push(app);
      return acc;
    }, {});
    Object.entries(byJob).forEach(([jobTitle, jobApps]) => {
      const sheetRows = jobApps.map((app, i) => toRow(app, i));
      const sheet = XLSX.utils.json_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        sanitizeSheetName(jobTitle),
      );
    });
    XLSX.writeFile(
      workbook,
      `danh-sach-ung-vien-theo-job-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const hasMeaningfulFeedback = (f) => {
    if (!f || typeof f !== "object") return false;
    if (f.submittedAt || f.overallRating != null || f.recommendation)
      return true;
    if (Array.isArray(f.strengths) && f.strengths.length) return true;
    if (Array.isArray(f.weaknesses) && f.weaknesses.length) return true;
    return false;
  };
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!applications || applications.length === 0) return;
      const targets = applications.filter(
        (a) =>
          a &&
          ["interview_scheduled", "interview_confirmed"].includes(a.status),
      );
      if (targets.length === 0) return;
      const needFetch = targets.filter(
        (a) => !normalizeFeedbackFromApplication(a),
      );
      if (needFetch.length === 0) return;
      const updates = {};
      await Promise.all(
        needFetch.map(async (a) => {
          const id = a.id;
          const urls = [
            `/api/recruiter/interviews?applicationId=${id}&limit=3`,
            `/api/recruiter/interviews?application=${id}&limit=3`,
            `/api/recruiter/interviews?appId=${id}&limit=3`,
          ];
          let found = false;
          for (const u of urls) {
            try {
              const res = await makeJsonRequest(u);
              if (res?.success) {
                const list = Array.isArray(res.data?.interviews)
                  ? res.data.interviews
                  : Array.isArray(res.data)
                    ? res.data
                    : [];
                for (const iv of list) {
                  const f = iv?.feedback || iv?.existingFeedback;
                  if (hasMeaningfulFeedback(f)) {
                    found = true;
                    break;
                  }
                }
              }
            } catch (e) {}
            if (found) break;
          }
          updates[id] = found;
        }),
      );
      if (!cancelled && Object.keys(updates).length) {
        setFeedbackByAppId((prev) => ({
          ...prev,
          ...updates,
        }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [applications, makeJsonRequest]);
  const inlineFeedback = selectedApplication
    ? normalizeFeedbackFromApplication(selectedApplication)
    : null;
  const appFeedback = externalFeedback || inlineFeedback;
  const feedbackStrengths = Array.isArray(appFeedback?.strengths)
    ? appFeedback.strengths
    : [];
  const feedbackWeaknesses = Array.isArray(appFeedback?.weaknesses)
    ? appFeedback.weaknesses
    : [];
  const hasFeedbackData = !!(
    appFeedback &&
    (appFeedback.overallRating != null ||
      !!appFeedback.recommendation ||
      (Array.isArray(appFeedback.strengths) &&
        appFeedback.strengths.length > 0) ||
      (Array.isArray(appFeedback.weaknesses) &&
        appFeedback.weaknesses.length > 0) ||
      !!appFeedback.additionalNotes ||
      !!appFeedback.submittedAt)
  );
  useEffect(() => {
    let cancelled = false;
    const fetchFeedback = async () => {
      if (!showApplicationModal || !selectedApplication) return;
      const hasInline =
        inlineFeedback &&
        (inlineFeedback.overallRating != null ||
          inlineFeedback.recommendation ||
          inlineFeedback.strengths?.length ||
          inlineFeedback.weaknesses?.length);
      if (hasInline) {
        setExternalFeedback(null);
        return;
      }
      setFetchingFeedback(true);
      setExternalFeedback(null);
      const candidates = [];
      const tryUrls = [
        `/api/recruiter/interviews?applicationId=${selectedApplication.id}&limit=5`,
        `/api/recruiter/interviews?application=${selectedApplication.id}&limit=5`,
        `/api/recruiter/interviews?appId=${selectedApplication.id}&limit=5`,
      ];
      for (const url of tryUrls) {
        try {
          const res = await makeJsonRequest(url);
          if (res?.success) {
            const list = Array.isArray(res.data?.interviews)
              ? res.data.interviews
              : Array.isArray(res.data)
                ? res.data
                : [];
            if (list.length) candidates.push(...list);
          }
        } catch (e) {}
        if (candidates.length) break;
      }
      if (!cancelled && candidates.length) {
        const withFb = candidates
          .map((iv) => iv?.feedback || iv?.existingFeedback)
          .filter(Boolean);
        if (withFb.length) {
          const pickRichest = (arr) =>
            arr.sort((a, b) => {
              const score = (f) => {
                let s = 0;
                [
                  "overallRating",
                  "technicalSkills",
                  "problemSolving",
                  "candidateExperienceRating",
                  "recommendation",
                  "additionalNotes",
                  "submittedAt",
                ].forEach((k) => {
                  if (f?.[k] != null && f?.[k] !== "") s++;
                });
                if (Array.isArray(f?.strengths) && f.strengths.length) s++;
                if (Array.isArray(f?.weaknesses) && f.weaknesses.length) s++;
                return s;
              };
              return score(b) - score(a);
            })[0];
          const fb = pickRichest(withFb);
          if (!cancelled && fb) {
            const normalized = {
              overallRating:
                fb.overallRating ?? fb.overall ?? fb.rating?.overall,
              technicalSkills:
                fb.technicalSkills ?? fb.technical ?? fb.ratings?.technical,
              problemSolving:
                fb.problemSolving ??
                fb.problem_solving ??
                fb.ratings?.problemSolving,
              candidateExperienceRating:
                fb.candidateExperienceRating ??
                fb.candidateExperience ??
                fb.experienceRating ??
                fb.ratings?.candidateExperience,
              strengths: Array.isArray(fb.strengths)
                ? fb.strengths
                : Array.isArray(fb.positives)
                  ? fb.positives
                  : [],
              weaknesses: Array.isArray(fb.weaknesses)
                ? fb.weaknesses
                : Array.isArray(fb.concerns)
                  ? fb.concerns
                  : Array.isArray(fb.areasOfImprovement)
                    ? fb.areasOfImprovement
                    : [],
              recommendation: fb.recommendation,
              additionalNotes: fb.additionalNotes ?? fb.notes ?? "",
              submittedAt: fb.submittedAt ?? fb.createdAt ?? fb.updatedAt,
            };
            setExternalFeedback(normalized);
          }
        }
      }
      if (!cancelled) setFetchingFeedback(false);
    };
    fetchFeedback();
    return () => {
      cancelled = true;
    };
  }, [showApplicationModal, selectedApplication]);
  return (
    <RecruiterLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>
              {pageType === "filtered"
                ? "Hồ sơ theo tin tuyển dụng"
                : "Hồ sơ ứng viên"}
            </h1>
            {pageType === "filtered" && currentJobTitle && (
              <h2 className="mt-1 font-['Open_Sans'] text-lg font-semibold text-foreground sm:text-xl">
                {currentJobTitle}
              </h2>
            )}
            <p className={HR_SUBTITLE}>
              {pageType === "filtered"
                ? "Danh sách hồ sơ cho vị trí đang xem"
                : "Tiếp nhận, đánh giá và cập nhật tiến độ ứng viên trên findme"}
            </p>
            {pageType === "filtered" && (
              <div className="mt-2">
                <Button
                  variant="link"
                  className="h-auto p-0 font-['Roboto'] text-primary"
                  asChild
                >
                  <Link to="/recruiter/applications">← Xem toàn bộ hồ sơ</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="flex w-full shrink-0 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full touch-manipulation font-['Roboto'] sm:w-auto"
              disabled={loading || applications.length === 0}
              onClick={handleExportRequest}
            >
              <Download className="mr-2 size-4 shrink-0" />
              Xuất bảng tính
            </Button>
          </div>
        </div>
        <Card className="mb-4 shadow-sm sm:mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    ref={setSearchInputRef}
                    type="search"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setIsSearching(false);
                    }}
                    onFocus={(e) => {
                      const length = e.target.value.length;
                      e.target.setSelectionRange(length, length);
                    }}
                    className={cn(
                      HR_NATIVE_FIELD,
                      "min-h-11 pl-9 pr-24 font-['Roboto']",
                    )}
                    placeholder="Tìm theo mã tuyển dụng, tên ứng viên, vị trí hoặc kỹ năng"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {searchInput !== searchTerm && searchInput.length > 0 ? (
                      <div className="flex items-center font-['Roboto'] text-xs text-muted-foreground">
                        <span className="mr-1 inline-block size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                        Đang nhập...
                      </div>
                    ) : isSearching ? (
                      <div className="flex items-center font-['Roboto'] text-xs text-muted-foreground">
                        <span className="mr-1 inline-block size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                        Đang tìm kiếm...
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  disabled={loading}
                  className={cn(
                    HR_NATIVE_FIELD,
                    "min-h-10 w-full px-3 py-2 font-['Roboto'] disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="submitted">Đã nộp</option>
                  <option value="under_review">Chờ xét duyệt</option>
                  <option value="interview_scheduled">Đã mời phỏng vấn</option>
                  <option value="interview_confirmed">
                    Đã xác nhận lịch phỏng vấn
                  </option>
                  <option value="interview_passed">Đạt phỏng vấn</option>
                  <option value="offer_accepted">Nhận việc</option>
                  <option value="offer_declined">Từ chối đề nghị</option>
                  <option value="withdrawn">Ứng viên rút đơn</option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </div>
            </div>

            <div className={cn(HR_FILTER_CHIPS, "items-center")}>
              <span className="shrink-0 font-['Roboto'] text-sm font-medium text-muted-foreground">
                Sắp xếp:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                disabled={loading}
                className={cn(
                  HR_NATIVE_FIELD,
                  "min-h-10 min-w-[10rem] flex-1 px-3 py-2 font-['Roboto'] text-sm sm:flex-initial disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <option value="appliedDate">Ngày nộp đơn</option>
                <option value="resumeScore">Điểm hồ sơ</option>
                <option value="name">Tên ứng viên</option>
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-10 min-w-10 shrink-0 touch-manipulation"
                disabled={loading}
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                aria-label={
                  sortOrder === "asc" ? "Sắp xếp giảm dần" : "Sắp xếp tăng dần"
                }
              >
                <svg
                  className={`size-4 ${sortOrder === "asc" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription className="font-['Roboto'] text-destructive/90">
                {error}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  clearCache();
                  const fetchParams = {
                    page: currentPage,
                    limit: 20,
                    job: jobFilterParam,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                    search: searchTerm || undefined,
                    sortBy,
                    sortOrder,
                  };
                  fetchApplications(fetchParams);
                }}
              >
                Thử lại
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  clearCache();
                  window.location.reload();
                }}
              >
                Tải lại
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <Card className="shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <TableHead key={i} className="font-['Roboto'] text-xs">
                      {i === 0 ? "…" : ""}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, r) => (
                  <TableRow key={r}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center font-['Roboto'] text-xs">
                      STT
                    </TableHead>
                    <TableHead className="text-center font-['Roboto'] text-xs">
                      Mã tuyển dụng
                    </TableHead>
                    <TableHead className="font-['Roboto'] text-xs">
                      Ứng viên
                    </TableHead>
                    <TableHead className="font-['Roboto'] text-xs">
                      Vị trí tuyển dụng
                    </TableHead>
                    <TableHead className="font-['Roboto'] text-xs">
                      Ngày nộp
                    </TableHead>
                    <TableHead className="font-['Roboto'] text-xs">
                      Điểm hồ sơ
                    </TableHead>
                    <TableHead className="font-['Roboto'] text-xs">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-right font-['Roboto'] text-xs">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application, rowIndex) => {
                    const inlineFb =
                      normalizeFeedbackFromApplication(application);
                    const appRowId = application.id || application._id;
                    const hasFeedbackHint = !!(
                      inlineFb || feedbackByAppId[appRowId]
                    );
                    const useProcessCompleteBadge =
                      hasFeedbackHint &&
                      ["interview_scheduled", "interview_confirmed"].includes(
                        application.status,
                      );
                    const rowStatusLabel = useProcessCompleteBadge
                      ? formatStatus("completed")
                      : (getInterviewPassFailLabel(application) ??
                        formatStatus(application.status));
                    const rowBadgeKey = useProcessCompleteBadge
                      ? "completed"
                      : (getInterviewPassFailBadgeKey(application) ??
                        application.status);
                    const stt =
                      (currentPage - 1) * (pagination.limit || 20) +
                      rowIndex +
                      1;
                    return (
                      <TableRow key={appRowId}>
                        <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                          {stt}
                        </TableCell>
                        <TableCell
                          className="text-center font-mono text-xs font-semibold text-foreground"
                          title={
                            recruitmentJobIdRaw(application.job) || undefined
                          }
                        >
                          {recruitmentJobIdRaw(application.job) || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                              {application.candidate.name}
                            </div>
                            <div className="font-['Roboto'] text-sm text-muted-foreground">
                              {application.experience}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-['Roboto'] text-sm text-foreground">
                            {application.job.title}
                          </div>
                          <div className="font-['Roboto'] text-sm text-muted-foreground">
                            {application.job.department}
                          </div>
                        </TableCell>
                        <TableCell className="font-['Roboto'] text-sm text-muted-foreground">
                          {formatDateVN(application.appliedDate)}
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              "font-['Roboto'] text-sm",
                              recruiterScoreTextClass(application.resumeScore),
                            )}
                          >
                            {application.resumeScore != null &&
                            application.resumeScore !== ""
                              ? `${application.resumeScore}/10`
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              recruiterStatusBadgeClass(rowBadgeKey),
                            )}
                          >
                            {rowStatusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() =>
                                handleApplicationAction("view", appRowId)
                              }
                              title="Xem chi tiết"
                            >
                              <Eye className="size-4" aria-hidden />
                            </Button>
                            {hasCoverLetterText(application.coverLetter) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary"
                                onClick={(e) =>
                                  openCoverLetterModal(application, e)
                                }
                                title="Xem thư giới thiệu"
                              >
                                <FileText className="size-4" />
                              </Button>
                            )}
                            {canReportInterviewOutcome(application) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary"
                                onClick={() =>
                                  handleApplicationAction(
                                    "interview_outcome",
                                    appRowId,
                                  )
                                }
                                title="Báo kết quả phỏng vấn (đạt / không đạt)"
                              >
                                <ClipboardList className="size-4" aria-hidden />
                              </Button>
                            )}
                            {hrCanDecideOnStatus(application.status) && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-primary"
                                  onClick={() =>
                                    handleApplicationAction("approve", appRowId)
                                  }
                                  title="Mời phỏng vấn"
                                >
                                  <CheckCircle2
                                    className="size-4"
                                    aria-hidden
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-primary"
                                  onClick={() =>
                                    handleApplicationAction("reject", appRowId)
                                  }
                                  title="Từ chối hồ sơ"
                                >
                                  <X className="size-4" aria-hidden />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
              loading={loading}
              totalItems={pagination.totalApplications}
              limit={20}
              itemLabel="kết quả"
            />
          </Card>
        )}

        {!loading && applications.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <svg
                className="mx-auto size-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 font-['Open_Sans'] text-sm font-medium text-foreground">
                Không tìm thấy hồ sơ phù hợp
              </h3>
              <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                Không có hồ sơ nào khớp bộ lọc hiện tại.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <RecruiterModal
        open={Boolean(showApplicationModal && selectedApplication)}
        onClose={() => setShowApplicationModal(false)}
        size="xl"
        header={
          selectedApplication ? (
            <div>
              <h3 className="font-['Open_Sans'] text-2xl font-semibold text-foreground">
                {selectedApplication.candidate.name}
              </h3>
              {recruitmentJobIdRaw(selectedApplication.job) ? (
                <p
                  className="mt-1 font-mono text-sm text-muted-foreground"
                  title={recruitmentJobIdRaw(selectedApplication.job)}
                >
                  {recruitmentJobIdRaw(selectedApplication.job)}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-normal",
                    recruiterStatusBadgeClass(
                      getInterviewPassFailBadgeKey(selectedApplication) ??
                        selectedApplication.status,
                    ),
                  )}
                >
                  {getInterviewPassFailLabel(selectedApplication) ??
                    formatStatus(selectedApplication.status)}
                </Badge>
                <span className="font-['Roboto'] text-sm text-muted-foreground">
                  Nộp ngày{" "}
                  {formatDateVN(
                    selectedApplication.appliedDate ||
                      selectedApplication.createdAt,
                  )}
                </span>
              </div>
            </div>
          ) : null
        }
        footer={
          selectedApplication ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button
                  variant="outline"
                  className="font-['Roboto']"
                  disabled={!selectedApplication.resumeUrl}
                  title={
                    !selectedApplication.resumeUrl
                      ? "Không có hồ sơ"
                      : "Xem hồ sơ ứng viên"
                  }
                  onClick={async () => {
                    try {
                      const response = await makeRequest(
                        `/api/recruiter/applications/${selectedApplication.id}/resume`,
                      );
                      if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, "_blank", "noopener,noreferrer");
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                      } else {
                        const errorData = await response.json();
                        toast.error(
                          errorData.message ||
                            "Tải hồ sơ bị lỗi. Vui lòng thử lại.",
                        );
                      }
                    } catch (error) {
                      console.error("Error opening resume:", error);
                      toast.error("Mở hồ sơ bị lỗi. Vui lòng thử lại.");
                    }
                  }}
                >
                  <Download className="mr-2 size-4" />
                  Xem hồ sơ
                </Button>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className="font-['Roboto']"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Đóng
                </Button>
                {hrCanDecideOnStatus(selectedApplication.status) && (
                  <>
                    <Button
                      variant="outline"
                      className="font-['Roboto'] text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        handleApplicationAction(
                          "reject",
                          selectedApplication.id || selectedApplication._id,
                        );
                        setShowApplicationModal(false);
                      }}
                    >
                      Từ chối hồ sơ
                    </Button>
                    <Button
                      className="font-['Roboto']"
                      onClick={() => {
                        handleApplicationAction(
                          "approve",
                          selectedApplication.id || selectedApplication._id,
                        );
                        setShowApplicationModal(false);
                      }}
                    >
                      Mời phỏng vấn
                    </Button>
                  </>
                )}
                {canReportInterviewOutcome(selectedApplication) && (
                  <Button
                    className="font-['Roboto']"
                    onClick={() => {
                      handleApplicationAction(
                        "interview_outcome",
                        selectedApplication.id || selectedApplication._id,
                      );
                      setShowApplicationModal(false);
                    }}
                  >
                    Báo kết quả phỏng vấn
                  </Button>
                )}
                {selectedApplication.status === "rejected" && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="font-['Roboto']">
                      Đơn đã bị từ chối
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {selectedApplication && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Thông tin liên hệ
                </h4>
                <p className="font-['Roboto'] text-foreground">
                  {selectedApplication.candidate.email}
                </p>
                <p className="font-['Roboto'] text-foreground">
                  {selectedApplication.candidate.phone ||
                    "Không có số điện thoại"}
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Vị trí ứng tuyển
                </h4>
                <p className="font-['Roboto'] text-foreground">
                  {selectedApplication.job.title}
                </p>
                <p className="font-['Roboto'] text-muted-foreground">
                  {selectedApplication.job.department}
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Kinh nghiệm
                </h4>
                <p className="font-['Roboto'] text-foreground">
                  {selectedApplication.experience}
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Điểm hồ sơ
                </h4>
                <p
                  className={cn(
                    "font-['Roboto'] text-lg",
                    recruiterScoreTextClass(selectedApplication.resumeScore),
                  )}
                >
                  {selectedApplication.resumeScore != null &&
                  selectedApplication.resumeScore !== ""
                    ? `${selectedApplication.resumeScore}/10`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="mb-2 font-['Roboto'] text-sm font-medium text-muted-foreground">
                Kỹ năng
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedApplication.skills &&
                selectedApplication.skills.length > 0 ? (
                  selectedApplication.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="font-normal"
                    >
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="font-['Roboto'] text-sm text-muted-foreground">
                    Không có thông tin kỹ năng
                  </span>
                )}
              </div>
            </div>

            {hasCoverLetterText(selectedApplication.coverLetter) && (
              <Card className="mb-6 border-dashed bg-muted/30 shadow-none">
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="font-['Roboto'] text-sm font-medium text-foreground">
                      Thư giới thiệu
                    </h4>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-['Roboto'] text-xs"
                      type="button"
                      onClick={() => openCoverLetterModal(selectedApplication)}
                    >
                      Mở rộng
                    </Button>
                  </div>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap pr-1 font-['Roboto'] text-sm text-muted-foreground">
                    {selectedApplication.coverLetter.trim()}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="mb-6 border-t border-border pt-6">
              <h4 className="mb-4 font-['Open_Sans'] text-lg font-medium text-foreground">
                Phân tích hồ sơ tự động
              </h4>
              {selectedApplication.aiAnalysis ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <p className="mb-1 font-['Roboto'] text-xs font-medium text-muted-foreground">
                        Mức độ phù hợp kỹ năng
                      </p>
                      <p className="font-['Open_Sans'] text-lg font-semibold text-foreground">
                        {Math.round(
                          selectedApplication.aiAnalysis.skillsMatch || 0,
                        )}
                        %
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <p className="mb-1 font-['Roboto'] text-xs font-medium text-muted-foreground">
                        Mức độ phù hợp kinh nghiệm
                      </p>
                      <p className="font-['Open_Sans'] text-lg font-semibold text-foreground">
                        {Math.round(
                          selectedApplication.aiAnalysis.experienceMatch || 0,
                        )}
                        %
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <p className="mb-1 font-['Roboto'] text-xs font-medium text-muted-foreground">
                        Mức độ phù hợp tổng thể
                      </p>
                      <p className="font-['Open_Sans'] text-lg font-semibold text-foreground">
                        {Math.round(
                          selectedApplication.aiAnalysis.overallFit || 0,
                        )}
                        %
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="font-['Roboto'] text-sm text-muted-foreground">
                  Chưa có kết quả phân tích tự động cho hồ sơ này.
                </p>
              )}

              {selectedApplication.aiAnalysis && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="mb-2 font-['Open_Sans'] text-sm font-medium text-foreground">
                      Điểm mạnh chính
                    </h5>
                    {selectedApplication.aiAnalysis.strengths &&
                    selectedApplication.aiAnalysis.strengths.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 font-['Roboto'] text-sm text-muted-foreground">
                        {selectedApplication.aiAnalysis.strengths.map(
                          (s, idx) => (
                            <li key={idx}>{s}</li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="font-['Roboto'] text-sm text-muted-foreground">
                        Chưa phát hiện điểm mạnh nào.
                      </p>
                    )}
                  </div>
                  <div>
                    <h5 className="mb-2 font-['Open_Sans'] text-sm font-medium text-foreground">
                      Điểm cần lưu ý
                    </h5>
                    {selectedApplication.aiAnalysis.concerns &&
                    selectedApplication.aiAnalysis.concerns.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 font-['Roboto'] text-sm text-muted-foreground">
                        {selectedApplication.aiAnalysis.concerns.map(
                          (c, idx) => (
                            <li key={idx}>{c}</li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="font-['Roboto'] text-sm text-muted-foreground">
                        Chưa phát hiện vấn đề lớn nào.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </RecruiterModal>

      <RecruiterModal
        open={interviewOutcomeModal.open}
        onClose={() => {
          if (interviewOutcomeModal.submitting) return;
          setInterviewOutcomeModal(emptyInterviewOutcomeModal());
        }}
        closeOnBackdrop={!interviewOutcomeModal.submitting}
        size="lg"
        title="Báo kết quả phỏng vấn"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={interviewOutcomeModal.submitting}
              onClick={() =>
                setInterviewOutcomeModal(emptyInterviewOutcomeModal())
              }
            >
              Hủy
            </Button>
            <Button
              disabled={interviewOutcomeModal.submitting}
              onClick={handleConfirmInterviewOutcome}
            >
              {interviewOutcomeModal.submitting
                ? "Đang gửi..."
                : "Gửi cho ứng viên"}
            </Button>
          </div>
        }
      >
        {interviewOutcomeModal.open && (
          <div className="space-y-4">
            <p className="font-['Roboto'] text-sm text-muted-foreground">
              Chọn kết quả và nhập nhận xét — hệ thống sẽ tự động gửi thư chúc
              mừng nhận việc (nếu đạt) hoặc thư từ chối (nếu không đạt) trực
              tiếp tới email ứng viên, đồng thời cập nhật thông báo trên hệ
              thống.
            </p>
            <div>
              <span className="mb-2 block font-['Roboto'] text-sm font-medium text-foreground">
                Kết quả
              </span>
              <div className="flex flex-wrap gap-4 font-['Roboto'] text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="interview-outcome"
                    checked={interviewOutcomeModal.outcome === "passed"}
                    disabled={interviewOutcomeModal.submitting}
                    onChange={() =>
                      setInterviewOutcomeModal((prev) => ({
                        ...prev,
                        outcome: "passed",
                      }))
                    }
                  />
                  Đạt (chuyển trạng thái: đã phỏng vấn)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="interview-outcome"
                    checked={interviewOutcomeModal.outcome === "failed"}
                    disabled={interviewOutcomeModal.submitting}
                    onChange={() =>
                      setInterviewOutcomeModal((prev) => ({
                        ...prev,
                        outcome: "failed",
                      }))
                    }
                  />
                  Không đạt (từ chối hồ sơ)
                </label>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                Nhận xét / lý do gửi ứng viên{" "}
                <span className="text-destructive">*</span>
              </Label>
              <textarea
                value={interviewOutcomeModal.reason}
                disabled={interviewOutcomeModal.submitting}
                onChange={(e) =>
                  setInterviewOutcomeModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                rows={5}
                className={HR_TEXTAREA}
                placeholder="Ví dụ: Cảm ơn bạn đã tham gia phỏng vấn. Chúng tôi sẽ liên hệ bước tiếp theo…"
              />
            </div>
          </div>
        )}
      </RecruiterModal>

      <RecruiterModal
        open={statusReasonModal.open}
        onClose={() => {
          if (statusReasonModal.submitting) return;
          setStatusReasonModal(emptyStatusReasonModal());
        }}
        closeOnBackdrop={!statusReasonModal.submitting}
        size="lg"
        title={
          statusReasonModal.status === "interview_scheduled"
            ? "Thông báo mời phỏng vấn"
            : "Lý do từ chối hồ sơ"
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={statusReasonModal.submitting}
              onClick={() => setStatusReasonModal(emptyStatusReasonModal())}
            >
              Hủy
            </Button>
            <Button
              disabled={statusReasonModal.submitting}
              onClick={handleConfirmStatusReason}
            >
              {statusReasonModal.submitting ? "Đang gửi..." : "Xác nhận"}
            </Button>
          </div>
        }
      >
        {statusReasonModal.open && (
          <div>
            <p className="mb-4 font-['Roboto'] text-sm text-muted-foreground">
              {statusReasonModal.status === "interview_scheduled"
                ? "Thông tin dưới đây được ghép thành nội dung kèm email mời phỏng vấn gửi tới ứng viên."
                : "Nội dung này được gửi kèm thông báo tới ứng viên khi từ chối hồ sơ."}
            </p>
            {statusReasonModal.status === "interview_scheduled" ? (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                    Hình thức phỏng vấn{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={
                      statusReasonModal.inviteForm?.interviewFormat ?? "online"
                    }
                    onChange={(e) =>
                      setStatusReasonModal((prev) => ({
                        ...prev,
                        inviteForm: {
                          ...prev.inviteForm,
                          interviewFormat: e.target.value,
                        },
                      }))
                    }
                    className={cn(HR_NATIVE_FIELD, "h-auto min-h-10 py-2.5")}
                  >
                    <option value="online">Trực tuyến</option>
                    <option value="in_person">Trực tiếp tại văn phòng</option>
                    <option value="phone">Qua điện thoại</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                      Ngày dự kiến <span className="text-destructive">*</span>
                    </Label>
                    <input
                      type="date"
                      min={interviewInviteMinDateYyyyMmDd()}
                      value={statusReasonModal.inviteForm?.expectedDate ?? ""}
                      onChange={(e) =>
                        setStatusReasonModal((prev) => ({
                          ...prev,
                          inviteForm: {
                            ...prev.inviteForm,
                            expectedDate: e.target.value,
                          },
                        }))
                      }
                      className={HR_INPUT}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                      Giờ dự kiến <span className="text-destructive">*</span>
                    </Label>
                    <input
                      type="time"
                      value={statusReasonModal.inviteForm?.expectedTime ?? ""}
                      onChange={(e) =>
                        setStatusReasonModal((prev) => ({
                          ...prev,
                          inviteForm: {
                            ...prev.inviteForm,
                            expectedTime: e.target.value,
                          },
                        }))
                      }
                      className={HR_INPUT}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                    Địa điểm hoặc link họp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="text"
                    value={statusReasonModal.inviteForm?.venueOrLink ?? ""}
                    onChange={(e) =>
                      setStatusReasonModal((prev) => ({
                        ...prev,
                        inviteForm: {
                          ...prev.inviteForm,
                          venueOrLink: e.target.value,
                        },
                      }))
                    }
                    placeholder="Liên kết họp trực tuyến hoặc địa chỉ cụ thể"
                    className={HR_INPUT}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                      Người liên hệ
                    </Label>
                    <input
                      type="text"
                      value={statusReasonModal.inviteForm?.contactPerson ?? ""}
                      onChange={(e) =>
                        setStatusReasonModal((prev) => ({
                          ...prev,
                          inviteForm: {
                            ...prev.inviteForm,
                            contactPerson: e.target.value,
                          },
                        }))
                      }
                      placeholder="Họ tên người phụ trách"
                      className={HR_INPUT}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                      Số điện thoại hoặc thư điện tử liên hệ
                    </Label>
                    <input
                      type="text"
                      value={statusReasonModal.inviteForm?.contactInfo ?? ""}
                      onChange={(e) =>
                        setStatusReasonModal((prev) => ({
                          ...prev,
                          inviteForm: {
                            ...prev.inviteForm,
                            contactInfo: e.target.value,
                          },
                        }))
                      }
                      placeholder="Số điện thoại hoặc thư điện tử"
                      className={HR_INPUT}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block font-['Roboto'] text-foreground">
                    Ghi chú thêm
                  </Label>
                  <textarea
                    value={statusReasonModal.inviteForm?.additionalNotes ?? ""}
                    onChange={(e) =>
                      setStatusReasonModal((prev) => ({
                        ...prev,
                        inviteForm: {
                          ...prev.inviteForm,
                          additionalNotes: e.target.value,
                        },
                      }))
                    }
                    rows={3}
                    placeholder="Thông tin bổ sung gửi kèm ứng viên nếu cần"
                    className={cn(HR_TEXTAREA, "min-h-[80px] resize-y")}
                  />
                </div>
              </div>
            ) : (
              <textarea
                value={statusReasonModal.reason}
                onChange={(e) =>
                  setStatusReasonModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                rows={5}
                placeholder="Nhập lý do từ chối..."
                className={HR_TEXTAREA}
              />
            )}
          </div>
        )}
      </RecruiterModal>

      <RecruiterModal
        open={coverLetterModal.open}
        onClose={() =>
          setCoverLetterModal({ open: false, text: "", candidateName: "" })
        }
        size="lg"
        title="Thư giới thiệu"
        subtitle={coverLetterModal.candidateName || undefined}
        footer={
          <Button
            type="button"
            variant="secondary"
            className="font-['Roboto']"
            onClick={() =>
              setCoverLetterModal({ open: false, text: "", candidateName: "" })
            }
          >
            Đóng
          </Button>
        }
      >
        {coverLetterModal.open && (
          <p className="whitespace-pre-wrap font-['Roboto'] text-sm leading-relaxed text-foreground">
            {coverLetterModal.text}
          </p>
        )}
      </RecruiterModal>
    </RecruiterLayout>
  );
};
export default RecruiterApplicationManagement;
