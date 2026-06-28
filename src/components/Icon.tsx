import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tamanhos padronizados de ícones (px) e stroke-width único.
 * Use SEMPRE este wrapper em vez de chamar o componente Lucide cru
 * para manter consistência visual em toda a aplicação.
 */
export const ICON_SIZE = { xs: 12, sm: 14, md: 18, lg: 22, xl: 28 } as const;
export const ICON_STROKE = 2.25;

export type IconVariant = keyof typeof ICON_SIZE;

export function Icon({
  as: Component,
  variant = "md",
  size,
  strokeWidth = ICON_STROKE,
  className,
  ...rest
}: { as: LucideIcon; variant?: IconVariant } & Omit<LucideProps, "ref">) {
  return (
    <Component
      size={size ?? ICON_SIZE[variant]}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}