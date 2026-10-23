'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileSpreadsheet,
  CheckCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (type: 'transactions' | 'savings') => Promise<void>;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async () => {
    setIsExporting(true);
    
    try {
      await onExport('transactions');
      toast.success('Laporan Keuangan berhasil di-export!');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export Laporan Keuangan gagal. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  const features = [
    'Tab 1: Ringkasan Total Saldo & Semua Dompet',
    'Tab Bulanan: Transaksi detail (Pemasukan, Pengeluaran, & Mutasi)',
    'Rumus Otomatis Excel untuk perhitungan saldo',
    'Format .xlsx (Kompatibel dengan Microsoft Excel / Google Sheets)'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data ke Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Laporan Lengkap</h3>
                  <p className="text-xs text-gray-500">Gabungan Saldo Tabungan & Riwayat Transaksi</p>
                </div>
              </div>
                    
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-700">Isi File Excel:</div>
                <ul className="text-xs text-gray-600 space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={handleExportClick} disabled={isExporting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Memproses Excel...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Laporan (.xlsx)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Informasi Export:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• File akan otomatis di-download ke browser kamu</li>
                  <li>• Format file: .xlsx (Excel Compatible)</li>
                  <li>• Data terbaru dari aplikasi akan di-export</li>
                  <li>• Aman, diproses langsung di browser tanpa server</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready to Export
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Excel Format
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}