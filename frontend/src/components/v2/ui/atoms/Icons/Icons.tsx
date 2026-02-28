import { ArrowUpRight } from "lucide-react"

interface IconProps extends Readonly<React.SVGProps<SVGSVGElement>> {
  readonly className?: string
}

export function ArrowUpRightIcon({ className, size = 24, ...props }: IconProps) {
  return <ArrowUpRight className={className} size={size} {...props} />
}

export { ArrowUpRight } from "lucide-react"
