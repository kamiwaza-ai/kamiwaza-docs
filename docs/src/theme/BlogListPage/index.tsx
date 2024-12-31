import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function BlogListPage(props): JSX.Element {
  const items = props?.items ?? [];

  return (
    <Layout title="Blog" description="Kamiwaza Engineering Blog">
      <div style={{ 
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 24px'
      }}>
        <div style={{ padding: '32px 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '24px',
            '@media (max-width: 1200px)': {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            },
            '@media (max-width: 768px)': {
              gridTemplateColumns: 'repeat(1, minmax(0, 1fr))'
            }
          }}>
            {items.map((item: any, idx: number) => {
              const { content: BlogPostContent } = item;
              const { metadata: postMetadata, frontMatter } = BlogPostContent;
              const headerImage = frontMatter.image ? useBaseUrl(frontMatter.image) : null;
              
              return (
                <Link
                  key={idx}
                  to={postMetadata.permalink}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    maxWidth: '448px',
                    margin: '0 auto',
                    width: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease-out',
                    ':hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }
                  }}>
                    {headerImage ? (
                      <div style={{
                        aspectRatio: '16/9',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={headerImage}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        aspectRatio: '16/9',
                        backgroundColor: '#c69b7b',
                      }}/>
                    )}
                    <div style={{
                      padding: '24px'
                    }}>
                      <h2 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#1a202c',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        margin: '0 0 8px 0'
                      }}>
                        {postMetadata.title}
                      </h2>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#718096',
                        marginBottom: '8px'
                      }}>
                        {new Date(postMetadata.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })} · {Math.ceil(postMetadata.readingTime)} min read
                      </div>
                      {postMetadata.description && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#4a5568',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: 0
                        }}>
                          {postMetadata.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}