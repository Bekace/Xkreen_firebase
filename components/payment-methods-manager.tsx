"use client"

import { useState, useEffect } from "react"
import { CreditCard, Check, Trash2, Plus, Loader2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getPaymentMethods, setDefaultPaymentMethod, removePaymentMethod } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"
import { AddPaymentMethodDialog } from "@/components/add-payment-method-dialog"

interface PaymentMethod {
  id: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  isDefault: boolean
}

export function PaymentMethodsManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    setLoading(true)
    const result = await getPaymentMethods()
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else if (result.paymentMethods) {
      setPaymentMethods(result.paymentMethods)
    }
    setLoading(false)
  }

  const handleSetDefault = async (methodId: string) => {
    setActionLoading(methodId)
    const result = await setDefaultPaymentMethod(methodId)
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Default payment method updated",
      })
      await loadPaymentMethods()
    }
    setActionLoading(null)
  }

  const handleDelete = async () => {
    if (!selectedMethodId) return

    setActionLoading(selectedMethodId)
    const result = await removePaymentMethod(selectedMethodId)
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Payment method removed",
      })
      await loadPaymentMethods()
    }
    setDeleteDialogOpen(false)
    setSelectedMethodId(null)
    setActionLoading(null)
  }

  const openDeleteDialog = (methodId: string) => {
    setSelectedMethodId(methodId)
    setDeleteDialogOpen(true)
  }

  const handleAddSuccess = async () => {
    setAddDialogOpen(false)
    await loadPaymentMethods()
  }

  const getCardBrandIcon = (brand?: string) => {
    return <CreditCard className="w-5 h-5" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">No payment methods found</p>
          <p className="text-xs text-muted-foreground">Click "Add Payment Method" above to add your first card</p>
        </div>
      ) : (
        paymentMethods.map((method) => (
          <Card key={method.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getCardBrandIcon(method.brand)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{method.brand || "Card"}</span>
                    <span className="text-muted-foreground">•••• {method.last4}</span>
                    {method.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires {method.expMonth}/{method.expYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Open add dialog - in Stripe, you replace cards by adding new ones
                    setAddDialogOpen(true)
                  }}
                  disabled={!!actionLoading}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {!method.isDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(method.id)}
                    disabled={actionLoading === method.id}
                  >
                    {actionLoading === method.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set as Default"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDeleteDialog(method.id)}
                  disabled={method.isDefault || actionLoading === method.id}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      <AddPaymentMethodDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={handleAddSuccess} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Payment Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
