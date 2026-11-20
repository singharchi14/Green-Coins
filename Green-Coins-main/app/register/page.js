import AuthShell from '@/components/AuthShell';
import AuthFlow from '@/components/AuthFlow';
export const metadata = { title: 'Register – Green Coins' };
export default function Page() { return <AuthShell><AuthFlow mode="register" /></AuthShell>; }
