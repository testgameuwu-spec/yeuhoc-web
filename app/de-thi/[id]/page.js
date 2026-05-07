import ExamSessionPage from '@/components/ExamSessionPage';

export default async function ExamDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;

  return (
    <ExamSessionPage
      examId={id}
      shouldResume={query?.resume === '1'}
    />
  );
}
