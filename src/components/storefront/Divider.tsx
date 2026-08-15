export function Divider() {
  return (
    <div className="relative flex h-6 w-full items-center justify-center px-6 md:px-[100px]">
      <div className="h-px w-full bg-border-default" />
      <div className="absolute flex size-5 items-center justify-center rounded-full bg-bg-page text-brand-secondary">
        ✦
      </div>
    </div>
  );
}
