const express = require("express");
const { body, query, validationResult } = require("express-validator");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Application = require("../../global/models/Application");
const Job = require("../../global/models/Job");
const User = require("../../global/models/User");
const Resume = require("../../global/models/Resume");
const Interview = require("../../global/models/Interview");
const { auth } = require("../../global/middleware/auth");
const { createAndEmit } = require("../../global/services/notificationService");
const {
  getRecruitmentCodeFromJob,
  enrichApplicationForApplicantList,
} = require("../../global/utils/applicationCode");
let pdfParseModule = null;
try {
  pdfParseModule = require("pdf-parse");
} catch (e) {
  console.warn(
    "pdf-parse failed to load; PDF text extraction disabled:",
    e?.message || e,
  );
}

async function extractTextFromPdfBuffer(buffer) {
  if (!pdfParseModule || !buffer) return null;
  if (typeof pdfParseModule === "function") {
    const parsed = await pdfParseModule(buffer);
    return {
      text: typeof parsed?.text === "string" ? parsed.text : "",
      numpages: parsed?.numpages,
    };
  }
  const PDFParse = pdfParseModule.PDFParse;
  if (!PDFParse) {
    throw new Error("pdf-parse: PDFParse export missing");
  }
  const parser = new PDFParse({
    data: buffer,
  });
  try {
    const textResult = await parser.getText();
    const text =
      textResult && typeof textResult.text === "string" ? textResult.text : "";
    const numpages =
      typeof textResult?.total === "number"
        ? textResult.total
        : Array.isArray(textResult?.pages)
          ? textResult.pages.length
          : undefined;
    return {
      text,
      numpages,
    };
  } finally {
    try {
      await parser.destroy();
    } catch (_) {}
  }
}

async function fetchBufferFromUrl(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function parseScheduledAtFromHrNote(note) {
  if (!note || typeof note !== "string") return null;
  const m = note.match(
    /Thời gian dự kiến:\s*(\d{4}-\d{2}-\d{2})\s+lúc\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  const hh = String(m[2]).padStart(2, "0");
  const mm = String(m[3]).padStart(2, "0");
  const ss = m[4] ? String(m[4]).padStart(2, "0") : "00";
  const d = new Date(`${m[1]}T${hh}:${mm}:${ss}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype =
      /application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(
        file.mimetype,
      );
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});
router.get("/test", (req, res) => {
  res.json({
    message: "Applications route is working!",
  });
});

async function getApplicantActiveResume(applicantId) {
  const user = await User.findById(applicantId).select(
    "currentResumeId profile.currentResumeId",
  );
  if (!user) return null;
  const candidates = [
    user.profile?.currentResumeId,
    user.currentResumeId,
  ].filter(Boolean);
  for (const resumeId of candidates) {
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: applicantId,
      isActive: true,
    });
    if (resume) return resume;
  }
  return await Resume.findOne({
    userId: applicantId,
    isActive: true,
  }).sort({
    createdAt: -1,
  });
}

// api nộp CV ứng tuyển + call AI + ATS auto reject
router.post("/", auth, upload.single("customResume"), async (req, res) => {
  try {
    const applicantId = req.user?.id;
    const {
      jobId,
      firstName,
      lastName,
      email,
      phone,
      location,
      skills,
      experience,
      expectedSalaryMin,
      expectedSalaryMax,
      coverLetter,
      useProfileResume,
    } = req.body;
    if (!applicantId) {
      return res.status(400).json({
        message: "User authentication required",
      });
    }
    if (!jobId) {
      return res.status(400).json({
        message: "Job ID is required",
      });
    }
    const useProfileResumeRequested =
      String(useProfileResume).toLowerCase() === "true";
    const validExperienceLevels = ["fresher", "mid-level", "senior", "expert"];
    const experienceAliases = {
      "mới ra trường / fresher": "fresher",
      "moi ra truong / fresher": "fresher",
      fresher: "fresher",
      "entry-level": "fresher",
      "mid-level": "mid-level",
      "mid level": "mid-level",
      "trung cấp": "mid-level",
      "trung cap": "mid-level",
      senior: "senior",
      "cao cấp": "senior",
      "cao cap": "senior",
      expert: "expert",
      "chuyên gia": "expert",
      "chuyen gia": "expert",
    };
    const experienceInput = (experience || "").trim().toLowerCase();
    const normalizedExperience = experienceInput
      ? experienceAliases[experienceInput] || experienceInput
      : "fresher";
    if (!validExperienceLevels.includes(normalizedExperience)) {
      return res.status(400).json({
        message:
          "Invalid experience level. Must be one of: fresher, mid-level, senior, expert",
      });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }
    if (job.status !== "active") {
      return res.status(400).json({
        message: "Job is no longer accepting applications",
      });
    }
    const applicantAtsPoliteMessage = (jobTitle) =>
      `Chúng tôi đánh giá cao kỹ năng chuyên môn của bạn, nhưng bạn chưa phù hợp với vị trí ${jobTitle}.`;
    const existingApplication = await Application.findOne({
      applicant: applicantId,
      job: jobId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
      });
    }
    const applicant = await User.findById(applicantId);
    const resumeFromProfile =
      !req.file && useProfileResumeRequested
        ? await getApplicantActiveResume(applicantId)
        : null;
    if (!req.file && !resumeFromProfile) {
      return res.status(400).json({
        message: "Resume file is required to apply for this job",
      });
    }
    const applicationData = {
      applicant: applicantId,
      job: jobId,
      personalInfo: {
        firstName: firstName || applicant.firstName,
        lastName: lastName || applicant.lastName,
        email: email || applicant.email,
        phone: phone || applicant.phone,
      },
      skills: skills
        ? skills.split(",").map((skill) => skill.trim())
        : applicant.skills || [],
      experience: normalizedExperience,
      expectedSalary: {
        min: expectedSalaryMin ? parseInt(expectedSalaryMin) : null,
        max: expectedSalaryMax ? parseInt(expectedSalaryMax) : null,
        currency: "USD",
      },
      coverLetter,
      useProfileResume: !!resumeFromProfile,
      profileResumeId: resumeFromProfile ? resumeFromProfile._id : null,
      status: "submitted",
    };
    if (req.file) {
      applicationData.customResume = {
        fileName: req.file.originalname,
        fileData: req.file.buffer,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadDate: new Date(),
      };
    }
    const application = new Application(applicationData);
    await application.save();
    let hrAtsPassInfo = null;
    try {
      const geminiService = require("../../global/services/geminiService");
      const atsScanService = require("../../global/services/atsScanService");
      const atsEngineResolved = (job.atsEngine || "scan_cv").toString().trim();
      const scanUrl = (process.env.ATS_SCAN_API_URL || "").trim();
      let resumeText = "";
      let extractionMeta = {
        method: "none",
        pages: undefined,
        wordCount: undefined,
        characterCount: undefined,
        warnings: [],
      };
      let resumeFileForAi = null;
      let resumeSource =
        req.file && req.file.buffer
          ? {
              buffer: req.file.buffer,
              mimeType: req.file.mimetype || "",
              fileName: req.file.originalname || "",
            }
          : resumeFromProfile
            ? {
                buffer: resumeFromProfile.fileData
                  ? Buffer.from(resumeFromProfile.fileData, "base64")
                  : null,
                mimeType: resumeFromProfile.mimeType || "application/pdf",
                fileName:
                  resumeFromProfile.originalName ||
                  resumeFromProfile.fileName ||
                  "resume",
              }
            : null;

      if (resumeSource && !resumeSource.buffer && resumeFromProfile?.fileUrl) {
        const b = await fetchBufferFromUrl(resumeFromProfile.fileUrl);
        if (b) resumeSource = { ...resumeSource, buffer: b };
      }

      if (resumeSource && resumeSource.buffer) {
        const buffer = resumeSource.buffer;
        const mimeType = resumeSource.mimeType || "";
        const fileName = resumeSource.fileName || "";
        const header = buffer.slice(0, 8).toString("ascii");
        const looksLikePdf = header.startsWith("%PDF-");
        const isPdf =
          looksLikePdf ||
          mimeType === "application/pdf" ||
          /pdf/i.test(mimeType) ||
          /\.pdf$/i.test(fileName);
        if (isPdf && pdfParseModule) {
          extractionMeta.method = "pdf-parse";
          resumeFileForAi = {
            mimeType: mimeType || "application/pdf",
            fileName,
            data: buffer.toString("base64"),
          };
          try {
            const parsed = await extractTextFromPdfBuffer(buffer);
            const text =
              parsed && typeof parsed.text === "string" ? parsed.text : "";
            const trimmed = text.trim();
            if (trimmed.length === 0) {
              extractionMeta.warnings.push("PDF_TEXT_EXTRACTION_EMPTY");
              resumeText = "";
            } else {
              resumeText = text;
              extractionMeta.pages = parsed.numpages;
              extractionMeta.characterCount = text.length;
              extractionMeta.wordCount = trimmed
                .split(/\s+/)
                .filter(Boolean).length;
            }
          } catch (e) {
            extractionMeta.warnings.push("PDF_TEXT_EXTRACTION_FAILED");
            console.warn(
              "pdf-parse failed to extract resume text:",
              e.message || e,
            );
            resumeText = "";
          }
        } else if (!isPdf) {
          extractionMeta.method = "utf8-decode";
          try {
            resumeText = buffer.toString("utf8");
            extractionMeta.characterCount = resumeText.length;
            extractionMeta.wordCount = resumeText
              .trim()
              .split(/\s+/)
              .filter(Boolean).length;
            resumeFileForAi = {
              mimeType: mimeType || "application/octet-stream",
              fileName,
              data: buffer.toString("base64"),
            };
          } catch (e) {
            extractionMeta.warnings.push("UTF8_DECODE_FAILED");
            console.warn(
              "Failed to decode resume buffer as utf8:",
              e.message || e,
            );
            resumeText = "";
          }
        }
        if (
          isPdf &&
          atsEngineResolved === "scan_cv" &&
          scanUrl &&
          !(resumeText || "").trim()
        ) {
          try {
            console.info(
              "[ATS] PDF text empty — calling scan_chamdiemCV /api/cv/upload then /api/cv/",
              {
                jobId: jobId?.toString?.(),
              },
            );
            const scanCv = require("../../global/services/scanChamdiemCvClient");
            const up = await scanCv.uploadCv(buffer, fileName, scanUrl);
            const cvs = await scanCv.listCvs(scanUrl);
            const row = Array.isArray(cvs)
              ? cvs.find((c) => c.id === up.cv_id)
              : null;
            const t = row && typeof row.text === "string" ? row.text : "";
            if (t.trim()) {
              resumeText = t;
              extractionMeta.method = "scan_chamdiemCV-pdfplumber";
              extractionMeta.characterCount = t.length;
              extractionMeta.wordCount = t
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
              extractionMeta.warnings = extractionMeta.warnings.filter(
                (w) =>
                  w !== "PDF_TEXT_EXTRACTION_EMPTY" &&
                  w !== "PDF_TEXT_EXTRACTION_FAILED",
              );
            }
          } catch (e) {
            extractionMeta.warnings.push("SCAN_CHAMDIEMCV_PDF_EXTRACT_FAILED");
            console.warn(
              "scan_chamdiemCV PDF extract fallback failed:",
              e?.message || e,
            );
          }
        }
      }
      const geminiArgs = {
        resumeText,
        resumeFile: resumeFileForAi,
        candidateName: `${application.personalInfo.lastName} ${application.personalInfo.firstName}`,
        jobTitle: job.title,
        jobDescription: job.description,
        requiredSkills: job.requiredSkills || [],
        preferredSkills: job.preferredSkills || [],
        experienceLevel: normalizedExperience,
        applicationId: application._id?.toString?.(),
        jobId: job._id?.toString?.(),
      };
      const docMeta = {
        fileSize: application.useProfileResume
          ? resumeFromProfile?.fileSize
          : application.customResume?.fileSize,
        fileName: application.useProfileResume
          ? resumeFromProfile?.originalName || resumeFromProfile?.fileName
          : application.customResume?.fileName,
        fileType: application.useProfileResume
          ? resumeFromProfile?.mimeType
          : application.customResume?.fileMimeType,
        extractedAt: new Date(),
        pages: extractionMeta.pages,
        wordCount: extractionMeta.wordCount,
        characterCount: extractionMeta.characterCount,
      };
      const jobTextForScan = atsScanService.buildJobTextForScan(job);
      const resumeOk = (resumeText || "").trim().length > 0;
      const jobTextOk = (jobTextForScan || "").trim().length > 0;
      const wantsScanCv = atsEngineResolved === "scan_cv";
      const canUseScan =
        wantsScanCv && scanUrl.length > 0 && resumeOk && jobTextOk;
      console.info("[ATS] apply pipeline", {
        applicationId: application._id?.toString?.(),
        jobId: jobId?.toString?.(),
        jobAtsEngine: job.atsEngine,
        atsEngineResolved,
        scanApiBase: scanUrl || null,
        resumeTextLen: (resumeText || "").trim().length,
        jobTextLen: (jobTextForScan || "").trim().length,
        wantsScanCv,
        canUseScan,
        willCallScanChamdiemCvMatch: canUseScan,
      });
      if (wantsScanCv && !canUseScan) {
        console.warn(
          "[ATS] scan_cv selected but scan_chamdiemCV /api/analyze/match will NOT run — fix env, job text, or resume text.",
          {
            jobId: jobId?.toString?.(),
            hasScanUrl: scanUrl.length > 0,
            resumeTextLength: (resumeText || "").trim().length,
            jobTextLength: (jobTextForScan || "").trim().length,
            atsEngineInDb: job.atsEngine,
            hint: !scanUrl.length
              ? "Set ATS_SCAN_API_URL on the Node server (e.g. http://127.0.0.1:8000)"
              : !(resumeText || "").trim().length
                ? "Resume text is empty after extraction"
                : !(jobTextForScan || "").trim().length
                  ? "Job text for scan is empty (title/description/skills)"
                  : "unknown",
          },
        );
      }
      const validationBlock = {
        isValid: resumeOk,
        warnings: [...extractionMeta.warnings],
        confidence: resumeOk ? 0.6 : 0.1,
      };
      if (canUseScan) {
        try {
          console.info(
            "[ATS] invoking scan_chamdiemCV POST /api/analyze/match",
            { base: scanUrl },
          );
          const scan = await atsScanService.matchCvToJob(
            resumeText,
            jobTextForScan,
            scanUrl,
          );
          const m = atsScanService.mapScanResultToAiFields(scan, {
            job,
            cvText: resumeText,
          });
          application.aiAnalysis = {
            resumeScore: m.resumeScore,
            skillsMatch: m.skillsMatch,
            experienceMatch: m.experienceMatch,
            overallScore: m.overallScore,
            keyStrengths: m.keyStrengths,
            potentialConcerns: m.potentialConcerns,
            recommendedQuestions: m.recommendedQuestions,
            extractedInfo: m.extractedInfo,
            atsEngine: "scan_cv",
            scanDetails: m.scanDetails,
            analysisDate: new Date(),
            documentMetadata: docMeta,
            validation: validationBlock,
          };
        } catch (scanErr) {
          console.error(
            "ATS scan_cv failed, falling back to Gemini:",
            scanErr?.message || scanErr,
          );
          const aiResult = await geminiService.analyzeResumeForJob(geminiArgs);
          application.aiAnalysis = {
            resumeScore:
              typeof aiResult.overallScore === "number"
                ? aiResult.overallScore
                : 50,
            skillsMatch:
              typeof aiResult.skillsMatch === "number"
                ? aiResult.skillsMatch
                : 50,
            experienceMatch:
              typeof aiResult.experienceMatch === "number"
                ? aiResult.experienceMatch
                : 50,
            overallScore:
              typeof aiResult.overallScore === "number"
                ? aiResult.overallScore
                : 50,
            keyStrengths: Array.isArray(aiResult.keyStrengths)
              ? aiResult.keyStrengths
              : [],
            potentialConcerns: Array.isArray(aiResult.potentialConcerns)
              ? aiResult.potentialConcerns
              : [],
            recommendedQuestions: Array.isArray(aiResult.recommendedQuestions)
              ? aiResult.recommendedQuestions
              : [],
            extractedInfo: aiResult.extractedInfo || {},
            atsEngine: "gemini_fallback",
            analysisDate: new Date(),
            documentMetadata: docMeta,
            validation: {
              ...validationBlock,
              warnings: [
                ...validationBlock.warnings,
                "CV_MATCHING_HTTP_ERROR_FALLBACK_GEMINI",
              ],
            },
          };
        }
      } else {
        const aiResult = await geminiService.analyzeResumeForJob(geminiArgs);
        const skipReason = wantsScanCv ? "SCAN_CV_SKIPPED_USE_GEMINI" : null;
        const extraConcerns = [];
        application.aiAnalysis = {
          resumeScore:
            typeof aiResult.overallScore === "number"
              ? aiResult.overallScore
              : 50,
          skillsMatch:
            typeof aiResult.skillsMatch === "number"
              ? aiResult.skillsMatch
              : 50,
          experienceMatch:
            typeof aiResult.experienceMatch === "number"
              ? aiResult.experienceMatch
              : 50,
          overallScore:
            typeof aiResult.overallScore === "number"
              ? aiResult.overallScore
              : 50,
          keyStrengths: Array.isArray(aiResult.keyStrengths)
            ? aiResult.keyStrengths
            : [],
          potentialConcerns: [
            ...extraConcerns,
            ...(Array.isArray(aiResult.potentialConcerns)
              ? aiResult.potentialConcerns
              : []),
          ],
          recommendedQuestions: Array.isArray(aiResult.recommendedQuestions)
            ? aiResult.recommendedQuestions
            : [],
          extractedInfo: aiResult.extractedInfo || {},
          atsEngine: wantsScanCv ? "gemini_fallback" : "gemini",
          analysisDate: new Date(),
          documentMetadata: docMeta,
          validation: skipReason
            ? {
                ...validationBlock,
                warnings: [...validationBlock.warnings, skipReason],
              }
            : validationBlock,
        };
      }
      const resumeScore = application.aiAnalysis?.overallScore;
      const atsEnabled = !!job?.atsEnabled;
      const atsThreshold =
        typeof job?.atsResumeThreshold === "number"
          ? Math.min(100, Math.max(0, job.atsResumeThreshold))
          : 60;
      const hasCoverLetter =
        typeof application?.coverLetter === "string" &&
        application.coverLetter.trim().length > 0;
      const skipAtsBecauseCoverLetter =
        !!job?.atsSkipWhenCoverLetter && hasCoverLetter;
      if (
        atsEnabled &&
        !skipAtsBecauseCoverLetter &&
        typeof resumeScore === "number" &&
        resumeScore < atsThreshold
      ) {
        application.status = "rejected";
        application.timeline.push({
          status: "rejected",
          date: new Date(),
          note: applicantAtsPoliteMessage(job.title),
        });
      } else if (
        atsEnabled &&
        !skipAtsBecauseCoverLetter &&
        typeof resumeScore === "number" &&
        resumeScore >= atsThreshold
      ) {
        hrAtsPassInfo = {
          score: resumeScore,
          threshold: atsThreshold,
        };
      }
      await application.save();
    } catch (aiError) {
      console.error(
        "AI resume analysis failed for application",
        application._id?.toString?.(),
        aiError,
      );
    }
    await application.populate([
      {
        path: "job",
        select: "title location type salaryRange",
      },
    ]);
    try {
      const job = await Job.findById(jobId).select(
        "title postedBy atsEnabled atsResumeThreshold atsSkipWhenCoverLetter",
      );
      if (job) {
        const hrPassAts = hrAtsPassInfo && application.status !== "rejected";
        const hrTitle = hrPassAts
          ? "Ứng viên đạt ngưỡng ATS"
          : "Có đơn ứng tuyển mới";
        const hrMessage = hrPassAts
          ? `${lastName} ${firstName} đã ứng tuyển «${job.title}». Điểm CV ${hrAtsPassInfo.score}% đạt ngưỡng ATS (${hrAtsPassInfo.threshold}%). Vui lòng xem xét và xử lý tuyển dụng trực tiếp trên hệ thống.`
          : `${lastName} ${firstName} đã ứng tuyển vào ${job.title}`;
        await createAndEmit({
          toUserId: job.postedBy,
          toRole: "hr",
          type: "application_submitted",
          title: hrTitle,
          message: hrMessage,
          actionUrl: `/hr/applications/${application._id}`,
          entity: {
            kind: "Application",
            id: application._id,
          },
          priority: hrPassAts ? "high" : "medium",
          metadata: {
            applicantName: `${lastName} ${firstName}`,
            jobTitle: job.title,
            applicationId: application._id,
            ...(hrPassAts
              ? {
                  atsPassed: true,
                  atsScore: hrAtsPassInfo.score,
                  atsThreshold: hrAtsPassInfo.threshold,
                }
              : {}),
          },
          createdBy: applicantId,
        });
        await createAndEmit({
          toUserId: applicantId,
          toRole: "applicant",
          type: "application_submitted",
          title:
            application.status === "rejected"
              ? "Cập nhật đơn ứng tuyển"
              : "Nộp đơn thành công",
          message:
            application.status === "rejected"
              ? applicantAtsPoliteMessage(job.title)
              : `Đơn ứng tuyển của bạn cho vị trí ${job.title} đã được gửi thành công và đang chờ nhà tuyển dụng xem xét.`,
          actionUrl: `/applicant/applications`,
          entity: {
            kind: "Application",
            id: application._id,
          },
          priority: application.status === "rejected" ? "high" : "medium",
          metadata: {
            applicationId: application._id,
            jobTitle: job.title,
            status: application.status,
          },
          createdBy: applicantId,
        });
        if (application.status === "rejected") {
          const score = application?.aiAnalysis?.overallScore;
          const threshold =
            typeof job.atsResumeThreshold === "number"
              ? job.atsResumeThreshold
              : 60;
          await createAndEmit({
            toUserId: job.postedBy,
            toRole: "hr",
            type: "application_status_changed",
            title: "ATS tự động từ chối ứng viên",
            message: `${lastName} ${firstName} bị ATS từ chối cho vị trí ${job.title}${typeof score === "number" ? ` (điểm CV ${score}% < ngưỡng ${threshold}%)` : ""}.`,
            actionUrl: `/hr/applications/${application._id}`,
            entity: {
              kind: "Application",
              id: application._id,
            },
            priority: "high",
            metadata: {
              reason: "ATS_AUTO_REJECT",
              applicantName: `${lastName} ${firstName}`,
              jobTitle: job.title,
              applicationId: application._id,
              score,
              threshold,
            },
            createdBy: applicantId,
          });
          await createAndEmit({
            toUserId: applicantId,
            toRole: "applicant",
            type: "application_status_changed",
            title: "Kết quả sàng lọc ATS",
            message: applicantAtsPoliteMessage(job.title),
            actionUrl: `/applicant/applications`,
            entity: {
              kind: "Application",
              id: application._id,
            },
            priority: "high",
            metadata: {
              reason: "ATS_AUTO_REJECT",
              applicationId: application._id,
              jobTitle: job.title,
              score,
              threshold,
            },
            createdBy: applicantId,
          });
        }
      }
    } catch (notifError) {
      console.error("Failed to send application notification:", notifError);
    }
    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    console.error("Application submission error:", error);
    res.status(500).json({
      message: "Error submitting application",
      error: error.message,
    });
  }
});

// api lấy danh sách CV ứng tuyển
router.get("/", auth, async (req, res) => {
  try {
    const applicantId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;
    const query = {
      applicant: applicantId,
    };
    if (status && typeof status === "string") {
      const allowed = [
        "submitted",
        "under_review",
        "interview_scheduled",
        "interview_confirmed",
        "interview_passed",
        "offer_extended",
        "offer_accepted",
        "offer_declined",
        "rejected",
        "withdrawn",
      ];
      if (allowed.includes(status)) {
        query.status = status;
      }
    }
    const applications = await Application.find(query)
      .populate([
        {
          path: "job",
          select:
            "title location jobType salaryRange status jobCode code referenceCode",
        },
        {
          path: "profileResumeId",
          select:
            "fileName originalName fileSize mimeType uploadDate parsedData",
        },
      ])
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await Application.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    res.json({
      applications: applications.map(enrichApplicationForApplicantList),
      pagination: {
        currentPage: page,
        totalPages,
        totalApplications: total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({
      message: "Error fetching applications",
      error: error.message,
    });
  }
});

//api xem danh sách lịch phỏng vấn
router.get(
  "/confirm-interview/preview",
  auth,
  query("applicationId").isMongoId().withMessage("applicationId không hợp lệ"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      const { applicationId } = req.query;
      const application = await Application.findOne({
        _id: applicationId,
        applicant: req.user.id,
        status: "interview_scheduled",
      })
        .populate({
          path: "job",
          select: "title jobCode code referenceCode",
        })
        .lean();
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn chờ xác nhận lịch phỏng vấn.",
        });
      }
      if (application.interviewInvite?.confirmedAt) {
        return res.status(409).json({
          success: false,
          message: "Bạn đã xác nhận lịch phỏng vấn này trước đó.",
        });
      }
      const inv = application.interviewInvite || {};
      let scheduledAt = inv.scheduledAt;
      if (!scheduledAt && inv.hrNote) {
        const parsed = parseScheduledAtFromHrNote(inv.hrNote);
        if (parsed) scheduledAt = parsed;
      }
      const companyName = "FindMe";
      const recruitmentCode = getRecruitmentCodeFromJob(application.job);
      res.json({
        success: true,
        data: {
          applicationId: application._id,
          recruitmentCode,
          jobTitle: application.job?.title,
          companyName,
          scheduledAt,
          jobAddressLine: inv.jobAddressLine,
          venueOrLink: inv.venueOrLink,
          hrNote: inv.hrNote,
        },
      });
    } catch (error) {
      console.error("confirm-interview preview error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

//api xác nhận lịch phỏng vấn
router.post(
  "/confirm-interview",
  auth,
  [body("applicationId").isMongoId().withMessage("applicationId không hợp lệ")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      const { applicationId } = req.body;
      const application = await Application.findOne({
        _id: applicationId,
        applicant: req.user.id,
        status: "interview_scheduled",
      });
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn chờ xác nhận hoặc bạn không có quyền.",
        });
      }
      if (application.interviewInvite?.confirmedAt) {
        return res.status(409).json({
          success: false,
          message: "Lịch phỏng vấn đã được xác nhận.",
        });
      }
      application.interviewInvite.confirmedAt = new Date();
      application.status = "interview_confirmed";
      application.markModified("interviewInvite");
      await application.save();
      const iv = await Interview.findOne({
        application: application._id,
        status: "scheduled",
      }).sort({
        createdAt: -1,
      });
      if (iv) {
        iv.status = "confirmed";
        iv.updatedAt = new Date();
        await iv.save();
      }
      try {
        const job = await Job.findById(application.job).select(
          "title postedBy",
        );
        if (job) {
          await createAndEmit({
            toUserId: application.applicant,
            toRole: "applicant",
            type: "application_status_changed",
            title: "Đã xác nhận lịch phỏng vấn",
            message: `Bạn đã xác nhận lịch phỏng vấn cho vị trí ${job.title}. Chúc bạn phỏng vấn thuận lợi!`,
            actionUrl: "/applicant/applications",
            entity: {
              kind: "Application",
              id: application._id,
            },
            priority: "medium",
            metadata: {
              applicationId: application._id,
            },
            createdBy: req.user.id,
          });
          if (job.postedBy) {
            await createAndEmit({
              toUserId: job.postedBy,
              toRole: "hr",
              type: "application_status_changed",
              title: "Ứng viên đã xác nhận lịch phỏng vấn",
              message: `Ứng viên đã xác nhận lịch phỏng vấn cho đơn ứng tuyển vị trí "${job.title}".`,
              actionUrl: "/hr/applications",
              entity: {
                kind: "Application",
                id: application._id,
              },
              priority: "medium",
              metadata: {
                applicationId: application._id,
                newStatus: "interview_confirmed",
              },
              createdBy: req.user.id,
            });
          }
        }
      } catch (e) {
        console.warn("confirm interview notif:", e.message);
      }
      res.json({
        success: true,
        message: "Đã xác nhận lịch phỏng vấn.",
        data: {
          status: application.status,
        },
      });
    } catch (error) {
      console.error("confirm-interview error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

//api xem chi tiết đơn ứng tuyển
router.get("/:id", auth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const applicantId = req.user.id;
    const application = await Application.findOne({
      _id: applicationId,
      applicant: applicantId,
    }).populate([
      {
        path: "job",
        select: "title description location type salaryRange requirements",
      },
    ]);
    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }
    res.json({
      application,
    });
  } catch (error) {
    console.error("Get application error:", error);
    res.status(500).json({
      message: "Error fetching application",
      error: error.message,
    });
  }
});
router.delete("/:id", auth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const applicantId = req.user.id;
    const application = await Application.findOne({
      _id: applicationId,
      applicant: applicantId,
    });
    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }
    if (
      ["interview_passed", "offered", "hired", "withdrawn"].includes(
        application.status,
      )
    ) {
      return res.status(400).json({
        message: "Application cannot be withdrawn at this stage",
      });
    }
    application.status = "withdrawn";
    await application.save();
    res.json({
      message: "Application withdrawn successfully",
      application,
    });
  } catch (error) {
    console.error("Withdraw application error:", error);
    res.status(500).json({
      message: "Error withdrawing application",
      error: error.message,
    });
  }
});
router.get("/check/:jobId", auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const applicantId = req.user.id;
    const existingApplication = await Application.findOne({
      applicant: applicantId,
      job: jobId,
    });
    res.json({
      hasApplied: !!existingApplication,
      application: existingApplication
        ? {
            id: existingApplication._id,
            status: existingApplication.status,
            appliedAt: existingApplication.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Check application error:", error);
    res.status(500).json({
      message: "Error checking application status",
      error: error.message,
    });
  }
});
router.get("/:id/resume", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.id;
    const application = await Application.findOne({
      _id: id,
      applicant: applicantId,
    }).populate("profileResumeId");
    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }
    let resumeData = null;
    let fileName = "";
    let mimeType = "";
    if (application.useProfileResume && application.profileResumeId) {
      const resume = application.profileResumeId;
      if (resume.fileData) {
        resumeData = Buffer.from(resume.fileData, "base64");
      } else if (resume.fileUrl) {
        resumeData = await fetchBufferFromUrl(resume.fileUrl);
      }
      fileName = resume.originalName || resume.fileName;
      mimeType = resume.mimeType;
    } else if (application.customResume && application.customResume.fileData) {
      resumeData = application.customResume.fileData;
      fileName = application.customResume.fileName;
      mimeType = application.customResume.fileMimeType;
    }
    if (!resumeData) {
      return res.status(404).json({
        message: "Resume not found",
      });
    }
    const safeName = (fileName || "cv.pdf").replace(/["\r\n]/g, "");
    res.set({
      "Content-Type": mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": resumeData.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(resumeData);
  } catch (error) {
    console.error("Resume download error:", error);
    res.status(500).json({
      message: "Error downloading resume",
      error: error.message,
    });
  }
});
module.exports = router;
