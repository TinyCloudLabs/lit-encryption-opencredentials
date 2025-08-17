import { AccessStep } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Clock, Loader2, XCircle, RefreshCw } from 'lucide-react';

interface AccessProgressProps {
  steps: AccessStep[];
  isAccessing: boolean;
  error: string | null;
  onRetry?: () => void;
}

const STEP_ICONS = {
  pending: Clock,
  loading: Loader2,
  completed: CheckCircle,
  error: XCircle
};

const STEP_COLORS = {
  pending: 'text-muted-foreground',
  loading: 'text-blue-600',
  completed: 'text-green-600',
  error: 'text-red-600'
};

export function AccessProgress({ steps, isAccessing, error, onRetry }: AccessProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.status === 'loading');
  const errorStepIndex = steps.findIndex(step => step.status === 'error');
  const hasError = errorStepIndex !== -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Access Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.status];
            const colorClass = STEP_COLORS[step.status];
            
            return (
              <div key={step.id} className="flex items-center gap-3">
                {/* Icon */}
                <div className={`shrink-0 ${colorClass}`}>
                  <Icon 
                    className={`h-5 w-5 ${step.status === 'loading' ? 'animate-spin' : ''}`} 
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <p className={`font-medium ${colorClass}`}>
                    {step.label}
                  </p>
                  
                  {/* Progress line */}
                  {index < steps.length - 1 && (
                    <div className="mt-2 ml-2 w-px h-4 bg-border"></div>
                  )}
                </div>
                
                {/* Status indicator */}
                {step.status === 'loading' && (
                  <div className="text-xs text-muted-foreground">
                    Processing...
                  </div>
                )}
                
                {step.status === 'completed' && (
                  <div className="text-xs text-green-600">
                    ✓ Complete
                  </div>
                )}
                
                {step.status === 'error' && (
                  <div className="text-xs text-red-600">
                    ✗ Failed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message and retry */}
        {hasError && error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Access Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            
            {onRetry && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Step
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Success state */}
        {!hasError && !isAccessing && steps.every(step => step.status === 'completed') && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Content Unlocked Successfully!</h4>
                <p className="text-sm text-green-700">Your content is now available below.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}