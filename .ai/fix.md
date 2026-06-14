Đọc toàn bộ source code trong dự án, đặc biệt là folder `client` và `server`, sau đó tiến hành refactor và nâng cấp hệ thống theo các yêu cầu dưới đây.

LƯU Ý QUAN TRỌNG:

* Tôi sẽ cung cấp các hình ảnh giao diện tham chiếu sau.
* Hãy giữ nguyên bố cục, màu sắc, phong cách thiết kế và trải nghiệm người dùng theo các hình ảnh được cung cấp.
* Không tự ý sáng tạo giao diện khác nếu không cần thiết.
* Ưu tiên bám sát giao diện trong hình ảnh.
* Không làm ảnh hưởng đến các chức năng hiện có như đăng nhập, đăng ký, quên mật khẩu, AI ATS, nộp CV, quản lý hồ sơ ứng tuyển và lịch phỏng vấn.
* Sau khi hoàn thành phải đảm bảo frontend build thành công và backend chạy thành công.

====================================================

1. ĐIỀU HƯỚNG MẶC ĐỊNH

Hiện tại hệ thống đang mở tại trang Login.

Hãy sửa lại để khi truy cập website sẽ mặc định chuyển tới:

```text
/jobs
```

Người dùng chưa đăng nhập vẫn được phép:

* Xem danh sách việc làm
* Tìm kiếm việc làm
* Xem chi tiết việc làm
* Xem danh sách công ty
* Xem chi tiết công ty

Không tự động chuyển người dùng về `/login`.

Chỉ yêu cầu đăng nhập khi:

* Nộp CV
* Lưu việc làm
* Quản lý hồ sơ cá nhân
* Quản lý tuyển dụng
* Các chức năng yêu cầu xác thực khác

====================================================

2. THIẾT KẾ LẠI NAVBAR

Đọc toàn bộ layout hiện tại.

Hiện navbar đang nằm dọc bên trái.

Hãy chuyển thành navbar nằm ngang phía trên giống giao diện trong ảnh tham chiếu.

Khi chưa đăng nhập:

* Logo FindMe
* Việc làm
* Công ty
* CV & Hồ sơ
* Đăng nhập
* Đăng ký

Khi đã đăng nhập:

* Logo FindMe
* Việc làm
* Công ty
* Hồ sơ ứng tuyển
* Thông báo
* Avatar người dùng

Dropdown Avatar:

* Thông tin cá nhân
* CV của tôi
* Hồ sơ ứng tuyển
* Đổi mật khẩu
* Đăng xuất

Navbar phải responsive trên:

* Desktop
* Tablet
* Mobile

====================================================

3. THIẾT KẾ LẠI TRANG JOBS

Thiết kế lại trang `/jobs` theo đúng giao diện ảnh tham chiếu.

Bố cục gồm:

A. Khối tìm kiếm việc làm

* Từ khóa
* Địa điểm
* Ngành nghề
* Nút tìm kiếm

B. Danh sách việc làm

Hiển thị các Job đang Active.

Mỗi Job Card gồm:

* Logo công ty
* Tên việc làm
* Tên công ty
* Địa điểm
* Mức lương
* Loại hình làm việc
* Kinh nghiệm
* Ngày đăng
* Nút xem chi tiết

C. Danh sách công ty nổi bật

Hiển thị:

* Logo
* Tên công ty
* Ngành nghề
* Địa chỉ
* Quy mô
* Số lượng việc làm đang tuyển

====================================================

4. THÊM FOOTER

Footer xuất hiện tại:

* Trang Jobs
* Trang Company
* Trang Job Detail
* Các trang Public khác

Bao gồm:

* Logo FindMe
* Giới thiệu hệ thống
* Liên kết nhanh
* Liên hệ
* Bản quyền

Thiết kế bám sát ảnh tham chiếu.

====================================================

5. TRANG CHI TIẾT VIỆC LÀM

Giữ nguyên logic hiện tại.

Nâng cấp giao diện theo ảnh tham chiếu.

Hiển thị:

* Logo công ty
* Tên công việc
* Tên công ty
* Địa điểm
* Mức lương
* Loại hình làm việc
* Kinh nghiệm
* Hạn nộp

Nội dung:

* Mô tả công việc
* Yêu cầu
* Quyền lợi

Nút:

```text
Ứng tuyển ngay
```

Bên dưới thêm:

### Gợi ý việc làm

Hiển thị:

* 4 đến 8 việc làm liên quan
* Hoặc cùng ngành nghề
* Hoặc cùng địa điểm

Cuối trang có Footer.

====================================================

6. THÊM COLLECTION COMPANY

Tạo Model mới:

```js
Company
```

Các trường:

```js
{
    name: String,
    logo: String,

    description: String,

    industry: String,

    size: String,

    website: String,

    address: String,

    email: String,

    phone: String,

    taxCode: String,

    businessLicenseNumber: String,

    businessLicenseFile: String,

    verificationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    verifiedAt: Date,

    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    rejectionReason: String,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },

    createdAt: Date,
    updatedAt: Date
}
```

====================================================

7. XÁC THỰC DOANH NGHIỆP

Khi HR tạo công ty:

Bắt buộc nhập:

* Tên công ty
* Website
* Địa chỉ
* Email
* Số điện thoại
* Mô tả công ty

Thông tin pháp lý:

* Mã số thuế
* Mã số doanh nghiệp
* Giấy phép kinh doanh

Cho phép upload:

* PDF
* JPG
* PNG

Sau khi tạo:

```js
verificationStatus = "pending"
```

====================================================

8. QUẢN LÝ DOANH NGHIỆP (ADMIN)

Thêm module:

```text
Quản lý doanh nghiệp
```

Admin có thể:

* Xem danh sách doanh nghiệp
* Xem thông tin doanh nghiệp
* Xem giấy phép kinh doanh
* Phê duyệt doanh nghiệp
* Từ chối doanh nghiệp
* Khóa doanh nghiệp

Nếu từ chối:

Lưu:

```js
rejectionReason
```

====================================================

9. RÀNG BUỘC ĐĂNG TIN TUYỂN DỤNG

Chỉ cho phép tạo Job khi:

```js
company.verificationStatus === "approved"
```

Nếu chưa được duyệt:

```text
Doanh nghiệp chưa được xác thực.
Vui lòng chờ Admin phê duyệt giấy phép kinh doanh.
```

Không được phép:

* Đăng tin tuyển dụng
* Mở lại tin tuyển dụng
* Quản lý tuyển dụng

====================================================

10. LIÊN KẾT COMPANY VỚI JOB

Sửa Model Job:

```js
company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
}
```

Tất cả API Job cần:

```js
.populate("company")
```

Frontend hiển thị:

* Logo công ty
* Tên công ty
* Địa chỉ
* Ngành nghề

====================================================

11. API COMPANY

Tạo API:

```text
GET     /api/companies
GET     /api/companies/:id

POST    /api/companies

PUT     /api/companies/:id

DELETE  /api/companies/:id
```

API xác thực doanh nghiệp:

```text
GET  /api/admin/companies/pending

PUT  /api/admin/companies/:id/approve

PUT  /api/admin/companies/:id/reject
```

====================================================

12. TRANG CÔNG TY

Danh sách công ty:

* Logo
* Tên công ty
* Địa chỉ
* Ngành nghề
* Quy mô
* Số việc làm

Chi tiết công ty:

* Logo
* Tên công ty
* Website
* Địa chỉ
* Mô tả
* Ngành nghề
* Quy mô
* Danh sách việc làm đang tuyển

====================================================

13. DỮ LIỆU MẪU

Nếu có file seed:

Bổ sung dữ liệu Company.

Tạo tối thiểu:

* Công nghệ
* Marketing
* Tài chính
* Nhân sự
* Thương mại điện tử

Mỗi công ty có:

* Logo
* Website
* Địa chỉ
* Mã số thuế
* Mã số doanh nghiệp
* Giấy phép kinh doanh mẫu
* Trạng thái đã xác thực

Toàn bộ Job mẫu phải liên kết với Company tương ứng.

====================================================

14. COMPONENT HÓA FRONTEND

Tách riêng:

* Navbar
* Footer
* SearchBar
* JobCard
* CompanyCard
* CompanyDetail
* SuggestedJobs

====================================================

15. YÊU CẦU KỸ THUẬT

* Không làm hỏng AI ATS hiện tại.
* Không làm hỏng chức năng nộp CV.
* Không làm hỏng xác nhận lịch phỏng vấn.
* Không làm hỏng đăng nhập/đăng ký.
* Không làm hỏng phân quyền Admin/HR/Applicant.
* Không thay đổi API cũ nếu không cần thiết.
* Kiểm tra đầy đủ route frontend.
* Kiểm tra populate MongoDB.
* Kiểm tra responsive.
* Kiểm tra build frontend.
* Kiểm tra chạy backend.

Sau khi hoàn thành:

* 
* Đảm bảo hệ thống hoạt động ổn định và không phát sinh lỗi.
