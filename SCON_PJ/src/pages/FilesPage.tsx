import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { MOCK_NAS_FILES } from '../data/mockData';
import type { NasFile } from '../types';
import {
  Folder, File, FileText, FileImage, ChevronRight,
  HardDrive, Upload, Search, ArrowLeft, Home
} from 'lucide-react';

function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(file: NasFile) {
  if (file.type === 'folder') return <Folder size={18} className="text-yellow-500" />;
  if (file.mimeType?.includes('image')) return <FileImage size={18} className="text-blue-400" />;
  if (file.mimeType?.includes('pdf')) return <FileText size={18} className="text-red-400" />;
  if (file.mimeType?.includes('word') || file.mimeType?.includes('document')) return <FileText size={18} className="text-blue-600" />;
  if (file.mimeType?.includes('sheet') || file.mimeType?.includes('excel')) return <FileText size={18} className="text-green-600" />;
  return <File size={18} className="text-gray-400" />;
}

export default function FilesPage() {
  const { projectId } = useParams();
  const { projects } = useProjectStore();
  const project = projects.find(p => p.id === projectId);
  const [currentFolder, setCurrentFolder] = useState<NasFile | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<NasFile[]>([]);
  const [search, setSearch] = useState('');

  const rootFiles = MOCK_NAS_FILES.filter(f => f.projectId === projectId);

  const currentFiles = currentFolder ? (currentFolder.children ?? []) : rootFiles;
  const filtered = currentFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const navigateTo = (file: NasFile) => {
    if (file.type === 'folder') {
      setBreadcrumb(prev => [...prev, file]);
      setCurrentFolder(file);
      setSearch('');
    }
  };

  const navigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolder(null);
      setBreadcrumb([]);
    } else {
      const target = breadcrumb[index];
      setCurrentFolder(target);
      setBreadcrumb(prev => prev.slice(0, index + 1));
    }
    setSearch('');
  };

  if (!project) return null;

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs text-gray-400">{project.code}</p>
          <h2 className="text-lg font-bold text-gray-900">{project.name} — NAS 파일</h2>
        </div>
      </div>

      {/* NAS Connection Info */}
      <div className="flex items-center gap-2 bg-slate-800 text-slate-300 rounded-lg px-4 py-2.5 text-sm">
        <HardDrive size={16} className="text-green-400" />
        <span className="text-green-400 font-medium mr-1">연결됨</span>
        <span className="font-mono text-xs">{project.nasPath ?? '경로 미설정'}</span>
        <span className="ml-auto text-xs text-slate-500">※ 로컬 환경에서는 목업 데이터로 표시됩니다</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
            <button
              onClick={() => navigateBreadcrumb(-1)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 shrink-0"
            >
              <Home size={14} />
            </button>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-gray-400" />
                <button
                  onClick={() => navigateBreadcrumb(i)}
                  className={`hover:text-blue-700 transition-colors ${
                    i === breadcrumb.length - 1 ? 'text-gray-800 font-medium' : 'text-blue-600'
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="파일 검색..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
              />
            </div>
            <button className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              <Upload size={14} />
              업로드
            </button>
          </div>
        </div>

        {/* File List */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 font-medium">이름</th>
              <th className="px-4 py-2.5 font-medium w-24">크기</th>
              <th className="px-4 py-2.5 font-medium w-36">수정일</th>
              <th className="px-4 py-2.5 font-medium w-20">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <Folder size={32} className="mx-auto mb-2 opacity-30" />
                  <p>파일이 없습니다</p>
                </td>
              </tr>
            )}
            {filtered.map(file => (
              <tr
                key={file.id}
                className={`hover:bg-blue-50 transition-colors ${file.type === 'folder' ? 'cursor-pointer' : ''}`}
                onDoubleClick={() => navigateTo(file)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {getFileIcon(file)}
                    <span
                      className={`font-medium ${file.type === 'folder' ? 'text-gray-800 hover:text-blue-700' : 'text-gray-700'}`}
                      onClick={() => file.type === 'folder' && navigateTo(file)}
                    >
                      {file.name}
                    </span>
                    {file.type === 'folder' && file.children && (
                      <span className="text-xs text-gray-400">({file.children.length}개)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatSize(file.size)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{file.modifiedAt}</td>
                <td className="px-4 py-3">
                  {file.type === 'file' && (
                    <button className="text-xs text-blue-600 hover:underline">다운로드</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtered.length}개 항목
        </div>
      </div>
    </div>
  );
}
