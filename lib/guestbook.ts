import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const passwordKeyLength = 64;

export type PublicGuestbookEntry = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

type CreateEntryInput = {
  name: string;
  message: string;
  password: string;
};

type UpdateEntryInput = {
  message: string;
  password: string;
};

type DeleteEntryInput = {
  password: string;
};

type GuestbookRow = Omit<PublicGuestbookEntry, "created_at"> & {
  created_at: string | Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

function isTextWithinLength(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const length = characterCount(value);
  return length >= minimum && length <= maximum;
}

export function validateCreateEntry(
  value: unknown,
): ValidationResult<CreateEntryInput> {
  if (!isRecord(value)) {
    return { success: false, message: "입력 내용을 확인해 주세요." };
  }

  if (!isTextWithinLength(value.name, 1, 20)) {
    return { success: false, message: "이름은 1~20자로 입력해 주세요." };
  }

  if (!isTextWithinLength(value.message, 1, 500)) {
    return { success: false, message: "메시지는 1~500자로 입력해 주세요." };
  }

  if (!isTextWithinLength(value.password, 1, 100)) {
    return { success: false, message: "비밀번호는 1~100자로 입력해 주세요." };
  }

  return {
    success: true,
    data: {
      name: value.name,
      message: value.message,
      password: value.password,
    },
  };
}

export function validateUpdateEntry(
  value: unknown,
): ValidationResult<UpdateEntryInput> {
  if (!isRecord(value)) {
    return { success: false, message: "입력 내용을 확인해 주세요." };
  }

  if (!isTextWithinLength(value.message, 1, 500)) {
    return { success: false, message: "메시지는 1~500자로 입력해 주세요." };
  }

  if (!isTextWithinLength(value.password, 1, 100)) {
    return { success: false, message: "비밀번호는 1~100자로 입력해 주세요." };
  }

  return {
    success: true,
    data: { message: value.message, password: value.password },
  };
}

export function validateDeleteEntry(
  value: unknown,
): ValidationResult<DeleteEntryInput> {
  if (!isRecord(value)) {
    return { success: false, message: "입력 내용을 확인해 주세요." };
  }

  if (!isTextWithinLength(value.password, 1, 100)) {
    return { success: false, message: "비밀번호는 1~100자로 입력해 주세요." };
  }

  return { success: true, data: { password: value.password } };
}

export function isValidEntryId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, passwordKeyLength, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !saltHex ||
    !keyHex ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{128}$/i.test(keyHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = await deriveKey(password, salt);

  return timingSafeEqual(actualKey, expectedKey);
}

export function toPublicEntry(row: GuestbookRow): PublicGuestbookEntry {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export type { GuestbookRow };