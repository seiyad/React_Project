import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, updateDoc, query, orderBy, getDoc, setDoc
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import '../styles/Income.css'  

function Income() {
  const [currentUserId, setCurrentUserId] = useState(null)
  const [incomes, setIncomes] = useState([])
  const [currentBudget, setCurrentBudget] = useState(0)
  const [editId, setEditId] = useState('')
  const [incomeName, setIncomeName] = useState('')
  const [incomeDate, setIncomeDate] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const incomeProcessedRef = useRef(new Set()) // Track processed incomes
  const navigate = useNavigate()

  
  const getCurrentMonthKey = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => {
    let unsubscribeSnapshot = null
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        navigate('/'); 
        return 
      }
      setCurrentUserId(user.uid)

      const salaryKey = `monthlySalary_${user.uid}`
      const monthKey = getCurrentMonthKey()

      // Initial budget load
      const existingBudget = parseFloat(localStorage.getItem(salaryKey)) || 0
      setCurrentBudget(existingBudget)
      const incomeRef = collection(db, 'users', user.uid, 'incomes')
      const q = query(incomeRef, orderBy('date', 'desc'))

      unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        let currentIncomeTotal = 0
        const data = snapshot.docs.map((docSnap) => {
          const income = docSnap.data()
          const incDate = new Date(income.date)
          if (incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear) {
            currentIncomeTotal += income.amount
          }
          return { id: docSnap.id, ...income }
        })

        setIncomes(data)

        // **GET STORED INCOME TOTAL FROM FIRESTORE**
        const incomeStatsRef = doc(db, 'users', user.uid, 'income_stats', monthKey)
        const incomeStatsSnap = await getDoc(incomeStatsRef)
        const storedIncomeTotal = incomeStatsSnap.exists() ? incomeStatsSnap.data().totalIncome || 0 : 0

        // **CALCULATE DIFFERENCE AND UPDATE BUDGET**
        const diff = currentIncomeTotal - storedIncomeTotal
        if (diff !== 0) {
          const existingBudget = parseFloat(localStorage.getItem(salaryKey)) || 0
          const newTotalBudget = existingBudget + diff
          
          localStorage.setItem(salaryKey, newTotalBudget.toString())
          setCurrentBudget(newTotalBudget)
          
          // **UPDATE PROCESSED TOTAL IN FIRESTORE**
          await setDoc(incomeStatsRef, {
            totalIncome: currentIncomeTotal,
            monthKey: monthKey,
            updatedAt: new Date()
          }, { merge: true })
        }
      })
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeSnapshot) unsubscribeSnapshot()
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUserId) { 
      alert('You must be logged in'); 
      return 
    }
    if (!incomeName.trim() || !incomeDate.trim() || !incomeAmount.trim()) {
      alert('Please fill all details'); 
      return
    }

    const selectedDate = new Date(incomeDate)
    const now = new Date()
    if (selectedDate.getMonth() !== now.getMonth() || selectedDate.getFullYear() !== now.getFullYear()) {
      alert('You can only add income for the current month!'); 
      return
    }

    const incomeAmountNum = Number(incomeAmount.trim())
    const incomeData = {
      name: incomeName.trim(),
      date: incomeDate.trim(),
      amount: incomeAmountNum,
      time: new Date().toLocaleTimeString()
    }

    const incomeRef = collection(db, 'users', currentUserId, 'incomes')
    if (editId) {
      await updateDoc(doc(db, 'users', currentUserId, 'incomes', editId), incomeData)
    } else {
      await addDoc(incomeRef, incomeData)
    }
    clearForm()
  }

  const clearForm = () => {
    setEditId('')
    setIncomeName('')
    setIncomeDate('')
    setIncomeAmount('')
  }

  const handleEdit = (income) => {
    setEditId(income.id)
    setIncomeName(income.name)
    setIncomeDate(income.date)
    setIncomeAmount(String(income.amount))
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure to delete?')) {
      await deleteDoc(doc(db, 'users', currentUserId, 'incomes', id))
    }
  }

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'))
  }

  const now = new Date()
  const currentMonthIncomeTotal = incomes
    .filter((inc) => {
      const d = new Date(inc.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, inc) => sum + inc.amount, 0)

  return (
    <div>
      <header className="navbar">
        <div className="logo">
          <img src="/expense-logo.png" alt="Expense Tracker" />
        </div>
        <nav className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/expense">Expense</Link>
          <Link to="/income">Income</Link>
          <Link to="/profile">Profile</Link>
        </nav>
        <button id="logout" onClick={handleLogout}>Logout</button>
      </header>

      <div className="container">
        <h1>All Incomes</h1>

        <div className="income-total-badge" style={{ marginBottom: '20px' }}>
          <div><strong>Monthly Budget:</strong> ₹{(Number(currentBudget) || 0).toFixed(2)}</div>
          <div><strong>This Month Income:</strong> ₹{(Number(currentMonthIncomeTotal) || 0).toFixed(2)}</div>
          <small>NEW income added to budget ONCE only!</small>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="hidden" value={editId} readOnly />

          <label>Add Income Name</label>
          <input
            type="text"
            placeholder="e.g. Salary, Freelance, Business"
            value={incomeName}
            onChange={(e) => setIncomeName(e.target.value)}
          />

          <label className="date">Add Income Date</label>
          <input
            type="date"
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
          />

          <label>Add Income Amount</label>
          <input
            type="number"
            placeholder="Amount"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            step="0.01"
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" id="submit">
              {editId ? 'Update' : 'Save & Add to Budget'}
            </button>
            {editId && (
              <button type="button" onClick={clearForm} id="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="expense">
        <table className="expense-table">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>INCOME NAME</th>
              <th>DATE</th>
              <th>AMOUNT</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {incomes.length === 0 ? (
              <tr><td colSpan="6">No Record Found</td></tr>
            ) : (
              incomes.map((income, index) => (
                <tr key={income.id}>
                  <td>{index + 1}</td>
                  <td>{income.name}</td>
                  <td>{income.date}</td>
                  <td>₹{(Number(income.amount) || 0).toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => handleEdit(income)}>
                      EDIT
                    </button>
                  </td>
                  <td>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(income.id)}>
                      DELETE
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer>&copy; Expense Tracker</footer>
    </div>
  )
}

export default Income