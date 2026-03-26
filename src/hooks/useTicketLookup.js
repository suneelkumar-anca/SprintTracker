import { useState, useCallback, useEffect } from "react";
import { fetchTicket } from "../services/jira/fetchTicket.js";
import { fetchPullRequests } from "../services/jira/fetchPullRequests.js";
import { fetchComments } from "../services/jira/fetchComments.js";

export function useTicketLookup() {
  const [query,           setQuery]           = useState("");
  const [ticket,          setTicket]          = useState(null);
  const [prs,             setPrs]             = useState([]);
  const [comments,        setComments]        = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [prsLoading,      setPrsLoading]      = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error,           setError]           = useState("");
  const [pendingLookup,   setPendingLookup]   = useState(null);

  const clearAll = useCallback(() => {
    setQuery(""); setTicket(null); setPrs([]); setError(""); setComments([]);
  }, []);

  const lookup = useCallback(async (id) => {
    const key = ((id ?? query) + "").trim().toUpperCase();
    if (!key) return;
    setLoading(true); setError(""); setTicket(null); setPrs([]); setComments([]);
    try {
      const t = await fetchTicket(key);
      setTicket(t); setQuery(t.id); setLoading(false);
      setPrsLoading(true);
      fetchPullRequests(t.numericId).then(setPrs).finally(() => setPrsLoading(false));
      setCommentsLoading(true);
      fetchComments(key).then(setComments).finally(() => setCommentsLoading(false));
    } catch (err) {
      setError(err.message ?? "Failed to fetch ticket."); setLoading(false);
    }
  }, [query]);

  return {
    query, setQuery, ticket, prs, comments,
    loading, prsLoading, commentsLoading, error,
    lookup, clearAll, pendingLookup, setPendingLookup,
  };
}
