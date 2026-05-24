import React, { useState } from 'react';

const Login = ({ setSudahLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://backend-spk-saw.vercel.app/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token_spk', data.token);
        localStorage.setItem('role_spk', data.role);
        setSudahLogin(true);
      } else {
        setError(data.detail || 'Login gagal, Bos!');
      }
    } catch (err) {
      setError('Server mati atau internet lemot!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.logo}> Login SPK</h1>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {error && <p style={styles.errorText}>{error}</p>}
      </div>

    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  loginBox: {
    backgroundColor: '#fff',
    border: '1px solid #dbdbdb',
    padding: '40px',
    width: '350px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '10px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#262626',
    letterSpacing: '-1px',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    backgroundColor: '#fafafa',
    border: '1px solid #dbdbdb',
    borderRadius: '3px',
    padding: '9px 12px',
    marginBottom: '8px',
    fontSize: '12px',
  },
  button: {
    backgroundColor: '#0095f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '7px',
    fontWeight: '600',
    marginTop: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  divider: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    margin: '20px 0',
  },
  line: {
    flex: 1,
    height: '1px',
    backgroundColor: '#dbdbdb',
  },
  or: {
    margin: '0 18px',
    color: '#8e8e8e',
    fontSize: '13px',
    fontWeight: '600',
  },
  errorText: {
    color: '#ed4956',
    fontSize: '14px',
    marginTop: '15px',
    textAlign: 'center',
  },
  footerBox: {
    backgroundColor: '#fff',
    border: '1px solid #dbdbdb',
    padding: '20px',
    width: '350px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#262626',
    margin: 0,
  },
  link: {
    color: '#0095f6',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default Login;