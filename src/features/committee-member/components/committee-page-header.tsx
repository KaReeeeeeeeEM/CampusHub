import { FadeIn } from "@/components/motion/fade-in";

type CommitteePageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function CommitteePageHeader({
  eyebrow,
  title,
  description,
  action,
}: CommitteePageHeaderProps) {
  return (
    <FadeIn>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </FadeIn>
  );
}
