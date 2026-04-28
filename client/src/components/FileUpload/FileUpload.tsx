import React, { useRef, useState } from 'react';
import { Button } from 'animal-island-ui';
import { uploadEpub } from '../../services/vectorService';
import './FileUpload.css';

export const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.epub')) {
      alert('请选择 EPUB 文件');
      return;
    }

    setLoading(true);

    try {
      const result = await uploadEpub(file);
      alert(`成功! 已处理 ${result.count} 个文本块`);
    } catch (error: any) {
      console.error(error);
      alert(`上传失败: ${error.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="file-upload-compact">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".epub"
        style={{ display: 'none' }}
      />

      <Button
        onClick={handleButtonClick}
        loading={loading}
        className="upload-icon-button"
        title="上传 EPUB 知识库"
      >
        <span style={{ fontSize: '20px' }}>📚</span>
      </Button>
    </div>
  );
};
