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

  // Add global styles for blog post images
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .markdown img {
        width: 100%;
        height: auto;
        border-radius: 0.5rem;
      }
      
      .markdown p img {
        margin: 2rem 0;
      }
      
      .markdown p {
        position: relative;
      }
      
      .markdown p:has(> img) {
        padding: 2rem;
        margin: 2rem 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border-radius: 0.5rem;
        background: white;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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