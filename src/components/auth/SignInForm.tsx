"use client";
import { useActionState, useState } from "react";
import { signInAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";

export function SignInForm({ demoAccounts, demoPassword }: { demoAccounts: { email: string; name: string; title: string }[]; demoPassword?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-5">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-[14px]" />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-[14px]" />
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" variant="primary" className="w-full h-10 text-[14px]" loading={pending}>Sign in</Button>
      {demoAccounts.length > 0 && demoPassword && (
        <div className="rounded-[8px] border border-line bg-sunken p-4">
          <div className="eyebrow mb-2">Demo environment accounts</div>
          <ul className="space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button type="button" onClick={() => { setEmail(a.email); setPassword(demoPassword); }} className="w-full flex items-center justify-between text-left text-[13px] py-1.5 px-2 -mx-2 rounded-[6px] hover:bg-hover">
                  <span className="text-ink">{a.name}</span>
                  <span className="text-ink-3">{a.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-ink-3 mt-2">Selecting an account fills the form. Shared password for all demo accounts: <code className="font-mono text-ink">{demoPassword}</code></p>
        </div>
      )}
    </form>
  );
}
