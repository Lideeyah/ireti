"use client";
import { PageHeader } from "@/components/shell/PageHeader";
import { ApplicationQueue } from "@/components/bank/ApplicationQueue";

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Lending Operations" title="Application queue" description="Click a row to open the review. New applications move to Under review when first opened and the access is recorded." />
      <ApplicationQueue />
    </>
  );
}
