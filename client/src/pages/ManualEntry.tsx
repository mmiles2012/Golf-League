import ManualEntryForm from "@/components/custom/ManualEntryForm";
import AuthRequiredPage from "@/components/custom/AuthRequiredPage";

export default function ManualEntry() {
  return (
    <AuthRequiredPage requiredRole="authenticated">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Manual Entry</h1>
            <p className="text-neutral-600">Enter tournament results for any event type with flexible scoring and points assignment</p>
          </div>
        </div>
        
        <ManualEntryForm />
      </section>
    </AuthRequiredPage>
  );
}
