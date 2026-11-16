import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, UserCog } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { publicService } from '@/services/publicService';
import { extractApiError } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export function PatientProfilePage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => publicService.getMyProfile(),
  });

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    medical_history: '',
  });

  useEffect(() => {
    if (profileQuery.data) {
      setForm({
        name: profileQuery.data.name || '',
        age: String(profileQuery.data.age ?? ''),
        gender: profileQuery.data.gender || 'Male',
        phone: profileQuery.data.phone || '',
        address: profileQuery.data.address || '',
        medical_history: profileQuery.data.medical_history || '',
      });
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      publicService.updateMyProfile({
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender,
        phone: form.phone || undefined,
        address: form.address || undefined,
        medical_history: form.medical_history || undefined,
      }),
    onSuccess: () => {
      toast.success('Health profile updated');
      void queryClient.invalidateQueries({ queryKey: ['patient-my-profile'] });
    },
    onError: (err) => toast.error('Update failed', extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Personal Health Profile"
          subtitle="Keep your contact details and medical history up to date."
          action={<UserCog className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email</label>
              <input
                disabled
                value={profileQuery.data?.email ?? ''}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Age</label>
              <input
                type="number"
                min={0}
                max={130}
                required
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Allergies & Known Medical History
              </label>
              <textarea
                rows={3}
                value={form.medical_history}
                onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

