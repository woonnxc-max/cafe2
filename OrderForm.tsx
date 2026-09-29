import React, { useState, useId, useRef } from 'react';
import { 
  BEVERAGE_MENU, 
  SIZE_OPTIONS, 
  EXTRA_OPTIONS, 
  DrinkSize, 
  CafeOrder 
} from '../data/cafeData';
import { RotateCcw, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface OrderFormProps {
  onOrderSuccess: (order: CafeOrder) => Promise<boolean | void> | void;
  isSupabaseConnected?: boolean;
}

/**
 * 바이브 카페 주문서 작성 컴포넌트
 * 요구사항:
 * - 최대 너비 520px, 가운데 정렬
 * - 베이지(#faf6f0) 배경 속 부드러운 카드(#ffffff), 브라운(#6b4226) 포인트
 * - 모든 input에 label 연결 (htmlFor & id)
 * - 음료, 사이즈, 옵션, 수량 변경 시 실시간 예상 금액 계산 (24px, #6b4226, 굵게, 가운데 정렬)
 * - 천 단위 콤마 표시 (toLocaleString)
 * - 주문하기 유효성 검사: 이름 미입력 시 "이름을 입력해주세요", 음료 미선택 시 "음료를 선택해주세요"
 * - 주문 완료 시 연두색 배경, 초록 글씨의 확인 메시지 표시
 * - 다시 작성 버튼 클릭 시 전체 폼 및 계산 초기화
 */
export const OrderForm: React.FC<OrderFormProps> = ({ onOrderSuccess, isSupabaseConnected = false }) => {
  // 고유 폼 ID 생성 (label htmlFor 연결용)
  const nameInputId = useId();
  const phoneInputId = useId();
  const beverageSelectId = useId();
  const quantityInputId = useId();
  const requestsTextareaId = useId();

  // 입력 필드 참조 (포커스 이동용)
  const nameRef = useRef<HTMLInputElement>(null);
  const beverageRef = useRef<HTMLSelectElement>(null);

  // 1. 주문서 입력 상태값 정의
  const [customerName, setCustomerName] = useState<string>(''); // 이름 (필수)
  const [phoneNumber, setPhoneNumber] = useState<string>('');   // 전화번호
  const [beverage, setBeverage] = useState<string>('');         // 음료명 (선택 안 함: 빈 문자열)
  const [size, setSize] = useState<DrinkSize>('M');             // 사이즈 (기본값 M)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // 추가 옵션 id 목록
  const [quantity, setQuantity] = useState<number>(1);          // 수량 (최소 1, 최대 10, 기본값 1)
  const [requests, setRequests] = useState<string>('');         // 요청사항

  // 유효성 검사 경고 메시지 상태 (알림용)
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  // 전송 중 및 전송 오류 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 주문 성공 확인 메시지 상태
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // 2. 실시간 예상 금액 계산 로직
  // (음료, 사이즈, 추가옵션, 수량이 변경될 때마다 자동 계산)
  const calculateEstimatedPrice = (): number => {
    // 음료를 선택하지 않은 경우 0원 반환
    if (!beverage) return 0;

    // 선택된 음료 기본 가격 찾기
    const selectedDrink = BEVERAGE_MENU.find((item) => item.name === beverage);
    const basePrice = selectedDrink ? selectedDrink.price : 0;

    // 사이즈 추가 금액 계산 (S: 0원, M: +500원, L: +1,000원)
    const selectedSizeOption = SIZE_OPTIONS.find((s) => s.value === size);
    const sizeExtraPrice = selectedSizeOption ? selectedSizeOption.extraPrice : 0;

    // 추가 옵션 금액 합산
    const optionsExtraPrice = selectedOptions.reduce((sum, optId) => {
      const opt = EXTRA_OPTIONS.find((o) => o.id === optId);
      return sum + (opt ? opt.price : 0);
    }, 0);

    // 1잔 당 금액 = 기본음료가격 + 사이즈금액 + 옵션금액
    const singleDrinkTotal = basePrice + sizeExtraPrice + optionsExtraPrice;

    // 최종 예상 금액 = 1잔 금액 * 수량
    return singleDrinkTotal * quantity;
  };

  const estimatedPrice = calculateEstimatedPrice();

  // 추가 옵션 체크박스 변경 핸들러
  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  // 수량 변경 핸들러 (1 ~ 10 제한)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setQuantity(1);
    } else {
      // 1 이상 10 이하로 제한
      setQuantity(Math.min(10, Math.max(1, val)));
    }
  };

  // 3. 주문하기 버튼 클릭 처리 핸들러
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이름 유효성 검사
    if (!customerName.trim()) {
      setValidationAlert('이름을 입력해주세요');
      setConfirmationMessage(null);
      nameRef.current?.focus();
      return;
    }

    // 음료 선택 유효성 검사
    if (!beverage) {
      setValidationAlert('음료를 선택해주세요');
      setConfirmationMessage(null);
      beverageRef.current?.focus();
      return;
    }

    // 유효성 검사 통과 시 경고 초기화
    setValidationAlert(null);
    setSubmitError(null);

    // 선택된 추가 옵션 한글 라벨 가공
    const optionLabels = selectedOptions
      .map((optId) => {
        const found = EXTRA_OPTIONS.find((o) => o.id === optId);
        if (!found) return '';
        // "샷 추가 (+500원)" -> "샷 추가" 추출
        return found.label.split(' (')[0];
      })
      .filter(Boolean);

    // 추가 옵션 문구 조합 (옵션이 있으면 괄호로 표기)
    const optionsText = optionLabels.length > 0 ? ` (${optionLabels.join(', ')})` : '';

    // 주문 확인 메시지 생성 (요구사항 형식)
    // 예: "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!"
    const formattedPrice = estimatedPrice.toLocaleString();
    const finalConfirmMsg = `${customerName.trim()}님, ${beverage} ${size}사이즈${optionsText} ${quantity}잔, 총 ${formattedPrice}원 주문이 접수되었습니다!`;

    // 상위 컴포넌트(게시판 리스트)로 주문 데이터 전달
    const newOrder: CafeOrder = {
      id: `ORDER-${Date.now()}`,
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim() || '미입력',
      beverage,
      size,
      options: optionLabels,
      quantity,
      requests: requests.trim() || '없음',
      totalPrice: estimatedPrice,
      status: '접수',
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      setIsSubmitting(true);
      await onOrderSuccess(newOrder);
      setConfirmationMessage(finalConfirmMsg);
    } catch (err: any) {
      setSubmitError(err?.message || '주문 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 다시 작성 버튼 핸들러 (전체 초기화)
  const handleResetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setBeverage('');
    setSize('M');
    setSelectedOptions([]);
    setQuantity(1);
    setRequests('');
    setValidationAlert(null);
    setConfirmationMessage(null);
  };

  return (
    <div className="w-full max-w-[520px] mx-auto px-4 pb-12">
      {/* 주문서 카드 컨테이너 (둥근 모서리, 부드러운 그림자) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(107,66,38,0.08)] border border-[#ede1d3]">
        <h2 className="text-xl font-bold text-[#6b4226] border-b border-[#f0e4d7] pb-3 mb-5 flex items-center justify-between">
          <span>☕ 주문서 작성</span>
          <span className="text-xs font-normal text-[#8c674b]">* 필수 항목</span>
        </h2>

        {/* 유효성 검사 실패 알림 팝업/배너 */}
        {validationAlert && (
          <div 
            role="alert"
            className="mb-5 p-3 rounded-[8px] bg-[#fde8e8] border border-[#f8b4b4] text-[#c81e1e] text-sm flex items-center gap-2 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{validationAlert}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-4 text-sm text-[#3d2314]">
          {/* 1. 이름 (필수, text) */}
          <div>
            <label 
              htmlFor={nameInputId} 
              className="block font-semibold mb-1 text-[#4a2e1b]"
            >
              이름 <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              ref={nameRef}
              id={nameInputId}
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (validationAlert === '이름을 입력해주세요') setValidationAlert(null);
              }}
              placeholder="주문자 성함을 입력해주세요"
              className="cafe-input"
              required
            />
          </div>

          {/* 2. 전화번호 (tel) */}
          <div>
            <label 
              htmlFor={phoneInputId} 
              className="block font-semibold mb-1 text-[#4a2e1b]"
            >
              전화번호
            </label>
            <input
              id={phoneInputId}
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="예: 010-1234-5678"
              className="cafe-input"
            />
          </div>

          {/* 3. 음료 선택 (드롭다운) */}
          <div>
            <label 
              htmlFor={beverageSelectId} 
              className="block font-semibold mb-1 text-[#4a2e1b]"
            >
              음료 선택 <span className="text-red-500 font-bold">*</span>
            </label>
            <select
              ref={beverageRef}
              id={beverageSelectId}
              value={beverage}
              onChange={(e) => {
                setBeverage(e.target.value);
                if (validationAlert === '음료를 선택해주세요') setValidationAlert(null);
              }}
              className="cafe-input cursor-pointer"
            >
              <option value="">-- 음료를 선택해주세요 --</option>
              {BEVERAGE_MENU.map((menu) => (
                <option key={menu.id} value={menu.name}>
                  {menu.name} {menu.price.toLocaleString()}원
                </option>
              ))}
            </select>
          </div>

          {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
          <div>
            <span className="block font-semibold mb-2 text-[#4a2e1b]">
              사이즈 선택
            </span>
            <div className="flex flex-wrap items-center gap-4 py-1">
              {SIZE_OPTIONS.map((sizeOpt) => {
                const radioId = `size-option-${sizeOpt.value}`;
                return (
                  <label
                    key={sizeOpt.value}
                    htmlFor={radioId}
                    className="flex items-center gap-1.5 cursor-pointer text-sm font-medium hover:text-[#6b4226] select-none"
                  >
                    <input
                      type="radio"
                      id={radioId}
                      name="drinkSize"
                      value={sizeOpt.value}
                      checked={size === sizeOpt.value}
                      onChange={() => setSize(sizeOpt.value)}
                      className="cafe-radio"
                    />
                    <span>{sizeOpt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
          <div>
            <span className="block font-semibold mb-2 text-[#4a2e1b]">
              추가 옵션
            </span>
            <div className="flex flex-wrap items-center gap-4 py-1">
              {EXTRA_OPTIONS.map((opt) => {
                const checkboxId = `extra-option-${opt.id}`;
                return (
                  <label
                    key={opt.id}
                    htmlFor={checkboxId}
                    className="flex items-center gap-1.5 cursor-pointer text-sm font-medium hover:text-[#6b4226] select-none"
                  >
                    <input
                      type="checkbox"
                      id={checkboxId}
                      checked={selectedOptions.includes(opt.id)}
                      onChange={() => handleOptionToggle(opt.id)}
                      className="cafe-checkbox"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
          <div>
            <label 
              htmlFor={quantityInputId} 
              className="block font-semibold mb-1 text-[#4a2e1b]"
            >
              수량 (1 ~ 10잔)
            </label>
            <div className="flex items-center gap-3">
              <input
                id={quantityInputId}
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={handleQuantityChange}
                className="cafe-input max-w-[120px]"
              />
              <span className="text-xs text-[#8c674b]">
                * 1회 최대 10잔까지 주문 가능합니다.
              </span>
            </div>
          </div>

          {/* 7. 요청사항 (textarea) */}
          <div>
            <label 
              htmlFor={requestsTextareaId} 
              className="block font-semibold mb-1 text-[#4a2e1b]"
            >
              요청사항
            </label>
            <textarea
              id={requestsTextareaId}
              rows={3}
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              placeholder="예: 얼음 조금만 넣어주세요, 덜 달게 해주세요 등"
              className="cafe-input resize-none"
            />
          </div>

          {/* 8. 예상 금액 영역 (큰 글씨 24px, 갈색 #6b4226, 굵게, 가운데 정렬) */}
          <div className="pt-4 pb-2 text-center border-t border-[#f0e4d7]">
            <p className="text-xs text-[#8c674b] mb-1 font-medium">실시간 예상 결제 금액</p>
            <div className="text-[24px] font-bold text-[#6b4226] tracking-tight">
              예상 금액: {estimatedPrice.toLocaleString()}원
            </div>
            {beverage && (
              <p className="text-xs text-[#a07e66] mt-1">
                ({beverage} {size}사이즈 · {quantity}잔 선택 중)
              </p>
            )}
          </div>

          {/* 전송 오류 알림 배너 */}
          {submitError && (
            <div 
              role="alert"
              className="p-3.5 rounded-[8px] bg-[#fff1f0] border border-[#ffa39e] text-[#cf1322] text-xs flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">주문 저장 실패</span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* 9. 버튼 영역 (주문하기 & 다시 작성) */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {/* 주문하기 버튼: 갈색 배경(#6b4226), 흰색 글씨, hover시 약간 밝게 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-[#6b4226] text-white font-bold text-base rounded-[8px] hover:bg-[#7e4f30] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>주문 접수 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>주문하기</span>
                </>
              )}
            </button>

            {/* 다시 작성 버튼: 모든 입력과 금액 초기화 */}
            <button
              type="button"
              onClick={handleResetForm}
              disabled={isSubmitting}
              className="py-3 px-4 bg-[#ede2d5] text-[#5c3820] font-semibold text-sm rounded-[8px] hover:bg-[#dfd1c1] active:scale-[0.99] disabled:opacity-50 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>다시 작성</span>
            </button>
          </div>
        </form>

        {/* 10. 주문 확인 메시지 (연두색 배경, 초록 글씨, 둥근 모서리) */}
        {confirmationMessage && (
          <div 
            className="mt-6 p-4 rounded-[8px] bg-[#eef9ee] border border-[#c3e6cb] text-[#155724] text-center shadow-xs transition-all animate-fade-in"
            role="status"
          >
            <div className="flex items-center justify-center gap-2 mb-1.5 font-bold text-base text-[#1b5e20]">
              <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
              <span>주문 접수 완료</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-[#14532d]">
              {confirmationMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
