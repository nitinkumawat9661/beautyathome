'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiErrorMessage, listProfessionalApplications } from '@/lib/api/client';

type ApplicationPage = Awaited<ReturnType<typeof listProfessionalApplications>>;
type ApplicationCursor = NonNullable<ApplicationPage['pageInfo']['nextCursor']>;
type StatusFilter = '' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export function ProfessionalApplicationsList() {
  const [status, setStatus] = useState<StatusFilter>('SUBMITTED');
  const [page, setPage] = useState<ApplicationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listProfessionalApplications({
      status: status || undefined,
      limit: 25,
    })
      .then((result) => {
        if (!active) return;
        setPage(result);
        setError(null);
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  async function loadMore(after: ApplicationCursor): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const result = await listProfessionalApplications({
        status: status || undefined,
        after,
        limit: 25,
      });
      setPage((current) =>
        current ? { ...result, data: [...current.data, ...result.data] } : result,
      );
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#d9d3cd] pb-7 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b625c]">
            Professional onboarding
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
            Application review queue
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#6b625c]">
            Review submitted details before granting professional sign-in access.
          </p>
        </div>
        <label className="text-sm font-semibold">
          Status
          <select
            className="ml-3 min-h-10 border border-[#d9d3cd] bg-white px-3"
            onChange={(event) => {
              setLoading(true);
              setError(null);
              setStatus(event.target.value as StatusFilter);
            }}
            value={status}
          >
            <option value="">All</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-6 border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
      ) : null}

      <div className="mt-7 overflow-x-auto border border-[#d9d3cd] bg-white">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="border-b border-[#d9d3cd] bg-[#f2efec] text-xs uppercase tracking-wider text-[#6b625c]">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {page?.data.map((application) => (
              <tr className="border-b border-[#e7e2dd] last:border-b-0" key={application.id}>
                <td className="px-4 py-4 font-semibold">{application.fullName}</td>
                <td className="px-4 py-4 font-mono">{application.maskedMobileNumber}</td>
                <td className="px-4 py-4">{application.city}</td>
                <td className="px-4 py-4">{application.experienceBand.replaceAll('_', ' ')}</td>
                <td className="px-4 py-4">{application.status.replaceAll('_', ' ')}</td>
                <td className="px-4 py-4">
                  {new Date(application.createdAt).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-4">
                  <Link
                    className="font-semibold text-[#4a2435] underline underline-offset-4"
                    href={`/professional-applications/${application.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && page?.data.length === 0 ? (
          <p className="p-8 text-center text-[#6b625c]">No applications match this status.</p>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {page?.pageInfo.nextCursor ? (
          <button
            className="min-h-11 border border-[#4a2435] px-5 font-semibold text-[#4a2435] disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadMore(page.pageInfo.nextCursor as ApplicationCursor)}
            type="button"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
        {loading ? <p className="text-sm text-[#6b625c]">Loading applications…</p> : null}
      </div>
    </main>
  );
}
