import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import LandingpageImage from '../assets/LandingpageImage.jpg'
import '../styles/Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard')
    })
    return () => unsubscribe()
  }, [navigate])

  const handleLogin = () => {
    if (!email || !password) {
      alert('Please fill in a valid email and password')
      return
    }
    signInWithEmailAndPassword(auth, email, password)
      .then(() => navigate('/dashboard'))
      .catch(() => alert('Invalid email or password'))
  }

  const handleRegister = () => {
    navigate('/register')
  }

  return (
    <div className="login-body">
      <div className="main-container">

        <div className="image-section">
          <img
            src = {LandingpageImage}
            alt="Login"
          />
        </div>

        <div className="login-section">
          <h2>Welcome Back</h2>

          <div className="input-group">
            <input
              type="email"
              id="username"
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

            <button id="login" onClick={handleLogin}>Login</button>
            <button id="register" onClick={handleRegister}>Register</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login
