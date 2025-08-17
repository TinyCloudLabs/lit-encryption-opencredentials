import { useEffect, useState } from 'react';
import { Flow } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Shield, Lock, CheckCircle, Clock } from 'lucide-react';
import { ContentDisplay } from './ContentDisplay';

interface UnlockedContentProps {
  flow: Flow;
  onBack: () => void;
  onViewRequirements: (flow: Flow) => void;
  walletAddress: string;
}

export function UnlockedContent({ flow, onBack, onViewRequirements, walletAddress }: UnlockedContentProps) {
  const [cachedContent, setCachedContent] = useState<string | null>(null);
  const [accessTimestamp, setAccessTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    // Get cached content
    const getCachedContent = (flowId: string): { content: string; timestamp: number } | null => {
      try {
        const cache = JSON.parse(localStorage.getItem('contentCache') || '{}');
        const walletAddress = localStorage.getItem('walletAddress');
        
        if (walletAddress && cache[walletAddress] && cache[walletAddress][flowId]) {
          const cachedItem = cache[walletAddress][flowId];
          
          // Check if cache is still valid
          if (cachedItem.expiresAt > Date.now()) {
            return {
              content: cachedItem.content,
              timestamp: cachedItem.timestamp
            };
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve cached content:', error);
      }
      
      return null;
    };

    const cached = getCachedContent(flow.id);
    if (cached) {
      setCachedContent(cached.content);
      setAccessTimestamp(cached.timestamp);
    }
  }, [flow.id]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!cachedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3>Content Not Available</h3>
          <p className="text-muted-foreground mb-4">
            The content for this flow is not cached or has expired.
          </p>
          <Button onClick={onBack}>Back to Flows</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flows
              </Button>
              
              <div>
                <h1>{flow.title}</h1>
                <p className="text-muted-foreground">{formatAddress(walletAddress)}</p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Content Unlocked
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Content Display */}
          <div className="lg:col-span-2">
            <ContentDisplay
              content={cachedContent}
              flowTitle={flow.title}
              accessTimestamp={accessTimestamp}
            />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Access Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Access Granted
                </CardTitle>
                <CardDescription>
                  You have successfully unlocked this content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Unlocked: {formatTimestamp(accessTimestamp)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Access Level: {flow.accessLevel}</span>
                </div>
              </CardContent>
            </Card>

            {/* Flow Info */}
            <Card>
              <CardHeader>
                <CardTitle>Content Details</CardTitle>
                <CardDescription>{flow.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>{flow.credentialRequirements.length} credentials required</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  variant="outline"
                  onClick={() => onViewRequirements(flow)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  View Requirements
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Access this flow again or view credential requirements
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}