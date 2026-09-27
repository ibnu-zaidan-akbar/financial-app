'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Smartphone,
  CreditCard,
  Banknote,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  RefreshCw,
  AlertCircle,
  Download
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import type { Tabungan as PrismaTabungan, Transaksi as PrismaTransaksi } from '@prisma/client';
import { useFinancial } from '@/lib/financial-context';

interface TabunganInterface {
  id: string;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiInterface {
  id: string;
  judul: string;
  jumlah: number;
  deskripsi?: string | null;
  tanggal: string | Date;
  tipe: string;
  kategoriId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DashboardTabProps {
  tabungan: TabunganInterface[];
  transaksi: TransaksiInterface[];
  onDataUpdate: () => void;
  canInstall: boolean;
  installPWA: () => void;
}

export default function DashboardTab({ tabungan, transaksi, onDataUpdate, canInstall, installPWA }: DashboardTabProps) {
  const { 
    isOnline,
    syncStatus, 
    lastSync, 
    forceSync 
  } = useFinancial();
  
  const [pemasukanBulanIni, setPemasukanBulanIni] = useState(0);
  const [pengeluaranBulanIni, setPengeluaranBulanIni] = useState(0);
  const [statistikBulanan, setStatistikBulanan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced': return <Database className="w-4 h-4" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'synced': return 'bg-green-100 text-green-800 border-green-300';
      case 'syncing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'offline': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      await onDataUpdate();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getKategoriFromNama = (nama: string) => {
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

  const getKategoriIcon = (kategori: string) => {
    switch (kategori) {
      case 'bank': return <Building className="h-3 w-3" />;
      case 'e-wallet': return <Smartphone className="h-3 w-3" />;
      case 'e-money': return <CreditCard className="h-3 w-3" />;
      case 'cash': return <Banknote className="h-3 w-3" />;
      default: return <Wallet className="h-3 w-3" />;
    }
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'bank': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'e-wallet': return 'bg-green-100 text-green-700 border-green-200';
      case 'e-money': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cash': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [transaksi]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const pemasukan = transaksi
        .filter(t => t.tipe === 'pemasukan')
        .filter(t => {
          const tDate = new Date(t.tanggal);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.jumlah, 0);
        
      const pengeluaran = transaksi
        .filter(t => t.tipe === 'pengeluaran')
        .filter(t => {
          const tDate = new Date(t.tanggal);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.jumlah, 0);

      const last6Months:any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`; 
        
        last6Months.push({
          key: monthKey,
          bulan: monthName,
          pemasukan: 0,
          pengeluaran: 0
        });
      }

      transaksi.forEach(t => {
        const tDate = new Date(t.tanggal);
        const tKey = `${tDate.getFullYear()}-${tDate.getMonth()}`;
        const targetMonth = last6Months.find(m => m.key === tKey);
        
        if (targetMonth) {
          if (t.tipe === 'pemasukan') {
            targetMonth.pemasukan += t.jumlah;
          } else {
            targetMonth.pengeluaran += t.jumlah;
          }
        }
      });

      setPemasukanBulanIni(pemasukan);
      setPengeluaranBulanIni(pengeluaran);
      setStatistikBulanan(last6Months);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);
  const bulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  const chartData = statistikBulanan.map(stat => ({
    bulan: stat.bulan,
    pemasukan: stat.pemasukan,
    pengeluaran: stat.pengeluaran,
    saldo: stat.pemasukan - stat.pengeluaran
  }));

  const recentChartData = statistikBulanan.map(stat => ({
    bulan: stat.bulan,
    pemasukan: stat.pemasukan,
    pengeluaran: stat.pengeluaran
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Badge className={`${getSyncColor()} flex items-center gap-1`}>
            {getSyncIcon()}
            <span className="text-xs font-medium">
              {syncStatus === 'synced' && 'Synced'}
              {syncStatus === 'syncing' && 'Syncing...'}
              {syncStatus === 'offline' && 'Offline'}
              {syncStatus === 'error' && 'Sync Error'}
            </span>
          </Badge>
          
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
            <Database className="w-4 h-4" />
            <span className="text-xs font-medium">Local</span>
          </Badge>

          <Badge className={`${canInstall ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'} flex items-center gap-1`}>
            <Download className="w-4 h-4" />
            <span className="text-xs font-medium">
              {canInstall ? 'Installable' : 'Not Installable'}
            </span>
          </Badge>

          <div className="flex items-center gap-1 text-xs text-gray-600">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Last sync: {formatLastSync(lastSync)}
          </span>
          
          {!isOnline || syncStatus === 'error' ? (
            <Button
              onClick={handleForceSync}
              disabled={isSyncing || !isOnline}
              size="sm"
              variant="outline"
              className="h-8"
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {!isOnline && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-orange-800">Offline Mode</h5>
              <p className="text-sm text-orange-700">
                You're currently offline. Data is being saved locally and will sync when you're back online.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Pemasukan {bulanIni}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(pemasukanBulanIni)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {transaksi.filter(t => t.tipe === 'pemasukan' && new Date(t.tanggal).getMonth() === new Date().getMonth() && new Date(t.tanggal).getFullYear() === new Date().getFullYear()).length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Pengeluaran {bulanIni}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(pengeluaranBulanIni)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {transaksi.filter(t => t.tipe === 'pengeluaran' && new Date(t.tanggal).getMonth() === new Date().getMonth() && new Date(t.tanggal).getFullYear() === new Date().getFullYear()).length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Saldo
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(totalSaldo)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {tabungan.length} tabungan aktif
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend Saldo 6 Bulan Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="bulan" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('id-ID', {
                          notation: 'compact',
                          currency: 'IDR',
                          style: 'currency',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value)
                      }
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value),
                        ''
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Belum ada data untuk ditampilkan</p>
                  <p className="text-sm">Mulai tambahkan transaksi untuk melihat grafik</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pemasukan vs Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="bulan" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('id-ID', {
                          notation: 'compact',
                          currency: 'IDR',
                          style: 'currency',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value)
                      }
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value),
                        ''
                      ]}
                    />
                    <Bar dataKey="pemasukan" fill="#10b981" />
                    <Bar dataKey="pengeluaran" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Belum ada data untuk ditampilkan</p>
                  <p className="text-sm">Mulai tambahkan transaksi untuk melihat grafik</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Semua Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tabungan.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabungan.map((t) => {
                const kategori = getKategoriFromNama(t.nama);
                return (
                  <div key={t.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{t.nama}</h4>
                      <Badge variant="outline" className={`text-xs ${getKategoriColor(kategori)}`}>
                        <span className="flex items-center gap-1">
                          {getKategoriIcon(kategori)}
                          {kategori.toUpperCase()}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Saldo: {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(t.jumlah)}
                    </p>
                    <div className="text-xs text-gray-500">
                      Dibuat: {new Date(t.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Belum ada tabungan</p>
              <p className="text-sm">Mulai tambahkan tabungan untuk melihat data</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                {canInstall 
                  ? "Aplikasi ini dapat diinstall sebagai aplikasi mandiri di perangkat Anda. Install untuk pengalaman yang lebih baik."
                  : "Aplikasi ini tidak dapat diinstall saat ini. Pastikan Anda membuka dengan browser yang mendukung PWA."}
              </p>
            </div>
            <Button
              onClick={installPWA}
              disabled={!canInstall}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {canInstall ? "Install Aplikasi" : "Tidak Dapat Diinstall"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}