import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SmartMatchLogo } from "@/components/SmartMatchLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Briefcase, FileText, Home as HomeIcon, Sparkles, Globe, ChevronRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{language === "en" ? "Loading..." : "加载中..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <SmartMatchLogo className="w-8 h-8" />
              <span className="text-2xl font-bold text-gray-900">
                <span className="text-3xl font-black text-blue-600">S</span>martMatch
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition">How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <Globe className="w-4 h-4" />
                {language === "en" ? "中文" : "EN"}
              </button>
              <a href={getLoginUrl()}>
                <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50">
                  {t("nav.login")}
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  Start Free
                </Button>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Intelligent Matching
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Find Your Perfect Match
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  SmartMatch uses advanced AI to intelligently match you with global opportunities - whether you're looking for buyers, jobs, or investment properties.
                </p>
                <div className="flex gap-4">
                  <a href={getLoginUrl()}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 py-6 text-lg">
                      Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </a>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50 px-8 py-6 text-lg">
                    Watch Demo
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-6">✓ No credit card required • ✓ Free forever plan • ✓ 24/7 support</p>
              </div>
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-gray-600">Interactive Demo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Three Powerful Features</h2>
              <p className="text-xl text-gray-600">Everything you need to find opportunities worldwide</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div
                className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setActiveFeature(0)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Product Buyer Matching</h3>
                <p className="text-gray-600 mb-6">
                  Upload your product, and AI intelligently matches you with global buyers, distributors, and partners. Get contact information and personalized cold emails.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center gap-2 hover:gap-3 transition">
                  Learn more <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Feature 2 */}
              <div
                className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setActiveFeature(1)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Job Auto Search</h3>
                <p className="text-gray-600 mb-6">
                  Upload your resume and search criteria. AI finds matching jobs from global platforms with real links and company information.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center gap-2 hover:gap-3 transition">
                  Learn more <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Feature 3 */}
              <div
                className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setActiveFeature(2)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <HomeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Real Estate Investment</h3>
                <p className="text-gray-600 mb-6">
                  Find investment properties or buyers worldwide. AI analyzes your criteria and matches you with opportunities from global platforms.
                </p>
                <a href="#" className="text-blue-600 font-medium flex items-center gap-2 hover:gap-3 transition">
                  Learn more <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-xl text-gray-600">Three simple steps to find your opportunities</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Upload Your Info</h3>
                <p className="text-gray-600">
                  Share your product, resume, or property requirements. Support for documents, images, and text descriptions.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI Analysis</h3>
                <p className="text-gray-600">
                  Our advanced AI analyzes your information and searches global platforms for matches in real-time.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Get Results</h3>
                <p className="text-gray-600">
                  Receive ranked matches with contact information, links, and AI-generated outreach messages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Find Your Perfect Match?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of users who are already finding opportunities with SmartMatch
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-white text-blue-600 hover:bg-gray-100 border-0 px-8 py-6 text-lg font-semibold">
                Start Free Today <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <SmartMatchLogo className="w-6 h-6" />
                  <span className="font-bold text-white">SmartMatch</span>
                </div>
                <p className="text-sm">AI-powered intelligent matching platform</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">Features</a></li>
                  <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">About</a></li>
                  <li><a href="#" className="hover:text-white transition">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                  <li><a href="#" className="hover:text-white transition">Terms</a></li>
                  <li><a href="#" className="hover:text-white transition">Cookies</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              <p>&copy; 2026 SmartMatch. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated user dashboard
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SmartMatchLogo className="w-8 h-8" />
            <span className="text-2xl font-bold text-gray-900">
              <span className="text-3xl font-black text-blue-600">S</span>martMatch
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === "en" ? "zh" : "en")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <Globe className="w-4 h-4" />
              {language === "en" ? "中文" : "EN"}
            </button>
            <div className="text-sm text-gray-600">
              Welcome, {user?.name || "User"}
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">Select a Feature</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div
            className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/products")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Product Buyer Matching</h3>
            <p className="text-gray-600 mb-6">
              Upload your product and find global buyers, distributors, and partners.
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              Enter <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Feature 2 */}
          <div
            className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/jobs")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Job Auto Search</h3>
            <p className="text-gray-600 mb-6">
              Upload your resume and find matching jobs worldwide.
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              Enter <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Feature 3 */}
          <div
            className="p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/properties")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <HomeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Real Estate Investment</h3>
            <p className="text-gray-600 mb-6">
              Find investment properties or buyers worldwide.
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              Enter <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
