import { ContractForm } from "@/components/contracts/contract-form";
export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractForm contractId={id} />;
}
