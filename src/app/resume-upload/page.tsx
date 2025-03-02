'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';

export default function ResumeUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf');
  const [resumeText, setResumeText] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('请上传PDF格式的简历');
        setFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleUploadPdf = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setLoading(true);
    setProgress('正在上传文件...');
    setError(null);

    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);

      // 上传文件
      const uploadResponse = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败');
      }

      const { fileId } = await uploadResponse.json();
      setProgress('正在解析简历内容...');

      // 解析简历
      const parseResponse = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

      const { candidateId } = await parseResponse.json();
      setProgress('简历解析完成，正在跳转...');

      // 解析成功后跳转到候选人详情页
      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      console.error('上传或解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '上传或解析过程中出错');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadText = async () => {
    if (!resumeText.trim()) {
      setError('请输入简历文本');
      return;
    }

    setLoading(true);
    setProgress('正在解析简历内容...');
    setError(null);

    try {
      // 解析文本简历
      const parseResponse = await fetch('/api/resume/parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText }),
      });

      if (!parseResponse.ok) {
        throw new Error('简历解析失败');
      }

      const { candidateId } = await parseResponse.json();
      setProgress('简历解析完成，正在跳转...');

      // 解析成功后跳转到候选人详情页
      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      console.error('解析过程中出错:', err);
      setError(err instanceof Error ? err.message : '解析过程中出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI辅助人才建档</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">上传简历</h2>
        <p className="text-gray-600 mb-6">
          上传简历或输入简历文本，系统将自动解析简历内容，提取关键信息，并生成候选人档案。
        </p>

        <div className="mb-6 border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'pdf'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              PDF上传
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'text'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              文本输入
            </button>
          </div>
        </div>

        {activeTab === 'pdf' ? (
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                {file ? (
                  <p className="text-sm text-gray-600">
                    已选择: <span className="font-medium">{file.name}</span> (
                    {(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    {isDragActive
                      ? '拖放文件到这里...'
                      : '拖放PDF文件到这里，或点击选择文件'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUploadPdf}
                disabled={!file || loading}
                className={`btn-primary ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '处理中...' : '上传并解析'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label
                htmlFor="resumeText"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                输入简历文本
              </label>
              <textarea
                id="resumeText"
                rows={12}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="请粘贴或输入简历文本内容..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                disabled={loading}
              ></textarea>
              <p className="mt-2 text-sm text-gray-500">
                支持复制粘贴文本格式的简历内容，系统将自动提取关键信息
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUploadText}
                disabled={!resumeText.trim() || loading}
                className={`btn-primary ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '处理中...' : '解析文本'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {progress && (
          <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-md">
            {progress}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">功能说明</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>支持上传PDF格式的简历文件</li>
          <li>支持直接粘贴文本格式的简历内容</li>
          <li>系统将使用DeepSeek模型和Kimi长文本模型解析简历内容</li>
          <li>自动提取个人基本信息（姓名、联系方式、教育背景、工作经历等）</li>
          <li>智能识别技能标签，并根据公司需求进行匹配</li>
          <li>生成初始评分，帮助快速筛选合适的候选人</li>
        </ul>
      </div>
    </div>
  );
}
