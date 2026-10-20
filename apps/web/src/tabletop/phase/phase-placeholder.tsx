export function PhasePlaceholder({
  label,
  testId,
}: {
  readonly label: string;
  readonly testId?: string;
}) {
  return (
    <div className="tt-phase-ph" data-testid={testId}>
      <span className="tt-phase-ph__tag">占位</span>
      <p>{label}</p>
    </div>
  );
}
