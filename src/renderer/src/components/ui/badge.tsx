import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.12em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        secondary: 'border-border/80 bg-secondary/80 text-secondary-foreground',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

type BadgeProps = React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
