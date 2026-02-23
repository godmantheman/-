/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, History, User, ChevronRight, CheckCircle2, AlertCircle, Loader2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFoodImage, getDailyRecommendation } from './services/geminiService';

interface UserProfile {
  age?: number;
  condition?: string;
}

interface FoodLog {
  id: number;
  image_url: string;
  food_name: string;
  analysis: string;
  is_safe: boolean;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'analyze' | 'history' | 'profile'>('home');
  const [profile, setProfile] = useState<UserProfile>({});
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (profile.age && logs.length > 0) {
      fetchRecommendation();
    }
  }, [profile, logs]);

  const fetchProfile = async () => {
    const res = await fetch('/api/profile');
    const data = await res.json();
    setProfile(data);
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    const data = await res.json();
    setLogs(data);
  };

  const fetchRecommendation = async () => {
    try {
      const data = await getDailyRecommendation(logs.slice(0, 5), profile.age!, profile.condition!);
      setRecommendation(data.recommendation);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setActiveTab('home');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile.age || !profile.condition) {
      alert("먼저 내 정보에서 나이와 건강 상태를 입력해주세요!");
      setActiveTab('profile');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const result = await analyzeFoodImage(base64, profile.age!, profile.condition!);
        setAnalysisResult(result);
        
        // Save to logs
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: base64,
            food_name: result.foodName,
            analysis: result.analysis + "\n\n팁: " + result.tips,
            is_safe: result.isSafe,
          }),
        });
        fetchLogs();
      } catch (error) {
        console.error(error);
        alert("분석 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderHome = () => (
    <div className="space-y-6">
      <header className="py-4">
        <h1 className="text-4xl font-bold text-[#5A5A40]">안녕하세요, 할머니!</h1>
        <p className="text-xl text-[#8A8A70] mt-2">오늘도 건강한 하루 보내세요.</p>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-[#F2F0E4] border-none"
      >
        <h3 className="text-lg font-bold text-[#5A5A40] mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> 오늘의 건강 조언
        </h3>
        <p className="text-2xl font-serif leading-relaxed text-[#2D2D2D]">
          {recommendation || (profile.age ? "식사 기록을 남기시면 맞춤 조언을 드릴게요!" : "내 정보에서 나이와 상태를 먼저 알려주세요.")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex items-center justify-center gap-4 h-32"
        >
          <Camera className="w-10 h-10" />
          <span className="text-2xl">음식 사진 찍기</span>
        </button>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-[#5A5A40]">최근 먹은 음식</h3>
        <div className="space-y-3">
          {logs.slice(0, 3).map((log) => (
            <div key={log.id} className="card flex items-center gap-4 p-4">
              <img src={log.image_url} className="w-20 h-20 rounded-2xl object-cover" alt={log.food_name} />
              <div className="flex-1">
                <h4 className="text-xl font-bold">{log.food_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {log.is_safe ? (
                    <span className="text-green-600 flex items-center gap-1 text-lg font-medium">
                      <CheckCircle2 className="w-4 h-4" /> 괜찮아요
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1 text-lg font-medium">
                      <AlertCircle className="w-4 h-4" /> 주의하세요
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-[#8A8A70]" />
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center py-8 text-[#8A8A70] text-lg">아직 기록이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={() => { setAnalysisResult(null); setActiveTab('home'); }} className="p-2">
          <Home className="w-8 h-8 text-[#5A5A40]" />
        </button>
        <h1 className="text-3xl font-bold text-[#5A5A40]">AI 분석 결과</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-16 h-16 text-[#5A5A40] animate-spin" />
          <p className="text-2xl font-bold text-[#5A5A40]">할머니, 잠시만 기다려주세요...</p>
          <p className="text-lg text-[#8A8A70]">AI가 음식을 꼼꼼히 보고 있어요.</p>
        </div>
      ) : analysisResult ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className={`card ${analysisResult.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} p-8`}>
            <div className="flex items-center justify-center mb-6">
              {analysisResult.isSafe ? (
                <div className="bg-green-500 text-white rounded-full p-4">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              ) : (
                <div className="bg-red-500 text-white rounded-full p-4">
                  <AlertCircle className="w-12 h-12" />
                </div>
              )}
            </div>
            <h2 className="text-4xl font-bold text-center mb-2">{analysisResult.foodName}</h2>
            <p className={`text-2xl font-bold text-center mb-6 ${analysisResult.isSafe ? 'text-green-700' : 'text-red-700'}`}>
              {analysisResult.isSafe ? "맛있게 드셔도 괜찮아요!" : "조금만 주의해서 드세요."}
            </p>
            <div className="space-y-4 text-xl leading-relaxed font-serif text-[#2D2D2D]">
              <p>{analysisResult.analysis}</p>
              <div className="bg-white/50 p-4 rounded-2xl border border-black/5">
                <p className="font-bold text-[#5A5A40] mb-1">💡 건강 팁</p>
                <p>{analysisResult.tips}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setActiveTab('home')} className="btn-primary w-full text-2xl">
            확인했어요
          </button>
        </motion.div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-[#8A8A70]">분석할 사진을 선택해주세요.</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary mt-6"
          >
            사진 찍기
          </button>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#5A5A40]">지난 식사 기록</h1>
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="card p-4">
            <div className="flex gap-4">
              <img src={log.image_url} className="w-24 h-24 rounded-2xl object-cover" alt={log.food_name} />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-bold">{log.food_name}</h4>
                  <span className="text-sm text-[#8A8A70]">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 text-lg font-serif text-[#4D4D4D] line-clamp-2">
                  {log.analysis}
                </div>
                <div className="mt-2">
                  {log.is_safe ? (
                    <span className="text-green-600 font-bold">안전함</span>
                  ) : (
                    <span className="text-red-500 font-bold">주의 필요</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-center py-20 text-xl text-[#8A8A70]">아직 기록이 없어요.</p>}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#5A5A40]">내 정보 설정</h1>
      <form onSubmit={handleProfileSave} className="space-y-8">
        <div className="space-y-4">
          <label className="text-2xl font-bold block">나이가 어떻게 되시나요?</label>
          <div className="grid grid-cols-3 gap-3">
            {[60, 70, 80, 90].map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => setProfile({ ...profile, age })}
                className={`py-4 text-xl font-bold rounded-2xl border-2 transition-all ${
                  profile.age === age ? 'bg-[#5A5A40] text-white border-[#5A5A40]' : 'bg-white border-[#E8E4D9]'
                }`}
              >
                {age}대
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-2xl font-bold block">어떤 건강 고민이 있으신가요?</label>
          <div className="space-y-3">
            {['당뇨', '고혈압', '고지혈증', '건강 관리'].map((cond) => (
              <button
                key={cond}
                type="button"
                onClick={() => setProfile({ ...profile, condition: cond })}
                className={`w-full py-5 text-xl font-bold rounded-2xl border-2 text-left px-6 transition-all ${
                  profile.condition === cond ? 'bg-[#5A5A40] text-white border-[#5A5A40]' : 'bg-white border-[#E8E4D9]'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-2xl py-6 mt-8">
          저장하기
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto px-4">
      <main className="pt-6">
        <AnimatePresence mode="wait">
          {loading || analysisResult ? renderAnalysis() : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && renderHome()}
              {activeTab === 'history' && renderHistory()}
              {activeTab === 'profile' && renderProfile()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E4D9] px-6 py-3 flex justify-between items-center z-50 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#5A5A40]' : 'text-[#8A8A70]'}`}
        >
          <Home className="w-8 h-8" />
          <span className="text-sm font-bold">홈</span>
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#5A5A40] text-white p-4 rounded-full -mt-12 shadow-lg active:scale-90 transition-all"
        >
          <Camera className="w-10 h-10" />
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-[#5A5A40]' : 'text-[#8A8A70]'}`}
        >
          <History className="w-8 h-8" />
          <span className="text-sm font-bold">기록</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#5A5A40]' : 'text-[#8A8A70]'}`}
        >
          <User className="w-8 h-8" />
          <span className="text-sm font-bold">내 정보</span>
        </button>
      </nav>
    </div>
  );
}
