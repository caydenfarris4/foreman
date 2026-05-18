import { NewCohortForm } from "./new-cohort-form";

export default function AdminNewCohortPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="type-cap text-graphite">NEW COHORT</p>
        <h1 className="type-h1 mt-1 text-ink">Create a cohort</h1>
        <p className="type-body mt-2 text-graphite">
          Sessions auto-generate weekly from the start date — assumes
          Saturday 10am Mountain Time, the way the brief specifies. You
          can edit titles, mentors, and prep materials after creation.
        </p>
      </div>
      <NewCohortForm />
    </div>
  );
}
