import React from 'react';

interface MarkdownProps {
  children?: string;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ children }) => {
  return <div data-testid="markdown-content">{children}</div>;
};

export default Markdown;
