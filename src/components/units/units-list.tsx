import { useState, useMemo } from "react";
import type { Step } from "@/App";
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
	fetchUnitsFromAuthenticatedTab,
	readFreshCache,
	writeCache,
	type Unit,
} from "@/utils";
import { Button } from "../ui/button";

const UNIT_PAGE_SIZE = 4;

export default function UnitsList({
	setError,
	setSelectedUnit,
	setStep,
}: {
	setError: (error: string) => void;
	setSelectedUnit: (unit: Unit) => void;
	setStep: (step: Step) => void;
}) {
	const [units, setUnits] = useState<Unit[]>([]);
	const [loadingUnits, setLoadingUnits] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const totalPages = Math.max(1, Math.ceil(units.length / UNIT_PAGE_SIZE));
	const paginatedUnits = useMemo(() => {
		const start = (currentPage - 1) * UNIT_PAGE_SIZE;
		const end = start + UNIT_PAGE_SIZE;
		return units.slice(start, end);
	}, [currentPage, units]);

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

	return (
		<>
			{!loadingUnits && units.length === 0 ? (
				<Button onClick={loadUnits} className="w-full">
					Load Units from OnTrack
				</Button>
			) : null}

			{loadingUnits ? (
				<div className="space-y-2">
					{Array.from({ length: UNIT_PAGE_SIZE }).map((_, index) => (
						<Skeleton
							key={`unit-skeleton-${index}`}
							className="h-16 w-full"
						/>
					))}
				</div>
			) : null}

			{!loadingUnits && units.length > 0 ? (
				<>
					<div className="space-y-2">
						{paginatedUnits.map((unit) => (
							<button
								key={unit.id}
								type="button"
								onClick={() => {
									setSelectedUnit(unit);
									setStep("tasks");
								}}
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
											setCurrentPage((page) =>
												Math.max(1, page - 1),
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
									const pageNumber = pageIndex + 1;
									return (
										<PaginationItem
											key={`page-${pageNumber}`}
										>
											<PaginationLink
												href="#"
												isActive={
													currentPage === pageNumber
												}
												onClick={(event) => {
													event.preventDefault();
													setCurrentPage(pageNumber);
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
											setCurrentPage((page) =>
												Math.min(totalPages, page + 1),
											);
										}}
										className={
											currentPage === totalPages
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
	);
}
