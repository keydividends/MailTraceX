import { useRouter } from 'next/navigation';

export default function EmailDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main>
      <h1>Email {id}</h1>
      <p>Timeline and details will be shown here.</p>
    </main>
  );
}
