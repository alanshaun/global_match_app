import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Users, FileText, Briefcase, Home, Mail, BarChart3, ArrowLeft } from "lucide-react";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "products" | "jobs" | "properties" | "subscriptions">("overview");

  // Check if user is admin
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const statsQuery = trpc.admin.getStats.useQuery();
  const usersQuery = trpc.admin.getAllUsers.useQuery({ page: 1, limit: 10 });
  const productsQuery = trpc.admin.getAllProductSubmissions.useQuery({ page: 1, limit: 10 });
  const jobsQuery = trpc.admin.getAllResumeUploads.useQuery({ page: 1, limit: 10 });
  const propertiesQuery = trpc.admin.getAllPropertySubmissions.useQuery({ page: 1, limit: 10 });
  const subscriptionsQuery = trpc.admin.getAllSubscriptions.useQuery({ page: 1, limit: 10 });

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {language === "en" ? "Admin Dashboard" : "管理员仪表板"}
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            {language === "en" ? "Welcome, Admin" : "欢迎，管理员"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: "overview", label: language === "en" ? "Overview" : "概览", icon: BarChart3 },
              { id: "users", label: language === "en" ? "Users" : "用户", icon: Users },
              { id: "products", label: language === "en" ? "Products" : "产品", icon: FileText },
              { id: "jobs", label: language === "en" ? "Jobs" : "职位", icon: Briefcase },
              { id: "properties", label: language === "en" ? "Properties" : "房产", icon: Home },
              { id: "subscriptions", label: language === "en" ? "Subscriptions" : "订阅", icon: Mail },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "System Statistics" : "系统统计"}
            </h2>
            {statsQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : statsQuery.data ? (
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  { label: language === "en" ? "Total Users" : "总用户数", value: statsQuery.data.totalUsers, color: "bg-blue-100 text-blue-600" },
                  { label: language === "en" ? "Product Submissions" : "产品提交", value: statsQuery.data.totalProducts, color: "bg-green-100 text-green-600" },
                  { label: language === "en" ? "Resume Uploads" : "简历上传", value: statsQuery.data.totalResumes, color: "bg-purple-100 text-purple-600" },
                  { label: language === "en" ? "Property Submissions" : "房产提交", value: statsQuery.data.totalProperties, color: "bg-orange-100 text-orange-600" },
                  { label: language === "en" ? "Active Subscriptions" : "活跃订阅", value: statsQuery.data.activeSubscriptions, color: "bg-pink-100 text-pink-600" },
                ].map((stat, idx) => (
                  <div key={idx} className={`p-6 rounded-lg ${stat.color}`}>
                    <p className="text-sm font-medium opacity-75">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "All Users" : "所有用户"}
            </h2>
            {usersQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : usersQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">ID</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Name" : "名称"}</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Role" : "角色"}</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Created" : "创建时间"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.data.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{u.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{u.name || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email || "-"}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "Product Submissions" : "产品提交"}
            </h2>
            {productsQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : productsQuery.data ? (
              <div className="space-y-4">
                {productsQuery.data.submissions.map((p) => (
                  <div key={p.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{p.productName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{p.productDescription?.substring(0, 100)}...</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.status === "completed" ? "bg-green-100 text-green-800" :
                        p.status === "analyzing" ? "bg-yellow-100 text-yellow-800" :
                        p.status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "Resume Uploads" : "简历上传"}
            </h2>
            {jobsQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : jobsQuery.data ? (
              <div className="space-y-4">
                {jobsQuery.data.uploads.map((r) => (
                  <div key={r.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{r.targetPosition}</h3>
                        <p className="text-sm text-gray-600 mt-1">{r.targetCity}, {r.targetCountry}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        r.status === "completed" ? "bg-green-100 text-green-800" :
                        r.status === "parsing" ? "bg-yellow-100 text-yellow-800" :
                        r.status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === "properties" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "Property Submissions" : "房产提交"}
            </h2>
            {propertiesQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : propertiesQuery.data ? (
              <div className="space-y-4">
                {propertiesQuery.data.submissions.map((p) => (
                  <div key={p.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{p.submissionType}</h3>
                        <p className="text-sm text-gray-600 mt-1">{p.location}, {p.country}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.status === "completed" ? "bg-green-100 text-green-800" :
                        p.status === "analyzing" ? "bg-yellow-100 text-yellow-800" :
                        p.status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === "en" ? "Email Subscriptions" : "邮件订阅"}
            </h2>
            {subscriptionsQuery.isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : subscriptionsQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Type" : "类型"}</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Status" : "状态"}</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">{language === "en" ? "Created" : "创建时间"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionsQuery.data.subscriptions.map((s) => (
                      <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{s.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{s.subscriptionType}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {s.isActive ? (language === "en" ? "Active" : "活跃") : (language === "en" ? "Inactive" : "非活跃")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
