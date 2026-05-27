import { useEffect } from 'react';
import { router } from 'expo-router';

// Login and Register are now combined in login.tsx with a tab toggle.
export default function RegisterRedirect() {
  useEffect(() => {
    router.replace('/(auth)/login');
  }, []);
  return null;
}
