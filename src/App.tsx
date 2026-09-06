import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import UnitsList from "./components/units/units-list";
import TasksList from "./components/tasks/tasks-list";
import type { Task, Unit } from "@/utils";
import { authenticateWithTrello } from "@/utils/trello/auth";
import {
	getTrelloAuthFromStorage,
	revokeTrelloToken,
} from "@/utils/trello/token";
import {
	createTrelloCard,
	getTrelloBoards,
	getTrelloLists,
	type TrelloBoard,
	type TrelloList,
} from "@/utils/trello/api";
import trelloLogo from "@/assets/supported-softwares/trello.svg";
import notionLogo from "@/assets/supported-softwares/notion.svg";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "./components/ui/avatar";
import { getInitialsFromName } from "./lib/utils";
import { Progress, ProgressLabel } from "./components/ui/progress";

export type Step =
	| "units"
	| "tasks"
	| "software"
	| "connect"
	| "destination-setup"
	| "exporting";

type ExportSoftware = "trello" | "notion";

const SOFTWARE_OPTIONS: Array<{
	id: ExportSoftware;
	label: string;
	description: string;
	draft: boolean;
}> = [
	{
		id: "trello",
		label: "Trello",
		description: "Boards and cards",
		draft: false,
	},
	{
		id: "notion",
		label: "Notion",
		description: "Pages and databases",
		draft: true,
	},
];

function TrelloIcon() {
	return (
		<img src={trelloLogo} alt="" aria-hidden="true" className="size-5" />
	);
}

function NotionIcon() {
	return (
		<img src={notionLogo} alt="" aria-hidden="true" className="size-5" />
	);
}

function parseTaskDueDate(dueDate: string): string | null {
	if (!dueDate?.trim()) {
		return null;
	}

	const parsed = new Date(dueDate);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed.toISOString();
}

export default function App() {
	const [step, setStep] = useState<Step>("units");
	const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

	const [selectedTasks, setSelectedTasks] = useState<Set<Task>>(new Set());

	const [selectedSoftware, setSelectedSoftware] =
		useState<ExportSoftware | null>(null);

	const [error, setError] = useState<string>("");
	const [isCheckingTrelloAuth, setIsCheckingTrelloAuth] =
		useState<boolean>(false);
	const [isConnectingTrello, setIsConnectingTrello] =
		useState<boolean>(false);
	const [isTrelloConnected, setIsTrelloConnected] = useState<boolean>(false);
	const [trelloBoards, setTrelloBoards] = useState<TrelloBoard[]>([]);
	const [trelloLists, setTrelloLists] = useState<TrelloList[]>([]);
	const [isLoadingBoards, setIsLoadingBoards] = useState<boolean>(false);
	const [isLoadingLists, setIsLoadingLists] = useState<boolean>(false);
	const [selectedBoardId, setSelectedBoardId] = useState<string>("");
	const [selectedListId, setSelectedListId] = useState<string>("");

	const [exportTotal, setExportTotal] = useState<number>(0);
	const [exportCompleted, setExportCompleted] = useState<number>(0);
	const [exportCurrentTask, setExportCurrentTask] = useState<string>("");
	const [isExportingTasks, setIsExportingTasks] = useState<boolean>(false);
	const [isExportDone, setIsExportDone] = useState<boolean>(false);

	const [userInfo, setUserInfo] = useState<{
		name: string;
		avatarUrl?: string;
	} | null>(null);

	const selectedSoftwareLabel = selectedSoftware
		? (SOFTWARE_OPTIONS.find((option) => option.id === selectedSoftware)
				?.label ?? selectedSoftware)
		: "";
	const connectedUserName = userInfo?.name?.trim() || "Connected account";
	const selectedBoard =
		trelloBoards.find((board) => board.id === selectedBoardId) ?? null;
	const selectedList =
		trelloLists.find((list) => list.id === selectedListId) ?? null;
	const exportProgressPercent =
		exportTotal > 0 ? Math.round((exportCompleted / exportTotal) * 100) : 0;
	useEffect(() => {
		switch (step) {
			case "units":
				setSelectedUnit(null);
				setSelectedTasks(new Set());
				setSelectedSoftware(null);
				setIsTrelloConnected(false);
				setUserInfo(null);
				setTrelloBoards([]);
				setTrelloLists([]);
				setSelectedBoardId("");
				setSelectedListId("");
				setExportTotal(0);
				setExportCompleted(0);
				setExportCurrentTask("");
				setIsExportDone(false);
				setIsExportingTasks(false);
				break;
			case "tasks":
				setSelectedSoftware(null);
				setTrelloBoards([]);
				setTrelloLists([]);
				setSelectedBoardId("");
				setSelectedListId("");
				setExportTotal(0);
				setExportCompleted(0);
				setExportCurrentTask("");
				setIsExportDone(false);
				setIsExportingTasks(false);
				break;
			case "software":
				setTrelloBoards([]);
				setTrelloLists([]);
				setSelectedBoardId("");
				setSelectedListId("");
				setExportTotal(0);
				setExportCompleted(0);
				setExportCurrentTask("");
				setIsExportDone(false);
				setIsExportingTasks(false);
				break;
			default:
				break;
		}
	}, [step]);

	// Check if Trello is already connected when the user reaches the "connect" step
	useEffect(() => {
		if (step !== "connect" || selectedSoftware !== "trello") {
			return;
		}

		let cancelled = false;

		const checkTrelloAuth = async () => {
			try {
				setIsCheckingTrelloAuth(true);
				setError("");
				const auth = await getTrelloAuthFromStorage();
				if (cancelled) {
					return;
				}

				if (auth?.accessToken) {
					setUserInfo(
						auth.user
							? {
									name: auth.user.fullName,
									avatarUrl: auth.user.avatarUrl,
								}
							: null,
					);
					setIsTrelloConnected(true);
					setStep("destination-setup");
					return;
				}

				setIsTrelloConnected(false);
				setUserInfo(null);
			} catch (err) {
				if (cancelled) {
					return;
				}

				setError(
					err instanceof Error
						? err.message
						: "Unable to verify Trello connection.",
				);
			} finally {
				if (!cancelled) {
					setIsCheckingTrelloAuth(false);
				}
			}
		};

		void checkTrelloAuth();

		return () => {
			cancelled = true;
		};
	}, [step, selectedSoftware]);

	// Load Trello boards when entering destination setup.
	useEffect(() => {
		if (
			step !== "destination-setup" ||
			selectedSoftware !== "trello" ||
			!isTrelloConnected
		) {
			return;
		}

		let cancelled = false;

		const loadBoards = async () => {
			try {
				setError("");
				setIsLoadingBoards(true);

				const auth = await getTrelloAuthFromStorage();
				if (!auth?.accessToken) {
					throw new Error(
						"Trello token not found. Reconnect your account.",
					);
				}

				const boards = (await getTrelloBoards(auth.accessToken)).filter(
					(board) => !board.closed,
				);

				if (cancelled) {
					return;
				}

				setTrelloBoards(boards);
				setSelectedBoardId((current) => {
					if (
						current &&
						boards.some((board) => board.id === current)
					) {
						return current;
					}
					return boards[0]?.id ?? "";
				});
			} catch (err) {
				if (!cancelled) {
					setError(
						err instanceof Error
							? err.message
							: "Unable to load Trello boards.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingBoards(false);
				}
			}
		};

		void loadBoards();

		return () => {
			cancelled = true;
		};
	}, [step, selectedSoftware, isTrelloConnected]);

	// Load lists after a board is selected.
	useEffect(() => {
		if (
			step !== "destination-setup" ||
			selectedSoftware !== "trello" ||
			!selectedBoardId
		) {
			return;
		}

		let cancelled = false;

		const loadLists = async () => {
			try {
				setError("");
				setIsLoadingLists(true);

				const auth = await getTrelloAuthFromStorage();
				if (!auth?.accessToken) {
					throw new Error(
						"Trello token not found. Reconnect your account.",
					);
				}

				const lists = (
					await getTrelloLists(selectedBoardId, auth.accessToken)
				).filter((list) => !list.closed);
				const sortedLists = [...lists].sort((a, b) => a.pos - b.pos);

				if (cancelled) {
					return;
				}

				setTrelloLists(sortedLists);
				setSelectedListId((current) => {
					if (
						current &&
						sortedLists.some((list) => list.id === current)
					) {
						return current;
					}
					return sortedLists[0]?.id ?? "";
				});
			} catch (err) {
				if (!cancelled) {
					setError(
						err instanceof Error
							? err.message
							: "Unable to load Trello lists.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingLists(false);
				}
			}
		};

		void loadLists();

		return () => {
			cancelled = true;
		};
	}, [step, selectedSoftware, selectedBoardId]);

	const startExport = () => {
		if (!selectedSoftware) {
			return;
		}

		if (selectedSoftware === "trello") {
			setStep("connect");
			return;
		}

		setStep("exporting");
	};

	const exportSelectedTasksToTrello = async () => {
		try {
			if (!selectedListId) {
				throw new Error("Choose a Trello list before exporting.");
			}

			const auth = await getTrelloAuthFromStorage();
			if (!auth?.accessToken) {
				throw new Error(
					"Trello token not found. Reconnect your account.",
				);
			}

			const tasks = Array.from(selectedTasks);
			if (tasks.length === 0) {
				throw new Error("No tasks selected for export.");
			}

			setError("");
			setExportTotal(tasks.length);
			setExportCompleted(0);
			setExportCurrentTask("");
			setIsExportDone(false);
			setIsExportingTasks(true);
			setStep("exporting");

			for (const [index, task] of tasks.entries()) {
				setExportCurrentTask(task.abbreviation || task.name);
				await createTrelloCard(
					{
						name:
							task.abbreviation?.trim() && selectedUnit
								? `${selectedUnit.code}-${task.abbreviation}`
								: task.name,
						desc: [
							selectedUnit
								? `Unit: ${selectedUnit.code} - ${selectedUnit.name}`
								: "",
							`Task: ${task.name}`,
							task.description?.trim() ?? "",
						]
							.filter(Boolean)
							.join("\n\n"),
						due: parseTaskDueDate(task.dueDate),
					},
					auth.accessToken,
					selectedListId,
				);
				setExportCompleted(index + 1);
			}

			setExportCurrentTask("");
			setIsExportDone(true);
			window.setTimeout(() => {
				setStep("software");
			}, 1200);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Unable to export tasks to Trello.",
			);
			setStep("destination-setup");
		} finally {
			setIsExportingTasks(false);
		}
	};

	const connectTrello = async () => {
		try {
			setError("");
			setIsConnectingTrello(true);
			const trelloUser = await authenticateWithTrello();
			setUserInfo({
				name: trelloUser.fullName,
				avatarUrl: trelloUser.avatarUrl,
			});
			setIsTrelloConnected(true);
			setStep("destination-setup");
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Unable to connect Trello account.",
			);
		} finally {
			setIsConnectingTrello(false);
		}
	};

	const disconnectTrello = async () => {
		await revokeTrelloToken();
		setIsTrelloConnected(false);
		setUserInfo(null);
	};

	return (
		<section className="min-h-full bg-background p-3 text-left text-foreground">
			<Card className="shadow-none">
				<CardHeader className="pb-2">
					<CardTitle className="text-lg font-semibold tracking-tight text-foreground">
						DueSync
					</CardTitle>
					<CardDescription className="text-xs text-muted-foreground">
						{step === "units"
							? "Step 1/6: Choose one unit"
							: step === "tasks"
								? "Step 2/6: Choose tasks to export"
								: step === "software"
									? "Step 3/6: Select export software"
									: step === "connect"
										? `Step 4/6: Connect to ${selectedSoftwareLabel}`
										: step === "destination-setup"
											? "Step 5/6: Choose destination"
											: "Step 6/6: Export in progress"}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-3">
					{error ? (
						<div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
							{error}
						</div>
					) : null}

					<div
						className={step === "units" ? "block" : "hidden"}
						aria-hidden={step !== "units"}
					>
						<UnitsList
							setError={setError}
							setSelectedUnit={setSelectedUnit}
							setStep={setStep}
						/>
					</div>

					<div
						className={step === "tasks" ? "block" : "hidden"}
						aria-hidden={step !== "tasks"}
					>
						<TasksList
							setError={setError}
							selectedUnit={selectedUnit}
							selectedTasks={selectedTasks}
							setSelectedTasks={setSelectedTasks}
						/>
					</div>

					<div
						className={step === "software" ? "block" : "hidden"}
						aria-hidden={step !== "software"}
					>
						<>
							<div className="rounded-md border border-border bg-secondary/50 p-2 mb-2 text-xs">
								<p className="font-medium text-foreground">
									Ready to export
								</p>
								<p className="text-muted-foreground">
									{selectedTasks.size} tasks from{" "}
									{selectedUnit?.code}
								</p>
							</div>

							<div className="space-y-2">
								{SOFTWARE_OPTIONS.map((option) => {
									const isSelected =
										selectedSoftware === option.id;
									return (
										<button
											key={option.id}
											type="button"
											onClick={() =>
												setSelectedSoftware(option.id)
											}
											aria-pressed={isSelected}
											className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${
												isSelected
													? "border-primary bg-primary/5"
													: "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
											}`}
										>
											<div className="flex items-center gap-2">
												<span className="text-foreground">
													{option.id === "trello" ? (
														<TrelloIcon />
													) : (
														<NotionIcon />
													)}
												</span>
												<div>
													<p className="text-sm font-semibold text-foreground">
														{option.label}
													</p>
													<p className="text-xs text-muted-foreground">
														{option.description}
													</p>
												</div>
											</div>
											<span
												className={`size-4 rounded-full border ${
													isSelected
														? "border-primary bg-primary"
														: "border-border bg-card"
												}`}
												aria-hidden="true"
											/>
										</button>
									);
								})}
							</div>
						</>
					</div>

					<div
						className={step === "connect" ? "block" : "hidden"}
						aria-hidden={step !== "connect"}
					>
						<div className="space-y-3">
							<div className="rounded-md border border-border bg-secondary/50 p-2 text-xs">
								<p className="font-medium text-foreground">
									Connect your {selectedSoftwareLabel} account
								</p>
								<p className="text-muted-foreground">
									Authorize DueSync to read your boards and
									create cards.
								</p>
							</div>

							{isCheckingTrelloAuth ? (
								<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
									Checking existing Trello connection...
								</div>
							) : (
								<Button
									type="button"
									onClick={connectTrello}
									disabled={isConnectingTrello}
									className="w-full"
								>
									{isConnectingTrello
										? "Connecting Trello..."
										: "Connect Trello"}
								</Button>
							)}

							<div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
								Need a different account? Connect again and
								Trello will issue a new token.
							</div>
						</div>
					</div>

					<div
						className={
							step === "destination-setup" ? "block" : "hidden"
						}
						aria-hidden={step !== "destination-setup"}
					>
						<div className="space-y-3">
							<div className="rounded-md border border-border bg-secondary/50 p-2 text-xs">
								<div className="flex items-center gap-2">
									<Avatar>
										<AvatarImage
											src={userInfo?.avatarUrl}
											alt={`${connectedUserName} avatar`}
										/>
										<AvatarFallback>
											{getInitialsFromName(
												connectedUserName,
											)}
										</AvatarFallback>
										<AvatarBadge className="bg-green-600 dark:bg-green-800" />
									</Avatar>
									<div>
										<p className="font-medium text-foreground">
											Trello connected
										</p>
										<p className="text-muted-foreground">
											{connectedUserName}
										</p>
									</div>
								</div>
								<p className="mt-2 text-muted-foreground">
									Select where exported cards should be
									created.
								</p>
							</div>

							<div className="space-y-2">
								<p className="text-xs font-medium text-foreground">
									1. Choose board
								</p>
								{isLoadingBoards ? (
									<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
										Loading boards...
									</div>
								) : trelloBoards.length === 0 ? (
									<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
										No boards found in this Trello account.
									</div>
								) : (
									<div className="max-h-32 space-y-2 overflow-y-auto pr-1">
										{trelloBoards.map((board) => {
											const isSelected =
												selectedBoardId === board.id;
											return (
												<button
													key={board.id}
													type="button"
													onClick={() => {
														setSelectedBoardId(
															board.id,
														);
														setSelectedListId("");
													}}
													className={`w-full rounded-md border p-2 text-left text-xs transition-colors ${
														isSelected
															? "border-primary bg-primary/5"
															: "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
													}`}
												>
													<p className="font-medium text-foreground">
														{board.name}
													</p>
												</button>
											);
										})}
									</div>
								)}
							</div>

							<div className="space-y-2">
								<p className="text-xs font-medium text-foreground">
									2. Choose list
								</p>
								{!selectedBoardId ? (
									<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
										Choose a board first.
									</div>
								) : isLoadingLists ? (
									<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
										Loading lists...
									</div>
								) : trelloLists.length === 0 ? (
									<div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
										No open lists found in this board.
									</div>
								) : (
									<div className="max-h-32 space-y-2 overflow-y-auto pr-1">
										{trelloLists.map((list) => {
											const isSelected =
												selectedListId === list.id;
											return (
												<button
													key={list.id}
													type="button"
													onClick={() =>
														setSelectedListId(
															list.id,
														)
													}
													className={`w-full rounded-md border p-2 text-left text-xs transition-colors ${
														isSelected
															? "border-primary bg-primary/5"
															: "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
													}`}
												>
													<p className="font-medium text-foreground">
														{list.name}
													</p>
												</button>
											);
										})}
									</div>
								)}
							</div>

							{selectedBoard && selectedList ? (
								<div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
									Export target:{" "}
									<span className="font-medium text-foreground">
										{selectedBoard.name}
									</span>{" "}
									/{" "}
									<span className="font-medium text-foreground">
										{selectedList.name}
									</span>
								</div>
							) : null}
							<Button
								type="button"
								variant="outline"
								onClick={disconnectTrello}
							>
								Disconnect Trello
							</Button>
						</div>
					</div>

					{step === "exporting" ? (
						<div className="rounded-md border border-border bg-secondary/50 p-3">
							<p className="text-sm font-medium text-foreground">
								Exporting tasks to{" "}
								{selectedSoftwareLabel.toLowerCase()}...
							</p>
							<Progress
								value={exportProgressPercent}
								className="mt-2 gap-2"
							>
								<ProgressLabel className="text-xs text-muted-foreground">
									{isExportDone
										? "Completed"
										: exportCurrentTask
											? `Creating: ${exportCurrentTask}`
											: "Preparing export..."}
								</ProgressLabel>
								<span className="ml-auto text-xs text-muted-foreground tabular-nums">
									{exportCompleted}/{exportTotal}
								</span>
							</Progress>
							<p className="mt-2 text-xs text-muted-foreground">
								Please keep this popup open until all cards are
								created.
							</p>
						</div>
					) : null}
				</CardContent>

				<CardFooter className="flex justify-between gap-2">
					{step === "tasks" ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setStep("units");
								setError("");
							}}
						>
							Back to Units
						</Button>
					) : step === "software" ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setStep("tasks");
								setError("");
							}}
						>
							Back to Tasks
						</Button>
					) : step === "connect" ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setStep("software");
								setError("");
							}}
						>
							Back to Software
						</Button>
					) : step === "destination-setup" ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setStep("connect");
								setError("");
							}}
						>
							Back to Connect
						</Button>
					) : step === "exporting" ? (
						<span className="text-xs text-muted-foreground">
							{isExportDone
								? "Export completed."
								: "Exporting selected tasks..."}
						</span>
					) : (
						<span className="text-xs text-muted-foreground">
							Open OnTrack first to authenticate.
						</span>
					)}

					{step === "tasks" ? (
						<Button
							type="button"
							disabled={selectedTasks.size === 0}
							onClick={() => {
								setSelectedSoftware(null);
								setStep("software");
							}}
						>
							Continue ({selectedTasks.size})
						</Button>
					) : step === "software" ? (
						<Button
							type="button"
							disabled={!selectedSoftware}
							onClick={startExport}
						>
							Continue to Setup
						</Button>
					) : step === "destination-setup" ? (
						<Button
							type="button"
							disabled={
								!isTrelloConnected ||
								!selectedBoardId ||
								!selectedListId ||
								isExportingTasks
							}
							onClick={() => {
								if (selectedSoftware === "trello") {
									void exportSelectedTasksToTrello();
									return;
								}
								setStep("exporting");
							}}
						>
							Continue to Export
						</Button>
					) : null}
				</CardFooter>
			</Card>
		</section>
	);
}
