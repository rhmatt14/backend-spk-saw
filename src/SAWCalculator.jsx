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

  useEffect(() => {
    fetchDataDariAPI();
  }, []);

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
      alert("Maaf, terjadi kesalahan saat membuat PDF. Cek Console (F12).");
    }
  };

  return (
    <div className="p-8 bg-slate-100 min-h-screen font-sans">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">Sistem Pendukung Keputusan (SAW)</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-t-4 border-blue-600">
        <h2 className="text-xl font-bold mb-4 text-slate-700">
          {editId ? "✏️ Edit Data Supplier" : "➕ Tambah Supplier Baru"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Nama Supplier</label>
            <input required type="text" className="border p-2 rounded w-48 bg-slate-50" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Harga (Cost)</label>
            <input required type="number" className="border p-2 rounded w-28 bg-slate-50" value={formData.nilai1} onChange={(e) => setFormData({...formData, nilai1: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Kualitas (Benefit)</label>
            <input required type="number" className="border p-2 rounded w-32 bg-slate-50" value={formData.nilai2} onChange={(e) => setFormData({...formData, nilai2: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Pengiriman (Cost)</label>
            <input required type="number" className="border p-2 rounded w-32 bg-slate-50" value={formData.nilai3} onChange={(e) => setFormData({...formData, nilai3: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Layanan (Benefit)</label>
            <input required type="number" className="border p-2 rounded w-32 bg-slate-50" value={formData.nilai4} onChange={(e) => setFormData({...formData, nilai4: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors shadow-sm">
              {editId ? "Update Data" : "Simpan"}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className="bg-gray-300 hover:bg-gray-400 text-slate-800 font-bold py-2 px-4 rounded transition-colors">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Tabel Hasil Perankingan</h2>
        {hasil.length > 0 && (
          <button onClick={cetakPDF} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-colors flex items-center gap-2">
            📄 Cetak PDF
          </button>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-sm uppercase tracking-wider">
              <th className="px-5 py-4 font-medium">Peringkat</th>
              <th className="px-5 py-4 font-medium">Nama Supplier</th>
              <th className="px-5 py-4 font-medium">Skor Akhir (V)</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.map((item, index) => (
              <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 font-bold text-lg text-slate-700">{index + 1}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{item.nama}</td>
                <td className="px-5 py-4 text-blue-600 font-bold text-lg">{item.skor}</td>
                <td className="px-5 py-4">
                  {index === 0 ? (
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      ✨ Pilihan Utama
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="px-5 py-4 flex gap-2">
                  <button onClick={() => klikEdit(item)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded text-sm font-bold transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleHapus(item.id)} className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded text-sm font-bold transition-colors">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasil.length > 0 && (
        <div className="mt-6 bg-indigo-50 border-l-4 border-indigo-600 p-6 rounded shadow-sm">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">💡 Analisis & Kesimpulan Keputusan</h3>
          <p className="text-slate-700 leading-relaxed text-justify">
            Berdasarkan hasil perhitungan menggunakan algoritma Simple Additive Weighting (SAW) terhadap <strong>{hasil.length}</strong> alternatif supplier yang ada, sistem secara objektif merekomendasikan <strong>{hasil[0].nama}</strong> sebagai keputusan terbaik dengan perolehan skor preferensi (V) tertinggi sebesar <strong>{hasil[0].skor}</strong>. 
            <br/><br/>
            Supplier ini terpilih karena memiliki perbandingan yang paling optimal antara kriteria biaya (seperti harga barang dan ongkos kirim) dengan kriteria keuntungan (seperti kualitas dan layanan garansi), menjadikannya kandidat paling efisien dan menguntungkan bagi perusahaan.
          </p>
        </div>
      )}

    </div>
  );
};

export default SAWCalculator;