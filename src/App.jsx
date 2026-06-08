import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [selectedDay, setSelectedDay] = useState(1);

  // ==========================================
  // Firebase 資料：行前準備清單
  // ==========================================
  const [packingList, setPackingList] = useState([]);
  const [newItemText, setNewItemText] = useState('');

  // ==========================================
  // Firebase 資料：姊妹專屬記帳本
  // ==========================================
  const [expenses, setExpenses] = useState([]);
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayer, setExpensePayer] = useState('Kelly'); // 預設付款人改為 Kelly
  const [expenseSplit, setExpenseSplit] = useState('shared'); // shared, Kelly, Sister
  const [isAddingExpense, setIsAddingExpense] = useState(false); 

  // ==========================================
  // Firebase 資料：行程表 (升級時間段與日期版)
  // ==========================================
  const [itineraries, setItineraries] = useState([]);
  const [isAddingItinerary, setIsAddingItinerary] = useState(false);
  const [newItineraryStartTime, setNewItineraryStartTime] = useState(''); // 開始時間
  const [newItineraryEndTime, setNewItineraryEndTime] = useState('');     // 結束時間
  const [newItineraryTitle, setNewItineraryTitle] = useState('');
  const [newItineraryType, setNewItineraryType] = useState('📍');
  const [newItineraryMemo, setNewItineraryMemo] = useState('');

  // 🆕 新增：用來控制哪一個行程正在被編輯，以及編輯中的暫存內容
  const [editingItiId, setEditingItiId] = useState(null);
  const [editItiStartTime, setEditItiStartTime] = useState('');
  const [editItiEndTime, setEditItiEndTime] = useState('');
  const [editItiTitle, setEditItiTitle] = useState('');
  const [editItiType, setEditItiType] = useState('📍');
  const [editItiMemo, setEditItiMemo] = useState('');

  // 🗓️ 在這裡設定你們出發的實際日期 (可以自己修改！)
  const dayDates = { 1: '7/18 (六)', 2: '7/19 (日)', 3: '7/20 (一)', 4: '7/21 (二)' };

  useEffect(() => {
    if (isLoggedIn) {
      const unsubPacking = onSnapshot(collection(db, 'packingList'), (snapshot) => {
        const listData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        listData.sort((a, b) => a.createdAt - b.createdAt);
        setPackingList(listData);
      });

      const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
        const expData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        expData.sort((a, b) => b.createdAt - a.createdAt);
        setExpenses(expData);
      });

      const unsubItinerary = onSnapshot(collection(db, 'itinerary'), (snapshot) => {
        const itiData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 依照開始時間排序
        itiData.sort((a, b) => {
          const timeA = a.startTime || a.time || '';
          const timeB = b.startTime || b.time || '';
          return timeA.localeCompare(timeB);
        });
        setItineraries(itiData);
      });

      return () => { unsubPacking(); unsubExpenses(); unsubItinerary(); };
    }
  }, [isLoggedIn]);

  // ------------------------------------------
  // 行前清單功能
  // ------------------------------------------
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    try {
      await addDoc(collection(db, 'packingList'), { item: newItemText, checked: false, createdAt: new Date().getTime() });
      setNewItemText('');
    } catch (error) { alert("新增失敗"); }
  };
  const handleToggleItem = async (id, currentStatus) => {
    try { await updateDoc(doc(db, 'packingList', id), { checked: !currentStatus }); } catch (error) { console.error(error); }
  };
  const handleDeleteItem = async (id) => {
    if(window.confirm('確定刪除？')) {
      try { await deleteDoc(doc(db, 'packingList', id)); } catch (error) { console.error(error); }
    }
  };

  // ------------------------------------------
  // 行程表功能
  // ------------------------------------------
  const handleAddItinerary = async (e) => {
    e.preventDefault();
    if (!newItineraryStartTime || !newItineraryTitle.trim()) return;
    try {
      await addDoc(collection(db, 'itinerary'), {
        day: selectedDay,
        startTime: newItineraryStartTime,
        endTime: newItineraryEndTime, // 結束時間 (可填可不填)
        title: newItineraryTitle,
        type: newItineraryType,
        memo: newItineraryMemo,
        createdAt: new Date().getTime()
      });
      setNewItineraryStartTime('');
      setNewItineraryEndTime('');
      setNewItineraryTitle('');
      setNewItineraryType('📍');
      setNewItineraryMemo('');
      setIsAddingItinerary(false);
    } catch (error) { alert("新增行程失敗！"); }
  };

  const handleDeleteItinerary = async (id) => {
    if(window.confirm('確定要刪除這個行程嗎？')) {
      try { await deleteDoc(doc(db, 'itinerary', id)); } catch (error) { console.error(error); }
    }
  };

  // 🆕 新增：點擊點擊編輯按鈕時，把原本的資料填入輸入框
  const startEditingItinerary = (item) => {
    setEditingItiId(item.id);
    setEditItiStartTime(item.startTime || '');
    setEditItiEndTime(item.endTime || '');
    setEditItiTitle(item.title || '');
    setEditItiType(item.type || '📍');
    setEditItiMemo(item.memo || '');
  };

  // 🆕 新增：將修改後的內容送回 Firebase 雲端資料庫
  const handleUpdateItinerary = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'itinerary', editingItiId), {
        startTime: editItiStartTime,
        endTime: editItiEndTime,
        title: editItiTitle,
        type: editItiType,
        memo: editItiMemo
      });
      setEditingItiId(null); // 修改成功後關閉編輯狀態
    } catch (error) {
      alert("修改行程失敗！");
    }
  };

  // ------------------------------------------
  // 記帳功能
  // ------------------------------------------
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseItem.trim() || !expenseAmount || isNaN(expenseAmount)) {
      alert('請輸入正確的項目名稱與金額數值！');
      return;
    }
    try {
      await addDoc(collection(db, 'expenses'), {
        item: expenseItem,
        amount: Number(expenseAmount),
        paidBy: expensePayer,
        splitType: expenseSplit,
        createdAt: new Date().getTime()
      });
      setExpenseItem('');
      setExpenseAmount('');
      setExpensePayer('Kelly');
      setExpenseSplit('shared');
      setIsAddingExpense(false);
    } catch (error) { alert("記帳失敗，請檢查網路連線！"); }
  };

  const handleDeleteExpense = async (id) => {
    if(window.confirm('確定要刪除這筆花費嗎？')) {
      try { await deleteDoc(doc(db, 'expenses', id)); } catch (error) { console.error(error); }
    }
  };

  let totalTripExpense = 0; // 整趟旅行總開銷
  let kellyConsumed = 0; // Kelly 實際消費 (個人 + 一半的平分)
  let sisterConsumed = 0; // 姊姊 實際消費 (個人 + 一半的平分)
  
  let netBalance = 0; // 正數代表姊姊欠 Kelly，負數代表 Kelly 欠姊姊

  expenses.forEach(exp => {
    const { amount, paidBy, splitType = 'shared' } = exp;
    totalTripExpense += amount;
    
    // 1. 計算「實際消費額度」 (把平分的錢拆半灌入個人)
    if (splitType === 'shared') {
      kellyConsumed += amount / 2;
      sisterConsumed += amount / 2;
    } else if (splitType === 'Kelly') {
      kellyConsumed += amount;
    } else if (splitType === 'Sister') {
      sisterConsumed += amount;
    }

    // 2. 計算「代墊結算 (誰欠誰)」
    if (paidBy === 'Kelly') {
      if (splitType === 'shared') netBalance += amount / 2; 
      else if (splitType === 'Sister') netBalance += amount;
    } else if (paidBy === '姊姊') {
      if (splitType === 'shared') netBalance -= amount / 2;
      else if (splitType === 'Kelly') netBalance -= amount;
    }
  });

  let settlementMessage = "目前帳務已結清 🎉";
  let settlementColor = "text-green-400";
  if (netBalance > 0) {
    settlementMessage = `姊姊 需給 Kelly ¥ ${netBalance.toLocaleString()}`;
    settlementColor = "text-yellow-300";
  } else if (netBalance < 0) {
    settlementMessage = `Kelly 需給 姊姊 ¥ ${Math.abs(netBalance).toLocaleString()}`;
    settlementColor = "text-red-400";
  }

  // ------------------------------------------
  // 系統登入功能
  // ------------------------------------------
  const SECRET_PASSWORD = '2026';
  useEffect(() => {
    if (localStorage.getItem('ishigaki_logged_in') === 'true') setIsLoggedIn(true);
  }, []);
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === SECRET_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('ishigaki_logged_in', 'true');
    } else { alert('密碼錯誤！'); setPassword(''); }
  };
  const handleLogout = () => { setIsLoggedIn(false); localStorage.removeItem('ishigaki_logged_in'); };

  // ------------------------------------------
  // 畫面渲染
  // ------------------------------------------
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-trip-bg text-white flex flex-col pb-24 font-sans"> 
        <div className="flex justify-between items-center p-4 pt-6 bg-trip-bg sticky top-0 z-10 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-widest text-trip-purple-light">ISHIGAKI</h1>
          <button onClick={handleLogout} className="text-xs bg-trip-card border border-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-800 transition">鎖定</button>
        </div>

        <div className="flex-1 p-4">
          
          {activeTab === 'itinerary' && (
            <div className="animate-fade-in space-y-6">
              
              {/* 日期與天數切換列 */}
              <div className="flex justify-between bg-trip-card p-1 rounded-xl border border-gray-800">
                {[1, 2, 3, 4].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex flex-col items-center ${
                      selectedDay === day ? 'bg-trip-purple text-white shadow-md' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-bold">Day {day}</span>
                    <span className="text-[10px] opacity-80 font-normal">{dayDates[day]}</span>
                  </button>
                ))}
              </div>

              {/* 新增按鈕與表單 */}
              {!isAddingItinerary ? (
                <button onClick={() => setIsAddingItinerary(true)} className="w-full bg-trip-card border border-trip-purple text-trip-purple-light font-bold py-3 rounded-xl hover:bg-gray-800 transition flex justify-center items-center gap-2">
                  <span>+</span> 新增行程
                </button>
              ) : (
                <form onSubmit={handleAddItinerary} className="bg-trip-card p-5 rounded-2xl border border-trip-purple shadow-lg space-y-4">
                  <h3 className="font-bold text-trip-purple-light mb-2">新增 Day {selectedDay} 的行程</h3>
                  
                  {/* 時間段輸入 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">開始時間</label>
                      <input type="time" value={newItineraryStartTime} onChange={(e) => setNewItineraryStartTime(e.target.value)} className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">結束時間 (選填)</label>
                      <input type="time" value={newItineraryEndTime} onChange={(e) => setNewItineraryEndTime(e.target.value)} className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">圖示種類</label>
                    <select value={newItineraryType} onChange={(e) => setNewItineraryType(e.target.value)} className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none">
                      <option value="📍">📍 景點</option>
                      <option value="🥩">🥩 美食</option>
                      <option value="🚗">🚗 交通</option>
                      <option value="✈️">✈️ 航班</option>
                      <option value="🛍️">🛍️ 購物</option>
                      <option value="🏠">🏠 住宿</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">行程標題</label>
                    <input type="text" value={newItineraryTitle} onChange={(e) => setNewItineraryTitle(e.target.value)} placeholder="例如：川平灣" className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">備註 (選填)</label>
                    <input type="text" value={newItineraryMemo} onChange={(e) => setNewItineraryMemo(e.target.value)} placeholder="例如：玻璃船一人約 ¥1,000" className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-trip-purple hover:bg-trip-purple-dark text-white font-bold py-2 rounded-lg transition">確認新增</button>
                    <button type="button" onClick={() => setIsAddingItinerary(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition">取消</button>
                  </div>
                </form>
              )}

              {/* 行程列表卡片 */}
              <div className="flex flex-col gap-4">
                {itineraries.filter(iti => iti.day === selectedDay).length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">這天還沒有排行程喔！</p>
                ) : (
                  itineraries.filter(iti => iti.day === selectedDay).map((item) => (
                    <div key={item.id}>
                      {editingItiId === item.id ? (
                        /* 🆕 正在編輯時顯示的內嵌表單 */
                        <form onSubmit={handleUpdateItinerary} className="bg-trip-card p-4 rounded-xl border border-trip-purple shadow-lg space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="time" value={editItiStartTime} onChange={(e) => setEditItiStartTime(e.target.value)} className="bg-trip-bg text-white px-2 py-1 text-sm rounded border border-gray-700 focus:border-trip-purple outline-none" required />
                            <input type="time" value={editItiEndTime} onChange={(e) => setEditItiEndTime(e.target.value)} className="bg-trip-bg text-white px-2 py-1 text-sm rounded border border-gray-700 focus:border-trip-purple outline-none" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <select value={editItiType} onChange={(e) => setEditItiType(e.target.value)} className="col-span-1 bg-trip-bg text-white px-2 py-1 text-sm rounded border border-gray-700 focus:border-trip-purple outline-none">
                              <option value="📍">📍 景點</option>
                              <option value="🥩">🥩 美食</option>
                              <option value="🚗">🚗 交通</option>
                              <option value="✈️">✈️ 航班</option>
                              <option value="🛍️">🛍️ 購物</option>
                              <option value="🏠">🏠 住宿</option>
                            </select>
                            <input type="text" value={editItiTitle} onChange={(e) => setEditItiTitle(e.target.value)} className="col-span-2 bg-trip-bg text-white px-2 py-1 text-sm rounded border border-gray-700 focus:border-trip-purple outline-none" required />
                          </div>
                          <input type="text" value={editItiMemo} onChange={(e) => setEditItiMemo(e.target.value)} className="w-full bg-trip-bg text-white px-2 py-1 text-sm rounded border border-gray-700 focus:border-trip-purple outline-none" placeholder="備註..." />
                          <div className="flex gap-2 justify-end text-xs pt-1">
                            <button type="submit" className="bg-trip-purple px-3 py-1.5 rounded font-bold hover:bg-trip-purple-dark transition">儲存</button>
                            <button type="button" onClick={() => setEditingItiId(null)} className="bg-gray-700 px-3 py-1.5 rounded font-bold hover:bg-gray-600 transition">取消</button>
                          </div>
                        </form>
                      ) : (
                        /* 一般狀態下顯示的行程卡片 (右側多了個 ✏️ 編輯按鈕) */
                        <div className="bg-trip-card rounded-xl p-4 border border-gray-800 shadow-sm flex gap-4 items-start relative">
                          <div className="flex flex-col items-center min-w-[75px] text-center">
                            {/* 統一使用 text-base 大小與紫色粗體 */}
                            <span className="text-trip-purple-light font-bold text-base">
                              {item.startTime || item.time}
                            </span>
                            
                            {item.endTime && (
                              <>
                                <span className="text-[10px] text-gray-500 my-0.5">▼</span>
                                {/* 結束時間也改成跟開始時間一模一樣的樣式 */}
                                <span className="text-trip-purple-light font-bold text-base">
                                  {item.endTime}
                               </span>
                              </>
                            )}
                            
                            <span className="text-2xl mt-1">{item.type}</span>
                          </div>
                          <div className="flex-1 pt-0.5 pr-14">
                            <h3 className="text-white font-bold text-base mb-1">{item.title}</h3>
                            <p className="text-gray-400 text-xs whitespace-pre-line">{item.memo}</p>
                          </div>
                          {/* 右上角操控區 */}
                          <div className="absolute top-2 right-3 flex items-center gap-1">
                            <button onClick={() => startEditingItinerary(item)} className="text-gray-500 hover:text-trip-purple-light text-base p-1 transition">✏️</button>
                            <button onClick={() => handleDeleteItinerary(item.id)} className="text-gray-500 hover:text-red-400 text-xl font-bold p-1 transition">×</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="bg-gradient-to-br from-trip-purple-dark to-trip-purple rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-white/80 text-sm mb-1">旅行總花費</p>
                  <h2 className="text-4xl font-bold mb-6">¥ {totalTripExpense.toLocaleString()}</h2>
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Kelly 實際花費 (含平分):</span>
                      <span className="font-bold">¥ {kellyConsumed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm">姊姊 實際花費 (含平分):</span>
                      <span className="font-bold">¥ {sisterConsumed.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold">精準結算:</span>
                      <span className={`font-bold ${settlementColor}`}>{settlementMessage}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isAddingExpense ? (
                <button onClick={() => setIsAddingExpense(true)} className="w-full bg-trip-card border border-trip-purple text-trip-purple-light font-bold py-3 rounded-xl hover:bg-gray-800 transition flex justify-center items-center gap-2">
                  <span>+</span> 新增一筆花費
                </button>
              ) : (
                <form onSubmit={handleAddExpense} className="bg-trip-card p-5 rounded-2xl border border-trip-purple shadow-lg space-y-4">
                  <h3 className="font-bold text-trip-purple-light mb-2">新增花費</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">花費項目</label>
                    <input type="text" value={expenseItem} onChange={(e) => setExpenseItem(e.target.value)} className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">金額 (日幣 ¥)</label>
                    <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full bg-trip-bg text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-trip-purple outline-none" required min="0" />
                  </div>
                  
                  {/* 付款人選擇 */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">這筆錢是「誰」先掏出來付的？</label>
                    <div className="flex gap-4 mt-1 bg-trip-bg p-2 rounded-lg border border-gray-800">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="radio" value="Kelly" checked={expensePayer === 'Kelly'} onChange={(e) => setExpensePayer(e.target.value)} className="text-trip-purple focus:ring-trip-purple" />
                        <span>Kelly</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="radio" value="姊姊" checked={expensePayer === '姊姊'} onChange={(e) => setExpensePayer(e.target.value)} className="text-trip-purple focus:ring-trip-purple" />
                        <span>姊姊</span>
                      </label>
                    </div>
                  </div>

                  {/* 分攤對象選擇 */}
                  <div>
                    <label className="block text-xs text-trip-purple-light mb-1">這筆花費算「誰」的？</label>
                    <div className="flex flex-col gap-2 mt-1 bg-trip-bg p-2 rounded-lg border border-gray-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="shared" checked={expenseSplit === 'shared'} onChange={(e) => setExpenseSplit(e.target.value)} className="text-trip-purple focus:ring-trip-purple" />
                        <span>兩人平分 (預設)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="Kelly" checked={expenseSplit === 'Kelly'} onChange={(e) => setExpenseSplit(e.target.value)} className="text-trip-purple focus:ring-trip-purple" />
                        <span>Kelly (個人消費)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="Sister" checked={expenseSplit === 'Sister'} onChange={(e) => setExpenseSplit(e.target.value)} className="text-trip-purple focus:ring-trip-purple" />
                        <span>姊姊 (個人消費)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-trip-purple hover:bg-trip-purple-dark text-white font-bold py-2 rounded-lg transition">確認新增</button>
                    <button type="button" onClick={() => setIsAddingExpense(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition">取消</button>
                  </div>
                </form>
              )}

              <div>
                <h3 className="text-gray-400 text-sm font-bold mb-3 px-1">花費明細</h3>
                {expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">目前沒有任何花費紀錄</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {expenses.map(exp => (
                      <div key={exp.id} className="bg-trip-card p-4 rounded-xl border border-gray-800 flex justify-between items-center group">
                        <div>
                          <p className="font-bold text-white">{exp.item}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {exp.paidBy} 先付
                            {exp.splitType === 'Kelly' && <span className="text-blue-400 ml-1">(Kelly 的)</span>}
                            {exp.splitType === 'Sister' && <span className="text-pink-400 ml-1">(姊姊 的)</span>}
                            {(!exp.splitType || exp.splitType === 'shared') && ' (兩人平分)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-trip-purple-light">¥ {exp.amount.toLocaleString()}</span>
                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-600 hover:text-red-400 text-xl font-bold">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'wallet' && (
            <div className="animate-fade-in space-y-8">
              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-3 flex items-center gap-2"><span>🎫</span> 快速票夾</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-trip-card border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg mb-3 flex items-center justify-center text-2xl">📱</div>
                    <p className="text-sm font-bold">Visit Japan</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-gray-400 text-sm font-bold mb-3 flex items-center gap-2"><span>✅</span> 共同行前準備</h3>
                <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
                  <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="輸入要帶的物品..." className="flex-1 bg-trip-card border border-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-trip-purple" />
                  <button type="submit" className="bg-trip-purple px-4 py-2 rounded-lg font-bold hover:bg-trip-purple-dark transition">加入</button>
                </form>
                <div className="bg-trip-card border border-gray-800 rounded-xl overflow-hidden">
                  {packingList.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 text-sm">目前還沒有清單，快來新增吧！</p>
                  ) : (
                    packingList.map((item) => (
                      <div key={item.id} className={`flex items-center gap-3 p-4 border-b border-gray-800 last:border-0 transition ${item.checked ? 'bg-gray-800/50' : 'hover:bg-gray-800'}`}>
                        <div onClick={() => handleToggleItem(item.id, item.checked)} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-trip-purple border-trip-purple' : 'border-gray-500'}`}>
                          {item.checked && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span onClick={() => handleToggleItem(item.id, item.checked)} className={`flex-1 cursor-pointer transition-all ${item.checked ? 'line-through text-gray-500' : 'text-white'}`}>
                          {item.item}
                        </span>
                        {/* 這裡修復了原本綁錯的刪除函數喔！ */}
                        <button onClick={() => handleDeleteItem(item.id)} className="text-gray-600 hover:text-red-400 text-2xl font-bold px-2 pb-1">×</button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-trip-card border-t border-gray-800 flex justify-around py-3 px-2 z-50">
          <button onClick={() => setActiveTab('itinerary')} className={`flex flex-col items-center gap-1 w-full ${activeTab === 'itinerary' ? 'text-trip-purple-light' : 'text-gray-500 hover:text-gray-300'}`}>
            <span className="text-xl">📍</span><span className="text-xs font-bold">行程</span>
          </button>
          <button onClick={() => setActiveTab('expenses')} className={`flex flex-col items-center gap-1 w-full ${activeTab === 'expenses' ? 'text-trip-purple-light' : 'text-gray-500 hover:text-gray-300'}`}>
            <span className="text-xl">💰</span><span className="text-xs font-bold">記帳</span>
          </button>
          <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 w-full ${activeTab === 'wallet' ? 'text-trip-purple-light' : 'text-gray-500 hover:text-gray-300'}`}>
            <span className="text-xl">🎫</span><span className="text-xs font-bold">票夾</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trip-bg flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10"><h1 className="text-4xl font-bold text-white mb-2 tracking-widest">ISHIGAKI</h1><p className="text-trip-purple-light text-sm tracking-widest">石垣島專屬旅伴系統</p></div>
      <div className="bg-trip-card w-full max-w-sm rounded-2xl p-8 shadow-2xl border border-gray-800"><form onSubmit={handleLogin} className="flex flex-col gap-6"><div><label className="block text-gray-400 text-sm mb-2 text-center">請輸入通關密語</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-trip-bg text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-trip-purple focus:ring-1 focus:ring-trip-purple text-center tracking-widest" placeholder="••••" /></div><button type="submit" className="w-full bg-trip-purple hover:bg-trip-purple-dark text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200">解鎖行程</button></form></div>
    </div>
  );
}

export default App;