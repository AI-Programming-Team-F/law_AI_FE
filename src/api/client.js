// 기본값 /api는 개발·preview에서 Vite 프록시로 전달됩니다.
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, code = "REQUEST_FAILED", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorMessage(body, status) {
  // AI 제공자의 인증 오류·내부 응답은 사용자에게 그대로 노출하지 않습니다.
  if (status >= 500 && body?.error?.code !== "NOT_READY") {
    return status === 502
      ? "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요."
      : "서버가 응답하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (typeof body?.error?.message === "string") return body.error.message;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) {
    const messages = body.detail.map((item) => item.msg).filter((msg) => typeof msg === "string");
    if (messages.length) return messages.join(" / ");
  }
  return ({
    400: "비교할 법안을 확인해 주세요.",
    404: "법안이 없거나 원문이 아직 준비되지 않았어요.",
    422: "요청한 검색어나 의안번호를 확인해 주세요.",
    502: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
    503: "서버가 준비 중이에요. 잠시 후 다시 시도해 주세요.",
  })[status] || `서버 요청에 실패했어요. (HTTP ${status})`;
}

export async function request(path, params = {}, { signal, timeoutMs = 90000 } = {}) {
  const query = new URLSearchParams(params);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}?${query}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(errorMessage(body, response.status), {
        status: response.status,
        code: body?.error?.code || "REQUEST_FAILED",
        details: body?.detail ?? body?.error ?? null,
      });
    }
    if (body === null) throw new ApiError("서버 응답 형식을 확인하지 못했어요.", { code: "INVALID_RESPONSE" });
    return body;
  } catch (error) {
    if (timedOut) throw new ApiError("응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.", { code: "TIMEOUT" });
    if (signal?.aborted || error.name === "AbortError") throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError("서버에 연결하지 못했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
