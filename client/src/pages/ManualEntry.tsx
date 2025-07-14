import ManualEntryFormNew from "@/components/custom/ManualEntryFormNew";
import AuthRequiredPage from "@/components/custom/AuthRequiredPage";
import { Badge } from "@/components/ui/badge";

export default function ManualEntry() {
  return (
    <AuthRequiredPage requiredRole="admin">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Manual Tournament Entry</h1>
            <p className="text-neutral-600">Enter tournament results manually with custom scoring and direct points assignment. These results will not be subject to automatic recalculations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">Enhanced Form v2.0</Badge>
          </div>
        </div>
        
        <ManualEntryFormNew />
      </section>
    </AuthRequiredPage>
  );
}
