"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "~/components/ui/combobox";
import { loadModels, type Model, type ModelLoader } from "~/lib/mock/catalog";

interface ModelPickerProps {
	providerId: string;
	value?: string;
	onChange: (modelId: string) => void;
	onClear?: () => void;
	loader?: ModelLoader;
	disabled?: boolean;
	placeholder?: string;
}

export function ModelPicker({
	providerId,
	value,
	onChange,
	onClear,
	loader = loadModels,
	disabled = false,
	placeholder = "Search models...",
}: ModelPickerProps) {
	const [items, setItems] = useState<Model[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [nextCursor, setNextCursor] = useState<string | undefined>();
	const [hasMore, setHasMore] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	// Request tracking
	const requestIdRef = useRef(0);
	const abortControllerRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	// Find selected model object from ID
	const selectedModel = useMemo(() => {
		return items.find((m) => m.id === value) ?? null;
	}, [items, value]);

	// Fetch models
	const fetchModels = useCallback(
		async (query: string, cursor?: string) => {
			const currentRequestId = ++requestIdRef.current;

			if (!cursor) {
				abortControllerRef.current?.abort();
				abortControllerRef.current = new AbortController();
				setLoading(true);
			} else {
				setLoadingMore(true);
			}

			try {
				const result = await loader({
					providerId,
					query: query || undefined,
					cursor,
					limit: 20,
					signal: abortControllerRef.current?.signal,
				});

				if (currentRequestId !== requestIdRef.current) return;

				if (cursor) {
					setItems((prev) => [...prev, ...result.items]);
				} else {
					setItems(result.items);
				}
				setNextCursor(result.nextCursor);
				setHasMore(result.hasMore);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				console.error("Failed to load models:", error);
			} finally {
				if (currentRequestId === requestIdRef.current) {
					setLoading(false);
					setLoadingMore(false);
				}
			}
		},
		[providerId, loader],
	);

	// Reset on provider change
	// biome-ignore lint/correctness/useExhaustiveDependencies: providerId is needed to trigger reset
	useEffect(() => {
		setItems([]);
		setNextCursor(undefined);
		setHasMore(false);
		setSearchValue("");
		fetchModels("");
	}, [providerId, fetchModels]);

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			fetchModels(searchValue);
		}, 300);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [searchValue, fetchModels]);

	// Infinite scroll
	useEffect(() => {
		if (!sentinelRef.current || !hasMore || loadingMore || loading) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (
					entries[0]?.isIntersecting &&
					hasMore &&
					!loadingMore &&
					nextCursor
				) {
					fetchModels(searchValue, nextCursor);
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasMore, loadingMore, loading, nextCursor, searchValue, fetchModels]);

	// Cleanup
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	// Ensure selected item is always in the items list
	const displayItems = useMemo(() => {
		if (!value || !selectedModel) return items;
		if (!items.some((m) => m.id === value)) {
			return [selectedModel, ...items];
		}
		return items;
	}, [items, value, selectedModel]);

	// Handle selection - receives Model object, extracts ID for store
	const handleValueChange = (model: Model | null) => {
		if (model) {
			onChange(model.id); // Store only the ID
			setSearchValue(""); // Clear search on selection
		} else if (onClear) {
			onClear();
		}
	};

	// Handle input change
	const handleInputValueChange = (
		newValue: string,
		details: { reason: string },
	) => {
		if (details.reason !== "item-press") {
			setSearchValue(newValue);
		}
	};

	return (
		<Combobox
			value={selectedModel}
			onValueChange={handleValueChange}
			inputValue={searchValue}
			onInputValueChange={handleInputValueChange}
			itemToStringLabel={(model: Model) => model.name}
			itemToStringValue={(model: Model) => model.id}
			disabled={disabled}
			filter={null}
		>
			<ComboboxInput placeholder={placeholder} showClear={!!value} />
			<ComboboxContent>
				{loading ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : displayItems.length === 0 ? (
					<ComboboxEmpty>No models found.</ComboboxEmpty>
				) : (
					<ComboboxList>
						{displayItems.map((model) => (
							<ComboboxItem key={model.id} value={model}>
								<div className="flex flex-col min-w-0">
									<span className="truncate">{model.name}</span>
									{model.description && (
										<span className="text-xs text-muted-foreground truncate">
											{model.description}
										</span>
									)}
								</div>
							</ComboboxItem>
						))}
					</ComboboxList>
				)}
				{hasMore && (
					<div
						ref={sentinelRef}
						className="flex items-center justify-center py-2"
					>
						{loadingMore && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>
				)}
			</ComboboxContent>
		</Combobox>
	);
}
