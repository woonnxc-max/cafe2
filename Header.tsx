import React from 'react';
import { Coffee, ClipboardList, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: 'order' | 'board';
  setActiveTab: (tab: 'order' | 'board') => void;
  orderCount: number;
  isSupabaseConfigured?: boolean;
  isSupabaseConnected?: boolean;
  onOpenSupabaseModal?: () => void;
}

/**
 * 페이지 상단 헤더 컴포넌트
 * - 카페 로고: ☕ 이모지 크게
 * - 카페 이름: "바이브 카페"
 * - 부제: "당신의 하루에 바이브를 더하다"
 * - Supabase 연동 상태 표시 및 설정 버튼
 * - 주문서 / 주문 게시판 탭 전환
 */
export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  orderCount,
  isSupabaseConfigured = false,
  isSupabaseConnected = false,
  onOpenSupabaseModal,
}) => {
  return (
    <header className="text-center pt-7 pb-5 px-4 relative max-w-[560px] mx-auto">
      {/* 우측 상단 Supabase 연동 상태 버튼 */}
      <div className="flex justify-center sm:justify-end mb-2 sm:mb-0">
        <button
          type="button"
          onClick={onOpenSupabaseModal}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isSupabaseConnected
              ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-[#dcfce7]'
              : isSupabaseConfigured
              ? 'bg-[#fffbeb] text-[#b45309] border-[#fde68a] hover:bg-[#fef3c7]'
              : 'bg-[#faf6f0] text-[#6b4226] border-[#d8c3b0] hover:bg-[#efe6db]'
          }`}
          title="Supabase 연결 설정 열기"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1">
            <span 
              className={`w-2 h-2 rounded-full inline-block ${
                isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : isSupabaseConfigured ? 'bg-amber-500' : 'bg-stone-400'
              }`}
            />
            {isSupabaseConnected
              ? 'Supabase 연결됨'
              : isSupabaseConfigured
              ? 'Supabase 확인 필요'
              : 'Supabase 연결하기'}
          </span>
        </button>
      </div>

      {/* ☕ 이모지 로고 (요구사항: 카페 로고 크게) */}
      <div 
        className="inline-flex items-center justify-center text-5xl mb-2 select-none transition-transform hover:scale-110 duration-200"
        aria-label="바이브 카페 커피 로고"
        role="img"
      >
        ☕
      </div>

      {/* 카페 이름 & 부제 */}
      <h1 className="text-3xl font-extrabold text-[#6b4226] tracking-tight mb-1">
        바이브 카페
      </h1>
      <p className="text-sm font-medium text-[#8c674b]">
        당신의 하루에 바이브를 더하다
      </p>

      {/* 탭 네비게이션: 주문서 작성 / 주문 현황 (게시판) */}
      <div className="mt-5 flex items-center justify-center gap-1.5 p-1 bg-[#efe6db] rounded-xl max-w-[320px] mx-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('order')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'order'
              ? 'bg-[#6b4226] text-white shadow-sm'
              : 'text-[#6b4226] hover:bg-[#e4d8ca]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>주문서 작성</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('board')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'board'
              ? 'bg-[#6b4226] text-white shadow-sm'
              : 'text-[#6b4226] hover:bg-[#e4d8ca]'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>주문 현황 ({orderCount})</span>
        </button>
      </div>
    </header>
  );
};

