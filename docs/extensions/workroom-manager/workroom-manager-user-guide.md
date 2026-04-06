---
title: Workroom Manager User Guide
description: Create, share, and launch analyst workrooms from the Kamiwaza platform.
---

# Workroom Manager User Guide

Workroom Manager helps analysts create focused collaboration spaces inside Kamiwaza. Each workroom keeps its own title, handling banner, labels, and membership settings, and can launch Kaizen in a separate workroom context.

## Launch Workroom Manager

Workroom Manager is available as an extension in **App Garden**.

1. Open **App Garden** in the Kamiwaza UI.
2. Locate **Workroom Manager** and click **Deploy**.
3. Review the deployment options presented by your environment.
4. Click **Deploy**.
5. Once the app is ready, click **Open App**.

When Workroom Manager runs inside Kamiwaza, it inherits platform-managed security settings such as banner text and any pre-login consent experience configured by your administrator. For related platform controls, see the [Administrator Guide](/security/admin-guide).

## Create a Workroom

When you first open Workroom Manager, create a workroom from the main library view.

### Required fields

- **Title**: A short, descriptive name for the mission, case, or analysis effort.
- **Classification / Handling Banner**: The handling marking displayed with the workroom.

### Optional fields

- **Labels**: Freeform tags that help you search and organize workrooms.
- **Description**: A brief description of the mission objective or context.

### Temporary Workroom

You can also enable **Temporary workroom** when creating the workroom.

- Temporary workrooms are intended for short-lived or field-use sessions.
- Persistent workrooms remain available until an owner removes them.

Workrooms are created with only the creator as a member. You add collaborators after creation from the workroom detail view.

## Browse and Open Workrooms

The Workroom Manager library supports a few ways to find the workroom you need:

- search by workroom name or labels
- switch between **All**, **Starred**, and **Recent**
- choose grid or list view, depending on your preference

Select a workroom to open its detail panel. The detail view shows the description, labels, membership summary, and any app launch options associated with the workroom.

## Collaboration Status

Workroom Manager surfaces collaboration status so you can tell whether a workroom currently has active participants.

You may see:

- an active-member count in the workroom library or detail view
- per-member active session counts in the membership view
- warnings when you try to remove a member who still has an active session

These indicators help owners understand whether a workroom is currently in use before they change access or remove participants.

## Launch Kaizen from a Workroom

Each workroom can open Kaizen in its own context.

1. Open the workroom detail panel.
2. In the **Apps** section, locate **Kaizen**.
3. If Kaizen has not been launched for this workroom yet, click **Launch**.
4. Wait for the deployment status to become ready.
5. Click **Open** to enter the workroom-backed Kaizen session in a new browser tab.

If your Kaizen deployment is already active, Workroom Manager shows the current deployment state in the detail panel.

Reference: [Kaizen User Guide](/extensions/kaizen/kaizen-user-guide)

## Update Workroom Settings

Owners can update workroom metadata from the settings panel.

You can edit:

- title
- labels
- classification or handling banner
- description

Owners can also delete a workroom from the same settings area. Deletion is permanent, so use it carefully.

## Share a Workroom

Open the workroom detail panel and choose **Manage Members** to control sharing.

Workroom roles are:

- **Owner**: Can update settings, manage members, and transfer ownership.
- **Contributor**: Can participate in the workroom but does not control ownership-level settings.
- **Viewer**: Read-only participant for the workroom.

Owners can:

- add members by user ID
- change member roles between `contributor` and `viewer`
- remove members
- transfer primary ownership to another member

If you remove a user who still has active sessions, the app may ask for confirmation before forcing the removal.

The membership view can also show which members currently have active workroom sessions. Use that status as a quick operational check before changing access during a live collaboration session.

## Lifecycle Notes

Keep these workroom behaviors in mind:

- temporary workrooms are designed for short-lived sessions
- persistent workrooms remain in the library until explicitly removed
- lifecycle states such as archived or deleting can temporarily disable member changes

Some deployments may limit full roster visibility for non-owners. In those environments, owners still manage sharing, while non-owners may see only summary information.

## Troubleshooting

### I cannot launch Kaizen

Check the deployment status shown in the workroom detail panel. If the app does not become ready, review platform deployment logs and telemetry in [Observability](/observability).

### I cannot add or remove members

Only workroom owners can change membership. If the workroom is in a read-only lifecycle state, member changes may also be blocked until the state clears.

If a member still has an active session, the app may require an additional confirmation step before removal.

### I cannot see the full member roster

Some environments only expose full roster details to owners. If you are not the owner, confirm whether your deployment has owner-only roster visibility.

### A workroom delete or edit failed

Retry the operation once, then check deployment logs for the Workroom Manager app and any related platform errors. Include the workroom name, approximate time of failure, and any visible error message if you escalate the issue.

## Learn More

- [Kaizen User Guide](/extensions/kaizen/kaizen-user-guide)
- [Quickstart](/quickstart)
- [Observability](/observability)
