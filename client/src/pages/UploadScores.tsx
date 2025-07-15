import TournamentUploaderCohesive from "@/components/custom/TournamentUploaderCohesive";
import AuthRequiredPage from "@/components/custom/AuthRequiredPage";

export default function UploadScores() {
  return (
    <AuthRequiredPage requiredRole="admin">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Upload Tournament Results</h1>
            <p className="text-neutral-600">Import tournament results from Excel or CSV files with flexible header parsing and automatic point calculation</p>
          </div>
        </div>
        
        <TournamentUploaderCohesive />
      </section>
    </AuthRequiredPage>
  );
}
