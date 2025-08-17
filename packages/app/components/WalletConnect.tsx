import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Wallet, Loader2, AlertCircle, Sparkles, Cloud } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useAccount, useConnect } from 'wagmi';
import { useTinyCloud } from '../contexts/TinyCloudContext';

interface WalletConnectProps {
  onConnect: (walletType?: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function WalletConnect({ onConnect, isConnecting, error }: WalletConnectProps) {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending: isWalletConnecting } = useConnect();
  const { isConnected: isTinyCloudConnected, signIn, isConnecting: isTinyCloudConnecting, error: tinyCloudError } = useTinyCloud();

  const handleConnectWallet = async (connector: any) => {
    try {
      await connect({ connector });
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleTinyCloudSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('TinyCloud sign-in failed:', error);
    }
  };

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
            <CardTitle className="text-2xl text-gradient">
              {!isConnected ? 'Connect Your Wallet' : 'Sign in to TinyCloud'}
            </CardTitle>
            <CardDescription className="text-base">
              {!isConnected 
                ? 'Connect your Ethereum wallet to access credential-gated content'
                : 'Sign in to TinyCloud to access your credentials and encrypted content'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {(error || tinyCloudError) && (
              <Alert variant="destructive" className="slide-up">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || tinyCloudError}</AlertDescription>
              </Alert>
            )}
            
            {!isConnected ? (
              <div className="space-y-3">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  Choose your wallet to connect
                </div>
                {connectors.map((connector) => (
                  <Button
                    key={connector.uid}
                    onClick={() => handleConnectWallet(connector)}
                    disabled={isWalletConnecting}
                    variant="outline"
                    className="w-full h-14 text-base justify-start"
                  >
                    {isWalletConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-5 w-5" />
                        Connect {connector.name}
                      </>
                    )}
                  </Button>
                ))}
              </div>
            ) : !isTinyCloudConnected ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-500 mb-2">✓ Wallet Connected</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Now sign in to TinyCloud to access your credentials
                  </div>
                </div>
                
                <Button
                  onClick={handleTinyCloudSignIn}
                  disabled={isTinyCloudConnecting}
                  className="w-full h-14 text-base"
                  size="lg"
                >
                  {isTinyCloudConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in to TinyCloud...
                    </>
                  ) : (
                    <>
                      <Cloud className="mr-2 h-5 w-5" />
                      Sign in to TinyCloud
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-green-500">✓ Connected & Signed In</div>
                <div className="text-sm text-muted-foreground">
                  Redirecting to your flows...
                </div>
              </div>
            )}
            
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