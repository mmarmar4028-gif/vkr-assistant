import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Вход — Помощник по ВКР" };

export default function LoginPage() {
  return <AuthForm kind="login" />;
}
