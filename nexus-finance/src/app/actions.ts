'use server'
import { prisma } from '@/lib/prisma';

export async function syncTransaksiToCloud(userId: string, data: any) {
  const { id, tanggal, createdAt, updatedAt, tabunganTujuanId, biayaAdmin, ...rest } = data;

  return await prisma.transaksi.upsert({
    where: { id: id },
    update: {
      ...rest,
      tanggal: new Date(tanggal),
      updatedAt: new Date(),
      tabunganTujuanId: tabunganTujuanId || null,
      biayaAdmin: biayaAdmin ? Number(biayaAdmin) : 0,
    },
    create: {
      ...rest,
      id: id,
      userId: userId,
      tanggal: new Date(tanggal),
      tabunganTujuanId: tabunganTujuanId || null,
      biayaAdmin: biayaAdmin ? Number(biayaAdmin) : 0,
    }
  });
}

export async function syncTabunganToCloud(userId: string, data: any) {
  const { id, createdAt, updatedAt, ...rest } = data;

  return await prisma.tabungan.upsert({
    where: { id: id },
    update: {
      ...rest,
      updatedAt: new Date(),
    },
    create: {
      ...rest,
      id: id,
      userId: userId
    }
  });
}

export async function getFinancialData(userId: string) {
  try {
    const [tabungan, transaksi] = await Promise.all([
      prisma.tabungan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaksi.findMany({
        where: { userId },
        orderBy: { tanggal: 'desc' }
      })
    ]);

    return { 
      tabungan: JSON.parse(JSON.stringify(tabungan)), 
      transaksi: JSON.parse(JSON.stringify(transaksi)) 
    };
  } catch (error) {
    console.error("Gagal mengambil data dari Cloud:", error);
    throw new Error("Gagal memuat data dari server");
  }
}

export async function deleteTabunganFromCloud(userId: string, id: string) {
  try {
    return await prisma.tabungan.delete({
      where: { id, userId }
    });
  } catch (error) {
    console.error("Gagal menghapus di Cloud:", error);
    throw error;
  }
}

export async function deleteTransaksiFromCloud(userId: string, id: string) {
  try {
    return await prisma.transaksi.delete({
      where: { id, userId }
    });
  } catch (error) {
    console.error("Gagal menghapus transaksi di Cloud:", error);
    throw error;
  }
}