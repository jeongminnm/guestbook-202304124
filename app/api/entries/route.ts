import {
  databaseErrorResponse,
  errorResponse,
  readJsonBody,
} from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import {
  hashPassword,
  toPublicEntry,
  validateCreateEntry,
  type GuestbookRow,
} from "@/lib/guestbook";

export async function GET() {
  try {
    const sql = getDatabase();
    const rows = (await sql`
      SELECT id::text AS id, name, message, created_at
      FROM guestbook_entries
      ORDER BY created_at DESC
    `) as GuestbookRow[];

    return Response.json(
      { entries: rows.map(toPublicEntry) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return databaseErrorResponse(error, "방명록을 불러오지 못했습니다.");
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await readJsonBody(request);
  } catch {
    return errorResponse(400, "INVALID_JSON", "요청 형식을 확인해 주세요.");
  }

  const validation = validateCreateEntry(body);
  if (!validation.success) {
    return errorResponse(400, "VALIDATION_ERROR", validation.message);
  }

  try {
    const sql = getDatabase();
    const passwordHash = await hashPassword(validation.data.password);
    const rows = (await sql`
      INSERT INTO guestbook_entries (name, message, password_hash)
      VALUES (${validation.data.name}, ${validation.data.message}, ${passwordHash})
      RETURNING id::text AS id, name, message, created_at
    `) as GuestbookRow[];
    const entry = rows[0];

    if (!entry) {
      return errorResponse(500, "SERVER_ERROR", "글을 저장하지 못했습니다.");
    }

    return Response.json({ entry: toPublicEntry(entry) }, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error, "글을 저장하지 못했습니다.");
  }
}