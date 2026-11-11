import { useEffect, useState } from "react";

/** true after client hydration — use to gate browser-only rendering */
export function useHydrated() {
  // Must start false on both server and client so the first client render
  // matches the server HTML; flip to true only after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
