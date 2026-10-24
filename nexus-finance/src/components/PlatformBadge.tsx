'use client';

import { 
  Monitor, 
  Smartphone, 
  Globe, 
  Compass,
  Laptop,
  Tablet,
  Package,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface PlatformBadgeProps {
  className?: string;
  showDetails?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  position?: 'static' | 'floating';
}

export default function PlatformBadge({ 
  className = '',
  showDetails = false,
  variant = 'default',
  position = 'static'
}: PlatformBadgeProps) {
  const { 
    platform, 
    browser, 
    isPWA, 
    isStandalone, 
    isInstallable 
  } = usePWA();

  const getPlatformIcon = () => {
    const p = platform.toLowerCase();
    if (p.includes('ios') || p.includes('android')) return <Smartphone className="w-4 h-4" />;
    if (p.includes('mac') || p.includes('windows') || p.includes('linux')) return <Monitor className="w-4 h-4" />;
    if (p.includes('pwa')) return <Package className="w-4 h-4" />;
    return <Cpu className="w-4 h-4" />;
  };

  const getBrowserIcon = () => {
    const b = browser.toLowerCase();
    if (b.includes('safari')) return <Compass className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  const getPlatformColor = () => {
    switch (platform.toLowerCase()) {
      case 'ios':
      case 'iphone':
      case 'ipad':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'android':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'windows':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'mac':
      case 'macos':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'linux':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'pwa':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBrowserColor = () => {
    switch (browser.toLowerCase()) {
      case 'chrome':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'safari':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'edge':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'firefox':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPWAStatusColor = () => {
    if (isPWA && isStandalone) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (isPWA) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (isInstallable) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPWAStatusText = () => {
    if (isPWA && isStandalone) {
      return 'PWA Active';
    } else if (isPWA) {
      return 'PWA Mode';
    } else if (isInstallable) {
      return 'Can Install';
    } else {
      return 'Web Mode';
    }
  };

  const getPWAIcon = () => {
    if (isPWA && isStandalone) {
      return <Smartphone className="w-4 h-4" />;
    } else if (isPWA) {
      return <Package className="w-4 h-4" />;
    } else if (isInstallable) {
      return <Package className="w-4 h-4" />;
    } else {
      return <Globe className="w-4 h-4" />;
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className={`${getPlatformColor()} flex items-center gap-1`}>
          {getPlatformIcon()}
          <span className="text-xs font-medium">{platform.toUpperCase()}</span>
        </Badge>
      </div>
    );
  }

  if (variant === 'default') {
    return (
      <div className={`${className}`}>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getPlatformColor()} flex items-center gap-1`}>
                    {getPlatformIcon()}
                    <span className="text-xs">{platform.toUpperCase()}</span>
                  </Badge>
                  
                  <Badge className={`${getBrowserColor()} flex items-center gap-1`}>
                    {getBrowserIcon()}
                    <span className="text-xs">{browser.toUpperCase()}</span>
                  </Badge>
                </div>
              </div>
              
              <Badge className={`${getPWAStatusColor()} flex items-center gap-1`}>
                {getPWAIcon()}
                <span className="text-xs">{getPWAStatusText()}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'detailed' && showDetails) {
    return (
      <div className={`${className}`}>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Platform Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Platform</h4>
                <div className="flex items-center gap-2">
                  <Badge className={`${getPlatformColor()} flex items-center gap-2 px-3 py-2`}>
                    {getPlatformIcon()}
                    <div className="text-left">
                      <div className="font-medium">{platform.toUpperCase()}</div>
                      <div className="text-xs opacity-75">Operating System</div>
                    </div>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Browser</h4>
                <div className="flex items-center gap-2">
                  <Badge className={`${getBrowserColor()} flex items-center gap-2 px-3 py-2`}>
                    {getBrowserIcon()}
                    <div className="text-left">
                      <div className="font-medium">{browser.toUpperCase()}</div>
                      <div className="text-xs opacity-75">Web Browser</div>
                    </div>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">PWA Status</h4>
                <div className="flex items-center gap-2">
                  <Badge className={`${getPWAStatusColor()} flex items-center gap-2 px-3 py-2`}>
                    {getPWAIcon()}
                    <div className="text-left">
                      <div className="font-medium">{getPWAStatusText()}</div>
                      <div className="text-xs opacity-75">
                        {isPWA && isStandalone && 'Standalone mode active'}
                        {isPWA && !isStandalone && 'PWA detected but not standalone'}
                        {!isPWA && isInstallable && 'Ready to install'}
                        {!isPWA && !isInstallable && 'Running in browser'}
                      </div>
                    </div>
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PWA Mode:</span>
                    <span className="font-medium">{isPWA ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Standalone:</span>
                    <span className="font-medium">{isStandalone ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Installable:</span>
                    <span className="font-medium">{isInstallable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Display Mode:</span>
                    <span className="font-medium">
                      {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches 
                        ? 'Standalone' 
                        : 'Browser'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700 mb-2">User Agent</h4>
                <div className="text-xs text-blue-600 font-mono break-all">
                  {typeof navigator !== 'undefined' ? navigator.userAgent : 'Loading...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return null;
}