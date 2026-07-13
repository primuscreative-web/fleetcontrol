import { ContractProfile } from "@/components/contracts/contract-profile";
export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractProfile contractId={id} />;
}
