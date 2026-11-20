import AuthShell from '@/components/AuthShell';
import AuthFlow from '@/components/AuthFlow';
export const metadata = { title: 'Log in – Green Coins' };
export default function Page() { return <AuthShell><AuthFlow mode="login" /></AuthShell>; }
