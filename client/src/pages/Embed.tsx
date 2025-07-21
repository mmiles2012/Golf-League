import EmbedCodeGenerator from '@/components/custom/EmbedCodeGenerator';

export default function Embed() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">
            Embed Leaderboards
          </h1>
          <p className="text-neutral-600">Share leaderboards on your website</p>
        </div>
      </div>

      <EmbedCodeGenerator />
    </section>
  );
}
