import { useState, useEffect } from 'react';
import { db } from './firebase'; // 確保這裡只有 db，沒有 storage
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet'); // 測試用，可以直接停在票夾頁面
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
  const [expensePayer, setExpensePayer] = useState('Kelly'); 
  const [expenseSplit, setExpenseSplit] = useState('shared'); 
  const [isAddingExpense, setIsAddingExpense] = useState(false); 

  // ==========================================
  // Firebase 資料：行程表
  // ==========================================
  const [itineraries, setItineraries] = useState([]);
  const [isAddingItinerary, setIsAddingItinerary] = useState(false);
  const [newItineraryStartTime, setNewItineraryStartTime] = useState(''); 
  const [newItineraryEndTime, setNewItineraryEndTime] = useState('');     
  const [newItineraryTitle, setNewItineraryTitle] = useState('');
  const [newItineraryType, setNewItineraryType] = useState('📍');
  const [newItineraryMemo, setNewItineraryMemo] = useState('');

  const [editingItiId, setEditingItiId] = useState(null);
  const [editItiStartTime, setEditItiStartTime] = useState('');
  const [editItiEndTime, setEditItiEndTime] = useState('');
  const [editItiTitle, setEditItiTitle] = useState('');
  const [editItiType, setEditItiType] = useState('📍');
  const [editItiMemo, setEditItiMemo] = useState('');

  const dayDates = { 1: '7/18 (六)', 2: '7/19 (日)', 3: '7/20 (一)', 4: '7/21 (二)' };

  // ==========================================
  // 🆕 Firebase 資料：快速票夾 (純網址超連結版)
  // ==========================================
  const [tickets, setTickets] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null); 
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketMemo, setNewTicketMemo] = useState('');
  const [newTicketLink, setNewTicketLink] = useState(''); // 這裡改成 Link，用來存網址

  // 處理拖曳放開後的邏輯
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const currentDayItems = itineraries.filter(item => item.day === selectedDay);
    const otherDayItems = itineraries.filter(item => item.day !== selectedDay);

    const items = Array.from(currentDayItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setItineraries([...otherDayItems, ...items]);

    items.forEach((item, index) => {
      const docRef = doc(db, 'itinerary', item.id);
      updateDoc(docRef, { order: index });
    });
  };

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

      const qItinerary = query(collection(db, 'itinerary'), orderBy('order', 'asc'));
      const unsubItinerary = onSnapshot(qItinerary, (snapshot) => {
        setItineraries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // 監聽票券資料
      const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
        const ticketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        ticketData.sort((a, b) => b.createdAt - a.createdAt);
        setTickets(ticketData);
      });

      return () => { unsubPacking(); unsubExpenses(); unsubItinerary(); unsubTickets(); };
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
    if(window.confirm('確定要刪除這個準備項目嗎？')) {
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
      const currentDayCount = itineraries.filter(item => item.day === selectedDay).length;
      await addDoc(collection(db, 'itinerary'), {
        day: selectedDay,
        startTime: newItineraryStartTime,
        endTime: newItineraryEndTime, 
        title: newItineraryTitle,
        type: newItineraryType,
        memo: newItineraryMemo,
        createdAt: new Date().getTime(),
        order: currentDayCount
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

  const startEditingItinerary = (item) => {
    setEditingItiId(item.id);
    setEditItiStartTime(item.startTime || '');
    setEditItiEndTime(item.endTime || '');
    setEditItiTitle(item.title || '');
    setEditItiType(item.type || '📍');
    setEditItiMemo(item.memo || '');
  };

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
      setEditingItiId(null);
    } catch (error) {
      alert("修改行程失敗！");
    }
  };

  // ------------------------------------------
  // 🆕 快速票夾：純網址版上傳與刪除邏輯
  // ------------------------------------------
  const handleAddTicket = async (category, e) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) return;

    try {
      // 只要存文字跟連結就好，非常安全快速
      await addDoc(collection(db, 'tickets'), {
        category: category,
        title: newTicketTitle,
        memo: newTicketMemo,
        link: newTicketLink,
        createdAt: new Date().getTime()
      });

      // 清空輸入框
      setNewTicketTitle('');
      setNewTicketMemo('');
      setNewTicketLink('');
    } catch (error) {
      console.error(error);
      alert("票券儲存失敗，請檢查網路連線！");
    }
  };

  const handleDeleteTicket = async (id) => {
    if (window.confirm('確定要刪除這張票券連結嗎？')) {
      try {
        await deleteDoc(doc(db, 'tickets', id));
      } catch (error) {
        console.error(error);
      }
    }
  };

  // ------------------------------------------
  // 記帳功能
  // ------------------------------------------
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseItem.trim() || !expenseAmount || isNaN(expenseAmount)) {
      alert('請輸入項目與金額！');
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
    } catch (error) { alert("記帳失敗！"); }
  };

  const handleDeleteExpense = async (id) => {
    if(window.confirm('確定要刪除這筆花費嗎？')) {
      try { await deleteDoc(doc(db, 'expenses', id)); } catch (error) { console.error(error); }
    }
  };

  let totalTripExpense = 0; 
  let kellyConsumed = 0; 
  let sisterConsumed = 0; 
  let netBalance = 0; 

  expenses.forEach(exp => {
    const { amount, paidBy, splitType = 'shared' } = exp;
    totalTripExpense += amount;
    
    if (splitType === 'shared') {
      kellyConsumed += amount / 2;
      sisterConsumed += amount / 2;
    } else if (splitType === 'Kelly') {
      kellyConsumed += amount;
    } else if (splitType === 'Sister') {
      sisterConsumed += amount;
    }

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

  // 系統登入功能
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

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-trip-bg text-white flex flex-col pb-24 font-sans"> 
        <div className="flex justify-between items-center p-4 pt-6 bg-trip-bg sticky top-0 z-10 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-widest text-trip-purple-light">ISHIGAKI</h1>
          <button onClick={handleLogout} className="text-xs bg-trip-card border border-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-800 transition">鎖定</button>
        </div>

        <div className="flex-1 p-4">
          
          {/* 行程表分頁 */}
          {activeTab === 'itinerary' && (
            <div className="animate-fade-in space-y-6">
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

              {!isAddingItinerary ? (
                <button onClick={() => setIsAddingItinerary(true)} className="w-full bg-trip-card border border-trip-purple text-trip-purple-light font-bold py-3 rounded-xl hover:bg-gray-800 transition flex justify-center items-center gap-2">
                  <span>+</span> 新增行程
                </button>
              ) : (
                <form onSubmit={handleAddItinerary} className="bg-trip-card p-5 rounded-2xl border border-trip-purple shadow-lg space-y-4">
                  <h3 className="font-bold text-trip-purple-light mb-2">新增 Day {selectedDay} 的行程</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
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

              <div className="flex flex-col gap-4">
                {itineraries.filter(iti => iti.day === selectedDay).length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">這天還沒有排行程喔！</p>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="itinerary-droppable">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {itineraries.filter(iti => iti.day === selectedDay).map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} className="bg-trip-card rounded-xl border border-gray-800 shadow-sm transition-all">
                                  {editingItiId === item.id ? (
                                    <form onSubmit={handleUpdateItinerary} className="p-4 space-y-3">
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
                                    <div className="p-4 flex gap-2 items-start relative">
                                      <div {...provided.dragHandleProps} className="text-gray-600 p-1 cursor-grab active:cursor-grabbing self-center mr-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                                      </div>
                                      
                                      <div className="flex flex-col items-center min-w-[75px] text-center">
                                        <span className="text-trip-purple-light font-bold text-base">{item.startTime || item.time}</span>
                                        {item.endTime && (
                                          <>
                                            <span className="text-[10px] text-gray-500 my-0.5">▼</span>
                                            <span className="text-trip-purple-light font-bold text-base">{item.endTime}</span>
                                          </>
                                        )}
                                        <span className="text-2xl mt-1">{item.type}</span>
                                      </div>
                                      <div className="flex-1 pt-0.5 pr-14 pl-2">
                                        <h3 className="text-white font-bold text-base mb-1">{item.title}</h3>
                                        <p className="text-gray-400 text-xs whitespace-pre-line">{item.memo}</p>
                                      </div>
                                      <div className="absolute top-2 right-3 flex items-center gap-1">
                                        <button onClick={() => startEditingItinerary(item)} className="text-gray-500 hover:text-trip-purple-light text-base p-1 transition">✏️</button>
                                        <button onClick={() => handleDeleteItinerary(item.id)} className="text-gray-500 hover:text-red-400 text-xl font-bold p-1 transition">×</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            </div>
          )}
          
          {/* 記帳本分頁 */}
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

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">這筆花費算「誰」的？</label>
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
          
          {/* 🎫 票夾與行前準備分頁 */}
          {activeTab === 'wallet' && (
            <div className="animate-fade-in space-y-8">
              
              {/* 快速票夾手風琴區塊 (純網址版) */}
              <section className="space-y-4">
                <h3 className="text-gray-400 text-sm font-bold mb-1 flex items-center gap-2"><span>🎫</span> 快速票夾 (點擊展開分類)</h3>
                
                {[
                  { id: 'transport', name: '✈️ 機票與交通' },
                  { id: 'activities', name: '🎢 樂園與活動' },
                  { id: 'hotel', name: '🏨 住宿確認' }
                ].map(cat => {
                  const isExpanded = expandedCategory === cat.id;
                  const catTickets = tickets.filter(t => t.category === cat.id);
                  
                  return (
                    <div key={cat.id} className="bg-trip-card rounded-xl border border-gray-800 overflow-hidden shadow-sm">
                      <button 
                        type="button"
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                        className="w-full px-4 py-4 flex justify-between items-center font-bold hover:bg-gray-800/50 transition-colors text-left"
                      >
                        <span className="text-base flex items-center gap-2">
                          {cat.name} 
                          <span className="text-xs bg-trip-purple/20 text-trip-purple-light px-2 py-0.5 rounded-full font-medium">
                            {catTickets.length}
                          </span>
                        </span>
                        <span className="text-gray-500 text-xs transition-transform duration-200">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-4 bg-gray-950/40 border-t border-gray-800/80 space-y-4">
                          
                          {/* 新增連結小表單 */}
                          <form onSubmit={(e) => handleAddTicket(cat.id, e)} className="bg-trip-bg p-4 rounded-xl border border-gray-800 space-y-3 shadow-inner">
                            <p className="text-xs font-bold text-trip-purple-light">＋ 新增此分類票券或連結</p>
                            <input 
                              type="text" 
                              placeholder="票券名稱 (例如: 樂桃航空去程機票)" 
                              value={newTicketTitle} 
                              onChange={(e) => setNewTicketTitle(e.target.value)} 
                              className="w-full bg-trip-card px-3 py-2 text-sm rounded-lg border border-gray-700 focus:border-trip-purple outline-none text-white" 
                              required 
                            />
                            <input 
                              type="text" 
                              placeholder="備註、說明或序號 (選填)" 
                              value={newTicketMemo} 
                              onChange={(e) => setNewTicketMemo(e.target.value)} 
                              className="w-full bg-trip-card px-3 py-2 text-sm rounded-lg border border-gray-700 focus:border-trip-purple outline-none text-white" 
                            />
                            <input 
                              type="url" 
                              placeholder="貼上網址 (Google Drive、Klook訂單等)" 
                              value={newTicketLink} 
                              onChange={(e) => setNewTicketLink(e.target.value)} 
                              className="w-full bg-trip-card px-3 py-2 text-sm rounded-lg border border-gray-700 focus:border-trip-purple outline-none text-white" 
                            />
                            <button type="submit" className="w-full bg-trip-purple hover:bg-trip-purple-dark text-white text-xs font-bold py-2 rounded-lg transition">
                              確認儲存
                            </button>
                          </form>

                          {/* 連結展示區 */}
                          <div className="space-y-3">
                            {catTickets.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-3">此分類尚無儲存的票券資料</p>
                            ) : (
                              catTickets.map(ticket => (
                                <div key={ticket.id} className="bg-trip-bg p-3 rounded-xl border border-gray-800 space-y-2 relative shadow-sm">
                                  <div className="pr-8">
                                    <h4 className="font-bold text-sm text-white">{ticket.title}</h4>
                                    {ticket.memo && <p className="text-xs text-gray-400 mt-1 whitespace-pre-line leading-relaxed">{ticket.memo}</p>}
                                  </div>
                                  <button type="button" onClick={() => handleDeleteTicket(ticket.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 text-xl font-bold p-1 transition">×</button>
                                  
                                  {/* 有網址的話就會出現跳轉按鈕 */}
                                  {ticket.link && (
                                    <a 
                                      href={ticket.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs px-3 py-1.5 rounded transition"
                                    >
                                      <span>🔗</span> 開啟票券連結
                                    </a>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

              {/* 共同行前準備 */}
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
                        <button onClick={() => handleDeleteItem(item.id)} className="text-gray-600 hover:text-red-400 text-2xl font-bold px-2 pb-1">×</button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* 底部功能分頁導覽列 */}
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