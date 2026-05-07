'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Folder, Loader2, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import ExamCard from '@/components/ExamCard';
import Pagination from '@/components/Pagination';
import DonateWidget from '@/components/DonateWidget';
import ContinueExamsPanel from '@/components/ContinueExamsPanel';
import { getAllFolders, getPublishedExams } from '@/lib/examStore';
import { getContinueExamItems, readSavedExams } from '@/lib/continueExamStore';
import { getTargetExams, getUserTargetExams, syncUserTargetExams } from '@/lib/targetExamStore';
import { findNearestTargetExam, formatTargetExamDate, getCountdownSentence, getRandomWish } from '@/lib/targetExamDisplay';
import { supabase } from '@/lib/supabase';

const ITEMS_PER_PAGE = 9;
const FOLDERS_PER_PAGE = 5;

export default function HomePage() {
  const router = useRouter();
  const [allExams, setAllExams] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({ root: true });
  const [savedExams, setSavedExams] = useState(new Set());
  const [continueItems, setContinueItems] = useState([]);
  const [continueLoading, setContinueLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [targetDataLoaded, setTargetDataLoaded] = useState(false);
  const [targetExams, setTargetExams] = useState([]);
  const [selectedTargetExams, setSelectedTargetExams] = useState([]);
  const [targetDraftIds, setTargetDraftIds] = useState([]);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState('');
  const [wish, setWish] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selYear, setSelYear] = useState(null);
  const [selType, setSelType] = useState(null);
  const [selSubject, setSelSubject] = useState(null);
  const [sortOrder, setSortOrder] = useState('default');
  const [browsePage, setBrowsePage] = useState(1);

  useEffect(() => {
    async function init() {
      const [exams, folders] = await Promise.all([
        getPublishedExams(),
        getAllFolders(),
      ]);
      setAllExams(exams);
      setAllFolders(folders || []);

      const initialExpanded = { root: true };
      (folders || []).forEach((folder) => {
        if (folder.visibility !== 'private') initialExpanded[folder.id] = true;
      });
      setExpandedFolders(initialExpanded);
    }
    init();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTargetData = async (sessionUser) => {
      if (!sessionUser) return;
      setTargetDataLoaded(false);
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', sessionUser.id)
          .single();

        const [profileRes, activeTargetsRes, selectedTargetsRes] = await Promise.allSettled([
          profilePromise,
          getTargetExams(),
          getUserTargetExams(sessionUser.id),
        ]);

        if (!isMounted) return;

        const activeTargets = activeTargetsRes.status === 'fulfilled' ? activeTargetsRes.value : [];
        const selectedTargets = selectedTargetsRes.status === 'fulfilled' ? selectedTargetsRes.value : [];

        if (activeTargetsRes.status === 'rejected') console.warn('Target exams fetch failed:', activeTargetsRes.reason);
        if (selectedTargetsRes.status === 'rejected') console.warn('User target exams fetch failed:', selectedTargetsRes.reason);

        setProfile(profileRes.status === 'fulfilled' ? profileRes.value.data : null);
        setTargetExams(activeTargets);
        setSelectedTargetExams(selectedTargets);
        setTargetDraftIds(selectedTargets.map((exam) => exam.id));
        setTargetModalOpen(selectedTargets.length === 0 && activeTargets.length > 0);
      } finally {
        if (isMounted) setTargetDataLoaded(true);
      }
    };

    const applySession = async (session) => {
      if (!isMounted) return;
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      setSavedExams(sessionUser ? readSavedExams(sessionUser.id) : new Set());

      if (!sessionUser) {
        setProfile(null);
        setTargetExams([]);
        setSelectedTargetExams([]);
        setTargetDraftIds([]);
        setTargetModalOpen(false);
        setWish('');
        setTargetDataLoaded(true);
        setAuthLoaded(true);
        router.push('/login');
        return;
      }

      setWish(getRandomWish());
      await loadTargetData(sessionUser);
      if (isMounted) setAuthLoaded(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadContinueItems() {
      if (!user?.id) {
        setContinueItems([]);
        setContinueLoading(false);
        return;
      }

      setContinueLoading(true);
      const nextItems = await getContinueExamItems(user.id, allExams, allFolders);

      if (!cancelled) {
        setContinueItems(nextItems);
        setContinueLoading(false);
      }
    }

    loadContinueItems();
    return () => {
      cancelled = true;
    };
  }, [allExams, allFolders, user?.id]);

  const resetBrowsePage = () => setBrowsePage(1);
  const handleSearch = (value) => { setSearchQuery(value); resetBrowsePage(); };
  const handleYear = (value) => { setSelYear(value); resetBrowsePage(); };
  const handleType = (value) => { setSelType(value); resetBrowsePage(); };
  const handleSubject = (value) => { setSelSubject(value); resetBrowsePage(); };
  const handleSortOrder = (value) => { setSortOrder(value); resetBrowsePage(); };

  const filteredExams = allExams.filter((exam) => {
    if (searchQuery && !exam.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selYear && String(exam.year) !== String(selYear)) return false;
    if (selType && exam.examType !== selType) return false;
    if (selSubject && exam.subject !== selSubject) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'default') return 0;
    if (sortOrder === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortOrder === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (sortOrder === 'az') return a.title.localeCompare(b.title);
    return 0;
  });

  const isFiltering = searchQuery || selYear || selType || selSubject || sortOrder !== 'default';
  const lockedFolderIds = new Set(allFolders.filter((folder) => folder.visibility === 'locked').map((folder) => folder.id));
  const browseTotalPages = isFiltering
    ? Math.ceil(filteredExams.length / ITEMS_PER_PAGE)
    : Math.ceil(getRenderableFolders(filteredExams, allFolders).length / FOLDERS_PER_PAGE);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelYear(null);
    setSelType(null);
    setSelSubject(null);
    resetBrowsePage();
  };

  const handleToggleTargetDraft = (targetId) => {
    setTargetError('');
    setTargetDraftIds((prev) => (
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId]
    ));
  };

  const handleSaveFirstTargets = async () => {
    if (targetDraftIds.length === 0) {
      setTargetError('Vui lòng chọn ít nhất một kỳ thi.');
      return;
    }

    setTargetSaving(true);
    setTargetError('');
    try {
      await syncUserTargetExams(user.id, targetDraftIds);
      const nextTargets = await getUserTargetExams(user.id);
      setSelectedTargetExams(nextTargets);
      setTargetDraftIds(nextTargets.map((exam) => exam.id));
      setTargetModalOpen(false);
    } catch (error) {
      setTargetError(error.message || 'Không thể lưu kỳ thi mục tiêu.');
    } finally {
      setTargetSaving(false);
    }
  };

  const renderExamCard = (exam, isLocked) => (
    <div key={exam.id} className={isLocked ? 'opacity-60 grayscale-[50%] pointer-events-none relative' : ''}>
      <ExamCard
        exam={exam}
        href={isLocked ? undefined : `/de-thi/${exam.id}`}
        isSaved={savedExams.has(exam.id.toString())}
        isLocked={isLocked}
      />
      {isLocked && <LockedOverlay />}
    </div>
  );

  const renderContent = () => {
    if (isFiltering) {
      const visibleExams = filteredExams.slice((browsePage - 1) * ITEMS_PER_PAGE, browsePage * ITEMS_PER_PAGE);

      return visibleExams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleExams.map((exam) => renderExamCard(exam, lockedFolderIds.has(exam.folderId)))}
        </div>
      ) : null;
    }

    const visibleFolders = getRenderableFolders(filteredExams, allFolders)
      .slice((browsePage - 1) * FOLDERS_PER_PAGE, browsePage * FOLDERS_PER_PAGE);

    return visibleFolders.length > 0 ? (
      <div className="space-y-5">
        {visibleFolders.map((folder) => {
          const isLocked = folder.visibility === 'locked';
          const isExpanded = expandedFolders[folder.id];

          return (
            <div key={folder.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
              <div
                onClick={() => setExpandedFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100 cursor-pointer transition-colors border-b border-gray-100/80"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                  <button className="shrink-0 p-1 rounded-md text-gray-400 hover:bg-gray-200">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  {folder.isRoot ? (
                    <Folder className="w-5 h-5 shrink-0 text-gray-400" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 shrink-0 text-gray-400" />
                  ) : (
                    <Folder className="w-5 h-5 shrink-0 text-indigo-500" fill="currentColor" fillOpacity={0.2} />
                  )}
                  <h2 className="min-w-0 max-w-full truncate text-base sm:text-lg font-bold text-gray-800">{folder.name}</h2>
                  <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                    {folder.exams.length} đề
                  </span>
                  {isLocked && (
                    <span className="shrink-0 text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Đã khoá
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-5 bg-white">
                  {folder.exams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {folder.exams.map((exam) => renderExamCard(exam, isLocked))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-400 py-4 italic">Chưa có đề thi nào trong thư mục này.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : null;
  };

  const content = renderContent();
  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'bạn';
  const nearestTargetExam = findNearestTargetExam(selectedTargetExams);

  if (!authLoaded || !user || !targetDataLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-base font-medium">Đang tải...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-be-vietnam), system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-24 flex flex-col xl:flex-row justify-center gap-5 xl:gap-7">
        <div className="w-full max-w-5xl flex flex-col gap-5 min-w-0">
          <HomeGreeting
            displayName={displayName}
            nearestTargetExam={nearestTargetExam}
            selectedCount={selectedTargetExams.length}
            activeTargetCount={targetExams.length}
            wish={wish}
          />

          <div className="xl:hidden">
            <ContinueExamsPanel items={continueItems} loading={continueLoading} />
          </div>

          <FilterBar
            search={searchQuery} onSearch={handleSearch}
            selYear={selYear} onYear={handleYear}
            selType={selType} onType={handleType}
            selSubject={selSubject} onSubject={handleSubject}
            resultCount={filteredExams.length}
            totalCount={allExams.length}
            onClear={handleClearFilters}
            sortOrder={sortOrder} onSortOrder={handleSortOrder}
          />

          {content ? (
            <>
              {content}

              {browseTotalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={browsePage}
                    totalPages={browseTotalPages}
                    onPageChange={setBrowsePage}
                    variant="light"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Không tìm thấy đề thi</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem các đề thi khác.</p>
              <button onClick={handleClearFilters} className="px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-sm hover:bg-indigo-100 transition-colors">
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        <div className="w-full xl:w-[310px] shrink-0 space-y-5">
          <div className="hidden xl:block">
            <ContinueExamsPanel items={continueItems} loading={continueLoading} />
          </div>
          <DonateWidget user={user} />
        </div>
      </div>

      {targetModalOpen && (
        <TargetExamSetupModal
          targetExams={targetExams}
          selectedIds={targetDraftIds}
          onToggle={handleToggleTargetDraft}
          onSave={handleSaveFirstTargets}
          saving={targetSaving}
          error={targetError}
        />
      )}
    </main>
  );
}

function HomeGreeting({ displayName, nearestTargetExam, selectedCount, activeTargetCount, wish }) {
  return (
    <div className="relative bg-white border border-gray-100 rounded-2xl p-5 sm:p-7 overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-1.5">Trang chủ</p>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-950 mb-3">
          Xin chào, {displayName}
        </h1>

        {nearestTargetExam ? (
          <>
            <p className="text-base sm:text-lg font-bold text-gray-800">
              {getCountdownSentence(nearestTargetExam)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                <CalendarDays className="w-4 h-4" />
                {formatTargetExamDate(nearestTargetExam.examDate)}
              </span>
              {selectedCount > 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedCount} kỳ thi mục tiêu
                </span>
              )}
            </div>
          </>
        ) : activeTargetCount > 0 ? (
          <p className="text-base font-semibold text-gray-700">
            Hãy chọn kỳ thi mục tiêu để bắt đầu theo dõi ngày thi.
          </p>
        ) : (
          <p className="text-base font-semibold text-gray-700">
            Admin chưa cấu hình kỳ thi mục tiêu.
          </p>
        )}

        <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium">{wish}</p>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-50 to-transparent z-0 pointer-events-none" />
    </div>
  );
}

function TargetExamSetupModal({ targetExams, selectedIds, onToggle, onSave, saving, error }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-950">Chọn kỳ thi mục tiêu</h2>
          <p className="text-sm text-gray-500 mt-1">Bạn có thể chọn nhiều kỳ thi. Trang chủ sẽ ưu tiên kỳ thi gần nhất.</p>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-4 sm:p-5 space-y-3">
          {targetExams.map((exam) => {
            const checked = selectedIds.includes(exam.id);
            return (
              <label
                key={exam.id}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                  checked
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(exam.id)}
                  className="mt-1 w-4 h-4 accent-indigo-600"
                />
                <span className="min-w-0">
                  <span className="block font-bold text-gray-900">{exam.name}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <CalendarDays className="w-4 h-4" />
                    {formatTargetExamDate(exam.examDate)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="p-5 sm:p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu lựa chọn
          </button>
        </div>
      </div>
    </div>
  );
}

function getRenderableFolders(exams, folders) {
  const publicFolders = folders
    .filter((folder) => folder.visibility !== 'private')
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const examsByFolder = {};
  const rootExams = [];

  exams.forEach((exam) => {
    if (exam.folderId && publicFolders.find((folder) => folder.id === exam.folderId)) {
      if (!examsByFolder[exam.folderId]) examsByFolder[exam.folderId] = [];
      examsByFolder[exam.folderId].push(exam);
    } else {
      rootExams.push(exam);
    }
  });

  const renderableFolders = publicFolders
    .map((folder) => ({
      ...folder,
      isRoot: false,
      exams: examsByFolder[folder.id] || [],
    }))
    .filter((folder) => folder.exams.length > 0 || folder.visibility === 'locked');

  if (rootExams.length > 0) {
    renderableFolders.push({
      id: 'root',
      name: 'Đề thi khác',
      isRoot: true,
      exams: rootExams,
      visibility: 'public',
    });
  }

  return renderableFolders;
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl cursor-not-allowed">
      <div className="bg-gray-900/80 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg pointer-events-none">
        <Lock className="w-4 h-4" /> Đã khoá
      </div>
    </div>
  );
}
