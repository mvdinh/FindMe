import React, { useState } from 'react';
import ApplicantModal from './ApplicantModal';
import { HR_INPUT, HR_TEXTAREA } from '../applicantFormClasses';
import { Button } from '@/components/ui/button';

/**
 * Modal thêm/sửa học vấn, kinh nghiệm, dự án — cùng pattern `HRModal` như khu HR.
 */
const ProfileEditModal = ({ section, item, onSave, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (section === 'education') {
      return item
        ? { ...item }
        : {
            institution: '',
            degree: '',
            graduationDate: '',
            description: ''
          };
    }
    if (section === 'workExperience') {
      return item
        ? { ...item }
        : {
            company: '',
            position: '',
            duration: '',
            description: ''
          };
    }
    if (section === 'projects') {
      return item
        ? { ...item }
        : {
            name: '',
            technologies: '',
            description: ''
          };
    }
    return {};
  });

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSave(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const getSectionTitle = () => {
    switch (section) {
      case 'education':
        return item ? 'Sửa học vấn' : 'Thêm học vấn';
      case 'workExperience':
        return item ? 'Sửa kinh nghiệm' : 'Thêm kinh nghiệm';
      case 'projects':
        return item ? 'Sửa dự án' : 'Thêm dự án';
      default:
        return 'Chỉnh sửa';
    }
  };

  const renderFields = () => {
    if (section === 'education') {
      return (
        <>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Trường/Cơ sở đào tạo
            </label>
            <input type="text" name="institution" value={formData.institution} onChange={handleInputChange} className={HR_INPUT} required />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Bằng cấp/Chứng chỉ
            </label>
            <input
              type="text"
              name="degree"
              value={formData.degree}
              onChange={handleInputChange}
              placeholder="Ví dụ: Cử nhân Công nghệ thông tin"
              className={HR_INPUT}
              required
            />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Thời gian tốt nghiệp
            </label>
            <input
              type="text"
              name="graduationDate"
              value={formData.graduationDate}
              onChange={handleInputChange}
              placeholder="Ví dụ: 06/2023"
              className={HR_INPUT}
              required
            />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Mô tả (không bắt buộc)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Chi tiết bổ sung về học vấn của bạn"
              className={`${HR_TEXTAREA} min-h-0 resize-none`}
            />
          </div>
        </>
      );
    }
    if (section === 'workExperience') {
      return (
        <>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">Công ty</label>
            <input type="text" name="company" value={formData.company} onChange={handleInputChange} className={HR_INPUT} required />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Chức danh/Vị trí
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              placeholder="Ví dụ: Lập trình viên"
              className={HR_INPUT}
              required
            />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">Thời gian</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              placeholder="Ví dụ: 01/2022 - Hiện tại"
              className={HR_INPUT}
              required
            />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">Mô tả công việc</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Mô tả vai trò và thành tựu của bạn"
              className={`${HR_TEXTAREA} min-h-0 resize-none`}
              required
            />
          </div>
        </>
      );
    }
    if (section === 'projects') {
      return (
        <>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">Tên dự án</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={HR_INPUT} required />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">
              Công nghệ sử dụng
            </label>
            <input
              type="text"
              name="technologies"
              value={formData.technologies}
              onChange={handleInputChange}
              placeholder="Ví dụ: React, Node.js, MongoDB"
              className={HR_INPUT}
              required
            />
          </div>
          <div>
            <label className="mb-2 block font-['Roboto'] text-sm font-medium text-muted-foreground transition-colors duration-300">Mô tả dự án</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Mô tả dự án và vai trò của bạn"
              className={`${HR_TEXTAREA} min-h-0 resize-none`}
              required
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <ApplicantModal open onClose={onCancel} size="md" title={getSectionTitle()}>
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
        <fieldset disabled={submitting} className="min-w-0 border-0 p-0 m-0 space-y-4 disabled:opacity-[0.9]">
          {renderFields()}

        <div className="mt-6 flex gap-3 pt-1">
          <Button type="button" variant="outline" className="min-h-11 flex-1 font-['Roboto']" onClick={onCancel} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" className="min-h-11 flex-1 font-['Roboto']" disabled={submitting}>
            {submitting ? 'Đang lưu...' : item ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
        </fieldset>
      </form>
    </ApplicantModal>
  );
};

export default ProfileEditModal;
