"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { Button } from "@/components/ui/button";
import { plansQuery } from "@/queries/plan.queries";
import type { ICouponFormValues } from "@/zod/coupon.validation";
import { getNewCouponDefaults } from "./couponForm.defaults";
import CouponForm from "./CouponForm";

// Self-contained (owns its trigger), so the page can drop it into the header.
const CreateCouponButton = () => {
  const { data: plansResponse } = useQuery(plansQuery());
  // Defaults are computed when the drawer opens (an event), so "today" is
  // never read during render and each open starts from the current date.
  const [defaults, setDefaults] = useState<ICouponFormValues | null>(null);

  return (
    <FormDrawer
      open={defaults !== null}
      onOpenChange={(open) => setDefaults(open ? getNewCouponDefaults(new Date()) : null)}
      title="New coupon"
      width="sm"
      trigger={
        <Button size="lg" className="font-semibold shadow-button">
          New coupon
        </Button>
      }
    >
      {defaults && <CouponForm defaultValues={defaults} plans={plansResponse?.data ?? []} onDone={() => setDefaults(null)} />}
    </FormDrawer>
  );
};

export default CreateCouponButton;
