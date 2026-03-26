import { useState, useEffect, useCallback } from "react";
import { fetchAllBoards } from "../services/jira/fetchBoards.js";
import { clearBoardCache } from "../services/jira/boardCache.js";

export function useBoards(configured) {
  const [boards, setBoards]             = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);

  const refreshBoards = useCallback(() => {
    if (!configured) return;
    clearBoardCache();
    setBoardsLoading(true);
    setBoards([]);
    fetchAllBoards()
      .then((list) => {
        setBoards(list);
        if (list.length === 0) {
          setTimeout(() => fetchAllBoards().then(setBoards), 1500);
        }
      })
      .finally(() => setBoardsLoading(false));
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setBoardsLoading(true);
    fetchAllBoards().then((list) => {
      if (cancelled) return;
      setBoards(list);
      if (list.length === 0) {
        setTimeout(() => { if (!cancelled) fetchAllBoards().then(setBoards); }, 1500);
      }
    }).finally(() => { if (!cancelled) setBoardsLoading(false); });
    return () => { cancelled = true; };
  }, [configured]);

  return { boards, boardsLoading, refreshBoards };
}
