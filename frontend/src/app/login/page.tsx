import { AuthForm } from '@/components/auth/AuthForm';
import { AuthShell } from '@/components/auth/AuthShell';

export default function LoginPage() { return <AuthShell eyebrow="MEMBER ACCESS" title="Welcome back." intro="Pick up where you left off. Your next favorite story is waiting."><AuthForm mode="login" /></AuthShell>; }
