import { DatabaseConfigurationError } from "@/lib/db";

export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function databaseErrorResponse(
  error: unknown,
  message: string,
): Response {
  if (error instanceof DatabaseConfigurationError) {
    return errorResponse(
      503,
      "DATABASE_NOT_CONFIGURED",
      "DATABASE_URL 환경변수를 설정해 주세요.",
    );
  }

  return errorResponse(500, "SERVER_ERROR", message);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}