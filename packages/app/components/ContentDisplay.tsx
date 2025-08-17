import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Calendar } from 'lucide-react';

interface ContentDisplayProps {
  content: string;
  flowTitle: string;
  accessTimestamp?: number;
}

export function ContentDisplay({ content, flowTitle, accessTimestamp }: ContentDisplayProps) {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Simple markdown-like content parsing for better display
  const parseContent = (text: string) => {
    // Split content into lines for processing
    const lines = text.split('\n');
    const parsedLines: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const key = `line-${index}`;
      
      // Headers
      if (line.startsWith('# ')) {
        parsedLines.push(<h1 key={key} className="text-2xl font-semibold mt-6 mb-3 first:mt-0">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        parsedLines.push(<h2 key={key} className="text-xl font-semibold mt-5 mb-2">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        parsedLines.push(<h3 key={key} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>);
      } 
      // Code blocks
      else if (line.startsWith('```')) {
        parsedLines.push(<div key={key} className="text-xs text-muted-foreground mt-2 mb-2">```</div>);
      }
      // Lists
      else if (line.match(/^\d+\.\s/)) {
        parsedLines.push(<li key={key} className="ml-4 mb-1">{line}</li>);
      } else if (line.startsWith('- ')) {
        parsedLines.push(<li key={key} className="ml-4 mb-1 list-disc">{line.slice(2)}</li>);
      }
      // Emphasis (italic text in *text*)
      else if (line.includes('*') && !line.startsWith('*')) {
        const emphasized = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        parsedLines.push(<p key={key} className="mb-2" dangerouslySetInnerHTML={{ __html: emphasized }} />);
      }
      // Regular paragraphs
      else if (line.trim()) {
        parsedLines.push(<p key={key} className="mb-2 leading-relaxed">{line}</p>);
      }
      // Empty lines
      else {
        parsedLines.push(<div key={key} className="mb-2"></div>);
      }
    });
    
    return parsedLines;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Content: {flowTitle}</CardTitle>
          </div>
          
          {accessTimestamp && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Accessed: {formatTimestamp(accessTimestamp)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline">Decrypted</Badge>
          <Badge variant="secondary">Cached</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="prose prose-sm max-w-none">
            {parseContent(content)}
          </div>
        </ScrollArea>
        
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            ⚠️ This content is confidential and access is logged. Do not share or distribute without proper authorization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}