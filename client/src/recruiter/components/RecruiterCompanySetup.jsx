import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, UploadCloud, Loader2 } from 'lucide-react';

const RecruiterCompanySetup = ({ onComplete }) => {
  const { apiRequest } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxCode: '',
    industry: '',
    address: '',
    phone: '',
    description: ''
  });
  
  const [licenseFile, setLicenseFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.', 'error');
        return;
      }
      setFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.taxCode || !licenseFile) {
      showToast('Vui lòng điền các trường bắt buộc và tải lên giấy phép KD.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Upload license file first if we had a dedicated file upload endpoint, 
      // but assuming we can send base64 or just dummy it for now if there is no upload API.
      // Wait, is there an upload API? The prompt doesn't specify.
      // I'll assume we can pass base64 or we can just send the file name for now.
      
      const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const licenseBase64 = licenseFile ? await fileToBase64(licenseFile) : '';
      const logoBase64 = logoFile ? await fileToBase64(logoFile) : '';

      const payload = {
        ...formData,
        businessLicenseFile: licenseBase64, // Send as base64 string
        logo: logoBase64
      };

      const response = await apiRequest('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Cập nhật thông tin thành công. Vui lòng đợi kiểm duyệt.', 'success');
        if (onComplete) onComplete(data.data);
      } else {
        showToast(data.message || 'Đăng ký thất bại.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Đã có lỗi xảy ra.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl shadow-lg border-t-4 border-t-red-600">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Building2 className="size-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold font-['Open_Sans']">Thiết lập doanh nghiệp</CardTitle>
          <CardDescription className="text-base">
            Vui lòng đăng ký thông tin doanh nghiệp trước khi bắt đầu tuyển dụng.
            Hồ sơ sẽ được quản trị viên kiểm duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Tên doanh nghiệp <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Công ty TNHH FindMe" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxCode">Mã số thuế <span className="text-red-500">*</span></Label>
                <Input id="taxCode" name="taxCode" value={formData.taxCode} onChange={handleChange} placeholder="Nhập mã số thuế" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Giấy phép kinh doanh (Bản scan / Ảnh chụp) <span className="text-red-500">*</span></Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                <input 
                  type="file" 
                  id="licenseFile" 
                  accept=".pdf,image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, setLicenseFile)} 
                />
                <Label htmlFor="licenseFile" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="size-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-blue-600">Chọn file tải lên</span>
                  <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Tối đa 5MB)</span>
                  {licenseFile && <span className="mt-3 text-sm text-green-600 font-medium">Đã chọn: {licenseFile.name}</span>}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="industry">Lĩnh vực hoạt động</Label>
                <Input id="industry" name="industry" value={formData.industry} onChange={handleChange} placeholder="VD: Công nghệ thông tin" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại liên hệ</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="VD: 0912345678" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ trụ sở</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Nhập địa chỉ đầy đủ" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Giới thiệu ngắn</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                placeholder="Vài nét về doanh nghiệp của bạn..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo công ty (Tùy chọn)</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 border rounded-md bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoFile ? (
                    <span className="text-xs text-center px-1 text-green-600 font-medium">Đã tải lên</span>
                  ) : (
                    <span className="text-xs text-gray-400">Logo</span>
                  )}
                </div>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoFile)} className="flex-1" />
              </div>
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 h-12 text-base" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</>
              ) : (
                'Hoàn tất đăng ký'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruiterCompanySetup;
