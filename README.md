# 미니 방명록

Next.js App Router, TypeScript, Neon PostgreSQL로 만든 비회원 방명록입니다.

## 로컬 실행

1. Neon에서 PostgreSQL 데이터베이스를 만들고 SQL Editor에서 [`db/schema.sql`](db/schema.sql)을 실행합니다.
2. `.env.example`을 `.env.local`로 복사하고 Neon 연결 문자열을 `DATABASE_URL`에 설정합니다.
3. 의존성을 설치하고 개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. `.env.local`에는 실제 접속 정보를 두며, 저장소에 커밋하지 않습니다.

## Vercel 배포

프로젝트를 Vercel에 연결하고 Project Settings의 Environment Variables에 `DATABASE_URL`을 설정합니다. 배포 대상 Neon 데이터베이스에도 `db/schema.sql`을 한 번 실행한 뒤 배포합니다.
