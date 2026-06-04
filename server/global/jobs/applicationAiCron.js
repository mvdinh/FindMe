const cron = require('node-cron');
const Application = require('../models/Application');
const Job = require('../models/Job');
const geminiService = require('../services/geminiService');
const atsScanService = require('../services/atsScanService');

let pdfParseModule = null;
try {
  pdfParseModule = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse failed to load; PDF text extraction disabled:', e?.message || e);
}

async function extractTextFromPdfBuffer(buffer) {
  if (!pdfParseModule || !buffer) return null;
  if (typeof pdfParseModule === 'function') {
    const parsed = await pdfParseModule(buffer);
    return {
      text: typeof parsed?.text === 'string' ? parsed.text : '',
      numpages: parsed?.numpages
    };
  }
  const PDFParse = pdfParseModule.PDFParse;
  if (!PDFParse) throw new Error('pdf-parse: PDFParse export missing');
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const text = textResult && typeof textResult.text === 'string' ? textResult.text : '';
    const numpages =
      typeof textResult?.total === 'number'
        ? textResult.total
        : Array.isArray(textResult?.pages)
          ? textResult.pages.length
          : undefined;
    return { text, numpages };
  } finally {
    try {
      await parser.destroy();
    } catch (_) {}
  }
}

async function runAtsAiPipeline({ applicationId }) {
  const startedAt = new Date();
  await Application.findByIdAndUpdate(applicationId, {
    $set: {
      'aiProcessing.status': 'processing',
      'aiProcessing.startedAt': startedAt,
      'aiProcessing.finishedAt': null,
      'aiProcessing.error': null
    }
  });

  try {
    const application = await Application.findById(applicationId).select(
      'job applicant personalInfo experience coverLetter customResume useProfileResume profileResumeId aiProcessing'
    );
    if (!application) throw new Error('APPLICATION_NOT_FOUND');
    const job = await Job.findById(application.job);
    if (!job) throw new Error('JOB_NOT_FOUND');

    // Only supporting customResume here (this route uses upload resume). For profile resume apply, use other pipeline.
    const resumeBuffer = application.customResume?.fileData;
    const resumeMime = application.customResume?.fileMimeType;
    const resumeName = application.customResume?.fileName;

    const scanUrl = (process.env.ATS_SCAN_API_URL || '').trim();
    const atsEngineResolved = (job.atsEngine || 'gemini').toString().trim();
    let resumeText = '';
    let extractionMeta = {
      method: 'none',
      pages: undefined,
      wordCount: undefined,
      characterCount: undefined,
      warnings: []
    };

    if (resumeBuffer) {
      const buffer = Buffer.isBuffer(resumeBuffer) ? resumeBuffer : Buffer.from(resumeBuffer);
      const mimeType = resumeMime || '';
      const fileName = resumeName || '';
      const header = buffer.slice(0, 8).toString('ascii');
      const looksLikePdf = header.startsWith('%PDF-');
      const isPdf = looksLikePdf || mimeType === 'application/pdf' || /pdf/i.test(mimeType) || /\.pdf$/i.test(fileName);
      if (isPdf && pdfParseModule) {
        extractionMeta.method = 'pdf-parse';
        try {
          const parsed = await extractTextFromPdfBuffer(buffer);
          const text = parsed && typeof parsed.text === 'string' ? parsed.text : '';
          const trimmed = text.trim();
          if (trimmed.length === 0) {
            extractionMeta.warnings.push('PDF_TEXT_EXTRACTION_EMPTY');
            resumeText = '';
          } else {
            resumeText = text;
            extractionMeta.pages = parsed.numpages;
            extractionMeta.characterCount = text.length;
            extractionMeta.wordCount = trimmed.split(/\s+/).filter(Boolean).length;
          }
        } catch (e) {
          extractionMeta.warnings.push('PDF_TEXT_EXTRACTION_FAILED');
          resumeText = '';
        }
      } else if (!isPdf) {
        extractionMeta.method = 'utf8-decode';
        try {
          resumeText = buffer.toString('utf8');
          extractionMeta.characterCount = resumeText.length;
          extractionMeta.wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
        } catch (e) {
          extractionMeta.warnings.push('UTF8_DECODE_FAILED');
          resumeText = '';
        }
      }
    }

    const docMeta = {
      fileSize: application.customResume?.fileSize,
      fileName: application.customResume?.fileName,
      fileType: application.customResume?.fileMimeType,
      extractedAt: new Date(),
      pages: extractionMeta.pages,
      wordCount: extractionMeta.wordCount,
      characterCount: extractionMeta.characterCount
    };

    const jobTextForScan = atsScanService.buildJobTextForScan(job);
    const resumeOk = (resumeText || '').trim().length > 0;
    const jobTextOk = (jobTextForScan || '').trim().length > 0;
    const wantsScanCv = atsEngineResolved === 'scan_cv';
    const canUseScan = wantsScanCv && scanUrl.length > 0 && resumeOk && jobTextOk;
    const validationBlock = {
      isValid: resumeOk,
      warnings: [...extractionMeta.warnings],
      confidence: resumeOk ? 0.6 : 0.1
    };

    let aiAnalysis = null;
    if (canUseScan) {
      const scan = await atsScanService.matchCvToJob(resumeText, jobTextForScan, scanUrl);
      const m = atsScanService.mapScanResultToAiFields(scan, { job, cvText: resumeText });
      aiAnalysis = {
        resumeScore: m.resumeScore,
        skillsMatch: m.skillsMatch,
        experienceMatch: m.experienceMatch,
        overallScore: m.overallScore,
        keyStrengths: m.keyStrengths,
        potentialConcerns: m.potentialConcerns,
        recommendedQuestions: m.recommendedQuestions,
        extractedInfo: m.extractedInfo,
        atsEngine: 'scan_cv',
        scanDetails: m.scanDetails,
        analysisDate: new Date(),
        documentMetadata: docMeta,
        validation: validationBlock
      };
    } else {
      const geminiArgs = {
        resumeText,
        resumeFile: resumeBuffer
          ? {
              mimeType: resumeMime || 'application/octet-stream',
              fileName: resumeName || 'resume',
              data: Buffer.isBuffer(resumeBuffer) ? resumeBuffer.toString('base64') : Buffer.from(resumeBuffer).toString('base64')
            }
          : null,
        candidateName: application.personalInfo?.firstName
          ? `${application.personalInfo.firstName} ${application.personalInfo.lastName || ''}`.trim()
          : undefined,
        jobTitle: job.title,
        jobDescription: job.description,
        requiredSkills: job.requiredSkills || [],
        preferredSkills: job.preferredSkills || [],
        experienceLevel: application.experience,
        applicationId: application._id?.toString?.(),
        jobId: job._id?.toString?.()
      };
      const aiResult = await geminiService.analyzeResumeForJob(geminiArgs);
      aiAnalysis = {
        resumeScore: typeof aiResult.overallScore === 'number' ? aiResult.overallScore : 50,
        skillsMatch: typeof aiResult.skillsMatch === 'number' ? aiResult.skillsMatch : 50,
        experienceMatch: typeof aiResult.experienceMatch === 'number' ? aiResult.experienceMatch : 50,
        overallScore: typeof aiResult.overallScore === 'number' ? aiResult.overallScore : 50,
        keyStrengths: Array.isArray(aiResult.keyStrengths) ? aiResult.keyStrengths : [],
        potentialConcerns: Array.isArray(aiResult.potentialConcerns) ? aiResult.potentialConcerns : [],
        recommendedQuestions: Array.isArray(aiResult.recommendedQuestions) ? aiResult.recommendedQuestions : [],
        extractedInfo: aiResult.extractedInfo || {},
        atsEngine: wantsScanCv ? 'gemini_fallback' : 'gemini',
        analysisDate: new Date(),
        documentMetadata: docMeta,
        validation: wantsScanCv && !canUseScan
          ? { ...validationBlock, warnings: [...validationBlock.warnings, 'SCAN_CV_SKIPPED_USE_GEMINI'] }
          : validationBlock
      };
    }

    const atsEnabled = !!job?.atsEnabled;
    const atsThreshold =
      typeof job?.atsResumeThreshold === 'number' ? Math.min(100, Math.max(0, job.atsResumeThreshold)) : 60;
    const hasCoverLetter = typeof application?.coverLetter === 'string' && application.coverLetter.trim().length > 0;
    const skipAtsBecauseCoverLetter = !!job?.atsSkipWhenCoverLetter && hasCoverLetter;

    const update = {
      $set: {
        aiAnalysis,
        'aiProcessing.status': 'done',
        'aiProcessing.finishedAt': new Date(),
        'aiProcessing.engine': aiAnalysis?.atsEngine || undefined,
        'aiProcessing.error': null
      }
    };

    if (
      atsEnabled &&
      !skipAtsBecauseCoverLetter &&
      typeof aiAnalysis?.overallScore === 'number' &&
      aiAnalysis.overallScore < atsThreshold
    ) {
      update.$set.status = 'rejected';
      update.$push = {
        timeline: {
          status: 'rejected',
          date: new Date(),
          note: `ATS_AUTO_REJECT (${aiAnalysis.overallScore}% < ${atsThreshold}%)`
        }
      };
    }

    await Application.findByIdAndUpdate(applicationId, update);
  } catch (err) {
    await Application.findByIdAndUpdate(applicationId, {
      $set: {
        'aiProcessing.status': 'error',
        'aiProcessing.finishedAt': new Date(),
        'aiProcessing.error': String(err?.message || err || 'AI_PIPELINE_ERROR').slice(0, 500)
      }
    });
  }
}

async function claimNextQueuedApplication({ minAgeSeconds = 2 } = {}) {
  const minCreatedAt = new Date(Date.now() - minAgeSeconds * 1000);
  return await Application.findOneAndUpdate(
    {
      createdAt: { $lte: minCreatedAt },
      'aiProcessing.status': { $in: ['queued'] }
    },
    {
      $set: {
        'aiProcessing.status': 'processing',
        'aiProcessing.startedAt': new Date(),
        'aiProcessing.finishedAt': null,
        'aiProcessing.error': null
      }
    },
    { new: true }
  ).select('_id');
}

function startApplicationAiCron({
  schedule = '*/10 * * * * *', // every 10 seconds
  maxPerTick = 2
} = {}) {
  cron.schedule(schedule, async () => {
    try {
      for (let i = 0; i < maxPerTick; i++) {
        const claimed = await claimNextQueuedApplication();
        if (!claimed?._id) break;
        await runAtsAiPipeline({ applicationId: claimed._id });
      }
    } catch (e) {
      console.error('applicationAiCron tick error:', e?.message || e);
    }
  });
}

module.exports = { startApplicationAiCron };

