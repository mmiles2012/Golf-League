import UnifiedTournamentEntry from '@/components/custom/UnifiedTournamentEntry';
import AuthRequiredPage from '@/components/custom/AuthRequiredPage';

export default function UploadScores() {
  return (
    <AuthRequiredPage requiredRole="admin">
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">
              Tournament Entry
            </h1>
            <p className="text-neutral-600">
              Create tournaments by uploading files or entering results manually with flexible
              scoring options
            </p>
          </div>
        </div>

        <UnifiedTournamentEntry />
      </section>
    </AuthRequiredPage>
  );
}
