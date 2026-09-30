import {
  databaseErrorResponse,
  errorResponse,
  readJsonBody,
} from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import {
  isValidEntryId,
  toPublicEntry,
  validateDeleteEntry,
  validateUpdateEntry,
  verifyPassword,
  type GuestbookRow,
} from "@/lib/guestbook";

type EntryRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: EntryRouteContext) {
  const { id } = await context.params;
  if (!isValidEntryId(id)) {
    return errorResponse(400, "INVALID_ID", "글 식별자를 확인해 주세요.");
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return errorResponse(400, "INVALID_JSON", "요청 형식을 확인해 주세요.");
  }

  const validation = validateUpdateEntry(body);
  if (!validation.success) {
    return errorResponse(400, "VALIDATION_ERROR", validation.message);
  }

  try {
    const sql = getDatabase();
    const storedRows = (await sql`
      SELECT password_hash
      FROM guestbook_entries
      WHERE id = ${id}::uuid
    `) as { password_hash: string }[];
    const storedEntry = storedRows[0];

    if (!storedEntry) {
      return errorResponse(404, "NOT_FOUND", "글을 찾을 수 없습니다.");
    }

    if (!(await verifyPassword(validation.data.password, storedEntry.password_hash))) {
      return errorResponse(403, "INVALID_PASSWORD", "비밀번호가 올바르지 않습니다.");
    }

    const updatedRows = (await sql`
      UPDATE guestbook_entries
      SET message = ${validation.data.message}
      WHERE id = ${id}::uuid
      RETURNING id::text AS id, name, message, created_at
    `) as GuestbookRow[];
    const updatedEntry = updatedRows[0];

    if (!updatedEntry) {
      return errorResponse(404, "NOT_FOUND", "글을 찾을 수 없습니다.");
    }

    return Response.json({ entry: toPublicEntry(updatedEntry) });
  } catch (error) {
    return databaseErrorResponse(error, "메시지를 수정하지 못했습니다.");
  }
}

export async function DELETE(request: Request, context: EntryRouteContext) {
  const { id } = await context.params;
  if (!isValidEntryId(id)) {
    return errorResponse(400, "INVALID_ID", "글 식별자를 확인해 주세요.");
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return errorResponse(400, "INVALID_JSON", "요청 형식을 확인해 주세요.");
  }

  const validation = validateDeleteEntry(body);
  if (!validation.success) {
    return errorResponse(400, "VALIDATION_ERROR", validation.message);
  }

  try {
    const sql = getDatabase();
    const storedRows = (await sql`
      SELECT password_hash
      FROM guestbook_entries
      WHERE id = ${id}::uuid
    `) as { password_hash: string }[];
    const storedEntry = storedRows[0];

    if (!storedEntry) {
      return errorResponse(404, "NOT_FOUND", "글을 찾을 수 없습니다.");
    }

    if (!(await verifyPassword(validation.data.password, storedEntry.password_hash))) {
      return errorResponse(403, "INVALID_PASSWORD", "비밀번호가 올바르지 않습니다.");
    }

    const deletedRows = (await sql`
      DELETE FROM guestbook_entries
      WHERE id = ${id}::uuid
      RETURNING id
    `) as { id: string }[];

    if (deletedRows.length === 0) {
      return errorResponse(404, "NOT_FOUND", "글을 찾을 수 없습니다.");
    }

    return Response.json({ ok: true });
  } catch (error) {
    return databaseErrorResponse(error, "글을 삭제하지 못했습니다.");
  }
}