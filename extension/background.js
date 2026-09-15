const DEFAULT_SERVER = "https://www.tasktrackerhq.app";

async function getServerUrl() {
  const data = await chrome.storage.local.get("serverUrl");
  return data.serverUrl || DEFAULT_SERVER;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-selection-task",
    title: "Add selection to TaskTrackerHQ",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "add-page-task",
    title: "Save page link to TaskTrackerHQ",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const serverUrl = await getServerUrl();
  let title = "";
  
  if (info.menuItemId === "add-selection-task" && info.selectionText) {
    title = info.selectionText.trim();
  } else if (info.menuItemId === "add-page-task" && tab) {
    title = `${tab.title || "Web Link"} (${tab.url})`;
  }

  if (!title) return;

  try {
    const res = await fetch(`${serverUrl}/api/tasks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        priority: "Medium",
        category: "Web Capture"
      })
    });

    if (res.ok) {
      chrome.action.setBadgeText({ text: "OK" });
      chrome.action.setBadgeBackgroundColor({ color: "#0f9385" });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
    } else {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#c66a09" });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
    }
  } catch (err) {
    console.error("TaskTrackerHQ context menu failed:", err);
  }
});
