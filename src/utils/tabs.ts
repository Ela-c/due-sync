
function isOntrackTab(tab: chrome.tabs.Tab) {
  return !!tab.url && tab.url.startsWith("https://ontrack.deakin.edu.au/");
}

export async function getActiveOntrackTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isOntrackTab(tab)) {
    throw new Error("Open an authenticated OnTrack tab, then try again.");
  }

  return tab;
}