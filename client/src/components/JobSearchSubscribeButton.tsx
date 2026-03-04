import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Bell, CheckCircle } from "lucide-react";

interface JobSearchSubscribeButtonProps {
  targetPosition: string;
  targetCity: string;
  targetCountry?: string;
  className?: string;
}

export function JobSearchSubscribeButton({
  targetPosition,
  targetCity,
  targetCountry = "US",
  className = "",
}: JobSearchSubscribeButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchName, setSearchName] = useState(
    `${targetPosition} in ${targetCity}`
  );
  const [minMatchScore, setMinMatchScore] = useState("70");
  const [notificationFrequency, setNotificationFrequency] = useState("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const user = null; // TODO: 从 trpc.auth.me.useQuery() 获取用户
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // 检查是否已订阅
  const { data: subscriptionStatus } = trpc.jobSubscriptions.checkSubscription.useQuery(
    {
      targetPosition,
      targetCity,
      targetCountry,
    },
    {
      enabled: !!user,
    }
  );

  // 创建订阅
  const createSubscription = trpc.jobSubscriptions.createSubscription.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setMessage(result.message);
        setIsSubscribed(true);
        utils.jobSubscriptions.checkSubscription.invalidate();
        setTimeout(() => {
          setOpen(false);
          setMessage("");
        }, 2000);
      } else {
        setMessage(result.message);
      }
    },
    onError: (error) => {
      setMessage(`错误: ${error.message}`);
    },
  });

  useEffect(() => {
    if (subscriptionStatus?.isSubscribed) {
      setIsSubscribed(true);
    }
  }, [subscriptionStatus]);

  const handleSubscribe = async () => {
    if (!user) {
      setLocation("/");
      return;
    }

    setIsLoading(true);
    try {
      await createSubscription.mutateAsync({
        searchName,
        targetPosition,
        targetCity,
        targetCountry,
        minMatchScore: parseInt(minMatchScore),
        notificationFrequency: notificationFrequency as "daily" | "weekly" | "immediately",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <Button
        disabled
        className="gap-2 bg-green-600 hover:bg-green-600"
      >
        <CheckCircle className="w-4 h-4" />
        已订阅
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => {
          if (!user) {
            setLocation("/");
            return;
          }
          setOpen(true);
        }}
        className={`gap-2 ${className}`}
      >
        <Bell className="w-4 h-4" />
        订阅此搜索
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>订阅职位搜索</DialogTitle>
            <DialogDescription>
              当有新职位匹配您的搜索条件时，我们将通过邮件通知您
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 搜索名称 */}
            <div className="space-y-2">
              <Label htmlFor="searchName">搜索名称</Label>
              <Input
                id="searchName"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="例如: Senior Developer in San Francisco"
              />
            </div>

            {/* 最低匹配度 */}
            <div className="space-y-2">
              <Label htmlFor="minMatchScore">最低匹配度 (%)</Label>
              <Input
                id="minMatchScore"
                type="number"
                min="0"
                max="100"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                只有匹配度达到或超过此值的职位才会被推送
              </p>
            </div>

            {/* 通知频率 */}
            <div className="space-y-2">
              <Label htmlFor="frequency">通知频率</Label>
              <Select value={notificationFrequency} onValueChange={setNotificationFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">立即通知</SelectItem>
                  <SelectItem value="daily">每天一次</SelectItem>
                  <SelectItem value="weekly">每周一次</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 搜索条件摘要 */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-semibold text-blue-900 mb-2">搜索条件：</p>
              <ul className="text-blue-800 space-y-1">
                <li>• 职位: {targetPosition}</li>
                <li>• 城市: {targetCity}</li>
                <li>• 国家: {targetCountry}</li>
              </ul>
            </div>

            {/* 消息提示 */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes("成功") || message.includes("已订阅")
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? "订阅中..." : "确认订阅"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
