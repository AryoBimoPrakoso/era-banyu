import { API_BASE_URL } from './constants';

/**
 * Fungsi utilitas untuk melakukan panggilan GET ke API backend.
 * @param endpoint - Endpoint API relatif (misal: 'products', 'orders/123').
 * @param body - Data yang akan dikirim (object)
 * @param requireAuth - Apakah endpoint memerlukan auth (default false).
 */
export async function getApi(endpoint: string, requireAuth: boolean = false) {
    // Membangun URL lengkap
    const url = `${API_BASE_URL}/${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (requireAuth) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            headers,
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

export async function postApi(endpoint: string, body: any, requireAuth: boolean = false) {
    const url = `${API_BASE_URL}/${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (requireAuth) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || `Gagal mengirim data. Status: ${response.status}`);
        }

        return data;

    } catch (error) {
        console.error("Error API Call (POST):", error);
        throw error;
    }
}