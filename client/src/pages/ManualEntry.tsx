import ManualEntryFormCohesive from "@/components/custom/ManualEntryFormCohesive";
import AuthRequiredPage from "@/components/custom/AuthRequiredPage";

export default function ManualEntry() {
  return (
    <AuthRequiredPage requiredRole="admin">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Manual Tournament Entry</h1>
            <p className="text-neutral-600">Enter tournament results manually for small tournaments or events that don't require spreadsheet import</p>
          </div>
        </div>
        
        <ManualEntryFormCohesive />
      </section>
    </AuthRequiredPage>
  );
}
