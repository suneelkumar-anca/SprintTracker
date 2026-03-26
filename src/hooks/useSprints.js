import { useState, useEffect } from "react";
import { fetchBoardSprints } from "../services/jira/fetchSprints.js";

export function useSprints(boardId, boards) {
  const [boardSprints,       setBoardSprints]       = useState([]);
  const [sprintsLoading,     setSprintsLoading]     = useState(false);
  const [selectedBoardType,  setSelectedBoardType]  = useState("scrum");

  useEffect(() => {
    if (!boardId) {
      setBoardSprints([]);
      setSelectedBoardType("scrum");
      return;
    }
    const boardObj = boards.find((b) => String(b.id) === String(boardId));
    const bType = boardObj?.type ?? "scrum";
    setSelectedBoardType(bType);

    if (bType === "kanban") {
      setBoardSprints([]);
      return;
    }

    setSprintsLoading(true);
    setBoardSprints([]);
    fetchBoardSprints(boardId)
      .then((sprints) => { setBoardSprints(sprints); })
      .finally(() => setSprintsLoading(false));
  }, [boardId, boards]);

  return { boardSprints, sprintsLoading, selectedBoardType };
}
