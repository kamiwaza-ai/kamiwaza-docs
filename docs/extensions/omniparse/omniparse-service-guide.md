---
title: OmniParse Service Guide
description: Public deployment and configuration guidance for OmniParse in Kamiwaza.
---

# OmniParse Service Guide

OmniParse is the parsing and transcription extension used by Kamiwaza's context manager for
media-heavy ingestion flows. When enabled, it handles file types that need richer extraction than
the built-in document parsers can provide, especially audio, video, and image-oriented inputs.

## What It Does

OmniParse is the public-facing parsing surface behind:

- audio and video transcription routed through the context manager
- OCR- and vision-oriented extraction for supported media types
- advanced parsing flows where the caller sets `use_omniparse=true`

For DDE-specific ingestion behavior and job flow, see
[Distributed Data Engine](/data-engine).

## Supported Media Types

The current context-manager configuration includes these OmniParse-backed media extensions:

- audio: `.aac`, `.aif`, `.aiff`, `.flac`, `.m4a`, `.m4b`, `.mp3`, `.oga`, `.ogg`, `.opus`,
  `.wav`, `.wma`
- audio-from-video: `.mov`, `.mp4`, `.webm`
- images and rich documents: `.bmp`, `.docx`, `.jpeg`, `.jpg`, `.md`, `.pdf`, `.png`, `.tiff`,
  `.txt`

The exact list comes from the platform's current `omniparse_supported_file_types` setting.

## Common Configuration

These are the main public knobs that affect OmniParse behavior in the current release:

- `use_omniparse=true` enables OmniParse-backed extraction for a request or pipeline run.
- `strict_omniparse=false` allows fallback to built-in extractors where one exists instead of
  failing immediately on an OmniParse error.
- `CONTEXT_MANAGER_MAX_FILE_SIZE` controls the default decoded file-size ceiling for context-manager
  uploads. The default is `100 MB`.
- Streaming uploads use a `200 MB` ceiling by default.
- OmniParse request timeout defaults to `300` seconds.

## Operational Notes

- OmniParse is invoked by the context manager; end users typically encounter it through upload and
  ingestion workflows rather than by calling the extension directly.
- Successful transcription or extraction is still required to produce chunks. Empty transcription
  results behave like empty content for indexing.
- For extension-runtime and auth guidance, keep the developer-facing flow in
  [Developer Guide](/extensions/developer-guide) and the public workroom/session contract in
  [Workroom Runtime Contract](/workrooms/runtime-contract).
