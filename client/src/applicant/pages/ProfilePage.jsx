import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApiRequest } from '../../hooks/useApiRequest';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { formatDateVN } from "@/utils/dateFormat";
import { cn } from '@/lib/utils';
import { HR_INPUT, HR_INPUT_PILL, HR_TEXTAREA_PILL } from '../applicantFormClasses';
import { SkeletonProfile } from '../../components/common/Skeleton';
import ApplicantModal from '../components/ApplicantModal';
import ProfileEditModal from '../components/ProfileEditModal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, Briefcase, Download, FileText, FolderCode, GraduationCap, Loader2, Briefcase as BriefcaseIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CAREER_FIELD_OPTIONS, getSuggestedSkillsByCareerField } from '../../utils/careerSkillSuggestions';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

const ProfilePage = () => {
  const {
    apiRequest,
    updateUser,
    refreshUser,
    user
  } = useAuth();
  const toast = useToast();
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);
  const [showDeleteResumeConfirm, setShowDeleteResumeConfirm] = useState(false);
  const {
    makeJsonRequest
  } = useApiRequest();
  const avatarFileInputRef = useRef(null);
  const patchAuthUser = useCallback(updates => {
    try {
      const raw = localStorage.getItem('user');
      const base = raw ? JSON.parse(raw) : user || {};
      updateUser({
        ...base,
        ...updates
      });
    } catch {
      updateUser({
        ...user,
        ...updates
      });
    }
  }, [updateUser, user]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordValidation, setPasswordValidation] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordTouched, setPasswordTouched] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isDeletingPicture, setIsDeletingPicture] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSection, setModalSection] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    careerField: '',
    summary: '',
    profilePicture: '',
    resume: null,
    education: [],
    workExperience: [],
    skills: [],
    projects: []
  });
  const suggestedSkills = getSuggestedSkillsByCareerField(formData.careerField);
  useEffect(() => {
    loadProfileData();
  }, []);
  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await apiRequest('/api/applicant/profile', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          const profileData = {
            ...responseData.data,
            fullName: responseData.data.fullName || user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: responseData.data.email || user?.email,
            phone: responseData.data.phone || user?.phone || '',
            location: responseData.data.location || user?.location || '',
            careerField: responseData.data.profile?.careerField || user?.profile?.careerField || '',
            summary: responseData.data.summary || '',
            profilePicture: responseData.data.profilePicture || user?.profilePicture || user?.avatar,
            education: responseData.data.education || [],
            workExperience: responseData.data.workExperience || [],
            skills: responseData.data.skills || [],
            projects: responseData.data.projects || []
          };
          setFormData(profileData);
          const updatedUser = {
            ...user,
            ...profileData,
            phone: profileData.phone,
            skills: profileData.skills,
            profile: {
              ...user?.profile,
              primarySkills: profileData.skills,
                careerField: profileData.careerField,
              workExperienceEntries: profileData.workExperience
            },
            currentResumeId: profileData.currentResumeId || user?.currentResumeId,
            resumeAvailable: !!profileData.currentResumeId || user?.resumeAvailable
          };
          updateUser(updatedUser);
        } else {
          setError(responseData.message || 'Không tải được dữ liệu hồ sơ');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Không tải được dữ liệu hồ sơ');
      }
    } catch (error) {
      console.error('Profile load error:', error);
      if (user) {
        const fallbackData = {
          fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phone: user.phone || '',
          location: user.location || '',
          summary: '',
          profilePicture: user.profilePicture || user.avatar || '',
          education: [],
          workExperience: [],
          skills: [],
          projects: []
        };
        setFormData(fallbackData);
        setError('Không tải đầy đủ dữ liệu hồ sơ. Vui lòng thử lại.');
      } else {
        setError('Không tải được dữ liệu hồ sơ. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  const validatePasswordForm = (fields = passwordData, opts = {}) => {
    const { force = false, touched = passwordTouched } = opts;
    const shouldShow = key => force || !!touched?.[key];
    const v = {
      current: '',
      new: '',
      confirm: ''
    };
    if (shouldShow('current') && !fields.currentPassword?.trim()) v.current = 'Vui lòng nhập mật khẩu hiện tại';
    if (shouldShow('new')) {
      if (!fields.newPassword) v.new = 'Vui lòng nhập mật khẩu mới';
      else if (fields.newPassword.length < 8) v.new = 'Mật khẩu mới phải có ít nhất 8 ký tự';
      else if (fields.newPassword && fields.currentPassword && fields.newPassword === fields.currentPassword) v.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }
    if (shouldShow('confirm')) {
      if (!fields.confirmPassword) v.confirm = 'Vui lòng xác nhận mật khẩu mới';
      else if (fields.confirmPassword !== fields.newPassword) v.confirm = 'Xác nhận mật khẩu không khớp';
    }
    setPasswordValidation(v);
    return !v.current && !v.new && !v.confirm;
  };
  const handleApplicantPasswordChange = async e => {
    e?.preventDefault?.();
    setPasswordError(null);
    const ok = validatePasswordForm(passwordData, { force: true });
    if (!ok) {
      setPasswordTouched({ current: true, new: true, confirm: true });
      return;
    }
    try {
      setChangingPassword(true);
      const resp = await apiRequest('/api/applicant/profile/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await resp.json();
      if (!data.success) {
        const serverMsg = data.message || data.error;
        if (resp.status === 400 || resp.status === 401) {
          setPasswordError(serverMsg || 'Mật khẩu hiện tại không đúng');
        } else {
          setPasswordError(serverMsg || 'Đổi mật khẩu thất bại');
        }
        return;
      }
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordValidation({
        current: '',
        new: '',
        confirm: ''
      });
      setPasswordTouched({ current: false, new: false, confirm: false });
    } catch (e2) {
      setPasswordError(e2.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordValidation({
      current: '',
      new: '',
      confirm: ''
    });
    setPasswordTouched({ current: false, new: false, confirm: false });
  };

  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleArrayAdd = (section, newItem) => {
    const itemWithId = {
      ...newItem,
      id: 'new_' + Date.now()
    };
    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], itemWithId]
    }));
  };
  const handleArrayUpdate = (section, id, updatedItem) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].map(item => item.id === id ? {
        ...item,
        ...updatedItem
      } : item)
    }));
  };
  const handleArrayRemove = (section, id) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter(item => item.id !== id)
    }));
  };
  const openAddModal = section => {
    setModalSection(section);
    setEditingItem(null);
    setShowAddModal(true);
  };
  const openEditModal = (section, item) => {
    setModalSection(section);
    setEditingItem(item);
    setShowAddModal(true);
  };
  const closeModal = () => {
    setShowAddModal(false);
    setModalSection('');
    setEditingItem(null);
  };
  const handleModalSave = formData => {
    if (editingItem) {
      handleArrayUpdate(modalSection, editingItem.id, formData);
    } else {
      handleArrayAdd(modalSection, formData);
    }
    closeModal();
  };
  const handleProfilePictureChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Ảnh đại diện phải nhỏ hơn 5 megabyte. Vui lòng chọn file nhỏ hơn.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Vui lòng chỉ tải lên file ảnh định dạng phù hợp.');
      return;
    }
    try {
      setError('');
      const reader = new FileReader();
      reader.onload = async event => {
        try {
          setIsUploadingPicture(true);
          const base64Data = event.target.result;
          const response = await makeJsonRequest('/api/applicant/profile/avatar', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              imageData: base64Data
            })
          });
          if (response && response.avatarData) {
            setFormData(prev => ({
              ...prev,
              profilePicture: response.avatarData
            }));
            patchAuthUser({
              profilePicture: response.avatarData,
              avatar: response.avatarData
            });
            if (avatarFileInputRef.current) {
              avatarFileInputRef.current.value = '';
            }
            toast.success('Cập nhật ảnh đại diện thành công!');
          } else {
            setError(response?.error || 'Tải ảnh đại diện thất bại.');
          }
        } catch (err) {
          console.error('Error uploading profile picture:', err);
          const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
          setError(serverMsg || err.message || 'Tải ảnh đại diện thất bại. Vui lòng thử lại.');
        } finally {
          setIsUploadingPicture(false);
        }
      };
      reader.onerror = () => {
        setError('Không đọc được file. Vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Xử lý file thất bại. Vui lòng thử lại.');
    }
  };
  const deleteProfilePicture = async () => {
    setIsDeletingPicture(true);
    setError('');
    try {
      await makeJsonRequest('/api/applicant/profile/avatar', {
        method: 'DELETE'
      });
      setFormData(prev => ({
        ...prev,
        profilePicture: ''
      }));
      patchAuthUser({
        profilePicture: null,
        avatar: null
      });
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
      toast.success('Đã xóa ảnh đại diện thành công!');
    } catch (err) {
      console.error('Error deleting profile picture:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || err.message || 'Xóa ảnh đại diện thất bại. Vui lòng thử lại.');
    } finally {
      setIsDeletingPicture(false);
    }
  };
  const addSkill = skill => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };
  const removeSkill = skillToRemove => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };
  const handleResumeUpload = async e => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Vui lòng tải lên tài liệu PDF hoặc Word.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Dung lượng tệp phải nhỏ hơn 5MB.');
        return;
      }
      try {
        setError('');
        const formData = new FormData();
        formData.append('resume', file);
        const response = await apiRequest('/api/resumes/upload', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        if (response.ok && result.success) {
          setFormData(prev => ({
            ...prev,
            resume: {
              id: result.resume.id,
              fileName: result.resume.originalName,
              uploadDate: formatDateVN(result.resume.uploadDate) || '—',
              fileSize: `${(result.resume.fileSize / 1024).toFixed(0)} KB`
            }
          }));
        } else {
          setError(result.message || 'Tải CV thất bại');
        }
      } catch (error) {
        console.error('Resume upload error:', error);
        setError('Tải CV thất bại. Vui lòng thử lại.');
      }
    }
  };
  const handleResumeDelete = async () => {
    try {
      setError('');
      const response = await apiRequest('/api/applicant/profile/resume', {
        method: 'DELETE'
      });
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          toast.success('Đã xóa CV thành công!');
          setFormData(prev => ({
            ...prev,
            resume: null
          }));
        } else {
          setError(responseData.message || 'Xóa CV thất bại');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Xóa CV thất bại');
      }
    } catch (error) {
      console.error('Resume delete error:', error);
      setError('Xóa CV thất bại. Vui lòng thử lại.');
    }
  };
  const handleResumeView = async () => {
    try {
      setError('');
      const resumeId = formData?.resume?.id;
      if (resumeId) {
        // Ưu tiên endpoint preview (same-origin) để luôn mở dạng xem (inline) + tên file chuẩn.
        const response = await apiRequest(`/api/resumes/${encodeURIComponent(resumeId)}/preview`, { method: 'GET' });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          return;
        }
      }
      setError('Không thể mở CV. Vui lòng tải lại CV trong hồ sơ của bạn.');
    } catch (error) {
      console.error('Resume view error:', error);
      setError('Không thể mở CV. Vui lòng thử lại.');
    }
  };
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      const profileData = {
        fullName: formData.fullName,
        phone: formData.phone,
        location: formData.location,
        careerField: formData.careerField,
        summary: formData.summary,
        skills: formData.skills,
        education: formData.education.map(edu => ({
          institution: edu.institution,
          graduationDate: edu.graduationDate,
          description: edu.description
        })),
        workExperience: formData.workExperience.map(work => ({
          company: work.company,
          duration: work.duration,
          description: work.description
        })),
        projects: formData.projects.map(project => ({
          name: project.name,
          technologies: project.technologies,
          description: project.description
        }))
      };
      const response = await apiRequest('/api/applicant/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          setIsEditing(false);
          setFormData(prev => ({
            ...prev,
            ...responseData.data
          }));
          await refreshUser();
        } else {
          setError(responseData.message || 'Lưu hồ sơ thất bại');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Lưu hồ sơ thất bại');
      }
    } catch (error) {
      console.error('Lỗi lưu hồ sơ:', error);
      setError('Lưu hồ sơ thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancel = () => {
    loadProfileData();
    setIsEditing(false);
    setError('');
  };
  const normalizeProfileText = value => {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text || text === '.' || text === '-') return '';
    const map = {
      "Bachelor's Degree": 'Cử nhân',
      "Master's Degree": 'Thạc sĩ',
      "Bachelor's Degree in Computer Science": 'Cử nhân Khoa học máy tính',
      "Bachelor's Degree in Engineering": 'Cử nhân Kỹ thuật'
    };
    return map[text] || text;
  };
  const formatRelativePasswordChange = v => {
    if (!v) return 'Chưa đổi lần nào';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'Chưa đổi lần nào';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(Math.abs(diffMs) / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return weeks === 1 ? '1 tuần trước' : `${weeks} tuần trước`;
    const months = Math.floor(days / 30);
    return months <= 1 ? '1 tháng trước' : `${months} tháng trước`;
  };
  return <ApplicantLayout>
      <div className={`${HR_PAGE} max-w-5xl`}>
        {isLoading && <SkeletonProfile />}

        {error && (
          <div className="mb-6 space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle className="font-['Roboto']">Lỗi</AlertTitle>
              <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" className="font-['Roboto']" onClick={() => void loadProfileData()}>
                Thử lại
              </Button>
              <Button type="button" size="sm" variant="outline" className="font-['Roboto']" onClick={() => setError('')}>
                Đóng
              </Button>
            </div>
          </div>
        )}

        {!isLoading && <>
            <div className={HR_PAGE_HEADER}>
              <div className="min-w-0 flex-1">
                <h1 className={HR_H1}>Hồ sơ</h1>
                <p className={HR_SUBTITLE}>Xem và cập nhật thông tin hồ sơ của bạn.</p>
              </div>
              <div className="flex w-full shrink-0 flex-wrap justify-end gap-2 sm:w-auto">
                
                {!isEditing ? (
                  <Button type="button" className="min-h-11 touch-manipulation font-['Roboto']" onClick={() => setIsEditing(true)}>
                    Chỉnh sửa hồ sơ
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 touch-manipulation font-['Roboto']"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 touch-manipulation gap-2 font-['Roboto']"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        'Lưu thay đổi'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm transition-colors duration-300">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground font-['Open_Sans'] mb-6 transition-colors duration-300">
                  Thông tin cá nhân
                </h2>
                
                <div className="mb-8 pb-8 border-b border-border transition-colors duration-300">
                  <h3 className="text-lg font-medium text-foreground font-['Open_Sans'] mb-4 transition-colors duration-300">
                    Ảnh đại diện
                  </h3>
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/20">
                      {formData.profilePicture ? <img src={formData.profilePicture.startsWith('data:') ? formData.profilePicture : formData.profilePicture.startsWith('/uploads') ? `${window.location.origin}${formData.profilePicture}` : formData.profilePicture} alt="Ảnh hồ sơ" className="h-full w-full object-cover" onError={e => {
                      e.target.style.display = 'none';
                    }} /> : <div className="text-2xl font-bold text-muted-foreground font-['Open_Sans']">
                          {formData.fullName ? formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                        </div>}
                      {isUploadingPicture && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        </div>}
                    </div>
                    {isEditing && <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <input ref={avatarFileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif" onChange={handleProfilePictureChange} className="hidden" disabled={isUploadingPicture || isDeletingPicture} />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="font-['Roboto']"
                            disabled={isUploadingPicture || isDeletingPicture}
                            onClick={() => avatarFileInputRef.current?.click()}
                          >
                            Tải ảnh lên
                          </Button>
                          {formData.profilePicture ? <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteAvatarConfirm(true)} disabled={isDeletingPicture || isUploadingPicture} className="gap-2 font-['Roboto'] text-destructive hover:text-destructive">
                              {isDeletingPicture ? <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Đang xóa...
                                </> : 'Xóa ảnh'}
                            </Button> : null}
                        </div>
                        <p className="text-xs text-muted-foreground font-['Roboto']">
                          Tối đa 5 megabyte, định dạng ảnh thông dụng (JPEG, PNG, GIF).
                        </p>
                      </div>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                      Họ và tên
                    </label>
                    {isEditing ? <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={HR_INPUT_PILL} /> : <p className="text-foreground font-['Roboto'] py-2 transition-colors duration-300">{formData.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                      Email
                    </label>
                    <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-muted/40 px-4 py-3 transition-colors duration-300">
                      <p className="truncate font-['Roboto'] text-sm text-foreground">{formData.email}</p>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-['Roboto'] text-xs text-muted-foreground">
                        Không thể thay đổi
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                      Số điện thoại
                    </label>
                    {isEditing ? <input type="tel" name="phone" inputMode="tel" autoComplete="tel-national" value={formData.phone} onChange={handleInputChange} placeholder="VD: 0901234567" className={HR_INPUT_PILL} /> : <p className="text-foreground font-['Roboto'] py-2 transition-colors duration-300">{formData.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                      Khu vực
                    </label>
                    {isEditing ? <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="VD: Quận 1, TP. Hồ Chí Minh" className={HR_INPUT_PILL} /> : <p className="text-foreground font-['Roboto'] py-2 transition-colors duration-300">{formData.location}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                      Lĩnh vực / Ngành nghề
                    </label>
                    {isEditing ? (
                      <select
                        name="careerField"
                        value={formData.careerField || ''}
                        onChange={handleInputChange}
                        className={HR_INPUT_PILL}
                      >
                        <option value="">Chọn lĩnh vực</option>
                        {CAREER_FIELD_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-foreground font-['Roboto'] py-2 transition-colors duration-300">
                        {formData.careerField || '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-muted-foreground font-['Roboto'] mb-2 transition-colors duration-300">
                    Tóm tắt/Mục tiêu
                  </label>
                  {isEditing ? <textarea name="summary" value={formData.summary} onChange={handleInputChange} rows={4} className={HR_TEXTAREA_PILL} /> : <div className="py-2">
                      {formData.summary ? <p className="text-foreground font-['Roboto'] leading-relaxed transition-colors duration-300">{formData.summary}</p> : <p className="text-muted-foreground font-['Roboto'] italic transition-colors duration-300">Chưa có tóm tắt/mục tiêu nào</p>}
                    </div>}
                </div>
              </div>

              <div className="mb-8 pb-8 border-b border-border transition-colors duration-300">
                <h2 className="text-xl font-semibold text-foreground font-['Open_Sans'] mb-6 transition-colors duration-300">
                  CV / Hồ sơ xin việc
                </h2>
                
                {formData.resume ? <div className="rounded-lg border border-border bg-muted/40 p-6 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors duration-300">
                          <FileText className="size-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground font-['Open_Sans'] transition-colors duration-300">
                            {formData.resume.fileName}
                          </h3>
                          <p className="text-sm text-muted-foreground font-['Roboto'] transition-colors duration-300">
                            Đã tải lên: {formData.resume.uploadDate} • {formData.resume.fileSize}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={handleResumeView} title="Xem CV">
                          <Download className="size-5" />
                        </Button>
                        
                        {isEditing && <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteResumeConfirm(true)} title="Xóa CV">
                            <Trash2 className="size-5" />
                          </Button>}
                      </div>
                    </div>
                    
                    {isEditing && <div className="mt-4 border-t border-border pt-4 transition-colors duration-300">
                        <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground">
                          Tải CV mới
                        </label>
                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:transition-colors" />
                        <p className="mt-1 text-xs text-muted-foreground font-['Roboto']">
                          Định dạng hỗ trợ: PDF, DOC, DOCX (tối đa 5MB)
                        </p>
                      </div>}
                  </div> : <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors duration-300">
                    <div className="flex flex-col items-center">
                      <FileText className="mb-4 size-12 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground font-['Open_Sans'] mb-2">
                        Chưa có CV nào
                      </h3>
                      <p className="text-muted-foreground font-['Roboto'] mb-4">
                        Tải CV để nhà tuyển dụng hiểu thêm về kinh nghiệm của bạn
                      </p>
                      
                      {isEditing && <div>
                          <input id="applicant-profile-resume-empty" type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="sr-only" />
                          <Button type="button" className="font-['Roboto']" asChild>
                            <label htmlFor="applicant-profile-resume-empty" className="cursor-pointer">
                              Tải CV
                            </label>
                          </Button>
                          <p className="mt-2 text-xs text-muted-foreground font-['Roboto']">
                            Định dạng hỗ trợ: PDF, DOC, DOCX (tối đa 5MB)
                          </p>
                        </div>}
                    </div>
                  </div>}
              </div>


            </div>

            <div className="mt-8 border-t border-border pt-8 transition-colors duration-300">
              <h2 className="mb-6 font-['Open_Sans'] text-xl font-semibold text-foreground transition-colors duration-300">Cài đặt bảo mật</h2>
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-['Open_Sans'] text-sm font-medium text-foreground">Mật khẩu</h3>
                  <p className="font-['Roboto'] text-sm text-muted-foreground">
                    Đổi mật khẩu tài khoản · {formatRelativePasswordChange(formData?.lastPasswordChange || user?.lastPasswordChange)}
                  </p>
                </div>
                <Button type="button" variant="outline" className="w-full shrink-0 font-['Roboto'] sm:w-auto" onClick={() => setShowPasswordModal(true)}>
                  Đổi mật khẩu
                </Button>
              </div>
            </div>

            {isEditing && <div className="mt-6 flex gap-3 md:hidden">
                <Button type="button" variant="outline" className="flex-1 font-['Roboto']" onClick={handleCancel} disabled={isSaving}>
                  Hủy
                </Button>
                <Button type="button" className="flex-1 gap-2 font-['Roboto']" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </Button>
              </div>}
          </>}

        {showAddModal && <ProfileEditModal section={modalSection} item={editingItem} onSave={handleModalSave} onCancel={closeModal} />}

        <ApplicantModal open={showPasswordModal} onClose={closePasswordModal} size="md" title="Đổi mật khẩu">
              <form onSubmit={handleApplicantPasswordChange} aria-busy={changingPassword}>
                <fieldset disabled={changingPassword} className="min-w-0 border-0 p-0 m-0 disabled:opacity-[0.9]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <Input
                        type={passwordVisible.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={e => {
                    setPasswordError(null);
                    setPasswordTouched(p => ({ ...p, current: true }));
                    const v = {
                      ...passwordData,
                      currentPassword: e.target.value
                    };
                    setPasswordData(v);
                    validatePasswordForm(v);
                  }}
                        aria-invalid={!!(passwordValidation.current || passwordError)}
                        className="h-11 rounded-full bg-background pr-20 pl-4"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 font-['Roboto'] text-muted-foreground hover:text-foreground"
                        onClick={() => setPasswordVisible(p => ({
                    ...p,
                    current: !p.current
                  }))}
                      >
                        {passwordVisible.current ? 'Ẩn' : 'Hiện'}
                      </Button>
                    </div>
                    {(passwordValidation.current || passwordError) && <p className="mt-1 font-['Roboto'] text-xs text-destructive">{passwordError || passwordValidation.current}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground">Mật khẩu mới</label>
                    <div className="relative">
                      <Input
                        type={passwordVisible.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={e => {
                    setPasswordError(null);
                    setPasswordTouched(p => ({ ...p, new: true }));
                    const v = {
                      ...passwordData,
                      newPassword: e.target.value
                    };
                    setPasswordData(v);
                    validatePasswordForm(v);
                  }}
                        aria-invalid={!!passwordValidation.new}
                        className="h-11 rounded-full bg-background pr-20 pl-4"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 font-['Roboto'] text-muted-foreground hover:text-foreground"
                        onClick={() => setPasswordVisible(p => ({
                    ...p,
                    new: !p.new
                  }))}
                      >
                        {passwordVisible.new ? 'Ẩn' : 'Hiện'}
                      </Button>
                    </div>
                    <p className={cn('mt-1 font-[\'Roboto\'] text-xs', passwordValidation.new ? 'text-destructive' : 'text-muted-foreground')}>
                      {passwordValidation.new || 'Tối thiểu 8 ký tự. Nên kết hợp chữ, số và ký tự đặc biệt.'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <Input
                        type={passwordVisible.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={e => {
                    setPasswordError(null);
                    setPasswordTouched(p => ({ ...p, confirm: true }));
                    const v = {
                      ...passwordData,
                      confirmPassword: e.target.value
                    };
                    setPasswordData(v);
                    validatePasswordForm(v);
                  }}
                        aria-invalid={!!passwordValidation.confirm}
                        className="h-11 rounded-full bg-background pr-20 pl-4"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 font-['Roboto'] text-muted-foreground hover:text-foreground"
                        onClick={() => setPasswordVisible(p => ({
                    ...p,
                    confirm: !p.confirm
                  }))}
                      >
                        {passwordVisible.confirm ? 'Ẩn' : 'Hiện'}
                      </Button>
                    </div>
                    {passwordValidation.confirm && <p className="mt-1 font-['Roboto'] text-xs text-destructive">{passwordValidation.confirm}</p>}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 pb-1">
                  <Button type="button" variant="outline" className="font-['Roboto']" onClick={closePasswordModal} disabled={changingPassword}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="min-w-[140px] gap-2 font-['Roboto']"
                    disabled={changingPassword || !!passwordValidation.current || !!passwordValidation.new || !!passwordValidation.confirm}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Đang đổi...
                      </>
                    ) : (
                      'Đổi mật khẩu'
                    )}
                  </Button>
                </div>
                </fieldset>
              </form>
        </ApplicantModal>

        <ConfirmDialog
          open={showDeleteAvatarConfirm}
          onClose={() => setShowDeleteAvatarConfirm(false)}
          onConfirm={deleteProfilePicture}
          title="Xóa ảnh đại diện"
          description="Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại không?"
        />

        <ConfirmDialog
          open={showDeleteResumeConfirm}
          onClose={() => setShowDeleteResumeConfirm(false)}
          onConfirm={handleResumeDelete}
          title="Xóa CV"
          description="Bạn có chắc chắn muốn xóa tệp CV hiện tại không? Hành động này không thể hoàn tác."
        />
      </div>
    </ApplicantLayout>;
};

export default ProfilePage;

