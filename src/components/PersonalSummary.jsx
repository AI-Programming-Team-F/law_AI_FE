import { useEffect, useRef, useState } from "react";
import {
  getBillHappen,
  getBillProfile,
  getCachedProfile,
  getLastHappen,
} from "../api/bills";

const APPLICABILITY = {
  high: { label: "해당될 가능성 높음", className: "is-high" },
  medium: { label: "확인 필요", className: "is-medium" },
  low: { label: "해당될 가능성 낮음", className: "is-low" },
};

const CHECK = {
  match: { mark: "✓", label: "맞음" },
  mismatch: { mark: "✕", label: "맞지 않음" },
  unknown: { mark: "?", label: "확인 필요" },
};

// 통과 전이거나 폐기된 법안을 확정된 혜택으로 오해하지 않도록 처리 단계별로 안내합니다.
function stageNote({ status, stage }) {
  if (status === "REVIEW") return "아직 심사 중이라 바로 적용되지 않아요.";
  if (status === "PASSED") return "본회의를 통과했어요. 통과 과정에서 내용이 달라졌을 수 있으니 확정된 법률을 확인하세요.";
  if (status === "MERGED") return "이 법안 자체는 폐기되고 내용이 대안에 반영됐어요. 위 설명대로 적용되지 않을 수 있어요.";
  return `처리 결과는 '${stage}'예요. 이 법안이 그대로 적용되지 않을 수 있어요.`;
}

function toggleOption(list, option, multiple) {
  if (list.includes(option)) return list.filter((item) => item !== option);
  return multiple ? [...list, option] : [option];
}

function emptySelection(profile) {
  return {
    targets: [],
    criteria: profile.criteria.map(({ name }) => ({ name, selected: [] })),
  };
}

function selectedLabels(selection) {
  return [...selection.targets, ...selection.criteria.flatMap((item) => item.selected)];
}

function Chips({ label, hint, options, selected, disabled, onToggle }) {
  return (
    <div className="personal-group" role="group" aria-label={`${label} (${hint})`}>
      <p className="personal-group-title">
        {label} <span>{hint}</span>
      </p>
      <div className="personal-chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="personal-chip"
            aria-pressed={selected.includes(option)}
            disabled={disabled}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function HappenResult({ result, labels, renderStage, headlineRef, onChange }) {
  const applicability = APPLICABILITY[result.applicability];
  return (
    <div className="personal-result">
      <div className="personal-result-head">
        <span className="summary-label">
          AI 맞춤 요약{labels.length > 0 && ` · ${labels.join(" · ")}`}
        </span>
        <button type="button" className="personal-change" onClick={onChange}>
          조건 바꾸기
        </button>
      </div>
      <span className={`personal-applicability ${applicability.className}`}>
        {applicability.label}
      </span>
      <p className="personal-headline" ref={headlineRef} tabIndex={-1}>
        {result.headline}
      </p>

      {result.changes.length > 0 && (
        <table className="personal-changes">
          <caption className="sr-only">법안이 적용되면 바뀌는 것</caption>
          <thead>
            <tr>
              <th scope="col">바뀌는 것</th>
              <th scope="col">지금</th>
              <th scope="col">법안이 적용되면</th>
            </tr>
          </thead>
          <tbody>
            {result.changes.map(([item, before, after], index) => (
              <tr key={index}>
                <th scope="row">{item}</th>
                <td data-label="지금">{before}</td>
                <td data-label="법안이 적용되면" className="is-after">{after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.checks.length > 0 && (
        <ul className="personal-checks">
          {result.checks.map((check, index) => (
            <li key={index} className={`is-${check.status}`}>
              <span className="personal-check-mark" aria-hidden="true">{CHECK[check.status].mark}</span>
              <span>
                <strong>{check.condition}</strong>
                <em>{CHECK[check.status].label}</em>
                {check.reason}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="personal-evidence">
        <strong>근거가 된 원문</strong>
        {result.evidence.length ? (
          result.evidence.map((quote, index) => <blockquote key={index}>{quote}</blockquote>)
        ) : (
          <p>근거 문장을 찾지 못했어요. 제안이유 및 주요내용을 직접 확인하세요.</p>
        )}
      </div>

      <div className="personal-stage">
        <span>지금 단계</span>
        {renderStage(result.status)}
        <p>{stageNote(result)} (국회 처리 정보)</p>
      </div>
      <small>AI가 생성한 요약이며 원문과 다를 수 있습니다.</small>
      <small>법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요.</small>
    </div>
  );
}

// AI 요약 아래의 "이 법안이 적용되면?" (README 8-7)
// 버튼을 눌러야 조건을 요청하고, 조건을 고른 뒤 다시 눌러야 맞춤 요약을 요청합니다.
export default function PersonalSummary({ bill, renderStage }) {
  const billNo = bill.bill_no;
  const [state, setState] = useState(() => {
    const last = getLastHappen(billNo);
    const profile = getCachedProfile(billNo);
    return last && profile
      ? { view: "result", profile, selection: last.selection, result: last.result }
      : { view: "idle" };
  });
  const panelRef = useRef(null);
  const headlineRef = useRef(null);
  const retryRef = useRef(null);
  const moveFocus = useRef(false);

  // 버튼이 사라지는 단계에서는 새로 나타난 내용으로 키보드 포커스를 옮깁니다.
  useEffect(() => {
    if (!moveFocus.current || state.view.endsWith("loading")) return;
    moveFocus.current = false;
    const target = { picking: panelRef, result: headlineRef }[state.view] || retryRef;
    target.current?.focus();
  }, [state.view]);

  async function openPanel() {
    moveFocus.current = true;
    setState({ view: "profile-loading" });
    try {
      const profile = await getBillProfile(billNo);
      setState({ view: "picking", profile, selection: emptySelection(profile) });
    } catch (error) {
      setState({ view: "profile-error", message: error.message });
    }
  }

  async function submit() {
    const { profile, selection } = state;
    moveFocus.current = true;
    setState({ view: "happen-loading", profile, selection });
    try {
      const result = await getBillHappen(billNo, selection);
      setState({ view: "result", profile, selection, result });
    } catch (error) {
      setState({ view: "happen-error", profile, selection, message: error.message });
    }
  }

  function updateSelection(change) {
    setState((previous) => ({
      ...previous,
      view: "picking",
      message: undefined,
      selection: change(previous.selection),
    }));
  }

  if (state.view === "idle" || state.view === "profile-loading") {
    const loading = state.view === "profile-loading";
    return (
      <div className="personal-start">
        <button
          type="button"
          className="summary-button"
          onClick={openPanel}
          disabled={loading}
          aria-busy={loading}
          aria-label={`${bill.bill_name} 이 법안이 적용되면?`}
        >
          {loading ? (
            <>
              <span className="summary-spinner" aria-hidden="true" />
              조건을 찾는 중…
            </>
          ) : (
            "이 법안이 적용되면?"
          )}
        </button>
        <span className="summary-hint">조건을 고르면 생기는 변화를 알려 드려요</span>
      </div>
    );
  }

  if (state.view === "profile-error") {
    return (
      <div className="personal-start">
        <span className="summary-error" role="alert">조건을 불러오지 못했어요. {state.message}</span>
        <button ref={retryRef} type="button" className="summary-button" onClick={openPanel}>
          다시 시도
        </button>
      </div>
    );
  }

  const { profile, selection } = state;
  const labels = selectedLabels(selection);

  if (state.view === "result") {
    return (
      <HappenResult
        result={state.result}
        labels={labels}
        renderStage={renderStage}
        headlineRef={headlineRef}
        onChange={() => {
          moveFocus.current = true;
          setState({ view: "picking", profile, selection });
        }}
      />
    );
  }

  const loading = state.view === "happen-loading";
  const hasOptions = profile.targets.length > 0 || profile.criteria.length > 0;

  return (
    <div className="personal-panel">
      <h4 ref={panelRef} tabIndex={-1}>
        어떤 분 기준으로 볼까요? <span>해당하는 것만 골라도 돼요</span>
      </h4>
      {profile.targets.length > 0 && (
        <Chips
          label="이 법안에 나온 대상"
          hint="여러 개 선택 가능"
          options={profile.targets}
          selected={selection.targets}
          disabled={loading}
          onToggle={(option) => updateSelection((current) => ({
            ...current,
            targets: toggleOption(current.targets, option, true),
          }))}
        />
      )}
      {profile.criteria.map((criterion) => (
        <Chips
          key={criterion.name}
          label={criterion.name}
          hint={criterion.multiple ? "여러 개 선택 가능" : "하나만 선택"}
          options={criterion.options}
          selected={selection.criteria.find((item) => item.name === criterion.name)?.selected || []}
          disabled={loading}
          onToggle={(option) => updateSelection((current) => ({
            ...current,
            criteria: current.criteria.map((item) => (item.name === criterion.name
              ? { ...item, selected: toggleOption(item.selected, option, criterion.multiple) }
              : item)),
          }))}
        />
      ))}
      {!hasOptions && <p className="personal-empty">이 법안은 따로 고를 조건이 없어요.</p>}
      {state.view === "happen-error" && (
        <p className="summary-error" role="alert">맞춤 요약을 불러오지 못했어요. {state.message}</p>
      )}
      <div className="personal-submit">
        <p>
          {labels.length ? <>고른 조건: <strong>{labels.join(" · ")}</strong></> : "조건을 고르지 않으면 일반 기준으로 설명해요."}
        </p>
        <button
          ref={retryRef}
          type="button"
          className="button button-primary"
          onClick={submit}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="summary-spinner" aria-hidden="true" />
              만드는 중…
            </>
          ) : state.view === "happen-error" ? "다시 시도" : "맞춤 요약 보기"}
        </button>
      </div>
    </div>
  );
}
