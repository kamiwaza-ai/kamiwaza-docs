import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {
  useActivePlugin,
  useDocsVersion,
  useDocsPreferredVersion,
  useDocVersionSuggestions,
} from '@docusaurus/plugin-content-docs/client';
import type {Props} from '@theme/DocVersionBanner';

// The GA/"latest" version label is resolved dynamically from the active docs
// plugin's version metadata (ultimately `docs/package.json` via
// docusaurus.config.ts). Do not hardcode a version string here — earlier
// version-bump PRs repeatedly forgot to update a literal, publishing a stale
// "current GA release" link.
export default function DocVersionBanner({className}: Props): React.ReactNode {
  const versionMetadata = useDocsVersion();

  // No banner for the current/latest version.
  if (!versionMetadata.banner) {
    return null;
  }

  const {pluginId} = useActivePlugin({failfast: true});
  const {savePreferredVersionName} = useDocsPreferredVersion(pluginId);
  const {latestDocSuggestion, latestVersionSuggestion} =
    useDocVersionSuggestions(pluginId);

  const getVersionMainDoc = (version: typeof latestVersionSuggestion) =>
    version.docs.find((doc) => doc.id === version.mainDocId);
  // Prefer linking to the same doc in the latest version; fall back to its main
  // doc. Either can be missing (e.g. a doc dropped between versions), so guard
  // rather than assert — a missing target degrades to a plain label instead of
  // crashing the banner render.
  const latestVersionSuggestedDoc =
    latestDocSuggestion ?? getVersionMainDoc(latestVersionSuggestion);

  const gaLabel = <b>{latestVersionSuggestion.label}</b>;
  const gaLink = latestVersionSuggestedDoc ? (
    <Link
      to={latestVersionSuggestedDoc.path}
      onClick={() => savePreferredVersionName(latestVersionSuggestion.name)}>
      {gaLabel}
    </Link>
  ) : (
    gaLabel
  );

  const isUnreleased = versionMetadata.banner === 'unreleased';

  return (
    <div
      className={clsx(
        className,
        ThemeClassNames.docs.docVersionBanner,
        isUnreleased
          ? 'alert alert--warning margin-bottom--md'
          : 'alert alert--secondary margin-bottom--md',
      )}
      role="alert">
      <div>
        This is documentation for Kamiwaza <b>{versionMetadata.label}</b>,{' '}
        {isUnreleased
          ? 'which is the next release of Kamiwaza.'
          : 'which is no longer actively maintained.'}{' '}
        For the current GA release, see {gaLink}.
      </div>
    </div>
  );
}
