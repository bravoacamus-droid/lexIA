'use client';

import { useRouter } from 'next/navigation';
import { SurveyWizard } from '@/components/app/surveys/survey-wizard';
import type { SurveyDefinition } from '@/lib/surveys/catalog';

type Answers = Record<string, string | string[] | number>;

export function SurveyView({
  survey,
  initialAnswers,
}: {
  survey: SurveyDefinition;
  initialAnswers: Answers;
}) {
  const router = useRouter();

  return (
    <SurveyWizard
      survey={survey}
      initialAnswers={initialAnswers}
      showSkip={false}
      onCompleted={() => {
        setTimeout(() => router.refresh(), 3500);
      }}
    />
  );
}
