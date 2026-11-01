import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
 
/** Loads `path` once (and again when `path` changes or reload() is called). */
export default function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [tick, setTick] = useState(0);
 
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(path)
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);
 
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
