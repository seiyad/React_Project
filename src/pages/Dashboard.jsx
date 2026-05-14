import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import Logo from "../assets/expenselogo.png"
import '../styles/Dashboard.css'

function Dashboard() {
  const [totalSpent, setTotalSpent]           = useState('₹0.00')
  const [remainingBudget, setRemainingBudget] = useState('₹0.00')
  const [highestExpense, setHighestExpense]   = useState('₹0.00')
  const [progressWidth, setProgressWidth]     = useState('0%')
  const [progressBg, setProgressBg]           = useState('#2ecc71')
  const [progressText, setProgressText]       = useState('0% of monthly budget used')
  const [progressAmount, setProgressAmount]   = useState('')

  const monthlySalaryRef = useRef(0)
  const budgetAlertShown = useRef(false)
  const salaryKeyRef     = useRef('')
  const unsubSnapRef     = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/')
        return
      }

      const salaryKey = `monthlySalary_${user.uid}`
      salaryKeyRef.current = salaryKey

      let monthlySalary = parseFloat(localStorage.getItem(salaryKey)) || 0

      if (!monthlySalary) {
        const input = prompt('Enter your monthly budget (₹):')
        const entered = parseFloat(input)
        if (!isNaN(entered) && entered > 0) {
          localStorage.setItem(salaryKey, entered)
          monthlySalary = entered
        } else {
          alert('Invalid budget entered. Please enter a valid amount.')
          navigate('/')
          return
        }
      }

      monthlySalaryRef.current = monthlySalary

      const expenseRef = collection(db, 'users', user.uid, 'expenses')

      if (unsubSnapRef.current) unsubSnapRef.current()

      unsubSnapRef.current = onSnapshot(expenseRef, (snapshot) => {
        let totalSpentVal = 0
        let highestExpVal = 0

        const now          = new Date()
        const currentMonth = now.getMonth()
        const currentYear  = now.getFullYear()

        snapshot.docs.forEach((docSnap) => {
          const expense = docSnap.data()
          const expDate = new Date(expense.date)
          if (
            expDate.getMonth() === currentMonth &&
            expDate.getFullYear() === currentYear
          ) {
            totalSpentVal = totalSpentVal+expense.amount
            if (expense.amount > highestExpVal) {
              highestExpVal = expense.amount
            }
          }
        })

        const budget    = monthlySalaryRef.current
        const remaining = budget - totalSpentVal
        const percent   = budget > 0
          ? Math.min((totalSpentVal / budget) * 100, 100).toFixed(1)
          : 0

        if (budget > 0) {
          if (totalSpentVal >= budget && !budgetAlertShown.current) {
            budgetAlertShown.current = true
            alert(' Budget limit reached! You have used your entire monthly budget.')
          } else if (totalSpentVal >= budget * 0.9 && totalSpentVal < budget && !budgetAlertShown.current) {
            alert(' Warning: You have used 90% of your monthly budget!')
          } else if (totalSpentVal >= budget * 0.5 && totalSpentVal < budget * 0.9 && !budgetAlertShown.current) {
            alert(' Notice: You have used 50% of your monthly budget.')
          }
        }

        if (totalSpentVal < budget) budgetAlertShown.current = false

        setTotalSpent(`₹${totalSpentVal.toFixed(2)}`)
        setRemainingBudget(`₹${remaining.toFixed(2)}`)
        setHighestExpense(`₹${highestExpVal.toFixed(2)}`)
        setProgressWidth(`${percent}%`)
        setProgressBg(
          percent > 80 ? '#e74c3c' :
          percent > 50 ? '#f39c12' :
          '#2ecc71'
        )
        setProgressText(`${percent}% of monthly budget used`)
        setProgressAmount(`₹${totalSpentVal.toFixed(2)} spent of ₹${budget.toFixed(2)}`)
      })
    })

    return () => {
      unsubAuth()
      if (unsubSnapRef.current) unsubSnapRef.current()
    }
  }, [navigate])

  const handleEditBudget = () => {
    const currentBudget = monthlySalaryRef.current

    const input = prompt(
      `Current Budget: ₹${currentBudget.toFixed(2)}\n\nEnter amount to ADD to your budget (₹):`
    )

    if (input === null) return

    const entered = parseFloat(input)

    if (input.trim() === '') {
      alert(' No amount entered. Budget unchanged.')
      return
    }

    if (isNaN(entered)) {
      alert(' Invalid input. Please enter a valid number.')
      return
    }

    if (entered <= 0) {
      alert(' Amount must be greater than ₹0. Budget so Please unchanged.')
      return
    }

    const newBudget = currentBudget + entered
    monthlySalaryRef.current = newBudget
    localStorage.setItem(salaryKeyRef.current, newBudget)
    budgetAlertShown.current = false

    alert(
      ` Budget Updated!\n\nPrevious Budget : ₹${currentBudget.toFixed(2)}\nAdded Amount   : ₹${entered.toFixed(2)}\nNew Total Budget: ₹${newBudget.toFixed(2)}`
    )
  }

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'))
  }

  return (
    <div style={{ backgroundColor: '#0d1117', color: '#fff' }}>

      <nav className="navbar">
        <div className="logo">
          <img src={Logo} alt="Expence Trakker" height="130px" width="300px" />
        </div>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/expense">Expense</Link>
          <Link to="/income">Income</Link>
          <Link to="/profile">Profile</Link>
          <button id="logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <section className="dash-container">
        <h1>Dashboard</h1>

        <div className="cards">
          <div className="card red">
            <h3>Total Spent (This Month)</h3>
            <div className="amount" id="totalSpent">{totalSpent}</div>
          </div>
          <div className="card green">
            <h3>Remaining Budget</h3>
            <div className="amount" id="remainingBudget">{remainingBudget}</div>
          </div>
          <div className="card blue">
            <h3>Highest Expense</h3>
            <div className="amount" id="highestExpense">{highestExpense}</div>
          </div>
        </div>

        <div className="progress-section">
          <h3>Monthly Progress</h3>
          <button id="editBudgetBtn" onClick={handleEditBudget}>Edit Budget</button>

          <div className="contain">
            <div
              id="monthlyProgressBar"
              className="brogress"
              style={{ width: progressWidth, backgroundColor: progressBg }}
            ></div>
          </div>

          <p id="progressText" style={{ marginTop: '10px' }}>{progressText}</p>
          <p id="progressamount">{progressAmount}</p>
        </div>

      </section>

      <footer>&copy; Expense Tracker</footer>
    </div>
  )
}

export default Dashboard