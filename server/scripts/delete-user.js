require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../global/models/User");

// Nhận email từ tham số dòng lệnh, hoặc mặc định xóa email của bạn
const emailArg = process.argv[2];
const targetEmails = emailArg 
  ? [emailArg] 
  : ['dinhmv204gmail.com', 'dinhmv204@gmail.com'];

async function deleteUser() {
  try {
    // Kết nối CSDL
    const dbUri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
    await mongoose.connect(dbUri);
    console.log("Đã kết nối MongoDB.");

    console.log("Đang tìm và xóa các user có email trong danh sách:", targetEmails);
    
    // Xóa user có email khớp
    const result = await User.deleteMany({ email: { $in: targetEmails } });
    
    if (result.deletedCount > 0) {
      console.log(`✅ Xóa thành công ${result.deletedCount} tài khoản.`);
    } else {
      console.log(`⚠️ Không tìm thấy tài khoản nào với email: ${targetEmails.join(', ')}`);
    }

  } catch (error) {
    console.error("Lỗi trong quá trình xóa user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Đã đóng kết nối MongoDB.");
    process.exit(0);
  }
}

deleteUser();
