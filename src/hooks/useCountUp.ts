import { useEffect, useRef, useState } from "react";

export function useCountUp(end: number, duration = 1200, startOnMount = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    if (!startOnMount || end === 0) {
      setValue(end);
      return;
    }
    setValue(0);
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = undefined;
    };
  }, [end, duration, startOnMount]);

  return value;
}

export function useCountUpCurrency(end: number, duration = 1200) {
  const val = useCountUp(end, duration);
  return `$${val.toLocaleString()}`;
}
