import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
	fetchTasksFromAuthenticatedTab,
	fetchUnitsFromAuthenticatedTab,
	readFreshCache,
	writeCache,
	type Task,
	type Unit,
} from "@/utils";

const UNIT_PAGE_SIZE = 4;

type Step = "units" | "tasks";

export default function App() {
	const [step, setStep] = useState<Step>("units");
	const [units, setUnits] = useState<Unit[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
		new Set(),
	);
	const [loadingUnits, setLoadingUnits] = useState(false);
	const [loadingTasks, setLoadingTasks] = useState(false);
	const [error, setError] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(units.length / UNIT_PAGE_SIZE));
	const paginatedUnits = useMemo(() => {
		const start = (currentPage - 1) * UNIT_PAGE_SIZE;
		const end = start + UNIT_PAGE_SIZE;
		return units.slice(start, end);
	}, [currentPage, units]);

	const selectedCount = selectedTaskIds.size;

	const loadUnits = async () => {
		console.log("Loading units from authenticated tab...");
		try {
			setError("");
			setLoadingUnits(true);

			// Check for cached units first
			console.log("Checking for cached units...");
			const cacheKey = "authenticated-units";
			const cachedUnits = await readFreshCache<Unit[]>(cacheKey);
			if (cachedUnits) {
				console.log("Found cached units, using them.");
				setUnits(cachedUnits);
				setCurrentPage(1);
				return;
			}
			console.log("No cached units found, fetching fresh units...");
			// Get fresh units and cache them
			const freshUnits = await fetchUnitsFromAuthenticatedTab();
			setUnits(freshUnits);
			setCurrentPage(1);
			await writeCache(cacheKey, freshUnits);
			console.log(freshUnits);
			console.log("Finished loading units from authenticated tab.");
		} catch (err) {
			console.error("Error loading units:", err);
			setError(
				err instanceof Error ? err.message : "Unable to load units.",
			);
		} finally {
			setLoadingUnits(false);
		}
	};

	const goToTaskStep = async (unit: Unit) => {
		try {
			setError("");
			setLoadingTasks(true);
			setSelectedUnit(unit);

			// Check for cached tasks first
			const cacheKey = `authenticated-unit-tasks:${unit.id}`;
			const cachedTasks = await readFreshCache<Task[]>(cacheKey);
			if (cachedTasks) {
				setTasks(cachedTasks);
				setSelectedTaskIds(new Set(cachedTasks.map((task) => task.id)));
				setStep("tasks");
				return;
			}

			// Get fresh tasks and cache them
			const freshTasks = await fetchTasksFromAuthenticatedTab(unit.id);
			setTasks(freshTasks);
			setSelectedTaskIds(new Set(freshTasks.map((task) => task.id)));
			await writeCache(cacheKey, freshTasks);
			setStep("tasks");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to load tasks.",
			);
		} finally {
			setLoadingTasks(false);
		}
	};

	// Remove/Add task from selectedTaskIds set
	const toggleTask = (taskId: string) => {
		setSelectedTaskIds((previous) => {
			const next = new Set(previous);
			if (next.has(taskId)) {
				next.delete(taskId);
			} else {
				next.add(taskId);
			}
			return next;
		});
	};

	const selectAllTasks = () => {
		setSelectedTaskIds(new Set(tasks.map((task) => task.id)));
	};

	const clearAllTasks = () => {
		setSelectedTaskIds(new Set());
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
							? "Step 1/2: Choose one unit"
							: "Step 2/2: Choose tasks to export"}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-3">
					{error ? (
						<div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
							{error}
						</div>
					) : null}

					{step === "units" ? (
						<>
							{!loadingUnits && units.length === 0 ? (
								<Button onClick={loadUnits} className="w-full">
									Load Units from OnTrack
								</Button>
							) : null}

							{loadingUnits ? (
								<div className="space-y-2">
									{Array.from({ length: UNIT_PAGE_SIZE }).map(
										(_, index) => (
											<Skeleton
												key={`unit-skeleton-${index}`}
												className="h-16 w-full"
											/>
										),
									)}
								</div>
							) : null}

							{!loadingUnits && units.length > 0 ? (
								<>
									<div className="space-y-2">
										{paginatedUnits.map((unit) => (
											<button
												key={unit.id}
												type="button"
												onClick={() =>
													goToTaskStep(unit)
												}
												className="w-full rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
											>
												<p className="text-sm font-semibold text-foreground">
													{unit.code}
												</p>
												<p className="text-xs text-muted-foreground">
													{unit.name}
												</p>
											</button>
										))}
									</div>

									{totalPages > 1 ? (
										<Pagination>
											<PaginationContent>
												<PaginationItem>
													<PaginationPrevious
														href="#"
														onClick={(event) => {
															event.preventDefault();
															setCurrentPage(
																(page) =>
																	Math.max(
																		1,
																		page -
																			1,
																	),
															);
														}}
														className={
															currentPage === 1
																? "pointer-events-none opacity-50"
																: ""
														}
													/>
												</PaginationItem>

												{Array.from({
													length: totalPages,
												}).map((_, pageIndex) => {
													const pageNumber =
														pageIndex + 1;
													return (
														<PaginationItem
															key={`page-${pageNumber}`}
														>
															<PaginationLink
																href="#"
																isActive={
																	currentPage ===
																	pageNumber
																}
																onClick={(
																	event,
																) => {
																	event.preventDefault();
																	setCurrentPage(
																		pageNumber,
																	);
																}}
															>
																{pageNumber}
															</PaginationLink>
														</PaginationItem>
													);
												})}

												<PaginationItem>
													<PaginationNext
														href="#"
														onClick={(event) => {
															event.preventDefault();
															setCurrentPage(
																(page) =>
																	Math.min(
																		totalPages,
																		page +
																			1,
																	),
															);
														}}
														className={
															currentPage ===
															totalPages
																? "pointer-events-none opacity-50"
																: ""
														}
													/>
												</PaginationItem>
											</PaginationContent>
										</Pagination>
									) : null}
								</>
							) : null}
						</>
					) : null}

					{step === "tasks" ? (
						<>
							<div className="rounded-md border border-border bg-secondary/50 p-2 text-xs">
								<p className="font-medium text-foreground">
									Selected unit
								</p>
								<p className="text-muted-foreground">
									{selectedUnit?.code} - {selectedUnit?.name}
								</p>
							</div>

							{loadingTasks ? (
								<div className="space-y-2">
									{Array.from({ length: 6 }).map(
										(_, index) => (
											<Skeleton
												key={`task-skeleton-${index}`}
												className="h-12 w-full"
											/>
										),
									)}
								</div>
							) : (
								<>
									<div className="flex items-center justify-between gap-2 text-xs">
										<span
											className={
												selectedCount > 0
													? "font-medium text-accent"
													: "text-muted-foreground"
											}
										>
											{selectedCount} selected
										</span>
										<div className="flex gap-2">
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={selectAllTasks}
											>
												Select all
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={clearAllTasks}
											>
												Clear all
											</Button>
										</div>
									</div>

									<div className="max-h-52 space-y-2 overflow-y-auto pr-1">
										{tasks.map((task) => {
											const checked = selectedTaskIds.has(
												task.id,
											);
											return (
												<label
													key={task.id}
													className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2 transition-colors hover:border-primary/25 hover:bg-primary/5"
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={() =>
															toggleTask(task.id)
														}
														className="mt-0.5 size-4 accent-primary"
													/>
													<div>
														<p className="text-sm font-medium">
															{task.abbreviation ||
																task.name}
														</p>
														<p className="text-xs text-muted-foreground">
															{task.name}
														</p>
														{task.dueDate ? (
															<p className="text-xs text-muted-foreground">
																Due:{" "}
																{task.dueDate}
															</p>
														) : null}
													</div>
												</label>
											);
										})}
									</div>
								</>
							)}
						</>
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
					) : (
						<span className="text-xs text-muted-foreground">
							Open OnTrack first to authenticate.
						</span>
					)}

					{step === "tasks" ? (
						<Button
							type="button"
							disabled={selectedTaskIds.size === 0}
							onClick={() => {
								alert(
									`Ready to export ${selectedTaskIds.size} tasks.`,
								);
							}}
						>
							Continue ({selectedTaskIds.size})
						</Button>
					) : null}
				</CardFooter>
			</Card>
		</section>
	);
}
