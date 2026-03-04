import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export function EmailSubscriptionFooter() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<"all" | "job_alerts" | "product_matches" | "property_updates">("all");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const subscribeMutation = trpc.subscriptions.subscribe.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setEmail("");
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to subscribe");
      setTimeout(() => setError(""), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = getLoginUrl();
      return;
    }

    if (!email) {
      setError(language === "en" ? "Please enter your email" : "请输入您的邮箱");
      return;
    }

    subscribeMutation.mutate({
      email,
      subscriptionType,
    });
  };

  return (
    <div className="bg-blue-50 border-t border-gray-200 py-12 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* 左侧：说明文字 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
              <h3 className="text-2xl font-bold text-gray-900">
                {language === "en" ? "Stay Updated" : "保持更新"}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {language === "en"
                ? "Subscribe to get the latest job opportunities, product matches, and real estate updates delivered to your inbox."
                : "订阅以获取最新的职位机会、产品匹配和房产更新。"
              }
            </p>
            <p className="text-sm text-gray-500">
              {language === "en"
                ? "Only for registered users. Unsubscribe anytime."
                : "仅限已注册用户。随时可以取消订阅。"
              }
            </p>
          </div>

          {/* 右侧：订阅表单 */}
          <div>
            {submitted ? (
              <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-300 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {language === "en" ? "Subscribed!" : "已订阅！"}
                  </p>
                  <p className="text-sm text-green-800">
                    {language === "en"
                      ? "Check your email for confirmation"
                      : "请检查您的邮箱以获取确认"
                    }
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder={language === "en" ? "Enter your email" : "输入您的邮箱"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!isAuthenticated}
                  />
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg px-6 py-3 font-medium whitespace-nowrap"
                    disabled={subscribeMutation.isPending || !isAuthenticated}
                  >
                    {subscribeMutation.isPending
                      ? (language === "en" ? "Subscribing..." : "订阅中...")
                      : (language === "en" ? "Subscribe" : "订阅")}
                  </Button>
                </div>

                {/* 订阅类型选择 */}
                {isAuthenticated && (
                  <div className="flex gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="subscriptionType"
                        value="all"
                        checked={subscriptionType === "all"}
                        onChange={(e) => setSubscriptionType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{language === "en" ? "All" : "全部"}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="subscriptionType"
                        value="job_alerts"
                        checked={subscriptionType === "job_alerts"}
                        onChange={(e) => setSubscriptionType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{language === "en" ? "Jobs" : "职位"}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="subscriptionType"
                        value="product_matches"
                        checked={subscriptionType === "product_matches"}
                        onChange={(e) => setSubscriptionType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{language === "en" ? "Products" : "产品"}</span>
                    </label>
                  </div>
                )}

                {!isAuthenticated && (
                  <p className="text-sm text-gray-600 bg-blue-100 p-3 rounded-lg">
                    {language === "en"
                      ? "Please sign in to subscribe"
                      : "请登录以订阅"
                    }
                  </p>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
