"use client";
import { useActionState } from "react";
import { signUpAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <Label>Business name</Label>
        <Input name="businessName" required placeholder="Registered name" className="h-10 text-[14px]" />
      </div>
      <div>
        <Label>Your full name</Label>
        <Input name="name" autoComplete="name" required className="h-10 text-[14px]" />
      </div>
      <div>
        <Label>Work email</Label>
        <Input name="email" type="email" autoComplete="email" required className="h-10 text-[14px]" />
      </div>
      <div>
        <Label hint="at least 8 characters">Password</Label>
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} className="h-10 text-[14px]" />
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" variant="primary" className="w-full h-10 text-[14px]" loading={pending}>Create account</Button>
      <p className="text-[12px] text-ink-3">By continuing you agree to the platform terms. You will verify the business and its signatory in the next step; no banking passwords are ever entered into Ìrètí.</p>
    </form>
  );
}
