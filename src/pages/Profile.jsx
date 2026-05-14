import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import '../styles/Profile.css'

function Profile() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [createdDate, setCreatedDate] = useState('')
  const [avatarLetter, setAvatarLetter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/')
        return
      }

      await user.reload()
      const updatedUser = auth.currentUser

      let name = updatedUser.displayName || localStorage.getItem('userName')

      if (!name) {
        name = prompt('Your name is missing. Please enter your name:')
        if (name && name.trim() !== '') {
          name = name.trim()
          await updateProfile(updatedUser, { displayName: name })
          localStorage.setItem('userName', name)
        } else {
          name = 'User'
        }
      }

      const date = new Date(updatedUser.metadata.creationTime).toLocaleDateString()

      setDisplayName(name)
      setEmail(updatedUser.email)
      setCreatedDate(date)
      setAvatarLetter(name.charAt(0).toUpperCase())
    })

    return () => unsubscribe()
  }, [navigate])

  const handleLogout = () => {
    signOut(auth).then(() => {
      localStorage.removeItem('userName')
      navigate('/')
    })
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>

      <div className="header">
        <div className="profile-avatar" id="profileAvatar">
          {avatarLetter}
        </div>
      </div>

      <nav className="navbar">
        <Link to="/dashboard">
          <button className="btn">
            <div className="h">Home</div>
          </button>
        </Link>
      </nav>

      <div className="container">

        <div className="name">
          <h2 id="displayApp">{displayName}</h2>
          <p>Expense Tracker User</p>
        </div>

        <div className="customer">
          <span>Name:</span>
          <span id="displayUserName">{displayName}</span>

          <span>Email:</span>
          <span id="displayEmail">{email}</span>

          <span>Created On:</span>
          <span id="displayCreatedDate">{createdDate}</span>
        </div>

        <div className="section">
          <h3>About Me</h3>
          <p>
            I use this expense tracker to manage my daily income and expenses.
          </p>
        </div>

        <button id="logoutButton" onClick={handleLogout}>
          <div className="h">Logout</div>
        </button>

      </div>

      <footer>
        &copy; Expense Tracker
      </footer>

    </div>
  )
}

export default Profile
