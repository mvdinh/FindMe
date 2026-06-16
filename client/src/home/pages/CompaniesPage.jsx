import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pagination } from '../../components/common/Pagination';
import { Search, MapPin, Building2, Globe, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 20;

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString()
      });
      
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      const response = await apiRequest(`/api/companies?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Không thể tải danh sách công ty');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, currentPage, apiRequest]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCompanyClick = (companyId) => {
    navigate(`/companies/${companyId}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl font-['Open_Sans'] mb-4">
            Khám phá các công ty hàng đầu
          </h1>
          <p className="text-lg text-gray-600 font-['Roboto'] max-w-2xl mx-auto">
            Tìm hiểu về môi trường làm việc, văn hóa và các cơ hội nghề nghiệp tại những doanh nghiệp uy tín.
          </p>
        </div>

        <Card className="mb-8 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm công ty theo tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-12 pl-10 text-base"
              />
            </div>
            
            {!loading && !error && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Tìm thấy <strong className="text-gray-900">{pagination.total}</strong> công ty</span>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertCircle className="size-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {companies.map((company) => (
              <Card 
                key={company._id} 
                className="cursor-pointer shadow-sm hover:shadow-md transition-shadow hover:border-red-200"
                onClick={() => handleCompanyClick(company._id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 shrink-0 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                      {company.logo ? (
                        <img 
                          src={company.logo.startsWith('/uploads') ? `${getApiUrl()}${company.logo}` : company.logo} 
                          alt={company.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Building2 className="size-8 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{company.name}</h3>
                      {company.industry && (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          {company.industry}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{company.address || 'Chưa cập nhật địa chỉ'}</span>
                    </div>
                    {company.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 shrink-0" />
                        <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline line-clamp-1" onClick={e => e.stopPropagation()}>
                          {company.website}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Building2 className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium text-foreground">Không tìm thấy công ty</h3>
              <p className="text-muted-foreground">
                Hãy thử thay đổi từ khoá tìm kiếm.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
