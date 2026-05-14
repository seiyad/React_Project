import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import '../styles/Register.css'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard')
    })
    return () => unsubscribe()
  }, [navigate])

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: name })
      localStorage.setItem('userName', name)

      alert(`Registration successful! Welcome, ${name}.`)
      navigate('/dashboard')

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered.')
      } else if (error.code === 'auth/invalid-email') {
        alert('Invalid email address.')
      } else {
        alert(error.message)
      }
    }
  }

  return (
    <div className="register-body">
      <div className="main-container">

        <div className="image-section">
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
            alt="Register Image"
          />
        </div>

        <div className="login-section">
          <h2>Create Account</h2>

          <div className="input-group">
            <input
              type="text"
              id="name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button id="register" onClick={handleRegister}>Register</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Register
