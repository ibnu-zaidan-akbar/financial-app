'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/lib/financial-context';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  Wallet,
  Building,
  Smartphone,
  CreditCard,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

interface TabunganData {
  id: string;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabungan: TabunganData[];
}

export default function TransaksiDialog({ open, onOpenChange, tabungan }: TransaksiDialogProps) {
  const { createTransaksi } = useFinancial();
  const [formData, setFormData] = useState({
    tipe: 'pemasukan' as 'pemasukan' | 'pengeluaran' | 'mutasi',
    jumlah: '',
    deskripsi: '',
    tabunganId: '',
    tabunganTujuanId: '',
    biayaAdmin: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

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
      case 'bank': return <Building className="h-4 w-4" />;
      case 'e-wallet': return <Smartphone className="h-4 w-4" />;
      case 'e-money': return <CreditCard className="h-4 w-4" />;
      case 'cash': return <Banknote className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
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

  const resetForm = () => {
    setFormData({
      tipe: 'pemasukan',
      jumlah: '',
      deskripsi: '',
      tabunganId: '',
      tabunganTujuanId: '',
      biayaAdmin: '',
      tanggal: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipe || !formData.jumlah || !formData.tabunganId || !formData.tanggal) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    if (formData.tipe === 'mutasi') {
      if (!formData.tabunganTujuanId) {
        toast.error('Pilih tabungan tujuan untuk mutasi');
        return;
      }
      if (formData.tabunganId === formData.tabunganTujuanId) {
        toast.error('Sumber dan tujuan tabungan tidak boleh sama');
        return;
      }
    }

    try {
      const selectedTabungan = tabungan.find(t => t.id === formData.tabunganId);
      if (!selectedTabungan) {
        toast.error('Tabungan tidak ditemukan');
        return;
      }
      
      await createTransaksi({
        tabunganId: selectedTabungan.id,
        tabunganTujuanId: formData.tipe === 'mutasi' ? formData.tabunganTujuanId : null,
        judul: formData.deskripsi || (formData.tipe === 'pemasukan' ? 'Pemasukan' : formData.tipe === 'mutasi' ? 'Transfer' : 'Pengeluaran'),
        jumlah: parseFloat(formData.jumlah.replace(/\./g, '')),
        biayaAdmin: formData.tipe === 'mutasi' && formData.biayaAdmin ? parseFloat(formData.biayaAdmin.replace(/\./g, '')) : 0,
        deskripsi: formData.deskripsi || '',
        tipe: formData.tipe,
        tanggal: formData.tanggal,
        kategoriId: undefined
      });

      if (formData.tipe === 'pengeluaran') {
        const amount = parseFloat(formData.jumlah.replace(/\./g, ''));
        if (amount > 50000) {
          toast.warning("Pengeluaran cukup besar", {
            description: "Catatan tersimpan. Jangan lupa kontrol pengeluaran ya! 💰",
          });
        }
      }

      toast.success("Transaksi berhasil disimpan!");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error('Gagal menyimpan transaksi: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.tipe === 'pemasukan' ? (
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : formData.tipe === 'pengeluaran' ? (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            ) : (
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            )}
            Tambah Transaksi
          </DialogTitle>
          <DialogDescription>
            {formData.tipe === 'mutasi' ? 'Transfer saldo antar tabungan' : 'Tambahkan pemasukan atau pengeluaran untuk tabungan Anda'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Jenis Transaksi *</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={formData.tipe === 'pemasukan' ? 'default' : 'outline'}
                className={`h-16 flex-col gap-1 px-1 ${
                  formData.tipe === 'pemasukan' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
                onClick={() => setFormData({...formData, tipe: 'pemasukan'})}
              >
                <ArrowUpRight className="h-5 w-5" />
                <span className="text-xs font-medium">Pemasukan</span>
              </Button>
              
              <Button
                type="button"
                variant={formData.tipe === 'pengeluaran' ? 'default' : 'outline'}
                className={`h-16 flex-col gap-1 px-1 ${
                  formData.tipe === 'pengeluaran' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
                onClick={() => setFormData({...formData, tipe: 'pengeluaran'})}
              >
                <ArrowDownRight className="h-5 w-5" />
                <span className="text-xs font-medium">Pengeluaran</span>
              </Button>

              <Button
                type="button"
                variant={formData.tipe === 'mutasi' ? 'default' : 'outline'}
                className={`h-16 flex-col gap-1 px-1 ${
                  formData.tipe === 'mutasi' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
                onClick={() => setFormData({...formData, tipe: 'mutasi'})}
              >
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-xs font-medium">Mutasi</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Jumlah Nominal *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <Input
                type="text"
                placeholder="0"
                value={formData.jumlah}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setFormData({...formData, jumlah: formatted});
                }}
                className="pl-12 text-lg font-semibold"
                required
              />
            </div>
          </div>

          {formData.tipe === 'mutasi' && (
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-600">Biaya Admin (Opsional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  Rp
                </span>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.biayaAdmin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    setFormData({...formData, biayaAdmin: formatted});
                  }}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              {formData.tipe === 'mutasi' ? 'Dari Tabungan (Sumber) *' : 'Sumber/Tujuan *'}
            </label>
            <Select value={formData.tabunganId} onValueChange={(value) => setFormData({...formData, tabunganId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tabungan" />
              </SelectTrigger>
              <SelectContent>
                {tabungan.map((t) => {
                  const kategori = getKategoriFromNama(t.nama);
                  return (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${getKategoriColor(kategori)}`}>
                          {getKategoriIcon(kategori)}
                        </div>
                        <span>{t.nama}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {formData.tipe === 'mutasi' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Ke Tabungan (Tujuan) *</label>
              <Select value={formData.tabunganTujuanId} onValueChange={(value) => setFormData({...formData, tabunganTujuanId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tabungan tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {tabungan
                    .filter(t => t.id.toString() !== formData.tabunganId)
                    .map((t) => {
                    const kategori = getKategoriFromNama(t.nama);
                    return (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${getKategoriColor(kategori)}`}>
                            {getKategoriIcon(kategori)}
                          </div>
                          <span>{t.nama}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Tanggal *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Keterangan</label>
            <Textarea
              placeholder={formData.tipe === 'mutasi' ? "Contoh: Top up OVO, Tarik tunai, dll" : "Tambahkan keterangan transaksi (opsional)"}
              value={formData.deskripsi}
              onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
              rows={2}
            />
          </div>

          {formData.tipe && formData.jumlah && formData.tabunganId && (
            <div className={`p-3 rounded-lg border ${
              formData.tipe === 'pemasukan' 
                ? 'bg-green-50 border-green-200' 
                : formData.tipe === 'pengeluaran' 
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-600">Preview:</span>
                
                {formData.tipe === 'mutasi' ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Keluar dari {tabungan.find(t => t.id === formData.tabunganId)?.nama || '?'}</span>
                      <span className="font-bold text-red-700">
                        -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(formData.jumlah.replace(/\./g, '') || '0') + parseFloat(formData.biayaAdmin.replace(/\./g, '') || '0'))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Masuk ke {tabungan.find(t => t.id === formData.tabunganTujuanId)?.nama || '?'}</span>
                      <span className="font-bold text-green-700">
                        +{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(formData.jumlah.replace(/\./g, '') || '0'))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {formData.tipe === 'pemasukan' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                    <span className={`font-bold text-sm ${formData.tipe === 'pemasukan' ? 'text-green-700' : 'text-red-700'}`}>
                      {formData.tipe === 'pemasukan' ? '+' : '-'}
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(parseFloat(formData.jumlah.replace(/\./g, '') || '0'))}
                    </span>
                    <span className="text-xs text-gray-600 ml-auto">
                      {tabungan.find(t => t.id === formData.tabunganId)?.nama}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.tipe || !formData.jumlah || !formData.tabunganId || (formData.tipe === 'mutasi' && !formData.tabunganTujuanId)}
            >
              Simpan Transaksi
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}