const { toString } = require('mdast-util-to-string');

function rawMarkdownPlugin() {
  return (tree, file) => {
    const rawMarkdown = toString(tree);
    console.log('Remark plugin running for file:', file.path);
    console.log('Raw markdown length:', rawMarkdown.length);
    console.log('Raw markdown preview:', rawMarkdown.substring(0, 100) + '...');
    
    // Create a hidden div with the raw markdown content
    const hiddenDiv = {
      type: 'html',
      value: `<div id="raw-markdown-content" style="display: none;">${rawMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
    };
    
    // Add the hidden div to the end of the document
    tree.children.push(hiddenDiv);
    console.log('Added hidden div to tree');
  };
}

module.exports = rawMarkdownPlugin; 