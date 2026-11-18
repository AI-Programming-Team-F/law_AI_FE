export default function RequestState({ title, message, loading = false, error = false, onRetry }) {
  return (
    <div className="empty-state request-state" role={error ? "alert" : "status"} aria-busy={loading}>
      {loading && <span className="summary-spinner" aria-hidden="true" />}
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {onRetry && <button type="button" className="button button-soft" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}
