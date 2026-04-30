export async function fetchAllBoards() {
  // This Jira instance returns 500 for unfiltered board listing.
  // Board selection is handled via searchBoardsByName (name-param search).
  return [];
}
