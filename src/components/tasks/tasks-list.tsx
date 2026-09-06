import {
	fetchTasksFromAuthenticatedTab,
	readFreshCache,
	writeCache,
	type Task,
	type Unit,
} from "@/utils";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";

export default function TasksList({
	setError,
	selectedUnit,
	selectedTasks,
	setSelectedTasks,
}: {
	setError: (error: string) => void;
	selectedUnit: Unit | null;
	selectedTasks: Set<Task>;
	setSelectedTasks: React.Dispatch<React.SetStateAction<Set<Task>>>;
}) {
	const selectedCount = selectedTasks.size;
	const [loadingTasks, setLoadingTasks] = useState(false);
	const [tasks, setTasks] = useState<Task[]>([]);

	const hasTaskId = (tasks: Set<Task>, taskId: string) =>
		Array.from(tasks).some((t) => t.id === taskId);

	// Remove/Add task from selectedTaskIds set
	const toggleTask = (taskId: string) => {
		setSelectedTasks((previous) => {
			const next = new Set(previous);
			if (hasTaskId(next, taskId)) {
				next.delete(Array.from(next).find((t) => t.id === taskId)!);
			} else {
				next.add(tasks.find((t) => t.id === taskId)!);
			}
			return next;
		});
	};

	const selectAllTasks = () => {
		setSelectedTasks(new Set(tasks));
	};

	const clearAllTasks = () => {
		setSelectedTasks(new Set());
	};

	const setUpTasks = async (unit: Unit) => {
		try {
			setError("");
			setLoadingTasks(true);

			// Check for cached tasks first
			const cacheKey = `authenticated-unit-tasks:${unit.id}`;
			const cachedTasks = await readFreshCache<Task[]>(cacheKey);
			if (cachedTasks) {
				setTasks(cachedTasks);
				setSelectedTasks(new Set(cachedTasks));
				return;
			}

			// Get fresh tasks and cache them
			const freshTasks = await fetchTasksFromAuthenticatedTab(unit.id);
			setTasks(freshTasks);
			setSelectedTasks(new Set(freshTasks));
			await writeCache(cacheKey, freshTasks);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to load tasks.",
			);
		} finally {
			setLoadingTasks(false);
		}
	};

	useEffect(() => {
		if (selectedUnit) {
			setUpTasks(selectedUnit);
		}
	}, [selectedUnit]);

	return (
		<>
			<div className="rounded-md border border-border bg-secondary/50 p-2 mb-2 text-xs">
				<p className="font-medium text-foreground">Selected unit</p>
				<p className="text-muted-foreground">
					{selectedUnit?.code} - {selectedUnit?.name}
				</p>
			</div>

			{loadingTasks ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton
							key={`task-skeleton-${index}`}
							className="h-12 w-full"
						/>
					))}
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
							const checked = hasTaskId(selectedTasks, task.id);
							return (
								<label
									key={task.id}
									className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2 transition-colors hover:border-primary/25 hover:bg-primary/5"
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={() => toggleTask(task.id)}
										className="mt-0.5 size-4 accent-primary"
									/>
									<div>
										<p className="text-sm font-medium">
											{task.abbreviation || task.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{task.name}
										</p>
										{task.dueDate ? (
											<p className="text-xs text-muted-foreground">
												Due: {task.dueDate}
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
	);
}
