import type { OrderStatus } from "@loopice/shared";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "secondary",
  CONFIRMED: "outline",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{status.replace("_", " ")}</Badge>;
}
