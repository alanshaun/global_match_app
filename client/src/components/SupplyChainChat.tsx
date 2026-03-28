import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Upload, Paperclip } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{ type: 'pdf' | 'link' | 'text'; content: string }>;
}

interface SearchIntent {
  productDescription: string;
  targetCountries: string[];
  buyerCount: number;
  buyerTypes: string[];
  productCategory: string;
  attachments?: Array<{ type: 'pdf' | 'link'; content: string }>;
}

export function SupplyChainChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeIntentMutation = trpc.supplyChain.analyzeIntent.useMutation();
  const searchBuyersMutation = trpc.supplyChain.searchBuyers.useMutation();

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初始化欢迎消息
  useEffect(() => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: '👋 欢迎来到全球供应链匹配平台！\n\n请告诉我关于您的产品或公司的信息，例如：\n• 您的产品是什么？\n• 目标市场在哪些国家？\n• 您想找多少家买家？\n• 您想要什么类型的买家？（分销商、进口商、零售商等）\n\n您也可以上传 PDF 文件或提供链接来帮助我更好地了解您的产品。',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用 Kimi AI 分析用户意图
      const intentResponse = await analyzeIntentMutation.mutateAsync({
        userInput: input,
        previousContext: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      // 添加 AI 响应
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: intentResponse.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 如果识别到完整的搜索意图，自动触发搜索
      if (intentResponse.isComplete) {
        setSearchIntent(intentResponse.intent);
        await performSearch(intentResponse.intent);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ 处理请求时出错，请重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (intent: SearchIntent) => {
    try {
      const searchingMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '🔍 正在搜索买家...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, searchingMessage]);

      const results = await searchBuyersMutation.mutateAsync({
        productDescription: intent.productDescription,
        targetCountries: intent.targetCountries,
        buyerCount: intent.buyerCount,
        buyerTypes: intent.buyerTypes,
        productCategory: intent.productCategory,
      });

      const resultMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ 找到 ${results.length} 家匹配的买家！\n\n${results
          .map(
            (buyer, index) =>
              `${index + 1}. **${buyer.name}** (${buyer.country})\n   网站: ${buyer.website || '未知'}\n   电话: ${buyer.phone || '未知'}\n   匹配度: ${buyer.matchingScore || 0}%`
          )
          .join('\n\n')}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), resultMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '❌ 搜索失败，请重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: 实现文件上传逻辑
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `📎 上传了文件: ${file.name}`,
      timestamp: new Date(),
      attachments: [{ type: 'pdf', content: file.name }],
    };

    setMessages((prev) => [...prev, userMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  {message.attachments.map((att, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {att.content}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在思考...</span>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <label className="flex-shrink-0">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                input?.click();
              }}
            >
              <Upload className="w-4 h-4" />
            </Button>
          </label>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="描述您的产品或公司信息..."
            disabled={isLoading}
            className="flex-1"
          />

          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
