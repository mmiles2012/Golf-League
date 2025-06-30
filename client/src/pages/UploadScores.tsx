import TournamentUploaderNew from "@/components/custom/TournamentUploaderNew";

export default function UploadScores() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Upload Scores</h1>
          <p className="text-neutral-600">Import tournament results from Excel files</p>
        </div>
      </div>
      
      <TournamentUploader />
    </section>
  );
}
