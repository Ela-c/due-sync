import { saveTrelloTokenToStorage } from "./token";

export interface TrelloUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

// const ONE_HOUR_SECONDS = 60 * 60;

export function getTrelloApiKey(): string {
  const apiKey = import.meta.env.VITE_TRELLO_APP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Trello API key. Set VITE_TRELLO_APP_API_KEY in your environment.");
  }

  return apiKey;
}

function parseTokenFromRedirectUrl(redirectUrl: URL): string {
  // Trello returns:
  // #token=YOUR_TOKEN 
  const fragment = new URLSearchParams(redirectUrl.hash.substring(1));
  const error = fragment.get("error");
  if(error) {
    throw new Error(`Trello authentication failed: ${error}`);
  }

  const token = fragment.get("token");
  if (!token) {
    throw new Error("Trello did not return a token. Please try again.");
  }
  return token;
}

export async function authenticateWithTrello(): Promise<TrelloUser> {
  const apiKey = getTrelloApiKey();
  const returnUrl = chrome.identity.getRedirectURL("trello");

  const params = new URLSearchParams({
    key: apiKey,
    scope: "read,write",
    expiration: "1hour",
    callback_method: "fragment",
    return_url: returnUrl,
  });
  const authUrl = `https://trello.com/1/authorize?${params.toString()}`;
  const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  if (!responseUrl) {
    throw new Error("Trello authentication failed: no response URL.");
  }

  const url = new URL(responseUrl);
  const token = parseTokenFromRedirectUrl(url);

  // Verify token + get information about the user
  const user = await getTrelloUser(token);
  console.log("Trello authentication successful. User:", user);

  // save the token in chrome storage for later use
  await saveTrelloTokenToStorage(token, 60 * 60, {
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  }); // 1 hour

  return user;
}

async function getTrelloUser(
  token: string
): Promise<TrelloUser> {
  const params = new URLSearchParams({
    key: getTrelloApiKey(),
    token,
    fields: "id,username,fullName,avatarUrl",
  });

  const response = await fetch(
    `https://api.trello.com/1/members/me?${params}`
  );

  if (!response.ok) {
    throw new Error("Unable to verify Trello account.");
  }

  return response.json();
}
