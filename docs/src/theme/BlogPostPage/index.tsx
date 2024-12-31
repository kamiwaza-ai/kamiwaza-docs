import React from 'react';
import clsx from 'clsx';
import {HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import {useBlogPost} from '@docusaurus/theme-common/internal';
import BlogLayout from '@theme/BlogLayout';
import BlogPostItem from '@theme/BlogPostItem';
import BlogPostPaginator from '@theme/BlogPostPaginator';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {Props} from '@theme/BlogPostPage';

function BlogPostPageContent({sidebar, children}: Props): JSX.Element {
  const {metadata, frontMatter} = useBlogPost();
  const headerImage = frontMatter.image ? useBaseUrl(frontMatter.image) : null;

  return (
    <BlogLayout
      sidebar={sidebar}
      toc={metadata.toc}>
      
      {headerImage && (
        <div style={{
          marginBottom: '2rem',
          borderRadius: '12px',
          overflow: 'hidden',
          maxWidth: '1200px',
          margin: '0 auto 2rem auto'
        }}>
          <img
            src={headerImage}
            alt=""
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <BlogPostItem>{children}</BlogPostItem>

      {(metadata.nextItem || metadata.prevItem) && (
        <BlogPostPaginator
          nextItem={metadata.nextItem}
          prevItem={metadata.prevItem}
        />
      )}
    </BlogLayout>
  );
}

export default function BlogPostPage(props: Props): JSX.Element {
  const BlogPostContent = props.content;
  
  return (
    <div className={clsx('blog-post-page')}>
      <BlogPostPageContent {...props}>
        <BlogPostContent />
      </BlogPostPageContent>
    </div>
  );
}