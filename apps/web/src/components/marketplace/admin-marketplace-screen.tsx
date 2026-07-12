'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AdminMasterService,
  AdminServiceRequest,
  AdminVerificationApplication,
} from '@beautyathome/marketplace';

import { RoleGate } from '@/components/role-gate';
import {
  changeMasterServiceStatus,
  decideServiceRequest,
  decideVerification,
  listAdminServiceRequests,
  listAdminServices,
  listVerificationApplications,
  startServiceRequestReview,
  startVerificationReview,
} from '@/lib/api/marketplace-client';

type Mode = 'services' | 'requests' | 'professionals';

export function AdminMarketplaceScreen({ mode }: Readonly<{ mode: Mode }>) {
  const [services, setServices] = useState<AdminMasterService[]>([]);
  const [requests, setRequests] = useState<AdminServiceRequest[]>([]);
  const [applications, setApplications] = useState<AdminVerificationApplication[]>([]);
  const [search, setSearch] = useState('');
  const [resolutionServiceId, setResolutionServiceId] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (mode === 'services') {
      const page = await listAdminServices({
        search: search.length >= 2 ? search : undefined,
        sort: 'createdAtDesc',
        limit: 100,
      });
      setServices(page.data);
    } else if (mode === 'requests') {
      const [page, servicePage] = await Promise.all([
        listAdminServiceRequests({
          search: search.length >= 2 ? search : undefined,
          sort: 'updatedAtDesc',
          limit: 100,
        }),
        listAdminServices({ status: 'ACTIVE', sort: 'nameAsc', limit: 100 }),
      ]);
      setRequests(page.data);
      setServices(servicePage.data);
      setResolutionServiceId((current) => current || servicePage.data[0]?.id || '');
    } else {
      const page = await listVerificationApplications();
      setApplications(page.data);
    }
  }, [mode, search]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => void load().catch(() => setMessage('Unable to load the admin queue.')),
      200,
    );
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function toggleService(service: AdminMasterService) {
    setBusyId(service.id);
    try {
      const activate = service.status !== 'ACTIVE';
      await changeMasterServiceStatus(service.id, {
        action: activate ? 'REACTIVATE' : 'DEACTIVATE',
        reasonCode: activate ? 'ADMIN_REACTIVATION' : 'ADMIN_DEACTIVATION',
        reason: activate
          ? 'Reactivated after administrative review'
          : 'Deactivated after administrative review',
        expectedVersion: service.version,
      });
      setMessage(`Service ${activate ? 'reactivated' : 'deactivated'}.`);
      await load();
    } catch {
      setMessage(
        'The service status could not be changed. A recent admin verification may be required.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function reviewRequest(
    request: AdminServiceRequest,
    decision: 'REJECT' | 'APPROVE' | 'START',
  ) {
    setBusyId(request.id);
    try {
      if (decision === 'START') {
        await startServiceRequestReview(request.id, { expectedVersion: request.version });
      } else if (decision === 'APPROVE') {
        const masterServiceId = services.find((service) => service.id === resolutionServiceId)?.id;
        if (!masterServiceId) {
          setMessage('Select the approved master service that resolves this request.');
          return;
        }
        await decideServiceRequest(request.id, {
          decision: 'APPROVE',
          resolution: { mode: 'LINK_EXISTING', masterServiceId },
          reasonCode: 'LINKED_TO_APPROVED_SERVICE',
          internalNote: 'Linked to an existing approved master service after catalogue review.',
          expectedVersion: request.version,
        });
      } else {
        await decideServiceRequest(request.id, {
          decision: 'REJECT',
          reasonCode: 'NOT_IN_CATALOGUE_SCOPE',
          userMessage: 'This request is not currently supported by the catalogue.',
          internalNote: 'Rejected during marketplace catalogue review.',
          expectedVersion: request.version,
        });
      }
      setMessage(
        decision === 'START'
          ? 'Request moved under review.'
          : decision === 'APPROVE'
            ? 'Request approved and linked.'
            : 'Request rejected with a customer-safe reason.',
      );
      await load();
    } catch {
      setMessage('The request action failed. Refresh the queue and retry.');
    } finally {
      setBusyId('');
    }
  }

  async function reviewApplication(
    application: AdminVerificationApplication,
    action: 'START' | 'APPROVE' | 'CHANGES',
  ) {
    setBusyId(application.id);
    try {
      if (action === 'START') {
        await startVerificationReview(application.id, { expectedVersion: application.version });
      } else if (action === 'APPROVE') {
        await decideVerification(application.id, {
          decision: 'APPROVE',
          eligibilityPolicyVersionReviewed: application.eligibilityPolicyVersionAcknowledged,
          reasonCode: 'VERIFICATION_APPROVED',
          internalNote: 'Evidence and female-only launch eligibility reviewed.',
          expectedVersion: application.version,
        });
      } else {
        await decideVerification(application.id, {
          decision: 'REQUEST_CHANGES',
          reasonCode: 'CORRECTION_REQUIRED',
          userMessage: 'Please correct or complete the submitted profile evidence.',
          internalNote: 'Application returned for corrections.',
          expectedVersion: application.version,
        });
      }
      setMessage('Verification queue updated.');
      await load();
    } catch {
      setMessage('The verification action failed. A recent admin verification may be required.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <RoleGate allowedRoles={['ADMIN']} signInPath="/admin/sign-in">
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Admin marketplace controls
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {mode === 'services'
            ? 'Service management'
            : mode === 'requests'
              ? 'Service-request review'
              : 'Professional verification queue'}
        </h1>
        {mode !== 'professionals' ? (
          <label className="mt-6 block max-w-md text-sm font-medium">
            Search
            <input
              className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name"
              type="search"
              value={search}
            />
          </label>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900" role="status">
            {message}
          </p>
        ) : null}

        {mode === 'services' ? (
          <section className="mt-8 space-y-3" aria-label="Master services">
            {services.map((service) => (
              <article
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={service.id}
              >
                <div>
                  <h2 className="font-semibold">{service.name}</h2>
                  <p className="text-sm text-zinc-600">
                    {service.category.name} · {service.defaultDurationMinutes} min ·{' '}
                    {service.status}
                  </p>
                  <p className="mt-1 text-sm">
                    {service.cityPricePolicies.length} city price{' '}
                    {service.cityPricePolicies.length === 1 ? 'policy' : 'policies'}
                  </p>
                </div>
                <button
                  className="min-h-11 rounded-md border px-4 font-semibold disabled:opacity-50"
                  disabled={busyId === service.id}
                  onClick={() => void toggleService(service)}
                  type="button"
                >
                  {service.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                </button>
              </article>
            ))}
          </section>
        ) : null}

        {mode === 'requests' ? (
          <section className="mt-8 space-y-3" aria-label="Service requests">
            <label className="block max-w-lg text-sm font-medium">
              Approved master service for request resolution
              <select
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                onChange={(event) => setResolutionServiceId(event.target.value)}
                value={resolutionServiceId}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            {requests.map((request) => (
              <article className="rounded-xl border p-4" key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{request.proposedName}</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {request.status} · submitted{' '}
                      {new Date(request.submittedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {request.status === 'SUBMITTED' ? (
                      <button
                        className="min-h-11 rounded-md border px-3"
                        disabled={busyId === request.id}
                        onClick={() => void reviewRequest(request, 'START')}
                        type="button"
                      >
                        Start review
                      </button>
                    ) : null}
                    {request.status === 'UNDER_REVIEW' ? (
                      <>
                        <button
                          className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                          disabled={busyId === request.id || !resolutionServiceId}
                          onClick={() => void reviewRequest(request, 'APPROVE')}
                          type="button"
                        >
                          Approve and link
                        </button>
                        <button
                          className="min-h-11 rounded-md border border-red-300 px-3 text-red-700"
                          disabled={busyId === request.id}
                          onClick={() => void reviewRequest(request, 'REJECT')}
                          type="button"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6">{request.proposedDescription}</p>
                {request.userSafeDecisionReason ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Decision: {request.userSafeDecisionReason}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {mode === 'professionals' ? (
          <section className="mt-8 space-y-3" aria-label="Verification applications">
            {applications.map((application) => (
              <article className="rounded-xl border p-4" key={application.id}>
                <h2 className="font-semibold">
                  Professional {application.professionalId.slice(0, 8)}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {application.status} · policy {application.eligibilityPolicyVersionAcknowledged}
                </p>
                {application.userSafeDecisionReason ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Previous feedback: {application.userSafeDecisionReason}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {application.status === 'SUBMITTED' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      disabled={busyId === application.id}
                      onClick={() => void reviewApplication(application, 'START')}
                      type="button"
                    >
                      Start review
                    </button>
                  ) : null}
                  {application.status === 'UNDER_REVIEW' ? (
                    <>
                      <button
                        className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                        disabled={busyId === application.id}
                        onClick={() => void reviewApplication(application, 'APPROVE')}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="min-h-11 rounded-md border px-3"
                        disabled={busyId === application.id}
                        onClick={() => void reviewApplication(application, 'CHANGES')}
                        type="button"
                      >
                        Request changes
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </RoleGate>
  );
}
