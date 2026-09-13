import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {
  useActivePlugin,
  useDocsPreferredVersion,
  useDocsVersion,
  useDocVersionSuggestions,
} from '@docusaurus/plugin-content-docs/client';
import type {Props} from '@theme/DocVersionBanner';

// Link to the current GA release, resolved from Docusaurus' own version data
// (the configured `lastVersion`) instead of a hardcoded version string. This
// mirrors upstream theme-classic's DocVersionBanner: it stays correct per docs
// plugin (default/sdk/extensions/research), derives label and href from the
// same version object so they can't drift, and preserves the preferred-version
// side effect on click. See ENG-9084.
function CurrentGaReleaseLink(): React.ReactNode {
  const {pluginId} = useActivePlugin({failfast: true})!;
  const {savePreferredVersionName} = useDocsPreferredVersion(pluginId);
  const {latestDocSuggestion, latestVersionSuggestion} =
    useDocVersionSuggestions(pluginId);

  // Prefer the same doc in the latest version; fall back to its main doc.
  const getVersionMainDoc = (version: typeof latestVersionSuggestion) =>
    version.docs.find((doc) => doc.id === version.mainDocId)!;
  const target = latestDocSuggestion ?? getVersionMainDoc(latestVersionSuggestion);

  return (
    <Link
      to={target.path}
      onClick={() => savePreferredVersionName(latestVersionSuggestion.name)}>
      <b>{latestVersionSuggestion.label}</b>
    </Link>
  );
}

export default function DocVersionBanner({className}: Props): React.ReactNode {
  const versionMetadata = useDocsVersion();

  if (versionMetadata.banner === 'unreleased') {
    return (
      <div
        className={clsx(
          className,
          ThemeClassNames.docs.docVersionBanner,
          'alert alert--warning margin-bottom--md',
        )}
        role="alert">
        <div>
          This is documentation for Kamiwaza <b>{versionMetadata.label}</b>, which
          is the next release of Kamiwaza. For the current GA release, see{' '}
          <CurrentGaReleaseLink />.
        </div>
      </div>
    );
  }

  if (versionMetadata.banner === 'unmaintained') {
    return (
      <div
        className={clsx(
          className,
          ThemeClassNames.docs.docVersionBanner,
          'alert alert--secondary margin-bottom--md',
        )}
        role="alert">
        <div>
          This is documentation for Kamiwaza <b>{versionMetadata.label}</b>, which
          is no longer actively maintained. For the current GA release, see{' '}
          <CurrentGaReleaseLink />.
        </div>
      </div>
    );
  }

  return null;
}
