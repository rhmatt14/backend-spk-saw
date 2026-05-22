import React, { useState, useEffect } from 'react';
import Login from './Login'; 
import SAWCalculator from './SAWCalculator'; // Ini file hitung-hitungan SPK lu

function App() {
  // State untuk ngecek apakah user udah punya tiket
  const [sudahLogin, setSudahLogin] = useState(false);

  // Cek brankas (localStorage) pas web pertama kali dibuka
  useEffect(() => {
    const tiket = localStorage.getItem('token_spk');
    if (tiket) {
      setSudahLogin(true);
    }
  }, []);

  // Fungsi Logout 
  const handleLogout = () => {
    localStorage.removeItem('token_spk'); // Buang tiketnya
    setSudahLogin(false); // Kunci lagi halamannya
  };

  // --- LOGIKA PENGGEMBOKAN ---
  // Jika belum login, stop di sini dan tampilkan form Login aja!
  if (!sudahLogin) {
    return <Login setSudahLogin={setSudahLogin} />;
  }

  // Jika sudah login, tampilkan tabel SAWCalculator
  return (
    <div>
      {/* Tombol logout di pojok kanan atas */}
      <div style={{ textAlign: 'right', padding: '10px 20px' }}>
         <button 
            onClick={handleLogout} 
            style={{ 
              background: '#dc3545', 
              color: 'white', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Logout🚪
          </button>
      </div>
      
      {/* Ini komponen utama aplikasi lu */}
      <SAWCalculator />
      
    </div>
  );
}

export default App;