'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Truck, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params?.id as string
  const supabase = createClient()
  const [order, setOrder] = useState<any>(null)
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return
    const load = async () => {
      try {
        const { data } = await supabase
          .from('dc_orders')
          .select('*, lead:dc_leads(*)')
          .eq('id', orderId)
          .single()

        setOrder(data)
        setLead(data?.lead || null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [orderId, supabase])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando pedido...</div>
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">Pedido não encontrado.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="gap-2 px-0">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Pedidos
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            Pedido #{order.order_number || order.external_id?.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">Origem: {order.source}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {order.production_status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Status: {order.status}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Criado em {format(new Date(order.created_at), 'dd MMM, yyyy', { locale: ptBR })}
              </span>
            </div>
            {order.total && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Valor: R$ {Number(order.total).toFixed(2)}</span>
              </div>
            )}
            {order.tracking_code && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Rastreio: {order.tracking_code}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{lead?.name || 'Sem nome'}</p>
            <p>{lead?.phone}</p>
            {lead?.email && <p>{lead.email}</p>}
            {lead?.cep && <p>CEP: {lead.cep}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Metadados</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/60 rounded-lg p-4 overflow-auto">
            {JSON.stringify(order.metadata || {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
