const nodemailer = require('nodemailer');
/**
 * Hàm phụ trợ: Khởi tạo transporter (cấu hình máy chủ gửi email) cho Nodemailer.
 * Dùng thông tin từ các biến môi trường (host, port, user, pass).
 */
function createTransporter() {
  const config = {
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  if (process.env.EMAIL_SERVICE) {
    config.service = process.env.EMAIL_SERVICE;
  } else {
    config.host = process.env.EMAIL_HOST;
    config.port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
    config.secure = process.env.EMAIL_SECURE === 'true';
  }
  console.log('Email transporter config:', {
    service: config.service || 'custom SMTP',
    host: config.host,
    port: config.port,
    user: config.auth.user,
    passLength: config.auth.pass?.length || 0
  });
  return nodemailer.createTransport(config);
}
const transporter = createTransporter();
(async () => {
  try {
    await transporter.verify();
    console.log('Email service ready to send messages');
  } catch (error) {
    console.error('Email service configuration error:', error.message);
    console.error('Tip: For Gmail, use App Password. Run: node server/scripts/setup-ethereal-email.js for testing');
  }
})();

/**
 * Hàm phụ trợ: Tạo HTML Template cho các email gửi mã OTP (Đăng ký, Quên mật khẩu).
 * Template có giao diện đẹp, logo/tên ứng dụng và màu sắc chuẩn.
 */
function buildBrandedOtpEmailHtml({
  appName,
  title,
  subtitle,
  greeting = 'Kính gửi Quý Khách,',
  introLines = [],
  codeLabel = 'Mã xác thực',
  code,
  expiryMins,
  footerNote = `Đây là email tự động từ hệ thống ${appName}. Vui lòng không trả lời email này.`
}) {
  const safeIntro = Array.isArray(introLines) ? introLines : [];
  const introHtml = safeIntro
    .map((line) => `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">${line}</p>`)
    .join('');
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, 'Segoe UI', sans-serif; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width: 640px; max-width: 94%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #EE0000; padding: 22px 28px;">
              <div style="font-size: 24px; line-height: 1.3; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">
                ${appName}
              </div>
              <div style="margin-top: 6px; font-size: 14px; color: #fee2e2;">
                ${subtitle}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.7;">${greeting}</p>
              ${introHtml}
              <div style="border: 1px solid #fecaca; background-color: #fff5f5; border-radius: 12px; padding: 20px; text-align: center; margin: 18px 0 14px;">
                <div style="font-size: 12px; letter-spacing: 1px; color: #6b7280; text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">
                  ${codeLabel}
                </div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #EE0000; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 14px; margin: 14px 0 16px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991b1b;">
                  Mã xác thực có hiệu lực trong <strong>${expiryMins} phút</strong>.
                </p>
              </div>
              <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #4b5563;">
                Để bảo mật thông tin, vui lòng không chia sẻ mã xác thực cho bất kỳ ai.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #4b5563;">
                Nếu Quý Khách không thực hiện yêu cầu này, vui lòng bỏ qua email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 28px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #6b7280;">
                ${footerNote}
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: #9ca3af;">
                © ${new Date().getFullYear()} ${appName}. Bảo lưu mọi quyền.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
/**
 * Service: Hàm chung để gửi email thông qua transporter đã tạo.
 * Bao gồm cơ chế bắt lỗi và hiển thị URL xem trước (preview) nếu dùng Ethereal mail.
 */
async function sendEmail({
  to,
  subject,
  text,
  html
}) {
  try {
    console.log(`Attempting to send email to: ${to}`);
    const appName = process.env.APP_NAME || 'FINDME';
    const fromEnv = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const from = fromEnv && !String(fromEnv).includes('<') ? `${appName} <${fromEnv}>` : fromEnv;
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log('Email sent successfully:', info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview email: %s', previewUrl);
    }
    return info;
  } catch (error) {
    console.error('Email send failed - Full error:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env file.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Could not connect to email server. Please check your internet connection.');
    } else {
      throw new Error(`Email send failed: ${error.message}`);
    }
  }
}
/**
 * Service: Gửi email chứa mã OTP xác thực Đăng ký tài khoản.
 */
async function sendOtpEmail(to, code) {
  const appName = 'FINDME';
  const expiryMins = Math.floor(parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10));
  const subject = `[${appName}] Mã xác thực đăng ký tài khoản`;
  const text = `Kính gửi Quý Khách,\n\n${appName} ghi nhận yêu cầu xác thực tài khoản.\nMã xác thực của Quý Khách là: ${code}\nThời hạn hiệu lực: ${expiryMins} phút.\n\nĐể bảo mật thông tin, vui lòng không chia sẻ mã này cho bất kỳ ai.\nNếu Quý Khách không thực hiện yêu cầu này, vui lòng bỏ qua email.\n\nTrân trọng,\nBộ phận Hỗ trợ Khách hàng\n${appName}`;
  const html = buildBrandedOtpEmailHtml({
    appName,
    title: 'Xác thực email',
    subtitle: 'Thông báo xác thực tài khoản',
    introLines: [
      `${appName} ghi nhận yêu cầu xác thực đăng ký tài khoản của Quý Khách.`,
      'Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quy trình.'
    ],
    codeLabel: 'Mã xác thực',
    code,
    expiryMins
  });
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}

/**
 * Service: Gửi email chứa mã OTP Đặt lại mật khẩu.
 */
async function sendPasswordResetEmail(to, code) {
  const appName = 'FINDME';
  const expiryMins = Math.floor(parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10));
  const subject = `[${appName}] Mã OTP đặt lại mật khẩu`;
  const text = `Kính gửi Quý Khách,\n\n${appName} ghi nhận yêu cầu đặt lại mật khẩu.\nMã OTP của Quý Khách là: ${code}\nThời hạn hiệu lực: ${expiryMins} phút.\n\nĐể bảo mật thông tin, vui lòng không chia sẻ mã này cho bất kỳ ai.\nNếu Quý Khách không thực hiện yêu cầu này, vui lòng bỏ qua email.\n\nTrân trọng,\n${appName}`;
  const html = buildBrandedOtpEmailHtml({
    appName,
    title: 'Đặt lại mật khẩu',
    subtitle: 'Mã OTP đặt lại mật khẩu',
    introLines: [
      `${appName} ghi nhận yêu cầu đặt lại mật khẩu tài khoản của Quý Khách.`,
      'Vui lòng nhập mã OTP bên dưới để tiếp tục.'
    ],
    codeLabel: 'Mã OTP',
    code,
    expiryMins
  });
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}

/**
 * Hàm phụ trợ: Tạo HTML Template cho email thông báo kết quả phỏng vấn (Trúng tuyển / Từ chối).
 * Có hỗ trợ màu sắc khác nhau (xanh lá / đỏ) dựa theo trạng thái (isSuccess).
 */
function buildBrandedOutcomeEmailHtml({
  appName,
  title,
  subtitle,
  greeting,
  paragraphs = [],
  notesSectionLabel = 'Nhận xét từ nhà tuyển dụng',
  notesContent = '',
  isSuccess = true,
  footerNote = `Đây là email tự động từ hệ thống ${appName}. Vui lòng không trả lời email này.`
}) {
  const introHtml = paragraphs
    .map((line) => `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #374151;">${line}</p>`)
    .join('');
    
  const notesHtml = notesContent
    ? `<div style="border-left: 4px solid ${isSuccess ? '#10b981' : '#ef4444'}; background-color: #f9fafb; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">${notesSectionLabel}</div>
        <div style="font-size: 14px; line-height: 1.6; color: #111827; white-space: pre-wrap;">${notesContent}</div>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, 'Segoe UI', sans-serif; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width: 640px; max-width: 94%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <tr>
            <td style="background-color: ${isSuccess ? '#10b981' : '#EE0000'}; padding: 22px 28px;">
              <div style="font-size: 24px; line-height: 1.3; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">
                ${appName}
              </div>
              <div style="margin-top: 6px; font-size: 14px; color: #eef2f3; opacity: 0.9;">
                ${subtitle}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; font-weight: 700; color: #111827;">${greeting}</p>
              ${introHtml}
              ${notesHtml}
              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.7; color: #4b5563;">
                Trân trọng,<br/>
                <strong>Bộ phận Tuyển dụng ${appName}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 28px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #6b7280;">
                ${footerNote}
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: #9ca3af;">
                © ${new Date().getFullYear()} ${appName}. Bảo lưu mọi quyền.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Service: Gửi thư chúc mừng trúng tuyển (Job Offer) cho ứng viên.
 */
async function sendJobOfferEmail({ to, candidateName, jobTitle, notes }) {
  const appName = 'FINDME';
  const subject = `[${appName}] Thư chúc mừng nhận việc - Vị trí ${jobTitle}`;
  const text = `Kính gửi ${candidateName},\n\nChúc mừng bạn đã xuất sắc vượt qua các vòng phỏng vấn cho vị trí ${jobTitle} tại công ty chúng tôi.\n\nChúng tôi đánh giá rất cao năng lực của bạn và rất mong được đồng hành cùng bạn.\n\nNhận xét/ghi chú từ nhà tuyển dụng:\n${notes || '—'}\n\nChúng tôi sẽ liên hệ lại với bạn sớm để trao đổi về thủ tục nhận việc.\n\nTrân trọng,\nBộ phận Tuyển dụng ${appName}`;
  const html = buildBrandedOutcomeEmailHtml({
    appName,
    title: 'Thư chúc mừng nhận việc',
    subtitle: 'Thông báo kết quả tuyển dụng',
    greeting: `Kính gửi bạn ${candidateName},`,
    paragraphs: [
      `Chúc mừng bạn đã xuất sắc vượt qua các vòng phỏng vấn cho vị trí <strong>${jobTitle}</strong> tại công ty chúng tôi.`,
      `Chúng tôi rất ấn tượng với năng lực và kinh nghiệm của bạn, và rất mong muốn được đồng hành cùng bạn trong đội ngũ phát triển của công ty.`,
      `Dưới đây là một số phản hồi và lưu ý chi tiết từ nhà tuyển dụng dành cho bạn:`
    ],
    notesSectionLabel: 'Chi tiết nhận xét & Hướng dẫn',
    notesContent: notes,
    isSuccess: true
  });
  return sendEmail({ to, subject, text, html });
}

/**
 * Service: Gửi thư từ chối (Rejection) hoặc chưa phù hợp cho ứng viên.
 */
async function sendRejectionEmail({ to, candidateName, jobTitle, notes }) {
  const appName = 'FINDME';
  const subject = `[${appName}] Kết quả tuyển dụng vị trí ${jobTitle}`;
  const text = `Kính gửi ${candidateName},\n\nCảm ơn bạn đã dành thời gian quan tâm và tham gia phỏng vấn vị trí ${jobTitle}.\n\nSau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn chưa phù hợp với vị trí này ở thời điểm hiện tại.\n\nPhản hồi từ nhà tuyển dụng:\n${notes || '—'}\n\nChúc bạn nhiều may mắn và gặt hái được nhiều thành công trên con đường sự nghiệp sắp tới.\n\nTrân trọng,\nBộ phận Tuyển dụng ${appName}`;
  const html = buildBrandedOutcomeEmailHtml({
    appName,
    title: 'Kết quả tuyển dụng',
    subtitle: 'Thông báo kết quả tuyển dụng',
    greeting: `Kính gửi bạn ${candidateName},`,
    paragraphs: [
      `Lời đầu tiên, chúng tôi xin chân thành cảm ơn sự quan tâm của bạn dành cho công ty và vị trí <strong>${jobTitle}</strong>.`,
      `Sau khi xem xét kỹ lưỡng năng lực, kết quả phỏng vấn và các yêu cầu công việc hiện tại, chúng tôi rất tiếc phải thông báo rằng bạn chưa phù hợp với vị trí này ở thời điểm hiện tại.`,
      `Dưới đây là một số nhận xét chi tiết từ hội đồng phỏng vấn dành cho bạn:`
    ],
    notesSectionLabel: 'Nhận xét chi tiết',
    notesContent: notes,
    isSuccess: false
  });
  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendJobOfferEmail,
  sendRejectionEmail
};
