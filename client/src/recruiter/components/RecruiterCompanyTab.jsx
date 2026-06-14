import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, UploadCloud, Loader2, CheckCircle2, AlertCircle, Lock, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HR_INPUT_PILL } from "../recruiterFormClasses";
import { cn } from '@/lib/utils';

const RecruiterCompanyTab = () => {
  const { apiRequest } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [unlockMessage, setUnlockMessage] = useState('');
  const [sendingUnlock, setSendingUnlock] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    taxCode: '',
    industry: '',
    address: '',
    phone: '',
    email: '',
    size: '',
    website: '',
    description: ''
  });
  
  const [licenseFile, setLicenseFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/companies/me');
      const data = await res.json();
      if (data.success && data.data) {
        setCompany(data.data);
        const initialData = {
          name: data.data.name || '',
          taxCode: data.data.taxCode || '',
          industry: data.data.industry || '',
          address: data.data.address || '',
          phone: data.data.phone || '',
          email: data.data.email || '',
          size: data.data.size || '',
          website: data.data.website || '',
          description: data.data.description || ''
        };
        setFormData(initialData);
        setOriginalFormData(initialData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
        return;
      }
      setFile(file);
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.taxCode || (!licenseFile && !company)) {
      toast.error('Vui lòng điền các trường bắt buộc và tải lên giấy phép KD.');
      return;
    }

    try {
      setSaving(true);
      const licenseBase64 = licenseFile ? await fileToBase64(licenseFile) : company?.businessLicenseFile;
      const logoBase64 = logoFile ? await fileToBase64(logoFile) : company?.logo;

      const payload = {
        ...formData,
        businessLicenseFile: licenseBase64,
        logo: logoBase64
      };

      const url = company ? `/api/companies/${company._id}` : '/api/companies';
      const method = company ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Cập nhật thông tin công ty thành công. Vui lòng đợi kiểm duyệt.');
        setCompany(data.data);
        setIsEditing(false);
        setOriginalFormData(formData);
      } else {
        toast.error(data.message || 'Cập nhật thất bại.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Đã có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestUnlock = async () => {
    try {
      setSendingUnlock(true);
      const response = await apiRequest('/api/companies/request-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: unlockMessage })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Đã gửi yêu cầu mở khóa thành công. Vui lòng đợi Admin xem xét.');
        setUnlockMessage('');
        fetchCompany();
      } else {
        toast.error(data.message || 'Gửi yêu cầu thất bại.');
      }
    } catch (err) {
      toast.error('Đã có lỗi xảy ra.');
    } finally {
      setSendingUnlock(false);
    }
  };

  const cancelEditing = () => {
    if (originalFormData) {
      setFormData(originalFormData);
    }
    setLogoFile(null);
    setLicenseFile(null);
    setIsEditing(false);
  };
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {company && (
        <Alert className={cn(
          company.verificationStatus === 'approved' ? 'bg-green-50 border-green-200' : 
          company.verificationStatus === 'rejected' ? 'bg-red-50 border-red-200' : 
          company.verificationStatus === 'locked' ? 'bg-red-50 border-red-300' :
          'bg-yellow-50 border-yellow-200'
        )}>
          {company.verificationStatus === 'approved' && <CheckCircle2 className="size-5 text-green-600" />}
          {company.verificationStatus === 'rejected' && <AlertCircle className="size-5 text-red-600" />}
          {company.verificationStatus === 'locked' && <Lock className="size-5 text-red-700" />}
          {company.verificationStatus === 'pending' && <Loader2 className="size-5 text-yellow-600 animate-spin" />}
          <AlertTitle className="font-['Roboto'] font-semibold">
            Trạng thái doanh nghiệp: {
              company.verificationStatus === 'approved' ? 'Đã duyệt' : 
              company.verificationStatus === 'rejected' ? 'Bị từ chối' :
              company.verificationStatus === 'locked' ? 'Bị khóa' :
              'Đang chờ duyệt'
            }
          </AlertTitle>
          <AlertDescription className="font-['Roboto']">
            {company.verificationStatus === 'approved' ? 'Doanh nghiệp đã được xác thực. Bạn có thể đăng bài tuyển dụng.' : 
             company.verificationStatus === 'rejected' ? `Lý do: ${company.rejectionReason || 'Không rõ'}. Vui lòng chỉnh sửa và gửi lại.` :
             company.verificationStatus === 'locked' ? `Lý do: ${company.lockReason || 'Vi phạm quy định'}. Bạn không thể đăng tin mới.` :
             'Vui lòng đợi quản trị viên kiểm duyệt. Cập nhật mới sẽ cần được duyệt lại.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Unlock Request Card - Only visible when locked */}
      {company?.verificationStatus === 'locked' && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="font-['Open_Sans'] text-lg flex items-center gap-2">
              <Lock className="size-5 text-red-600" />
              Yêu cầu mở khóa tài khoản
            </CardTitle>
            <CardDescription className="font-['Roboto']">
              {company.unlockRequestedAt 
                ? `Bạn đã gửi yêu cầu mở khóa lúc ${new Date(company.unlockRequestedAt).toLocaleString('vi-VN')}. Vui lòng đợi Admin xem xét.`
                : 'Gửi yêu cầu mở khóa cho quản trị viên kèm lời giải thích.'}
            </CardDescription>
          </CardHeader>
          {!company.unlockRequestedAt && (
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={unlockMessage}
                  onChange={(e) => setUnlockMessage(e.target.value)}
                  placeholder="Giải thích lý do yêu cầu mở khóa... (ví dụ: đã khắc phục vấn đề, cam kết tuân thủ quy định)"
                  className="min-h-[100px]"
                />
                <Button onClick={handleRequestUnlock} disabled={sendingUnlock || !unlockMessage.trim()} className="gap-2">
                  {sendingUnlock ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Gửi yêu cầu mở khóa
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Company Form - Hidden when locked */}
      {company?.verificationStatus !== 'locked' && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-['Open_Sans'] text-lg">Thông tin công ty</CardTitle>
            <CardDescription className="font-['Roboto']">
              {company ? 'Cập nhật thông tin chi tiết về doanh nghiệp của bạn.' : 'Thiết lập thông tin doanh nghiệp để bắt đầu tuyển dụng.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo section at top */}
              <div className="flex flex-col items-center sm:items-start mb-6 pb-6 border-b border-border">
                <Label className="font-['Roboto'] text-gray-600 font-normal mb-4">Logo công ty</Label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg bg-muted border border-border shrink-0">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="h-full w-full object-cover" />
                    ) : company?.logo ? (
                      <img src={company.logo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="size-12 text-gray-400" strokeWidth={1.25} />
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                      <input type="file" id="logoUpload" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => handleFileChange(e, setLogoFile)} />
                      <Button type="button" variant="outline" className="font-['Roboto']" onClick={() => document.getElementById('logoUpload')?.click()}>
                        Tải logo lên
                      </Button>
                      <p className="mt-2 font-['Roboto'] text-xs text-gray-500">Định dạng JPG, PNG. Tối đa 5 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form fields in grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Tên doanh nghiệp <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input name="name" value={formData.name} onChange={handleChange} className={HR_INPUT_PILL} required />
                  ) : (
                    <p className="font-['Roboto'] font-medium text-foreground py-2 border-b border-transparent">{formData.name || 'Chưa cập nhật'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Mã số thuế <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input name="taxCode" value={formData.taxCode} onChange={handleChange} className={HR_INPUT_PILL} required />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.taxCode || 'Chưa cập nhật'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Lĩnh vực hoạt động</Label>
                  {isEditing ? (
                    <Input name="industry" value={formData.industry} onChange={handleChange} className={HR_INPUT_PILL} />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.industry || 'Chưa cập nhật'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Quy mô nhân sự</Label>
                  {isEditing ? (
                    <Input name="size" value={formData.size} onChange={handleChange} className={HR_INPUT_PILL} placeholder="VD: 50-100 nhân viên" />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.size || 'Chưa cập nhật'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Số điện thoại liên hệ</Label>
                  {isEditing ? (
                    <Input name="phone" value={formData.phone} onChange={handleChange} className={HR_INPUT_PILL} />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.phone || 'Chưa cập nhật'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Email liên hệ</Label>
                  {isEditing ? (
                    <Input name="email" value={formData.email} onChange={handleChange} className={HR_INPUT_PILL} type="email" />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.email || 'Chưa cập nhật'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Địa chỉ trụ sở</Label>
                  {isEditing ? (
                    <Input name="address" value={formData.address} onChange={handleChange} className={HR_INPUT_PILL} />
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 border-b border-transparent">{formData.address || 'Chưa cập nhật'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-gray-600">Website</Label>
                  {isEditing ? (
                    <Input name="website" value={formData.website} onChange={handleChange} className={HR_INPUT_PILL} placeholder="https://" />
                  ) : (
                    <p className="font-['Roboto'] py-2 border-b border-transparent">
                      {formData.website ? (
                        <a href={formData.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{formData.website}</a>
                      ) : <span className="text-foreground">Chưa cập nhật</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-['Roboto'] text-gray-600">Mô tả công ty</Label>
                {isEditing ? (
                  <Textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    className="min-h-[100px] rounded-xl font-['Roboto'] mt-2"
                    placeholder="Giới thiệu về doanh nghiệp của bạn..."
                  />
                ) : (
                  <div className="font-['Roboto'] text-foreground py-2 bg-muted/20 p-4 rounded-xl whitespace-pre-line min-h-[60px]">
                    {formData.description || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Label className="font-['Roboto'] text-gray-600">Giấy phép kinh doanh {company ? '' : <span className="text-red-500">*</span>}</Label>
                {isEditing ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors mt-2">
                    <input type="file" id="licenseFile" accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, setLicenseFile)} />
                    <Label htmlFor="licenseFile" className="cursor-pointer flex flex-col items-center">
                      <UploadCloud className="size-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-primary">Chọn file tải lên</span>
                      <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Tối đa 5MB)</span>
                      {licenseFile ? <span className="mt-2 text-sm text-green-600 font-medium">Đã chọn: {licenseFile.name}</span> : 
                       (company?.businessLicenseFile && <span className="mt-2 text-sm text-muted-foreground">Đã có tài liệu hệ thống</span>)}
                    </Label>
                  </div>
                ) : (
                  company?.businessLicenseFile ? (
                    <div className="mt-2 bg-muted/20 p-4 rounded-xl">
                      {company.businessLicenseFile.startsWith('data:image') || company.businessLicenseFile.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={company.businessLicenseFile} alt="Giấy phép KD" className="max-h-48 rounded-lg border shadow-sm" />
                      ) : (
                        <a href={company.businessLicenseFile} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-2">
                          <span className="truncate max-w-[200px]">Xem tài liệu định dạng PDF/DOC</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="font-['Roboto'] text-foreground py-2 px-4 bg-muted/20 rounded-xl">Chưa cập nhật</p>
                  )
                )}
              </div>

              <div className="pt-6 flex justify-end gap-3 mt-8 border-t border-border/50">
                {isEditing ? (
                  <>
                    <Button type="button" variant="outline" className="px-6 font-['Roboto']" onClick={cancelEditing} disabled={saving}>
                      Hủy
                    </Button>
                    <Button type="submit" className="px-6 font-['Roboto']" disabled={saving}>
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" className="px-6 font-['Roboto']" onClick={() => setIsEditing(true)}>
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Read-only company info for locked */}
      {company?.verificationStatus === 'locked' && (
        <Card className="border-border opacity-75">
          <CardHeader>
            <CardTitle className="font-['Open_Sans'] text-lg text-muted-foreground">Thông tin công ty (Chỉ xem)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-['Roboto']">
              <div><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{company.name}</span></div>
              <div><span className="text-muted-foreground">MST:</span> <span className="font-medium">{company.taxCode || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Lĩnh vực:</span> <span className="font-medium">{company.industry || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Quy mô:</span> <span className="font-medium">{company.size || 'N/A'}</span></div>
              <div className="md:col-span-2"><span className="text-muted-foreground">Địa chỉ:</span> <span className="font-medium">{company.address || 'N/A'}</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecruiterCompanyTab;
