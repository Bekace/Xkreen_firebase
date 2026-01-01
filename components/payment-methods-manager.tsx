"use client"

import { useState, useEffect } from "react"
import { CreditCard, Check, Trash2, Plus, Loader2 } from "lucide-react"
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

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4">No payment methods found</p>
        <Button size="sm" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Add cards during checkout</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {paymentMethods.map((method) => (
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
      ))}

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
