import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: Check auth state — redirect to (tabs) if logged in, (auth)/login if not
  return <Redirect href="/(auth)/login" />;
}
