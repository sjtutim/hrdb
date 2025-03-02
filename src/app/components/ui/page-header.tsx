import { cn } from "@/app/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({
  heading,
  description,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 pb-8", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
          {description && (
            <p className="text-lg text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
} 