import { useGT } from "gt-react";
import { FolderPlusIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { SidebarInput, SidebarMenuButton } from "~/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import {
  SidebarHeaderIconButton,
  type SidebarThreadHeaderProps,
} from "~/components/sidebar/SidebarThreadHeader";

/** Conductor-style sidebar nav: a "Create" row, then a Search row with the project controls trailing. */
export function ConductorSidebarNav({
  hasProjects,
  projectScope,
  onNewProject,
  onNewThread,
  newThreadDisabled,
  newThreadShortcutLabel,
  newThreadInProjectShortcutLabel,
  showNewThreadInProjectHint,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  isSearching,
  searchResultCount,
  activeSearchResultIndex,
  onClearSearch,
}: SidebarThreadHeaderProps) {
  const gt = useGT();
  const resultsVisible = isSearching && searchResultCount > 0;
  const activeResultExists = resultsVisible && activeSearchResultIndex < searchResultCount;
  const newThreadLabel = newThreadShortcutLabel
    ? gt("New thread ({shortcut})", { shortcut: newThreadShortcutLabel })
    : gt("New thread");

  return (
    <div className="flex flex-col gap-0.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton
              type="button"
              aria-label={gt("New thread")}
              disabled={newThreadDisabled}
              onClick={onNewThread}
            />
          }
        >
          <PlusIcon />
          <span className="min-w-0 flex-1 truncate font-normal text-sidebar-foreground">
            {gt("Create")}
          </span>
          {newThreadShortcutLabel ? (
            <span className="shrink-0 text-xs text-sidebar-muted-foreground">
              {newThreadShortcutLabel}
            </span>
          ) : null}
        </TooltipTrigger>
        <TooltipPopup side="right">
          {showNewThreadInProjectHint ? (
            <span className="flex flex-col gap-0.5">
              <span>{newThreadLabel}</span>
              <span className="text-muted-foreground">
                {newThreadInProjectShortcutLabel
                  ? gt("New thread in current project: Shift+click ({shortcut})", {
                      shortcut: newThreadInProjectShortcutLabel,
                    })
                  : gt("New thread in current project: Shift+click")}
              </span>
            </span>
          ) : (
            newThreadLabel
          )}
        </TooltipPopup>
      </Tooltip>
      <div className="flex items-center gap-1">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-row-hover focus-within:bg-sidebar-row-hover focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
          <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
          <SidebarInput
            ref={searchInputRef}
            nativeInput
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={gt("Search", { $context: "search field placeholder" })}
            aria-label={gt("Search threads")}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={resultsVisible}
            aria-controls={resultsVisible ? "sidebar-thread-search-results" : undefined}
            aria-activedescendant={
              activeResultExists
                ? `sidebar-thread-search-result-${activeSearchResultIndex}`
                : undefined
            }
            className="min-w-0 flex-1"
          />
          {isSearching ? (
            <Button
              type="button"
              size="icon-micro"
              variant="ghost-muted"
              className="shrink-0"
              aria-label={gt("Clear thread search")}
              onClick={() => {
                onClearSearch();
                searchInputRef.current?.focus();
              }}
            >
              <XIcon className="size-3" />
            </Button>
          ) : null}
        </div>
        {hasProjects ? (
          <div className="flex shrink-0 items-center">
            {projectScope}
            <SidebarHeaderIconButton label={gt("Add project")} onClick={onNewProject}>
              <FolderPlusIcon />
            </SidebarHeaderIconButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
