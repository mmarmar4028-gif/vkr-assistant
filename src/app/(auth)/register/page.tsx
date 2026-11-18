import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Регистрация — Помощник по ВКР" };

export default function RegisterPage() {
  return <AuthForm kind="register" />;
}
