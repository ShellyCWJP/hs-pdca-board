import type { RecordDetail } from '#/server/fns/records'
import { DO_STATUS_LABEL } from '#/lib/achievement'
import { Rate, StatusBadge, lessonLabel } from '#/components/pdca'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'

/** レコードの読み取り専用表示。教員の記録詳細と、closed 状態の生徒画面で共用する。 */
export function RecordSummary({ record, showStudent }: { record: RecordDetail; showStudent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {showStudent && <span className="text-base font-semibold">{record.student.name}</span>}
      <span>{lessonLabel(record.lesson)}</span>
      <StatusBadge status={record.status} />
      <span>
        達成率 <Rate value={record.achievementRate} />
      </span>
    </div>
  )
}

export function RecordBody({ record }: { record: RecordDetail }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan と Do</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Plan（目標・予定）</TableHead>
                  <TableHead>Do（実施内容・結果）</TableHead>
                  <TableHead className="w-24">達成</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.planItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-pre-wrap align-top">{item.planText}</TableCell>
                    <TableCell className="whitespace-pre-wrap align-top text-muted-foreground">{item.doText ?? '—'}</TableCell>
                    <TableCell className="align-top">{item.doStatus ? DO_STATUS_LABEL[item.doStatus] : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {record.extraDos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan に無かった実施内容</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {record.extraDos.map((d) => (
                <li key={d.id} className="whitespace-pre-wrap">{d.doText}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Check / Act（振り返り・次回の課題）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{record.checkAct ?? <span className="text-muted-foreground">未入力</span>}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function FeedbackCard({ advice }: { advice: string }) {
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle>教員フィードバック</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{advice}</p>
      </CardContent>
    </Card>
  )
}
