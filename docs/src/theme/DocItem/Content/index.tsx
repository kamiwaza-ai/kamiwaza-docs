import React from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof ContentType>;

const htmlToMarkdown = (element: Element): string => {
  let result = '';
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join('');
    
    switch (tagName) {
      case 'h1':
        return `# ${children}\n\n`;
      case 'h2':
        return `## ${children}\n\n`;
      case 'h3':
        return `### ${children}\n\n`;
      case 'h4':
        return `#### ${children}\n\n`;
      case 'h5':
        return `##### ${children}\n\n`;
      case 'h6':
        return `###### ${children}\n\n`;
      case 'p':
        return `${children}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'code':
        return `\`${children}\``;
      case 'pre':
        return `\`\`\`\n${children}\n\`\`\`\n\n`;
      case 'blockquote':
        return `> ${children}\n\n`;
      case 'ul':
        return `${children}\n`;
      case 'ol':
        return `${children}\n`;
      case 'li':
        const listMarker = el.parentElement?.tagName.toLowerCase() === 'ol' ? '1. ' : '- ';
        return `${listMarker}${children}\n`;
      case 'a':
        const href = el.getAttribute('href') || '';
        return href ? `[${children}](${href})` : children;
      case 'img':
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      case 'hr':
        return '---\n\n';
      case 'table':
        return `${children}\n`;
      case 'thead':
      case 'tbody':
        return children;
      case 'tr':
        return `${children}\n`;
      case 'th':
      case 'td':
        return `| ${children} `;
      case 'div':
      case 'span':
      case 'section':
      case 'article':
      case 'main':
        return children;
      default:
        return children;
    }
  };
  
  result = processNode(element);
  
  // Clean up excessive newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
};

const CopyButton = () => {
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isVeryNarrow = windowWidth < 480; // Phone screens
  const isNarrow = windowWidth < 768; // Tablet and smaller

  const getButtonPosition = () => {
    if (isVeryNarrow) {
      return { top: '-100px', right: '8px' };
    } else if (isNarrow) {
      return { top: '-90px', right: '8px' };
    } else {
      return { top: '-86px', right: '0px' };
    }
  };

  const buttonPosition = getButtonPosition();

  const handleCopy = () => {
    // Try to find the main content area, but exclude navigation and other UI elements
    const contentArea = document.querySelector('article .markdown') || 
                       document.querySelector('article') || 
                       document.querySelector('main .markdown') ||
                       document.querySelector('main') || 
                       document.querySelector('[role="main"]');
    
    if (contentArea) {
      // Clone the element to avoid modifying the original
      const clonedContent = contentArea.cloneNode(true) as Element;
      
      // Remove navigation elements, buttons, and other UI components
      const elementsToRemove = [
        '.pagination-nav',
        '.theme-edit-this-page',
        '.theme-last-updated',
        '.theme-toc',
        '.breadcrumbs',
        'nav',
        'button',
        '.theme-doc-version-badge',
        '.theme-doc-version-banner'
      ];
      
      elementsToRemove.forEach(selector => {
        const elements = clonedContent.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      const markdownContent = htmlToMarkdown(clonedContent);
      
      if (markdownContent) {
        navigator.clipboard.writeText(markdownContent)
          .then(() => {
            // Show success feedback
            const button = document.querySelector('button') as HTMLButtonElement;
            if (button) {
              const originalText = button.textContent;
              button.textContent = 'Copied!';
              button.style.backgroundColor = '#d4edda';
              button.style.borderColor = '#c3e6cb';
              button.style.color = '#155724';
              setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '#f5f5f5';
                button.style.borderColor = '#ddd';
                button.style.color = '';
              }, 1500);
            }
          })
          .catch((err) => {
            console.error('Failed to copy to clipboard:', err);
          });
      }
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: buttonPosition.top,
        right: buttonPosition.right,
        zIndex: 100,
        backgroundColor: 'transparent',
        border: '1px solid var(--ifm-color-emphasis-200, #e1e4e8)',
        borderRadius: '6px',
        padding: isVeryNarrow ? '4px 8px' : '6px 12px',
        cursor: 'pointer',
        fontSize: isVeryNarrow ? '12px' : '13px',
        fontWeight: '500',
        color: 'var(--ifm-color-content-secondary, #656d76)',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: isVeryNarrow ? '4px' : '6px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--ifm-color-emphasis-100, #f6f8fa)';
        e.currentTarget.style.borderColor = 'var(--ifm-color-emphasis-300, #d0d7de)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'var(--ifm-color-emphasis-200, #e1e4e8)';
      }}
    >
      <svg
        width={isVeryNarrow ? "12" : "14"}
        height={isVeryNarrow ? "12" : "14"}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      {isVeryNarrow ? 'Copy' : 'Copy page'}
    </button>
  );
};

export default function ContentWrapper(props: Props): JSX.Element {
  return (
    <div style={{ position: 'relative', paddingTop: '16px' }}>
      <CopyButton />
      <Content {...props} />
    </div>
  );
}
