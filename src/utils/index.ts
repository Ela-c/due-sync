import { getActiveOntrackTab } from "./tabs";
import { readFreshCache, writeCache } from "./cache";

export { readFreshCache, writeCache };


export type Unit = {
  id: string;
  code: string;
  name: string;
  startDate: string;
};

export type Task = {
  id: string;
  abbreviation: string;
  name: string;
  description: string;
  dueDate: string;
};

type AuthContext = {
  username: string;
  authToken: string;
};


async function executeScriptInTab<T>(injection: chrome.scripting.ScriptInjection): Promise<T> {
  const results = await new Promise<chrome.scripting.InjectionResult[]>((resolve, reject) => {
    chrome.scripting.executeScript(injection, (callbackResults) => {
      const runtime = chrome.runtime as unknown as { lastError?: { message?: string } };
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message ?? "Script injection failed."));
        return;
      }
      resolve(callbackResults ?? []);
    });
  });

  if (results.length === 0) {
    throw new Error("Script injection returned no results.");
  }

  const firstResult = results[0]?.result;
  if (typeof firstResult === "undefined") {
    throw new Error("Script injection returned undefined. The injected function may have failed before returning a value.");
  }

  return firstResult as T;
}

async function fetchAuthContext() {
  const tab = await getActiveOntrackTab();
  return executeScriptInTab<AuthContext>({
    target: { tabId: tab.id! },
    func: async () => {
      const response = await fetch("https://ontrack.deakin.edu.au/api/auth/access-token", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const data = await response.json();
      const username = String(data?.user?.username ?? "");
      const authToken = String(data?.auth_token ?? "");

      if (!username || !authToken) {
        throw new Error("OnTrack auth context is missing username or auth token.");
      }

      return {
        username,
        authToken,
      };
    },
  });
}

export async function fetchUnitsFromAuthenticatedTab() {
  const { username, authToken } = await fetchAuthContext();
  console.log("Fetched auth context:", { username, authToken });
  const tab = await getActiveOntrackTab();
  return executeScriptInTab<Unit[]>({
    target: { tabId: tab.id! },
    args: [username, authToken],
    func: (async (injectedUsername: string, injectedAuthToken: string) => {
      const response = await fetch("https://ontrack.deakin.edu.au/api/projects/?include_in_active=false", {
        credentials: "include",
        headers: {
          "username": injectedUsername,
          "auth-token": injectedAuthToken,
        },
      });

      if (!response.ok) {
        console.log("Failed to fetch units, response status:", response.status);
        throw new Error(`Failed to load units: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched units data:", data);
      return data
        .map((el: any) => {
          const unit = el.unit;
          return {
            id: String(unit.id),
            code: String(unit.code),
            name: String(unit.name),
            startDate: String(unit.start_date),
          };
        })
        .sort((a: any, b: any) => {
          const aTime = new Date(a.startDate).getTime();
          const bTime = new Date(b.startDate).getTime();
          return bTime - aTime;
        });
    }) as unknown as () => void,
  });
}

export async function fetchTasksFromAuthenticatedTab(unitId: string) {
  const { username, authToken } = await fetchAuthContext();
  const tab = await getActiveOntrackTab();
  return executeScriptInTab<Task[]>({
    target: { tabId: tab.id! },
    args: [unitId, username, authToken],
    func: (async (selectedUnitId: string, injectedUsername: string, injectedAuthToken: string) => {
      const response = await fetch(`https://ontrack.deakin.edu.au/api/units/${selectedUnitId}`, {
        credentials: "include",
        headers: {
          "username": injectedUsername,
          "auth-token": injectedAuthToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.status}`);
      }

      const data = await response.json();
      return (data.task_definitions ?? []).map((task: any) => ({
        id: String(task.id),
        abbreviation: String(task.abbreviation ?? ""),
        name: String(task.name ?? "Untitled task"),
        description: String(task.description ?? ""),
        dueDate: String(task.due_date ?? ""),
      }));
    }) as unknown as () => void,
  });
}
