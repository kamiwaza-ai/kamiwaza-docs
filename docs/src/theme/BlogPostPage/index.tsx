import React from 'react';
import clsx from 'clsx';
import {HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import TOC from '@theme/TOC';
import type {Props} from '@theme/BlogPostPage';

function BlogPostPageContent({content}: {content: Props['content']}): JSX.Element {
  const ContentComponent = content;
  const {metadata, frontMatter, toc} = content;
  
  // Format reading time
  const readingTimeText = metadata.readingTime 
    ? `${Math.ceil(metadata.readingTime)} min read`
    : null;

  return (
    <Layout
      title={metadata.title}
      description={metadata.description}>
      <div className="container">
        <div className="row">
          <div className="col col--7">
            {/* Header Section */}
            <header>
              <h1 className="text-[2.5rem] leading-[1.2] font-bold mb-4">
                {metadata.title}
              </h1>

              <div className="text-sm text-gray-600 mb-8">
                {new Date(metadata.date).toLocaleDateString()}
                {readingTimeText && (
                  <span> · {readingTimeText}</span>
                )}
              </div>

              {frontMatter.description && (
                <div className="text-lg text-gray-700 mb-8">
                  {frontMatter.description}
                </div>
              )}

              {frontMatter.image && (
                <div className="mb-12 rounded-lg overflow-hidden">
                  <img 
                    src={`/kamiwaza-docs${frontMatter.image}`}
                    alt={metadata.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
            </header>

            {/* Main Content */}
            <main className="markdown">
              <ContentComponent />
            </main>
          </div>

          {/* Table of Contents Sidebar */}
          {toc && (
            <div className="col col--3 col--offset-1">
              <div className="sticky top-4">
                <TOC toc={toc} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function BlogPostPage(props: Props): JSX.Element {
  const {content} = props;

  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogPostPage
      )}>
      <BlogPostPageContent content={content} />
    </HtmlClassNameProvider>
  );
}