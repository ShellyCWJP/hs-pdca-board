import { useState } from 'react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { RecordStatus } from '#/server/schema'
import { RECORD_STATUS_LABEL } from '#/lib/achievement'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '#/components/ui/chart'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'

const STATUS_VARIANT: Record<RecordStatus, 'outline' | 'secondary' | 'default'> = {
  planning: 'outline',
  doing: 'secondary',
  reflected: 'default',
  closed: 'default',
}

export function StatusBadge({ status }: { status: RecordStatus | null }) {
  if (!status) return <Badge variant="outline">未登録</Badge>
  return <Badge variant={STATUS_VARIANT[status]}>{RECORD_STATUS_LABEL[status]}</Badge>
}

export function YesNo({ value }: { value: boolean }) {
  return <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value ? '済' : '未'}</span>
}

export function Rate({ value }: { value: number | null }) {
  return <span className="tabular-nums">{value === null ? '—' : `${value}%`}</span>
}

const chartConfig = { rate: { label: '達成率', color: 'var(--chart-1)' } } satisfies ChartConfig

/** 授業回ごとの達成率の折れ線グラフ。rate が null の回は線を切る。 */
export function RateChart({ data }: { data: { lessonNumber: number; rate: number | null }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">まだ記録がありません</p>
  }
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="lessonNumber" tickFormatter={(n) => `第${n}回`} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(n) => `第${n}回`} />} />
        <Line dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} dot connectNulls={false} />
      </LineChart>
    </ChartContainer>
  )
}

/** 確認ダイアログ付きボタン */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  variant = 'default',
  size,
  disabled,
}: {
  title: string
  description?: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await onConfirm()
              setOpen(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

export function lessonLabel(l: { number: number; date: string }) {
  return `第${l.number}回（${l.date}）`
}
