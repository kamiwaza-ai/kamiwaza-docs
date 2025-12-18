import React, {type ReactNode} from 'react';
import DocsVersionDropdownNavbarItem from '@theme-original/NavbarItem/DocsVersionDropdownNavbarItem';
import type DocsVersionDropdownNavbarItemType from '@theme/NavbarItem/DocsVersionDropdownNavbarItem';
import type {WrapperProps} from '@docusaurus/types';
import {useLocation} from '@docusaurus/router';

type Props = WrapperProps<typeof DocsVersionDropdownNavbarItemType>;

export default function DocsVersionDropdownNavbarItemWrapper(props: Props): ReactNode {
  const {docsPluginId} = props;
  const {pathname} = useLocation();

  // Show main docs dropdown only on main docs pages (not /sdk or /blog)
  if (docsPluginId === 'default' && (pathname.startsWith('/sdk') || pathname.startsWith('/blog'))) {
    return null;
  }

  // Show SDK docs dropdown only on SDK pages
  if (docsPluginId === 'sdk' && !pathname.startsWith('/sdk')) {
    return null;
  }

  return (
    <>
      <DocsVersionDropdownNavbarItem {...props} />
    </>
  );
}
