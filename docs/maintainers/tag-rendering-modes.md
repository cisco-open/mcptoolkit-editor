# Tag Rendering — Design Considerations

## Context

MCP Description documents may include a `tags` array declaring valid tags for categorizing capabilities (tools, resources, resource templates, and prompts). Each capability can reference zero or more tag names via its `tags` field.

## Design Decision: Flat Tags + Filter (mcpdesc 0.7.0)

### Why flat instead of hierarchical?

The original design (mcpdesc 0.6.0) supported nested `tags` — a recursive tree structure where each tag could contain child tags. After implementation, we concluded:

1. **LLMs don't consume tag hierarchy** — MCP clients see flat `tags: [string]` on each capability. The tree structure was purely for human rendering.
2. **Two-mode toggle added UI complexity** — "By Capability" vs "By Tag" views required duplicating rendering logic for every capability type.
3. **Taxonomy burden** — Authors had to decide which tags are parents vs children, manage global uniqueness across the tree, and maintain structural consistency.

**Flat tags + interactive filtering** provides the same value (finding capabilities by topic) with far less spec and UI complexity.

### Schema change (0.6.0 → 0.7.0)

The `tag` definition no longer allows a recursive `tags` property:

```yaml
# 0.6.0 — hierarchical (removed)
tags:
- name: players
  description: Player-related capabilities
  tags:                        # ← nested children
  - name: rating
  - name: leaderboard

# 0.7.0 — flat
tags:
- name: players
  description: Player-related capabilities
- name: rating
  description: Elo ratings and statistics
- name: leaderboard
  description: Ranking leaderboards
```

## Rendering: Tag Filter Bar

When `tags` is present and non-empty, a **filter bar** renders between Security and capability sections. It displays all declared tags as clickable pills.

```
Filter: [analysis] [games] [players] [rating] [leaderboard] [reference] [openings]  clear

Tools (2 of 4)           ← filtered count
  analyze_game           [analysis]
  search_games           [games]
Resources (3 of 8)
  ...
Prompts (1 of 3)
  ...
Tags (7)                 ← always shown as reference
```

### Behavior

- **No selection** (default): All capabilities shown — filter bar is passive.
- **Click a tag**: Capabilities are filtered to those bearing that tag. Multiple tags act as OR (show items matching *any* selected tag).
- **Click again**: Deselects the tag.
- **Clear button**: Appears when any tag is selected; clears all active filters.
- **No tags declared**: Filter bar is not rendered at all.

### Implementation

- **`TagFilterBar` component**: Renders tag pills with `useState<Set<string>>` for active selection. Uses `useCallback` for toggle handler.
- **Section filtering**: `ToolsCard`, `ResourcesCard`, `PromptsCard` each accept `activeTags: Set<string>` and filter their items when the set is non-empty.
- **`TagsCard`**: Always shown at the bottom as a flat list of all declared tags with descriptions, unaffected by the filter.

## Validator Warning

The validator emits a **warning** (not an error) when a declared tag is not referenced by any capability's `tags` array. This catches stale or forgotten tags without blocking document validity.

## Future Considerations

- **Persisted filter**: The active tag filter could be saved in localStorage or URL query params.
- **Tag search**: For documents with many tags, a search/autocomplete input could complement the pill bar.
