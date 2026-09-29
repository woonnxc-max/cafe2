/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { OrderForm } from './components/OrderForm';
import { OrderBoard } from './components/OrderBoard';
import { SupabaseModal } from './components/SupabaseModal';
import { CafeOrder } from './data/cafeData';
import { 
  getSupabaseConfig, 
  getSupabaseClient, 
  fetchOrdersFromSupabase, 
  insertOrderToSupabase, 
  updateOrderStatusInSupabase, 
  deleteOrderInSupabase, 
  testSupabaseConnection 
} from './lib/supabase';
import { Database, AlertCircle, Sparkles } from 'lucide-react';

// 초기 로컬 테스트용 샘플 데이터
const INITIAL_LOCAL_ORDERS: CafeOrder[] = [
  {
    id: 'ORDER-SAMPLE-01',
    customerName: '홍길동',
    phoneNumber: '010-1234-5678',
    beverage: '카페라떼',
    size: 'M',
    options: ['샷 추가'],
    quantity: 1,
    requests: '얼음 적게 부탁드립니다.',
    totalPrice: 5000,
    status: '접수',
    createdAt: '10:30',
  },
];

/**
 * 바이브 카페 메인 애플리케이션
 * - 카페 감성의 따뜻한 베이지(#faf6f0) 및 브라운(#6b4226) 컬러 테마
 * - 실시간 금액 계산 주문서 및 주문 현황 게시판 제공
 * - Supabase 데이터베이스 실시간 연동 (CRUD & Realtime 지원)
 */
export default function App() {
  // 현재 활성화된 탭 ('order': 주문서, 'board': 주문 현황 게시판)
  const [activeTab, setActiveTab] = useState<'order' | 'board'>('order');

  // Supabase 설정 모달 표시 여부
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Supabase 연동 상태
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // 주문 내역 목록
  const [orders, setOrders] = useState<CafeOrder[]>(INITIAL_LOCAL_ORDERS);

  // Supabase에서 주문 목록 로드
  const loadOrders = useCallback(async (showLoading = true) => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    if (showLoading) setIsLoadingOrders(true);
    try {
      const fetchedOrders = await fetchOrdersFromSupabase();
      setOrders(fetchedOrders);
      setIsConnected(true);
    } catch (err: any) {
      console.warn('Supabase 주문 로드 실패:', err);
      // 테이블이 아직 없거나 권한 문제일 수 있음
      setIsConnected(false);
      setConnectionMessage(err?.message || '주문 목록을 불러오지 못했습니다.');
    } finally {
      if (showLoading) setIsLoadingOrders(false);
    }
  }, []);

  // Supabase 상태 점검 및 초기화
  const checkSupabaseStatus = useCallback(async () => {
    const config = getSupabaseConfig();
    setIsConfigured(config.isConfigured);

    if (config.isConfigured) {
      const testRes = await testSupabaseConnection();
      setIsConnected(testRes.success);
      setConnectionMessage(testRes.message);

      if (testRes.success) {
        await loadOrders(false);
      }
    } else {
      setIsConnected(false);
      setConnectionMessage('Supabase URL 및 Anon Key 미설정');
    }
  }, [loadOrders]);

  // 컴포넌트 마운트 시 Supabase 연결 확인 및 실시간 구독 설정
  useEffect(() => {
    checkSupabaseStatus();

    // Supabase Realtime 구독
    const client = getSupabaseClient();
    if (client) {
      const channel = client
        .channel('cafe_menu_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cafe_menu' },
          () => {
            loadOrders(false);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [checkSupabaseStatus, loadOrders]);

  // 새 주문 추가 핸들러
  const handleOrderSuccess = async (newOrder: CafeOrder) => {
    if (isConfigured) {
      // Supabase 클라우드 DB에 저장
      const created = await insertOrderToSupabase(newOrder);
      setOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
    } else {
      // 로컬 메모리 상태에 저장
      setOrders((prev) => [newOrder, ...prev]);
    }
  };

  // 주문 상태 변경 핸들러 ('접수' | '제조중' | '완료')
  const handleUpdateStatus = async (orderId: string, newStatus: '접수' | '제조중' | '완료') => {
    // 낙관적 UI 업데이트
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    if (isConfigured && isConnected) {
      try {
        await updateOrderStatusInSupabase(orderId, newStatus);
      } catch (err) {
        console.error('주문 상태 변경 에러:', err);
        // 실패 시 재조회로 롤백
        loadOrders(false);
      }
    }
  };

  // 주문 삭제 핸들러
  const handleDeleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    if (isConfigured && isConnected) {
      try {
        await deleteOrderInSupabase(orderId);
      } catch (err) {
        console.error('주문 삭제 에러:', err);
        loadOrders(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] text-[#3d2314] flex flex-col justify-between selection:bg-[#6b4226] selection:text-white">
      <div>
        {/* 상단 안내 배너 (Supabase 미연결 또는 확인 필요 시 노출) */}
        {!isConnected && (
          <div className="bg-[#f5ece1] border-b border-[#e5d5c5] px-4 py-2 text-xs text-[#6b4226]">
            <div className="max-w-[560px] mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Database className="w-3.5 h-3.5 shrink-0 text-[#8c674b]" />
                <span className="truncate">
                  {!isConfigured
                    ? '💡 Supabase를 연결하면 실제 클라우드 DB에 주문이 저장됩니다.'
                    : `⚠️ ${connectionMessage || 'Supabase 연결 상태 확인이 필요합니다.'}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="shrink-0 font-bold underline hover:text-[#3d2314] cursor-pointer"
              >
                {!isConfigured ? '연결하기' : '설정 열기'}
              </button>
            </div>
          </div>
        )}

        {/* 상단 헤더 영역 */}
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          orderCount={orders.length}
          isSupabaseConfigured={isConfigured}
          isSupabaseConnected={isConnected}
          onOpenSupabaseModal={() => setIsModalOpen(true)}
        />

        {/* 메인 콘텐츠 영역 (최대 너비 520px, 가운데 정렬) */}
        <main className="w-full">
          {activeTab === 'order' && (
            <OrderForm 
              onOrderSuccess={handleOrderSuccess}
              isSupabaseConnected={isConnected}
            />
          )}

          {activeTab === 'board' && (
            <OrderBoard 
              orders={orders} 
              onGoToOrder={() => setActiveTab('order')}
              onUpdateStatus={handleUpdateStatus}
              onRefresh={() => loadOrders(true)}
              isLoading={isLoadingOrders}
              onDeleteOrder={handleDeleteOrder}
            />
          )}
        </main>
      </div>

      {/* Supabase 설정 모달 */}
      <SupabaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfigChanged={checkSupabaseStatus}
      />

      {/* 하단 푸터 영역 */}
      <footer className="py-6 text-center text-xs text-[#a07e66] border-t border-[#ede1d3] bg-[#faf6f0]">
        <p className="font-medium">바이브 카페 (Vibe Cafe) · 당신의 하루에 바이브를 더하다</p>
        <p className="mt-1 text-[11px] text-[#b3957f]">
          {isConnected ? '🟢 Supabase 클라우드 실시간 연동 중' : '⚪ 로컬 모드 동작 중'}
        </p>
      </footer>
    </div>
  );
}
