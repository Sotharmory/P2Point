import React, { useState, useRef, useEffect } from 'react';
import Navigation from '../Navigation/Navigation';
import { fileAPI } from '../../services/api';
import './Home.css';

// Local interface for file data
interface FileData {
  id: string;
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  downloadUrl?: string;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  downloadUrl?: string;
}

interface HomeProps {
  userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    token: string;
  };
  onLogout?: () => void;
}

const Home: React.FC<HomeProps> = ({ userData, onLogout = () => {} }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API functions using service
  const uploadFileAPI = async (file: File): Promise<FileItem> => {
    const result = await fileAPI.upload(file);
    const fileData: FileData = result.data;
    
    return {
      id: fileData.id,
      name: fileData.originalFileName,
      size: fileData.fileSize,
      type: fileData.contentType,
      uploadDate: fileData.uploadedAt,
      downloadUrl: fileAPI.download(fileData.id)
    };
  };

  const fetchFilesAPI = async (): Promise<FileItem[]> => {
    const result = await fileAPI.getMyFiles();
    return result.data.map((fileData: FileData) => ({
      id: fileData.id,
      name: fileData.originalFileName,
      size: fileData.fileSize,
      type: fileData.contentType,
      uploadDate: fileData.uploadedAt,
      downloadUrl: fileAPI.download(fileData.id)
    }));
  };

  const deleteFileAPI = async (fileId: string): Promise<void> => {
    await fileAPI.delete(fileId);
  };

  // Load files from API on component mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const filesData = await fetchFilesAPI();
        setFiles(filesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
        console.error('Error loading files:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📋';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    return '📁';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      handleFileUpload(Array.from(selectedFiles));
    }
  };

  const handleFileUpload = async (filesToUpload: File[]) => {
    setUploading(true);
    setError(null);
    
    try {
      for (const file of filesToUpload) {
        const uploadedFile = await uploadFileAPI(file);
        setFiles(prev => [uploadedFile, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Error uploading files:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  const handleDownload = (file: FileItem) => {
    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
      try {
        await deleteFileAPI(fileId);
        setFiles(prev => prev.filter(file => file.id !== fileId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
        console.error('Error deleting file:', err);
      }
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return b.size - a.size;
      case 'date':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="home-container">
      <Navigation userData={userData} onLogout={onLogout} />
      <div className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Quản lý File</h1>
            <p>Xin chào, {userData.firstName || userData.email}!</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{files.length}</span>
              <span className="stat-label">Files</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
              </span>
              <span className="stat-label">Tổng dung lượng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="home-content">
        {error && (
          <div className="error-message">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        
        <div className="upload-section">
          <div 
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📁</div>
            <h3>Kéo thả file vào đây hoặc click để chọn</h3>
            <p>Hỗ trợ tất cả các định dạng file</p>
            {uploading && (
              <div className="upload-progress">
                <div className="spinner"></div>
                <span>Đang tải lên...</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        <div className="files-section">
          <div className="files-toolbar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm kiếm file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="toolbar-controls">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'date')}
                className="sort-select"
              >
                <option value="date">Sắp xếp theo ngày</option>
                <option value="name">Sắp xếp theo tên</option>
                <option value="size">Sắp xếp theo kích thước</option>
              </select>
              
              <div className="view-toggle">
                <button 
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                >
                  ⊞
                </button>
                <button 
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          <div className={`files-grid ${viewMode}`}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Đang tải danh sách file...</p>
              </div>
            ) : sortedFiles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h3>Chưa có file nào</h3>
                <p>Tải lên file đầu tiên của bạn để bắt đầu</p>
              </div>
            ) : (
              sortedFiles.map(file => (
                <div key={file.id} className="file-card">
                  <div className="file-icon">{getFileIcon(file.type)}</div>
                  <div className="file-info">
                    <h4 className="file-name" title={file.name}>{file.name}</h4>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-date">{formatDate(file.uploadDate)}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button 
                      className="action-btn download"
                      onClick={() => handleDownload(file)}
                      title="Tải xuống"
                    >
                      ⬇️
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(file.id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;