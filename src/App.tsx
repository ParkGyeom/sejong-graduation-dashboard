import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>컴포넌트 확인</CardTitle>
          <CardDescription>잘 깔렸는지 보는 테스트 화면</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" placeholder="입력해보세요" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="agree" />
            <Label htmlFor="agree">동의합니다</Label>
          </div>
          <div className="flex items-center gap-2">
            <Badge>뱃지</Badge>
            <Badge variant="secondary">보조</Badge>
          </div>
          <Button>확인</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App