import { API_BASE_URL } from './constants';

/**
 * Fungsi utilitas untuk melakukan panggilan GET ke API backend.
 * @param endpoint - Endpoint API relatif (misal: 'products', 'orders/123').
 */
export async function getApi(endpoint: string) {
    // Membangun URL lengkap
    const url = `${API_BASE_URL}/${endpoint}`;
    
    try {
        const response = await fetch(url, {
            // Jika Anda perlu otentikasi, header JWT dapat ditambahkan di sini:
            // headers: {
            //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
            //     'Content-Type': 'application/json',
            // },
        });

        if (!response.ok) {
            // Melempar error dengan status code dan pesan untuk ditangkap oleh komponen
            const errorData = await response.json();
            throw new Error(errorData.error || `Gagal mengambil data. Status: ${response.status}`);
        }

        return response.json();

    } catch (error) {
        console.error("Error API Call:", error);
        // Melempar kembali error agar bisa ditangani oleh komponen yang memanggil
        throw error;
    }
}