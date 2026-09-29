<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/57a1ac97-6b3a-4317-bbcd-91e55b7cf3c8

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Configure Environment Variables in `.env`:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL (`https://your-project.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public API 키
   *(또는 앱 실행 후 우측 상단의 **[Supabase 연결하기]** 버튼을 통해 웹 화면에서 직접 입력하실 수도 있습니다.)*
3. Supabase SQL 에디터에서 테이블 생성:
   - `src/data/supabaseSql.ts`에 정의된 `cafe_menu` 테이블 생성 SQL 쿼리를 Supabase 대시보드의 **SQL Editor**에 붙여넣고 실행합니다.
4. Run the app:
   `npm run dev`

