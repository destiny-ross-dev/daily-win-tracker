"use client";

type AppointmentDetailArgs = {
  policyholder: string;
  lob?: string | null;
  policyType?: string | null;
};

export function formatAppointmentDetail({
  policyholder,
  lob,
  policyType,
}: AppointmentDetailArgs) {
  const parts: string[] = [policyholder];
  if (lob) parts.push(lob.toUpperCase());
  if (policyType) parts.push(policyType);
  return parts.join(" • ");
}
