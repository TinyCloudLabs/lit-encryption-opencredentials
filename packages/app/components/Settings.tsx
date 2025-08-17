import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Settings as SettingsIcon, Save, RotateCcw, Sparkles, Bell, Shield } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleNotificationChange = <K extends keyof AppSettings['notificationPreferences']>(
    key: K,
    value: AppSettings['notificationPreferences'][K]
  ) => {
    const newSettings = {
      ...localSettings,
      notificationPreferences: {
        ...localSettings.notificationPreferences,
        [key]: value
      }
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl text-gradient">Settings</h2>
            <p className="text-muted-foreground">Customize your experience</p>
          </div>
        </div>
        
        {hasChanges && (
          <Badge className="bg-gradient-to-r from-warning to-warning/80 text-white border-0 animate-pulse shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" />
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Credential Settings */}
      <Card className="glass-card hover-lift transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="h-8 w-8 gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            Credential Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors duration-200">
            <div className="space-y-1">
              <Label htmlFor="auto-select" className="text-base font-medium">Auto-select credentials</Label>
              <p className="text-sm text-muted-foreground">
                Automatically select matching credentials for flows to streamline your experience
              </p>
            </div>
            <Switch
              id="auto-select"
              checked={localSettings.autoSelectCredentials}
              onCheckedChange={(checked) => handleSettingChange('autoSelectCredentials', checked)}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="glass-card hover-lift transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="h-8 w-8 gradient-accent rounded-lg flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors duration-200">
            <div className="space-y-1">
              <Label htmlFor="show-success" className="text-base font-medium">Success notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications for successful operations and achievements
              </p>
            </div>
            <Switch
              id="show-success"
              checked={localSettings.notificationPreferences.showSuccess}
              onCheckedChange={(checked) => handleNotificationChange('showSuccess', checked)}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-success data-[state=checked]:to-success/80"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors duration-200">
            <div className="space-y-1">
              <Label htmlFor="show-errors" className="text-base font-medium">Error notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications for errors and failures to stay informed
              </p>
            </div>
            <Switch
              id="show-errors"
              checked={localSettings.notificationPreferences.showErrors}
              onCheckedChange={(checked) => handleNotificationChange('showErrors', checked)}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-destructive data-[state=checked]:to-destructive/80"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-6">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges}
          className="hover-lift px-6 py-3 border-2 hover:border-primary/50 transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}