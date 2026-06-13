import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import type {Props} from '@theme/DocVersionBanner';

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
          <Link to="/"><b>0.9.3</b></Link>.
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
          <Link to="/"><b>0.9.3</b></Link>.
        </div>
      </div>
    );
  }

  return null;
}
