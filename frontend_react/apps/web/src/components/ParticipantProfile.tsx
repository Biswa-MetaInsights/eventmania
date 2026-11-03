'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@eventmind/api';
import { currentUserId, loadProfile, privateImage, uploadImage } from '@/lib/operations';
import { fileToAvatarDataUrl } from '@/lib/image-upload';
import { inputCls } from '@/components/FormControls';
import { OUTLINE_BUTTON } from '@/lib/controls';

export function ParticipantProfile() {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const userId = currentUserId();
  const profile = useQuery({ queryKey: ['participant-profile', userId], queryFn: loadProfile });
  const avatar = useQuery({ queryKey: ['participant-avatar', profile.data?.avatar_url], queryFn: () => privateImage(profile.data!.avatar_url!), enabled: !!profile.data?.avatar_url?.startsWith('/api/') });
  const save = useMutation({
    mutationFn: (values: {full_name?: string; bio?: string; interests?: string[]; avatar_url?: string}) => apiClient.patch(`/user/${userId}`, values),
    onSuccess: () => { void client.invalidateQueries({queryKey: ['participant-profile', userId]}); setMessage('Profile saved.'); },
    onError: () => setMessage('Your profile could not be saved. Please try again.'),
  });
  if (profile.isPending) return <p>Loading profile…</p>;
  if (!profile.data) return <p role="alert">Your profile could not be loaded. Please sign in again.</p>;
  const data = profile.data;
  return <section className="max-w-2xl space-y-6">
    <h2 className="text-[26px] font-bold">Your profile</h2>
    <p className="text-[18px]">Save your name and interests for more relevant event suggestions. Your profile picture is private to your account.</p>
    {avatar.data && <img src={avatar.data} alt="Your profile picture" className="w-28 h-28 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element -- authenticated image loaded as a data URL */}
    <label className="block text-[17px] font-semibold">Profile picture
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={save.isPending} className="block mt-2 max-w-full" onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        setMessage('Uploading picture…');
        try { const image = await fileToAvatarDataUrl(file); if (!image.ok) {setMessage(image.message); return;} const url = await uploadImage(image.dataUrl, 'avatar'); save.mutate({avatar_url: url}); }
        catch { setMessage('The picture could not be uploaded. Try a smaller PNG or JPEG.'); }
      }} />
    </label>
    <form key={data.updated_at} className="space-y-5" onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      save.mutate({ full_name: String(form.get('name')).trim(), bio: String(form.get('bio')).trim(), interests: String(form.get('interests')).split(',').map(s=>s.trim()).filter(Boolean).slice(0,30) });
    }}>
      <label className="block text-[17px] font-semibold">Full name<input name="name" defaultValue={data.full_name} required maxLength={200} className={`${inputCls(false)} mt-2 w-full`} /></label>
      <label className="block text-[17px] font-semibold">About you<textarea name="bio" defaultValue={data.bio ?? ''} maxLength={4000} rows={3} className={`${inputCls(false)} mt-2 w-full`} /></label>
      <label className="block text-[17px] font-semibold">Interests<input name="interests" defaultValue={data.interests.join(', ')} maxLength={1000} placeholder="Music, technology, family activities" className={`${inputCls(false)} mt-2 w-full`} /></label>
      <p>Separate interests with commas.</p>
      <button type="submit" disabled={save.isPending} className="px-6 py-3 rounded-lg bg-[var(--brand-green)] text-[var(--brand-on-green)] font-bold">{save.isPending ? 'Saving…' : 'Save profile'}</button>
    </form>
    <button className={`px-5 py-3 rounded-lg ${OUTLINE_BUTTON}`} onClick={async () => { try { await apiClient.post('/auth/request-verification'); setMessage('Verification email requested.'); } catch {setMessage('Email verification is not available yet.');} }}>Verify email address</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
