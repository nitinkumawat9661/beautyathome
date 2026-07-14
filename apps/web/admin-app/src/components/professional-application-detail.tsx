'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import {
  apiErrorMessage,
  decideProfessionalApplication,
  getProfessionalApplication,
  startProfessionalApplicationReview,
} from '@/lib/api/client';

type ApplicationDetail = Awaited<ReturnType<typeof getProfessionalApplication>>;
type Decision = 'APPROVE' | 'REJECT';

export function ProfessionalApplicationDetail({ applicationId }: { applicationId: string }) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [decision, setDecision] = useState<Decision>('APPROVE');
  const [reasonCode, setReasonCode] = useState('APPLICATION_APPROVED');
  const [internalNote, setInternalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getProfessionalApplication(applicationId)
      .then((result) => {
        if (active) setApplication(result);
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [applicationId]);

  function changeDecision(next: Decision): void {
    setDecision(next);
    setReasonCode(next === 'APPROVE' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED');
  }

  async function startReview(): Promise<void> {
    if (!application) return;
    setBusy(true);
    setError(null);
    try {
      setApplication(
        await startProfessionalApplicationReview(application.id, {
          expectedVersion: application.version,
        }),
      );
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!application) return;
    if (decision === 'REJECT' && internalNote.trim().length === 0) {
      setError('An internal note is required when rejecting an application.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      setApplication(
        await decideProfessionalApplication(application.id, {
          decision,
          expectedVersion: application.version,
          reasonCode,
          ...(internalNote.trim() ? { internalNote: internalNote.trim() } : {}),
        }),
      );
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (error && !application) {
    return <main className="mx-auto max-w-4xl p-8 text-red-800">{error}</main>;
  }

  if (!application) {
    return <main className="mx-auto max-w-4xl p-8">Loading application…</main>;
  }

  const finalDecision = application.status === 'APPROVED' || application.status === 'REJECTED';

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link className="text-sm font-semibold text-[#4a2435] underline underline-offset-4" href="/professional-applications">
        Back to applications
      </Link>

      <div className="mt-6 border-b border-[#d9d3cd] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b625c]">
          {application.referenceId}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{application.fullName}</h1>
          <span className="border border-[#d9d3cd] bg-white px-3 py-2 text-sm font-semibold">
            {application.status.replaceAll('_', ' ')} · v{application.version}
          </span>
        </div>
      </div>

      {error ? <p className="mt-6 border border-red-200 bg-red-50 p-4 text-red-800">{error}</p> : null}

      <section className="mt-7 grid gap-6 border border-[#d9d3cd] bg-white p-6 md:grid-cols-2">
        <Detail label="Mobile number" value={application.mobileNumber} mono />
        <Detail label="City" value={application.city} />
        <Detail label="Experience" value={application.experienceBand.replaceAll('_', ' ')} />
        <Detail label="Coverage" value={application.coverage} />
        <Detail label="Services" value={application.services.join(', ').replaceAll('_', ' ')} />
        <Detail label="Consent recorded" value={new Date(application.consentedAt).toLocaleString('en-IN')} />
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b625c]">Work summary</p>
          <p className="mt-2 leading-7">{application.workSummary}</p>
        </div>
      </section>

      {application.status === 'SUBMITTED' ? (
        <button
          className="mt-7 min-h-12 bg-[#4a2435] px-6 font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={() => void startReview()}
          type="button"
        >
          {busy ? 'Updating…' : 'Start review'}
        </button>
      ) : null}

      {!finalDecision ? (
        <form className="mt-8 border-t border-[#d9d3cd] pt-8" onSubmit={(event) => void submitDecision(event)}>
          <h2 className="text-2xl font-semibold">Record decision</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b625c]">
            Approval provisions the mobile number with professional sign-in access. This action is audited.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Decision
              <select
                className="mt-2 min-h-12 w-full border border-[#d9d3cd] bg-white px-4"
                disabled={busy}
                onChange={(event) => changeDecision(event.target.value as Decision)}
                value={decision}
              >
                <option value="APPROVE">Approve and provision</option>
                <option value="REJECT">Reject</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Reason code
              <input
                className="mt-2 min-h-12 w-full border border-[#d9d3cd] px-4 font-mono"
                disabled={busy}
                onChange={(event) => setReasonCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                required
                value={reasonCode}
              />
            </label>
          </div>

          <label className="mt-5 block text-sm font-semibold">
            Internal note {decision === 'REJECT' ? '(required)' : '(optional)'}
            <textarea
              className="mt-2 min-h-28 w-full border border-[#d9d3cd] px-4 py-3"
              disabled={busy}
              onChange={(event) => setInternalNote(event.target.value)}
              required={decision === 'REJECT'}
              value={internalNote}
            />
          </label>

          <button
            className="mt-5 min-h-12 bg-[#4a2435] px-6 font-semibold text-white disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Saving decision…' : decision === 'APPROVE' ? 'Approve professional' : 'Reject application'}
          </button>
        </form>
      ) : (
        <section className="mt-8 border-t border-[#d9d3cd] pt-8">
          <h2 className="text-2xl font-semibold">Decision recorded</h2>
          <p className="mt-3 leading-7 text-[#6b625c]">
            Reason: {application.decisionReasonCode ?? 'Not recorded'}
          </p>
          {application.decisionNote ? <p className="mt-2 leading-7">{application.decisionNote}</p> : null}
          {application.linkedUserId ? (
            <p className="mt-2 font-mono text-sm">Provisioned user: {application.linkedUserId}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6b625c]">{label}</p>
      <p className={`mt-2 leading-7 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
