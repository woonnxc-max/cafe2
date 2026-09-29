import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CafeOrder, DrinkSize } from '../data/cafeData';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

/**
 * .env 또는 브라우저 로컬 스토리지에서 Supabase 연결 정보를 가져옵니다.
 */
export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_URL') || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '' : '').trim();

  const supabaseUrl = localUrl || envUrl;
  const supabaseAnonKey = localKey || envKey;

  const isConfigured = Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
    !supabaseUrl.includes('your-project')
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
  };
};

/**
 * 웹 브라우저 UI에서 직접 Supabase 설정을 저장할 수 있도록 지원합니다.
 */
export const saveSupabaseConfigToStorage = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('VITE_SUPABASE_URL', url.trim());
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', key.trim());
  }
};

/**
 * 저장된 로컬 설정을 초기화합니다.
 */
export const clearSupabaseConfigStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  }
};

// Supabase 클라이언트 싱글톤 인스턴스
let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!cachedClient || lastUsedUrl !== supabaseUrl || lastUsedKey !== supabaseAnonKey) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastUsedUrl = supabaseUrl;
    lastUsedKey = supabaseAnonKey;
  }

  return cachedClient;
};

/**
 * DB 행 데이터를 프론트엔드 CafeOrder 모델로 변환
 */
export const mapRowToOrder = (row: any): CafeOrder => {
  let formattedTime = '방금 전';
  if (row.created_at) {
    try {
      const d = new Date(row.created_at);
      formattedTime = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      formattedTime = '방금 전';
    }
  }

  return {
    id: String(row.id),
    customerName: row.customer_name || '',
    phoneNumber: row.phone_number || '',
    beverage: row.beverage || '',
    size: (row.size as DrinkSize) || 'M',
    options: Array.isArray(row.options) ? row.options : [],
    quantity: Number(row.quantity) || 1,
    requests: row.requests || '',
    totalPrice: Number(row.total_price) || 0,
    status: (row.status as '접수' | '제조중' | '완료') || '접수',
    createdAt: formattedTime,
  };
};

/**
 * Supabase에서 주문 목록 조회
 */
export const fetchOrdersFromSupabase = async (): Promise<CafeOrder[]> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 연결 설정이 되어 있지 않습니다.');
  }

  const { data, error } = await client
    .from('cafe_menu')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`주문 목록 조회 실패: ${error.message}`);
  }

  return (data || []).map(mapRowToOrder);
};

/**
 * Supabase에 새 주문 등록
 */
export const insertOrderToSupabase = async (
  order: Omit<CafeOrder, 'id' | 'createdAt'>
): Promise<CafeOrder> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 연결 설정이 되어 있지 않습니다.');
  }

  const payload = {
    customer_name: order.customerName,
    phone_number: order.phoneNumber || null,
    beverage: order.beverage,
    size: order.size,
    options: order.options || [],
    quantity: order.quantity,
    requests: order.requests || null,
    total_price: order.totalPrice,
    status: order.status || '접수',
  };

  const { data, error } = await client
    .from('cafe_menu')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`주문 등록 실패: ${error.message}`);
  }

  return mapRowToOrder(data);
};

/**
 * Supabase 주문 상태 업데이트 ('접수' | '제조중' | '완료')
 */
export const updateOrderStatusInSupabase = async (
  orderId: string,
  newStatus: '접수' | '제조중' | '완료'
): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 연결 설정이 되어 있지 않습니다.');
  }

  const numericId = Number(orderId);
  const query = !isNaN(numericId)
    ? client.from('cafe_menu').update({ status: newStatus }).eq('id', numericId)
    : client.from('cafe_menu').update({ status: newStatus }).eq('id', orderId);

  const { error } = await query;
  if (error) {
    throw new Error(`주문 상태 변경 실패: ${error.message}`);
  }
};

/**
 * Supabase 주문 삭제
 */
export const deleteOrderInSupabase = async (orderId: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 연결 설정이 되어 있지 않습니다.');
  }

  const numericId = Number(orderId);
  const query = !isNaN(numericId)
    ? client.from('cafe_menu').delete().eq('id', numericId)
    : client.from('cafe_menu').delete().eq('id', orderId);

  const { error } = await query;
  if (error) {
    throw new Error(`주문 삭제 실패: ${error.message}`);
  }
};

/**
 * Supabase 연결 및 cafe_menu 테이블 존재 여부 테스트
 */
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  rowCount?: number;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL과 Anon Key가 입력되지 않았습니다.',
    };
  }

  try {
    const { count, error } = await client
      .from('cafe_menu')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.cafe_menu" does not exist')) {
        return {
          success: false,
          message: 'Supabase에는 연결되었으나 cafe_menu 테이블이 존재하지 않습니다. 제공된 SQL 쿼리를 실행해 주세요.',
        };
      }
      return {
        success: false,
        message: `연결 오류: ${error.message} (코드: ${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      message: `성공적으로 연결되었습니다! (현재 주문 수: ${count ?? 0}건)`,
      rowCount: count ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `연결 테스트 중 예외 발생: ${err?.message || err}`,
    };
  }
};
