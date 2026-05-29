# Skills Library User Guide

The Skills Library lets Kamiwaza administrators manage a shared catalog of reusable agent skills. From this app you can import skill packages, curate their metadata, control their lifecycle, and export bundles for sharing.

## Layout

The interface has three panes:

- **Sidebar** (left) — Filter by status, category, tag, or classification.
- **Skill list** (center) — Search and sort skills. Sort options: Recently Updated, Alphabetical, Category.
- **Detail panel** (right) — View and edit the selected skill.

## Importing Skills

1. Click **Add Shared Skill(s)** in the header.
2. Drag and drop a ZIP file or click to browse.
3. The app accepts both individual Agent Skills packages and Skills Library export bundles.
4. Imported skills appear as **Draft** entries.

A valid skill package contains a `SKILL.md` file with YAML frontmatter and may include `/scripts/`, `/assets/`, and `/references/` directories.

## Editing Metadata

Select a skill, then click the pencil icon to enter edit mode. Editable fields:

| Field | Description |
|-------|-------------|
| Display Name | How the skill appears in the catalog |
| Category | Functional grouping |
| Classification | Security or compliance level |
| Catalog Tags | Comma-separated searchable keywords |
| Trigger | JSON defining keyword or task-based activation |
| Inputs | JSON defining parameters the skill accepts |
| Custom Metadata | Free-form JSON for extra data |

Package contents (the imported ZIP) remain read-only. Click **Save** to persist changes.

## Lifecycle Management

Skills move through three states:

```
Draft  ──▶  Enabled  ──▶  Archived
  ▲                           │
  └───────────────────────────┘
```

- **Draft** — Imported but not visible to analysts.
- **Enabled** — Published and available in the Kaizen skill catalog.
- **Archived** — Hidden from the catalog but retained for history.

Transition a skill by clicking the status action button in the detail panel:
- Draft → **Enable**
- Enabled → **Archive**
- Archived → **Restore to Draft**

## Searching and Filtering

- The **search box** matches against name, description, category, and tags.
- The **sidebar filters** show counts for each facet and update as you refine your selection.
- Combine search text with sidebar filters to narrow results.

## Exporting Skills

1. Apply any search or filters to scope the export.
2. Click **Export** in the header.
3. A ZIP bundle downloads containing all currently visible skills.

The filename follows the pattern `skills-library-export-YYYY-MM-DD.zip`.

## Deleting Skills

Open a skill's detail panel, enter edit mode, and click **Delete**. This removes the skill from the catalog. Deletion is a soft delete — the skill is hidden, not permanently destroyed.

## Tips

- Use tags liberally to make skills easy to discover.
- Review imported trigger and input JSON before enabling a skill — these control how Kaizen activates it.
- Export regularly as a backup before making bulk changes.
- Toggle between light and dark themes using the header control.
