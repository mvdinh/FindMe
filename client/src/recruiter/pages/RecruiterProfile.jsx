import React, { useState, useEffect, useRef } from "react";
import RecruiterLayout from "../layout/RecruiterLayout";
import {
  HR_PAGE,
  HR_PAGE_HEADER,
  HR_H1,
  HR_SUBTITLE,
} from "../recruiterLayoutClasses";
import { HR_INPUT_PILL } from "../recruiterFormClasses";
import { formatDateVN } from "@/utils/dateFormat";
import { useAuth } from "../../contexts/AuthContext";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useToast } from "../../contexts/ToastContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X,
  User,
  KeyRound,
  UserCircle,
  Building2,
} from "lucide-react";
import RecruiterCompanyTab from "../components/RecruiterCompanyTab";

const RecruiterProfile = () => {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const { makeJsonRequest } = useApiRequest();

  const [activeTab, setActiveTab] = useState("personal"); // 'personal', 'company', 'password'

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
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
  });

  const [originalProfileData, setOriginalProfileData] = useState({});

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await makeJsonRequest("/api/recruiter/profile");
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
      };
      const response = await makeJsonRequest("/api/recruiter/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (response) {
        setIsEditing(false);
        setOriginalProfileData(profileData);
        toast.success("Cập nhật thông tin thành công.");
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
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleProfileUpdate = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError("Vui lòng điền đủ thông tin");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Mật khẩu không khớp");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }

    try {
      setChangingPassword(true);
      const response = await makeJsonRequest(
        "/api/recruiter/profile/change-password",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        },
      );
      if (response && response.success) {
        toast.success("Đổi mật khẩu thành công!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Đổi mật khẩu thất bại.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ảnh quá lớn.");
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Data = event.target.result;
          const response = await makeJsonRequest(
            "/api/recruiter/profile/avatar",
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageData: base64Data }),
            },
          );
          if (response && response.avatarData) {
            setProfileData((prev) => ({
              ...prev,
              profilePicture: response.avatarData,
            }));
            updateUser({ ...user, avatar: response.avatarData });
            toast.success("Cập nhật ảnh đại diện thành công!");
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error("Tải ảnh thất bại.");
      }
    }
  };

  return (
    <RecruiterLayout>
      <div className={cn(HR_PAGE, "pt-4 sm:pt-4 md:pt-6")}>
        <div className={cn(HR_PAGE_HEADER, "mb-6")}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Cài đặt tài khoản</h1>
            <p className={HR_SUBTITLE}>
              Quản lý thông tin cá nhân, bảo mật và thông tin doanh nghiệp
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end sm:gap-3"></div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-destructive/50">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Roboto']">Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-sm border border-border overflow-hidden min-h-[600px]">
          <aside className="w-full md:w-64 shrink-0 bg-[#f8f9fa] border-r border-border">
            <nav className="flex flex-col sticky top-0">
              <Button
                variant="ghost"
                className={cn(
                  "justify-start font-['Roboto'] font-medium h-12 rounded-none px-6",
                  activeTab === "personal"
                    ? "bg-white text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900",
                )}
                onClick={() => setActiveTab("personal")}
              >
                <UserCircle className="mr-3 size-5" /> Thông tin tài khoản
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "justify-start font-['Roboto'] font-medium h-12 rounded-none px-6",
                  activeTab === "company"
                    ? "bg-white text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900",
                )}
                onClick={() => setActiveTab("company")}
              >
                <Building2 className="mr-3 size-5" /> Thông tin công ty
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "justify-start font-['Roboto'] font-medium h-12 rounded-none px-6",
                  activeTab === "password"
                    ? "bg-white text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900",
                )}
                onClick={() => setActiveTab("password")}
              >
                <KeyRound className="mr-3 size-5" /> Đổi mật khẩu
              </Button>
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === "personal" &&
              (loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-primary size-8" />
                </div>
              ) : (
                <div className="max-w-4xl p-6 sm:p-8">
                  <div className="mb-6 pb-4 border-b border-border">
                    <h2 className="font-['Roboto'] font-normal text-lg text-gray-800">
                      Thông tin tài khoản
                    </h2>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-muted border border-border">
                        {profileData.profilePicture ? (
                          <img
                            src={profileData.profilePicture}
                            alt="Hồ sơ"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User
                            className="size-16 text-gray-400"
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
                            className="font-['Roboto'] bg-gray-50 hover:bg-gray-100 rounded-sm border-border"
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            Tải ảnh lên
                          </Button>
                          <p className="mt-2 text-center font-['Roboto'] text-xs text-gray-500">
                            Tối đa 5 MB
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] md:items-center gap-2 md:gap-6">
                        <Label className="font-['Roboto'] text-gray-600 font-normal">
                          Họ và tên
                        </Label>
                        {isEditing ? (
                          <div className="flex gap-4">
                            <Input
                              value={profileData.firstName}
                              onChange={(e) =>
                                handleProfileUpdate("firstName", e.target.value)
                              }
                              className="rounded-sm font-['Roboto']"
                              placeholder="Tên"
                            />
                            <Input
                              value={profileData.lastName}
                              onChange={(e) =>
                                handleProfileUpdate("lastName", e.target.value)
                              }
                              className="rounded-sm font-['Roboto']"
                              placeholder="Họ"
                            />
                          </div>
                        ) : (
                          <p className="font-['Roboto'] text-gray-800 font-medium">
                            {profileData.lastName} {profileData.firstName}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] md:items-center gap-2 md:gap-6">
                        <Label className="font-['Roboto'] text-gray-600 font-normal">
                          Email
                        </Label>
                        <div className="flex items-center gap-3 w-full">
                          <p className="font-['Roboto'] text-gray-800 flex-1 truncate">
                            {profileData.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] md:items-center gap-2 md:gap-6">
                        <Label className="font-['Roboto'] text-gray-600 font-normal">
                          Số điện thoại
                        </Label>
                        {isEditing ? (
                          <Input
                            value={profileData.phone}
                            onChange={(e) =>
                              handleProfileUpdate("phone", e.target.value)
                            }
                            className="rounded-sm font-['Roboto']"
                            placeholder="Số điện thoại"
                          />
                        ) : (
                          <p className="font-['Roboto'] text-gray-800">
                            {profileData.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-4 pt-4">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="px-8 font-['Roboto'] font-normal bg-gray-50 border-gray-200 hover:bg-gray-100 rounded-sm"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              Hủy
                            </Button>
                            <Button
                              type="button"
                              className="px-8 font-['Roboto'] font-normal bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm"
                              onClick={saveProfileData}
                              disabled={saving}
                            >
                              {saving ? "Đang lưu..." : "Cập nhật"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            className="px-8 font-['Roboto'] font-normal bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm"
                            onClick={() => setIsEditing(true)}
                          >
                            Chỉnh sửa
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === "company" && (
              <div className="p-6 sm:p-8">
                <RecruiterCompanyTab />
              </div>
            )}

            {activeTab === "password" && (
              <div className="max-w-6xl p-6 sm:p-8">
                <div className="mb-6 pb-4 border-b border-border">
                  <h2 className="font-['Roboto'] font-normal text-lg text-gray-800">
                    Thay đổi mật khẩu
                  </h2>
                </div>
                <div className="bg-white">
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    {passwordError && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-xs">
                          {passwordError}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:items-center gap-2 md:gap-6">
                      <Label className="font-['Roboto'] text-gray-600 font-normal">
                        Mật khẩu hiện tại
                      </Label>
                      <div className="relative">
                        <Input
                          type={passwordVisible.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => {
                            setPasswordError(null);
                            setPasswordData((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }));
                          }}
                          className="pr-10 rounded-sm font-['Roboto']"
                          placeholder="Nhập mật khẩu hiện tại"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-1 my-auto h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={() =>
                            setPasswordVisible((p) => ({
                              ...p,
                              current: !p.current,
                            }))
                          }
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:items-center gap-2 md:gap-6">
                      <Label className="font-['Roboto'] text-gray-600 font-normal">
                        Mật khẩu mới
                      </Label>
                      <div className="relative">
                        <Input
                          type={passwordVisible.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => {
                            setPasswordError(null);
                            setPasswordData((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }));
                          }}
                          className="pr-10 rounded-sm font-['Roboto']"
                          placeholder="Nhập mật khẩu mới"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-1 my-auto h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={() =>
                            setPasswordVisible((p) => ({ ...p, new: !p.new }))
                          }
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:items-center gap-2 md:gap-6">
                      <Label className="font-['Roboto'] text-gray-600 font-normal">
                        Nhập lại mật khẩu
                      </Label>
                      <div className="relative">
                        <Input
                          type={passwordVisible.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => {
                            setPasswordError(null);
                            setPasswordData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }));
                          }}
                          className="pr-10 rounded-sm font-['Roboto']"
                          placeholder="Nhập lại mật khẩu mới"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-1 my-auto h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={() =>
                            setPasswordVisible((p) => ({
                              ...p,
                              confirm: !p.confirm,
                            }))
                          }
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:items-start gap-2 md:gap-6 pt-4">
                      <div className="hidden md:block"></div>
                      <div className="flex flex-col gap-6">
                        
                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="px-8 font-['Roboto'] font-normal bg-gray-50 border-gray-200 hover:bg-gray-100 rounded-sm"
                            onClick={() =>
                              setPasswordData({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: "",
                              })
                            }
                          >
                            Hủy
                          </Button>
                          <Button
                            type="submit"
                            disabled={changingPassword}
                            className="px-8 font-['Roboto'] font-normal bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm"
                          >
                            {changingPassword ? "Đang cập nhật..." : "Cập nhật"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterProfile;
