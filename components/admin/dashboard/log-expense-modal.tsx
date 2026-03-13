"use client";

import { type ReactElement, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus, Loader2 } from "lucide-react";
import { postBusinessExpense } from "@/actions/finance";
import { EXPENSE_CATEGORIES } from "@/lib/finance-categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export function LogExpenseModal({ trigger }: { trigger?: ReactElement }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(METHODS[0].value);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaymentMethod(METHODS[0].value);
  };

  const handleSubmit = () => {
    const normalizedAmount = Number.parseFloat(amount);
    const normalizedDescription = description.trim();

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      toast.error("Enter a valid expense amount");
      return;
    }

    if (!normalizedDescription) {
      toast.error("Expense description is required");
      return;
    }

    startTransition(async () => {
      const result = await postBusinessExpense({
        amount: normalizedAmount,
        description: normalizedDescription,
        category,
        payment_method: paymentMethod,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Expense logged successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-all-expenses"] }),
      ]);
      setOpen(false);
      resetForm();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !isPending) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Log Expense
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Log Business Expense</DialogTitle>
          <DialogDescription>
            Add a direct company expense entry to the treasury ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What was paid and why?"
              className="min-h-[110px]"
              maxLength={300}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
