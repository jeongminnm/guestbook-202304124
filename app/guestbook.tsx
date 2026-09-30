"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type GuestbookEntry = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

type EntryAction = { entryId: string; mode: "edit" | "delete" };

function characterCount(value: string): number {
  return Array.from(value).length;
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    return body.error?.message ?? "요청을 처리하지 못했습니다.";
  } catch {
    return "요청을 처리하지 못했습니다.";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Guestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [activeAction, setActiveAction] = useState<EntryAction | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [actionPassword, setActionPassword] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEntries() {
      try {
        const response = await fetch("/api/entries", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await responseError(response));
        }

        const body = (await response.json()) as {
          entries: GuestbookEntry[];
        };
        setEntries(body.entries);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "방명록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadEntries();
    return () => controller.abort();
  }, []);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (characterCount(name) < 1 || characterCount(name) > 20) {
      setNotice("이름은 1~20자로 입력해 주세요.");
      return;
    }
    if (characterCount(message) < 1 || characterCount(message) > 500) {
      setNotice("메시지는 1~500자로 입력해 주세요.");
      return;
    }
    if (characterCount(password) < 1 || characterCount(password) > 100) {
      setNotice("비밀번호는 1~100자로 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, password }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const body = (await response.json()) as { entry: GuestbookEntry };
      setEntries((current) => [body.entry, ...current]);
      setName("");
      setMessage("");
      setPassword("");
      setNotice("메시지를 남겼습니다.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "글을 저장하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAction(entry: GuestbookEntry, mode: EntryAction["mode"]) {
    setActiveAction({ entryId: entry.id, mode });
    setEditMessage(entry.message);
    setActionPassword("");
    setActionError("");
  }

  function closeAction() {
    setActiveAction(null);
    setEditMessage("");
    setActionPassword("");
    setActionError("");
  }

  async function submitEntryAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = activeAction;
    if (!action) return;

    setActionError("");
    const passwordLength = characterCount(actionPassword);
    if (passwordLength < 1 || passwordLength > 100) {
      setActionError("비밀번호는 1~100자로 입력해 주세요.");
      return;
    }
    if (
      action.mode === "edit" &&
      (characterCount(editMessage) < 1 || characterCount(editMessage) > 500)
    ) {
      setActionError("메시지는 1~500자로 입력해 주세요.");
      return;
    }

    setIsActionPending(true);
    try {
      const response = await fetch(`/api/entries/${action.entryId}`, {
        method: action.mode === "edit" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action.mode === "edit"
            ? { password: actionPassword, message: editMessage }
            : { password: actionPassword },
        ),
      });
      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      if (action.mode === "edit") {
        const body = (await response.json()) as { entry: GuestbookEntry };
        setEntries((current) =>
          current.map((entry) =>
            entry.id === body.entry.id ? body.entry : entry,
          ),
        );
        setNotice("메시지를 수정했습니다.");
      } else {
        setEntries((current) =>
          current.filter((entry) => entry.id !== action.entryId),
        );
        setNotice("글을 삭제했습니다.");
      }
      closeAction();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      );
      setActionPassword("");
    } finally {
      setIsActionPending(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="방명록 홈">
          <span className="wordmark-mark" aria-hidden="true">G</span>
          <span>GUESTBOOK</span>
        </Link>
        <p className="developer-credit">
          <span className="credit-label">DEVELOPER</span>
          임정민 <span className="student-id">202304124</span>
        </p>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow"><span /> OPEN GUESTBOOK</p>
        <h1 id="page-title">오늘의 안부를<br />남겨주세요.</h1>
        <p className="intro-copy">이름과 한 줄의 메시지로 이곳에 흔적을 남겨보세요.</p>
      </section>

      <div className="guestbook-layout">
        <section className="compose-section" aria-labelledby="compose-title">
          <div className="section-heading">
            <span className="section-number">01</span>
            <h2 id="compose-title">메시지 작성</h2>
          </div>
          <form className="compose-form" onSubmit={submitEntry}>
            <label className="field-label" htmlFor="entry-name">이름</label>
            <input
              id="entry-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름을 입력하세요"
              autoComplete="name"
              required
            />
            <div className="field-meta"><span>공개 표시 이름</span><span>{characterCount(name)} / 20</span></div>

            <label className="field-label" htmlFor="entry-message">메시지</label>
            <textarea
              id="entry-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="짧은 안부를 남겨주세요"
              rows={5}
              required
            />
            <div className="field-meta"><span>따뜻한 말 한마디</span><span>{characterCount(message)} / 500</span></div>

            <label className="field-label" htmlFor="entry-password">비밀번호</label>
            <input
              id="entry-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="수정·삭제에 사용할 비밀번호"
              autoComplete="new-password"
              required
            />
            <div className="field-meta"><span>비밀번호는 공개되지 않아요</span><span>{characterCount(password)} / 100</span></div>

            {notice && <p className="form-notice" role="status">{notice}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "메시지 남기기"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>

        <section className="entries-section" aria-labelledby="entries-title">
          <div className="section-heading entries-heading">
            <span className="section-number">02</span>
            <h2 id="entries-title">방명록</h2>
            {!isLoading && <span className="entry-count">{entries.length}개의 메시지</span>}
          </div>

          {isLoading ? (
            <p className="list-state">방명록을 불러오는 중입니다.</p>
          ) : loadError ? (
            <p className="list-state error-state" role="alert">{loadError}</p>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">✳</span>
              <p>첫 번째 메시지를 기다리고 있어요.</p>
            </div>
          ) : (
            <div className="entry-list">
              {entries.map((entry, index) => {
                const isActive = activeAction?.entryId === entry.id;

                return (
                  <article className="entry-item" key={entry.id}>
                    <div className="entry-topline">
                      <div className="entry-author">
                        <span className={`author-mark author-mark-${index % 4}`} aria-hidden="true">
                          {entry.name.slice(0, 1)}
                        </span>
                        <div>
                          <h3>{entry.name}</h3>
                          <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                        </div>
                      </div>
                      <div className="entry-actions">
                        <button type="button" disabled={isActionPending} onClick={() => openAction(entry, "edit")} aria-label={`${entry.name}님의 메시지 수정`}>
                          수정
                        </button>
                        <button className="delete-action" type="button" disabled={isActionPending} onClick={() => openAction(entry, "delete")} aria-label={`${entry.name}님의 글 삭제`}>
                          삭제
                        </button>
                      </div>
                    </div>
                    <p className="entry-message">{entry.message}</p>

                    {isActive && activeAction && (
                      <form className="entry-action-form" onSubmit={submitEntryAction}>
                        {activeAction.mode === "edit" && (
                          <>
                            <label className="field-label" htmlFor={`edit-message-${entry.id}`}>메시지 수정</label>
                            <textarea
                              id={`edit-message-${entry.id}`}
                              value={editMessage}
                              onChange={(event) => setEditMessage(event.target.value)}
                              rows={3}
                              required
                            />
                            <div className="field-meta"><span /> <span>{characterCount(editMessage)} / 500</span></div>
                          </>
                        )}
                        <label className="field-label" htmlFor={`action-password-${entry.id}`}>비밀번호</label>
                        <input
                          id={`action-password-${entry.id}`}
                          type="password"
                          value={actionPassword}
                          onChange={(event) => setActionPassword(event.target.value)}
                          autoComplete="current-password"
                          required
                        />
                        {actionError && <p className="action-error" role="alert">{actionError}</p>}
                        <div className="action-form-buttons">
                          <button className="primary-button compact-button" type="submit" disabled={isActionPending}>
                            {isActionPending ? "처리 중..." : activeAction.mode === "edit" ? "수정 저장" : "비밀번호 확인 후 삭제"}
                          </button>
                          <button className="cancel-button" type="button" onClick={closeAction} disabled={isActionPending}>취소</button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <span>GUESTBOOK</span>
        <span>임정민 · 202304124</span>
      </footer>
    </main>
  );
}