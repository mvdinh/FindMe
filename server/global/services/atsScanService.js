const scanChamdiemCvClient = require("./scanChamdiemCvClient");

/**
 * Hàm phụ trợ: Gộp các trường thông tin của tin tuyển dụng (Tiêu đề, Mô tả, Kỹ năng)
 * thành một khối văn bản (text) duy nhất để gửi cho AI scan.
 */
function buildJobTextForScan(job) {
  if (!job) return "";
  const skillLine = [
    ...(job.requiredSkills || []),
    ...(job.preferredSkills || []),
  ]
    .filter(Boolean)
    .join(", ");
  const parts = [
    job.title,
    job.description,
    skillLine ? `Kỹ năng: ${skillLine}` : "",
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 15000);
}

/**
 * Service: Gửi đoạn văn bản CV và văn bản Job sang microservice AI (scanChamdiemCvClient)
 * để tính toán điểm số phù hợp (matching score).
 */
async function matchCvToJob(cvText, jobText, baseUrlOverride) {
  return scanChamdiemCvClient.analyzeMatch(cvText, jobText, baseUrlOverride);
}

/**
 * Hàm phụ trợ: Chuẩn hóa chuỗi văn bản (đưa về chữ thường, xóa khoảng trắng thừa)
 * để so khớp từ khóa kỹ năng dễ dàng hơn.
 */
function normalizeToken(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Hàm phụ trợ: Kiểm tra xem một từ khóa kỹ năng (skill) có xuất hiện trong nội dung CV hay không.
 * Nếu kỹ năng ngắn (như C, Go), dùng Regex để khớp chính xác biên của từ.
 */
function containsSkill(cvTextLower, skill) {
  const t = normalizeToken(skill);
  if (!t) return false;
  // Keep simple + safe: case-insensitive substring match.
  // For short tokens (e.g. "C", "Go") we require word boundary-ish match.
  if (t.length <= 2) {
    const re = new RegExp(
      `(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      "i",
    );
    return re.test(cvTextLower);
  }
  return cvTextLower.includes(t);
}

/**
 * Hàm phụ trợ: Trích xuất tín hiệu kỹ năng.
 * Tìm xem trong CV có bao nhiêu kỹ năng bắt buộc (required) và ưu tiên (preferred) của Job.
 * Phân tách thành các mảng: đã tìm thấy (found) và còn thiếu (missing).
 */
function extractSkillSignals({ job, cvText }) {
  const required = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  const preferred = Array.isArray(job?.preferredSkills)
    ? job.preferredSkills
    : [];
  const cvLower = normalizeToken(cvText);
  const requiredFound = [];
  const requiredMissing = [];
  for (const s of required) {
    if (containsSkill(cvLower, s)) requiredFound.push(s);
    else requiredMissing.push(s);
  }
  const preferredFound = [];
  for (const s of preferred) {
    if (containsSkill(cvLower, s)) preferredFound.push(s);
  }
  return {
    requiredFound,
    requiredMissing,
    preferredFound,
  };
}

/**
 * Dịch vụ cốt lõi: Xây dựng bản nhận xét chi tiết (Narrative) bằng ngôn ngữ tự nhiên (Tiếng Việt)
 * từ kết quả điểm số thô do AI trả về. Đưa ra Điểm mạnh (strengths), Điểm yếu (concerns)
 * và Các câu hỏi gợi ý để HR dùng khi phỏng vấn ứng viên.
 */
function buildDetailedScanNarrative(scan, context = {}) {
  const final = typeof scan.final_score === "number" ? scan.final_score : 50;
  const embN =
    typeof scan.embedding_score === "number" ? scan.embedding_score : final;
  const rerN =
    typeof scan.rerank_score === "number" ? scan.rerank_score : final;
  const expl = scan.explanation || "";
  const b =
    scan.breakdown && typeof scan.breakdown === "object"
      ? scan.breakdown
      : null;
  const job = context?.job || null;
  const cvText = context?.cvText || "";
  const hasSkillContext =
    job &&
    (Array.isArray(job.requiredSkills) || Array.isArray(job.preferredSkills)) &&
    String(cvText || "").trim();
  const skillSignals = hasSkillContext
    ? extractSkillSignals({ job, cvText })
    : null;

  const tierLabel =
    expl === "Strong match"
      ? "khá tốt"
      : expl === "Moderate match"
        ? "trung bình"
        : expl === "Low match"
          ? "còn thấp"
          : "đã ghi nhận";

  const strengths = [];

  strengths.push(
    `Đánh giá tự động: độ phù hợp giữa hồ sơ và tin tuyển ở mức ${tierLabel} (khoảng ${Math.round(final)} điểm trên 100). Đây là điểm tổng hợp để tham khảo nhanh, không thay cho việc đọc CV.`,
  );

  if (
    skillSignals &&
    Array.isArray(job?.requiredSkills) &&
    job.requiredSkills.length
  ) {
    const found = skillSignals.requiredFound.length;
    const total = job.requiredSkills.length;
    if (found > 0) {
      const top = skillSignals.requiredFound.slice(0, 8).join(", ");
      strengths.push(
        `Theo “kỹ năng bắt buộc” trong tin: phát hiện khoảng ${found}/${total} kỹ năng xuất hiện trong CV (ví dụ: ${top}${found > 8 ? ", …" : ""}).`,
      );
    } else {
      strengths.push(
        `Theo “kỹ năng bắt buộc” trong tin: chưa phát hiện kỹ năng nào xuất hiện rõ ràng trong CV (có thể do CV dùng từ đồng nghĩa hoặc định dạng khác).`,
      );
    }
  }

  if (
    skillSignals &&
    Array.isArray(job?.preferredSkills) &&
    job.preferredSkills.length &&
    skillSignals.preferredFound.length
  ) {
    const topPref = skillSignals.preferredFound.slice(0, 8).join(", ");
    strengths.push(
      `Kỹ năng “ưu tiên” có xuất hiện trong CV (ví dụ: ${topPref}${skillSignals.preferredFound.length > 8 ? ", …" : ""}).`,
    );
  }

  if (embN >= 75 && rerN >= 65) {
    strengths.push(
      `Cả nội dung tổng thể (${Math.round(embN)}%) lẫn mức khớp chi tiết hơn (${Math.round(rerN)}%) đều ở mức khá — hồ sơ và mô tả công việc nhìn chung đi cùng hướng.`,
    );
  } else if (embN >= 60 && rerN >= 55) {
    strengths.push(
      `Nội dung chung giữa CV và tin tuyển có độ gần khoảng ${Math.round(embN)}%; phần so khớp chi tiết hơn khoảng ${Math.round(rerN)}% — phù hợp để HR mở CV xem tiếp.`,
    );
  } else {
    strengths.push(
      `Mức gần về chủ đề chung khoảng ${Math.round(embN)}%; mức khớp khi so kỹ nội dung khoảng ${Math.round(rerN)}%.`,
    );
  }

  if (
    typeof embN === "number" &&
    typeof rerN === "number" &&
    Math.abs(embN - rerN) < 12
  ) {
    strengths.push(
      "Hai mức đo trên khá đồng điệu — ít có dấu hiệu “nói chung giống nhưng chi tiết lệch hẳn”.",
    );
  }

  if (b && b.boost_strong_pair) {
    strengths.push(
      "Hệ thống ghi nhận cả hai chiều đều rất khớp; đây là nhóm hồ sơ đáng ưu tiên xem sớm nếu các điều kiện khác phù hợp.",
    );
  } else if (b && b.boost_qa_domain) {
    strengths.push(
      "CV và tin tuyển đều có dấu hiệu liên quan tới kiểm thử / chất lượng phần mềm — phù hợp nếu vị trí thuộc nhóm này.",
    );
  }

  strengths.push(
    `Trên màn hình: cột “phù hợp kỹ năng” và “phù hợp kinh nghiệm” là hai cách nhìn khác nhau về cùng một cặp hồ sơ–tin tuyển; cột “tổng thể” là điểm dùng so với ngưỡng ATS (khoảng ${Math.round(final)}%).`,
  );

  const concerns = [];

  if (
    skillSignals &&
    Array.isArray(job?.requiredSkills) &&
    job.requiredSkills.length &&
    skillSignals.requiredMissing.length
  ) {
    const missTop = skillSignals.requiredMissing.slice(0, 8).join(", ");
    concerns.push(
      `Một số “kỹ năng bắt buộc” chưa thấy xuất hiện rõ trong CV (ví dụ: ${missTop}${skillSignals.requiredMissing.length > 8 ? ", …" : ""}). Nên mở CV để xác minh (có thể nằm ở dự án/kinh nghiệm nhưng viết khác).`,
    );
  }

  if (b && b.marketing_mismatch_penalty) {
    concerns.push(
      "Một bên hồ sơ và một bên tin tuyển có vẻ nhấn mạnh nội dung marketing / truyền thông khác nhau — điểm tổng có thể bị hạ mạnh. Nên xem có đúng đối tượng ứng tuyển mong muốn không.",
    );
  }

  if (
    typeof embN === "number" &&
    typeof rerN === "number" &&
    Math.abs(embN - rerN) >= 20
  ) {
    concerns.push(
      "Hai mức đo chênh nhau khá nhiều: có thể cùng chủ đề nhưng chi tiết công việc hoặc cách diễn đạt chưa khớp — nên đọc CV trực tiếp trước khi kết luận.",
    );
  }

  concerns.push(
    "Cách chấm này không liệt kê từng kỹ năng, học vấn hay dự án như phân tích bằng AI ngôn ngữ; HR vẫn cần mở file CV để đối chiếu với yêu cầu thực tế.",
  );

  concerns.push(
    "Quyết định mời phỏng vấn hay loại hồ sơ nên dựa trên kinh nghiệm của HR và các tiêu chí công ty, không chỉ dựa vào điểm tự động.",
  );

  const questions = [];
  if (final < 55) {
    questions.push(
      "Anh/chị có thể kể ngắn gọn kinh nghiệm hoặc dự án gần nhất liên quan trực tiếp tới vị trí này không?",
    );
    questions.push("Theo anh/chị, điểm mạnh nhất khi làm việc này là gì?");
  } else if (final < 75) {
    questions.push(
      "Trong các dự án đã làm, dự án nào gần nhất với công việc mô tả trong tin tuyển?",
    );
    questions.push("Trong 3–6 tháng đầu, anh/chị kỳ vọng đóng góp gì cụ thể?");
  } else {
    questions.push(
      "Anh/chị có thể mô tả một tình huống thực tế: thách thức, việc anh/chị làm và kết quả đạt được?",
    );
    questions.push(
      "Có yêu cầu nào trong tin tuyển mà anh/chị muốn làm rõ thêm không?",
    );
  }
  questions.push(
    "Anh/chị có câu hỏi gì về đội nhóm hoặc công việc hàng ngày của vị trí này?",
  );

  return { strengths, concerns, questions };
}

/**
 * Hàm phụ trợ: Chuyển đổi kết quả thô từ AI Scan thành cấu trúc đối tượng (object)
 * chuẩn hóa mà MongoDB (Application Document) lưu trữ (gồm điểm số, mảng skills, strengths, concerns).
 */
function mapScanResultToAiFields(scan, context = {}) {
  const final = typeof scan.final_score === "number" ? scan.final_score : 50;
  const embN =
    typeof scan.embedding_score === "number" ? scan.embedding_score : final;
  const rerN =
    typeof scan.rerank_score === "number" ? scan.rerank_score : final;
  const { strengths, concerns, questions } = buildDetailedScanNarrative(
    scan,
    context,
  );
  const job = context?.job || null;
  const cvText = context?.cvText || "";
  const skillSignals =
    job &&
    (Array.isArray(job.requiredSkills) || Array.isArray(job.preferredSkills)) &&
    String(cvText || "").trim()
      ? extractSkillSignals({ job, cvText })
      : null;

  return {
    resumeScore: final,
    skillsMatch: embN,
    experienceMatch: rerN,
    overallScore: final,
    keyStrengths: strengths,
    potentialConcerns: concerns,
    recommendedQuestions: questions,
    extractedInfo: {
      skills: skillSignals
        ? Array.from(
            new Set(
              [...skillSignals.requiredFound, ...skillSignals.preferredFound]
                .map((s) => String(s || "").trim())
                .filter(Boolean),
            ),
          )
        : [],
      education: [],
      workExperience: [],
      projects: [],
      certifications: [],
    },
    atsEngine: "scan_cv",
    scanDetails: {
      embedding_score: scan.embedding_score,
      rerank_score: scan.rerank_score,
      rerank_raw: scan.rerank_raw,
      final_score: scan.final_score,
      explanation: scan.explanation,
      breakdown: {
        ...(scan.breakdown && typeof scan.breakdown === "object"
          ? scan.breakdown
          : {}),
        ...(skillSignals ? { skillSignals } : {}),
      },
    },
  };
}

module.exports = {
  buildJobTextForScan,
  matchCvToJob,
  mapScanResultToAiFields,
  buildDetailedScanNarrative,
  scanChamdiemCv: scanChamdiemCvClient,
};
