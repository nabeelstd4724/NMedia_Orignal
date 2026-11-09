import { AuthForm } from '@/components/auth/AuthForm';
import { AuthShell } from '@/components/auth/AuthShell';

export default function RegisterPage() { return <AuthShell eyebrow="JOIN NMEDIA" title="Make room for more stories." intro="Create your member account and build a home for the films you want to remember."><AuthForm mode="register" /></AuthShell>; }
