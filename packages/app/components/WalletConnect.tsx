import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Wallet, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface WalletConnectProps {
  onConnect: (walletType?: string) => void;
  isConnecting: boolean;
  error: string | null;
}

const SUPPORTED_WALLETS = [
  { name: 'MetaMask', logo: '🦊', id: 'metamask', popular: true },
  { name: 'WalletConnect', logo: '🔗', id: 'walletconnect', popular: false },
  { name: 'Rainbow', logo: '🌈', id: 'rainbow', popular: true },
  { name: 'Coinbase Wallet', logo: '🔵', id: 'coinbase', popular: false }
];

export function WalletConnect({ onConnect, isConnecting, error }: WalletConnectProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
      <div className="fade-in">
        <Card className="w-full max-w-md glass-card hover-lift glow">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-6 relative">
              <div className="h-16 w-16 gradient-primary rounded-2xl flex items-center justify-center animate-gradient shadow-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 h-6 w-6 bg-accent rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-2xl text-gradient">Connect Your Wallet</CardTitle>
            <CardDescription className="text-base">
              Connect your Ethereum wallet to access credential-gated content and unlock premium experiences
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="slide-up">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-3">
              {SUPPORTED_WALLETS.map((wallet, index) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className={`justify-start h-14 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    wallet.popular ? 'border-primary/30 hover:border-primary' : ''
                  } ${isConnecting ? 'animate-pulse' : ''}`}
                  onClick={() => onConnect(wallet.id)}
                  disabled={isConnecting}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="flex items-center relative z-10">
                    {isConnecting ? (
                      <div className="mr-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="mr-3 text-xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-200">
                        {wallet.logo}
                      </div>
                    )}
                    <span className="font-medium">
                      {isConnecting ? 'Connecting...' : wallet.name}
                    </span>
                  </div>
                  
                  {wallet.popular && !isConnecting && (
                    <div className="ml-auto">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Popular
                      </span>
                    </div>
                  )}
                </Button>
              ))}
            </div>
            
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Don't have a wallet?{' '}
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 font-medium hover:underline"
                >
                  Get MetaMask
                </a>
                {' '}and start your Web3 journey
              </p>
            </div>
            
            <div className="flex items-center justify-center pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                Secure & Decentralized
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}