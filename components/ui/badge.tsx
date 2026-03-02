import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary/15 text-primary hover:bg-primary/20 dark:bg-primary/25 dark:text-primary-foreground",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/25 dark:text-destructive-foreground",
                outline: "border-border/80 text-foreground",
                success: "border-transparent bg-green-500/12 text-green-700 hover:bg-green-500/20 dark:bg-green-500/25 dark:text-green-300",
                warning: "border-transparent bg-yellow-500/14 text-yellow-700 hover:bg-yellow-500/20 dark:bg-yellow-500/22 dark:text-yellow-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
