import React, { useState } from 'react';
import { router } from 'expo-router';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/stores/auth/app';
import { useAuthPure } from '@/hooks/shared/useAuthPure';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'modern';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  fullWidth?: boolean;
}

const LogoutIcon = ({ className }: { className?: string }) => (
  <Text className={cn('text-lg', className)}>🚪</Text>
);

export function LogoutButton({ 
  variant = 'modern', 
  size = 'default',
  className = '',
  children,
  showIcon = true,
  fullWidth = false
}: LogoutButtonProps) {
  const { logout, setLoggingOut } = useAppStore();
  const { signOut } = useAuthPure();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setShowDialog(false);
      
      // ✅ CLEAN: Set logout state - triggers app-level loading screen
      setLoggingOut(true);
      console.log('[LogoutButton] Starting clean logout process');
      
      // ✅ ROBUST: Immediate state clearing - no delays needed
      logout();
      console.log('[LogoutButton] App state cleared');
      
      // ✅ CLEAN: Supabase sign out with proper error handling
      if (signOut) {
        try {
          await signOut();
          console.log('[LogoutButton] Supabase sign out completed');
        } catch (authError) {
          // Non-blocking error - logout can proceed without Supabase
          console.warn('[LogoutButton] Supabase sign out failed (non-critical):', authError);
        }
      }
      
      // ✅ CLEAN: Single timeout for UX animation duration
      setTimeout(() => {
        setLoggingOut(false);
        console.log('[LogoutButton] Logout animation completed');
      }, 1500); // Reduced to 1.5s for better UX
      
    } catch (error) {
      console.error('[LogoutButton] Logout error:', error);
      // ✅ ROBUST: Always reset state on error
      logout();
      setLoggingOut(false);
    } finally {
      setIsLoading(false);
    }
  };

  const modernButtonClass = cn(
    'flex-row items-center justify-center gap-3 px-4 py-3',
    'bg-red-500/10 dark:bg-red-500/20',
    'border border-red-200 dark:border-red-700',
    'rounded-xl',
    'active:scale-[0.98] active:bg-red-500/20 dark:active:bg-red-500/30',
    'transition-all duration-200',
    Platform.select({
      web: 'hover:bg-red-500/20 dark:hover:bg-red-500/30'
    }),
    fullWidth && 'w-full'
  );

  if (variant === 'modern') {
    return (
      <>
        <Pressable 
          className={cn(modernButtonClass, className)}
          onPress={() => {
            console.log('[LogoutButton] Button pressed, opening dialog');
            setShowDialog(true);
          }}
        >
          {showIcon && <LogoutIcon className="text-red-600 dark:text-red-400" />}
          {children || (
            <Text className="text-red-600 dark:text-red-400 font-semibold text-base flex-1 text-center">
              Sign Out
            </Text>
          )}
        </Pressable>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-card border-border max-w-xs mx-8 rounded-2xl shadow-lg">
            <AlertDialogHeader className="gap-3 px-2">
              <View className="items-center mb-2">
                <View className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-3">
                  <LogoutIcon className="text-red-500 text-xl" />
                </View>
              </View>
              <AlertDialogTitle className="text-center text-lg font-bold">
                Sign Out
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground leading-relaxed text-sm px-2">
                Are you sure you want to sign out? You'll need to sign in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 mt-4 px-2">
              <Button
                variant="outline"
                className="flex-1 h-10"
                onPress={() => setShowDialog(false)}
              >
                <Text className="font-medium text-sm text-center">Cancel</Text>
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10"
                disabled={isLoading}
                onPress={handleSignOut}
              >
                <Text className="text-white font-semibold text-sm text-center">
                  {isLoading ? 'Signing Out...' : 'Sign Out'}
                </Text>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <View>
      <Button 
        variant={variant} 
        size={size} 
        className={className} 
        disabled={isLoading}
        onPress={() => setShowDialog(true)}
      >
        {children || (
          <Text variant="default" className="font-semibold">
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        )}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-xs mx-8 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onPress={() => setShowDialog(false)}
            >
              <Text className="text-sm text-center">Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10"
              disabled={isLoading}
              onPress={handleSignOut}
            >
              <Text className="text-white text-sm text-center">{isLoading ? 'Signing Out...' : 'Sign Out'}</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
