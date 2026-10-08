"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/domain/types";
import { saveBusinessAction } from "@/app/actions";
import { BUSINESS_TYPES, INDUSTRIES } from "@/lib/domain/labels";
import { Card, CardHeader, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";

/** Editing business details after onboarding. Identity verification is unaffected. */
export function BusinessProfileForm({ business }: { business: Business }) {
  const router = useRouter();
  const [d, setD] = useState({
    name: business.name,
    cacNumber: business.cacNumber,
    businessType: business.businessType,
    industry: business.industry,
    location: business.location,
    yearsOperating: String(business.yearsOperating),
    declaredMonthlyRevenue: String(business.declaredMonthlyRevenue),
  });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const errors = {
    name: d.name.trim().length < 3 ? "Enter the registered business name." : "",
    cacNumber: !/^(RC|BN)\s?\d{5,8}$/i.test(d.cacNumber.trim()) ? "Enter a CAC number such as RC 1482930." : "",
    businessType: !d.businessType ? "Select a business type." : "",
    industry: !d.industry ? "Select an industry." : "",
    location: d.location.trim().length < 2 ? "Enter the business location." : "",
    yearsOperating: d.yearsOperating === "" || Number(d.yearsOperating) < 0 ? "Enter years operating." : "",
    declaredMonthlyRevenue: !(Number(d.declaredMonthlyRevenue) > 0) ? "Enter average monthly revenue." : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const dirty =
    d.name !== business.name ||
    d.cacNumber !== business.cacNumber ||
    d.businessType !== business.businessType ||
    d.industry !== business.industry ||
    d.location !== business.location ||
    Number(d.yearsOperating) !== business.yearsOperating ||
    Number(d.declaredMonthlyRevenue) !== business.declaredMonthlyRevenue;
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setSaved(false); setD({ ...d, [k]: e.target.value }); };

  const save = () => {
    setTouched(true);
    if (!valid) return;
    start(async () => {
      const r = await saveBusinessAction({ ...d, yearsOperating: Number(d.yearsOperating), declaredMonthlyRevenue: Number(d.declaredMonthlyRevenue) });
      if (!r.ok) { setError(r.error); return; }
      setError(undefined);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader title="Business details" />
      {saved && <div className="mb-5"><Banner tone="success">Business details updated.</Banner></div>}
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="md:col-span-2"><Label required>Business name</Label><Input value={d.name} onChange={set("name")} invalid={touched && !!errors.name} />{touched && <FieldError>{errors.name}</FieldError>}</div>
        <div><Label required>CAC registration number</Label><Input value={d.cacNumber} onChange={set("cacNumber")} invalid={touched && !!errors.cacNumber} />{touched && <FieldError>{errors.cacNumber}</FieldError>}</div>
        <div><Label required>Business type</Label><Select value={d.businessType} onChange={set("businessType")}>{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></div>
        <div><Label required>Industry</Label><Select value={d.industry} onChange={set("industry")}>{INDUSTRIES.map((t) => <option key={t}>{t}</option>)}</Select></div>
        <div><Label required>Location</Label><Input value={d.location} onChange={set("location")} invalid={touched && !!errors.location} />{touched && <FieldError>{errors.location}</FieldError>}</div>
        <div><Label required>Years operating</Label><Input type="number" min={0} value={d.yearsOperating} onChange={set("yearsOperating")} className="tnum" /></div>
        <div><Label required hint="Naira, as declared">Average monthly revenue</Label><Input type="number" min={0} step={50000} value={d.declaredMonthlyRevenue} onChange={set("declaredMonthlyRevenue")} className="tnum" /></div>
      </div>
      <FieldError>{error}</FieldError>
      <Divider />
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-3">Declared revenue is compared against observed inflows during analysis.</p>
        <div className="flex items-center gap-2">
          <Button disabled={!dirty || pending} onClick={() => { setD({ name: business.name, cacNumber: business.cacNumber, businessType: business.businessType, industry: business.industry, location: business.location, yearsOperating: String(business.yearsOperating), declaredMonthlyRevenue: String(business.declaredMonthlyRevenue) }); setSaved(false); }}>Discard</Button>
          <Button variant="primary" disabled={!dirty} loading={pending} onClick={save}>Save changes</Button>
        </div>
      </div>
    </Card>
  );
}
