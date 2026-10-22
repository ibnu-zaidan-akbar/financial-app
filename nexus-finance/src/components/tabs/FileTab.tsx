'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Database, FileSpreadsheet, Settings } from 'lucide-react';
import { ExportDialog } from '@/components/dialogs/ExportDialog';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { useFinancial } from '@/lib/financial-context';
import { toast } from 'sonner';

export default function FileTab() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { 
    tabungan,
    transaksi, 
    exportData,
    // importData
  } = useFinancial();

  const handleExport = async (type: 'transactions' | 'savings') => {
    try {
      await exportData(type);
      toast.success(`Data ${type === 'savings' ? 'Tabungan' : 'Transaksi'} berhasil di-export!`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export gagal. Silakan coba lagi.');
    }
  };

  const handleImport = async (file: File) => {
    try {
      // await importData(file);
      toast.success('Data berhasil di-import!');
      setShowImportDialog(false);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import gagal. Periksa format file kamu.');
    }
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);
  const totalPemasukan = transaksi.reduce((total, t) => 
    t.tipe === 'pemasukan' ? total + t.jumlah : total, 0
  );
  const totalPengeluaran = transaksi.reduce((total, t) => 
    t.tipe === 'pengeluaran' ? total + t.jumlah : total, 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Ringkasan Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{tabungan.length}</div>
              <p className="text-sm text-gray-600">Total Tabungan</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{transaksi.length}</div>
              <p className="text-sm text-gray-600">Total Transaksi</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(totalSaldo)}
              </div>
              <p className="text-sm text-gray-600">Total Saldo Tabungan</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(totalPemasukan - totalPengeluaran)}
              </div>
              <p className="text-sm text-gray-600">Saldo Transaksi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data ke Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
              <Button
                onClick={() => setShowExportDialog(true)}
                disabled={transaksi.length === 0}
                className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span>Export Laporan Keuangan</span>
                <span className="text-xs text-blue-100">
                  {transaksi.length} transaksi • {tabungan.length} tabungan
                </span>
              </Button>
            {/* </div> */}
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Fitur Export:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Data diambil langsung dari aplikasi</li>
                <li>• Format file: .xlsx (Excel Compatible)</li>
                <li>• Otomatis download ke browser</li>
                <li>• Aman, tidak melalui server</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data dari Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowImportDialog(true)}
                className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span>Import Transaksi</span>
                <span className="text-xs text-green-100">
                  Upload file Excel
                </span>
              </Button>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Atau klik tombol Import untuk upload file
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Panduan Import:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Export data terlebih dahulu untuk mendapatkan template</li>
                <li>• Pastikan file memiliki kolom: Tanggal, Judul, Jumlah, Tipe</li>
                <li>• Kolom 'Tabungan' akan cocokkan dengan nama tabungan di aplikasi</li>
                <li>• Data duplikat akan ditambah sebagai transaksi baru</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />
    </div>
  );
}