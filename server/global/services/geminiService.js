class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      this.ai = null;
      this.modelId = null;
      return;
    }
    this.ai = null;
    this.modelId = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }
  /**
   * Service: Gửi yêu cầu phân tích CV ứng viên so với mô tả công việc (Job Description)
   * tới AI Gemini. Trả về kết quả JSON gồm điểm số phù hợp, điểm mạnh, điểm yếu, và thông tin trích xuất (kỹ năng, học vấn...).
   */
  async analyzeResumeForJob({
    resumeText,
    resumeFile,
    candidateName,
    jobTitle,
    jobDescription,
    requiredSkills = [],
    preferredSkills = [],
    experienceLevel,
    applicationId,
    jobId
  }) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API not configured');
    }
    try {
      const safeResumeText = (resumeText || '').slice(0, 6000);
      const skillsLine = [...(requiredSkills || []), ...(preferredSkills || [])].filter(Boolean).join(', ');
      const basePrompt = `You are an unbiased technical recruiter assistant.
Analyze the candidate's resume against the job description and produce a structured, fair assessment.
Focus on skills, experience depth, and education fit. Avoid any discrimination (age, gender, ethnicity, etc.).
IMPORTANT: Write ALL human-readable content in Vietnamese (summary bullets, strengths, concerns, questions, extracted text fields). Keep JSON keys exactly as requested in English.

Application ID: ${applicationId || 'n/a'}
Job ID: ${jobId || 'n/a'}
Candidate: ${candidateName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}
Experience Level (self-reported): ${experienceLevel || 'Unknown'}
Job Description (truncated):
${(jobDescription || '').slice(0, 2000)}

Required / Preferred Skills (from JD): ${skillsLine || '(none specified)'}

If a resume file (PDF/DOC/DOCX) is attached, use it as the primary source of truth. Use the inline file content (including any images or embedded text) to understand the candidate's skills and experience. The truncated RESUME TEXT below is only a helper and may be empty for scanned PDFs.

RESUME TEXT (truncated, may be empty if PDF is image-only):
${safeResumeText}
END_RESUME_HELPER

Now respond ONLY with JSON, no prose, matching EXACT schema:
{
  "overallScore": number (0-100),
  "skillsMatch": number (0-100),
  "experienceMatch": number (0-100),
  "seniorityEstimate": "junior" | "mid" | "senior" | "lead" | "unknown",
  "keyStrengths": [string],
  "potentialConcerns": [string],
  "recommendedQuestions": [string],
  "extractedInfo": {
    "skills": [string],
    "education": [ { "degree": string, "institution": string, "year": string } ],
    "workExperience": [ { "company": string, "position": string, "duration": string, "achievements": [string] } ],
    "projects": [ { "name": string, "description": string, "technologies": [string] } ],
    "certifications": [string]
  }
}`;
      const ai = await this.getClient();
      const parts = [{
        text: basePrompt
      }];
      if (resumeFile && typeof resumeFile.data === 'string' && resumeFile.data.length > 0) {
        const mimeType = resumeFile.mimeType || 'application/pdf';
        parts.push({
          inlineData: {
            mimeType,
            data: resumeFile.data
          }
        });
      }
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [{
          role: 'user',
          parts
        }]
      });
      let text = typeof response.text === 'function' ? response.text() : response.text;
      if (typeof text === 'string') {
        text = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
      }
      const parsed = this.safeParseJson(text);
      if (!parsed) {
        return this.createFallbackResumeAnalysis();
      }
      return parsed;
    } catch (error) {
      console.error('Gemini resume analysis error:', error);
      return this.createFallbackResumeAnalysis();
    }
  }
  /**
   * Service: Phân tích nhận xét phỏng vấn (Interview Feedback) của nhà tuyển dụng
   * để tạo ra một bản tổng hợp khách quan, không thiên vị (non-discriminatory) bằng tiếng Việt.
   * Cảnh báo nếu phát hiện ngôn từ mang tính định kiến (flags).
   */
  async analyzeInterviewFeedback({
    feedbackText,
    candidateName,
    jobTitle,
    jobDescription,
    applicationId,
    jobId,
    skills,
    status
  }) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API not configured');
    }
    try {
      const raw = (feedbackText || '').trim();
      const normalized = raw.replace(/\s+/g, ' ').toLowerCase();
      const isPlaceholder = normalized === '' || normalized === 'no interview feedback available.' || normalized === 'no interview feedback available' || normalized === 'n/a' || normalized === 'none';
      if (isPlaceholder) {
        return this.createNoFeedbackResult(applicationId);
      }
      const identityBlock = `Application ID: ${applicationId || 'n/a'}\nJob ID: ${jobId || 'n/a'}\nStatus: ${status || 'n/a'}`;
      const skillsBlock = Array.isArray(skills) && skills.length ? `Candidate / Parsed Skills: ${skills.slice(0, 30).join(', ')}` : 'Candidate / Parsed Skills: (none captured)';
      const prompt = `You are an unbiased HR talent assistant. Analyze interview feedback and produce a structured, fair, non-discriminatory assessment.
If feedback is missing, state that clearly but DO NOT invent strengths or concerns.
Flag any potentially biased wording (age, gender, ethnicity, etc.) in 'flags'.
IMPORTANT: Write ALL human-readable output values in Vietnamese. Keep JSON keys exactly as requested in English.

${identityBlock}
Candidate: ${candidateName || 'Unknown'}
Job Title: ${jobTitle || 'Unknown'}
Job Description (truncated): ${(jobDescription || '').slice(0, 1200)}
${skillsBlock}

Interview Feedback Aggregate (verbatim):\n${feedbackText}\nEND_FEEDBACK

Respond ONLY with JSON, no prose, matching EXACT schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": number (0-1),
  "summary": string,  
  "strengths": [string],
  "concerns": [string],
  "flags": [string],
  "suggestedDecisionNote": string,
  "reasoning": {"summaryOfEvidence": string, "upsideFactors": [string], "riskFactors": [string]}
}`;
      const ai = await this.getClient();
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: prompt
      });
      let text = typeof response.text === 'function' ? response.text() : response.text;
      if (typeof text === 'string') {
        text = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
      }
      return this.parseInterviewFeedbackResponse(text);
    } catch (error) {
      console.error('Gemini interview feedback analysis error:', error);
      return this.createFallbackInterviewFeedback();
    }
  }
  /**
   * Hàm phụ trợ: Trích xuất và phân tích chuỗi JSON trả về từ AI một cách an toàn.
   * Xóa bỏ các ký tự Markdown thừa (như ```json) nếu có.
   */
  safeParseJson(text) {
    if (!text || typeof text !== 'string') return null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (e) {
      console.error('safeParseJson error:', e);
      return null;
    }
  }
  /**
   * Hàm phụ trợ: Xử lý và phân tích kết quả trả về từ hàm analyzeInterviewFeedback.
   * Trả về kết quả phân tích hoặc dữ liệu dự phòng (fallback) nếu lỗi.
   */
  parseInterviewFeedbackResponse(text) {
    try {
      const parsed = this.safeParseJson(text);
      if (parsed) return parsed;
      return this.createFallbackInterviewFeedback();
    } catch (e) {
      console.error('Error parsing interview feedback response:', e);
      return this.createFallbackInterviewFeedback();
    }
  }
  /**
   * Hàm phụ trợ: Tạo kết quả đánh giá phỏng vấn dự phòng khi API Gemini bị lỗi hoặc không khả dụng.
   */
  createFallbackInterviewFeedback() {
    return {
      sentiment: 'neutral',
      confidence: 0,
      summary: 'Phân tích AI hiện tạm thời chưa khả dụng.',
      strengths: [],
      concerns: [],
      flags: ['AI_UNAVAILABLE'],
      suggestedDecisionNote: '',
      reasoning: {
        summaryOfEvidence: 'Chưa có phân tích AI; vui lòng xem xét thủ công.',
        upsideFactors: [],
        riskFactors: []
      }
    };
  }
  /**
   * Hàm phụ trợ: Tạo kết quả phân tích CV dự phòng khi API Gemini bị lỗi hoặc không khả dụng.
   */
  createFallbackResumeAnalysis() {
    return {
      overallScore: 50,
      skillsMatch: 50,
      experienceMatch: 50,
      seniorityEstimate: 'unknown',
      keyStrengths: ['Phân tích AI chưa khả dụng; đang dùng điểm trung tính mặc định.'],
      potentialConcerns: [],
      recommendedQuestions: [],
      extractedInfo: {
        skills: [],
        education: [],
        workExperience: [],
        projects: [],
        certifications: []
      }
    };
  }
  /**
   * Hàm phụ trợ: Trả về kết quả mặc định khi không có nhận xét phỏng vấn (feedback text rỗng).
   */
  createNoFeedbackResult(applicationId) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      summary: 'Chưa có phản hồi phỏng vấn để phân tích.',
      strengths: [],
      concerns: [],
      flags: ['NO_FEEDBACK'],
      suggestedDecisionNote: '',
      reasoning: {
        summaryOfEvidence: 'Hiện chưa có phản hồi từ người phỏng vấn để AI phân tích.',
        upsideFactors: [],
        riskFactors: []
      },
      _meta: {
        applicationId
      }
    };
  }
  /**
   * Hàm phụ trợ: Khởi tạo và trả về đối tượng Client của Google Gen AI (Gemini).
   * Sử dụng Dynamic Import vì thư viện '@google/genai' là module ES.
   */
  async getClient() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API not configured');
    }
    if (!this.ai) {
      const {
        GoogleGenAI
      } = await import('@google/genai');
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });
    }
    return this.ai;
  }
}
module.exports = new GeminiService();