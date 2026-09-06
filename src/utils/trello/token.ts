export type TrelloStoredUser = {
  fullName: string;
  avatarUrl?: string;
};

type StoredAuth = {
  accessToken: string;
  createdAt: number;
  expiresAt?: number; // unix ms
  provider: "trello";
  user?: TrelloStoredUser;
};
const AUTH_KEY = "auth.trello";

function getTrelloApiKey(): string {
  const apiKey = import.meta.env.VITE_TRELLO_APP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Trello API key. Set VITE_TRELLO_APP_API_KEY in your environment.");
  }

  return apiKey;
}

export async function saveTrelloTokenToStorage(
  accessToken: string,
  expiresInSeconds?: number,
  user?: TrelloStoredUser,
): Promise<void> {
  const now = Date.now();
  const payload: StoredAuth = {
    accessToken,
    createdAt: now,
    expiresAt: expiresInSeconds ? now + expiresInSeconds * 1000 : undefined,
    provider: "trello",
    user,
  };

  await chrome.storage.local.set({ [AUTH_KEY]: payload });
}

async function getStoredAuthFromStorage(): Promise<StoredAuth | null> {
  const result = await chrome.storage.local.get(AUTH_KEY);
  const auth = result[AUTH_KEY] as StoredAuth | undefined;

  if (!auth?.accessToken) return null;

  if (auth.expiresAt && Date.now() >= auth.expiresAt) {
    await clearTrelloTokenFromStorage();
    return null;
  }

  return auth;
}

export async function getTrelloTokenFromStorage(): Promise<string | null> {
  const auth = await getStoredAuthFromStorage();
  return auth?.accessToken ?? null;
}

export async function getTrelloAuthFromStorage(): Promise<{
  accessToken: string;
  user?: TrelloStoredUser;
} | null> {
  const auth = await getStoredAuthFromStorage();
  if (!auth) {
    return null;
  }

  return {
    accessToken: auth.accessToken,
    user: auth.user,
  };
}

export async function clearTrelloTokenFromStorage(): Promise<void> {
    return chrome.storage.local.remove(AUTH_KEY);
}

export async function revokeTrelloToken(): Promise<void> {
  const token = await getTrelloTokenFromStorage();

  if (!token) {
    await clearTrelloTokenFromStorage();
    return;
  }

  try {
    const params = new URLSearchParams({
      key: getTrelloApiKey(),
      token,
    });

    const response = await fetch(
      `https://api.trello.com/1/tokens/${encodeURIComponent(token)}/?${params.toString()}`,
      {
        method: "DELETE",
      },
    );

    // Trello may return not found/unauthorized if the token is already invalid.
    if (!response.ok && response.status !== 401 && response.status !== 404) {
      throw new Error("Unable to revoke Trello token.");
    }
  } finally {
    await clearTrelloTokenFromStorage();
  }
}