import React, { useEffect, useState } from 'react';
import { Text } from '@/components/ui/text';
import { formatDistanceToNow } from 'date-fns';

interface CountdownTimerProps {
  deadline: string; // ISO timestamp
  className?: string;
}

/**
 * Displays countdown timer for booking response deadline
 * Shows in red when less than 1 hour remaining
 */
export function CountdownTimer({ deadline, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const deadlineTime = new Date(deadline).getTime();
      const timeRemaining = deadlineTime - now;

      // Check if expiring soon (less than 1 hour)
      setIsExpiringSoon(timeRemaining < 3600000 && timeRemaining > 0);

      // Format time left
      if (timeRemaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const distance = formatDistanceToNow(new Date(deadline), { addSuffix: true });
        setTimeLeft(distance);
      }
    };

    // Initial update
    updateTimer();

    // Update every minute
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <Text 
      className={`
        text-sm font-medium
        ${isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}
        ${className}
      `}
    >
      Respond {timeLeft}
    </Text>
  );
}
