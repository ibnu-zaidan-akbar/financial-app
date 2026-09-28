'use client';

import { useSession } from 'next-auth/react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncTransaksiToCloud, syncTabunganToCloud, getFinancialData, deleteTabunganFromCloud, deleteTransaksiFromCloud } from '@/app/actions';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface TabunganData {
  id: string;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiData {
  id: string;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: string | Date;
  tipe: string;
  kategoriId: string | null;
  tabunganId: string | null;
  tabunganTujuanId?: string | null;
  biayaAdmin?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

type DataSource = 'local';

interface FinancialContextType {
  tabungan: TabunganData[];
  transaksi: TransaksiData[];
  refreshTabungan: () => Promise<void>;
  refreshTransaksi: () => Promise<void>;
  updateTabunganBalance: (id: string, newBalance: number) => void;
  userId: string;
  createTabungan: (data: { nama: string; saldoAwal: number }) => Promise<any>;
  createTransaksi: (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: string;
    tabunganId?: string;
    tabunganTujuanId?: string | null;
    biayaAdmin?: number;
  }) => Promise<any>;
  dataSource: DataSource;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  forceSync: () => Promise<void>;
  exportData: (type: 'transactions' | 'savings') => Promise<void>;
  // importData: (file: File) => Promise<any>;
  updateTabungan: (id: string, data: { nama: string; saldoAwal: number }) => Promise<void>;
  deleteTabungan: (id: string) => Promise<void>;
  deleteTransaksi: (id: string) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const getUserId = () => {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';

  let id = localStorage.getItem('financeUserId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('financeUserId', id);
    console.log('🆔 Generated new userId:', id);
  } else {
    console.log('🆔 Using existing userId:', id);
  }
  return id;
};

export const getKategoriFromNama = (nama: string) => {
  const lowerNama = nama.toLowerCase();
  if (lowerNama.includes('bca') || lowerNama.includes('mandiri') || lowerNama.includes('bni') ||
    lowerNama.includes('bri') || lowerNama.includes('cimb') || lowerNama.includes('danamon') ||
    lowerNama.includes('permata') || lowerNama.includes('bank')) {
    return 'bank';
  } else if (lowerNama.includes('gopay') || lowerNama.includes('ovo') || lowerNama.includes('dana') ||
    lowerNama.includes('shopeepay') || lowerNama.includes('linkaja') || lowerNama.includes('sakuku')) {
    return 'e-wallet';
  } else if (lowerNama.includes('ktm') || lowerNama.includes('tapcash') || lowerNama.includes('flazz') || lowerNama.includes('brizzi') ||
    lowerNama.includes('emoney') || lowerNama.includes('ezlink')) {
    return 'e-money';
  } else if (lowerNama.includes('cash') || lowerNama.includes('tunai') || lowerNama.includes('uang')) {
    return 'cash';
  }
  return 'lainnya';
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string>('default_user');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const {
    tabungan: localTabungan,
    transaksi: localTransaksi,
    isOnline,
    loadFromLocal,
    updateData
  } = useLocalStorage({
    userId,
    autoSave: true,
    autoLoad: true
  });

  const syncToCloud = async (type: 'transaksi' | 'tabungan', data: any) => {
    if (!navigator.onLine || userId === 'default_user') {
      if (!navigator.onLine) setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      if (type === 'transaksi') {
        await syncTransaksiToCloud(userId, data);
      } else {
        await syncTabunganToCloud(userId, data);
      }
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (error) {
      console.error(`☁️ Sync Error (${type}):`, error);
      setSyncStatus('error');
      throw error;
    }
  };

  const [isMigrating, setIsMigrating] = useState(false);
  useEffect(() => {
    const handleIdentityAndMigration = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        const currentId = session.user.id;
        const anonId = localStorage.getItem('financeUserId');

        if (anonId && anonId !== currentId && anonId !== 'default_user' && !isMigrating) {
          setIsMigrating(true);
          console.log('🔄 Mendeteksi data anonim, memulai migrasi...');

          try {
            const tabKey = `finance_data_tabungan_${anonId}`;
            const trxKey = `finance_data_transaksi_${anonId}`;

            const oldTabungan = localStorage.getItem(tabKey);
            const oldTransaksi = localStorage.getItem(trxKey);

            if (oldTabungan || oldTransaksi) {
              const tabunganData = JSON.parse(oldTabungan || '[]');
              const transaksiData = JSON.parse(oldTransaksi || '[]');

              await Promise.all([
                ...tabunganData.map((tab: any) => syncTabunganToCloud(currentId, tab)),
                ...transaksiData.map((trx: any) => syncTransaksiToCloud(currentId, trx))
              ]);

              localStorage.removeItem(tabKey);
              localStorage.removeItem(trxKey);
              console.log('✅ Data berhasil dikirim ke Cloud');
            }

            localStorage.removeItem('financeUserId');
            document.cookie = "guest-mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

            console.log('✅ Migrasi tuntas, menyegarkan sesi...');
            window.location.href = "/";

          } catch (err) {
            console.error('❌ Migrasi gagal:', err);
            setIsMigrating(false);
          }
        } else {
          if (userId !== currentId) {
            setUserId(currentId);
          }
        }
      } else if (status === 'unauthenticated') {
        const id = getUserId();
        if (userId !== id) setUserId(id);
      }
    };

    handleIdentityAndMigration();
  }, [status, session?.user?.id, isMigrating]);

  const fetchFromCloud = async (id: string) => {
    if (!navigator.onLine || id === 'default_user') return;
    setSyncStatus('syncing');

    try {
      const cloudData = await getFinancialData(id);
      if (cloudData && (cloudData.tabungan.length > 0 || cloudData.transaksi.length > 0)) {
        setTabungan(cloudData.tabungan);
        setTransaksi(cloudData.transaksi);
        updateData(cloudData.tabungan, cloudData.transaksi);
        console.log('✅ Data berhasil disinkronkan dari Cloud');
      }

      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (error) {
      console.error('❌ Gagal fetch dari cloud:', error);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (userId !== 'default_user') {
      const initData = async () => {
        await loadFromLocal();
        setTabungan(localTabungan);
        setTransaksi(localTransaksi);

        if (status === 'authenticated') {
          await fetchFromCloud(userId);
        }
      };

      initData();
    }
  }, [userId, status]);

  const refreshTabungan = async () => {
    console.log('🔄 Refreshing tabungan from local storage...');
    try {
      await loadFromLocal();
      setTabungan(localTabungan);
      console.log('✅ Tabungan loaded from local storage');
    } catch (error) {
      console.error('Error loading tabungan from local storage:', error);
      setSyncStatus('error');
    }
  };

  const refreshTransaksi = async () => {
    try {
      await loadFromLocal();
      setTransaksi(localTransaksi);
      console.log('✅ Transaksi loaded from local storage');
    } catch (error) {
      console.error('Error loading transaksi from local storage:', error);
      setSyncStatus('error');
    }
  };

  const updateTabunganBalance = (id: string, newBalance: number) => {
    const target = tabungan.find(t => t.id === id);
    if (!target) return;

    const updatedTab: TabunganData = {
      ...target,
      jumlah: newBalance,
      updatedAt: new Date()
    };

    const newList = tabungan.map((t): TabunganData =>
      t.id === id ? updatedTab : t
    );

    setTabungan(newList);
    updateData(newList, transaksi);
    syncToCloud('tabungan', updatedTab);
  };

  const createTabungan = async (data: { nama: string; saldoAwal: number }) => {
    const newTabungan: TabunganData = {
      id: crypto.randomUUID(),
      nama: data.nama,
      saldoAwal: data.saldoAwal,
      jumlah: data.saldoAwal,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTabungan((prev) => [...prev, newTabungan]);

    try {
      await updateData([...tabungan, newTabungan], transaksi);
      await syncToCloud('tabungan', newTabungan);

      return newTabungan;
    } catch (error) {
      refreshTabungan();
      throw error;
    }
  };

  const updateTabungan = async (id: string, data: { nama: string; saldoAwal: number }) => {
    const oldData = [...tabungan];

    setTabungan((prev) =>
      prev.map((t) => t.id === id ? {
        ...t, nama: data.nama, saldoAwal: data.saldoAwal, jumlah: data.saldoAwal, updatedAt: new Date()
      } : t)
    );

    try {
      const updatedObj = { id, ...data, jumlah: data.saldoAwal, updatedAt: new Date() };
      await updateData(tabungan.map(t => t.id === id ? (updatedObj as any) : t), transaksi);
      await syncToCloud('tabungan', updatedObj);

      if (status === 'authenticated') await fetchFromCloud(userId);
    } catch (error) {
      setTabungan(oldData);
      throw error;
    }
  };

  const deleteTabungan = async (id: string) => {
    const oldData = [...tabungan];
    setTabungan((prev) => prev.filter((t) => t.id !== id));

    try {
      await updateData(tabungan.filter(t => t.id !== id), transaksi);
      if (status === 'authenticated') {
        await deleteTabunganFromCloud(userId, id);
        await fetchFromCloud(userId);
      }
    } catch (error) {
      setTabungan(oldData);
      throw error;
    }
  };

  const createTransaksi = async (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: string;
    tabunganId?: string;
    tabunganTujuanId?: string | null;
    biayaAdmin?: number;
  }) => {
    const newTransaksi: TransaksiData = {
      id: crypto.randomUUID(),
      judul: data.judul || (data.tipe === 'pemasukan' ? 'Pemasukan' : data.tipe === 'mutasi' ? 'Mutasi' : 'Pengeluaran'),
      jumlah: data.jumlah,
      deskripsi: data.deskripsi || null,
      tanggal: new Date(data.tanggal).toISOString(),
      tipe: data.tipe,
      kategoriId: data.kategoriId || null,
      tabunganId: data.tabunganId || null,
      tabunganTujuanId: data.tabunganTujuanId || null,
      biayaAdmin: data.biayaAdmin || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const oldTransactions = [...transaksi];
    const oldSavings = [...tabungan];
    const newTransactionsList = [newTransaksi, ...oldTransactions];
    setTransaksi(newTransactionsList);

    let affectedTabs: TabunganData[] = [];
    let newTabunganList = [...oldSavings];

    if (data.tipe === 'mutasi' && data.tabunganId && data.tabunganTujuanId) {
      const biaya = data.biayaAdmin || 0;
      newTabunganList = oldSavings.map((t) => {
        if (t.id === data.tabunganId) {
          const updated = { ...t, jumlah: t.jumlah - (data.jumlah + biaya), updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        if (t.id === data.tabunganTujuanId) {
          const updated = { ...t, jumlah: t.jumlah + data.jumlah, updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    } else if (data.tabunganId) {
      newTabunganList = oldSavings.map((t) => {
        if (t.id === data.tabunganId) {
          const change = data.tipe === 'pengeluaran' ? -data.jumlah : data.jumlah;
          const updated = { ...t, jumlah: t.jumlah + change, updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    }

    try {
      await updateData(newTabunganList, newTransactionsList);
      await syncToCloud('transaksi', newTransaksi);
      if (affectedTabs.length > 0) {
        console.log('☁️ Sinkronisasi saldo tabungan ke Supabase...');
        for (const tab of affectedTabs) {
          await syncToCloud('tabungan', tab);
        }
      }

      return newTransaksi;
    } catch (error) {
      console.error("❌ Gagal sinkron ke Cloud, memulihkan data lokal...", error);
      setTransaksi(oldTransactions);
      setTabungan(oldSavings);
      await updateData(oldSavings, oldTransactions);
      throw error;
    }
  };

  const deleteTransaksi = async (id: string) => {
    const transactionToDelete = transaksi.find((t) => t.id === id);
    if (!transactionToDelete) return;

    const originalTransactions = [...transaksi];
    const originalSavings = [...tabungan];
    const updatedTransactions = originalTransactions.filter((t) => t.id !== id);
    setTransaksi(updatedTransactions);

    let affectedTabs: TabunganData[] = [];
    let newTabunganList = [...originalSavings];

    if (transactionToDelete.tipe === 'mutasi' && transactionToDelete.tabunganId && transactionToDelete.tabunganTujuanId) {
      const biaya = transactionToDelete.biayaAdmin || 0;
      newTabunganList = originalSavings.map((t) => {
        if (t.id === transactionToDelete.tabunganId) {
          const updated = { ...t, jumlah: t.jumlah + (transactionToDelete.jumlah + biaya), updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        if (t.id === transactionToDelete.tabunganTujuanId) {
          const updated = { ...t, jumlah: t.jumlah - transactionToDelete.jumlah, updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    } else if (transactionToDelete.tabunganId) {
      newTabunganList = originalSavings.map((t) => {
        if (t.id === transactionToDelete.tabunganId) {
          const amountChange = transactionToDelete.tipe === 'pemasukan'
            ? -transactionToDelete.jumlah
            : transactionToDelete.jumlah;

          const updated = { ...t, jumlah: t.jumlah + amountChange, updatedAt: new Date() };
          affectedTabs.push(updated);
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    }

    try {
      await updateData(newTabunganList, updatedTransactions);
      if (status === 'authenticated') {
        await deleteTransaksiFromCloud(userId, id);
        if (affectedTabs.length > 0) {
          for (const tab of affectedTabs) {
            await syncTabunganToCloud(userId, tab);
          }
        }
      }

      console.log('✅ Berhasil hapus transaksi');
    } catch (error) {
      setTransaksi(originalTransactions);
      setTabungan(originalSavings);
      await updateData(originalSavings, originalTransactions);
      console.error("❌ Gagal hapus, data dipulihkan");
      throw error;
    }
  };

  const forceSync = async () => {
    console.log('🔄 "Syncing" is just refreshing local data...');
    setSyncStatus('syncing');

    try {
      await loadFromLocal();
      setTabungan(localTabungan);
      setTransaksi(localTransaksi);
      setSyncStatus('synced');
      setLastSync(new Date());
      console.log('✅ Local data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh local data:', error);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Internet terdeteksi aktif! Menjalankan sinkronisasi otomatis...');
      forceSync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [forceSync]);

  const exportData = async (type: 'transactions' | 'savings') => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Nexus Financial';
      workbook.created = new Date();

      if (type === 'transactions') {
        const categoriesOrder = ['bank', 'e-wallet', 'e-money', 'cash', 'lainnya'];
        const groupedTransactions: Record<string, typeof transaksi> = {};

        transaksi.forEach(t => {
          const monthYear = new Date(t.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          if (!groupedTransactions[monthYear]) groupedTransactions[monthYear] = [];
          groupedTransactions[monthYear].push(t);
        });

        if (Object.keys(groupedTransactions).length === 0) {
          const emptySheet = workbook.addWorksheet('Data Kosong');
          emptySheet.getCell('A1').value = 'Tidak ada data transaksi';
          emptySheet.getCell('A1').font = { name: 'Times New Roman' };
        } else {
          Object.entries(groupedTransactions).forEach(([monthYear, monthTransactions]) => {

            const sortedTrx = [...monthTransactions].sort((a, b) => {
              const dateA = new Date(a.tanggal).getTime();
              const dateB = new Date(b.tanggal).getTime();
              if (dateA === dateB) {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              }
              return dateA - dateB;
            });

            const firstTrxInMonth = sortedTrx[0];
            const startOfMonth = new Date(
              new Date(firstTrxInMonth.tanggal).getFullYear(),
              new Date(firstTrxInMonth.tanggal).getMonth(),
              1
            ).getTime();

            const activeTabungan = [...tabungan];
            const worksheet = workbook.addWorksheet(monthYear);
            const numToCol = (num: number) => {
              let letter = '';
              while (num > 0) {
                const temp = (num - 1) % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                num = (num - temp - 1) / 26;
              }
              return letter;
            };

            const headerRow4: string[] = ['No', 'Tanggal'];
            const headerRow5: string[] = ['', ''];

            const colMap: Record<string, { in: number; out: number; balance: number }> = {};
            const catMap: Record<string, { balance: number; tabs: string[] }> = {};
            const currencyColumns: number[] = [];
            const mergesToApply: [number, number, number, number][] = [];
            let currentCol = 3;

            categoriesOrder.forEach(cat => {
              const tabsInCat = activeTabungan.filter(t => getKategoriFromNama(t.nama) === cat);
              if (tabsInCat.length === 0) return;

              catMap[cat] = { balance: 0, tabs: tabsInCat.map(t => t.id) };

              tabsInCat.forEach(tab => {
                headerRow4.push(tab.nama, '', '');
                headerRow5.push('IN', 'OUT', 'Saldo');
                mergesToApply.push([4, currentCol, 4, currentCol + 2]);

                colMap[tab.id] = { in: currentCol, out: currentCol + 1, balance: currentCol + 2 };
                currencyColumns.push(currentCol, currentCol + 1, currentCol + 2);
                currentCol += 3;
              });

              const catLabel = cat.toUpperCase();
              headerRow4.push(`TOTAL ${catLabel}`);
              headerRow5.push('');
              mergesToApply.push([4, currentCol, 5, currentCol]);
              catMap[cat].balance = currentCol;
              currencyColumns.push(currentCol);
              currentCol += 1;
            });

            const totalColIndex = currentCol;
            const noteColIndex = currentCol + 1;

            headerRow4.push('TOTAL KESELURUHAN', 'DESKRIPSI / CATATAN');
            headerRow5.push('', '');

            mergesToApply.push([4, totalColIndex, 5, totalColIndex]);
            mergesToApply.push([4, noteColIndex, 5, noteColIndex]);
            currencyColumns.push(totalColIndex);

            worksheet.getRow(4).values = headerRow4;
            worksheet.getRow(5).values = headerRow5;

            mergesToApply.forEach(mergeArgs => worksheet.mergeCells(...mergeArgs));
            worksheet.mergeCells(4, 1, 5, 1);
            worksheet.mergeCells(4, 2, 5, 2);

            [4, 5].forEach(rowNum => {
              const row = worksheet.getRow(rowNum);
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= noteColIndex) {
                  cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                  };
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                  cell.font = { bold: true, color: { argb: 'FF000000' }, name: 'Times New Roman' };
                }
              });
            });

            const cellNo = worksheet.getCell(4, 1);
            cellNo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
            cellNo.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Times New Roman' };

            worksheet.getCell(4, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } };
            worksheet.getCell(4, totalColIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF990099' } };
            worksheet.getCell(4, totalColIndex).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Times New Roman' };
            worksheet.getCell(4, noteColIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };

            for (let c = 3; c < totalColIndex; c++) {
              const cell4 = worksheet.getCell(4, c);
              const cell5 = worksheet.getCell(5, c);
              const val4 = cell4.value ? cell4.value.toString() : '';
              const val5 = cell5.value ? cell5.value.toString() : '';

              if (val5 === 'IN') {
                cell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } };
              } else if (val5 === 'OUT') {
                cell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
              } else if (val5 === 'Saldo') {
                cell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
              }

              if (val4) {
                if (val4.startsWith('TOTAL ')) {
                  cell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
                } else {
                  cell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
                }
              }
            }

            const runningBalances: Record<string, number> = {};

            activeTabungan.forEach(tab => {
              let startBal = tab.saldoAwal || 0;
              const pastTrx = transaksi.filter(t =>
                (t.tabunganId === tab.id || t.tabunganTujuanId === tab.id) &&
                new Date(t.tanggal).getTime() < startOfMonth
              );
              
              pastTrx.forEach(t => {
                if (t.tipe === 'mutasi') {
                  if (t.tabunganId === tab.id) {
                    startBal -= (t.jumlah + (t.biayaAdmin || 0));
                  }
                  if (t.tabunganTujuanId === tab.id) {
                    startBal += t.jumlah;
                  }
                } else {
                  if (t.tipe === 'pemasukan') startBal += t.jumlah;
                  else startBal -= t.jumlah;
                }
              });
              runningBalances[tab.id] = startBal; 
            });

            const firstDayString = new Date(startOfMonth).toLocaleDateString('id-ID');
            const initialRow = new Array(noteColIndex).fill('-');
            initialRow[0] = 1;
            initialRow[1] = firstDayString;
            initialRow[noteColIndex - 1] = 'SALDO PINDAHAN BULAN LALU';

            Object.keys(catMap).forEach(cat => {
              const cellsToSum: string[] = [];
              catMap[cat].tabs.forEach(tabId => {
                const b = runningBalances[tabId] || 0;
                initialRow[colMap[tabId].balance - 1] = b;
                cellsToSum.push(`${numToCol(colMap[tabId].balance)}6`);
              });
              initialRow[catMap[cat].balance - 1] = { formula: cellsToSum.length > 0 ? `SUM(${cellsToSum.join(',')})` : '0' };
            });

            const grandTotalCells = Object.keys(catMap).map(cat => `${numToCol(catMap[cat].balance)}6`);
            initialRow[totalColIndex - 1] = { formula: grandTotalCells.length > 0 ? `SUM(${grandTotalCells.join(',')})` : '0' };

            const initialAddedRow = worksheet.addRow(initialRow);

            initialAddedRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
              if (colNum <= noteColIndex) {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle' };
                cell.font = { italic: true, name: 'Times New Roman' };

                if (colNum === noteColIndex) cell.alignment.horizontal = 'center';
                if (colNum === 1) {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                  cell.font = { color: { argb: 'FFFFFFFF' }, name: 'Times New Roman' };
                  cell.alignment.horizontal = 'center';
                }
              }
            });

            let lastDate = firstDayString;
            let startMergeRow = 6;
            let currentRowIndex = 7;

            sortedTrx.forEach((trx, index) => {
              const trxDate = new Date(trx.tanggal).toLocaleDateString('id-ID');
              const row = new Array(noteColIndex).fill('-');

              row[0] = index + 2;

              let desc = trx.judul;
              if (trx.deskripsi && trx.deskripsi.trim().toLowerCase() !== trx.judul.trim().toLowerCase()) {
                desc += ` - ${trx.deskripsi}`;
              }
              row[noteColIndex - 1] = desc;

              if (trxDate !== lastDate) {
                if (startMergeRow !== -1 && currentRowIndex - 1 > startMergeRow) {
                  worksheet.mergeCells(startMergeRow, 2, currentRowIndex - 1, 2);
                }
                lastDate = trxDate;
                startMergeRow = currentRowIndex;
                row[1] = trxDate;
              } else {
                row[1] = '';
              }

              if (trx.tipe === 'mutasi' && trx.tabunganId && trx.tabunganTujuanId) {
                const colsAsal = colMap[trx.tabunganId];
                const colsTujuan = colMap[trx.tabunganTujuanId];
                const admin = trx.biayaAdmin || 0;

                if (colsAsal) {
                  row[colsAsal.out - 1] = trx.jumlah + admin;
                  runningBalances[trx.tabunganId] -= (trx.jumlah + admin);
                }
                
                if (colsTujuan) {
                  row[colsTujuan.in - 1] = trx.jumlah;
                  runningBalances[trx.tabunganTujuanId] += trx.jumlah;
                }

                if (admin > 0) {
                  row[noteColIndex - 1] += ` (Biaya Admin: Rp ${admin.toLocaleString('id-ID')})`;
                }
                
              } else if (trx.tabunganId && colMap[trx.tabunganId]) {
                const cols = colMap[trx.tabunganId];
                const amount = trx.jumlah;
                if (trx.tipe === 'pemasukan') {
                  row[cols.in - 1] = amount;
                  runningBalances[trx.tabunganId] += amount;
                } else {
                  row[cols.out - 1] = amount;
                  runningBalances[trx.tabunganId] -= amount;
                }
              }

              Object.keys(catMap).forEach(cat => {
                const cellsToSum: string[] = [];
                catMap[cat].tabs.forEach(tabId => {
                  const cols = colMap[tabId];
                  const colIn = numToCol(cols.in);
                  const colOut = numToCol(cols.out);
                  const colBal = numToCol(cols.balance);
                  const prevRow = currentRowIndex - 1;
                  const formulaBal = `${colBal}${prevRow} + IF(${colIn}${currentRowIndex}="-", 0, ${colIn}${currentRowIndex}) - IF(${colOut}${currentRowIndex}="-", 0, ${colOut}${currentRowIndex})`;
                  row[cols.balance - 1] = { formula: formulaBal };
                  cellsToSum.push(`${colBal}${currentRowIndex}`);
                });
                row[catMap[cat].balance - 1] = { formula: cellsToSum.length > 0 ? `SUM(${cellsToSum.join(',')})` : '0' };
              });
              const grandTotalCells = Object.keys(catMap).map(cat => `${numToCol(catMap[cat].balance)}${currentRowIndex}`);
              row[totalColIndex - 1] = { formula: grandTotalCells.length > 0 ? `SUM(${grandTotalCells.join(',')})` : '0' };

              const newRow = worksheet.addRow(row);

              newRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                if (colNum <= noteColIndex) {
                  cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                  cell.alignment = { vertical: 'middle' };

                  if (colNum === 1 || colNum === 2 || colNum === noteColIndex) cell.alignment.horizontal = 'center';
                  if (colNum === 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
                    cell.font = { color: { argb: 'FFFFFFFF' }, name: 'Times New Roman' };
                  }
                }
              });

              currentRowIndex++;
            });

            if (startMergeRow !== -1 && currentRowIndex - 1 > startMergeRow) {
              worksheet.mergeCells(startMergeRow, 2, currentRowIndex - 1, 2);
            }

            worksheet.mergeCells(1, 1, 2, noteColIndex);
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `LAPORAN KEUANGAN BULAN ${monthYear.toUpperCase()}`;
            titleCell.font = { size: 16, bold: true, name: 'Times New Roman' };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            const accountingFormat = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"_);_(@_)';
            currencyColumns.forEach(colIndex => {
              worksheet.getColumn(colIndex).numFmt = accountingFormat;
            });

            worksheet.getColumn(1).width = 5;
            worksheet.getColumn(2).width = 15;
            for (let i = 3; i < noteColIndex; i++) {
              worksheet.getColumn(i).width = 150 / 9;
            }
            worksheet.getColumn(noteColIndex).width = 35;
            worksheet.eachRow({ includeEmpty: true }, (row) => {
              row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                const currentFont = cell.font || {};
                if (colNum !== 1) {
                  cell.font = { ...currentFont, name: 'Times New Roman' };
                }
              });
            });

          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
      } else {
        const worksheet = workbook.addWorksheet('Tabungan');

        worksheet.mergeCells('A1:C2');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'DAFTAR TABUNGAN & SALDO';
        titleCell.font = { size: 16, bold: true, name: 'Times New Roman' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const headers = ['Nama Dompet / Bank', 'Total Saldo Saat Ini', 'Tanggal Dibuat'];
        worksheet.getRow(4).values = headers;

        const headerRow = worksheet.getRow(4);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Times New Roman' };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        headerRow.alignment = { horizontal: 'center' };

        tabungan.forEach(t => {
          const row = worksheet.addRow([
            t.nama,
            t.jumlah,
            new Date(t.createdAt).toLocaleDateString('id-ID')
          ]);
          row.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        worksheet.getColumn(2).numFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"_);_(@_)';
        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 15;

        worksheet.eachRow({ includeEmpty: true }, (row) => {
          row.eachCell({ includeEmpty: true }, (cell) => {
            const currentFont = cell.font || {};
            cell.font = { ...currentFont, name: 'Times New Roman' };
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
      }

    } catch (error) {
      console.error(`❌ Failed to export ${type}:`, error);
      throw error;
    }
  };

  // const importData = async (file: File) => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = async (e) => {
  //       try {
  //         const data = e.target?.result;
  //         const workbook = XLSX.read(data, { type: 'binary' });
  //         const sheetName = workbook.SheetNames[0];
  //         const worksheet = workbook.Sheets[sheetName];
  //         const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //         const importedTransactions: TransaksiData[] = [];
  //         for (const row of jsonData as any[]) {
  //           if (row.Tanggal && row.Jumlah && row.Tipe) {
  //             const newTransaction: TransaksiData = {
  //               id: crypto.randomUUID(),
  //               judul: row.Judul || 'Transaksi Import',
  //               jumlah: parseFloat(row.Jumlah),
  //               deskripsi: row.Keterangan || null,
  //               tanggal: new Date(row.Tanggal).toISOString().split('T')[0],
  //               tipe: row.Tipe,
  //               tabunganId: tabungan.find(t => t.nama === row.Tabungan)?.id || null,
  //               kategoriId: null,
  //               createdAt: new Date(),
  //               updatedAt: new Date()
  //             };
  //             importedTransactions.push(newTransaction);
  //           }
  //         }

  //         const updatedTransaksi = [...importedTransactions, ...transaksi];
  //         setTransaksi(updatedTransaksi);
  //         await updateData(tabungan, updatedTransaksi);

  //         importedTransactions.forEach(item => {
  //           syncToCloud('transaksi', item);
  //         });

  //         setLastSync(new Date());
  //         console.log(`✅ ${importedTransactions.length} transactions imported successfully`);
  //         resolve(importedTransactions);
  //       } catch (error) {
  //         console.error('❌ Failed to import data:', error);
  //         reject(error);
  //       }
  //     };
  //     reader.onerror = () => reject(new Error('Gagal membaca file'));
  //     reader.readAsBinaryString(file);
  //   });
  // };

  return (
    <FinancialContext.Provider value={{
      tabungan,
      transaksi,
      refreshTabungan,
      refreshTransaksi,
      updateTabunganBalance,
      userId,
      createTabungan,
      createTransaksi,
      dataSource: 'local',
      isOnline: !!isOnline,
      syncStatus,
      lastSync,
      forceSync,
      exportData,
      // importData,
      updateTabungan,
      deleteTabungan,
      deleteTransaksi
    }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}