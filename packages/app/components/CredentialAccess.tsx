import { useState, useEffect, useMemo } from 'react';
import { Flow, Credential, AppSettings } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Lock, ChevronDown, ChevronUp, Eye, EyeOff, Clock, User, Building2, Zap } from 'lucide-react';
import { CredentialItem } from './CredentialItem';
import { AccessProgress } from './AccessProgress';
import { useCredentials } from '../hooks/useCredentials';
import { useContentAccess } from '../hooks/useContentAccess';

interface CredentialAccessProps {
  flow: Flow;
  onBack: () => void;
  onContentSuccess: (flow: Flow) => void;
  walletAddress: string;
  signMessage: (message: string) => Promise<string>;
  settings: AppSettings;
}

export function CredentialAccess({ flow, onBack, onContentSuccess, walletAddress, signMessage, settings }: CredentialAccessProps) {
  const { credentials, loading: credentialsLoading, validateSelectedCredentials } = useCredentials();
  const { 
    accessSteps, 
    decryptedContent, 
    isAccessing, 
    error: accessError,
    accessContent,
    getCachedContent,
    resetAccess,
    retryCurrentStep
  } = useContentAccess(signMessage);
  
  const [selectedCredentialIds, setSelectedCredentialIds] = useState<string[]>([]);
  const [showInvalidCredentials, setShowInvalidCredentials] = useState(false);

  // Check for cached content on mount
  useEffect(() => {
    const cachedContent = getCachedContent(flow.id);
    if (cachedContent) {
      // Show cached content - could add a "refresh" option
    }
  }, [flow.id, getCachedContent]);

  // Auto-select credentials if enabled in settings
  useEffect(() => {
    if (settings.autoSelectCredentials && credentials.length > 0 && selectedCredentialIds.length === 0) {
      const autoSelected: string[] = [];
      
      flow.credentialRequirements.forEach(requirement => {
        const match = credentials.find(cred =>
          cred.parsed.issuer === requirement.issuer &&
          cred.parsed.type.find(t => t !== 'VerifiableCredential') === requirement.credentialType &&
          cred.verified &&
          Object.entries(requirement.claims).every(([key, value]) => {
            // Check in credentialSubject
            if (cred.parsed.credentialSubject?.[key] === value) return true;
            // Check in evidence
            if (cred.parsed.evidence?.[key] === value) return true;
            return false;
          })
        );
        
        if (match && !autoSelected.includes(match.id)) {
          autoSelected.push(match.id);
        }
      });
      
      if (autoSelected.length > 0) {
        setSelectedCredentialIds(autoSelected);
      }
    }
  }, [credentials, flow.credentialRequirements, settings.autoSelectCredentials, selectedCredentialIds.length]);

  // Navigate to content page when content is successfully unlocked
  useEffect(() => {
    if (decryptedContent && !isAccessing && !accessError) {
      onContentSuccess(flow);
    }
  }, [decryptedContent, isAccessing, accessError, flow, onContentSuccess]);

  // Validate current selection
  const validation = useMemo(() => {
    return validateSelectedCredentials(selectedCredentialIds, flow.credentialRequirements);
  }, [selectedCredentialIds, flow.credentialRequirements, validateSelectedCredentials]);

  // Categorize credentials
  const { matchingCredentials, otherCredentials } = useMemo(() => {
    const matching: Credential[] = [];
    const other: Credential[] = [];
    
    credentials.forEach(credential => {
      const isMatching = flow.credentialRequirements.some(requirement => {
        // Check issuer
        if (credential.parsed.issuer !== requirement.issuer) return false;
        
        // Check credential type
        const credentialType = credential.parsed.type.find(t => t !== 'VerifiableCredential');
        if (credentialType !== requirement.credentialType) return false;
        
        // Check claims
        return Object.entries(requirement.claims).every(([key, value]) => {
          // Check in credentialSubject first
          if (credential.parsed.credentialSubject?.[key] === value) return true;
          // Then check in evidence
          if (credential.parsed.evidence?.[key] === value) return true;
          return false;
        });
      });
      
      if (isMatching) {
        matching.push(credential);
      } else {
        other.push(credential);
      }
    });
    
    return { matchingCredentials: matching, otherCredentials: other };
  }, [credentials, flow.credentialRequirements]);

  const handleCredentialSelection = (credentialId: string, selected: boolean) => {
    setSelectedCredentialIds(prev =>
      selected
        ? [...prev, credentialId]
        : prev.filter(id => id !== credentialId)
    );
  };

  const handleAccessContent = async () => {
    await accessContent(flow, selectedCredentialIds);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'basic':
        return User;
      case 'premium':
        return Shield;
      case 'enterprise':
        return Building2;
      default:
        return Shield;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'basic':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'premium':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'enterprise':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (credentialsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="text-center fade-in">
          <div className="relative mb-8">
            <div className="animate-spin h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full mx-auto glow"></div>
            <div className="absolute inset-0 animate-ping h-16 w-16 border-4 border-primary/40 rounded-full mx-auto"></div>
          </div>
          <h2 className="text-xl text-gradient mb-2">Loading Your Credentials</h2>
          <p className="text-muted-foreground">Fetching your verifiable credentials...</p>
        </div>
      </div>
    );
  }

  const AccessLevelIcon = getAccessLevelIcon(flow.accessLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Enhanced Header with Breadcrumbs */}
      <header className="glass-card border-0 border-b backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="hover-lift shrink-0">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flows
              </Button>
              
              {/* Breadcrumb Navigation */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span>Flows</span>
                <span>/</span>
                <span className="text-foreground font-medium truncate max-w-48">{flow.title}</span>
                <span>/</span>
                <span className="text-primary">Access Requirements</span>
              </div>
            </div>
            
            {/* Status and Requirements */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 glass-card text-sm">
                <div className="h-2 w-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{formatAddress(walletAddress)}</span>
              </div>
              <Badge className={`${getAccessLevelColor(flow.accessLevel)} font-medium border-2`}>
                <AccessLevelIcon className="h-3 w-3 mr-1" />
                {flow.credentialRequirements.length} credentials required
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Better Responsive Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-4 fade-in">
          {/* Content Overview - Full Width on Mobile */}
          <div className="lg:col-span-3 space-y-8">
            {/* Enhanced Hero Section */}
            <div className="relative overflow-hidden glass-card hover-lift transition-all duration-300 border-2 border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"></div>
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gradient mb-3">{flow.title}</h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">{flow.description}</p>
                  </div>
                  <div className="ml-6 shrink-0">
                    <div className={`h-20 w-20 rounded-2xl ${getAccessLevelColor(flow.accessLevel)} flex items-center justify-center shadow-lg`}>
                      <AccessLevelIcon className="h-10 w-10" />
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Info Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white/50 rounded-xl border border-white/20 backdrop-blur-sm">
                    <div className="h-10 w-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                      <AccessLevelIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Access Level</p>
                      <p className="font-bold capitalize">{flow.accessLevel}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-white/50 rounded-xl border border-white/20 backdrop-blur-sm">
                    <div className="h-10 w-10 bg-gradient-to-r from-accent to-accent/80 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Unlock Time</p>
                      <p className="font-bold">{flow.estimatedUnlockTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Requirements Section */}
            <Card className="glass-card hover-lift transition-all duration-300 border-2 border-success/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-r from-success to-success/80 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Requirements Checklist</CardTitle>
                      <CardDescription className="text-base">
                        {validation.isValid ? 'All requirements met!' : `${flow.credentialRequirements.length - validation.missingRequirements.length}/${flow.credentialRequirements.length} requirements satisfied`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${validation.isValid ? 'text-success' : 'text-warning'}`}>
                      {Math.round(((flow.credentialRequirements.length - validation.missingRequirements.length) / flow.credentialRequirements.length) * 100)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flow.credentialRequirements.map((requirement, index) => {
                    const isMissing = validation.missingRequirements.some(req => 
                      req.issuer === requirement.issuer && 
                      req.credentialType === requirement.credentialType
                    );
                    
                    return (
                      <div key={index} className={`relative p-5 rounded-2xl border-2 transition-all duration-200 ${
                        isMissing 
                          ? 'border-warning/30 bg-warning/5 hover:border-warning/50' 
                          : 'border-success/30 bg-success/5 hover:border-success/50'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isMissing 
                              ? 'bg-warning/20 text-warning' 
                              : 'bg-success/20 text-success'
                          }`}>
                            {isMissing ? (
                              <AlertTriangle className="h-6 w-6" />
                            ) : (
                              <CheckCircle className="h-6 w-6" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg text-foreground">{requirement.credentialType}</h4>
                              <Badge className={`text-xs ${
                                isMissing 
                                  ? 'bg-warning/20 text-warning border-warning/30' 
                                  : 'bg-success/20 text-success border-success/30'
                              }`}>
                                {isMissing ? 'Missing' : 'Available'}
                              </Badge>
                            </div>
                            
                            <p className="text-muted-foreground mb-3">
                              from <span className="font-medium text-foreground">{requirement.issuer.replace('did:web:', '')}</span>
                            </p>
                            
                            {Object.entries(requirement.claims).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(requirement.claims).map(([key, value]) => (
                                  <span key={key} className="text-xs bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-full border">
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Credential Selection */}
            <Card className="glass-card hover-lift transition-all duration-300 border-2 border-primary/20">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Select Your Credentials</CardTitle>
                    <CardDescription className="text-base">
                      Choose the credentials you want to present for access
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Auto-selection notice */}
                {settings.autoSelectCredentials && selectedCredentialIds.length > 0 && (
                  <Alert className="bg-success/10 border-success/30 border-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-success/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <AlertDescription className="text-success-foreground font-medium">
                          Auto-Selection Enabled
                        </AlertDescription>
                        <p className="text-sm text-success/80 mt-1">
                          Compatible credentials have been automatically selected. You can modify the selection below.
                        </p>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Compatible Credentials */}
                {matchingCredentials.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-3 w-3 bg-gradient-to-r from-success to-success/80 rounded-full animate-pulse shadow-lg"></div>
                      <h3 className="text-lg font-bold text-success">Compatible Credentials</h3>
                      <Badge className="bg-success/20 text-success border-success/30">
                        {matchingCredentials.length} available
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {matchingCredentials.map(credential => (
                        <CredentialItem
                          key={credential.id}
                          credential={credential}
                          isSelected={selectedCredentialIds.includes(credential.id)}
                          onSelectionChange={handleCredentialSelection}
                          isRequired={flow.credentialRequirements.some(req => {
                            const credentialType = credential.parsed.type.find(t => t !== 'VerifiableCredential');
                            return req.issuer === credential.parsed.issuer &&
                                   req.credentialType === credentialType;
                          })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Credentials - Enhanced Collapsible */}
                {otherCredentials.length > 0 && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        onClick={() => setShowInvalidCredentials(!showInvalidCredentials)}
                        className="w-full justify-between p-6 h-auto glass-card hover-lift transition-all duration-300 group border-2 border-muted/20 hover:border-muted/40"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            showInvalidCredentials ? 'bg-muted/50 rotate-12' : 'bg-muted/30'
                          }`}>
                            {showInvalidCredentials ? (
                              <EyeOff className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Eye className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-muted-foreground group-hover:text-foreground transition-colors text-lg">
                              Other Credentials ({otherCredentials.length})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {showInvalidCredentials ? 'Hide' : 'Show'} credentials not compatible with this flow
                            </p>
                          </div>
                        </div>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          showInvalidCredentials ? 'bg-muted/50 rotate-180 scale-110' : 'bg-muted/30'
                        }`}>
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Button>
                    </div>

                    {/* Enhanced Collapsible Content */}
                    {showInvalidCredentials && (
                      <div className="space-y-4 slide-up">
                        <div className="pl-8 border-l-4 border-gradient-to-b border-muted/30 space-y-3">
                          {otherCredentials.map(credential => (
                            <CredentialItem
                              key={credential.id}
                              credential={credential}
                              isSelected={selectedCredentialIds.includes(credential.id)}
                              onSelectionChange={handleCredentialSelection}
                              disabled={true}
                            />
                          ))}
                        </div>
                        <div className="pl-8">
                          <Alert className="border-muted/30 bg-muted/10 backdrop-blur-sm border-2">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                              <div>
                                <AlertDescription className="font-medium text-muted-foreground">
                                  Incompatible Credentials
                                </AlertDescription>
                                <p className="text-sm text-muted-foreground/80 mt-1">
                                  These credentials don't match the requirements for this content flow and cannot be used for access.
                                </p>
                              </div>
                            </div>
                          </Alert>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {credentials.length === 0 && (
                  <div className="text-center py-12">
                    <div className="glass-card p-8 max-w-md mx-auto border-2 border-muted/20">
                      <Shield className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
                      <h3 className="text-xl mb-3 text-gradient">No Credentials Found</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        You don't have any credentials to access this content. Please obtain the required credentials and try again.
                      </p>
                    </div>
                  </div>
                )}

                {/* Enhanced Validation Messages */}
                {!validation.isValid && credentials.length > 0 && (
                  <Alert variant="destructive" className="border-2 border-destructive/30">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 shrink-0" />
                      <div>
                        <AlertDescription className="font-bold text-lg">
                          Missing Required Credentials
                        </AlertDescription>
                        <p className="text-sm mt-1 opacity-90">
                          You need {validation.missingRequirements.length} more credential{validation.missingRequirements.length !== 1 ? 's' : ''} to access this content.
                        </p>
                      </div>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Progress Card */}
              <Card className="glass-card border-2 border-primary/20 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-primary/20">
                  <h3 className="font-bold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Access Progress
                  </h3>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Requirements Met</span>
                      <span className={`text-xl font-bold ${validation.isValid ? 'text-success' : 'text-warning'}`}>
                        {flow.credentialRequirements.length - validation.missingRequirements.length}/{flow.credentialRequirements.length}
                      </span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          validation.isValid ? 'bg-gradient-to-r from-success to-success/80' : 'bg-gradient-to-r from-warning to-warning/80'
                        }`}
                        style={{ 
                          width: `${((flow.credentialRequirements.length - validation.missingRequirements.length) / flow.credentialRequirements.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center">
                      {validation.isValid ? '🎉 Ready to unlock!' : '⏳ Select required credentials'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Action Card */}
              <Card className="glass-card border-2 border-primary/20 overflow-hidden">
                <CardContent className="p-6">
                  <Button
                    onClick={handleAccessContent}
                    disabled={!validation.isValid || isAccessing}
                    className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 h-14 text-lg font-bold"
                    size="lg"
                  >
                    {isAccessing ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                        <span>Unlocking Content...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5" />
                        <span>Unlock Content</span>
                        <Zap className="h-5 w-5 animate-pulse" />
                      </div>
                    )}
                  </Button>
                  
                  {!validation.isValid && (
                    <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <p className="text-xs text-warning font-medium text-center">
                        ⚠️ Select all required credentials to continue
                      </p>
                    </div>
                  )}
                  
                  {validation.isValid && (
                    <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
                      <p className="text-xs text-success font-medium text-center">
                        ✅ All requirements satisfied - ready to unlock!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Access Progress Component */}
              {(isAccessing || accessError) && (
                <AccessProgress
                  steps={accessSteps}
                  isAccessing={isAccessing}
                  error={accessError}
                  onRetry={retryCurrentStep}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}