import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, updateDoc, query, orderBy, where, getDocs
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import '../styles/Expense.css'

function Expense() {
  const [currentUserId, setCurrentUserId] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [editId, setEditId] = useState('')
  const [expenseName, setExpenseName] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const currentTotalSpentRef = useRef(0)
  const navigate = useNavigate()

  async function deleteOldExpenses(userId) {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const expenseRef = collection(db, 'users', userId, 'expenses')
    const oldQuery = query(expenseRef, where('date', '<', monthStart))
    const oldSnapshot = await getDocs(oldQuery)
    oldSnapshot.docs.forEach(async (docSnap) => {
      await deleteDoc(doc(db, 'users', userId, 'expenses', docSnap.id))
    })
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/')
        return
      }
      setCurrentUserId(user.uid)
      deleteOldExpenses(user.uid)

      const expenseRef = collection(db, 'users', user.uid, 'expenses')
      const q = query(expenseRef, orderBy('date', 'desc'))

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        let totalSpent = 0
        const data = snapshot.docs.map((docSnap, index) => {
          const expense = docSnap.data()
          const expDate = new Date(expense.date)
          if (
            expDate.getMonth() === currentMonth &&
            expDate.getFullYear() === currentYear
          ) {
            totalSpent = totalSpent+ expense.amount
          }
          return { id: docSnap.id, ...expense, index: index + 1 }
        })

        currentTotalSpentRef.current = totalSpent
        setExpenses(data)
      })

      return () => unsubscribeSnapshot()
    })

    return () => unsubscribeAuth()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentUserId) {
      alert('You must be logged in')
      return
    }

    if (!expenseName.trim() || !category.trim() || !date.trim() || !amount.trim()) {
      alert('Please fill all details')
      return
    }

    const selectedDate = new Date(date)
    const now = new Date()
    if (
      selectedDate.getMonth() !== now.getMonth() ||
      selectedDate.getFullYear() !== now.getFullYear()
    ) {
      alert('You can only add expenses for the current month!')
      return
    }

    const salaryKey = `monthlySalary_${currentUserId}`
    const monthlySalary = parseFloat(localStorage.getItem(salaryKey)) || 0
    const newAmount = Number(amount.trim())

    if (monthlySalary > 0 && !editId) {
      if (newAmount > monthlySalary) {
        alert(`Single expense cannot be greater than your monthly budget of ₹${monthlySalary.toFixed(2)}!`)
        return
      }
      if (currentTotalSpentRef.current >= monthlySalary) {
        alert('Budget limit reached! You cannot add more expenses this month.')
        return
      }
      if (currentTotalSpentRef.current + newAmount > monthlySalary) {
        alert(`This expense exceeds your budget! You can only spend ₹${(monthlySalary - currentTotalSpentRef.current).toFixed(2)} more.`)
        return
      }
    }

    const expenseData = {
      name: expenseName.trim(),
      catagorie: category.trim(),
      date: date.trim(),
      amount: newAmount,
      time: new Date().toLocaleTimeString()
    }

    const expenseRef = collection(db, 'users', currentUserId, 'expenses')

    if (editId) {
      await updateDoc(doc(db, 'users', currentUserId, 'expenses', editId), expenseData)
    } else {
      await addDoc(expenseRef, expenseData)
    }

    clearForm()
  }

  const clearForm = () => {
    setEditId('')
    setExpenseName('')
    setCategory('')
    setDate('')
    setAmount('')
  }

  const handleEdit = (expense) => {
    setEditId(expense.id)
    setExpenseName(expense.name)
    setCategory(expense.catagorie)
    setDate(expense.date)
    setAmount(String(expense.amount))
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure to delete?')) {
      await deleteDoc(doc(db, 'users', currentUserId, 'expenses', id))
    }
  }

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'))
  }

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
        <h1>All Expenses</h1>

        <form onSubmit={handleSubmit}>
          <input type="hidden" value={editId} readOnly />

          <label>Add Expense Name</label>
          <input
            type="text"
            placeholder="Expense Name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
          />

          <label>Add Expense Category</label>
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <label className="date">Add Expense Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <label>Add Expense Amount</label>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <button type="submit" id="submit">Save</button>
        </form>
        </div>

        <div className="expense">
          <table className="expense-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Expense Name</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="7">No Record Found</td>
                </tr>
              ) : (
                expenses.map((expense, index) => (
                  <tr key={expense.id}>
                    <td>{index + 1}</td>
                    <td>{expense.name}</td>
                    <td>{expense.catagorie}</td>
                    <td>{expense.date}</td>
                    <td>₹{expense.amount}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => handleEdit(expense)}
                      >
                        EDIT
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleDelete(expense.id)}
                      >
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

export default Expense