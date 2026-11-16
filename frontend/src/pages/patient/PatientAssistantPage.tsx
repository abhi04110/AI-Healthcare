import { useQuery } from '@tanstack/react-query';
import { publicService } from '@/services/publicService';
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel';

export function PatientAssistantPage() {
  const profileQuery = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => publicService.getMyProfile(),
  });

  const patientList = profileQuery.data
    ? [
        {
          id: profileQuery.data.id,
          name: profileQuery.data.name,
          patient_code: profileQuery.data.patient_code,
        },
      ]
    : [];

  return (
    <AiAssistantPanel
      title="Personal AI Symptom & Health Guide"
      subtitle="Scoped securely to your own medical records and RAG clinical guidelines."
      patients={patientList}
      defaultPatientId={profileQuery.data?.id}
      quickPrompts={[
        'Explain my latest vital signs and risk assessment in plain language',
        'What dietary habits help manage blood pressure and fasting glucose?',
        'What symptoms require immediate urgent medical attention?',
      ]}
    />
  );
}

