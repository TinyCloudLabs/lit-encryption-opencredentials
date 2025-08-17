import { Credential } from '../types';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface CredentialItemProps {
  credential: Credential;
  isSelected: boolean;
  onSelectionChange: (credentialId: string, selected: boolean) => void;
  isRequired?: boolean;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle,
    label: 'Valid',
    color: 'default' as const,
    className: 'text-green-600 border-green-200 bg-green-50'
  },
  expiring: {
    icon: AlertTriangle,
    label: 'Expiring Soon',
    color: 'secondary' as const,
    className: 'text-amber-600 border-amber-200 bg-amber-50'
  },
  invalid: {
    icon: XCircle,
    label: 'Invalid',
    color: 'destructive' as const,
    className: 'text-red-600 border-red-200 bg-red-50'
  },
  'not-valid-for-use': {
    icon: Clock,
    label: 'Not Valid for This Use',
    color: 'outline' as const,
    className: 'text-gray-600 border-gray-200 bg-gray-50'
  }
};

export function CredentialItem({ 
  credential, 
  isSelected, 
  onSelectionChange, 
  isRequired = false,
  disabled = false 
}: CredentialItemProps) {
  const statusConfig = STATUS_CONFIG[credential.status];
  const StatusIcon = statusConfig.icon;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const extractIssuerName = (issuerDid: string) => {
    // Extract human-readable name from DID
    const match = issuerDid.match(/did:web:([^.]+)/);
    return match ? match[1].replace(/([a-z])([A-Z])/g, '$1 $2') : issuerDid;
  };

  const isInteractable = !disabled && (credential.status === 'valid' || credential.status === 'expiring');

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${
      !isInteractable ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(credential.id, checked as boolean)}
              disabled={!isInteractable}
              id={`credential-${credential.id}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-medium truncate">{credential.credentialType}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {extractIssuerName(credential.issuer)}
                </p>
              </div>
              
              {/* Status Badge */}
              <Badge variant={statusConfig.color} className="shrink-0">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Claims */}
            <div className="space-y-1 mb-3">
              {Object.entries(credential.claims).map(([key, value]) => (
                <div key={key} className="text-xs text-muted-foreground">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>

            {/* Dates */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Issued: {formatDate(credential.issuedAt)}</span>
              <span>Expires: {formatDate(credential.expiresAt)}</span>
            </div>

            {/* Required indicator */}
            {isRequired && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Required for this flow
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}