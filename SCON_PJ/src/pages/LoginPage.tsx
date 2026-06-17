import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Building2 } from 'lucide-react';
import { api } from '../api';
import type { User } from '../types';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [users,    setUsers]    = useState<User[]>([]);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  useEffect(() => {
    // 테스트 계정 목록은 인증 없이 가져올 수 없으므로 고정 목록 사용
    setUsers([
      { id: 'u1', name: '김관리',  email: 'admin@scon.com',   role: 'admin',   department: '경영지원', projectIds: [] },
      { id: 'u2', name: '이매니저', email: 'manager@scon.com', role: 'manager', department: '개발팀',   projectIds: [] },
      { id: 'u3', name: '박개발',  email: 'dev@scon.com',     role: 'member',  department: '개발팀',   projectIds: [] },
      { id: 'u4', name: '최디자인', email: 'design@scon.com',  role: 'member',  department: '디자인팀', projectIds: [] },
      { id: 'u5', name: '정기획',  email: 'plan@scon.com',    role: 'manager', department: '기획팀',   projectIds: [] },
    ]);
  }, []);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) navigate('/dashboard');
    else setError(result.message ?? '로그인에 실패했습니다.');
  };

  const quickLogin = async (userEmail: string) => {
    setLoading(true);
    setError('');
    const result = await login(userEmail, 'scon1234');
    setLoading(false);
    if (result.ok) navigate('/dashboard');
    else setError(result.message ?? '로그인에 실패했습니다.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SCON</h1>
          <p className="text-slate-400 text-sm mt-1">프로젝트 관리 시스템</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@scon.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-5">
            <p className="text-xs text-gray-500 text-center mb-3">테스트 계정으로 빠른 로그인 <span className="text-gray-400">(비밀번호: scon1234)</span></p>
            <div className="space-y-2">
              {users.map(u => (
                <button key={u.id} onClick={() => quickLogin(u.email)} disabled={loading}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors disabled:opacity-60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                      {u.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-gray-800 font-medium text-xs">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.department}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
                    u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'admin' ? '관리자' : u.role === 'manager' ? '매니저' : '멤버'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
