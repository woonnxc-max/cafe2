import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  KeyRound,
  Globe
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfigToStorage, 
  clearSupabaseConfigStorage, 
  testSupabaseConnection 
} from '../lib/supabase';
import { SUPABASE_SQL_SCRIPT } from '../data/supabaseSql';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfigChanged 
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.supabaseUrl);
      setAnonKey(config.supabaseAnonKey);
      setTestResult(null);

      if (config.isConfigured) {
        handleTestConnection(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (manual = true) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || '연결 테스트 중 알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfigToStorage(url, anonKey);
    onConfigChanged();
    await handleTestConnection(true);
  };

  const handleReset = () => {
    if (confirm('저장된 Supabase 연결 설정을 초기화하시겠습니까?')) {
      clearSupabaseConfigStorage();
      const config = getSupabaseConfig();
      setUrl(config.supabaseUrl);
      setAnonKey(config.supabaseAnonKey);
      setTestResult(null);
      onConfigChanged();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-[#ede1d3] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e4d7] bg-[#faf6f0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#6b4226] text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#6b4226] leading-tight">
                Supabase 데이터베이스 연동 설정
              </h3>
              <p className="text-xs text-[#8c674b] mt-0.5">
                카페 주문 데이터를 클라우드 DB에 실시간 저장합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8c674b] hover:bg-[#ede2d5] hover:text-[#5c3820] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 내용 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-[#3d2314]">
          {/* 연결 상태 피드백 알림창 */}
          {testResult && (
            <div 
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-[#eef9ee] border-[#b7eb8f] text-[#155724]' 
                  : 'bg-[#fff2e8] border-[#ffbb96] text-[#d4380d]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#52c41a] mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#fa541c] mt-0.5" />
              )}
              <div className="text-xs">
                <span className="font-bold block text-sm mb-0.5">
                  {testResult.success ? '연결 성공!' : '연결 확인 필요'}
                </span>
                <p className="leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* 설정 입력 폼 */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6b4226] mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="cafe-input text-xs font-mono"
                required
              />
              <p className="text-[11px] text-[#8c674b] mt-1">
                Supabase 대시보드 &gt; Project Settings &gt; API &gt; Project URL
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b4226] mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Supabase Anon / Public Key</span>
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="cafe-input text-xs font-mono"
                required
              />
              <p className="text-[11px] text-[#8c674b] mt-1">
                Supabase 대시보드 &gt; Project Settings &gt; API &gt; Project API keys (anon public)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#6b4226] text-white font-bold text-xs rounded-lg hover:bg-[#7e4f30] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>설정 저장 & 적용</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestConnection(true)}
                disabled={isTesting || !url || !anonKey}
                className="py-2.5 px-3 bg-[#ede2d5] text-[#5c3820] font-semibold text-xs rounded-lg hover:bg-[#dfd1c1] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? '확인 중...' : '연결 테스트'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-2.5 px-3 text-[#a07e66] hover:text-[#5c3820] hover:bg-[#faf6f0] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                title="설정 초기화"
              >
                초기화
              </button>
            </div>
          </form>

          {/* SQL 스크립트 실행 안내 */}
          <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#ede1d3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6b4226]">
                <Sparkles className="w-3.5 h-3.5 text-[#b07d58]" />
                <span>테이블 생성용 SQL 스크립트 (cafe_menu)</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  copied 
                    ? 'bg-[#2e7d32] text-white' 
                    : 'bg-[#ede2d5] text-[#5c3820] hover:bg-[#dfd1c1]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>SQL 복사</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[12px] text-[#735138] leading-relaxed">
              Supabase에 처음 연결하시는 경우, 아래의 간단한 순서로 테이블을 생성해 주세요:
            </p>

            <ol className="text-xs text-[#5c3820] space-y-1.5 list-decimal pl-4">
              <li>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-bold underline text-[#6b4226] inline-flex items-center gap-1 hover:text-[#8c4f28]"
                >
                  Supabase 대시보드 <ExternalLink className="w-2.5 h-2.5" />
                </a>
                에서 프로젝트를 선택합니다.
              </li>
              <li>좌측 사이드바에서 <strong>SQL Editor</strong> 메뉴를 클릭합니다.</li>
              <li>우측 상단 <strong>New Query</strong>를 누르고, 위의 <strong>[SQL 복사]</strong> 버튼으로 복사한 쿼리를 붙여넣습니다.</li>
              <li>우측 하단의 <strong>Run (실행)</strong> 버튼을 클릭하면 주문 테이블 및 RLS 권한이 즉시 생성됩니다.</li>
            </ol>
          </div>
        </div>

        {/* 모달 하단 닫기 */}
        <div className="px-6 py-3 bg-[#faf6f0] border-t border-[#f0e4d7] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#6b4226] text-white text-xs font-bold rounded-lg hover:bg-[#7e4f30] transition-colors cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
