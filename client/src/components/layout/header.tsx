import { Button } from "@/components/ui/button";
import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  onMobileMenuToggle?: () => void;
}

export default function Header({ title, subtitle, action, onMobileMenuToggle }: HeaderProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: isMobile ? "short" : "long",
    year: "numeric",
    month: isMobile ? "short" : "long",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
  });

  // Check if notifications are already enabled
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const subscribeToNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support push notifications",
        variant: "destructive",
      });
      return;
    }

    if (!('serviceWorker' in navigator)) {
      toast({
        title: "Service Worker Not Supported",
        description: "Your browser doesn't support service workers",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidResponse = await fetch('/api/notifications/vapid-key');
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setIsNotificationsEnabled(true);
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive push notifications for hotel events",
      });

    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast({
        title: "Subscription Failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      }

      setIsNotificationsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore",
      });
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Failed to disable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 lg:ml-0 ml-0">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden h-10 w-10 p-0 rounded-md mr-3"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{title}</h2>
          <p className="text-sm sm:text-base text-gray-600 truncate">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4 ml-2">
          {!isMobile && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">Today: {currentDate}</p>
            </div>
          )}
          
          {isMobile && (
            <div className="text-right text-xs">
              <p className="font-medium text-gray-900">{currentDate}</p>
            </div>
          )}
          
          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 relative"
            onClick={isNotificationsEnabled ? unsubscribeFromNotifications : subscribeToNotifications}
            title={isNotificationsEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {isNotificationsEnabled ? (
              <Bell className="h-4 w-4 text-blue-600" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-500" />
            )}
            {isNotificationsEnabled && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 rounded-full"></span>
            )}
          </Button>
          
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
    </header>
  );
}
