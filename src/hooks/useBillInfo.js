import { useEffect, useRef, useState } from "react";
import { getBillInfo, getCachedBillInfo } from "../api/bills";

// 원문 링크·발의자·발의일을 카드가 화면 근처에 왔을 때만 불러옵니다.
// 반환한 ref를 카드 요소에 연결합니다.
export function useBillInfo(billNo) {
  const elementRef = useRef(null);
  const [state, setState] = useState(() => {
    const info = getCachedBillInfo(billNo);
    return info ? { status: "done", info } : { status: "loading", info: null };
  });

  useEffect(() => {
    if (getCachedBillInfo(billNo)) return undefined;
    let active = true;
    const load = () => {
      getBillInfo(billNo)
        .then((info) => { if (active) setState({ status: "done", info }); })
        .catch(() => { if (active) setState({ status: "error", info: null }); });
    };
    if (typeof IntersectionObserver === "undefined" || !elementRef.current) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "200px" });
    observer.observe(elementRef.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [billNo]);

  return [elementRef, state];
}
