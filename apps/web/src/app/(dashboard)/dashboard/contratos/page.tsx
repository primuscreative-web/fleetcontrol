import { ContractsDashboard } from "@/components/contracts/contracts-dashboard";
import { ContractsList } from "@/components/contracts/contracts-list";
export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <ContractsDashboard />
      <ContractsList />
    </div>
  );
}
