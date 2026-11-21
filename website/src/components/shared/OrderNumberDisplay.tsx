export function OrderNumberDisplay({ value }: { value: string }) {
  return (
    <p className="mt-5">
      <strong className="mr-2 font-semibold text-accent-dark">Order No:</strong>
      <span className="select-all break-all font-medium text-accent-dark">
        {value}
      </span>
    </p>
  );
}
