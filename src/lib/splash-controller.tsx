import { SplashScreen } from 'expo-router';
import { useSession } from './auth-context';

export function SplashScreenController() {
  const { isLoading } = useSession();

  if (!isLoading) {
    SplashScreen.hideAsync();
  }

  return null;
}