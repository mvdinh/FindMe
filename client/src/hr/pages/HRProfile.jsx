import React, { useState, useEffect, useRef } from "react";
import HRLayout from "../layout/HRLayout";
import HRModal from "../components/HRModal";
import {
  HR_PAGE,
  HR_PAGE_HEADER,
  HR_H1,
  HR_SUBTITLE,
} from "../hrLayoutClasses";
import { HR_INPUT_PILL } from "../hrFormClasses";
import { formatDateVN } from "../hrDateFormat";
import { useAuth } from "../../contexts/AuthContext";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useToast } from "../../contexts/ToastContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Pencil, Check, X, User } from "lucide-react";
const HRProfile = () => {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const { makeJsonRequest } = useApiRequest();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const avatarInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    status: "",
    profilePicture: null,
    department: "",
    joiningDate: "",
    jobTitle: "",
    company: null,
    lastPasswordChange: null,
    notifications: {
      emailAlerts: true,
      applicationNotifications: true,
      weeklyReports: false,
    },
  });
  const [originalProfileData, setOriginalProfileData] = useState({});
  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await makeJsonRequest("/api/hr/profile");
      if (response) {
        const profileInfo = {
          firstName: response.firstName || "",
          lastName: response.lastName || "",
          email: response.email || "",
          phone: response.phone || "",
          role: response.role || "",
          status: response.isActive ? "Hoạt động" : "Ngừng hoạt động",
          profilePicture: response.avatar || null,
          department: response.department || "",
          joiningDate: response.joiningDate || response.createdAt || "",
          jobTitle: response.jobTitle || "",
          company: response.company || null,
          lastPasswordChange: response.lastPasswordChange || null,
          notifications: {
            emailAlerts: response.notifications?.emailAlerts ?? true,
            applicationNotifications:
              response.notifications?.applicationNotifications ?? true,
            weeklyReports: response.notifications?.weeklyReports ?? false,
          },
        };
        setProfileData(profileInfo);
        setOriginalProfileData(profileInfo);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      setError("Không tải được hồ sơ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };
  const formatRelativePasswordChange = (v) => {
    if (!v) return "Chưa đổi lần nào";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "Chưa đổi lần nào";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(Math.abs(diffMs) / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return weeks === 1 ? "1 tuần trước" : `${weeks} tuần trước`;
    const months = Math.floor(days / 30);
    return months <= 1 ? "1 tháng trước" : `${months} tháng trước`;
  };
  const saveProfileData = async () => {
    try {
      setSaving(true);
      setError(null);
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        department: profileData.department,
        jobTitle: profileData.jobTitle,
        notifications: profileData.notifications,
      };
      const response = await makeJsonRequest("/api/hr/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      if (response) {
        setIsEditing(false);
        setOriginalProfileData(profileData);
        toast.success("Cập nhật hồ sơ thành công!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Không lưu được hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };
  const cancelEditing = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
    setError(null);
  };
  useEffect(() => {
    loadProfileData();
  }, []);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const modalBusy = loading || saving || changingPassword;
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordTouched, setPasswordTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const validatePassword = (fields = passwordData, opts = {}) => {
    const { force = false, touched = passwordTouched } = opts;
    const v = { current: "", new: "", confirm: "" };
    const shouldShow = (key) => force || !!touched?.[key];

    if (shouldShow("current") && !fields.currentPassword)
      v.current = "Vui lòng nhập mật khẩu hiện tại";

    if (shouldShow("new")) {
      if (!fields.newPassword) v.new = "Vui lòng nhập mật khẩu mới";
      else if (fields.newPassword.length < 8)
        v.new = "Mật khẩu mới phải có ít nhất 8 ký tự";
      else if (fields.newPassword === fields.currentPassword)
        v.new = "Mật khẩu mới phải khác mật khẩu hiện tại";
    }

    if (shouldShow("confirm")) {
      if (!fields.confirmPassword) v.confirm = "Vui lòng xác nhận mật khẩu mới";
      else if (fields.newPassword !== fields.confirmPassword)
        v.confirm = "Mật khẩu không khớp";
    }

    return v;
  };
  const passwordValidation = validatePassword(passwordData);
  const isPasswordFormValid =
    !validatePassword(passwordData, { force: true }).current &&
    !validatePassword(passwordData, { force: true }).new &&
    !validatePassword(passwordData, { force: true }).confirm;
  const handleProfileUpdate = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleNotificationUpdate = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
  };
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    const forced = validatePassword(passwordData, { force: true });
    if (forced.current || forced.new || forced.confirm) {
      setPasswordTouched({ current: true, new: true, confirm: true });
      return;
    }
    try {
      setChangingPassword(true);
      setError(null);
      const response = await makeJsonRequest(
        "/api/hr/profile/change-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        },
      );
      if (response && response.success) {
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordTouched({ current: false, new: false, confirm: false });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      const serverMsg =
        error?.response?.data?.message || error?.response?.data?.error;
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        setPasswordError(serverMsg || "Mật khẩu hiện tại không đúng");
      } else {
        setPasswordError(
          serverMsg ||
            error.message ||
            "Đổi mật khẩu thất bại. Vui lòng thử lại.",
        );
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(
          "Ảnh đại diện phải nhỏ hơn 5 megabyte. Vui lòng chọn file nhỏ hơn.",
        );
        return;
      }
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Vui lòng chỉ tải lên file ảnh định dạng phù hợp.");
        return;
      }
      try {
        setError(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64Data = event.target.result;
            const response = await makeJsonRequest("/api/hr/profile/avatar", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageData: base64Data,
              }),
            });
            if (response && response.avatarData) {
              setProfileData((prev) => ({
                ...prev,
                profilePicture: response.avatarData,
              }));
              updateUser({
                ...user,
                avatar: response.avatarData,
              });
              toast.success("Cập nhật ảnh đại diện thành công!");
            } else {
              setError(response?.error || "Tải ảnh đại diện thất bại.");
            }
          } catch (error) {
            console.error("Error uploading profile picture:", error);
            setError(
              error.message || "Tải ảnh đại diện thất bại. Vui lòng thử lại.",
            );
          }
        };
        reader.onerror = () => {
          setError("Không đọc được file. Vui lòng thử lại.");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error processing file:", error);
        setError("Xử lý file thất bại. Vui lòng thử lại.");
      }
    }
  };
  return (
    <HRLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Tài khoản nhà tuyển dụng</h1>
            <p className={HR_SUBTITLE}>
              Thông tin hiển thị và cài đặt tài khoản findme của bạn
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end sm:gap-3">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="font-['Roboto']"
                  onClick={cancelEditing}
                  disabled={saving || loading}
                >
                  <X className="mr-2 size-4" />
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="font-['Roboto']"
                  onClick={saveProfileData}
                  disabled={saving || loading}
                >
                  <Check className="mr-2 size-4" />
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="font-['Roboto']"
                onClick={() => setIsEditing(true)}
                disabled={saving || loading}
              >
                <Pencil className="mr-2 size-4" />
                Chỉnh sửa hồ sơ
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-destructive/50">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Roboto']">Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">
              {error}
            </AlertDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="font-['Roboto']"
                onClick={() => void loadProfileData()}
              >
                Thử lại
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="font-['Roboto']"
                onClick={() => setError(null)}
              >
                Đóng
              </Button>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 sm:flex-row">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <span className="font-['Roboto'] text-muted-foreground">
              Đang tải hồ sơ...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
            <div className="flex flex-col gap-4 lg:col-span-1">
              <Card className="border-border">
                <CardContent className="pt-1">
                  <h3 className="mb-4 text-center font-['Open_Sans'] text-lg font-semibold text-foreground">
                    Ảnh đại diện
                  </h3>
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/20">
                      {profileData.profilePicture ? (
                        <img
                          src={profileData.profilePicture}
                          alt="Hồ sơ"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User
                          className="size-16 text-muted-foreground"
                          strokeWidth={1.25}
                        />
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex flex-col items-center text-center">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="sr-only"
                          tabIndex={-1}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-['Roboto']"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          Tải ảnh lên
                        </Button>
                        <p className="mt-2 text-center font-['Roboto'] text-xs text-muted-foreground">
                          Tối đa 5 megabyte, định dạng ảnh thông dụng
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-4">
              <Card className="border-border">
                <CardContent className="pt-1">
                  <h3 className="mb-6 font-['Open_Sans'] text-lg font-semibold text-foreground">
                    Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Tên
                      </Label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) =>
                            handleProfileUpdate("firstName", e.target.value)
                          }
                          className={HR_INPUT_PILL}
                        />
                      ) : (
                        <p className="py-2 font-['Open_Sans'] text-foreground">
                          {profileData.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Họ
                      </Label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) =>
                            handleProfileUpdate("lastName", e.target.value)
                          }
                          className={HR_INPUT_PILL}
                        />
                      ) : (
                        <p className="py-2 font-['Open_Sans'] text-foreground">
                          {profileData.lastName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Địa chỉ thư điện tử
                      </Label>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-input bg-background px-4 py-3">
                        <p className="truncate font-['Roboto'] text-sm text-foreground">
                          {profileData.email}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-['Roboto'] text-xs"
                        >
                          Không thể thay đổi
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Số điện thoại
                      </Label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.phone}
                          onChange={(e) =>
                            handleProfileUpdate("phone", e.target.value)
                          }
                          className={HR_INPUT_PILL}
                        />
                      ) : (
                        <p className="py-2 font-['Open_Sans'] text-foreground">
                          {profileData.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Phòng ban
                      </Label>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-input bg-background px-4 py-3">
                        <p className="truncate font-['Roboto'] text-sm text-foreground">
                          {profileData.department || "Chưa đặt"}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-['Roboto'] text-xs"
                        >
                          Không thể thay đổi
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Ngày tham gia
                      </Label>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-input bg-background px-4 py-3">
                        <p className="truncate font-['Roboto'] text-sm text-foreground">
                          {profileData.joiningDate
                            ? formatDateVN(profileData.joiningDate) ||
                              "Chưa đặt"
                            : "Chưa đặt"}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-['Roboto'] text-xs"
                        >
                          Không thể thay đổi
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Vai trò
                      </Label>
                      <div className="flex items-center py-1">
                        <span className="font-['Open_Sans'] text-lg font-bold text-foreground uppercase tracking-wider">
                          {profileData.role}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Trạng thái
                      </Label>
                      <div className="flex items-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-['Roboto']",
                            profileData.status === "Hoạt động" &&
                              "border-primary/20 bg-primary/10 text-primary",
                          )}
                        >
                          {profileData.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-1">
                  <h3 className="mb-6 font-['Open_Sans'] text-lg font-semibold text-foreground">
                    Cài đặt bảo mật
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <h4 className="font-['Open_Sans'] text-sm font-medium text-foreground">
                          Mật khẩu
                        </h4>
                        <p className="font-['Roboto'] text-xs text-muted-foreground">
                          {formatRelativePasswordChange(
                            profileData?.lastPasswordChange ||
                              user?.lastPasswordChange,
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="font-['Roboto']"
                        onClick={() => setShowPasswordModal(true)}
                        disabled={saving || loading}
                      >
                        Đổi mật khẩu
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <HRModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          size="md"
          title="Đổi mật khẩu"
        >
          <form onSubmit={handlePasswordChange} aria-busy={changingPassword}>
            <fieldset
              disabled={changingPassword}
              className="min-w-0 border-0 p-0 m-0 disabled:opacity-[0.9]"
            >
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Mật khẩu hiện tại
                  </Label>
                  <div className="relative">
                    <input
                      type={passwordVisible.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordError(null);
                        setPasswordTouched((p) => ({ ...p, current: true }));
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }));
                      }}
                      className={cn(
                        HR_INPUT_PILL,
                        "pr-14",
                        (passwordValidation.current || passwordError) &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-1 my-auto h-8 font-['Roboto'] text-muted-foreground"
                      onClick={() =>
                        setPasswordVisible((p) => ({
                          ...p,
                          current: !p.current,
                        }))
                      }
                      disabled={changingPassword}
                    >
                      {passwordVisible.current ? "Ẩn" : "Hiện"}
                    </Button>
                  </div>
                  {(passwordValidation.current || passwordError) && (
                    <p className="mt-1 font-['Roboto'] text-xs text-destructive">
                      {passwordError || passwordValidation.current}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Mật khẩu mới
                  </Label>
                  <div className="relative">
                    <input
                      type={passwordVisible.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordError(null);
                        setPasswordTouched((p) => ({ ...p, new: true }));
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }));
                      }}
                      className={cn(
                        HR_INPUT_PILL,
                        "pr-14",
                        passwordValidation.new &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-1 my-auto h-8 font-['Roboto'] text-muted-foreground"
                      onClick={() =>
                        setPasswordVisible((p) => ({
                          ...p,
                          new: !p.new,
                        }))
                      }
                      disabled={changingPassword}
                    >
                      {passwordVisible.new ? "Ẩn" : "Hiện"}
                    </Button>
                  </div>
                  <p
                    className={cn(
                      "mt-1 font-['Roboto'] text-xs",
                      passwordValidation.new
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {passwordValidation.new ||
                      "Tối thiểu 8 ký tự. Nên dùng chữ, số và ký hiệu."}
                  </p>
                </div>
                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Xác nhận mật khẩu mới
                  </Label>
                  <div className="relative">
                    <input
                      type={passwordVisible.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordError(null);
                        setPasswordTouched((p) => ({ ...p, confirm: true }));
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }));
                      }}
                      className={cn(
                        HR_INPUT_PILL,
                        "pr-14",
                        passwordValidation.confirm &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-1 my-auto h-8 font-['Roboto'] text-muted-foreground"
                      onClick={() =>
                        setPasswordVisible((p) => ({
                          ...p,
                          confirm: !p.confirm,
                        }))
                      }
                      disabled={changingPassword}
                    >
                      {passwordVisible.confirm ? "Ẩn" : "Hiện"}
                    </Button>
                  </div>
                  {passwordValidation.confirm && (
                    <p className="mt-1 font-['Roboto'] text-xs text-destructive">
                      {passwordValidation.confirm}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="font-['Roboto']"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!isPasswordFormValid || changingPassword}
                  className="font-['Roboto']"
                >
                  {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </fieldset>
          </form>
        </HRModal>
      </div>
    </HRLayout>
  );
};
export default HRProfile;
