"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import { plansQuery } from "@/queries/plan.queries";
import type { ICouponFormValues } from "@/zod/coupon.validation";
import { getNewCouponDefaults } from "./couponForm.defaults";
import CouponForm from "./CouponForm";

const CreateCouponDialog = () => {
  const { data: plansResponse } = useQuery(plansQuery());
  // Defaults are computed when the dialog opens (an event), so "today" is
  // never read during render and each open starts from the current date.
  const [defaults, setDefaults] = useState<ICouponFormValues | null>(null);

  return (
    <FormDialog
      open={defaults !== null}
      onOpenChange={(open) => setDefaults(open ? getNewCouponDefaults(new Date()) : null)}
      title="Create coupon"
      description="A discount code for subscription plans."
      trigger={
        <Button>
          <Plus aria-hidden="true" /> Create coupon
        </Button>
      }
    >
      {defaults && <CouponForm defaultValues={defaults} plans={plansResponse?.data ?? []} onDone={() => setDefaults(null)} />}
    </FormDialog>
  );
};

export default CreateCouponDialog;
