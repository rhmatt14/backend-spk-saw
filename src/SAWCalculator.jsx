import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf"; 
import autoTable from 'jspdf-autotable'; 

const SAWCalculator = () => {
  const [kriteria, setKriteria] = useState([]);
  const [alternatif, setAlternatif] = useState([]);
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nama: '', nilai1: '', nilai2: '', nilai3: '', nilai4: '' 
  });

  // --- TAMBAHAN FITUR DARK MODE ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- ROLE ---
  const [userRole, setUserRole] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });

  useEffect(() => {
    setUserRole(localStorage.getItem('role_spk'));
    fetchDataDariAPI();
  }, []);

  const handleTambahUser = async (e) => {
    e.preventDefault();
    const tiket = localStorage.getItem('token_spk');
    try {
      const response = await fetch('https://backend-spk-saw.vercel.app/api/tambah-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tiket}`
        },
        body: JSON.stringify(newUser)
      });
      const data = await response.json();
      if (response.ok) {
        alert("User berhasil ditambahkan!");
        setNewUser({ username: '', password: '', role: 'user' });
      } else {
        alert(data.detail || "Gagal menambah user.");
      }
    } catch (error) {
      alert("Error menghubungi server.");
    }
  };

  // 1. GET DATA (Nggak perlu tiket karena publik)
  const fetchDataDariAPI = async () => {
    try {
      const response = await fetch('https://backend-spk-saw.vercel.app/api/data-saw');
      const data = await response.json();
      setKriteria(data.kriteria);
      setAlternatif(data.alternatif);
      setLoading(false);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  };

  useEffect(() => {
    if (kriteria.length > 0 && alternatif.length > 0) {
      hitungSAW();
    }
  }, [kriteria, alternatif]);

  const hitungSAW = () => {
    const minMax = {};
    kriteria.forEach((k) => {
      const semuaNilai = alternatif.map((a) => a.nilai[k.id]);
      minMax[k.id] = {
        max: Math.max(...semuaNilai),
        min: Math.min(...semuaNilai),
      };
    });

    const pemeringkatan = alternatif.map((alt) => {
      let skorTotal = 0;
      kriteria.forEach((k) => {
        let normalisasi = 0;
        const nilaiAsli = alt.nilai[k.id]; 
        if (k.atribut === 'benefit') {
          normalisasi = nilaiAsli / minMax[k.id].max;
        } else {
          normalisasi = minMax[k.id].min / nilaiAsli;
        }
        skorTotal += normalisasi * parseFloat(k.bobot);
      });
      return { ...alt, skor: skorTotal.toFixed(3) };
    });

    setHasil(pemeringkatan.sort((a, b) => b.skor - a.skor));
  };

  // 2. TAMBAH & EDIT DATA (Wajib Bawa Tiket)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ambil tiket JWT dari brankas
    const tiket = localStorage.getItem('token_spk');
    
    const payload = {
      nama: formData.nama,
      nilai: {
        1: parseFloat(formData.nilai1),
        2: parseFloat(formData.nilai2),
        3: parseFloat(formData.nilai3),
        4: parseFloat(formData.nilai4),
      }
    };

    const url = editId 
      ? `https://backend-spk-saw.vercel.app/api/edit-supplier/${editId}` 
      : 'https://backend-spk-saw.vercel.app/api/tambah-supplier';
    
    const method = editId ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tiket}` // <-- PAMER TIKET KE SATPAM
        },
        body: JSON.stringify(payload)
      });
      
      resetForm();
      fetchDataDariAPI();
    } catch (error) {
      console.error("Gagal menyimpan data", error);
    }
  };

  // 3. HAPUS DATA (Wajib Bawa Tiket)
  const handleHapus = async (id) => {
    if (!window.confirm("Yakin ingin menghapus supplier ini?")) return;
    
    // Ambil tiket JWT dari brankas
    const tiket = localStorage.getItem('token_spk');

    try {
      await fetch(`https://backend-spk-saw.vercel.app/api/hapus-supplier/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tiket}` // <-- PAMER TIKET KE SATPAM
        }
      });
      fetchDataDariAPI();
    } catch (error) {
      console.error("Gagal menghapus data", error);
    }
  };

  const klikEdit = (item) => {
    setEditId(item.id);
    setFormData({
      nama: item.nama,
      nilai1: item.nilai[1],
      nilai2: item.nilai[2],
      nilai3: item.nilai[3],
      nilai4: item.nilai[4]
    });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ nama: '', nilai1: '', nilai2: '', nilai3: '', nilai4: '' });
  };

  const cetakPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Keputusan Pemilihan Supplier", 14, 22);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Metode: Simple Additive Weighting (SAW)", 14, 30);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Waktu: ${new Date().toLocaleTimeString('id-ID')}`, 14, 36);

      const tableColumn = ["Peringkat", "Nama Supplier", "Skor Akhir (V)", "Status"];
      const tableRows = [];

      hasil.forEach((item, index) => {
        const status = index === 0 ? "Rekomendasi Utama" : "Alternatif";
        const rowData = [index + 1, item.nama, item.skor, status];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }, 
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 45;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Kesimpulan Analisis:", 14, finalY + 12);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const teksKesimpulan = `Berdasarkan proses perhitungan Sistem Pendukung Keputusan menggunakan algoritma SAW, manajemen direkomendasikan untuk menjalin kerja sama dengan ${hasil[0]?.nama} sebagai pilihan utama dengan perolehan skor preferensi tertinggi yaitu ${hasil[0]?.skor}.`;
      
      const splitTeks = doc.splitTextToSize(teksKesimpulan, 180);
      doc.text(splitTeks, 14, finalY + 18);
      doc.save("Laporan_SPK_SAW.pdf");
      
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Maaf, terjadi kesalahan saat membuat PDF.");
    }
  };

  // KUMPULAN KELAS CSS DINAMIS UNTUK DARK/LIGHT MODE
  const themeBg = isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800';
  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textTitle = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSubtitle = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const inputBg = isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-gray-300';
  const tableHeaderBg = isDarkMode ? 'bg-black text-slate-200' : 'bg-slate-800 text-white';
  const tableRowHover = isDarkMode ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-b';
  const analysisBg = isDarkMode ? 'bg-indigo-950 border-indigo-500' : 'bg-indigo-50 border-indigo-600';
  const analysisText = isDarkMode ? 'text-indigo-200' : 'text-slate-700';

  return (
    <div className={`p-8 min-h-screen font-sans transition-colors duration-500 ${themeBg}`}>
      
      {/* HEADER & TOMBOL SAKLAR DARK MODE */}
      <div className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-bold ${textTitle}`}>Sistem Pendukung Keputusan (SAW)</h1>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-md ${isDarkMode ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      {/* KOTAK FORM */}
      <div className={`p-6 rounded-lg shadow-md mb-8 border-t-4 border-blue-600 transition-colors duration-500 ${cardBg}`}>
        <h2 className={`text-xl font-bold mb-4 ${textTitle}`}>
          {editId ? "✏️ Edit Data Supplier" : "➕ Tambah Supplier Baru"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Nama Supplier</label>
            <input required type="text" className={`border p-2 rounded w-48 transition-colors ${inputBg}`} value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Harga (Cost)</label>
            <input required type="number" className={`border p-2 rounded w-28 transition-colors ${inputBg}`} value={formData.nilai1} onChange={(e) => setFormData({...formData, nilai1: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Kualitas (Benefit)</label>
            <input required type="number" className={`border p-2 rounded w-32 transition-colors ${inputBg}`} value={formData.nilai2} onChange={(e) => setFormData({...formData, nilai2: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Pengiriman (Cost)</label>
            <input required type="number" className={`border p-2 rounded w-32 transition-colors ${inputBg}`} value={formData.nilai3} onChange={(e) => setFormData({...formData, nilai3: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Layanan (Benefit)</label>
            <input required type="number" className={`border p-2 rounded w-32 transition-colors ${inputBg}`} value={formData.nilai4} onChange={(e) => setFormData({...formData, nilai4: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors shadow-sm">
              {editId ? "Update Data" : "Simpan"}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className={`font-bold py-2 px-4 rounded transition-colors ${isDarkMode ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-300 text-slate-800 hover:bg-gray-400'}`}>
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${textTitle}`}>Tabel Hasil Perankingan</h2>
        {hasil.length > 0 && (
          <button onClick={cetakPDF} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-colors flex items-center gap-2">
            📄 Cetak PDF
          </button>
        )}
      </div>

      {/* KOTAK TABEL */}
      <div className={`shadow-md rounded-lg overflow-hidden border transition-colors duration-500 ${cardBg}`}>
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className={`text-sm uppercase tracking-wider ${tableHeaderBg}`}>
              <th className="px-5 py-4 font-medium">Peringkat</th>
              <th className="px-5 py-4 font-medium">Nama Supplier</th>
              <th className="px-5 py-4 font-medium">Skor Akhir (V)</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((item, index) => (
              <tr key={item.id} className={`transition-colors border-b ${tableRowHover}`}>
                <td className={`px-5 py-4 font-bold text-lg ${textTitle}`}>{index + 1}</td>
                <td className={`px-5 py-4 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.nama}</td>
                <td className={`px-5 py-4 font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.skor}</td>
                <td className="px-5 py-4">
                  {index === 0 ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${isDarkMode ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                      ✨ Pilihan Utama
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-5 py-4 flex gap-2">
                  {userRole === 'admin' && (
                    <>
                      <button onClick={() => klikEdit(item)} className={`px-3 py-1 rounded text-sm font-bold transition-colors ${isDarkMode ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-800' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                        Edit
                      </button>
                      <button onClick={() => handleHapus(item.id)} className={`px-3 py-1 rounded text-sm font-bold transition-colors ${isDarkMode ? 'bg-red-900/50 text-red-400 hover:bg-red-800' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                        Hapus
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KOTAK KESIMPULAN */}
      {hasil.length > 0 && (
        <div className={`mt-6 border-l-4 p-6 rounded shadow-sm transition-colors duration-500 ${analysisBg}`}>
          <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>💡 Analisis & Kesimpulan Keputusan</h3>
          <p className={`leading-relaxed text-justify ${analysisText}`}>
            Berdasarkan hasil perhitungan menggunakan algoritma Simple Additive Weighting (SAW) terhadap <strong className={isDarkMode ? 'text-white' : 'text-black'}>{hasil.length}</strong> alternatif supplier yang ada, sistem secara objektif merekomendasikan <strong className={isDarkMode ? 'text-white' : 'text-black'}>{hasil[0].nama}</strong> sebagai keputusan terbaik dengan perolehan skor preferensi (V) tertinggi sebesar <strong className={isDarkMode ? 'text-white' : 'text-black'}>{hasil[0].skor}</strong>. 
            <br/><br/>
            Supplier ini terpilih karena memiliki perbandingan yang paling optimal antara kriteria biaya (seperti harga barang dan ongkos kirim) dengan kriteria keuntungan (seperti kualitas dan layanan garansi), menjadikannya kandidat paling efisien dan menguntungkan bagi perusahaan.
          </p>
        </div>
      )}

      {/* ADMIN PANEL: TAMBAH USER */}
      {userRole === 'admin' && (
        <div className={`mt-8 p-6 rounded-lg shadow-md border-t-4 border-emerald-600 transition-colors duration-500 ${cardBg}`}>
          <h2 className={`text-xl font-bold mb-4 ${textTitle}`}>🛡️ Admin Panel - Tambah User</h2>
          <form onSubmit={handleTambahUser} className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
              <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Username</label>
              <input required type="text" className={`border p-2 rounded w-48 transition-colors ${inputBg}`} value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Password</label>
              <input required type="password" className={`border p-2 rounded w-48 transition-colors ${inputBg}`} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={`text-sm font-semibold mb-1 ${textSubtitle}`}>Role</label>
              <select required className={`border p-2 rounded w-56 transition-colors ${inputBg}`} value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                <option value="user">User (Tambah/Lihat)</option>
                <option value="admin">Admin (Full Akses)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded transition-colors shadow-sm">
                Tambah User
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default SAWCalculator;