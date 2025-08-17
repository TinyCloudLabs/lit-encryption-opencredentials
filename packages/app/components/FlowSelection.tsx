import { Flow } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Shield, Users, Building, Settings as SettingsIcon, CheckCircle, Eye, Sparkles, Zap } from 'lucide-react';

interface FlowSelectionProps {
  flows: Flow[];
  onSelectFlow: (flow: Flow) => void;
  onViewContent: (flow: Flow) => void;
  onShowSettings: () => void;
  walletAddress: string;
  onDisconnect: () => void;
}

const ACCESS_LEVEL_CONFIG = {
  basic: {
    color: 'default' as const,
    icon: Shield,
    label: 'Basic Access',
    gradient: 'from-blue-500 to-blue-600'
  },
  premium: {
    color: 'secondary' as const,
    icon: Users,
    label: 'Premium Access',
    gradient: 'from-purple-500 to-purple-600'
  },
  enterprise: {
    color: 'destructive' as const,
    icon: Building,
    label: 'Enterprise Access',
    gradient: 'from-orange-500 to-red-500'
  }
};

export function FlowSelection({ flows, onSelectFlow, onViewContent, onShowSettings, walletAddress, onDisconnect }: FlowSelectionProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isContentUnlocked = (flowId: string): boolean => {
    try {
      const cache = JSON.parse(localStorage.getItem('contentCache') || '{}');
      const walletAddress = localStorage.getItem('walletAddress');
      
      if (walletAddress && cache[walletAddress] && cache[walletAddress][flowId]) {
        const cachedItem = cache[walletAddress][flowId];
        
        // Check if cache is still valid
        return cachedItem.expiresAt > Date.now();
      }
    } catch (error) {
      console.warn('Failed to check cached content:', error);
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Header */}
      <header className="glass-card border-0 border-b backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="fade-in">
              <h1 className="text-3xl text-gradient flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                Credential Access Portal
              </h1>
              <p className="text-muted-foreground mt-1">Unlock premium content with your verifiable credentials</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 glass-card hover-lift">
                <div className="h-3 w-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-sm font-medium">{formatAddress(walletAddress)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onShowSettings} className="hover-lift">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" onClick={onDisconnect} className="hover-lift">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Flow Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow, index) => {
            const levelConfig = ACCESS_LEVEL_CONFIG[flow.accessLevel];
            const IconComponent = levelConfig.icon;
            const isUnlocked = isContentUnlocked(flow.id);

            return (
              <Card 
                key={flow.id} 
                className={`flex flex-col h-full glass-card hover-lift transition-all duration-300 group relative overflow-hidden ${
                  isUnlocked ? 'ring-2 ring-success/50 shadow-success/20' : ''
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Gradient overlay for unlocked content */}
                {isUnlocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-success/10 pointer-events-none"></div>
                )}
                
                {/* Premium gradient border */}
                <div className={`absolute inset-0 bg-gradient-to-r ${levelConfig.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`}></div>
                
                <CardHeader className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors duration-200">{flow.title}</CardTitle>
                      {isUnlocked && (
                        <Badge className="bg-gradient-to-r from-success to-success/80 text-white border-0 animate-pulse shadow-lg">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Unlocked
                        </Badge>
                      )}
                    </div>
                    <Badge variant={levelConfig.color} className={`ml-2 bg-gradient-to-r ${levelConfig.gradient} text-white border-0 shadow-md`}>
                      <IconComponent className="h-3 w-3 mr-1" />
                      {levelConfig.label}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3 text-base">
                    {flow.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between relative z-10">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-medium">{flow.credentialRequirements.length} credential{flow.credentialRequirements.length !== 1 ? 's' : ''} required</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-5 w-5 text-accent" />
                      <span className="font-medium">Est. {flow.estimatedUnlockTime}</span>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <div className="space-y-3">
                      <Button 
                        onClick={() => onViewContent(flow)}
                        className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Content
                        <Zap className="h-4 w-4 ml-2 animate-pulse" />
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => onSelectFlow(flow)}
                        className="w-full text-muted-foreground hover:text-foreground border-2 hover:border-primary/50 transition-all duration-200"
                        size="sm"
                      >
                        View Requirements
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => onSelectFlow(flow)}
                      className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 group"
                    >
                      <Shield className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                      View Requirements
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {flows.length === 0 && (
          <div className="text-center py-16 fade-in">
            <div className="glass-card p-12 max-w-md mx-auto">
              <Shield className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
              <h3 className="text-xl mb-2 text-gradient">No Flows Available</h3>
              <p className="text-muted-foreground">
                There are currently no content flows available for access. Check back soon!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}