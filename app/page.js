'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Folder, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import ExamCard from '@/components/ExamCard';
import Pagination from '@/components/Pagination';
import DonateWidget from '@/components/DonateWidget';
import { getAllFolders, getPublishedExams } from '@/lib/examStore';
import { supabase } from '@/lib/supabase';

const ITEMS_PER_PAGE = 9;
const FOLDERS_PER_PAGE = 5;

function readSavedExams(userId) {
  if (!userId || typeof window === 'undefined') return new Set();

  const saved = new Set();
  const prefix = `yeuhoc_progress_${userId}_`;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      saved.add(key.substring(prefix.length));
    }
  });
  return saved;
}

export default function HomePage() {
  const router = useRouter();
  const [allExams, setAllExams] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({ root: true });
  const [savedExams, setSavedExams] = useState(new Set());
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setSavedExams(session?.user ? readSavedExams(session.user.id) : new Set());
      setAuthLoaded(true);
      if (!session?.user) router.push('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setSavedExams(session?.user ? readSavedExams(session.user.id) : new Set());
      if (!session?.user) router.push('/login');
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

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
      <div className="space-y-6">
        {visibleFolders.map((folder) => {
          const isLocked = folder.visibility === 'locked';
          const isExpanded = expandedFolders[folder.id];

          return (
            <div key={folder.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                className="flex items-center justify-between p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <button className="p-1 rounded-md text-gray-400 hover:bg-gray-200">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  {folder.isRoot ? (
                    <Folder className="w-5 h-5 text-gray-400" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Folder className="w-5 h-5 text-indigo-500" fill="currentColor" fillOpacity={0.2} />
                  )}
                  <h2 className="text-lg font-bold text-gray-800">{folder.name}</h2>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                    {folder.exams.length} đề
                  </span>
                  {isLocked && (
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-md ml-2 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Đã khoá
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 bg-white">
                  {folder.exams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

  if (!authLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-base font-medium">Đang tải...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 flex flex-col xl:flex-row justify-center gap-6 xl:gap-8">
        <div className="w-full max-w-5xl flex flex-col gap-6 min-w-0">
          <div className="relative bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-sm">
            <div className="relative z-10 max-w-xl">
              <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mb-2 flex items-center gap-2">
                Kho đề thi luyện tập <span className="text-2xl">📚</span>
              </h1>
              <p className="text-sm sm:text-base text-indigo-800/80 mb-3 font-medium">
                {allExams.length} đề — THPT Quốc gia · HSA · TSA
              </p>
              <p className="text-sm text-indigo-900/60 leading-relaxed max-w-md">
                Luyện tập với kho đề đa dạng, bám sát cấu trúc đề thi thật, giúp bạn nâng cao kỹ năng và tự tin chinh phục kỳ thi.
              </p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-50/50 to-transparent z-0 pointer-events-none" />
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

        <div className="w-full xl:w-[320px] shrink-0 space-y-6">
          <DonateWidget user={user} />
        </div>
      </div>
    </main>
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
