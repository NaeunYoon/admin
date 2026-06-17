import { Building2, ExternalLink } from 'lucide-react';

// 자체 로그인 없음 — 어드민(인트라넷)에서 SSO로만 진입한다.
// 세션이 없거나 만료된 채 직접 들어온 경우 보여주는 안내 화면.
export default function AccessPage() {
  const adminUrl = ((import.meta.env as any).VITE_ADMIN_URL as string) || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
          <Building2 size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">프로젝트 관리</h1>
        <div className="bg-white rounded-2xl p-6 shadow-2xl mt-6">
          <p className="text-gray-700 text-sm leading-relaxed">
            이 서비스는 <strong>인트라넷(어드민)</strong>을 통해 접속합니다.<br />
            어드민에 로그인한 뒤 우측 상단의<br />
            <span className="font-semibold text-blue-600">“프로젝트 관리”</span> 버튼으로 들어와 주세요.
          </p>
          {adminUrl && (
            <a href={adminUrl}
               className="mt-5 inline-flex items-center justify-center gap-1.5 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              어드민으로 이동 <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
