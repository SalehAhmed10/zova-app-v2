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
import { useSession } from '@/app/ctx';
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
  const { signOut } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setShowDialog(false);
      
      console.log('[LogoutButton] Starting logout process');
      
      // ✅ CLEAN: Sign out with SessionProvider
      await signOut();
      console.log('[LogoutButton] Sign out completed');
      
      // ✅ Navigate to auth screen (route group syntax)
      router.replace('/(auth)');
      
    } catch (error) {
      console.error('[LogoutButton] Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const modernButtonClass = cn(
    'flex-row items-center justify-center gap-3 px-4 py-3',
    'bg-destructive/10 dark:bg-destructive/20',
    'border border-destructive/20 dark:border-destructive/30',
    'rounded-xl',
    'active:scale-[0.98] active:bg-destructive/20 dark:active:bg-destructive/30',
    'transition-all duration-200',
    Platform.select({
      web: 'hover:bg-destructive/20 dark:hover:bg-destructive/30'
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
          {showIcon && <LogoutIcon className="text-destructive" />}
          {children || (
            <Text className="text-destructive font-semibold text-base flex-1 text-center">
              Sign Out
            </Text>
          )}
        </Pressable>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-card border-border max-w-xs mx-8 rounded-2xl ">
            <AlertDialogHeader className="gap-3 px-2">
              <View className="items-center mb-2">
                <View className="w-12 h-12 bg-destructive/10 dark:bg-destructive/20 rounded-full items-center justify-center mb-3">
                  <LogoutIcon className="text-destructive text-xl" />
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
