import { getTrelloApiKey } from "./auth";

export type TrelloBoard = {
    id: string;
    name: string;
    description: string;
    url: string;
    pinned: boolean;
    closed: boolean;
};

export type TrelloList = {
    id: string;
    name: string;
    closed: boolean;
    idBoard: string;
    pos: number;
    limits: {
        cards: {
            open: number;
            total: number;
        };
    };
};

export type TrelloCard = {
    id: string;
    name: string;
    desc: string;
    idList: string;
    idBoard: string;
    pos: number;
    due?: string | null;
};

export type CreateTrelloCardInput = {
    name: string;
    desc: string;
    due?: string | null;
    pos?: number;
};

// function to get list of all trello boards for the authenticated user
export async function getTrelloBoards(token: string): Promise<TrelloBoard[]> {
    const url = `https://api.trello.com/1/members/me/boards?key=${getTrelloApiKey()}&token=${token}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Failed to fetch Trello boards: unauthenticated user (invalid or expired Trello token)",
            );
        }
        throw new Error(`Failed to fetch Trello boards: ${response.status}`);
    }

    const data = await response.json();
    return data.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.desc,
        url: board.url,
        pinned: board.pinned,
        closed: board.closed,
    }));
}

// function to get list of all trello lists for a given board
export async function getTrelloLists(boardId: string, token: string): Promise<TrelloList[]> {
    const url = `https://api.trello.com/1/boards/${boardId}/lists?key=${getTrelloApiKey()}&token=${token}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                `Failed to fetch Trello lists for board ${boardId}: unauthenticated user (invalid or expired Trello token)`,
            );
        }
        throw new Error(`Failed to fetch Trello lists for board ${boardId}: ${response.status}`);
    }

    const data = await response.json();
    return data.map((list: any) => ({
        id: list.id,
        name: list.name,
        closed: list.closed,
        idBoard: list.idBoard,
        pos: list.pos,
        limits: {
            cards: {
                open: list.limits?.cards?.open ?? 0,
                total: list.limits?.cards?.total ?? 0,
            },
        },
    }));
}

// function to create a new trello card in a given list of a given board
export async function createTrelloCard(
    card: CreateTrelloCardInput,
    token: string,
    listId: string,
): Promise<TrelloCard> {
    const url = `https://api.trello.com/1/cards?key=${getTrelloApiKey()}&token=${token}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            idList: listId,
            name: card.name,
            desc: card.desc,
            due: card.due ?? null,
            pos: card.pos ?? "bottom",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create Trello card: ${response.status}`);
    }

    const data = await response.json();
    return {
        id: data.id,
        name: data.name,
        desc: data.desc,
        idList: data.idList,
        idBoard: data.idBoard,
        pos: data.pos,
        due: data.due ?? null,
    };
}
