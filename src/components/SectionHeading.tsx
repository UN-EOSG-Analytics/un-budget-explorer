interface SectionHeadingProps {
  title: string;
  description?: string;
}

export default function SectionHeading({
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-gray-600">{description}</p>
      )}
    </div>
  );
}
