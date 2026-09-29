import React from 'react';
import { CafeOrder } from '../data/cafeData';
import { Coffee, Clock, User, Phone, PlusCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react';

interface OrderBoardProps {
  orders: CafeOrder[];
  onGoToOrder: () => void;
  onUpdateStatus?: (orderId: string, newStatus: '접수' | '제조중' | '완료') => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
}

/**
 * 카페 주문 현황 게시판 컴포넌트
 * - 접수된 주문 내역을 카드 형태로 확인
 * - 주문 상태(접수, 제조중, 완료) 및 상세 정보 제공
 * - Supabase 실시간 동기화 및 새로고침 지원
 */
export const OrderBoard: React.FC<OrderBoardProps> = ({ 
  orders, 
  onGoToOrder, 
  onUpdateStatus,
  onRefresh,
  isLoading = false,
  onDeleteOrder,
}) => {
  return (
    <div className="w-full max-w-[520px] mx-auto px-4 pb-12">
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(107,66,38,0.08)] border border-[#ede1d3]">
        <div className="flex items-center justify-between border-b border-[#f0e4d7] pb-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#6b4226] flex items-center gap-2">
              <span>📋 실시간 주문 게시판</span>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#6b4226]" />}
            </h2>
            <p className="text-xs text-[#8c674b] mt-0.5">
              총 {orders.length}건의 주문 내역이 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="주문 목록 새로고침"
                className="p-1.5 text-xs text-[#6b4226] bg-[#f5ebe1] rounded-lg hover:bg-[#ebdccc] disabled:opacity-50 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onGoToOrder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6b4226] rounded-lg hover:bg-[#7e4f30] cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>새 주문하기</span>
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center text-[#8c674b]">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#6b4226]" />
            <p className="text-sm font-semibold">아직 접수된 주문이 없습니다.</p>
            <p className="text-xs text-[#a89080] mt-1">주문서에서 음료를 주문해보세요!</p>
            <button
              type="button"
              onClick={onGoToOrder}
              className="mt-4 px-4 py-2 bg-[#6b4226] text-white text-xs font-bold rounded-lg hover:bg-[#7e4f30] transition-colors"
            >
              첫 주문 작성하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-[#ebdccc] bg-[#fdfbf8] hover:border-[#cbb39e] transition-all shadow-xs"
              >
                {/* 상단: 주문 번호 및 상태 뱃지 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6b4226] bg-[#f5ebe1] px-2 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-[#8c674b] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {order.createdAt}
                    </span>
                  </div>

                  {/* 상태 선택 드롭다운 및 삭제 버튼 */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        onUpdateStatus &&
                        onUpdateStatus(order.id, e.target.value as '접수' | '제조중' | '완료')
                      }
                      className={`text-xs font-bold px-2 py-0.5 rounded-full cursor-pointer border ${
                        order.status === '완료'
                          ? 'bg-[#eef9ee] text-[#155724] border-[#c3e6cb]'
                          : order.status === '제조중'
                          ? 'bg-[#fff8e1] text-[#b78103] border-[#ffe082]'
                          : 'bg-[#f0e8df] text-[#6b4226] border-[#d8c5b2]'
                      }`}
                    >
                      <option value="접수">접수됨</option>
                      <option value="제조중">제조중 ☕</option>
                      <option value="완료">완료됨 ✨</option>
                    </select>

                    {onDeleteOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`${order.customerName}님의 주문(#${idx + 1})을 삭제하시겠습니까?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="p-1 text-[#b3957f] hover:text-[#d32f2f] hover:bg-[#ffebee] rounded-md transition-colors cursor-pointer"
                        title="주문 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 주문자 정보 */}
                <div className="flex items-center gap-3 text-xs text-[#5c3820] mb-2 font-medium">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#8c674b]" />
                    {order.customerName} 고객님
                  </span>
                  {order.phoneNumber && order.phoneNumber !== '미입력' && (
                    <span className="flex items-center gap-1 text-[#8c674b]">
                      <Phone className="w-3 h-3" />
                      {order.phoneNumber}
                    </span>
                  )}
                </div>

                {/* 음료 및 옵션 내역 */}
                <div className="bg-white p-3 rounded-lg border border-[#f0e4d7] mb-2.5">
                  <div className="flex justify-between items-center text-sm font-bold text-[#3d2314]">
                    <span>
                      {order.beverage} ({order.size}사이즈)
                    </span>
                    <span className="text-[#6b4226] font-extrabold">
                      {order.quantity}잔
                    </span>
                  </div>
                  {order.options.length > 0 && (
                    <p className="text-xs text-[#8c674b] mt-1 font-medium">
                      옵션: {order.options.join(', ')}
                    </p>
                  )}
                  {order.requests && order.requests !== '없음' && (
                    <p className="text-xs text-[#735138] mt-1.5 pt-1.5 border-t border-dashed border-[#ede1d3] italic">
                      요청사항: "{order.requests}"
                    </p>
                  )}
                </div>

                {/* 결제 금액 */}
                <div className="flex items-center justify-between text-xs font-semibold text-[#8c674b] pt-1">
                  <span>총 주문 금액</span>
                  <span className="text-base font-extrabold text-[#6b4226]">
                    {order.totalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
